const crypto = require('crypto');
const PlatformSettings = require('../models/PlatformSettings');
const logger = require('../utils/logger');

// Hashing both sides to a fixed-length digest before timingSafeEqual avoids
// leaking the recovery key's length via a length-check short-circuit, which
// a bare string comparison (or timingSafeEqual on the raw strings) would do.
const timingSafeStringEqual = (a, b) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

/**
 * @desc    Get platform settings (public - limited fields)
 * @route   GET /api/settings/public
 * @access  Public
 */
const getPublicSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();

    // Return only public-facing settings
    res.json({
      platformName: settings.platformName,
      platformTagline: settings.platformTagline,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      allowNewRegistrations: settings.allowNewRegistrations,
      requireEmailVerification: settings.requireEmailVerification,
      allowGuestCheckout: settings.allowGuestCheckout,
      enableReviews: settings.enableReviews,
      enableNotifications: settings.enableNotifications,
      maintenanceMode: settings.maintenanceMode,
      // Checkout options the clients show before the server quote arrives
      cashPaymentsEnabled: settings.cashPaymentsEnabled,
      deliveryFee: settings.deliveryFee,
      taxPercent: settings.taxPercent,
      taxLabel: settings.taxLabel,
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all platform settings (admin only)
 * @route   GET /api/settings
 * @access  Private (Admin)
 */
const getAllSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json(settings);
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update platform settings
 * @route   PUT /api/settings
 * @access  Private (Admin)
 */
const updateSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.updateSettings(req.body, req.user._id);

    res.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get commission rate for order calculations
 * @route   GET /api/settings/commission
 * @access  Private (Business Owner, Admin)
 */
const getCommissionRate = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json({
      platformFeePercent: settings.platformFeePercent,
      minimumWithdrawal: settings.minimumWithdrawal,
      payoutHoldDays: settings.payoutHoldDays,
      payoutIntervalDays: settings.payoutIntervalDays,
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Check if a feature is enabled
 * @route   GET /api/settings/feature/:featureName
 * @access  Public
 */
const checkFeature = async (req, res) => {
  try {
    const { featureName } = req.params;
    const settings = await PlatformSettings.getSettings();

    const featureMap = {
      registration: settings.allowNewRegistrations,
      emailVerification: settings.requireEmailVerification,
      guestCheckout: settings.allowGuestCheckout,
      reviews: settings.enableReviews,
      notifications: settings.enableNotifications,
      maintenance: settings.maintenanceMode,
    };

    if (featureMap[featureName] === undefined) {
      return res.status(400).json({ message: 'Unknown feature' });
    }

    res.json({
      feature: featureName,
      enabled: featureMap[featureName],
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Check maintenance mode status
 * @route   GET /api/settings/maintenance
 * @access  Public
 */
const checkMaintenanceMode = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json({
      maintenanceMode: settings.maintenanceMode,
      platformName: settings.platformName,
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Emergency recovery - turn off maintenance mode with secret key
 * @route   POST /api/settings/recovery/maintenance-off
 * @access  Public (requires ADMIN_RECOVERY_KEY)
 */
const emergencyMaintenanceOff = async (req, res) => {
  try {
    const { recoveryKey } = req.body;

    // Get the recovery key from environment variable
    const validRecoveryKey = process.env.ADMIN_RECOVERY_KEY;

    if (!validRecoveryKey) {
      return res.status(500).json({ message: 'Recovery key not configured on server' });
    }

    if (!recoveryKey || !timingSafeStringEqual(recoveryKey, validRecoveryKey)) {
      return res.status(403).json({ message: 'Invalid recovery key' });
    }

    // Turn off maintenance mode
    const settings = await PlatformSettings.getSettings();
    settings.maintenanceMode = false;
    await settings.save();

    res.json({
      success: true,
      message: 'Maintenance mode has been turned OFF',
      maintenanceMode: false,
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getCommissionRate,
  checkFeature,
  checkMaintenanceMode,
  emergencyMaintenanceOff,
};
