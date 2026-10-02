const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const businessSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['farmer', 'supermarket', 'restaurant', 'bakery', 'cafe', 'other'],
      default: 'restaurant',
    },

    // Contact Info
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },

    // Location
    address: {
      type: Schema.Types.Mixed, // Can be string or object
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude]
      },
    },

    // Verification
    verification: {
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'approved', 'rejected', 'info_requested'],
        default: 'unverified',
      },
      documents: [
        {
          type: {
            type: String, // license, health_cert, id_card
            default: 'other',
          },
          url: {
            type: String,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      submittedAt: Date,
      verifiedAt: Date,
      notes: String,
    },

    // Operation
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    rating: {
      average: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    metrics: {
      mealsSaved: {
        type: Number,
        default: 0,
      },
      co2Saved: {
        type: Number,
        default: 0,
      },
    },

    // Media/Images
    media: {
      logo: { type: String },
      coverImage: { type: String },
      photos: [{ type: String }],
    },

    // Statistics
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalListings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      // When the last payout was requested - enforces payoutIntervalDays.
      lastPayoutRequestedAt: { type: Date },
      impact: {
        co2Saved: { type: Number, default: 0 },
        mealsRescued: { type: Number, default: 0 },
        waterSaved: { type: Number, default: 0 },
      },
    },

    // Delivery Settings
    deliverySettings: {
      enabled: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      radius: { type: Number, default: 5 }, // km
      minOrder: { type: Number, default: 0 },
    },

    // Contact Info (structured)
    contact: {
      email: { type: String },
      phone: { type: String },
      whatsapp: { type: String },
    },

    // Payout Information
    payoutInfo: {
      preferredMethod: { type: String, enum: ['bank', 'mobile'], default: 'mobile' },
      bankName: { type: String },
      accountHolder: { type: String },
      accountNumber: { type: String },
      swiftCode: { type: String },
      mobileProvider: { type: String, default: 'MTN' },
      mobilePhone: { type: String },
      mobileAccountName: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Mask sensitive payout information
        if (ret.payoutInfo) {
          if (ret.payoutInfo.accountNumber) {
            ret.payoutInfo.accountNumber = '****' + ret.payoutInfo.accountNumber.slice(-4);
          }
          if (ret.payoutInfo.swiftCode) {
            ret.payoutInfo.swiftCode = '****';
          }
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for query optimization
businessSchema.index({ location: '2dsphere' }); // Geospatial queries (nearby businesses)
businessSchema.index({ name: 'text', description: 'text' }); // Full-text search
businessSchema.index({ owner: 1 }); // Owner's businesses lookup
businessSchema.index({ status: 1, type: 1 }); // Filter by status and type
businessSchema.index({ status: 1, createdAt: -1 }); // Active businesses by date
businessSchema.index({ 'verification.status': 1, createdAt: -1 }); // Admin approval queue
businessSchema.index({ type: 1, status: 1, 'rating.average': -1 }); // Top rated by type
businessSchema.index({ 'stats.totalOrders': -1 }); // Top businesses by orders
businessSchema.index({ 'metrics.mealsSaved': -1 }); // Impact leaderboard

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
