const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const RefundRequest = require('../models/RefundRequest');
const logger = require('../utils/logger');
const Payout = require('../models/Payout');
const { recordEntry, notifyPayee } = require('../services/ledgerService');

// Maps the mobile app's "what went wrong?" reason labels (dispute_screen.dart)
// to the Dispute model's `type` enum, since the client never sends `type`.
const REASON_TYPE_MAP = {
  'Wrong item received': 'other',
  'Missing items': 'missing_item',
  'Food quality issue': 'poor_quality',
  'Order never arrived': 'delivery_issue',
  Overcharged: 'refund',
  Other: 'other',
};

/**
 * @desc    Create a dispute/refund request
 * @route   POST /api/disputes
 * @access  Private (Customer)
 */
const createDispute = async (req, res) => {
  const { order: orderId, type, title, description, reason, evidence } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure user owns the order
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to dispute this order' });
    }

    const dispute = await Dispute.create({
      order: orderId,
      customer: req.user._id,
      business: order.business,
      type: type || REASON_TYPE_MAP[reason] || 'other',
      title: title || reason || 'Dispute reported',
      description,
      evidence,
      timeline: [{ event: 'Dispute created' }],
    });

    res.status(201).json(dispute);
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get my disputes
 * @route   GET /api/disputes/me
 * @access  Private (Customer)
 */
const getMyDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({ customer: req.user._id })
      .populate('business', 'name')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get disputes for my business
 * @route   GET /api/disputes/business
 * @access  Private (Admin/Business Owner/Manager)
 */
const getBusinessDisputes = async (req, res) => {
  try {
    // If admin, return all disputes
    if (req.user.activeRole === 'admin' || req.user.roles?.includes('admin')) {
      const disputes = await Dispute.find({})
        .populate('customer', 'firstName lastName email phone')
        .populate('business', 'name')
        .populate('order', 'orderNumber pricing status payment')
        .sort({ createdAt: -1 });
      return res.json({ disputes });
    }

    // For business owner, find their business first
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.json({ disputes: [] });
    }

    const disputes = await Dispute.find({ business: business._id })
      .populate('customer', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ disputes });
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all disputes (Admin/Support)
 * @route   GET /api/disputes/admin
 * @access  Private (Admin/Support)
 */
const getAdminDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({})
      .populate('customer', 'firstName lastName email phone')
      .populate('business', 'name')
      .populate('order', 'orderNumber pricing status payment')
      .sort({ priority: -1, createdAt: -1 });
    res.json({ disputes });
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get dispute by ID
 * @route   GET /api/disputes/:id
 * @access  Private
 */
const getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('business', 'name contact')
      .populate('order');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check authorization - user must be customer, business owner, or admin
    const isCustomer = dispute.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.roles?.includes('admin');

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this dispute' });
    }

    res.json(dispute);
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get dispute statistics
 * @route   GET /api/disputes/stats
 * @access  Private (Admin/Support)
 */
const getDisputeStats = async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count resolved today
    const resolvedToday = await Dispute.countDocuments({
      status: 'resolved',
      'resolution.resolvedAt': { $gte: today, $lt: tomorrow },
    });

    // Count by priority
    const critical = await Dispute.countDocuments({
      status: { $ne: 'resolved' },
      priority: 'critical',
    });
    const high = await Dispute.countDocuments({ status: { $ne: 'resolved' }, priority: 'high' });
    const medium = await Dispute.countDocuments({
      status: { $ne: 'resolved' },
      priority: 'medium',
    });
    const low = await Dispute.countDocuments({ status: { $ne: 'resolved' }, priority: 'low' });

    // Total active (not resolved/closed)
    const totalActive = await Dispute.countDocuments({ status: { $nin: ['resolved', 'closed'] } });

    // Calculate average resolution time (for disputes resolved today)
    const resolvedDisputes = await Dispute.find({
      status: 'resolved',
      'resolution.resolvedAt': { $gte: today, $lt: tomorrow },
    });

    let avgResolutionMinutes = 0;
    if (resolvedDisputes.length > 0) {
      const totalMinutes = resolvedDisputes.reduce((sum, d) => {
        const created = new Date(d.createdAt).getTime();
        const resolved = new Date(d.resolution.resolvedAt).getTime();
        return sum + (resolved - created) / (1000 * 60);
      }, 0);
      avgResolutionMinutes = Math.round(totalMinutes / resolvedDisputes.length);
    }

    res.json({
      resolvedToday,
      totalActive,
      byPriority: { critical, high, medium, low },
      avgResolutionMinutes,
    });
  } catch (error) {
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

const REFUND_ACTIONS = ['full_refund', 'partial_refund'];

// Thrown inside resolveDispute's transaction to abort it (undoing the claim)
// and answer with a 4xx.
class ResolveRejection extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * @desc    Resolve a dispute
 * @route   PATCH /api/disputes/:id/resolve
 * @access  Private (Admin/Support)
 */
const resolveDispute = async (req, res) => {
  const { action, amount, comment, refundFundedBy } = req.body;

  const session = await mongoose.startSession();
  try {
    let resolved = null;
    let vendorNotice = null;
    let noticeBusiness = null;

    // Everything below commits together, and the dispute is claimed with a
    // status-filtered update first: two concurrent resolve calls can no longer
    // both pass an in-memory "already resolved?" check and each queue a refund.
    await session.withTransaction(async () => {
      resolved = null;
      vendorNotice = null;

      const dispute = await Dispute.findOneAndUpdate(
        { _id: req.params.id, status: { $ne: 'resolved' } },
        { $set: { status: 'resolved' } },
        { new: true, session }
      );
      if (!dispute) {
        const exists = await Dispute.exists({ _id: req.params.id }).session(session);
        throw exists
          ? new ResolveRejection(400, 'Dispute is already resolved')
          : new ResolveRejection(404, 'Dispute not found');
      }

      let resolutionAmount = amount;

      // C8 fix: previously this endpoint just flipped dispute.status to
      // 'resolved' regardless of `action` - a 'full_refund'/'partial_refund'
      // never actually moved money or touched the order/payment at all. There is
      // no real pawaPay refund/reversal API integrated in this codebase, so
      // rather than silently claim success, this creates a tracked
      // RefundRequest (status 'pending_manual') the ops team can see and action,
      // and marks the order's payment as refund-pending.
      if (REFUND_ACTIONS.includes(action)) {
        const order = await Order.findById(dispute.order).session(session);
        if (!order) {
          throw new ResolveRejection(404, 'Associated order not found');
        }

        resolutionAmount = action === 'full_refund' ? order.pricing.total : Number(amount);

        if (!resolutionAmount || resolutionAmount <= 0) {
          throw new ResolveRejection(400, 'A positive refund amount is required');
        }

        // Refunds already queued for this order (e.g. from cancelling it after
        // payment, or an earlier dispute) count against the order total.
        const [{ refunded = 0 } = {}] = await RefundRequest.aggregate([
          { $match: { order: order._id, status: { $ne: 'failed' } } },
          { $group: { _id: null, refunded: { $sum: '$amount' } } },
        ]).session(session);
        if (resolutionAmount + refunded > order.pricing.total) {
          throw new ResolveRejection(
            400,
            refunded
              ? `Refund amount exceeds what is left to refund (${order.pricing.total - refunded} ${order.pricing.currency})`
              : 'Refund amount cannot exceed the order total'
          );
        }

        const payment = await Payment.findOne({
          $or: [{ order: order._id }, { orders: order._id }],
          status: 'completed',
        }).session(session);

        // Vendor's fault: their proportional share of the refund comes back
        // out of what they earn for this order. Platform goodwill: ChopNow
        // absorbs it and the vendor keeps their earnings.
        const fundedBy = refundFundedBy === 'platform' ? 'platform' : 'vendor';
        let vendorDeduction = 0;
        if (fundedBy === 'vendor' && order.pricing.total > 0) {
          const alreadyDeducted = order.pricing.vendorRefunded || 0;
          vendorDeduction = Math.min(
            Math.round((resolutionAmount * order.pricing.vendorAmount) / order.pricing.total),
            Math.max(0, order.pricing.vendorAmount - alreadyDeducted)
          );
          if (vendorDeduction > 0) {
            // Record it on the order either way (so completion never credits it
            // again); if the vendor was already credited, take it back now. The
            // balance may go negative - payouts then wait until it recovers.
            order.pricing.vendorRefunded = alreadyDeducted + vendorDeduction;
            const currency = order.pricing.currency || 'RWF';
            if (order.status === 'completed') {
              const biz = await Business.findOneAndUpdate(
                { _id: order.business },
                { $inc: { 'stats.balance': -vendorDeduction } },
                { new: true, session }
              );
              await recordEntry(
                {
                  business: order.business,
                  type: 'refund_deduction',
                  amount: -vendorDeduction,
                  balanceAfter: biz?.stats?.balance,
                  currency,
                  order: order._id,
                  dispute: dispute._id,
                  createdBy: req.user._id,
                  description: `Refund on order ${order.orderNumber} (vendor's fault): your share ${vendorDeduction} deducted`,
                },
                session
              );
              vendorNotice = `A customer refund on order ${order.orderNumber} was resolved as the vendor's fault. ${vendorDeduction} ${currency} was deducted from your balance.`;

              // Not enough balance left to cover it, and a payout request is
              // still waiting (not yet being paid)? Take the shortfall out of
              // that request instead of paying out money that's owed back.
              if ((biz?.stats?.balance || 0) < 0) {
                const waiting = await Payout.findOne({
                  business: order.business,
                  status: 'requested',
                })
                  .sort({ createdAt: -1 })
                  .session(session);
                if (waiting) {
                  const cut = Math.min(waiting.amount, -biz.stats.balance);
                  waiting.amount -= cut;
                  waiting.adjustments.push({
                    amount: -cut,
                    reason: `Refund on order ${order.orderNumber}`,
                    dispute: dispute._id,
                    by: req.user._id,
                  });
                  if (waiting.amount === 0) {
                    waiting.status = 'cancelled';
                    waiting.failureReason = 'The whole amount went to cover a customer refund';
                  }
                  await waiting.save({ session });
                  const after = await Business.findOneAndUpdate(
                    { _id: order.business },
                    { $inc: { 'stats.balance': cut } },
                    { new: true, session }
                  );
                  await recordEntry(
                    {
                      business: order.business,
                      type: 'payout_adjustment',
                      amount: cut,
                      balanceAfter: after?.stats?.balance,
                      currency,
                      payout: waiting._id,
                      order: order._id,
                      dispute: dispute._id,
                      createdBy: req.user._id,
                      description: `Payout request reduced by ${cut} to cover the refund on order ${order.orderNumber}`,
                    },
                    session
                  );
                  vendorNotice +=
                    ` Your pending payout request was reduced by ${cut} ${currency} to cover it` +
                    (waiting.status === 'cancelled'
                      ? ' (the whole request was used, so it was cancelled).'
                      : ` - it is now ${waiting.amount} ${currency}.`);
                }
              }
            } else {
              vendorNotice = `A customer refund on order ${order.orderNumber} was resolved as the vendor's fault. Your earnings from this order will be ${vendorDeduction} ${currency} lower.`;
            }
          }
        }

        await RefundRequest.create(
          [
            {
              order: order._id,
              dispute: dispute._id,
              payment: payment?._id,
              business: dispute.business,
              customer: dispute.customer,
              amount: resolutionAmount,
              currency: order.pricing.currency,
              reason: comment,
              fundedBy,
              vendorDeduction,
              requestedBy: req.user._id,
            },
          ],
          { session }
        );

        order.payment.paymentStatus = 'refund_pending';
        await order.save({ session });

        dispute.timeline.push({
          event: `Refund of ${resolutionAmount} ${order.pricing.currency} queued for manual processing (${
            fundedBy === 'vendor'
              ? `vendor's fault - ${vendorDeduction} deducted from vendor earnings`
              : 'platform goodwill'
          })`,
        });
      }

      dispute.resolution = {
        action,
        amount: resolutionAmount,
        comment,
        resolvedBy: req.user._id,
        resolvedAt: Date.now(),
      };
      dispute.timeline.push({ event: `Resolved with action: ${action}` });

      await dispute.save({ session });
      resolved = dispute;
    });

    if (vendorNotice) {
      noticeBusiness = resolved.business;
      notifyPayee(
        { business: noticeBusiness },
        { title: 'Refund deducted', message: vendorNotice }
      );
    }
    res.json(resolved);
  } catch (error) {
    // A rejection thrown inside withTransaction aborted it, undoing the claim.
    if (error instanceof ResolveRejection) {
      return res.status(error.code).json({ message: error.message });
    }
    logger.error({ err: error }, 'Dispute error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get refund requests queued for manual processing (ops queue)
 * @route   GET /api/disputes/refund-requests
 * @access  Private (Admin/Support)
 */
const getRefundRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const refundRequests = await RefundRequest.find(filter)
      .populate('order', 'orderNumber pricing')
      .populate('business', 'name')
      .populate('customer', 'firstName lastName email phone')
      .populate('payment', 'payerPhoneNumber correspondent providerTransactionId')
      .sort({ createdAt: -1 });

    res.json({ refundRequests });
  } catch (error) {
    logger.error({ err: error }, 'Get refund requests error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Record the outcome of a queued refund once ops has sent the money
 *          back (or could not)
 * @route   PATCH /api/disputes/refund-requests/:id
 * @access  Private (Admin/Support)
 */
const updateRefundRequest = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'completed' or 'failed'" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid refund request id' });
    }

    // Only a pending refund can be settled, and only once - two admins clicking
    // at the same time can't both record it.
    const refund = await RefundRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending_manual' },
      {
        $set: {
          status,
          completedBy: req.user._id,
          completedAt: new Date(),
          ...(typeof notes === 'string' && notes.trim() ? { notes: notes.trim() } : {}),
        },
      },
      { new: true }
    );
    if (!refund) {
      const exists = await RefundRequest.exists({ _id: req.params.id });
      return exists
        ? res.status(400).json({ message: 'This refund has already been processed' })
        : res.status(404).json({ message: 'Refund request not found' });
    }

    // Once everything owed on the order has actually been paid back, mark it
    // refunded.
    if (status === 'completed') {
      const [{ outstanding = 0, paidBack = 0 } = {}] = await RefundRequest.aggregate([
        { $match: { order: refund.order } },
        {
          $group: {
            _id: null,
            outstanding: {
              $sum: { $cond: [{ $eq: ['$status', 'pending_manual'] }, 1, 0] },
            },
            paidBack: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
          },
        },
      ]);
      const order = await Order.findById(refund.order).select('pricing.total');
      if (order && outstanding === 0 && paidBack >= order.pricing.total) {
        await Order.updateOne(
          { _id: refund.order },
          { $set: { 'payment.paymentStatus': 'refunded' } }
        );
      }
    }

    res.json(refund);
  } catch (error) {
    logger.error({ err: error }, 'Refund request update error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getBusinessDisputes,
  getAdminDisputes,
  getDisputeById,
  resolveDispute,
  getDisputeStats,
  getRefundRequests,
  updateRefundRequest,
};
