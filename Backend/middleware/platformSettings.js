const PlatformSettings = require('../models/PlatformSettings');

/**
 * Middleware to check if platform is in maintenance mode.
 *
 * M13 fix: this was previously only ever called as a route handler for
 * GET /settings/maintenance (letting the frontend poll the flag), never
 * actually mounted as middleware anywhere - toggling maintenance mode in the
 * admin UI didn't stop a single write from reaching the database. It's now
 * mounted globally in server.js (see the comment there), so it needs to be
 * genuinely safe to run in front of every route:
 *  - `req.path.includes('/api/settings')` only ever matched the legacy
 *    `/api/settings` prefix, never `/api/v1/settings` (the app double-mounts
 *    every route at both prefixes) - broadened to match either.
 *  - `req.user.role === 'admin'` requires the admin's *active* role to be
 *    'admin' right now; `authorize()` in middleware/auth.js instead lets
 *    anyone who *has* the admin role bypass regardless of their active role,
 *    which this now matches.
 *  - Login and the payment webhook are exempted: an admin locked out of a
 *    stale session must still be able to sign back in to get a bypass token,
 *    and pawaPay's webhook must never be blocked - money already in flight
 *    can't wait for maintenance mode to end.
 */
const ALWAYS_ALLOWED_PATHS = [
  '/settings',
  '/health',
  '/ready',
  '/users/login',
  '/users/refresh-token',
  '/payments/webhook',
];

const checkMaintenanceMode = async (req, res, next) => {
  try {
    if (ALWAYS_ALLOWED_PATHS.some((p) => req.path.includes(p))) {
      return next();
    }

    const settings = await PlatformSettings.getSettings();

    if (settings.maintenanceMode) {
      // Allow admins to bypass maintenance mode, regardless of active role.
      if (req.user?.roles?.includes('admin')) {
        return next();
      }

      return res.status(503).json({
        message: 'Platform is currently under maintenance. Please try again later.',
        maintenanceMode: true,
        platformName: settings.platformName,
      });
    }

    next();
  } catch (_error) {
    // If settings can't be loaded, allow request to proceed
    next();
  }
};

/**
 * Middleware to check if new registrations are allowed
 */
const checkRegistrationAllowed = async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();

    if (!settings.allowNewRegistrations) {
      return res.status(403).json({
        message: 'New registrations are currently disabled. Please try again later.',
        registrationDisabled: true,
      });
    }

    // Attach settings to request for use in controller
    req.platformSettings = settings;
    next();
  } catch (_error) {
    // If settings can't be loaded, allow registration
    next();
  }
};

/**
 * Middleware to check if reviews are enabled
 */
const checkReviewsEnabled = async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();

    if (!settings.enableReviews) {
      return res.status(403).json({
        message: 'Reviews are currently disabled.',
        reviewsDisabled: true,
      });
    }

    next();
  } catch (_error) {
    next();
  }
};

/**
 * Middleware to check if guest checkout is allowed
 */
const checkGuestCheckout = async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();

    // If user is authenticated, allow
    if (req.user) {
      req.platformSettings = settings;
      return next();
    }

    // If guest checkout is not allowed and user is not authenticated
    if (!settings.allowGuestCheckout) {
      return res.status(401).json({
        message: 'Please login to place an order. Guest checkout is not available.',
        guestCheckoutDisabled: true,
      });
    }

    req.platformSettings = settings;
    next();
  } catch (_error) {
    next();
  }
};

/**
 * Attach platform settings to request
 */
const attachPlatformSettings = async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();
    req.platformSettings = settings;
    next();
  } catch (_error) {
    next();
  }
};

/**
 * Get platform fee percent for order calculations
 */
const getPlatformFee = async () => {
  try {
    const settings = await PlatformSettings.getSettings();
    return settings.platformFeePercent;
  } catch (_error) {
    return 10; // Default 10%
  }
};

/**
 * Get payout settings
 */
const getPayoutSettings = async () => {
  try {
    const settings = await PlatformSettings.getSettings();
    return {
      minimumWithdrawal: settings.minimumWithdrawal,
      payoutHoldDays: settings.payoutHoldDays,
      payoutIntervalDays: settings.payoutIntervalDays,
    };
  } catch (_error) {
    return {
      minimumWithdrawal: 5000,
      payoutHoldDays: 7,
      payoutIntervalDays: 7,
    };
  }
};

module.exports = {
  checkMaintenanceMode,
  checkRegistrationAllowed,
  checkReviewsEnabled,
  checkGuestCheckout,
  attachPlatformSettings,
  getPlatformFee,
  getPayoutSettings,
};
