const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { encryptField, decryptField } = require('../utils/fieldEncryption');

const addressSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    // Authentication
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },

    // Roles - Users can have multiple roles (e.g., consumer + business_owner)
    roles: {
      type: [String],
      enum: ['consumer', 'business_owner', 'rider', 'admin'],
      default: ['consumer'],
      validate: {
        validator: (v) => v && v.length > 0,
        message: 'User must have at least one role',
      },
    },
    // Active role - which role is currently in use
    activeRole: {
      type: String,
      enum: ['consumer', 'business_owner', 'rider', 'admin'],
      default: 'consumer',
    },

    // Profile
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },

    // Addresses
    addresses: [addressSchema],

    // Preferences
    preferences: {
      language: {
        type: String,
        default: 'en',
      },
      searchRadius: {
        type: Number,
        default: 5, // kilometers
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        newDealsNearby: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // Password reset
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // OTP for email login
    otpCode: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // H3 fix: bumped on password change and "logout all devices" so previously
    // issued access/refresh tokens (embedding the tokenVersion they were signed
    // with) stop working immediately, instead of remaining valid for up to their
    // full 7-day lifetime after a user tries to revoke them.
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },

    // Stats
    stats: {
      ordersCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
        min: 0,
      },
      riderBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
      // When the rider last requested a payout - enforces payoutIntervalDays.
      lastPayoutRequestedAt: {
        type: Date,
      },
    },
    // Rider Details
    riderStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    riderDetails: {
      vehicleType: {
        type: String,
        enum: ['bicycle', 'motorcycle', 'car', 'walking'],
      },
      // M5: encrypted at rest (AES-256-GCM, see utils/fieldEncryption.js).
      // encryptField() trims the plaintext itself - schema-level `trim`
      // doesn't compose with a custom `set` the way you'd expect, so it's
      // deliberately left off here rather than kept as dead configuration.
      licensePlate: {
        type: String,
        set: encryptField,
        get: decryptField,
      },
      nationalId: {
        type: String,
        set: encryptField,
        get: decryptField,
      },
      phone: {
        type: String,
        trim: true,
      },
      vehiclePhoto: {
        type: String,
        trim: true,
      },
      nationalIdPhoto: {
        type: String,
        trim: true,
      },
      rejectedReason: {
        type: String,
        trim: true,
      },
      isOnline: {
        type: Boolean,
        default: false,
      },
      appliedAt: Date,
      reviewedAt: Date,
    },
    // FCM Push Tokens
    fcmTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
userSchema.index({ 'addresses.location': '2dsphere' }); // Geospatial queries
userSchema.index({ status: 1, createdAt: -1 }); // Active users sorted by date
userSchema.index({ roles: 1 }); // Filter by role
userSchema.index({ activeRole: 1, status: 1 }); // Role-based queries
userSchema.index({ emailVerified: 1, status: 1 }); // Verified users
userSchema.index({ 'stats.ordersCount': -1 }); // Top customers
userSchema.index({ verificationToken: 1 }, { sparse: true }); // Token lookups
userSchema.index({ resetPasswordToken: 1 }, { sparse: true }); // Password reset lookups
userSchema.index({ otpCode: 1, otpExpires: 1 }, { sparse: true }); // OTP validation
userSchema.index({ riderStatus: 1 }); // Rider status filtering
userSchema.index({ 'stats.riderBalance': -1 }); // Top earning riders

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual for backward compatibility - returns activeRole as 'role'
userSchema.virtual('role').get(function () {
  return this.activeRole;
});

// Pre-save middleware to ensure activeRole is in roles array
userSchema.pre('save', async function () {
  // If roles is empty, set default
  if (!this.roles || this.roles.length === 0) {
    this.roles = ['consumer'];
  }
  // If activeRole is not set or not in roles, set to first role
  if (!this.activeRole || !this.roles.includes(this.activeRole)) {
    this.activeRole = this.roles[0];
  }
});

// Ensure virtuals are included and sensitive fields stripped in JSON
userSchema.set('toJSON', {
  virtuals: true,
  // M5: without this, riderDetails.nationalId/licensePlate would serialize
  // as raw ciphertext in every API response (res.json() goes through
  // toJSON) instead of the decrypted value - getters only apply to direct
  // property access on a live document by default, not to serialization.
  getters: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.verificationToken;
    delete ret.verificationTokenExpires;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.otpCode;
    delete ret.otpExpires;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});
userSchema.set('toObject', { virtuals: true, getters: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
