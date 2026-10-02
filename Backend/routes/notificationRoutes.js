const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.get('/', protect, getNotifications);
router.get('/unread/count', protect, getUnreadCount);
router.put('/read-all', protect, markAllAsRead);
router.get('/:id', protect, getNotificationById);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
