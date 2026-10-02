const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Business = require('../models/Business');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { recordEntry } = require('../services/ledgerService');
const logger = require('../utils/logger');
const socketManager = require('../socket');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');
const { completeOrderAtomically, cancelOrderAndRestoreInventory } = require('./orderController');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Emit a socket event safely (socket.io may not be ready in tests)
 */
const emitSafe = (room, event, data) => {
  try {
    socketManager.getIO().to(room).emit(event, data);
  } catch {
    // Socket.io not initialised (tests / CLI) — silently skip
  }
};

/**
 * What the rider is credited for delivering this order: the delivery fee less
 * the platform's commission. Orders placed before the fee split existed have
 * neither riderAmount nor deliveryCommission set - they pay the full fee.
 */
const riderEarningFor = (order, delivery) => {
  if (order.payment?.paymentMethod === 'cash') return 0;
  const p = order.pricing || {};
  if (p.riderAmount || p.deliveryCommission) return p.riderAmount || 0;
  return delivery.deliveryFee || 0;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc    Create delivery record for a delivery order
 * @route   POST /api/v1/deliveries
 * @access  Private (business_owner, admin)
 *
 * Called by the vendor when they confirm a delivery order and want to dispatch it.
 * Auto-populates pickup location from the business and dropoff from the order.
 */
const createDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findById(orderId)
      .populate('business')
      .populate('customer', 'firstName lastName phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.fulfillmentType !== 'delivery') {
      return res.status(400).json({ message: 'Order is not a delivery order' });
    }

    // Check authorization — only the owning business or admin
    const business = order.business;
    if (
      business.owner.toString() !== req.user._id.toString() &&
      !req.user.roles.includes('admin')
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only dispatch live, paid orders - otherwise a rider could be credited a
    // delivery fee for an order that was cancelled or never paid.
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Order is already '${order.status}'` });
    }
    const paymentSettled =
      order.payment?.paymentMethod === 'cash' ||
      ['completed', 'refund_pending', 'refunded'].includes(order.payment?.paymentStatus);
    if (!paymentSettled) {
      return res.status(400).json({ message: 'This order has not been paid yet' });
    }

    // Prevent duplicate delivery records
    const existing = await Delivery.findOne({ order: orderId });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'Delivery record already exists for this order', delivery: existing });
    }

    // Build pickup location from business
    const pickupCoords = business.location?.coordinates || [0, 0];
    const pickupAddress =
      typeof business.address === 'string'
        ? business.address
        : `${business.address?.street || ''}, ${business.address?.city || ''}`.trim();

    // Build dropoff location from order delivery details
    const dd = order.deliveryDetails || {};
    const dropoffAddress =
      typeof dd.address === 'string'
        ? dd.address
        : `${dd.address?.street || ''}, ${dd.address?.city || ''}`.trim();

    // Orders store GeoJSON at deliveryDetails.address.location (see
    // normalizeDeliveryDetails in orderController). Coordinates may be absent
    // for manual addresses — default to [0,0].
    const dropoffCoords = dd.address?.location?.coordinates || [0, 0];

    const recipientName =
      dd.recipientName ||
      `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() ||
      'Customer';
    // Neither client collects a recipient phone, and many customers have none on
    // their profile - fall back to the number that paid for the order (the
    // customer's mobile money line) before giving up.
    let recipientPhone = dd.recipientPhone || order.customer?.phone || '';
    if (!recipientPhone) {
      const payment = await Payment.findOne({
        $or: [{ order: order._id }, { orders: order._id }],
        status: 'completed',
      })
        .select('payerPhoneNumber')
        .lean();
      recipientPhone = payment?.payerPhoneNumber
        ? `+${payment.payerPhoneNumber.replace(/^\+/, '')}`
        : '';
    }
    if (!recipientPhone) {
      return res.status(400).json({
        message:
          'No contact phone for this customer - ask them to add a phone number to their profile',
      });
    }

    const delivery = await Delivery.create({
      order: order._id,
      pickupLocation: {
        businessName: business.name,
        address: pickupAddress,
        location: { type: 'Point', coordinates: pickupCoords },
        contactPhone: business.phone || business.contact?.phone || '',
      },
      dropoffLocation: {
        recipientName,
        recipientPhone,
        address: dropoffAddress,
        location: { type: 'Point', coordinates: dropoffCoords },
        instructions: dd.instructions || '',
      },
      deliveryFee: order.pricing?.deliveryFee || 0,
      currency: order.pricing?.currency || 'RWF',
    });

    // Calculate and store distance
    delivery.calculateDistance();
    delivery.estimatedDuration = Math.round((delivery.distance / 20) * 60); // ~20 km/h in city
    await delivery.save();

    // Link delivery on order
    await Order.findByIdAndUpdate(order._id, { delivery: delivery._id });

    logger.info({ deliveryId: delivery._id, orderId: order._id }, 'Delivery created');

    res.status(201).json(delivery);
  } catch (error) {
    logger.error({ err: error }, 'Create delivery failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get delivery by order ID
 * @route   GET /api/v1/deliveries/order/:orderId
 * @access  Private (customer, business_owner, rider, admin)
 */
const getDeliveryByOrder = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ order: req.params.orderId })
      .populate('rider', 'firstName lastName phone avatar')
      .lean();

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found for this order' });
    }

    // Authorization: only involved parties
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes('admin');
    const isRider = delivery.rider && delivery.rider._id?.toString() === req.user._id.toString();

    let isBusinessOwner = false;
    if (req.user.roles.includes('business_owner')) {
      const biz = await Business.findById(order.business).select('owner').lean();
      isBusinessOwner = biz?.owner.toString() === req.user._id.toString();
    }

    if (!isCustomer && !isAdmin && !isRider && !isBusinessOwner) {
      return res.status(403).json({ message: 'Not authorized to view this delivery' });
    }

    res.json(delivery);
  } catch (error) {
    logger.error({ err: error }, 'Get delivery failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all unassigned deliveries (available for riders to pick up)
 * @route   GET /api/v1/deliveries/available
 * @access  Private (rider, admin)
 */
const getAvailableDeliveries = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { status: 'pending', rider: { $exists: false } };

    // Geospatial filter — find deliveries with pickup near rider's location
    if (lat && lng) {
      query['pickupLocation.location'] = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], parseFloat(radius) / 6378.1], // radius in radians
        },
      };
    }

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate({ path: 'order', select: 'orderNumber pricing fulfillmentType' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }) // oldest first — fairness
        .lean(),
      Delivery.countDocuments(query),
    ]);

    res.json({ deliveries, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error({ err: error }, 'Get available deliveries failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get rider's assigned deliveries
 * @route   GET /api/v1/deliveries/my
 * @access  Private (rider)
 */
const getMyDeliveries = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { rider: req.user._id };
    if (status) query.status = status;

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate({ path: 'order', select: 'orderNumber pricing customer fulfillmentType' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Delivery.countDocuments(query),
    ]);

    res.json({ deliveries, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error({ err: error }, 'Get my deliveries failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Assign a rider to a delivery
 * @route   PATCH /api/v1/deliveries/:id/assign
 * @access  Private (admin) OR rider self-assigns (if status=pending and no rider)
 */
const assignRider = async (req, res) => {
  try {
    const { riderId } = req.body;

    const delivery = await Delivery.findById(req.params.id).populate('order');
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Checked before status: an already-claimed delivery is also no longer
    // 'pending', and callers (and the race below) must always see 409 for
    // "someone else got it", not a 400 that depends on request timing.
    if (delivery.rider) {
      return res.status(409).json({ message: 'Delivery already has a rider assigned' });
    }

    if (delivery.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Cannot assign rider to a delivery with status '${delivery.status}'` });
    }

    // Determine the actual rider ID
    let assignedRiderId;
    if (req.user.roles.includes('admin')) {
      // Admin assigns a specific rider
      if (!riderId) {
        return res.status(400).json({ message: 'riderId is required for admin assignment' });
      }
      assignedRiderId = riderId;
    } else if (req.user.roles.includes('rider')) {
      // Rider self-assigns
      assignedRiderId = req.user._id;
    } else {
      return res.status(403).json({ message: 'Not authorized to assign riders' });
    }

    // Verify the rider exists and has the rider role
    const rider = await User.findById(assignedRiderId)
      .select('firstName lastName phone roles status')
      .lean();
    if (!rider || !rider.roles.includes('rider')) {
      return res.status(400).json({ message: 'User is not a rider' });
    }
    if (rider.status === 'suspended') {
      return res.status(400).json({ message: 'Rider account is suspended' });
    }

    // Same check-then-write race updateDeliveryStatus's C6 fix closed for
    // status transitions: two riders self-assigning the same pending,
    // unassigned delivery within the same instant could both pass the plain
    // findById checks above and then both `.save()` - a read-then-write isn't
    // enough on its own. Atomic compare-and-swap (matches only if the
    // delivery is STILL pending and unassigned at write time) guarantees at
    // most one of them actually gets it; the loser sees a clean 409 instead
    // of silently overwriting the winner's assignment.
    const assignedDelivery = await Delivery.findOneAndUpdate(
      { _id: delivery._id, status: 'pending', rider: { $exists: false } },
      {
        $set: {
          rider: assignedRiderId,
          riderName: `${rider.firstName || ''} ${rider.lastName || ''}`.trim(),
          riderPhone: rider.phone || '',
          status: 'assigned',
          'statusTimestamps.assignedAt': new Date(),
        },
      },
      { new: true }
    );
    if (!assignedDelivery) {
      return res.status(409).json({ message: 'Delivery already has a rider assigned' });
    }
    delivery.rider = assignedDelivery.rider;
    delivery.riderName = assignedDelivery.riderName;
    delivery.riderPhone = assignedDelivery.riderPhone;
    delivery.status = assignedDelivery.status;

    // Update order status to out_for_delivery - never out of a terminal state,
    // or a cancelled order could be revived and later completed (and credited).
    await Order.findOneAndUpdate(
      { _id: delivery.order._id, status: { $nin: ['completed', 'cancelled'] } },
      { status: 'out_for_delivery' }
    );

    // Notify customer
    const order = delivery.order;
    await Notification.createNotification({
      user: order.customer,
      title: 'Order Out for Delivery',
      message: `Your order #${order.orderNumber} has been picked up and is on its way`,
      type: 'order_out_for_delivery',
      relatedOrder: order._id,
      link: '/my-orders',
      metadata: {
        orderNumber: order.orderNumber,
        riderName: delivery.riderName,
        riderPhone: delivery.riderPhone,
      },
    });

    // Emit socket events
    emitSafe(`user_${order.customer.toString()}`, 'delivery_assigned', {
      deliveryId: delivery._id,
      orderId: order._id,
      riderName: delivery.riderName,
    });
    emitSafe(`rider_${assignedRiderId.toString()}`, 'delivery_assigned_to_you', delivery);

    logger.info({ deliveryId: delivery._id, riderId: assignedRiderId }, 'Rider assigned');
    res.json(delivery);
  } catch (error) {
    logger.error({ err: error }, 'Assign rider failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update delivery status (rider workflow)
 * @route   PATCH /api/v1/deliveries/:id/status
 * @access  Private (rider who owns delivery, admin)
 *
 * Valid transitions:
 *   assigned → picked_up → in_transit → delivered
 *   any      → cancelled (admin only)
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }

    const delivery = await Delivery.findById(req.params.id).populate('order');
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    // Authorization
    const isAdmin = req.user.roles.includes('admin');
    const isAssignedRider = delivery.rider && delivery.rider.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignedRider) {
      return res.status(403).json({ message: 'Not authorized to update this delivery' });
    }

    if (status === 'cancelled' && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can cancel a delivery' });
    }

    // C6 fix: delivered/cancelled/failed are terminal - nothing may transition
    // out of them. Previously, validTransitions had no entry at all for a
    // terminal delivery.status, so `validTransitions[delivery.status]` was
    // undefined and the guard below was silently skipped - replaying
    // `status: 'delivered'` on an already-delivered delivery slipped straight
    // through and re-ran the rider balance credit every time it was called.
    const TERMINAL_STATUSES = ['delivered', 'cancelled', 'failed'];
    if (TERMINAL_STATUSES.includes(delivery.status)) {
      return res.status(400).json({
        message: `Delivery is already '${delivery.status}' and cannot be updated further`,
      });
    }

    // Validate transition
    const validTransitions = {
      assigned: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'failed', 'cancelled'],
    };

    if (validTransitions[delivery.status] && !validTransitions[delivery.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${delivery.status}' to '${status}'`,
      });
    }

    // C6 fix: the actual status write is an atomic compare-and-swap (matches
    // only if the delivery is STILL non-terminal at write time), not a plain
    // read-then-save - closing the race where two near-simultaneous requests
    // both pass the checks above using the same stale in-memory `delivery`
    // read, then both proceed to credit the rider's balance. Only one request
    // can ever match this filter, so the block below can only run once.
    const statusTimestampMap = {
      picked_up: 'pickedUpAt',
      delivered: 'deliveredAt',
      cancelled: 'cancelledAt',
    };
    const timestampField = statusTimestampMap[status];
    const updateDoc = { status };
    if (timestampField) {
      updateDoc[`statusTimestamps.${timestampField}`] = new Date();
    }
    if (req.body.cancellationReason && status === 'cancelled') {
      updateDoc.cancellationReason = req.body.cancellationReason;
    }

    const updatedDelivery = await Delivery.findOneAndUpdate(
      { _id: delivery._id, status: { $nin: TERMINAL_STATUSES } },
      { $set: updateDoc },
      { new: true }
    );
    if (!updatedDelivery) {
      return res.status(400).json({
        message: 'Delivery is already in a terminal state',
      });
    }

    const order = delivery.order;

    // Sync order status.
    // C7 fix: this used to be a plain Order.findByIdAndUpdate that only ever
    // set status: 'completed', bypassing completeOrderAtomically entirely -
    // for delivery-fulfillment orders (the customer never calls
    // verifyPickupCode/the generic order-status endpoint; the order becomes
    // 'completed' via THIS delivery status transition), that meant
    // Business.stats.balance was never credited at all. Same idempotency
    // guarantee applies here as everywhere else completeOrderAtomically is
    // called: safe to call even on a retried request.
    if (status === 'delivered') {
      await completeOrderAtomically(order._id);

      // Credit the rider's balance - safe to run unconditionally here since
      // the atomic update above (on the Delivery document) guarantees this
      // code path is reached at most once per delivery.
      // The rider earns the delivery fee minus ChopNow's commission - and only
      // on mobile-money orders: for cash the rider collects the fee at the door,
      // and the platform holds nothing to pay out.
      const riderEarning = riderEarningFor(order, delivery);
      if (delivery.rider && riderEarning > 0) {
        const rider = await User.findByIdAndUpdate(
          delivery.rider,
          { $inc: { 'stats.riderBalance': riderEarning } },
          { new: true }
        ).select('+stats.riderBalance');
        await recordEntry({
          user: delivery.rider,
          type: 'delivery_earning',
          amount: riderEarning,
          balanceAfter: rider?.stats?.riderBalance,
          order: order._id,
          description: `Delivery of order ${order.orderNumber}: ${delivery.deliveryFee || 0} fee - ChopNow commission`,
        });
        logger.info(
          { riderId: delivery.rider, amount: riderEarning },
          'Credited rider balance for delivery completion'
        );
      }

      await Notification.createNotification({
        user: order.customer,
        title: 'Order Delivered!',
        message: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!`,
        type: 'order_completed',
        relatedOrder: order._id,
        link: '/my-orders',
      });
      emitSafe(`user_${order.customer.toString()}`, 'order_delivered', { orderId: order._id });
    } else if (status === 'cancelled' || status === 'failed') {
      // H7 fix: this used to be a plain Order.findByIdAndUpdate({status:
      // 'cancelled'}), which never restored the reserved inventory - the
      // listing's stock stayed permanently down by whatever this order had
      // reserved. `order` here only has `listing` as a bare ObjectId (it came
      // from Delivery.findById(...).populate('order'), not a populate on
      // Order.listing itself), which cancelOrderAndRestoreInventory handles.
      const orderDoc = await Order.findById(order._id);
      if (orderDoc) {
        await cancelOrderAndRestoreInventory(orderDoc, {
          requestedBy: req.user._id,
          reason: `Delivery ${status}`,
        });
      }
    }

    // Emit delivery status to tracking subscribers
    emitSafe(`order_tracking_${order._id.toString()}`, 'delivery_status_update', {
      status,
      timestamp: new Date(),
    });

    logger.info({ deliveryId: delivery._id, status }, 'Delivery status updated');
    res.json(updatedDelivery);
  } catch (error) {
    logger.error({ err: error }, 'Update delivery status failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update rider's current location (real-time tracking)
 * @route   PATCH /api/v1/deliveries/:id/location
 * @access  Private (assigned rider)
 */
const updateRiderLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const delivery = await Delivery.findById(req.params.id).select('rider order status').lean();
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    if (!delivery.rider || delivery.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized — you are not the assigned rider' });
    }

    if (!['assigned', 'picked_up', 'in_transit'].includes(delivery.status)) {
      return res.status(400).json({ message: 'Delivery is not active' });
    }

    // Use model method (saves to DB)
    await Delivery.findByIdAndUpdate(req.params.id, {
      currentLocation: { type: 'Point', coordinates: [longitude, latitude] },
      lastLocationUpdate: new Date(),
    });

    // Broadcast real-time location to tracking room
    emitSafe(`order_tracking_${delivery.order.toString()}`, 'location_update', {
      riderId: req.user._id,
      lat: latitude,
      lng: longitude,
      timestamp: new Date(),
    });

    res.json({ message: 'Location updated' });
  } catch (error) {
    logger.error({ err: error }, 'Update rider location failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload proof of delivery (photo + notes)
 * @route   POST /api/v1/deliveries/:id/proof
 * @access  Private (assigned rider)
 */
const uploadProofOfDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    if (!delivery.rider || delivery.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!['in_transit', 'delivered'].includes(delivery.status)) {
      return res
        .status(400)
        .json({ message: 'Can only upload proof when in transit or delivered' });
    }

    let photoUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'chopnow/deliveries/proof');
      photoUrl = result.secure_url;
    }

    delivery.proofOfDelivery = {
      photo: photoUrl || delivery.proofOfDelivery?.photo,
      notes: req.body.notes || delivery.proofOfDelivery?.notes,
      signature: req.body.signature || delivery.proofOfDelivery?.signature,
    };
    await delivery.save();

    logger.info({ deliveryId: delivery._id }, 'Proof of delivery uploaded');
    res.json({ message: 'Proof of delivery uploaded', proof: delivery.proofOfDelivery });
  } catch (error) {
    logger.error({ err: error }, 'Upload proof of delivery failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all deliveries (admin)
 * @route   GET /api/v1/deliveries
 * @access  Private (admin)
 */
const getAllDeliveries = async (req, res) => {
  try {
    const { status, riderId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (riderId) query.rider = riderId;

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate({ path: 'order', select: 'orderNumber customer business pricing' })
        .populate('rider', 'firstName lastName phone')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Delivery.countDocuments(query),
    ]);

    res.json({ deliveries, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error({ err: error }, 'Get all deliveries failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get dynamic rider stats and weekly earnings chart (Rider only)
 * @route   GET /api/v1/deliveries/rider-stats
 * @access  Private (Rider)
 */
const getRiderStats = async (req, res) => {
  try {
    const riderId = req.user._id;

    // Sum total earnings and count total trips from delivered orders
    const statsResult = await Delivery.aggregate([
      { $match: { rider: riderId, status: 'delivered' } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$deliveryFee' },
          totalTrips: { $sum: 1 },
        },
      },
    ]);

    const totalEarnings = statsResult[0]?.totalEarnings || 0;
    const totalTrips = statsResult[0]?.totalTrips || 0;

    // Get active trips count (assigned, picked_up, in_transit)
    const activeTrips = await Delivery.countDocuments({
      rider: riderId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] },
    });

    // Get weekly earnings data for the past 7 days (grouped by day of week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyDeliveries = await Delivery.find({
      rider: riderId,
      status: 'delivered',
      'statusTimestamps.deliveredAt': { $gte: sevenDaysAgo },
    })
      .select('deliveryFee statusTimestamps.deliveredAt')
      .lean();

    // Map to days of the week
    const daysMap = {
      0: { day: 'Sun', amount: 0 },
      1: { day: 'Mon', amount: 0 },
      2: { day: 'Tue', amount: 0 },
      3: { day: 'Wed', amount: 0 },
      4: { day: 'Thu', amount: 0 },
      5: { day: 'Fri', amount: 0 },
      6: { day: 'Sat', amount: 0 },
    };

    // Initialize labels
    let weeklyEarningsSum = 0;
    weeklyDeliveries.forEach((del) => {
      const deliveredDate = del.statusTimestamps?.deliveredAt
        ? new Date(del.statusTimestamps.deliveredAt)
        : new Date(del.updatedAt);
      const dayIndex = deliveredDate.getDay();
      daysMap[dayIndex].amount += del.deliveryFee || 0;
      weeklyEarningsSum += del.deliveryFee || 0;
    });

    // Arrange days relative to last 7 days order
    const orderedDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayIndex = d.getDay();
      orderedDays.push({
        day: daysMap[dayIndex].day,
        amount: daysMap[dayIndex].amount,
        label:
          daysMap[dayIndex].amount > 0 ? `${(daysMap[dayIndex].amount / 1000).toFixed(1)}K` : '0',
      });
    }

    res.json({
      success: true,
      stats: {
        totalEarnings,
        totalTrips,
        activeTrips,
        // No rider review/rating system exists yet - report this honestly as
        // unavailable rather than a made-up number. See L5 (fix checklist).
        rating: null,
        weeklyEarningsSum,
        weeklyData: orderedDays,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get rider stats failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get rider stats for mobile dashboard
 * @route   GET /api/v1/rider/stats
 * @access  Private (Rider)
 */
const getRiderDashboardStats = async (req, res) => {
  try {
    const riderId = req.user._id;

    // Count total deliveries delivered by this rider
    const totalDeliveries = await Delivery.countDocuments({
      rider: riderId,
      status: 'delivered',
    });

    // Sum today's earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayDeliveries = await Delivery.find({
      rider: riderId,
      status: 'delivered',
      'statusTimestamps.deliveredAt': { $gte: startOfToday },
    })
      .select('deliveryFee')
      .lean();

    const todayEarnings = todayDeliveries.reduce((sum, del) => sum + (del.deliveryFee || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDeliveries,
        todayEarnings,
        rating: null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get rider dashboard stats failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get rider earnings details for earnings screen
 * @route   GET /api/v1/rider/earnings
 * @access  Private (Rider)
 */
const getRiderEarnings = async (req, res) => {
  try {
    const riderId = req.user._id;

    // Sum total earnings and count total trips from delivered orders
    const statsResult = await Delivery.aggregate([
      { $match: { rider: riderId, status: 'delivered' } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$deliveryFee' },
          totalTrips: { $sum: 1 },
        },
      },
    ]);

    const totalEarnings = statsResult[0]?.totalEarnings || 0;
    const totalDeliveries = statsResult[0]?.totalTrips || 0;

    // Today's earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayDeliveries = await Delivery.find({
      rider: riderId,
      status: 'delivered',
      'statusTimestamps.deliveredAt': { $gte: startOfToday },
    })
      .select('deliveryFee')
      .lean();

    const today = todayDeliveries.reduce((sum, del) => sum + (del.deliveryFee || 0), 0);

    // Get weekly earnings data for the past 7 days (grouped by day of week Mon-Sun)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyDeliveries = await Delivery.find({
      rider: riderId,
      status: 'delivered',
      'statusTimestamps.deliveredAt': { $gte: sevenDaysAgo },
    })
      .select('deliveryFee statusTimestamps.deliveredAt')
      .lean();

    const daysOfWeekMap = {
      1: 0, // Mon
      2: 1, // Tue
      3: 2, // Wed
      4: 3, // Thu
      5: 4, // Fri
      6: 5, // Sat
      0: 6, // Sun
    };

    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    let thisWeek = 0;
    weeklyDeliveries.forEach((del) => {
      const deliveredDate = del.statusTimestamps?.deliveredAt
        ? new Date(del.statusTimestamps.deliveredAt)
        : new Date(del.updatedAt);
      const dayIndex = deliveredDate.getDay();
      const targetIndex = daysOfWeekMap[dayIndex];
      weeklyData[targetIndex] += del.deliveryFee || 0;
      thisWeek += del.deliveryFee || 0;
    });

    res.json({
      totalEarnings,
      thisWeek,
      today,
      totalDeliveries,
      // No rider review/rating system exists yet - report this honestly as
      // unavailable rather than a made-up number. See L5 (fix checklist).
      averageRating: null,
      weeklyData,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get rider earnings failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createDelivery,
  getDeliveryByOrder,
  getAvailableDeliveries,
  getMyDeliveries,
  assignRider,
  updateDeliveryStatus,
  updateRiderLocation,
  uploadProofOfDelivery,
  getAllDeliveries,
  getRiderStats,
  getRiderDashboardStats,
  getRiderEarnings,
};
