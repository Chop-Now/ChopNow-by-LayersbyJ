/**
 * Listing Expiry Job
 * Runs every 5 minutes. Marks listings as 'expired' once their availableUntil
 * time has passed. Also sends vendor notifications for upcoming expirations.
 *
 * Intentionally uses setInterval (no external cron dependency).
 */

const Listing = require('../models/Listing');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Track which listing IDs have already received a "30-min warning" in this
// server session, to avoid duplicate notifications on repeated job runs.
const notifiedExpirySoon = new Set();

// Track notified buyer-listing pairs: "listingId_userId"
const notifiedBuyersExpirySoon = new Set();

/**
 * Mark all listings whose availableUntil has passed as 'expired'.
 * Notifies the owning vendor for each newly expired listing.
 */
const expireListings = async () => {
  try {
    const now = new Date();

    const expiring = await Listing.find({
      status: 'active',
      'timeWindow.availableUntil': { $lt: now },
    })
      .populate({ path: 'business', select: 'name owner' })
      .lean();

    if (expiring.length === 0) return;

    const ids = expiring.map((l) => l._id);
    await Listing.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });

    // Notify vendor for each expired listing (fire-and-forget, non-critical)
    for (const listing of expiring) {
      if (!listing.business?.owner) continue;
      Notification.createNotification({
        user: listing.business.owner,
        title: 'Listing Expired',
        message: `"${listing.title}" has passed its availability window. Mark it active again or remove it from your dashboard.`,
        type: 'system',
        relatedListing: listing._id,
        relatedBusiness: listing.business._id,
        link: '/dashboard',
        metadata: {
          listingTitle: listing.title,
          listingImage: listing.images?.[0] ?? null,
          businessName: listing.business.name,
          quantityUnsold: listing.inventory?.quantity ?? 0,
        },
      }).catch((err) => logger.warn({ err }, 'Failed to send listing-expired notification'));
    }

    logger.info({ count: expiring.length }, 'Listings marked as expired');
  } catch (err) {
    logger.error({ err }, 'listingExpiryJob: expireListings failed');
  }
};

/**
 * Notify vendors when one of their listings is expiring within the next 30 min
 * and still has unsold quantity. Fires once per listing per server session.
 */
const notifyUpcomingExpiry = async () => {
  try {
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

    const soonExpiring = await Listing.find({
      status: 'active',
      'timeWindow.availableUntil': { $gte: now, $lte: in30Min },
      'inventory.quantity': { $gt: 0 },
    })
      .populate({ path: 'business', select: 'name owner' })
      .lean();

    for (const listing of soonExpiring) {
      const key = listing._id.toString();
      if (notifiedExpirySoon.has(key)) continue; // already sent this session
      if (!listing.business?.owner) continue;

      const minutesLeft = Math.max(
        1,
        Math.round((new Date(listing.timeWindow.availableUntil) - now) / 60_000)
      );

      Notification.createNotification({
        user: listing.business.owner,
        title: 'Listing Expiring Soon ⏰',
        message: `"${listing.title}" expires in ~${minutesLeft} min with ${listing.inventory.quantity} item(s) unsold. Consider extending the window or reducing the price.`,
        type: 'system',
        relatedListing: listing._id,
        relatedBusiness: listing.business._id,
        link: '/dashboard',
        metadata: {
          listingTitle: listing.title,
          listingImage: listing.images?.[0] ?? null,
          minutesLeft,
          quantityLeft: listing.inventory.quantity,
          businessName: listing.business.name,
        },
      }).catch((err) => logger.warn({ err }, 'Failed to send listing-expiring-soon notification'));

      notifiedExpirySoon.add(key);
    }
  } catch (err) {
    logger.error({ err }, 'listingExpiryJob: notifyUpcomingExpiry failed');
  }
};

/**
 * Notify nearby buyers (within 5km) when a listing is expiring within the next 1 hour
 * and has unsold quantity. Fires once per listing-buyer pair.
 */
const notifyBuyersUpcomingExpiry = async () => {
  try {
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    const soonExpiring = await Listing.find({
      status: 'active',
      'timeWindow.availableUntil': { $gte: now, $lte: in1Hour },
      'inventory.quantity': { $gt: 0 },
    })
      .populate('business')
      .lean();

    const User = require('../models/User');

    for (const listing of soonExpiring) {
      if (
        !listing.business ||
        !listing.business.location ||
        !listing.business.location.coordinates
      ) {
        continue;
      }

      const coords = listing.business.location.coordinates;

      // Find active users with registered FCM tokens within 5km
      const nearbyUsers = await User.find({
        status: 'active',
        'addresses.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coords,
            },
            $maxDistance: 5000, // 5 kilometers in meters
          },
        },
        fcmTokens: { $exists: true, $not: { $size: 0 } },
      })
        .select('_id fcmTokens preferences')
        .lean();

      for (const user of nearbyUsers) {
        const key = `${listing._id}_${user._id}`;
        if (notifiedBuyersExpirySoon.has(key)) continue;

        // Skip if they explicitly disabled push alerts
        const pushEnabled = user.preferences?.notifications?.push !== false;
        if (!pushEnabled) continue;

        const minutesLeft = Math.max(
          1,
          Math.round((new Date(listing.timeWindow.availableUntil) - now) / 60_000)
        );

        // Notify buyer
        Notification.createNotification({
          user: user._id,
          title: 'Deal Expiring Soon! ⏰',
          message: `"${listing.title}" from "${listing.business.name}" is expiring in ${minutesLeft} minutes! Save it now before it's gone.`,
          type: 'new_listing_nearby',
          relatedListing: listing._id,
          relatedBusiness: listing.business._id,
          link: `/shop/${listing.category}/${listing._id}`,
        }).catch((err) =>
          logger.warn({ err }, 'Failed to send buyer upcoming expiry notification')
        );

        notifiedBuyersExpirySoon.add(key);
      }
    }
  } catch (err) {
    logger.error({ err }, 'listingExpiryJob: notifyBuyersUpcomingExpiry failed');
  }
};

let jobTimers = [];

/**
 * Start the background expiry job.
 * Call once after the database connection is ready.
 */
const startExpiryJob = () => {
  const FIVE_MIN = 5 * 60 * 1000;
  const THIRTY_MIN = 30 * 60 * 1000;

  // Run immediately so we catch any already-expired listings on startup
  expireListings();
  notifyUpcomingExpiry();
  notifyBuyersUpcomingExpiry();

  jobTimers = [
    setInterval(expireListings, FIVE_MIN),
    setInterval(notifyUpcomingExpiry, THIRTY_MIN),
    setInterval(notifyBuyersUpcomingExpiry, FIVE_MIN),
  ];

  logger.info('Listing expiry job started — runs every 5 min');
};

/**
 * Stop the recurring timers (used during graceful shutdown, so the process
 * doesn't start new expiry work while it's already on its way out).
 */
const stopExpiryJob = () => {
  jobTimers.forEach(clearInterval);
  jobTimers = [];
};

module.exports = {
  startExpiryJob,
  stopExpiryJob,
  expireListings,
  notifyUpcomingExpiry,
  notifyBuyersUpcomingExpiry,
};
