const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    // User Reference
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    // Notification Content
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },

    // Notification Type
    type: {
      type: String,
      enum: [
        // Customer notifications
        'order_confirmed',
        'order_ready',
        'order_out_for_delivery',
        'order_completed',
        'order_cancelled',
        'new_listing_nearby',
        'favorite_business_new_listing',
        'payment_success',
        'delivery_assigned',
        // Vendor notifications
        'new_order',
        'order_status_changed',
        // Payee (vendor/rider) money notifications
        'payout_update',
        // Review notifications
        'new_review',
        'review_response',
        // System
        'system',
        'promotion',
        'other',
      ],
      required: [true, 'Notification type is required'],
    },

    // Deep Link
    link: {
      type: String,
      trim: true,
    },

    // Related References
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    relatedListing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
    },
    relatedBusiness: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
    },

    // Rich metadata for notification details (flexible schema)
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Read Status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },

    // Sent Status
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
notificationSchema.index({ user: 1, read: 1, createdAt: -1 }); // User unread notifications
notificationSchema.index({ user: 1, type: 1, createdAt: -1 }); // User notifications by type
notificationSchema.index({ relatedOrder: 1 }, { sparse: true }); // Order-related notifications
notificationSchema.index({ relatedBusiness: 1 }, { sparse: true }); // Business notifications
notificationSchema.index({ sent: 1, createdAt: -1 }); // Batch sending queue
notificationSchema.index({ read: 1, readAt: 1 }); // For cleanup of old notifications

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark notification as sent
notificationSchema.methods.markAsSent = function () {
  this.sent = true;
  this.sentAt = new Date();
  return this.save();
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  const now = new Date();
  const result = await this.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: now } }
  );
  return result.modifiedCount;
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Static method to create and optionally send notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);

  // Here you can add logic to send push notification or email
  // based on user preferences
  try {
    const User = mongoose.model('User');
    const user = await User.findById(notification.user);

    const { push } = user.preferences.notifications;

    if (push && user.fcmTokens && user.fcmTokens.length > 0) {
      const { sendMulticastPushNotification } = require('../utils/firebase');
      const pushData = {
        type: notification.type,
        route: notification.link || '',
      };
      if (notification.relatedOrder) {
        pushData.relatedOrder = notification.relatedOrder.toString();
      }
      if (notification.relatedListing) {
        pushData.relatedListing = notification.relatedListing.toString();
      }
      if (notification.relatedBusiness) {
        pushData.relatedBusiness = notification.relatedBusiness.toString();
      }

      await sendMulticastPushNotification(user.fcmTokens, {
        title: notification.title,
        body: notification.message,
        data: pushData,
      });
    }

    // Mark as sent after successful delivery
    await notification.markAsSent();
  } catch (error) {
    logger.error({ err: error }, 'Error sending notification');
  }

  return notification;
};

// Static method to delete old read notifications
notificationSchema.statics.cleanupOldNotifications = async function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
