const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const disputeSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'refund',
        'missing_item',
        'vendor_unresponsive',
        'delivery_issue',
        'poor_quality',
        'other',
      ],
      required: true,
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    evidence: [
      {
        type: String, // URLs to photos
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'rejected', 'escalated'],
      default: 'open',
    },
    resolution: {
      action: {
        type: String,
        enum: ['full_refund', 'partial_refund', 'replacement', 'rejected', 'none'],
      },
      amount: Number,
      comment: String,
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      resolvedAt: Date,
    },
    timeline: [
      {
        event: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
disputeSchema.index({ status: 1, priority: -1, createdAt: -1 }); // Admin queue (high priority first)
disputeSchema.index({ business: 1, status: 1, createdAt: -1 }); // Business disputes
disputeSchema.index({ customer: 1, status: 1, createdAt: -1 }); // Customer disputes
disputeSchema.index({ order: 1 }); // Dispute by order lookup
disputeSchema.index({ type: 1, status: 1, createdAt: -1 }); // Disputes by type
disputeSchema.index({ 'resolution.resolvedBy': 1, 'resolution.resolvedAt': -1 }, { sparse: true }); // Admin resolution tracking

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;
