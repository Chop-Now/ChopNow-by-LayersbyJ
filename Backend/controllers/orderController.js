const mongoose = require('mongoose');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const Business = require('../models/Business');
const User = require('../models/User');
const _Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const RefundRequest = require('../models/RefundRequest');
const logger = require('../utils/logger');
const {
  sendOrderConfirmationEmail,
  sendOrderReadyForPickupEmail,
  sendOrderOutForDeliveryEmail,
  sendOrderCompletedEmail,
  sendOrderCancelledEmail,
  sendVendorOrderNotification,
  sendVendorOrderCancelledEmail,
} = require('../utils/emailService');

// Impact constants (must match analyticsController.js)
const IMPACT_FACTORS = {
  CO2_PER_MEAL: 2.5, // kg CO2e saved per meal rescued
  WATER_PER_MEAL: 1000, // litres of water saved per meal
};
const socketManager = require('../socket');
const { CheckoutError, buildQuote, placeCheckout } = require('../services/checkoutService');
const { recordEntry, holdUntil } = require('../services/ledgerService');
const PlatformSettings = require('../models/PlatformSettings');

const CANCELLABLE_STATUSES = Order.CANCELLABLE_STATUSES;
const TERMINAL_ORDER_STATUSES = ['completed', 'cancelled'];
// Statuses a vendor/admin may set through the generic status endpoint.
// 'paid' is owned by the payment flow, 'cancelled' by cancelOrder, and
// 'pending_payment' is only ever the initial state.
const VENDOR_SETTABLE_STATUSES = [
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
];
// Cash is collected by the vendor at handover; mobile money must have
// actually been received before the order can progress. (A partly refunded
// order was still paid, and must still be completable.)
const MONEY_RECEIVED_STATUSES = ['completed', 'refund_pending', 'refunded'];
const PAYMENT_SETTLED_FILTER = {
  $or: [
    { 'payment.paymentMethod': 'cash' },
    { 'payment.paymentStatus': { $in: MONEY_RECEIVED_STATUSES } },
  ],
};
const isPaymentSettled = (order) =>
  order.payment?.paymentMethod === 'cash' ||
  MONEY_RECEIVED_STATUSES.includes(order.payment?.paymentStatus);

/**
 * Atomically completes an order: transitions status -> 'completed' (only if
 * the order isn't already completed or cancelled), credits the business's
 * payout balance, and increments customer/business impact stats.
 *
 * C7 fix: this is "the single most important fix in the entire audit" -
 * Business.stats.balance was never credited anywhere, so a vendor could
 * complete any number of orders and never accumulate a payable balance,
 * making payouts structurally impossible.
 * H6 fix: the status transition is a single atomic findOneAndUpdate keyed on
 * the order NOT already being completed/cancelled, so calling this twice for
 * the same order (a retried request, a duplicate webhook-driven call, races
 * between updateOrderStatus/verifyPickupCode/verifyPickupCodeDirect) can only
 * ever credit the balance and increment stats once - the second call's
 * findOneAndUpdate matches nothing and returns null.
 *
 * Shared by updateOrderStatus, verifyPickupCode, and verifyPickupCodeDirect -
 * the three places an order can become 'completed'.
 *
 * Only orders whose payment is settled can complete: a mobile-money order
 * must actually have been paid (otherwise a vendor could complete an order
 * placed from a throwaway account and never paid, and draw a payout of money
 * the platform never received).
 *
 * The payout balance is credited only for mobile-money orders - that's the
 * only money the platform actually holds. A cash order's customer paid the
 * vendor directly, so crediting it here would pay the vendor twice.
 *
 * @param {object} [extraFields] additional $set fields to apply atomically
 *   alongside the status change (e.g. pickupDetails.pickedUpAt).
 * @returns {Promise<Order|null>} the updated order, or null if it was already
 *   in a terminal state (completed/cancelled) or unpaid, and nothing was changed.
 */
const completeOrderAtomically = async (orderId, extraFields = {}) => {
  const { payoutHoldDays = 7 } = await PlatformSettings.getSettings();
  let order = null;
  let earning = 0;

  // Status change, balance credit, stats and the ledger row commit together.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      earning = 0;
      order = await Order.findOneAndUpdate(
        { _id: orderId, status: { $nin: TERMINAL_ORDER_STATUSES }, ...PAYMENT_SETTLED_FILTER },
        {
          $set: {
            status: 'completed',
            'statusTimestamps.completedAt': new Date(),
            ...extraFields,
          },
        },
        { new: true, session }
      );
      if (!order) return;

      const totalMeals = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const co2Increment = totalMeals * IMPACT_FACTORS.CO2_PER_MEAL;
      const waterIncrement = totalMeals * IMPACT_FACTORS.WATER_PER_MEAL;
      const platformHeldFunds = order.payment?.paymentMethod === 'mobile_money';
      const businessId = order.business._id || order.business;
      // Less any vendor-funded dispute refund granted before completion.
      earning = platformHeldFunds
        ? Math.max(0, order.pricing.vendorAmount - (order.pricing.vendorRefunded || 0))
        : 0;

      await User.updateOne(
        { _id: order.customer },
        { $inc: { 'stats.totalSpent': order.pricing.total } },
        { session }
      );
      const business = await Business.findOneAndUpdate(
        { _id: businessId },
        {
          $inc: {
            'stats.balance': earning,
            'stats.impact.mealsRescued': totalMeals,
            'stats.impact.co2Saved': co2Increment,
            'stats.impact.waterSaved': waterIncrement,
            'metrics.mealsSaved': totalMeals,
            'metrics.co2Saved': co2Increment,
          },
        },
        { new: true, session }
      );

      if (earning > 0) {
        const refunded = order.pricing.vendorRefunded || 0;
        await recordEntry(
          {
            business: businessId,
            type: 'order_earning',
            amount: earning,
            balanceAfter: business?.stats?.balance,
            currency: order.pricing.currency,
            availableAt: holdUntil(payoutHoldDays),
            order: order._id,
            description:
              `Order ${order.orderNumber} completed: ${order.pricing.subtotal} sales - ` +
              `${order.pricing.platformFee} ChopNow fee` +
              (refunded ? ` - ${refunded} refunded earlier` : '') +
              (payoutHoldDays ? ` (on hold ${payoutHoldDays} days)` : ''),
          },
          session
        );
      }
    });
  } finally {
    session.endSession();
  }
  return order;
};

const respondCheckoutError = (res, error, logMessage) => {
  if (error instanceof CheckoutError) {
    return res.status(error.status).json({ message: error.message, details: error.details });
  }
  logger.error({ err: error }, logMessage);
  return res.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
};

// Cash orders are live straight away (vendors are notified now); mobile-money
// orders notify vendors only once paid (see applyDepositOutcome).
const afterOrdersPlaced = async (orders) => {
  for (const order of orders) {
    if (order.payment?.paymentMethod === 'cash') {
      await sendNewOrderNotifications(order._id);
    } else {
      try {
        socketManager
          .getIO()
          .to(`user_${order.customer.toString()}`)
          .emit('order_status_updated', order);
      } catch (socketErr) {
        logger.error({ err: socketErr }, 'Failed to emit socket order_status_updated event');
      }
    }
  }
};

/**
 * @desc    Create a new order for a single listing (kept for older app versions;
 *          new clients use POST /orders/checkout)
 * @route   POST /api/orders
 * @access  Private (consumer, business_owner, admin)
 */
const createOrder = async (req, res) => {
  try {
    const { listing, items, fulfillmentType, deliveryDetails, pickupDetails, payment } = req.body;

    if (!listing || !items || !fulfillmentType) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    // This endpoint places ONE order for ONE listing. Older clients sent a
    // whole mixed cart here and every item was charged at the first listing's
    // price and taken from its stock - refuse that instead of mis-charging.
    if (items.some((i) => i.listing && String(i.listing) !== String(listing))) {
      return res.status(400).json({
        message:
          'Items from different listings must be checked out together. Please update the app and try again.',
      });
    }

    // C4: prices are always computed server-side from the listing (inside
    // placeCheckout); client unitPrice/subtotal are ignored.
    const { orders } = await placeCheckout({
      customerId: req.user._id,
      items: items.map((i) => ({ listing, quantity: i.quantity })),
      fulfillmentType,
      deliveryDetails,
      pickupDetails,
      paymentMethod: payment?.paymentMethod,
    });

    await afterOrdersPlaced(orders);
    res.status(201).json(orders[0]);
  } catch (error) {
    respondCheckoutError(res, error, 'Create order failed');
  }
};

/**
 * @desc    Price a cart (any number of vendors) without placing it
 * @route   POST /api/orders/quote
 * @access  Private
 */
const quoteCheckout = async (req, res) => {
  try {
    const { items, fulfillmentType, payment } = req.body;
    const quote = await buildQuote({
      items,
      fulfillmentType,
      paymentMethod: payment?.paymentMethod,
    });
    res.json(quote);
  } catch (error) {
    respondCheckoutError(res, error, 'Checkout quote failed');
  }
};

/**
 * @desc    Place a whole cart: one order per vendor, paid with one payment
 * @route   POST /api/orders/checkout
 * @access  Private
 */
const createCheckout = async (req, res) => {
  try {
    const { items, fulfillmentType, deliveryDetails, pickupDetails, payment } = req.body;
    const { checkoutGroup, orders, quote } = await placeCheckout({
      customerId: req.user._id,
      items,
      fulfillmentType,
      deliveryDetails,
      pickupDetails,
      paymentMethod: payment?.paymentMethod,
    });

    await afterOrdersPlaced(orders);
    res.status(201).json({ checkoutId: checkoutGroup, orders, totals: quote.totals });
  } catch (error) {
    respondCheckoutError(res, error, 'Checkout failed');
  }
};

/**
 * Reusable helper to send all vendor & customer notifications once an order is valid/paid
 */
const sendNewOrderNotifications = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate('listing').populate('business');
    if (!order) {
      logger.error({ orderId }, 'sendNewOrderNotifications failed: Order not found');
      return;
    }

    const listingDoc = order.listing;
    const businessForNotif = await Business.findById(order.business).populate('owner');
    const customer = await User.findById(order.customer);
    if (!customer) return;

    const customerName =
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
    const deliveryAddr =
      order.fulfillmentType === 'delivery' && order.deliveryDetails?.address
        ? typeof order.deliveryDetails.address === 'string'
          ? order.deliveryDetails.address
          : `${order.deliveryDetails.address.street || ''}, ${order.deliveryDetails.address.city || ''}`.trim()
        : null;

    // 1. Create notification for customer with rich metadata
    await Notification.createNotification({
      user: customer._id,
      title: 'Order Confirmed',
      message: `Your order #${order.orderNumber} has been placed successfully`,
      type: 'order_confirmed',
      relatedOrder: order._id,
      relatedBusiness: order.business,
      link: '/my-orders',
      metadata: {
        orderNumber: order.orderNumber,
        orderTotal: order.pricing.total,
        currency: order.pricing.currency,
        fulfillmentType: order.fulfillmentType,
        pickupCode: order.pickupDetails?.pickupCode,
        deliveryAddress: deliveryAddr,
        businessName: businessForNotif?.name || 'Vendor',
        businessLogo: businessForNotif?.media?.logo,
        listingTitle: listingDoc?.title,
        listingImage: listingDoc?.photos?.[0],
      },
    });

    // 2. Create notification for vendor with rich metadata
    if (businessForNotif && businessForNotif.owner) {
      await Notification.createNotification({
        user: businessForNotif.owner._id,
        title: 'New Order Received',
        message: `New order #${order.orderNumber} from ${customerName}`,
        type: 'new_order',
        relatedOrder: order._id,
        relatedBusiness: businessForNotif._id,
        link: '/dashboard',
        metadata: {
          orderNumber: order.orderNumber,
          orderTotal: order.pricing.total,
          currency: order.pricing.currency,
          fulfillmentType: order.fulfillmentType,
          deliveryAddress: deliveryAddr,
          customerName,
          listingTitle: listingDoc?.title,
          listingImage: listingDoc?.photos?.[0],
          actionLabel: 'View Order',
          actionUrl: '/dashboard',
        },
      });
    }

    // 3. EMAIL: Order confirmation to customer
    if (customer.preferences?.notifications?.email !== false) {
      sendOrderConfirmationEmail(customer.email, customerName, order).catch((err) =>
        logger.error({ err }, 'Failed to send order confirmation email')
      );
    }

    // 4. EMAIL: Vendor notification
    if (businessForNotif && businessForNotif.owner) {
      const vendorUser = await User.findById(businessForNotif.owner._id)
        .select('email preferences')
        .lean();
      if (vendorUser && vendorUser.preferences?.notifications?.email !== false) {
        sendVendorOrderNotification(vendorUser.email, businessForNotif.name, order).catch((err) =>
          logger.error({ err }, 'Failed to send vendor order notification email')
        );
      }
    }

    // 5. --- WebSockets: Emit new order to vendor ---
    try {
      const io = socketManager.getIO();
      if (businessForNotif) {
        io.to(`business_${businessForNotif._id.toString()}`).emit('new_order', order);
      }
    } catch (socketErr) {
      logger.error({ err: socketErr }, 'Failed to emit socket new_order event');
    }
  } catch (error) {
    logger.error({ err: error, orderId }, 'Error running sendNewOrderNotifications helper');
  }
};

/**
 * @desc    Get all orders (with filters)
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = async (req, res) => {
  try {
    const { status, fulfillmentType } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Role-based filtering. A ?role= switch is honoured only for a role the
    // user actually holds - otherwise any customer could pass ?role=admin and
    // list every customer's orders.
    const userRoles = req.user.roles || [req.user.role];
    const filterRole =
      req.query.role && userRoles.includes(req.query.role) ? req.query.role : req.user.role;
    if (filterRole === 'business_owner') {
      const businesses = await Business.find({ owner: req.user._id }).select('_id').lean();
      query.business = { $in: businesses.map((b) => b._id) };
    } else if (filterRole === 'admin') {
      if (req.query.role === 'consumer') {
        query.customer = req.user._id;
      }
    } else {
      query.customer = req.user._id;
    }

    if (status) {
      if (status === 'pending') {
        query.status = {
          $in: ['pending_payment', 'paid', 'confirmed', 'ready_for_pickup', 'out_for_delivery'],
        };
      } else if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (fulfillmentType) query.fulfillmentType = fulfillmentType;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('business', 'name type address contact')
      .populate('listing', 'title category photos')
      .populate({ path: 'items.listing', select: 'title category photos pricing' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('business', 'name type address contact media location')
      .populate('listing', 'title category photos pricing')
      .populate({ path: 'items.listing', select: 'title category photos pricing' })
      .populate('delivery')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isBusinessOwner = req.user.role === 'business_owner';
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isBusinessOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private (business owner, admin)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Please provide status' });
    }

    const order = await Order.findById(req.params.id).populate('business');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const businessDoc = await Business.findById(order.business._id);
    if (businessDoc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!VENDOR_SETTABLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status '${status}' cannot be set directly` });
    }
    if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
      return res.status(400).json({
        message: `Order is already '${order.status}' and cannot be updated`,
      });
    }
    if (!isPaymentSettled(order)) {
      return res.status(400).json({ message: 'This order has not been paid yet' });
    }

    // C7/H6 fix: 'completed' goes through the shared idempotent helper (funds
    // the business payout balance, guards against replay) instead of a plain
    // save. Every other status is also a compare-and-swap on "not terminal":
    // a plain save racing a completion could otherwise flip a completed order
    // back to e.g. 'confirmed', letting it be completed (and credited) twice.
    let updated;
    if (status === 'completed') {
      updated = await completeOrderAtomically(order._id);
    } else {
      const timestampField = {
        confirmed: 'confirmedAt',
        ready_for_pickup: 'readyAt',
      }[status];
      updated = await Order.findOneAndUpdate(
        { _id: order._id, status: { $nin: TERMINAL_ORDER_STATUSES }, ...PAYMENT_SETTLED_FILTER },
        {
          $set: {
            status,
            ...(timestampField ? { [`statusTimestamps.${timestampField}`]: new Date() } : {}),
          },
        },
        { new: true }
      );
    }
    if (!updated) {
      return res.status(409).json({ message: 'Order changed state; please refresh and retry' });
    }
    // The atomic update wrote to the DB directly; sync this (populated)
    // in-memory copy so the response and socket broadcast below aren't stale.
    order.set({ status: updated.status, statusTimestamps: updated.statusTimestamps });

    // Get related data for rich notifications
    const listing = await Listing.findById(order.listing);
    const deliveryAddr =
      order.fulfillmentType === 'delivery' && order.deliveryDetails?.address
        ? `${order.deliveryDetails.address.street || ''}, ${order.deliveryDetails.address.city || ''}`.trim()
        : null;

    // Create notifications with rich metadata based on status
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'other';

    switch (status) {
      case 'confirmed':
        notificationTitle = 'Order Confirmed by Vendor';
        notificationMessage = `${businessDoc.name} is preparing your order #${order.orderNumber}`;
        notificationType = 'order_confirmed';
        break;
      case 'ready_for_pickup':
        notificationTitle = 'Order Ready for Pickup!';
        notificationMessage = `Your order #${order.orderNumber} is ready. Show code: ${order.pickupDetails?.pickupCode}`;
        notificationType = 'order_ready';
        break;
      case 'out_for_delivery':
        notificationTitle = 'Order Out for Delivery';
        notificationMessage = `Your order #${order.orderNumber} is on its way to you`;
        notificationType = 'order_out_for_delivery';
        break;
      case 'completed':
        // Balance crediting and impact-stat increments already happened
        // inside completeOrderAtomically above.
        notificationTitle = 'Order Completed';
        notificationMessage = `Thank you! Your order #${order.orderNumber} has been completed`;
        notificationType = 'order_completed';
        break;
    }

    if (notificationTitle) {
      // Create rich notification
      await Notification.createNotification({
        user: order.customer,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        relatedOrder: order._id,
        relatedBusiness: businessDoc._id,
        link: '/my-orders',
        metadata: {
          orderNumber: order.orderNumber,
          orderTotal: order.pricing.total,
          currency: order.pricing.currency,
          fulfillmentType: order.fulfillmentType,
          pickupCode: order.pickupDetails?.pickupCode,
          deliveryAddress: deliveryAddr,
          businessName: businessDoc.name,
          businessLogo: businessDoc.media?.logo,
          listingTitle: listing?.title,
          listingImage: listing?.photos?.[0],
          actionLabel: status === 'ready_for_pickup' ? 'View Pickup Code' : 'View Order',
          actionUrl: '/my-orders',
        },
      });

      // EMAIL STRATEGY: Only send emails for TIME-SENSITIVE actions
      // - ready_for_pickup: User MUST act (go pick up food before it spoils)
      // Other statuses: In-app notification is sufficient
      const customer = await User.findById(order.customer);
      if (customer && customer.preferences?.notifications?.email !== false) {
        const customerName =
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;

        if (status === 'ready_for_pickup') {
          // ESSENTIAL EMAIL: User needs to act NOW (food is ready, may spoil)
          sendOrderReadyForPickupEmail(customer.email, customerName, order).catch((err) =>
            logger.error({ err }, 'Failed to send pickup ready email')
          );
        } else if (status === 'out_for_delivery') {
          // ESSENTIAL EMAIL: Rider is on the way, customer should be home
          sendOrderOutForDeliveryEmail(customer.email, customerName, order).catch((err) =>
            logger.error({ err }, 'Failed to send out for delivery email')
          );
        } else if (status === 'completed') {
          // NICE-TO-HAVE: Completion + review prompt
          sendOrderCompletedEmail(customer.email, customerName, order).catch((err) =>
            logger.error({ err }, 'Failed to send order completed email')
          );
        }
      }
    }

    // --- WebSockets: Emit status update to customer and vendor ---
    try {
      const io = socketManager.getIO();
      // Inform customer
      io.to(`user_${order.customer.toString()}`).emit('order_status_updated', order);
      // Inform vendor
      io.to(`business_${order.business._id.toString()}`).emit('order_status_updated', order);
    } catch (socketErr) {
      logger.error({ err: socketErr }, 'Failed to emit socket order_status_updated event');
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * Cancels an order and restores its reserved inventory in a single
 * transaction.
 *
 * H7 fix: previously only this dedicated cancelOrder endpoint did the
 * inventory restore - the generic updateOrderStatus endpoint and the
 * delivery-triggered cancellation path (deliveryController.js) both just
 * flipped Order.status to 'cancelled' directly, permanently shrinking the
 * listing's available inventory by whatever was reserved for that order.
 * Both now call this instead.
 *
 * The order is claimed with a status-filtered findOneAndUpdate inside the
 * transaction, so two racing cancellers (customer tap + expiry job, a FAILED
 * webhook + the customer, a double-tap) can't both restore the stock: the
 * loser's claim matches nothing and it returns false. (This previously
 * checked canBeCancelled() on an in-memory copy and saved via
 * order.updateStatus(), which wrote outside the transaction.)
 *
 * @param {Order} order - an already-fetched Order document. `order.listing`
 *   may be populated or a bare ObjectId; either works. It is updated in place
 *   to the cancelled state on success.
 * @param {object} [options]
 * @param {string[]} [options.fromStatuses] - only cancel from these statuses
 *   (defaults to every cancellable status).
 * @param {string} [options.paymentStatus] - paymentStatus to record when no
 *   refund is needed (e.g. 'failed' for a failed/expired payment).
 * @param {ClientSession} [options.session] - run inside the caller's
 *   transaction instead of starting one.
 * @returns {Promise<boolean>} true if cancelled, false if the order was not
 *   in a cancellable state (nothing was changed).
 */
const cancelOrderAndRestoreInventory = async (
  order,
  { requestedBy, reason, fromStatuses = CANCELLABLE_STATUSES, paymentStatus, session } = {}
) => {
  if (!fromStatuses.includes(order.status)) return false;

  const listingId = order.listing._id || order.listing;
  let cancelled = null;

  const cancelInSession = async (session) => {
    cancelled = null;
    const now = new Date();
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: { $in: fromStatuses } },
      { $set: { status: 'cancelled', 'statusTimestamps.cancelledAt': now } },
      { new: true, session }
    );
    if (!claimed) return;

    // An order may hold several listings from its vendor - put each item's
    // quantity back on its own listing.
    const quantityByListing = new Map();
    for (const item of claimed.items) {
      const id = String(item.listing || listingId);
      quantityByListing.set(id, (quantityByListing.get(id) || 0) + item.quantity);
    }
    for (const [id, quantity] of quantityByListing) {
      const listing = await Listing.findById(id).session(session);
      if (!listing) continue;
      listing.inventory.quantity += quantity;
      listing.inventory.reserved = Math.max(0, listing.inventory.reserved - quantity);
      if (listing.status === 'sold_out' && listing.inventory.quantity > 0) {
        listing.status = 'active';
      }
      await listing.save({ session });
    }

    // A mobile-money order that was already paid (paid/confirmed) must not
    // just be cancelled - the customer's money has to come back. There's no
    // real pawaPay refund API integrated, so queue it in the same tracked ops
    // queue dispute refunds use (see RefundRequest).
    const alreadyPaid =
      claimed.payment?.paymentMethod === 'mobile_money' &&
      MONEY_RECEIVED_STATUSES.includes(claimed.payment?.paymentStatus);
    if (alreadyPaid) {
      // Refund what hasn't already been refunded (e.g. by an earlier partial
      // dispute refund) - never more than the order total in all.
      const [{ refunded = 0 } = {}] = await RefundRequest.aggregate([
        { $match: { order: claimed._id, status: { $ne: 'failed' } } },
        { $group: { _id: null, refunded: { $sum: '$amount' } } },
      ]).session(session);
      const remaining = claimed.pricing.total - refunded;
      if (remaining > 0) {
        const payment = await Payment.findOne({
          $or: [{ order: claimed._id }, { orders: claimed._id }],
          status: 'completed',
        }).session(session);
        await RefundRequest.create(
          [
            {
              order: claimed._id,
              payment: payment?._id,
              business: claimed.business,
              customer: claimed.customer,
              amount: remaining,
              currency: claimed.pricing.currency,
              reason: reason || 'Paid order cancelled',
              requestedBy: requestedBy || claimed.customer,
            },
          ],
          { session }
        );
      }
      claimed.payment.paymentStatus = 'refund_pending';
      await claimed.save({ session });
    } else if (paymentStatus) {
      claimed.payment.paymentStatus = paymentStatus;
      await claimed.save({ session });
    }

    cancelled = claimed;
  };

  if (session) {
    await cancelInSession(session);
  } else {
    const ownSession = await mongoose.startSession();
    try {
      await ownSession.withTransaction(() => cancelInSession(ownSession));
    } finally {
      ownSession.endSession();
    }
  }

  if (!cancelled) return false;
  order.set({
    status: cancelled.status,
    statusTimestamps: cancelled.statusTimestamps,
    payment: cancelled.payment,
  });
  return true;
};

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('listing');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const cancelled = await cancelOrderAndRestoreInventory(order, {
      requestedBy: req.user._id,
      reason: 'Cancelled by customer',
    });
    if (!cancelled) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // --- Post-transaction: notifications (non-critical) ---

    // Get business and customer info for notifications
    const business = await Business.findById(order.business).populate('owner');
    const customer = await User.findById(order.customer);
    const customerName = customer
      ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
      : 'Customer';

    // Create notification for customer with rich metadata
    await Notification.createNotification({
      user: order.customer,
      title: 'Order Cancelled',
      message: `Your order #${order.orderNumber} has been cancelled`,
      type: 'order_cancelled',
      relatedOrder: order._id,
      relatedBusiness: order.business,
      link: '/my-orders',
      metadata: {
        orderNumber: order.orderNumber,
        orderTotal: order.pricing.total,
        currency: order.pricing.currency,
        businessName: business?.name || 'Vendor',
        businessLogo: business?.media?.logo,
        listingTitle: order.listing?.title,
        listingImage: order.listing?.photos?.[0],
        actionLabel: 'View Details',
        actionUrl: '/my-orders',
      },
    });

    // Create notification for vendor with rich metadata
    if (business && business.owner) {
      await Notification.createNotification({
        user: business.owner._id,
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} was cancelled by ${customerName}`,
        type: 'order_cancelled',
        relatedOrder: order._id,
        relatedBusiness: business._id,
        link: '/dashboard',
        metadata: {
          orderNumber: order.orderNumber,
          orderTotal: order.pricing.total,
          currency: order.pricing.currency,
          customerName,
          listingTitle: order.listing?.title,
          listingImage: order.listing?.photos?.[0],
          actionLabel: 'View Orders',
          actionUrl: '/dashboard',
        },
      });
    }
    // EMAIL: Cancellation emails to both customer and vendor
    if (customer && customer.preferences?.notifications?.email !== false) {
      sendOrderCancelledEmail(customer.email, customerName, order).catch((err) =>
        logger.error({ err }, 'Failed to send order cancelled email to customer')
      );
    }
    if (business && business.owner) {
      const vendorOwner = await User.findById(business.owner._id)
        .select('email preferences')
        .lean();
      if (vendorOwner && vendorOwner.preferences?.notifications?.email !== false) {
        sendVendorOrderCancelledEmail(vendorOwner.email, business.name, order, customerName).catch(
          (err) => logger.error({ err }, 'Failed to send order cancelled email to vendor')
        );
      }
    }

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    logger.error({ err: error }, 'Cancel order failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Verify pickup code
 * @route   POST /api/orders/:id/verify-pickup
 * @access  Private (business owner, admin)
 */
const verifyPickupCode = async (req, res) => {
  try {
    const pickupCode = req.body.pickupCode || req.body.code;

    const order = await Order.findById(req.params.id).populate('business');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const businessDoc = await Business.findById(order.business._id);
    if (businessDoc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.fulfillmentType !== 'pickup') {
      return res.status(400).json({ message: 'This is not a pickup order' });
    }

    if (order.pickupDetails.pickupCode !== pickupCode) {
      return res.status(400).json({ message: 'Invalid pickup code' });
    }

    if (!TERMINAL_ORDER_STATUSES.includes(order.status) && !isPaymentSettled(order)) {
      return res.status(400).json({ message: 'This order has not been paid yet' });
    }

    // C7/H6 fix: same atomic, idempotent, balance-crediting completion as
    // updateOrderStatus - see completeOrderAtomically.
    const completed = await completeOrderAtomically(order._id, {
      'pickupDetails.pickedUpAt': new Date(),
    });
    if (!completed) {
      return res.status(400).json({
        message: `Order is already '${order.status}' and cannot be completed again`,
      });
    }

    // Email customer their completion summary + review prompt
    const customer = await User.findById(order.customer)
      .select('email firstName lastName preferences')
      .lean();
    if (customer && customer.preferences?.notifications?.email !== false) {
      const customerName =
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;
      sendOrderCompletedEmail(customer.email, customerName, completed).catch((err) =>
        logger.error({ err }, 'Failed to send order completed email on pickup verify')
      );
    }

    res.json({ message: 'Pickup verified successfully', order: completed });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Verify pickup code directly (without order ID)
 * @route   POST /api/orders/verify-pickup-code
 * @access  Private (business owner, admin)
 */
const verifyPickupCodeDirect = async (req, res) => {
  try {
    const pickupCode = req.body.pickupCode || req.body.code;

    if (!pickupCode) {
      return res.status(400).json({ message: 'Please provide pickup code' });
    }

    // Find businesses owned by this user
    let allowedBusinesses = [];
    if (req.user.role === 'business_owner') {
      const businesses = await Business.find({ owner: req.user._id }).select('_id').lean();
      allowedBusinesses = businesses.map((b) => b._id.toString());
    }

    // Query active pickup orders
    const query = {
      fulfillmentType: 'pickup',
      'pickupDetails.pickupCode': pickupCode,
      status: { $in: ['paid', 'confirmed', 'ready_for_pickup'] },
    };

    if (req.user.role === 'business_owner') {
      query.business = { $in: allowedBusinesses };
    }

    const order = await Order.findOne(query).populate('business');

    if (!order) {
      return res.status(404).json({ message: 'Active order with this pickup code not found' });
    }

    // C7/H6 fix: same atomic, idempotent, balance-crediting completion as
    // updateOrderStatus - see completeOrderAtomically. The query above already
    // excludes already-completed orders, but the transition itself still
    // needs to be atomic against a concurrent duplicate scan hitting this
    // same order before either has written back.
    const completed = await completeOrderAtomically(order._id, {
      'pickupDetails.pickedUpAt': new Date(),
    });
    if (!completed) {
      return res.status(400).json({
        message: `Order is already '${order.status}' and cannot be completed again`,
      });
    }

    // Email customer
    const customer = await User.findById(order.customer)
      .select('email firstName lastName preferences')
      .lean();
    if (customer && customer.preferences?.notifications?.email !== false) {
      const customerName =
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;
      sendOrderCompletedEmail(customer.email, customerName, completed).catch((err) =>
        logger.error({ err }, 'Failed to send order completed email on pickup verify')
      );
    }

    res.json({
      message: 'Pickup verified and order completed successfully',
      order: {
        _id: order.orderNumber || order._id,
        orderId: order._id,
        customerName: customer
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          : 'Customer',
        total: order.pricing.total,
        status: 'Completed',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Direct verify pickup failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all orders (admin only)
 * @route   GET /api/orders/admin
 * @access  Private (admin)
 */
const getAdminOrders = async (req, res) => {
  try {
    const { status, fulfillmentType, business, customer } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      if (status === 'pending') {
        query.status = {
          $in: ['pending_payment', 'paid', 'confirmed', 'ready_for_pickup', 'out_for_delivery'],
        };
      } else if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (fulfillmentType) query.fulfillmentType = fulfillmentType;
    if (business) query.business = business;
    if (customer) query.customer = customer;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('business', 'name type address contact')
      .populate('listing', 'title category photos')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createOrder,
  quoteCheckout,
  createCheckout,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  verifyPickupCode,
  verifyPickupCodeDirect,
  getAdminOrders,
  sendNewOrderNotifications,
  completeOrderAtomically,
  cancelOrderAndRestoreInventory,
};
