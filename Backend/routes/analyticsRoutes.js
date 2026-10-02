const express = require('express');
const router = express.Router();
const {
  getPlatformOverview,
  getBusinessOverview,
  getImpactLeaderboard,
  getMyImpact,
  getRecentActivity,
  getUserActivity,
  getAdminStats,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/platform/overview', protect, authorize('admin'), getPlatformOverview);
router.get('/platform/activity', protect, authorize('admin'), getRecentActivity);
router.get('/user-activity', protect, authorize('admin'), getUserActivity);
router.get('/admin/stats', protect, authorize('admin'), getAdminStats);
router.get(
  '/business/overview',
  protect,
  authorize('admin', 'business_owner', 'manager'),
  getBusinessOverview
);
router.get('/impact/my', protect, getMyImpact);
router.get('/impact/leaderboard', getImpactLeaderboard);

module.exports = router;
