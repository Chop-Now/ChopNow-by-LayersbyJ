const Sentry = require('@sentry/node');

// Initialize Sentry early (before other modules) when configured.
// This file is safe to require in all envs; it becomes a no-op if SENTRY_DSN is not set.
// profiling-node is required lazily here (not at module top-level) because it
// loads a platform-specific native binding eagerly on require, which can fail
// on Node versions newer than its prebuilt binaries — no reason to pay that
// cost when Sentry isn't even configured.
if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).trim() !== '') {
  const { nodeProfilingIntegration } = require('@sentry/profiling-node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    // Tracing - capture transactions for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling - set sampling rate
    profileSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profileLifecycle: 'trace',
    // Keep PII off by default for privacy
    sendDefaultPii: false,
  });
}

module.exports = Sentry;
