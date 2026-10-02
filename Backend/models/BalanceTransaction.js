const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * The balance ledger: one row for every change to a vendor's (business) or
 * rider's (user) payout balance - earnings, refund deductions, payouts and
 * reversals. Vendors and admins both read it, so every figure on the payouts
 * screen can be traced to the order, dispute or payout behind it.
 *
 * Rows are append-only: a mistake is corrected with a new row, never by
 * editing an old one.
 */
const balanceTransactionSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'order_earning', // + vendor share of a completed order
        'delivery_earning', // + rider share of a delivery fee
        'refund_deduction', // - vendor-fault refund taken back
        'payout', // - payout requested (money leaves the balance)
        'payout_adjustment', // + part of a still-unpaid payout returned to cover a refund
        'payout_reversal', // + payout failed/cancelled, money returned
      ],
      required: true,
    },
    // Signed: credits positive, debits negative.
    amount: { type: Number, required: true },
    // Balance right after this row was applied.
    balanceAfter: { type: Number },
    currency: { type: String, default: 'RWF' },
    // When an earning can be withdrawn (end of the holding period). Only set on
    // earnings; debits apply immediately.
    availableAt: { type: Date },
    description: { type: String, trim: true, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    payout: { type: Schema.Types.ObjectId, ref: 'Payout' },
    dispute: { type: Schema.Types.ObjectId, ref: 'Dispute' },
    refundRequest: { type: Schema.Types.ObjectId, ref: 'RefundRequest' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

balanceTransactionSchema.pre('validate', function () {
  if (!this.business && !this.user) {
    this.invalidate('business', 'A ledger row belongs to a business or a user');
  }
});

balanceTransactionSchema.index({ business: 1, createdAt: -1 });
balanceTransactionSchema.index({ user: 1, createdAt: -1 });
balanceTransactionSchema.index({ business: 1, type: 1, availableAt: 1 });

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);
