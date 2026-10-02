/**
 * Error handler middleware
 */
const logger = require('../utils/logger');
const { redact } = require('../utils/redactPaths');

const errorHandler = (err, req, res, _next) => {
  // Prefer structured logging; fall back to console if logger unavailable
  try {
    logger.error(
      { err, reqId: req?.id, path: req?.originalUrl, method: req?.method },
      'Unhandled error'
    );
  } catch {
    // pino itself threw, so its redaction never ran - redact this fallback
    // payload independently rather than dumping err.stack (and any custom
    // properties attached to err, e.g. err.body) raw to console.
    console.error(
      redact({
        message: err?.message,
        stack: err?.stack,
        path: req?.originalUrl,
        method: req?.method,
        ...err,
      })
    ); // eslint-disable-line no-console
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: 'Validation Error',
      errors: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      message: `${field} already exists`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Unexpected file field',
    });
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Default error - sanitize message in production for 500 errors
  res.status(statusCode).json({
    message:
      isProduction && statusCode === 500 ? 'Internal server error' : err.message || 'Server Error',
    requestId: req.id,
    ...(!isProduction && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = { errorHandler, notFound };
