const mongoose = require('mongoose');
const Payout = require('../models/Payout');
const Business = require('../models/Business');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');
const logger = require('../utils/logger');
const { DAY_MS, recordEntry, heldFunds, notifyPayee } = require('../services/ledgerService');

const TERMINAL_PAYOUT_STATUSES = ['completed', 'failed', 'cancelled'];
const OPEN_PAYOUT_STATUSES = ['requested', 'processing'];
const fmt = (n, currency = 'RWF') => `${Math.round(n || 0).toLocaleString('en-US')} ${currency}`;

class PayoutRejection extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.extra = extra;
  }
}

/**
 * The payout rules, in one place:
 *  - earnings are held `payoutHoldDays` after an order completes (so refunds
 *    in that window come out of held money), riders' delivery earnings are not
 *    held;
 *  - one payout request per `payoutIntervalDays`;
 *  - at least `minimumWithdrawal`, at most what is available now.
 */
const payoutRules = async () => {
  const s = await PlatformSettings.getSettings();
  return {
    minimumWithdrawal: s.minimumWithdrawal ?? 5000,
    holdDays: s.payoutHoldDays ?? 7,
    intervalDays: s.payoutIntervalDays ?? 7,
  };
};

const nextRequestAt = (lastRequestedAt, intervalDays) =>
  lastRequestedAt && intervalDays
    ? new Date(new Date(lastRequestedAt).getTime() + intervalDays * DAY_MS)
    : null;

/**
 * Where the requested money goes, copied onto the payout (see
 * Payout.destination) so later edits can't redirect it.
 */
const resolveDestination = async (req, method, isRider) => {
  if (isRider) {
    const rider = await User.findById(req.user._id).select('phone riderDetails firstName lastName');
    const phone = rider?.riderDetails?.phone || rider?.phone;
    if (method !== 'mobile' || !phone) {
      throw new PayoutRejection(
        'Riders are paid by mobile money - add your phone number to your profile first'
      );
    }
    return {
      provider: 'MTN',
      phone,
      accountName: `${rider.firstName || ''} ${rider.lastName || ''}`.trim(),
    };
  }
  const owned = await Business.findOne({ owner: req.user._id }).select('payoutInfo').lean();
  if (!owned) return null;
  const info = owned.payoutInfo || {};
  if (method === 'mobile' && info.mobilePhone?.trim()) {
    return {
      provider: info.mobileProvider || 'MTN',
      phone: info.mobilePhone.trim(),
      accountName: info.mobileAccountName,
    };
  }
  if (method === 'bank' && info.accountNumber?.trim() && info.bankName?.trim()) {
    return {
      bankName: info.bankName,
      accountHolder: info.accountHolder,
      accountNumber: info.accountNumber.trim(),
      swiftCode: info.swiftCode,
    };
  }
  throw new PayoutRejection(
    `Add your ${method === 'mobile' ? 'mobile money' : 'bank'} payout details before requesting a payout`
  );
};

/**
 * @desc    Request a payout
 * @route   POST /api/payouts/request
 * @access  Private (Business Owner/Manager/Rider)
 */
const requestPayout = async (req, res) => {
  const amount = Number(req.body.amount);
  const { method } = req.body;

  try {
    const { minimumWithdrawal, intervalDays } = await payoutRules();
    if (!Number.isFinite(amount) || amount < minimumWithdrawal) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ${minimumWithdrawal} RWF`,
        minimumWithdrawal,
      });
    }

    const isRider = req.user.activeRole === 'rider';
    const destination = await resolveDestination(req, method, isRider);
    const business = isRider
      ? null
      : await Business.findOne({ owner: req.user._id }).select('_id').lean();
    if (!isRider && !business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    const owner = isRider ? { user: req.user._id } : { business: business._id };

    const now = new Date();
    const intervalCutoff = new Date(now.getTime() - intervalDays * DAY_MS);
    // One request per interval: only matches if there was no request since
    // the cutoff. Part of the same atomic update as the balance deduction, so
    // two simultaneous requests can't both get through.
    const intervalOk = (field) => ({
      $or: [
        { [field]: { $exists: false } },
        { [field]: null },
        { [field]: { $lte: intervalCutoff } },
      ],
    });

    let payout = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        payout = null;
        const { held } = isRider ? { held: 0 } : await heldFunds(owner, session);

        let updated;
        if (isRider) {
          updated = await User.findOneAndUpdate(
            {
              _id: req.user._id,
              'stats.riderBalance': { $gte: amount },
              ...intervalOk('stats.lastPayoutRequestedAt'),
            },
            {
              $inc: { 'stats.riderBalance': -amount },
              $set: { 'stats.lastPayoutRequestedAt': now },
            },
            { new: true, session }
          );
        } else {
          updated = await Business.findOneAndUpdate(
            {
              _id: business._id,
              // Held (not yet released) earnings can't be withdrawn.
              'stats.balance': { $gte: amount + held },
              ...intervalOk('stats.lastPayoutRequestedAt'),
            },
            {
              $inc: { 'stats.balance': -amount },
              $set: { 'stats.lastPayoutRequestedAt': now },
            },
            { new: true, session }
          );
        }
        if (!updated) {
          // Work out which rule stopped it, to tell the payee exactly.
          const current = isRider
            ? await User.findById(req.user._id)
                .select('+stats.riderBalance stats.lastPayoutRequestedAt')
                .session(session)
                .lean()
            : await Business.findById(business._id)
                .select('stats.balance stats.lastPayoutRequestedAt')
                .session(session)
                .lean();
          const last = current?.stats?.lastPayoutRequestedAt;
          if (last && new Date(last) > intervalCutoff) {
            const next = nextRequestAt(last, intervalDays);
            throw new PayoutRejection(
              `You can request one payout every ${intervalDays} days. Your next request is possible from ${next.toISOString().slice(0, 10)}.`,
              { nextRequestAt: next }
            );
          }
          const balance = isRider
            ? current?.stats?.riderBalance || 0
            : current?.stats?.balance || 0;
          const available = Math.max(0, balance - held);
          throw new PayoutRejection(
            held > 0
              ? `Only ${fmt(available)} is available now - ${fmt(held)} is still on hold from recent orders.`
              : 'Insufficient balance',
            { availableBalance: available, heldAmount: held }
          );
        }

        [payout] = await Payout.create(
          [
            {
              ...owner,
              amount,
              requestedAmount: amount,
              method,
              destination,
              status: 'requested',
            },
          ],
          { session }
        );
        await recordEntry(
          {
            ...owner,
            type: 'payout',
            amount: -amount,
            balanceAfter: isRider ? updated.stats.riderBalance : updated.stats.balance,
            payout: payout._id,
            createdBy: req.user._id,
            description: `Payout requested to ${destination.phone || destination.accountNumber}`,
          },
          session
        );
      });
    } finally {
      session.endSession();
    }

    return res.status(201).json(payout);
  } catch (error) {
    if (error instanceof PayoutRejection) {
      return res.status(400).json({ message: error.message, ...error.extra });
    }
    logger.error({ err: error }, 'Payout request failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    My balance (available / on hold), when I can next request, and my
 *          payouts
 * @route   GET /api/payouts/me
 * @access  Private (Business Owner/Manager/Rider)
 */
const getMyPayouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const { minimumWithdrawal, holdDays, intervalDays } = await payoutRules();

    const isRider = req.user.activeRole === 'rider';
    let owner;
    let balance;
    let lastRequestedAt;
    if (isRider) {
      const rider = await User.findById(req.user._id)
        .select('+stats.riderBalance stats.lastPayoutRequestedAt')
        .lean();
      owner = { user: req.user._id };
      balance = rider?.stats?.riderBalance || 0;
      lastRequestedAt = rider?.stats?.lastPayoutRequestedAt;
    } else {
      const business = await Business.findOne({ owner: req.user._id })
        .select('_id stats.balance stats.lastPayoutRequestedAt')
        .lean();
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }
      owner = { business: business._id };
      balance = business.stats?.balance || 0;
      lastRequestedAt = business.stats?.lastPayoutRequestedAt;
    }

    const [payouts, total, open, hold] = await Promise.all([
      Payout.find(owner).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payout.countDocuments(owner),
      Payout.aggregate([
        { $match: { ...owner, status: { $in: OPEN_PAYOUT_STATUSES } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
      isRider ? { held: 0, releases: [] } : heldFunds(owner),
    ]);

    const next = nextRequestAt(lastRequestedAt, intervalDays);
    res.json({
      payouts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      // Everything earned and not yet paid out (may be negative after a refund).
      balance,
      // What can be requested right now.
      availableBalance: Math.max(0, balance - hold.held),
      heldAmount: hold.held,
      // When each held amount becomes available.
      releases: hold.releases.slice(0, 20),
      pendingAmount: open[0]?.amount || 0,
      minimumWithdrawal,
      holdDays: isRider ? 0 : holdDays,
      intervalDays,
      nextRequestAt: next && next > new Date() ? next : null,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get my payouts failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Balance history (ledger). Payees see their own; admins can read any
 *          vendor's (?business=) or rider's (?user=).
 * @route   GET /api/payouts/ledger
 * @access  Private (Business Owner/Rider/Admin)
 */
const getLedger = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = parseInt(req.query.page) || 1;
    const isAdmin = req.user.roles?.includes('admin');

    let owner;
    if (isAdmin && (req.query.business || req.query.user)) {
      const id = req.query.business || req.query.user;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid id' });
      }
      owner = req.query.business ? { business: id } : { user: id };
    } else if (req.user.activeRole === 'rider') {
      owner = { user: req.user._id };
    } else {
      const business = await Business.findOne({ owner: req.user._id }).select('_id').lean();
      if (!business) return res.status(404).json({ message: 'Business not found' });
      owner = { business: business._id };
    }

    const [entries, total] = await Promise.all([
      BalanceTransaction.find(owner)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('order', 'orderNumber')
        .populate('payout', 'status reference amount')
        .lean(),
      BalanceTransaction.countDocuments(owner),
    ]);
    res.json({ entries, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error({ err: error }, 'Get ledger failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all payouts (Admin)
 * @route   GET /api/payouts/admin
 * @access  Private (Admin)
 */
const getAdminPayouts = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .populate('business', 'name contact stats payoutInfo')
        .populate('user', 'firstName lastName email phone stats')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments(query),
    ]);
    res.json({ payouts, currentPage: page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update payout status (Admin)
 * @route   PATCH /api/payouts/:id/status
 * @access  Private (Admin)
 */
const updatePayoutStatus = async (req, res) => {
  const { status, reference, failureReason } = req.body;

  try {
    // H8: a payout that reached a terminal state (completed/failed/cancelled)
    // can never change again, so its balance refund can't run twice. The write
    // is a compare-and-swap on "still not terminal".
    const existingPayout = await Payout.findById(req.params.id);
    if (!existingPayout) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    if (TERMINAL_PAYOUT_STATUSES.includes(existingPayout.status)) {
      return res.status(400).json({
        message: `Payout is already '${existingPayout.status}' and cannot be updated further`,
      });
    }

    const updateDoc = { status };
    if (reference) updateDoc.reference = reference;
    if (failureReason) updateDoc.failureReason = failureReason;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateDoc.processedAt = Date.now();
      updateDoc.processedBy = req.user._id;
    }

    let payout = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        payout = await Payout.findOneAndUpdate(
          { _id: req.params.id, status: { $nin: TERMINAL_PAYOUT_STATUSES } },
          { $set: updateDoc },
          { new: true, session }
        );
        if (!payout || (status !== 'failed' && status !== 'cancelled')) return;

        // The money never left: give it back, record why, and let the payee
        // request again straight away (it doesn't count against the interval).
        const owner = payout.user ? { user: payout.user } : { business: payout.business };
        const after = payout.user
          ? await User.findOneAndUpdate(
              { _id: payout.user },
              {
                $inc: { 'stats.riderBalance': payout.amount },
                $unset: { 'stats.lastPayoutRequestedAt': 1 },
              },
              { new: true, session }
            ).select('+stats.riderBalance')
          : await Business.findOneAndUpdate(
              { _id: payout.business },
              {
                $inc: { 'stats.balance': payout.amount },
                $unset: { 'stats.lastPayoutRequestedAt': 1 },
              },
              { new: true, session }
            );
        await recordEntry(
          {
            ...owner,
            type: 'payout_reversal',
            amount: payout.amount,
            balanceAfter: payout.user ? after?.stats?.riderBalance : after?.stats?.balance,
            payout: payout._id,
            createdBy: req.user._id,
            description: `Payout ${status}${failureReason ? `: ${failureReason}` : ''} - amount returned to your balance`,
          },
          session
        );
      });
    } finally {
      session.endSession();
    }
    if (!payout) {
      return res.status(400).json({ message: 'Payout is already in a terminal state' });
    }

    // Keep the payee informed at every step.
    const owner = payout.user ? { user: payout.user } : { business: payout.business };
    const amountText = fmt(payout.amount, payout.currency);
    const messages = {
      processing: {
        title: 'Payout approved',
        message: `Your payout of ${amountText} was approved and is being sent.`,
      },
      completed: {
        title: 'Payout sent',
        message: `Your payout of ${amountText} was sent${payout.reference ? ` (reference ${payout.reference})` : ''}.`,
      },
      failed: {
        title: 'Payout failed',
        message: `Your payout of ${amountText} could not be sent${failureReason ? `: ${failureReason}` : ''}. The money is back in your balance and you can request again.`,
      },
      cancelled: {
        title: 'Payout cancelled',
        message: `Your payout of ${amountText} was cancelled. The money is back in your balance.`,
      },
    };
    if (messages[status]) notifyPayee(owner, messages[status]);

    res.json(payout);
  } catch (error) {
    logger.error({ err: error }, 'Update payout status failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  requestPayout,
  getMyPayouts,
  getLedger,
  getAdminPayouts,
  updatePayoutStatus,
};
