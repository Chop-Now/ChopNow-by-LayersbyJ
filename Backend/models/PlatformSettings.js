const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    // General Settings
    platformName: {
      type: String,
      default: 'ChopNow',
    },
    platformTagline: {
      type: String,
      default: 'Save Food, Save Money, Save the Planet',
    },
    supportEmail: {
      type: String,
      default: 'chopnow.app@gmail.com',
    },
    supportPhone: {
      type: String,
      default: '+250 788 000 000',
    },

    // Commission & Payout Settings
    platformFeePercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    minimumWithdrawal: {
      type: Number,
      default: 5000, // RWF
    },
    // Earnings from a completed order are held this many days before they can
    // be withdrawn, so refunds/disputes in that window come out of held money.
    payoutHoldDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 60,
    },
    // A payee can request at most one payout per this many days.
    payoutIntervalDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 60,
    },

    // Checkout pricing & payment options
    // Cash is off by default: the vendor keeps cash in hand, so the platform
    // has no way to collect its commission on it.
    cashPaymentsEnabled: {
      type: Boolean,
      default: false,
    },
    // Flat delivery fee (RWF) charged per vendor order - set by the platform,
    // not by vendors or riders, so customers are never overcharged.
    deliveryFee: {
      type: Number,
      default: 1000,
      min: 0,
    },
    // Platform's share of each delivery fee; the rider earns the rest.
    deliveryCommissionPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    // Tax added on top of (items + delivery). 0 = no tax line at checkout.
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxLabel: {
      type: String,
      default: 'VAT',
      trim: true,
      maxlength: 30,
    },

    // Feature Toggles
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    allowGuestCheckout: {
      type: Boolean,
      default: false,
    },
    enableReviews: {
      type: Boolean,
      default: true,
    },
    enableNotifications: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    // Admin Notification Settings
    sendOrderConfirmation: {
      type: Boolean,
      default: true,
    },
    sendPayoutNotification: {
      type: Boolean,
      default: true,
    },
    sendNewVendorAlert: {
      type: Boolean,
      default: true,
    },
    sendWeeklyReport: {
      type: Boolean,
      default: true,
    },

    // Metadata
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists (singleton pattern)
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

platformSettingsSchema.statics.updateSettings = async function (updates, adminId) {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({});
  }

  // Update allowed fields only
  const allowedFields = [
    'platformName',
    'platformTagline',
    'supportEmail',
    'supportPhone',
    'platformFeePercent',
    'minimumWithdrawal',
    'payoutHoldDays',
    'payoutIntervalDays',
    'cashPaymentsEnabled',
    'deliveryFee',
    'deliveryCommissionPercent',
    'taxPercent',
    'taxLabel',
    'allowNewRegistrations',
    'requireEmailVerification',
    'allowGuestCheckout',
    'enableReviews',
    'enableNotifications',
    'maintenanceMode',
    'sendOrderConfirmation',
    'sendPayoutNotification',
    'sendNewVendorAlert',
    'sendWeeklyReport',
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      settings[field] = updates[field];
    }
  });

  settings.lastUpdatedBy = adminId;
  settings.updatedAt = new Date();

  await settings.save();
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
