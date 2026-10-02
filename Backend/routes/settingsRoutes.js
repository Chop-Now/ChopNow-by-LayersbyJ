const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getCommissionRate,
  checkFeature,
  checkMaintenanceMode,
  emergencyMaintenanceOff,
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// Strict rate limiter for recovery endpoint
const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: { message: 'Too many recovery attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/public', getPublicSettings);
router.get('/maintenance', checkMaintenanceMode);
router.get('/feature/:featureName', checkFeature);

// Emergency recovery route (requires secret key, strictly rate limited)
router.post('/recovery/maintenance-off', recoveryLimiter, emergencyMaintenanceOff);

// Protected routes
router.get('/commission', protect, authorize('admin', 'business_owner'), getCommissionRate);

// Admin only routes
router.get('/', protect, authorize('admin'), getAllSettings);
router.put('/', protect, authorize('admin'), updateSettings);

module.exports = router;
