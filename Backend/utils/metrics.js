/**
 * Database and Application Metrics Collection
 * Provides metrics for monitoring database performance and application health
 */

const mongoose = require('mongoose');
const logger = require('./logger');

// In-memory metrics storage (for simple deployments)
// In production, consider using Prometheus, StatsD, or similar
const metrics = {
  queries: {
    total: 0,
    slow: 0,
    errors: 0,
  },
  connections: {
    opened: 0,
    closed: 0,
    current: 0,
    peak: 0,
  },
  cache: {
    hits: 0,
    misses: 0,
    errors: 0,
  },
  http: {
    requests: 0,
    errors: 0,
    latency: [],
  },
  startTime: Date.now(),
};

// Latency histogram buckets (in ms)
const LATENCY_BUCKETS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const latencyHistogram = LATENCY_BUCKETS.reduce((acc, bucket) => {
  acc[bucket] = 0;
  return acc;
}, {});

/**
 * Record a query metric
 * @param {number} duration - Query duration in ms
 * @param {boolean} isError - Whether the query resulted in an error
 */
const recordQuery = (duration, isError = false) => {
  metrics.queries.total++;

  if (isError) {
    metrics.queries.errors++;
  }

  // Consider queries over 100ms as slow
  if (duration > 100) {
    metrics.queries.slow++;
  }
};

/**
 * Record cache hit/miss
 * @param {boolean} hit - Whether it was a cache hit
 */
const recordCacheAccess = (hit) => {
  if (hit) {
    metrics.cache.hits++;
  } else {
    metrics.cache.misses++;
  }
};

/**
 * Record cache error
 */
const recordCacheError = () => {
  metrics.cache.errors++;
};

/**
 * Record HTTP request
 * @param {number} duration - Request duration in ms
 * @param {boolean} isError - Whether the request resulted in an error
 */
const recordHttpRequest = (duration, isError = false) => {
  metrics.http.requests++;

  if (isError) {
    metrics.http.errors++;
  }

  // Update latency histogram
  for (const bucket of LATENCY_BUCKETS) {
    if (duration <= bucket) {
      latencyHistogram[bucket]++;
      break;
    }
  }

  // Keep rolling average of last 1000 requests for p50/p95/p99 calculation
  metrics.http.latency.push(duration);
  if (metrics.http.latency.length > 1000) {
    metrics.http.latency.shift();
  }
};

/**
 * Record connection event
 * @param {string} event - 'open' or 'close'
 */
const recordConnection = (event) => {
  if (event === 'open') {
    metrics.connections.opened++;
    metrics.connections.current++;
    if (metrics.connections.current > metrics.connections.peak) {
      metrics.connections.peak = metrics.connections.current;
    }
  } else if (event === 'close') {
    metrics.connections.closed++;
    metrics.connections.current = Math.max(0, metrics.connections.current - 1);
  }
};

/**
 * Calculate percentile from array of values
 * @param {number[]} arr - Array of values
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
const percentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

/**
 * Get current metrics snapshot
 * @returns {Object} Metrics snapshot
 */
const getMetrics = () => {
  const uptime = Date.now() - metrics.startTime;
  const uptimeSeconds = Math.floor(uptime / 1000);

  // Calculate latency percentiles
  const latencyStats = {
    p50: percentile(metrics.http.latency, 50),
    p95: percentile(metrics.http.latency, 95),
    p99: percentile(metrics.http.latency, 99),
    avg:
      metrics.http.latency.length > 0
        ? Math.round(metrics.http.latency.reduce((a, b) => a + b, 0) / metrics.http.latency.length)
        : 0,
  };

  // Calculate cache hit rate
  const cacheTotal = metrics.cache.hits + metrics.cache.misses;
  const cacheHitRate = cacheTotal > 0 ? Math.round((metrics.cache.hits / cacheTotal) * 100) : 0;

  // Calculate error rate
  const errorRate =
    metrics.http.requests > 0
      ? Math.round((metrics.http.errors / metrics.http.requests) * 100 * 100) / 100
      : 0;

  return {
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
    queries: {
      total: metrics.queries.total,
      slow: metrics.queries.slow,
      errors: metrics.queries.errors,
      slowPercent:
        metrics.queries.total > 0
          ? Math.round((metrics.queries.slow / metrics.queries.total) * 100 * 100) / 100
          : 0,
    },
    connections: {
      current: metrics.connections.current,
      peak: metrics.connections.peak,
      totalOpened: metrics.connections.opened,
      totalClosed: metrics.connections.closed,
    },
    cache: {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      errors: metrics.cache.errors,
      hitRate: cacheHitRate,
    },
    http: {
      totalRequests: metrics.http.requests,
      errors: metrics.http.errors,
      errorRate,
      latency: latencyStats,
      histogram: { ...latencyHistogram },
    },
    memory: getMemoryUsage(),
    timestamp: new Date().toISOString(),
  };
};

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Human-readable uptime
 */
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Get memory usage statistics
 * @returns {Object} Memory usage stats
 */
const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    heapUsed: formatBytes(usage.heapUsed),
    heapTotal: formatBytes(usage.heapTotal),
    rss: formatBytes(usage.rss),
    external: formatBytes(usage.external),
    raw: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
    },
  };
};

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes
 * @returns {string} Human-readable size
 */
const formatBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Get MongoDB-specific metrics
 * @returns {Promise<Object>} MongoDB metrics
 */
const getMongoMetrics = async () => {
  if (mongoose.connection.readyState !== 1) {
    return { available: false, message: 'Database not connected' };
  }

  try {
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();

    return {
      available: true,
      version: serverStatus.version,
      uptime: serverStatus.uptime,
      connections: {
        current: serverStatus.connections?.current || 0,
        available: serverStatus.connections?.available || 0,
        totalCreated: serverStatus.connections?.totalCreated || 0,
      },
      opcounters: {
        insert: serverStatus.opcounters?.insert || 0,
        query: serverStatus.opcounters?.query || 0,
        update: serverStatus.opcounters?.update || 0,
        delete: serverStatus.opcounters?.delete || 0,
        getmore: serverStatus.opcounters?.getmore || 0,
        command: serverStatus.opcounters?.command || 0,
      },
      network: {
        bytesIn: formatBytes(serverStatus.network?.bytesIn || 0),
        bytesOut: formatBytes(serverStatus.network?.bytesOut || 0),
        numRequests: serverStatus.network?.numRequests || 0,
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get MongoDB metrics');
    return { available: false, error: error.message };
  }
};

/**
 * Reset metrics (useful for testing)
 */
const resetMetrics = () => {
  metrics.queries = { total: 0, slow: 0, errors: 0 };
  metrics.connections = { opened: 0, closed: 0, current: 0, peak: 0 };
  metrics.cache = { hits: 0, misses: 0, errors: 0 };
  metrics.http = { requests: 0, errors: 0, latency: [] };
  metrics.startTime = Date.now();

  // Reset histogram
  Object.keys(latencyHistogram).forEach((key) => {
    latencyHistogram[key] = 0;
  });
};

/**
 * Metrics collection middleware for Express
 * @returns {Function} Express middleware
 */
const metricsMiddleware = () => {
  return (req, res, next) => {
    const start = Date.now();

    // Hook into response finish event
    res.on('finish', () => {
      const duration = Date.now() - start;
      const isError = res.statusCode >= 400;
      recordHttpRequest(duration, isError);
    });

    next();
  };
};

module.exports = {
  recordQuery,
  recordCacheAccess,
  recordCacheError,
  recordHttpRequest,
  recordConnection,
  getMetrics,
  getMongoMetrics,
  getMemoryUsage,
  resetMetrics,
  metricsMiddleware,
};
