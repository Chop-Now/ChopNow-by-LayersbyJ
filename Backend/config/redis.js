/**
 * Redis Cache Configuration
 * Provides optional caching layer with graceful fallback when Redis is unavailable
 */

const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

// Default TTL values (in seconds)
const TTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for moderately changing data
  LONG: 3600, // 1 hour - for rarely changing data
  VERY_LONG: 86400, // 24 hours - for static data
};

/**
 * Initialize Redis connection
 * @returns {Promise<boolean>} Connection success status
 */
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('REDIS_URL not configured - caching disabled');
    return false;
  }

  try {
    // Dynamic import of ioredis to make it optional
    const Redis = require('ioredis');

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 10000,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis client connected and ready');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.info('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    // Attempt connection
    await redisClient.connect();
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to connect to Redis - caching disabled');
    redisClient = null;
    isConnected = false;
    return false;
  }
};

/**
 * Check if Redis is available
 * @returns {boolean}
 */
const isAvailable = () => {
  return isConnected && redisClient !== null;
};

/**
 * The underlying ioredis client, for callers that need their own dedicated
 * connections off the same Redis instance (e.g. the Socket.IO adapter's
 * pub/sub clients, via `getClient().duplicate()`). Returns null when Redis
 * isn't configured/connected - callers must handle that.
 * @returns {import('ioredis').Redis | null}
 */
const getClient = () => redisClient;

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
const get = async (key) => {
  if (!isAvailable()) return null;

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error({ err: error, key }, 'Redis GET error');
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: MEDIUM)
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttl = TTL.MEDIUM) => {
  if (!isAvailable()) return false;

  try {
    const serialized = JSON.stringify(value);
    await redisClient.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    logger.error({ err: error, key }, 'Redis SET error');
    return false;
  }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  if (!isAvailable()) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error({ err: error, key }, 'Redis DEL error');
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'listings:*')
 * @returns {Promise<number>} Number of keys deleted
 */
const delByPattern = async (pattern) => {
  if (!isAvailable()) return 0;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    const deleted = await redisClient.del(...keys);
    return deleted;
  } catch (error) {
    logger.error({ err: error, pattern }, 'Redis DEL pattern error');
    return 0;
  }
};

/**
 * Increment a counter
 * @param {string} key - Counter key
 * @param {number} ttl - TTL for the counter (default: 1 hour)
 * @returns {Promise<number|null>} New counter value
 */
const incr = async (key, ttl = TTL.LONG) => {
  if (!isAvailable()) return null;

  try {
    const value = await redisClient.incr(key);
    // Set TTL if this is a new key
    if (value === 1) {
      await redisClient.expire(key, ttl);
    }
    return value;
  } catch (error) {
    logger.error({ err: error, key }, 'Redis INCR error');
    return null;
  }
};

/**
 * Get or set cache value (cache-aside pattern)
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fetched value
 */
const getOrSet = async (key, fetchFn, ttl = TTL.MEDIUM) => {
  // Try to get from cache first
  const cached = await get(key);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result (don't wait for it)
  set(key, data, ttl).catch(() => {});

  return { data, fromCache: false };
};

/**
 * Cache key generators for consistent key formatting
 */
const keys = {
  listing: (id) => `listing:${id}`,
  listingList: (query) => `listings:${JSON.stringify(query)}`,
  business: (id) => `business:${id}`,
  businessList: (query) => `businesses:${JSON.stringify(query)}`,
  user: (id) => `user:${id}`,
  cart: (userId) => `cart:${userId}`,
  notifications: (userId, page) => `notifications:${userId}:${page}`,
  unreadCount: (userId) => `unread:${userId}`,
  categoryListings: (category) => `category:${category}`,
  nearbyBusinesses: (lat, lng, radius) => `nearby:${lat}:${lng}:${radius}`,
  popularListings: () => 'popular:listings',
  stats: (type) => `stats:${type}`,
};

/**
 * Cache invalidation helpers
 */
const invalidate = {
  listing: async (id) => {
    await del(keys.listing(id));
    await delByPattern('listings:*');
    await delByPattern('category:*');
    await del(keys.popularListings());
  },

  business: async (id) => {
    await del(keys.business(id));
    await delByPattern('businesses:*');
    await delByPattern('nearby:*');
  },

  user: async (id) => {
    await del(keys.user(id));
    await del(keys.cart(id));
    await delByPattern(`notifications:${id}:*`);
    await del(keys.unreadCount(id));
  },

  cart: async (userId) => {
    await del(keys.cart(userId));
  },

  all: async () => {
    if (!isAvailable()) return;
    await redisClient.flushdb();
    logger.info('Redis cache flushed');
  },
};

/**
 * Get Redis client stats
 * @returns {Promise<Object>} Redis stats
 */
const getStats = async () => {
  if (!isAvailable()) {
    return { available: false, message: 'Redis not connected' };
  }

  try {
    const info = await redisClient.info('memory');
    const dbSize = await redisClient.dbsize();

    // Parse memory info
    const usedMemory = info.match(/used_memory:(\d+)/)?.[1] || 0;
    const usedMemoryHuman = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'N/A';

    return {
      available: true,
      connected: isConnected,
      dbSize,
      usedMemory: parseInt(usedMemory),
      usedMemoryHuman,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get Redis stats');
    return { available: true, connected: isConnected, error: error.message };
  }
};

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
const close = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis connection closed');
  }
};

module.exports = {
  initRedis,
  isAvailable,
  getClient,
  get,
  set,
  del,
  delByPattern,
  incr,
  getOrSet,
  keys,
  invalidate,
  getStats,
  close,
  TTL,
};
