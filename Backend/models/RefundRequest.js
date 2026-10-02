const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * C8 fix: there is no real pawaPay refund/reversal API integration in this
 * codebase (mobile money refunds aren't something we can safely fire off
 * automatically without one). Resolving a dispute as a refund creates one of
 * these instead of silently claiming success with nothing behind it - it is
 * the ops team's queue of refunds that still need to be executed manually
 * (bank/mobile transfer, or a real pawaPay refund call once that integration
 * exists) and tracked to completion.
 */
const refundRequestSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    // Set when the refund came from a resolved dispute; absent when it came
    // from cancelling an already-paid order.
    dispute: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },
    payment: {
      // Absent for cash orders - there's no gateway payment to reverse, the
      // refund is purely a manual hand-back to the customer.
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Refund amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'RWF',
    },
    reason: {
      type: String,
      trim: true,
    },
    // Who bears the cost: 'vendor' (their share comes out of their payout
    // balance) or 'platform' (goodwill - ChopNow absorbs it).
    fundedBy: {
      type: String,
      enum: ['vendor', 'platform'],
      default: 'platform',
    },
    vendorDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending_manual', 'completed', 'failed'],
      default: 'pending_manual',
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: Date,
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

refundRequestSchema.index({ status: 1, createdAt: -1 }); // Ops queue
refundRequestSchema.index({ order: 1 });
refundRequestSchema.index({ dispute: 1 });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
