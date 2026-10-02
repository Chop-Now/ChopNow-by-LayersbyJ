const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const { read, type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('relatedOrder', 'orderNumber status')
      .populate('relatedListing', 'title photos')
      .populate('relatedBusiness', 'name media')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const [total, unreadCount] = await Promise.all([
      Notification.countDocuments(query),
      Notification.getUnreadCount(req.user._id),
    ]);

    res.json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      unreadCount,
    });
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get notification by ID with full details
 * @route   GET /api/notifications/:id
 * @access  Private
 */
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate(
        'relatedOrder',
        'orderNumber status pricing fulfillmentType deliveryDetails pickupDetails items createdAt'
      )
      .populate('relatedListing', 'title photos pricing category')
      .populate('relatedBusiness', 'name media address contact');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check authorization
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark as read when viewed
    if (!notification.read) {
      await notification.markAsRead();
    }

    res.json(notification);
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check authorization
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await notification.markAsRead();

    res.json(notification);
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const modifiedCount = await Notification.markAllAsRead(req.user._id);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount,
    });
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check authorization
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await notification.deleteOne();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.json({ count });
  } catch (error) {
    logger.error({ err: error }, 'Notification error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
