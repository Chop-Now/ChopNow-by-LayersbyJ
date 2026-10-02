const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    // Order Number
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
    },

    // References
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business is required'],
    },
    // The first listing in this order (kept for display/back-compat); each
    // item carries its own listing, and an order may hold several listings
    // from the same vendor.
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing is required'],
    },
    // Orders placed together in one multi-vendor checkout (one per vendor)
    // share this id and are paid with a single mobile-money payment.
    checkoutGroup: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    // Items
    items: [orderItemSchema],

    // Pricing
    pricing: {
      subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative'],
      },
      deliveryFee: {
        type: Number,
        default: 0,
        min: [0, 'Delivery fee cannot be negative'],
      },
      platformFee: {
        type: Number,
        default: 0,
        min: [0, 'Platform fee cannot be negative'],
      },
      platformFeePercent: {
        type: Number,
        default: 10,
        min: [0, 'Platform fee percent cannot be negative'],
        max: [100, 'Platform fee percent cannot exceed 100'],
      },
      vendorAmount: {
        type: Number,
        default: 0,
        min: [0, 'Vendor amount cannot be negative'],
      },
      // Platform's cut of the delivery fee; the rider earns riderAmount.
      deliveryCommission: {
        type: Number,
        default: 0,
        min: 0,
      },
      riderAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      taxPercent: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Vendor-funded dispute refunds granted before the order completed;
      // deducted from what completion credits to the vendor.
      vendorRefunded: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative'],
      },
      currency: {
        type: String,
        default: 'RWF',
      },
    },

    // Fulfillment Type
    fulfillmentType: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: [true, 'Fulfillment type is required'],
    },

    // Pickup Details
    pickupDetails: {
      pickupCode: {
        type: String,
        trim: true,
      },
      pickupInstructions: {
        type: String,
        trim: true,
      },
      pickedUpAt: {
        type: Date,
      },
    },

    // Delivery Details
    deliveryDetails: {
      address: {
        street: {
          type: String,
          trim: true,
        },
        city: {
          type: String,
          trim: true,
        },
        location: {
          type: {
            type: String,
            enum: ['Point'],
          },
          coordinates: {
            type: [Number],
          },
        },
      },
      recipientName: {
        type: String,
        trim: true,
      },
      recipientPhone: {
        type: String,
        trim: true,
      },
      instructions: {
        type: String,
        trim: true,
      },
      estimatedDeliveryTime: {
        type: Date,
      },
      deliveredAt: {
        type: Date,
      },
    },

    // Delivery Reference
    delivery: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending_payment',
        'paid',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'completed',
        'cancelled',
      ],
      default: 'pending_payment',
    },

    // Payment
    payment: {
      paymentMethod: {
        type: String,
        // C5 fix: 'card' removed - there is no real card gateway, so this
        // value existed only as an unauthenticated "mark my order paid" path.
        enum: ['mobile_money', 'cash'],
      },
      paymentStatus: {
        type: String,
        // C8 fix: 'refund_pending'/'refunded' added so a dispute resolution
        // that grants a refund can actually reflect that on the order instead
        // of leaving paymentStatus looking like nothing happened.
        enum: ['pending', 'completed', 'failed', 'refund_pending', 'refunded'],
        default: 'pending',
      },
    },

    // Timestamps for status changes
    statusTimestamps: {
      paidAt: {
        type: Date,
      },
      confirmedAt: {
        type: Date,
      },
      readyAt: {
        type: Date,
      },
      completedAt: {
        type: Date,
      },
      cancelledAt: {
        type: Date,
      },
    },

    // Notes
    notes: {
      customerNotes: {
        type: String,
        trim: true,
      },
      businessNotes: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Mask recipient phone in delivery details
        if (ret.deliveryDetails?.recipientPhone) {
          const phone = ret.deliveryDetails.recipientPhone;
          ret.deliveryDetails.recipientPhone = phone.slice(0, 3) + '****' + phone.slice(-2);
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for query optimization
orderSchema.index({ customer: 1, status: 1, createdAt: -1 }); // Customer order history
orderSchema.index({ business: 1, status: 1, createdAt: -1 }); // Business orders
orderSchema.index({ status: 1, createdAt: -1 }); // Orders by status
orderSchema.index({ listing: 1, status: 1 }); // Orders per listing
orderSchema.index({ 'payment.paymentStatus': 1, status: 1 }); // Payment tracking
orderSchema.index({ fulfillmentType: 1, status: 1, createdAt: -1 }); // Pickup vs delivery
orderSchema.index({ 'pickupDetails.pickupCode': 1 }, { sparse: true }); // Pickup code lookup
orderSchema.index({ customer: 1, createdAt: -1 }); // All customer orders
orderSchema.index({ business: 1, createdAt: -1 }); // All business orders
orderSchema.index({ 'statusTimestamps.completedAt': -1 }, { sparse: true }); // Completed orders
orderSchema.index({ 'pricing.total': -1, status: 1 }); // Revenue analytics

// Generate order number before validating
orderSchema.pre('validate', function () {
  if (this.isNew && !this.orderNumber) {
    // Generate order number: ORD-YYYYMMDD-RANDOM
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    // 8 hex chars (~4 billion values per day). Four random digits collided
    // with ~50% odds at ~100 orders/day, failing checkout on the unique index.
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.orderNumber = `ORD-${dateStr}-${random}`;
  }

  // Calculate total (tax is part of what the customer pays)
  if (
    this.pricing &&
    this.pricing.subtotal !== undefined &&
    this.pricing.deliveryFee !== undefined
  ) {
    this.pricing.total = this.pricing.subtotal + this.pricing.deliveryFee + (this.pricing.tax || 0);
  }
});

// Method to update order status with timestamp
orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;

  const statusTimestampMap = {
    paid: 'paidAt',
    confirmed: 'confirmedAt',
    ready_for_pickup: 'readyAt',
    completed: 'completedAt',
    cancelled: 'cancelledAt',
  };

  const timestampField = statusTimestampMap[newStatus];
  if (timestampField) {
    this.statusTimestamps[timestampField] = new Date();
  }

  return this.save();
};

// Statuses from which an order can still be cancelled
const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'confirmed'];

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  return CANCELLABLE_STATUSES.includes(this.status);
};

const Order = mongoose.model('Order', orderSchema);
Order.CANCELLABLE_STATUSES = CANCELLABLE_STATUSES;

module.exports = Order;
