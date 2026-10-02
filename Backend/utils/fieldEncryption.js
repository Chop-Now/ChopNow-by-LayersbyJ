const crypto = require('crypto');

/**
 * Field-level encryption for sensitive Mongoose string fields (M5: rider
 * nationalId/licensePlate). AES-256-GCM, one random IV per value so the same
 * plaintext never produces the same ciphertext twice. Stored as a single
 * string: `v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>` so it's
 * self-describing (a version prefix lets us change the scheme later without
 * guessing at old rows) and safely round-trips through a plain String field.
 *
 * These fields are never queried on (confirmed: no `find({ nationalId })`
 * etc. anywhere in the codebase) so deterministic/searchable encryption
 * isn't needed - random IVs are strictly better here.
 */
const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

let cachedKey = null;
function getKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set - required to store/read encrypted rider fields (nationalId/licensePlate). Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of a 256-bit key)'
    );
  }
  cachedKey = key;
  return key;
}

// Exposed for tests that need to force a fresh key lookup after changing env.
function _resetKeyCache() {
  cachedKey = null;
}

function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  // Already encrypted (e.g. re-saving a document without touching this
  // field - Mongoose re-runs setters on save for modified paths only, but
  // a caller assigning the already-encrypted value back should be a no-op).
  if (typeof plaintext === 'string' && plaintext.startsWith(`${VERSION}:`)) return plaintext;

  // A schema-level `trim: true` alongside a custom `set` does NOT trim
  // before this setter runs (verified empirically - the two options don't
  // compose the way you'd expect), so trim explicitly here.
  const value = String(plaintext).trim();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${VERSION}:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptField(stored) {
  if (stored === null || stored === undefined || stored === '') return stored;
  if (typeof stored !== 'string' || !stored.startsWith(`${VERSION}:`)) {
    // Not our format - either unencrypted legacy data (pre-migration) or
    // already plaintext. Return as-is rather than throwing, so a rollout
    // that hasn't run the backfill yet doesn't 500 every rider-detail read.
    return stored;
  }

  const parts = stored.split(':');
  if (parts.length !== 4) return stored;
  const [, ivB64, authTagB64, ciphertextB64] = parts;

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    // Wrong/rotated key, or corrupted value - surface as unreadable rather
    // than crashing the page that displays it.
    return '[unreadable - encryption key mismatch]';
  }
}

module.exports = { encryptField, decryptField, _resetKeyCache };
