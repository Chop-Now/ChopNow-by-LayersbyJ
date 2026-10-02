const pino = require('pino');
const { REDACTED_KEYS, CENSOR } = require('./redactPaths');

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const bodyKeys = [
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'token',
  'otp',
  'otpCode',
  'refreshToken',
];

const logger = pino({
  level,
  base: {
    service: 'chopnow-backend',
  },
  redact: {
    // Covers both `logger.info(req, ...)`-style calls (req.body.*, req.headers.*)
    // AND plain-object calls like `logger.warn({ otp, token }, ...)` (the root-level
    // paths) - a call site logging a secret under either shape is caught here.
    // This is defense-in-depth: call sites should still avoid logging raw secret
    // values in the first place (see userController.js's otpProvided/tokenProvided
    // pattern), but a future call site that doesn't follow that pattern is still
    // covered by this list. Sourced from redactPaths.js's REDACTED_KEYS so
    // errorHandler.js's console.error fallback stays in sync with this list.
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      ...bodyKeys.map((k) => `req.body.${k}`),
      ...REDACTED_KEYS,
    ],
    censor: CENSOR,
  },
});

module.exports = logger;
