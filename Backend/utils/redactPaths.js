// Shared with utils/logger.js's pino `redact.paths` - keeping one list means
// a new sensitive field only needs to be added once. Used by logger.js for
// pino's own redaction, and by errorHandler.js's console.error fallback path
// (which pino's redaction can't reach if pino itself is what threw).
const REDACTED_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'token',
  'otp',
  'otpCode',
  'refreshToken',
  'authorization',
  'cookie',
]);

const CENSOR = '[REDACTED]';

/**
 * Deep-clones a value, replacing any object key found in REDACTED_KEYS
 * (case-insensitive) with CENSOR. Used to sanitize error/request payloads
 * before they hit a raw console.error fallback.
 */
function redact(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((v) => redact(v, seen));

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? CENSOR : redact(val, seen);
  }
  return out;
}

module.exports = { redact, REDACTED_KEYS, CENSOR };
