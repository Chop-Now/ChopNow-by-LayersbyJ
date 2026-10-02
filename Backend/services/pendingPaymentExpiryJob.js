const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { cancelOrderAndRestoreInventory } = require('../controllers/orderController');

const PENDING_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const JOB_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

let jobTimer = null;

/**
 * Cancel all orders stuck in pending_payment for more than 30 minutes
 * and atomically release their reserved listing inventory.
 *
 * Goes through cancelOrderAndRestoreInventory (claim-by-status inside a
 * transaction) rather than a blind update: an order paid, or cancelled by the
 * customer, between the find below and the write is left alone instead of
 * being cancelled over the top of a payment or having its stock released
 * twice. Any pending Payment is marked TIMEOUT-failed in the same transaction;
 * a late COMPLETED callback for it is still honoured as a refund (see
 * applyDepositOutcome in paymentController).
 */
async function expirePendingPayments() {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MS);

  // Find stale pending_payment orders
  const staleOrders = await Order.find({
    status: 'pending_payment',
    createdAt: { $lt: cutoff },
  });

  if (staleOrders.length === 0) return;

  logger.info({ count: staleOrders.length }, 'pendingPaymentExpiryJob: cancelling stale orders');

  for (const order of staleOrders) {
    const session = await mongoose.startSession();
    try {
      let cancelled = false;
      await session.withTransaction(async () => {
        cancelled = await cancelOrderAndRestoreInventory(order, {
          fromStatuses: ['pending_payment'],
          paymentStatus: 'failed',
          reason: 'Payment not completed in time',
          session,
        });
        if (!cancelled) return;

        // Mark any linked pending payment as failed
        await Payment.updateMany(
          { $or: [{ order: order._id }, { orders: order._id }], status: 'pending' },
          {
            status: 'failed',
            'failureReason.code': 'TIMEOUT',
            'failureReason.description': 'Payment was not completed within 30 minutes.',
          },
          { session }
        );
      });

      if (cancelled) {
        logger.info(
          { orderNumber: order.orderNumber },
          'pendingPaymentExpiryJob: stale order cancelled and stock released'
        );
      }
    } catch (err) {
      logger.error(
        { err: err.message, orderId: order._id },
        'pendingPaymentExpiryJob: failed to cancel stale order'
      );
    } finally {
      session.endSession();
    }
  }
}

/**
 * Start the recurring pending payment expiry job
 */
function startPendingPaymentExpiryJob() {
  logger.info('Pending payment expiry job started — runs every 5 min');

  // Run immediately on startup, then every 5 minutes
  expirePendingPayments().catch((err) =>
    logger.error({ err: err.message }, 'pendingPaymentExpiryJob: initial run failed')
  );

  jobTimer = setInterval(() => {
    expirePendingPayments().catch((err) =>
      logger.error({ err: err.message }, 'pendingPaymentExpiryJob: scheduled run failed')
    );
  }, JOB_INTERVAL_MS);
}

/**
 * Stop the recurring job (used during graceful shutdown)
 */
function stopPendingPaymentExpiryJob() {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    logger.info('Pending payment expiry job stopped');
  }
}

module.exports = {
  startPendingPaymentExpiryJob,
  stopPendingPaymentExpiryJob,
  expirePendingPayments,
};
