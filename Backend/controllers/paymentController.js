const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { verifySignature } = require('../utils/pawapaySignatures');
const { sendNewOrderNotifications } = require('./orderController');
const RefundRequest = require('../models/RefundRequest');
const socketManager = require('../socket');

const isPawapayProduction = () => process.env.PAWAPAY_ENVIRONMENT === 'production';

/**
 * C5: the single source of truth for simulated payments. Never in pawaPay
 * production, whatever PAYMENT_TEST_MODE says - otherwise one mis-set env var
 * on the live server turns every order into free food. In sandbox it's on
 * unless PAYMENT_TEST_MODE is explicitly 'false' (to exercise the real
 * sandbox API).
 */
const isPaymentTestMode = () => !isPawapayProduction() && process.env.PAYMENT_TEST_MODE !== 'false';

const emitOrderUpdate = (order) => {
  try {
    socketManager
      .getIO()
      .to(`user_${order.customer.toString()}`)
      .emit('order_status_updated', order);
  } catch (socketErr) {
    logger.warn({ err: socketErr.message }, 'Socket emit for payment outcome failed');
  }
};

/**
 * Applies a final pawaPay deposit outcome exactly once. Shared by the webhook,
 * the status-poll fallback and the sandbox simulator so all three have the
 * same idempotency and race handling.
 *
 * H9: the Payment is claimed atomically (status-filtered findOneAndUpdate), so
 * duplicate/concurrent deliveries of the same outcome are no-ops. A COMPLETED
 * may also claim a payment the expiry job already timed out - the customer's
 * money really was taken and must not be silently ignored.
 *
 * The order is likewise moved with compare-and-swaps rather than a blind save:
 * - COMPLETED only moves pending_payment -> paid. If the order was cancelled
 *   meanwhile (customer cancel, expiry), the money is queued for refund
 *   instead of resurrecting the order after its stock was released.
 * - FAILED/REJECTED does NOT cancel the order (M9) - it's left in
 *   pending_payment so the customer can retry the same order via
 *   initiatePayment rather than rebuilding their cart. pendingPaymentExpiryJob
 *   is still what eventually cancels it and releases stock if nobody ever
 *   successfully retries.
 *
 * @returns {Promise<{processed: boolean, payment: Payment|null}>}
 */
const applyDepositOutcome = async ({
  depositId,
  completed,
  providerTransactionId,
  failureReason,
  rawCallbackData,
}) => {
  const claimFilter = completed
    ? {
        depositId,
        $or: [{ status: 'pending' }, { status: 'failed', 'failureReason.code': 'TIMEOUT' }],
      }
    : { depositId, status: 'pending' };

  let payment = null;
  let paidOrders = [];

  // Claim + order transitions + refund/stock changes commit together: if any
  // step fails, the Payment goes back to its unclaimed state and the webhook
  // (answered with a 5xx) is retried rather than lost.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      paidOrders = [];

      payment = await Payment.findOneAndUpdate(
        claimFilter,
        {
          $set: {
            status: completed ? 'completed' : 'failed',
            callbackReceived: true,
            ...(rawCallbackData ? { rawCallbackData } : {}),
            ...(providerTransactionId ? { providerTransactionId } : {}),
            ...(failureReason
              ? {
                  failureReason: {
                    code: failureReason.code,
                    description: failureReason.description,
                  },
                }
              : {}),
          },
        },
        { new: true, session }
      );
      if (!payment) return;

      // A multi-vendor checkout payment covers several orders (one per vendor).
      const orderIds = payment.orders?.length ? payment.orders : [payment.order];

      for (const orderId of orderIds) {
        if (completed) {
          const paidOrder = await Order.findOneAndUpdate(
            { _id: orderId, status: 'pending_payment' },
            {
              $set: {
                status: 'paid',
                'payment.paymentMethod': 'mobile_money',
                'payment.paymentStatus': 'completed',
                'statusTimestamps.paidAt': new Date(),
              },
            },
            { new: true, session }
          );
          if (paidOrder) {
            paidOrders.push(paidOrder);
            continue;
          }

          // Money arrived for an order that can no longer take it (cancelled by
          // the customer or the expiry job while the PIN prompt was open, or a
          // second successful attempt on an already-paid order). Queue a
          // refund of that order's share.
          const order = await Order.findById(orderId).session(session);
          if (!order) continue;
          await RefundRequest.create(
            [
              {
                order: order._id,
                payment: payment._id,
                business: order.business,
                customer: order.customer,
                amount: order.pricing.total,
                currency: payment.currency,
                reason: `Payment received for ${order.status} order`,
                requestedBy: order.customer,
              },
            ],
            { session }
          );
          if (order.status === 'cancelled') {
            await Order.updateOne(
              { _id: order._id },
              { $set: { 'payment.paymentStatus': 'refund_pending' } },
              { session }
            );
          }
          logger.warn(
            { orderNumber: order.orderNumber, orderStatus: order.status, depositId },
            'Payment completed for an order that could not accept it - refund queued'
          );
          continue;
        }

        // FAILED (or REJECTED) - M9: the order is deliberately NOT cancelled
        // here. It stays in pending_payment so the customer can retry the
        // same order (initiatePayment only requires status ===
        // 'pending_payment', with no memory of a prior failed attempt)
        // instead of having to rebuild their cart from scratch. Stock stays
        // reserved exactly as it would for any other unpaid order; the
        // existing pendingPaymentExpiryJob (30 min from order.createdAt)
        // is still what eventually cancels it and releases stock if the
        // customer never successfully retries - this failure doesn't need
        // its own separate cleanup path.
        const order = await Order.findById(orderId).select('orderNumber status').session(session);
        if (!order) {
          logger.error({ orderId }, 'Matching order for payment outcome not found');
          continue;
        }
        logger.info(
          { orderNumber: order.orderNumber, orderStatus: order.status, depositId },
          'Payment attempt failed - order left in pending_payment for the customer to retry'
        );
      }
    });
  } finally {
    session.endSession();
  }

  if (!payment) return { processed: false, payment: null };

  // Notifications only after the transaction has committed - each vendor
  // hears about its own order.
  for (const order of paidOrders) {
    logger.info({ orderNumber: order.orderNumber, depositId }, 'Order marked as paid.');
    setImmediate(() => {
      sendNewOrderNotifications(order._id).catch((err) =>
        logger.error({ err }, 'Failed to send paid order notifications')
      );
      emitOrderUpdate(order);
    });
  }
  return { processed: true, payment };
};

/**
 * @desc    Initiate mobile money payment (deposit) via pawaPay
 * @route   POST /api/payments/deposit
 * @access  Private
 *
 * Pays either one order (`orderId`, older clients and "pay later" from order
 * history) or every still-unpaid order of a multi-vendor checkout
 * (`checkoutId`) with a single mobile-money prompt for the combined total.
 */
const initiatePayment = async (req, res) => {
  try {
    const { orderId, checkoutId, phoneNumber, correspondent } = req.body;

    if ((!orderId && !checkoutId) || !phoneNumber || !correspondent) {
      return res.status(400).json({
        message: 'Please provide orderId (or checkoutId), phoneNumber, and correspondent',
      });
    }

    if (!['MTN_MOMO_RWA', 'AIRTEL_RWA'].includes(correspondent)) {
      return res
        .status(400)
        .json({ message: 'Invalid correspondent. Must be MTN_MOMO_RWA or AIRTEL_RWA' });
    }

    // Clean phone number to MSISDN format (e.g., must start with country code, no +, no spaces)
    let formattedPhone = String(phoneNumber).replace(/[\s+]/g, '');
    if (formattedPhone.startsWith('0')) {
      // Assuming Rwandan number if starts with 0
      formattedPhone = '250' + formattedPhone.substring(1);
    }
    if (!/^250\d{9}$/.test(formattedPhone)) {
      return res.status(400).json({
        message: 'Phone number must be a valid Rwandan number (e.g., 25078xxxxxxx or 078xxxxxxx)',
      });
    }

    // Find the order(s) this payment covers
    let orders;
    if (checkoutId) {
      if (!mongoose.isValidObjectId(checkoutId)) {
        return res.status(400).json({ message: 'Invalid checkoutId' });
      }
      const group = await Order.find({ checkoutGroup: checkoutId }).sort({ createdAt: 1 });
      if (group.length === 0) {
        return res.status(404).json({ message: 'Checkout not found' });
      }
      if (group.some((o) => o.customer.toString() !== req.user._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to pay for this checkout' });
      }
      orders = group.filter((o) => o.status === 'pending_payment');
      if (orders.length === 0) {
        return res.status(400).json({ message: 'Nothing left to pay in this checkout' });
      }
    } else {
      if (!mongoose.isValidObjectId(orderId)) {
        return res.status(400).json({ message: 'Invalid orderId' });
      }
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to pay for this order' });
      }
      if (order.status !== 'pending_payment') {
        return res
          .status(400)
          .json({ message: `Order status is ${order.status}. Cannot initiate payment.` });
      }
      orders = [order];
    }

    const amount = orders.reduce((sum, o) => sum + o.pricing.total, 0);
    const currency = orders[0].pricing.currency || 'RWF';
    const orderIds = orders.map((o) => o._id);

    // Generate depositId (UUIDv4)
    const depositId = crypto.randomUUID();

    // Configure pawaPay API details
    const baseUrl = isPawapayProduction()
      ? 'https://api.pawapay.io'
      : 'https://api.sandbox.pawapay.io';
    const apiKey = process.env.PAWAPAY_API_KEY;

    if (!apiKey) {
      logger.error('PAWAPAY_API_KEY is not configured in environment variables.');
      return res.status(500).json({ message: 'Payment gateway configuration error' });
    }

    // The Payment exists BEFORE pawaPay is asked for the deposit, so a fast
    // callback can never arrive for a depositId we don't know about yet.
    const payment = await Payment.create({
      order: orderIds[0],
      orders: orderIds,
      checkoutGroup: orders[0].checkoutGroup,
      depositId,
      amount,
      currency,
      payerPhoneNumber: formattedPhone,
      correspondent,
      status: 'pending',
    });
    await Order.updateMany(
      { _id: { $in: orderIds }, status: 'pending_payment' },
      { $set: { 'payment.paymentMethod': 'mobile_money' } }
    );

    const markInitiationFailed = (code, description) =>
      Payment.updateOne(
        { _id: payment._id, status: 'pending' },
        { $set: { status: 'failed', failureReason: { code, description } } }
      );

    // ─── TEST MODE ──────────────────────────────────────────────────────────
    // See isPaymentTestMode: sandbox only, never pawaPay production.
    if (isPaymentTestMode()) {
      logger.info(
        { orderIds, depositId, amount },
        'PAYMENT_TEST_MODE: Simulating successful deposit'
      );

      // Simulate the COMPLETED callback after 5 seconds, through the same
      // applyDepositOutcome the real webhook uses (so test mode exercises the
      // real idempotency/race handling rather than a separate blind save).
      setTimeout(async () => {
        try {
          logger.info({ depositId }, 'PAYMENT_TEST_MODE: Firing simulated COMPLETED callback');
          const providerTransactionId = `TEST-${depositId.substring(0, 8).toUpperCase()}`;
          await applyDepositOutcome({
            depositId,
            completed: true,
            providerTransactionId,
            rawCallbackData: {
              depositId,
              status: 'COMPLETED',
              providerTransactionId,
              simulated: true,
            },
          });
        } catch (err) {
          logger.warn(
            { err: err.message },
            'PAYMENT_TEST_MODE: Failed to process simulated callback'
          );
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        message:
          '[TEST MODE] Payment simulated. A fake webhook will complete the order in 5 seconds.',
        depositId,
        paymentId: payment._id,
        amount,
        orders: orderIds,
        testMode: true,
      });
    }
    // ─── END TEST MODE ───────────────────────────────────────────────────────

    const payload = {
      depositId,
      amount: String(amount),
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: formattedPhone,
          provider: correspondent,
        },
      },
      customerMessage: `ChopNow ${orders[0].orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`,
    };
    logger.debug({ depositId, amount, orderIds }, 'Initiating pawaPay deposit request');

    let response;
    try {
      response = await axios.post(`${baseUrl}/v2/deposits`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Idempotency-Key': depositId,
        },
        timeout: 10000,
      });
    } catch (error) {
      // A timeout doesn't prove pawaPay didn't take the request - leave the
      // Payment pending so the webhook/status poll can still settle it (the
      // expiry job times it out otherwise). A definite HTTP rejection fails it.
      if (error.response) {
        await markInitiationFailed(
          'INITIATION_REJECTED',
          error.response.data?.message || `HTTP ${error.response.status}`
        );
      }
      throw error;
    }

    logger.debug({ response: response.data }, 'pawaPay deposit initiation response');

    if (response.data && response.data.status === 'ACCEPTED') {
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully. Please complete PIN prompt on your phone.',
        depositId,
        paymentId: payment._id,
        amount,
        orders: orderIds,
      });
    }

    logger.error({ responseData: response.data }, 'pawaPay deposit not accepted');
    await markInitiationFailed(
      response.data?.failureReason?.failureCode || 'NOT_ACCEPTED',
      response.data?.failureReason?.failureMessage || `Status ${response.data?.status}`
    );
    return res.status(400).json({
      message: 'Payment initiation rejected by pawaPay',
      details: response.data,
    });
  } catch (error) {
    // Log the full pawaPay error response for debugging
    const pawapayError = error.response?.data;
    logger.error(
      {
        err: error.message,
        status: error.response?.status,
        pawapayError,
      },
      'pawaPay initiation failed'
    );
    return res.status(500).json({
      message: 'Failed to initiate mobile money payment',
      error: pawapayError?.message || error.message,
    });
  }
};

/**
 * @desc    Handle pawaPay webhook callbacks
 * @route   POST /api/payments/webhook
 * @access  Public
 */
const handleWebhook = async (req, res) => {
  try {
    // C10 fix: this is a public, unauthenticated, constantly-hit endpoint - never
    // log the full raw body/headers (transaction payloads, phone numbers, and any
    // signature/auth headers pawaPay sends). Log only the minimal identifying
    // fields needed to trace a webhook through the logs.
    const { depositId, status, failureReason, providerTransactionId } = req.body || {};
    logger.info({ depositId, status }, 'pawaPay Webhook Received');

    // 1. Verify cryptographic signature (RFC-9421)
    const isValidSignature = await verifySignature(req);
    if (!isValidSignature) {
      logger.error('pawaPay callback rejected: Invalid cryptographic signature.');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (!depositId || !status) {
      return res.status(400).json({ error: 'Missing depositId or status' });
    }

    // Only final outcomes change anything; pawaPay can also send non-final
    // statuses (e.g. ACCEPTED/PROCESSING) which must not fail the order.
    const completed = status === 'COMPLETED';
    const failed = status === 'FAILED' || status === 'REJECTED';
    if (!completed && !failed) {
      logger.info({ depositId, status }, 'pawaPay callback with non-final status ignored');
      return res.status(200).json({ message: 'Non-final status ignored' });
    }

    // 2. Claim the Payment and apply the outcome exactly once (H9) - see
    // applyDepositOutcome.
    const { processed } = await applyDepositOutcome({
      depositId,
      completed,
      providerTransactionId,
      failureReason,
      rawCallbackData: req.body,
    });
    if (!processed) {
      logger.info(
        { depositId },
        'pawaPay callback ignored: payment not found or already processed'
      );
      // Still return 200 OK so pawaPay stops retrying
      return res.status(200).json({ message: 'Callback ignored: not found or already processed' });
    }

    // Always respond HTTP 200 to acknowledge webhook
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error({ err: error.message }, 'pawaPay webhook processing error');
    // 5xx so pawaPay retries: applyDepositOutcome is transactional and
    // idempotent, so a failed attempt left nothing half-applied and a retry is
    // safe (and is the only way this outcome gets applied).
    return res.status(500).json({ error: 'processing error' });
  }
};

/**
 * @desc    Get payment status for a specific order (polling fallback)
 * @route   GET /api/payments/status/:orderId
 * @access  Private
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    // Authorize check
    const order = await Order.findById(orderId).select('customer');
    if (!order) {
      return res.status(404).json({ message: 'No payment record found for this order' });
    }
    if (
      order.customer.toString() !== req.user._id.toString() &&
      !req.user.roles?.includes('admin')
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Latest payment covering this order - alone, or as part of a checkout.
    let payment = await Payment.findOne({ $or: [{ order: orderId }, { orders: orderId }] }).sort({
      createdAt: -1,
    });
    if (!payment) {
      return res.status(404).json({ message: 'No payment record found for this order' });
    }

    // --- Active status check fallback ---
    // If the local status is still pending, we actively fetch the latest status from pawaPay
    // to handle webhook delivery delays, missing webhook configurations, or signature verification mismatches.
    if (payment.status === 'pending') {
      const isProduction = process.env.PAWAPAY_ENVIRONMENT === 'production';
      const baseUrl = isProduction ? 'https://api.pawapay.io' : 'https://api.sandbox.pawapay.io';
      const apiKey = process.env.PAWAPAY_API_KEY;

      // Test mode payments are simulated locally; there's nothing to poll.
      if (apiKey && !isPaymentTestMode()) {
        try {
          const response = await axios.get(`${baseUrl}/v2/deposits/${payment.depositId}`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 5000,
          });

          if (response.data && response.data.status === 'FOUND' && response.data.data) {
            const remote = response.data.data;
            const isCompleted = remote.status === 'COMPLETED';
            const isFailed = remote.status === 'FAILED' || remote.status === 'REJECTED';

            if (isCompleted || isFailed) {
              // Same claim-once path as the webhook (H9) - see applyDepositOutcome.
              // A poll racing the webhook or another poll can't double-apply.
              const { payment: claimed } = await applyDepositOutcome({
                depositId: payment.depositId,
                completed: isCompleted,
                providerTransactionId: remote.providerTransactionId,
                failureReason: remote.failureReason,
              });
              // Whether we won the claim or lost it to a concurrent request /
              // the webhook, report the Payment's real current state.
              payment = claimed || (await Payment.findById(payment._id));
            }
          }
        } catch (apiErr) {
          logger.error({ err: apiErr.message }, 'Failed to check status from pawaPay directly');
        }
      }
    }

    return res.status(200).json({
      status: payment.status,
      depositId: payment.depositId,
      providerTransactionId: payment.providerTransactionId,
      failureReason: payment.failureReason,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Get payment status failed');
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initiatePayment,
  handleWebhook,
  getPaymentStatus,
  isPaymentTestMode,
};
