const BalanceTransaction = require('../models/BalanceTransaction');
const Business = require('../models/Business');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const DAY_MS = 24 * 60 * 60 * 1000;

const holdUntil = (holdDays) => new Date(Date.now() + (holdDays || 0) * DAY_MS);

const ownerFilter = ({ business, user }) => (business ? { business } : { user });

/** Appends one ledger row (inside the caller's transaction when given). */
const recordEntry = async (entry, session) => {
  const [row] = await BalanceTransaction.create([entry], session ? { session } : undefined);
  return row;
};

/**
 * Money still inside its holding period: order earnings whose availableAt is
 * in the future, less any refund already deducted for those same orders (a
 * refund comes out of that order's held money first, not out of money that
 * was already free to withdraw).
 *
 * @returns {Promise<{held: number, releases: Array<{amount, availableAt, order}>}>}
 */
const heldFunds = async (owner, session) => {
  const now = new Date();
  const heldRows = await BalanceTransaction.find({
    ...ownerFilter(owner),
    type: 'order_earning',
    availableAt: { $gt: now },
  })
    .select('amount availableAt order')
    .session(session || null)
    .lean();
  if (heldRows.length === 0) return { held: 0, releases: [] };

  const orderIds = heldRows.map((r) => r.order).filter(Boolean);
  const deductions = await BalanceTransaction.aggregate([
    { $match: { ...ownerFilter(owner), type: 'refund_deduction', order: { $in: orderIds } } },
    { $group: { _id: '$order', amount: { $sum: '$amount' } } },
  ]).session(session || null);
  const deductedByOrder = new Map(deductions.map((d) => [String(d._id), d.amount]));

  const releases = heldRows
    .map((r) => ({
      amount: Math.max(0, r.amount + (deductedByOrder.get(String(r.order)) || 0)),
      availableAt: r.availableAt,
      order: r.order,
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.availableAt - b.availableAt);
  return { held: releases.reduce((sum, r) => sum + r.amount, 0), releases };
};

/**
 * Tells the vendor (business owner) or rider about a balance / payout change.
 * Never throws - a failed notification must not undo a money movement.
 */
const notifyPayee = async ({ business, user }, { title, message }) => {
  try {
    let recipient = user;
    if (business) {
      const biz = await Business.findById(business).select('owner').lean();
      recipient = biz?.owner;
    }
    if (!recipient) return;
    await Notification.createNotification({
      user: recipient,
      title,
      message,
      type: 'payout_update',
      link: '/dashboard',
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Payee notification failed');
  }
};

module.exports = { DAY_MS, holdUntil, recordEntry, heldFunds, notifyPayee };
