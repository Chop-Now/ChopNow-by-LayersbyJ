/**
 * Caching Middleware
 * Provides response caching for frequently accessed endpoints
 */

const cache = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {string} options.keyGenerator - Function to generate cache key from request
 * @param {number} options.ttl - Time to live in seconds
 * @param {boolean} options.condition - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    keyGenerator = (req) => req.originalUrl,
    ttl = cache.TTL.MEDIUM,
    condition = () => true,
  } = options;

  return async (req, res, next) => {
    // Skip caching if Redis is not available or method is not GET
    if (!cache.isAvailable() || req.method !== 'GET') {
      return next();
    }

    const cacheKey = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;

    try {
      // Try to get cached response
      const cached = await cache.get(cacheKey);

      if (cached) {
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (condition(req, body)) {
            cache.set(cacheKey, body, ttl).catch((err) => {
              logger.error({ err, cacheKey }, 'Failed to cache response');
            });
          }
        }

        // Add cache miss header
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ err: error }, 'Cache middleware error');
      next();
    }
  };
};

/**
 * Cache listings endpoint
 */
const cacheListings = cacheMiddleware({
  keyGenerator: (req) => {
    const params = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
    };
    return cache.keys.listingList(params);
  },
  ttl: cache.TTL.SHORT,
});

/**
 * Cache single listing
 */
const cacheListing = cacheMiddleware({
  keyGenerator: (req) => cache.keys.listing(req.params.id),
  ttl: cache.TTL.MEDIUM,
});

/**
 * Cache businesses endpoint
 */
const cacheBusinesses = cacheMiddleware({
  keyGenerator: (req) => {
    const params = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      type: req.query.type,
      status: req.query.status,
    };
    return cache.keys.businessList(params);
  },
  ttl: cache.TTL.MEDIUM,
});

/**
 * Cache single business
 */
const cacheBusiness = cacheMiddleware({
  keyGenerator: (req) => cache.keys.business(req.params.id),
  ttl: cache.TTL.MEDIUM,
});

/**
 * Cache popular listings
 */
const cachePopularListings = cacheMiddleware({
  keyGenerator: () => cache.keys.popularListings(),
  ttl: cache.TTL.MEDIUM,
});

/**
 * Cache category listings
 */
const cacheCategoryListings = cacheMiddleware({
  keyGenerator: (req) => cache.keys.categoryListings(req.params.category),
  ttl: cache.TTL.SHORT,
});

/**
 * Invalidate cache after mutation
 * @param {string} type - Type of resource ('listing', 'business', 'user')
 * @param {Function} getIdFn - Function to get resource ID from request
 */
const invalidateAfter = (type, getIdFn = (req) => req.params.id) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Invalidate cache after successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const id = getIdFn(req, body);

        try {
          switch (type) {
            case 'listing':
              await cache.invalidate.listing(id);
              break;
            case 'business':
              await cache.invalidate.business(id);
              break;
            case 'user':
              await cache.invalidate.user(id);
              break;
            case 'cart':
              await cache.invalidate.cart(req.user?.id);
              break;
            default:
              break;
          }
        } catch (error) {
          logger.error({ err: error, type, id }, 'Cache invalidation error');
        }
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  cacheListings,
  cacheListing,
  cacheBusinesses,
  cacheBusiness,
  cachePopularListings,
  cacheCategoryListings,
  invalidateAfter,
};
