require('dotenv').config();
// Require instrumentation early (Sentry no-op unless configured)
const Sentry = require('./instrument');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { createServer } = require('http');
const socketManager = require('./socket');

// Import routes
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const userRoutes = require('./routes/userRoutes');
const businessRoutes = require('./routes/businessRoutes');
const listingRoutes = require('./routes/listingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const cartRoutes = require('./routes/cartRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const riderRoutes = require('./routes/riderRoutes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const sanitizeInput = require('./middleware/sanitizeInput');
const { optionalAuth } = require('./middleware/auth');
const { checkMaintenanceMode } = require('./middleware/platformSettings');
const logger = require('./utils/logger');
const metrics = require('./utils/metrics');

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (Render/Heroku reverse proxy)

// --- Environment validation ---
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(
  (key) => !process.env[key] || String(process.env[key]).trim() === ''
);
if (missingEnv.length) {
  logger.error(
    `Missing required environment variables: ${missingEnv.join(', ')}. See .env.example.`
  );
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  if (!process.env.ALLOWED_ORIGINS || String(process.env.ALLOWED_ORIGINS).trim() === '') {
    logger.error('Production requires ALLOWED_ORIGINS to be set (e.g. https://app.chopnow.com).');
    process.exit(1);
  }
  const unsafeSecrets = [
    'changeme',
    'yourjwtsecret',
    'yoursecurerandom',
    'example',
    'test',
    'secret',
    'password',
  ];
  const jwt = String(process.env.JWT_SECRET);
  // Strip separators before matching, so "change_me_..." / "change-me-..."
  // (e.g. docker-compose.yml's own placeholder) are still caught - a plain
  // substring check against 'changeme' misses those.
  const jwtNormalized = jwt.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (jwt.length < 32 || unsafeSecrets.some((s) => jwtNormalized.includes(s))) {
    logger.error(
      'Production requires a strong JWT_SECRET (at least 32 characters, no placeholders).'
    );
    process.exit(1);
  }
  // M6: PAWAPAY_ENVIRONMENT being left unset/misspelled previously fell back
  // to sandbox-permissive behavior everywhere it was checked (payment
  // webhook signature verification, test-mode payment simulation) without
  // the server failing to start - the exact silent-fail-open this catches
  // at boot instead. PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS is a sandbox-only
  // escape hatch (utils/pawapaySignatures.js) and must never be live here.
  if (process.env.PAWAPAY_ENVIRONMENT !== 'production') {
    logger.error(
      `Production requires PAWAPAY_ENVIRONMENT=production (got: ${JSON.stringify(process.env.PAWAPAY_ENVIRONMENT)}).`
    );
    process.exit(1);
  }
  if (process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS === 'true') {
    logger.error('Production must not set PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS=true.');
    process.exit(1);
  }
}

const mongoUri = process.env.MONGO_URI;
if (!mongoUri.startsWith('mongodb')) {
  logger.error(
    'MONGO_URI must be a valid MongoDB connection string (e.g. mongodb://... or mongodb+srv://...).'
  );
  process.exit(1);
}

// --- Optional integrations validation (warn or fail fast where appropriate) ---
const cloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const cloudinaryProvided = cloudinaryKeys.filter(
  (k) => process.env[k] && String(process.env[k]).trim() !== ''
);
if (cloudinaryProvided.length > 0 && cloudinaryProvided.length < cloudinaryKeys.length) {
  logger.warn(
    `Cloudinary is partially configured. Set all of: ${cloudinaryKeys.join(', ')} to enable uploads.`
  );
  if (isProduction) process.exit(1);
}

const sendgridKey =
  process.env.SENDGRID_API_KEY && String(process.env.SENDGRID_API_KEY).trim() !== '';
const fromEmail = process.env.FROM_EMAIL && String(process.env.FROM_EMAIL).trim() !== '';
const frontendUrl = process.env.FRONTEND_URL && String(process.env.FRONTEND_URL).trim() !== '';
if (sendgridKey && (!fromEmail || !frontendUrl)) {
  logger.warn(
    'SendGrid is partially configured. Set SENDGRID_API_KEY, FROM_EMAIL, and FRONTEND_URL to enable email flows.'
  );
  if (isProduction) process.exit(1);
}
if (!sendgridKey) {
  logger.warn(
    'SENDGRID_API_KEY not set: email verification / password reset / OTP emails will be disabled.'
  );
}
if (frontendUrl && !/^https?:\/\//i.test(String(process.env.FRONTEND_URL))) {
  logger.warn('FRONTEND_URL should include scheme, e.g. https://www.chopnow.app');
}

// --- CORS Origins ---
const allowedOriginsEnv =
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://localhost:3000';
const allowedOrigins = allowedOriginsEnv.split(',').map((o) => o.trim());

// --- Security & core middleware ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://res.cloudinary.com',
          'https://*.tile.openstreetmap.org',
        ],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Compression (gzip) — reduces response sizes for text/JSON payloads
app.use(compression());

// Request correlation id + structured request logging
app.use(requestId);
app.use(metrics.metricsMiddleware()); // Collect request metrics
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customProps: (req) => ({ reqId: req.id }),
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = not a browser cross-origin request: the Flutter
      // app, pawaPay's payment callbacks, Render health checks. CORS only
      // governs browsers, so rejecting these adds no security - it took the
      // whole mobile app and every payment confirmation down whenever
      // NODE_ENV=production.
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Input sanitization — strips all HTML from string fields in req.body
app.use(sanitizeInput);

// --- Rate limiting ---
// Mobile carriers in Rwanda put many customers behind one shared public IP
// (carrier-grade NAT), so per-IP limits must leave room for a crowd of real
// users - 100 requests / 15 min locked out whole groups of customers (one
// checkout's payment-status polling alone is ~20 requests).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_API_MAX) || 1500,
  message: { message: 'Too many requests, please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
  // pawaPay payment callbacks all come from pawaPay's own few IPs - never
  // throttle them (they're authenticated by signature instead).
  skip: (req) => /\/payments\/webhook$/.test(req.path),
});

// Brute-force protection is per account (IP + email), so one attacker can't
// guess a password, but customers sharing a carrier IP don't lock each other
// out of logging in.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 50,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  message: { message: 'Too many login attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many password reset attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general API limiter
app.use('/api', apiLimiter);

// --- Security well-known ---
app.get('/.well-known/security.txt', (req, res) => {
  res
    .type('text/plain')
    .send(
      `Contact: mailto:security@chopnow.app\n` +
        `Preferred-Languages: en\n` +
        `Canonical: https://api.chopnow.app/.well-known/security.txt\n` +
        `Policy: https://chopnow.app/security-policy\n`
    );
});

// --- Health checks ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (dbReady) {
    res.json({ status: 'ready', database: 'connected' });
  } else {
    res.status(503).json({
      status: 'not ready',
      database: mongoose.STATES[mongoose.connection.readyState] || 'disconnected',
    });
  }
});

// --- Routes ---
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ChopNow API',
    version: '1.0.0',
    endpoints: {
      users: '/api/v1/users',
      businesses: '/api/v1/businesses',
      listings: '/api/v1/listings',
      orders: '/api/v1/orders',
      reviews: '/api/v1/reviews',
      favorites: '/api/v1/favorites',
      notifications: '/api/v1/notifications',
    },
  });
});

// M13 fix: enforce maintenance mode server-side, not just at the frontend's
// discretion. optionalAuth runs first so req.user is populated when a valid
// token is present (without requiring one, or blocking the request if it's
// missing/invalid) - checkMaintenanceMode needs that to let admins bypass.
app.use(optionalAuth);
app.use(checkMaintenanceMode);

// Auth routes with stricter limiter. userRoutes is mounted at BOTH /api/v1/users
// and the backward-compatible /api/users (which the web frontend calls), so
// every limiter must cover both prefixes - previously only /api/v1 was
// limited, leaving the paths real browser traffic uses effectively unlimited.
const USER_ROUTE_PREFIXES = ['/api/v1/users', '/api/users'];
const strictUserRouteLimits = {
  '/login': authLimiter,
  '/register': authLimiter,
  '/forgot-password': passwordResetLimiter,
  '/verify-reset-otp': passwordResetLimiter,
  '/reset-password': passwordResetLimiter,
  '/resend-verification': passwordResetLimiter,
  '/send-otp': otpLimiter,
  '/verify-otp': otpLimiter,
};
for (const prefix of USER_ROUTE_PREFIXES) {
  for (const [path, limiter] of Object.entries(strictUserRouteLimits)) {
    app.use(`${prefix}${path}`, limiter);
  }
}

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// API v1 routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/rider', riderRoutes);

// Backward compatibility: redirect /api/* to /api/v1/*
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rider', riderRoutes);

// Database connection and server start
const { connectDB, closeDB, healthCheck } = require('./config/database');
const redis = require('./config/redis');
const { startExpiryJob, stopExpiryJob } = require('./services/listingExpiryJob');
const {
  startPendingPaymentExpiryJob,
  stopPendingPaymentExpiryJob,
} = require('./services/pendingPaymentExpiryJob');

// Enhanced health check endpoint with database stats
// NOTE: must be registered BEFORE notFound middleware or it will always 404
app.get('/health/db', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (healthErr) {
    logger.error({ err: healthErr }, 'DB health check failed');
    res.status(503).json({ healthy: false, error: 'Health check failed' });
  }
});

// Redis cache health check endpoint
app.get('/health/cache', async (req, res) => {
  try {
    const cacheStats = await redis.getStats();
    const statusCode = cacheStats.available ? 200 : 503;
    res.status(statusCode).json(cacheStats);
  } catch (healthErr) {
    logger.error({ err: healthErr }, 'Cache health check failed');
    res.status(503).json({ available: false, error: 'Cache check failed' });
  }
});

// Combined health check for all services
app.get('/health/all', async (req, res) => {
  try {
    const [dbHealth, cacheStats] = await Promise.all([healthCheck(), redis.getStats()]);
    const allHealthy = dbHealth.healthy;
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: {
        database: dbHealth,
        cache: cacheStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (healthErr) {
    logger.error({ err: healthErr }, 'Combined health check failed');
    res.status(503).json({ status: 'error', error: 'Health check failed' });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    const appMetrics = metrics.getMetrics();
    const mongoMetrics = await metrics.getMongoMetrics();
    res.json({
      application: appMetrics,
      mongodb: mongoMetrics,
    });
  } catch (metricsErr) {
    logger.error({ err: metricsErr }, 'Metrics collection failed');
    res.status(500).json({ error: 'Metrics unavailable' });
  }
});

// Prometheus-compatible metrics endpoint (optional)
app.get('/metrics/prometheus', async (req, res) => {
  try {
    const appMetrics = metrics.getMetrics();
    const lines = [
      '# HELP chopnow_http_requests_total Total HTTP requests',
      '# TYPE chopnow_http_requests_total counter',
      `chopnow_http_requests_total ${appMetrics.http.totalRequests}`,
      '',
      '# HELP chopnow_http_errors_total Total HTTP errors',
      '# TYPE chopnow_http_errors_total counter',
      `chopnow_http_errors_total ${appMetrics.http.errors}`,
      '',
      '# HELP chopnow_http_latency_p50 HTTP latency 50th percentile',
      '# TYPE chopnow_http_latency_p50 gauge',
      `chopnow_http_latency_p50 ${appMetrics.http.latency.p50}`,
      '',
      '# HELP chopnow_http_latency_p95 HTTP latency 95th percentile',
      '# TYPE chopnow_http_latency_p95 gauge',
      `chopnow_http_latency_p95 ${appMetrics.http.latency.p95}`,
      '',
      '# HELP chopnow_http_latency_p99 HTTP latency 99th percentile',
      '# TYPE chopnow_http_latency_p99 gauge',
      `chopnow_http_latency_p99 ${appMetrics.http.latency.p99}`,
      '',
      '# HELP chopnow_cache_hit_rate Cache hit rate percentage',
      '# TYPE chopnow_cache_hit_rate gauge',
      `chopnow_cache_hit_rate ${appMetrics.cache.hitRate}`,
      '',
      '# HELP chopnow_memory_heap_used_bytes Heap memory used',
      '# TYPE chopnow_memory_heap_used_bytes gauge',
      `chopnow_memory_heap_used_bytes ${appMetrics.memory.raw.heapUsed}`,
      '',
      '# HELP chopnow_uptime_seconds Application uptime',
      '# TYPE chopnow_uptime_seconds counter',
      `chopnow_uptime_seconds ${appMetrics.uptime.seconds}`,
    ];
    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
  } catch (metricsErr) {
    logger.error({ err: metricsErr }, 'Prometheus metrics collection failed');
    res.status(500).send('# Metrics unavailable\n');
  }
});

// Error handling — must come AFTER all routes
app.use(notFound);

// Sentry error handler (must be registered before any custom error handlers)
if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).trim() !== '') {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// Set once the HTTP server exists, so the shutdown handler below (registered
// now, at module load, before the server is listening) can reach it.
let httpServerRef = null;

// M12 fix: ONE shutdown sequence, not two competing ones (see the note in
// config/database.js for what that used to look like). Order matters: stop
// starting new background work first, then stop taking new HTTP/Socket.IO
// connections and let in-flight ones finish, then close the datastores. A
// hard timeout guarantees the process still exits even if something above
// hangs (e.g. a socket that never disconnects).
const SHUTDOWN_TIMEOUT_MS = 20000;
let shuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return; // a second SIGTERM/SIGINT mid-shutdown is a no-op
  shuttingDown = true;
  logger.info({ signal }, `Received ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown timed out - forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    stopExpiryJob();
    stopPendingPaymentExpiryJob();

    // Disconnects Socket.IO clients and stops the HTTP server from accepting
    // new connections; resolves once in-flight HTTP requests have completed.
    try {
      socketManager.getIO().close();
    } catch {
      // Socket.IO was never initialized (e.g. startServer failed before
      // reaching it) - nothing to close.
    }
    await socketManager.closeAdapter();
    if (httpServerRef) {
      await new Promise((resolve) => {
        try {
          httpServerRef.close(resolve);
        } catch {
          resolve(); // already closed by io.close() above
        }
      });
    }

    await closeDB();
    await redis.close();

    clearTimeout(forceExit);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', async (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  await closeDB().catch(() => {});
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection - shutting down');
  await closeDB().catch(() => {});
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis (optional - won't fail if unavailable)
    await redis.initRedis();

    // Start listing expiry background job (marks expired listings every 5 min)
    startExpiryJob();

    // Start pending payment expiry job (cancels stale orders every 5 min)
    startPendingPaymentExpiryJob();

    const port = process.env.PORT || 5000;
    const httpServer = createServer(app);
    httpServerRef = httpServer;

    // Initialize Socket.io
    await socketManager.init(httpServer, allowedOrigins);

    const server = httpServer.listen(port, () => {
      logger.info(
        { port, env: process.env.NODE_ENV || 'development' },
        `Server running on port ${port}`
      );
    });

    // Request timeout: 30s (prevents hung connections)
    server.timeout = 30000;
    server.keepAliveTimeout = 65000; // Slightly higher than ALB/nginx default (60s)
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
