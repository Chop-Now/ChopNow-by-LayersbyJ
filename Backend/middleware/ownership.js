const Business = require('../models/Business');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const logger = require('../utils/logger');

/**
 * Ownership check middleware factory
 * Ensures the authenticated user owns the resource they're trying to access/modify
 * Admins bypass ownership checks
 *
 * @param {string} model - The model name ('Business', 'Order', 'Listing')
 * @param {string} ownerField - The field name that references the owner (default: 'owner')
 * @param {string} paramName - The route param name for the resource ID (default: 'id')
 */
const checkOwnership = (model, ownerField = 'owner', paramName = 'id') => {
  const models = {
    Business,
    Order,
    Listing,
  };

  return async (req, res, next) => {
    try {
      // Admins bypass ownership checks
      if (req.user.roles && req.user.roles.includes('admin')) {
        return next();
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID is required' });
      }

      const Model = models[model];
      if (!Model) {
        logger.error({ model }, 'Invalid model in ownership check');
        return res.status(500).json({ message: 'Internal server error' });
      }

      const resource = await Model.findById(resourceId).select(ownerField).lean();
      if (!resource) {
        return res.status(404).json({ message: `${model} not found` });
      }

      const ownerId = resource[ownerField]?.toString();
      const userId = req.user._id.toString();

      // For orders, also check if user is the customer
      if (model === 'Order') {
        const isCustomer = resource.customer?.toString() === userId;
        const isBusinessOwner = resource.business
          ? await checkBusinessOwnership(resource.business, userId)
          : false;
        if (!isCustomer && !isBusinessOwner) {
          return res.status(403).json({ message: 'Not authorized to access this resource' });
        }
        return next();
      }

      if (ownerId !== userId) {
        return res.status(403).json({ message: 'Not authorized to access this resource' });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Ownership check error');
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

/**
 * Check if a user owns the business
 */
const checkBusinessOwnership = async (businessId, userId) => {
  const business = await Business.findById(businessId).select('owner').lean();
  return business && business.owner.toString() === userId;
};

/**
 * Check business ownership for listing operations
 * Listings belong to a business, so we check the business owner
 */
const checkListingOwnership = () => {
  return async (req, res, next) => {
    try {
      // Admins bypass
      if (req.user.roles && req.user.roles.includes('admin')) {
        return next();
      }

      const listingId = req.params.id;
      if (!listingId) {
        return res.status(400).json({ message: 'Listing ID is required' });
      }

      const listing = await Listing.findById(listingId).select('business').lean();
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }

      const isOwner = await checkBusinessOwnership(listing.business, req.user._id.toString());
      if (!isOwner) {
        return res.status(403).json({ message: 'Not authorized to access this listing' });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Listing ownership check error');
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = { checkOwnership, checkListingOwnership };
