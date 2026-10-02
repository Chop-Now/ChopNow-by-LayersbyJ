const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');

let cachedPublicKey = null;
let cachedKeyId = null;
let lastFetched = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch pawaPay's public key dynamically from their endpoint
 */
async function fetchPublicKey() {
  const now = Date.now();
  if (cachedPublicKey && now - lastFetched < CACHE_TTL) {
    return { key: cachedPublicKey, id: cachedKeyId };
  }

  const isProduction = process.env.PAWAPAY_ENVIRONMENT === 'production';
  const baseUrl = isProduction ? 'https://api.pawapay.io' : 'https://api.sandbox.pawapay.io';
  const apiKey = process.env.PAWAPAY_API_KEY;

  if (!apiKey) {
    logger.warn('PAWAPAY_API_KEY not configured. Cannot fetch public key dynamically.');
    return null;
  }

  try {
    const response = await axios.get(`${baseUrl}/public-key/http`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 5000,
    });

    if (response.data && response.data.key) {
      cachedPublicKey = response.data.key;
      cachedKeyId = response.data.id;
      lastFetched = now;
      logger.info({ keyId: cachedKeyId }, 'pawaPay public key fetched and cached successfully.');
      return { key: cachedPublicKey, id: cachedKeyId };
    }
  } catch (error) {
    logger.error({ err: error.message }, 'Failed to fetch pawaPay public key dynamically.');
  }

  // Fallback to env variable if set
  if (process.env.PAWAPAY_PUBLIC_KEY) {
    logger.info('Using fallback PAWAPAY_PUBLIC_KEY from environment variables.');
    return { key: process.env.PAWAPAY_PUBLIC_KEY, id: 'env-fallback' };
  }

  return null;
}

// M6: whether verification may be skipped requires this EXPLICIT, opt-in
// flag - never inferred from PAWAPAY_ENVIRONMENT alone. That string can be
// left unset or misspelled in a real deployment and still boot the server
// fine (nothing else depends on it being exactly right), which would
// silently fail this check open and accept forged/unsigned payment
// callbacks. Sandbox testing must deliberately set this to 'true'; it
// defaults to not-allowed, so a missing/misconfigured env is the SAFE
// failure mode, not the dangerous one.
const bypassAllowed = () => process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS === 'true';

/**
 * Verify RFC-9421 HTTP Message Signature for pawaPay callbacks
 * @param {object} req Express request object
 * @returns {Promise<boolean>} True if signature is valid, or explicitly allowed by PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS
 */
async function verifySignature(req) {
  const signatureHeader = req.headers['signature'];
  const signatureInputHeader = req.headers['signature-input'];

  // 1. If headers are missing, handle based on the explicit bypass flag
  if (!signatureHeader || !signatureInputHeader) {
    if (!bypassAllowed()) {
      logger.error(
        'Rejecting callback: missing signature headers and PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS is not set.'
      );
      return false;
    }
    logger.warn(
      'Signature headers missing. Allowing because PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS=true.'
    );
    return true;
  }

  try {
    // 2. Extract base64 signature value
    // pawaPay uses Structured Fields, e.g. sig1=:base64sig:
    const sigMatch = signatureHeader.match(/sig\d+=:([^:]+):/);
    const signatureBase64 = sigMatch ? sigMatch[1] : signatureHeader;
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    // 3. Parse signature input
    // Format: sig1=("content-digest" "x-request-id" "signature-date");created=1618884473;keyid="key-1"
    const inputMatch = signatureInputHeader.match(/sig\d+=\(([^)]+)\)(.+)/);
    if (!inputMatch) {
      logger.error({ signatureInputHeader }, 'Invalid Signature-Input format.');
      return false;
    }

    const paramsStr = inputMatch[1]; // '"content-digest" "x-request-id" "signature-date"'
    const attributes = inputMatch[2]; // ';created=1618884473;keyid="key-1"'
    const params = paramsStr.split(/\s+/).map((p) => p.replace(/"/g, ''));

    // 4. Validate Content-Digest if present
    const contentDigestHeader = req.headers['content-digest'];
    if (params.includes('content-digest')) {
      if (!contentDigestHeader) {
        logger.error('content-digest listed in signed params but header is missing.');
        return false;
      }

      // Format is usually: sha-256=:digest:
      const digestMatch = contentDigestHeader.match(/sha-256=:([^:]+):/i);
      const digestVal = digestMatch ? digestMatch[1] : contentDigestHeader;

      // Hash request body using SHA-256
      const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const computedHash = crypto.createHash('sha256').update(bodyString).digest('base64');

      if (computedHash !== digestVal) {
        logger.error(
          { computed: computedHash, header: digestVal },
          'Content-Digest mismatch. Payload may have been tampered with.'
        );
        return false;
      }
    }

    // 5. Fetch public key
    const pkDetails = await fetchPublicKey();
    if (!pkDetails) {
      if (!bypassAllowed()) {
        logger.error(
          'Rejecting callback: public key unavailable and PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS is not set.'
        );
        return false;
      }
      logger.warn('Public key unavailable. Allowing because PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS=true.');
      return true;
    }

    // 6. Reconstruct signature base string
    let baseString = '';
    for (const param of params) {
      let val = '';
      if (param === '@path') {
        val = req.path;
      } else if (param === '@method') {
        val = req.method.toUpperCase();
      } else if (param === '@query') {
        const queryIdx = req.originalUrl.indexOf('?');
        val = queryIdx !== -1 ? req.originalUrl.substring(queryIdx) : '?';
      } else if (param === '@authority') {
        val = req.get('host');
      } else {
        val = req.headers[param.toLowerCase()] || '';
      }
      baseString += `"${param}": ${val}\n`;
    }
    const signatureParams = `(${paramsStr})${attributes}`;
    baseString += `"@signature-params": ${signatureParams}`;

    // 7. Verify using Node crypto
    const verifier = crypto.createVerify('sha256');
    verifier.update(baseString);

    const verified = verifier.verify(pkDetails.key, signatureBuffer);

    if (!verified) {
      logger.error('Cryptographic signature verification failed.');
      return false;
    }

    logger.debug('pawaPay signature verified successfully.');
    return true;
  } catch (error) {
    logger.error({ err: error.message }, 'Error during signature verification.');
    return false;
  }
}

module.exports = {
  verifySignature,
  fetchPublicKey,
};
