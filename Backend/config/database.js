/**
 * MongoDB Database Configuration
 * Handles connection pooling, retry logic, and graceful shutdown
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Connection state tracking
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * MongoDB connection options optimized for high traffic
 */
const getConnectionOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Connection Pool Settings
    maxPoolSize: isProduction ? 100 : 10, // Max concurrent connections
    minPoolSize: isProduction ? 10 : 2, // Min connections to maintain

    // Timeouts
    serverSelectionTimeoutMS: 10000, // Timeout for server selection
    socketTimeoutMS: 45000, // Socket timeout
    connectTimeoutMS: 30000, // Initial connection timeout

    // Write/Read Settings
    retryWrites: true, // Retry failed writes
    retryReads: true, // Retry failed reads

    // Heartbeat Settings
    heartbeatFrequencyMS: 10000, // How often to check server health

    // Buffer Settings
    maxIdleTimeMS: 30000, // Close idle connections after 30s

    // Auto Index (disable in production for performance)
    autoIndex: !isProduction,
  };
};

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  const options = getConnectionOptions();

  logger.info(
    {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      env: process.env.NODE_ENV || 'development',
    },
    'Initializing MongoDB connection'
  );

  try {
    await mongoose.connect(mongoUri, options);
    isConnected = true;
    connectionRetries = 0;
    logger.info('Connected to MongoDB successfully');

    // Set up connection event listeners
    setupConnectionListeners();

    return mongoose.connection;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    await handleConnectionError(error);
  }
};

/**
 * Handle connection errors with retry logic
 */
const handleConnectionError = async (error) => {
  connectionRetries++;

  if (connectionRetries <= MAX_RETRIES) {
    logger.warn(
      {
        attempt: connectionRetries,
        maxRetries: MAX_RETRIES,
        retryInMs: RETRY_DELAY_MS,
      },
      `Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`
    );

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB();
  } else {
    logger.error(
      {
        attempts: connectionRetries,
        error: error.message,
      },
      'Max MongoDB connection retries exceeded. Exiting.'
    );
    process.exit(1);
  }
};

/**
 * Set up MongoDB connection event listeners
 */
const setupConnectionListeners = () => {
  const db = mongoose.connection;

  db.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connection established');
  });

  db.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  db.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
    isConnected = false;
  });

  db.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected successfully');
  });

  // Monitor connection pool events
  db.on('open', () => {
    logger.info('MongoDB connection pool opened');
  });
};

/**
 * Gracefully close the database connection
 */
const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed');
  }
};

/**
 * Get current connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    isConnected,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    retries: connectionRetries,
  };
};

/**
 * Get connection pool statistics
 */
const getPoolStats = async () => {
  if (!isConnected || !mongoose.connection.db) {
    return null;
  }

  try {
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();

    return {
      current: serverStatus.connections?.current || 0,
      available: serverStatus.connections?.available || 0,
      totalCreated: serverStatus.connections?.totalCreated || 0,
      active: serverStatus.connections?.active || 0,
    };
  } catch (error) {
    logger.debug({ err: error }, 'Could not get pool stats');
    return null;
  }
};

/**
 * Health check for database
 */
const healthCheck = async () => {
  const startTime = Date.now();

  try {
    if (!isConnected || mongoose.connection.readyState !== 1) {
      return {
        healthy: false,
        status: 'disconnected',
        latencyMs: null,
        error: 'Database not connected',
      };
    }

    // Ping the database
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - startTime;

    return {
      healthy: true,
      status: 'connected',
      latencyMs,
      poolStats: await getPoolStats(),
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }
};

// M12 fix: this used to register its own SIGTERM/SIGINT/uncaughtException/
// unhandledRejection handlers (calling process.exit() as soon as MongoDB
// closed), completely independent of server.js's own SIGTERM/SIGINT handlers
// (which stopped the background jobs and closed Redis). Node calls every
// listener for a signal, so on shutdown BOTH fired - and whichever's
// process.exit() ran first could tear the process down before the other had
// finished closing Redis or draining in-flight HTTP/Socket.IO connections.
// There is now exactly one shutdown sequence, owned by server.js, which calls
// closeDB() (and everything else) in order; this module just exposes it.

module.exports = {
  connectDB,
  closeDB,
  getConnectionStatus,
  getPoolStats,
  healthCheck,
  getConnectionOptions,
};
