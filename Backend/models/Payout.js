const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const payoutSchema = new Schema(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'RWF',
    },
    status: {
      type: String,
      enum: ['requested', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'requested',
    },
    method: {
      type: String,
      enum: ['bank', 'mobile'],
      required: true,
    },
    // Where the money goes, copied from the payee's payout details when the
    // payout is requested. Admins pay THIS - so changing the payout number
    // after requesting (e.g. from a hijacked account) can't redirect the money.
    destination: {
      provider: String,
      phone: String,
      accountName: String,
      bankName: String,
      accountHolder: String,
      accountNumber: String,
      swiftCode: String,
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
    bankReference: String,
    failureReason: String,
    // Changes made to the amount after it was requested (e.g. reduced to
    // cover a refund) - shown to the vendor and the admin.
    requestedAmount: Number,
    adjustments: [
      {
        amount: Number, // negative = reduced
        reason: String,
        dispute: { type: Schema.Types.ObjectId, ref: 'Dispute' },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Mongoose 9 removed the `next` callback from middleware; calling it threw
// "next is not a function", failing every Payout.create in requestPayout.
payoutSchema.pre('validate', function () {
  if (!this.business && !this.user) {
    this.invalidate('business', 'Either business or user reference is required');
  }
});

// Indexes for query optimization
payoutSchema.index({ business: 1, status: 1, createdAt: -1 }); // Business payouts history
payoutSchema.index({ user: 1, status: 1, createdAt: -1 }); // User payouts history
payoutSchema.index({ status: 1, createdAt: -1 }); // Processing queue
payoutSchema.index({ processedBy: 1, processedAt: -1 }, { sparse: true }); // Admin processing history
payoutSchema.index({ method: 1, status: 1 }); // Payouts by method
payoutSchema.index({ amount: -1, status: 1 }); // High-value payouts tracking

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
