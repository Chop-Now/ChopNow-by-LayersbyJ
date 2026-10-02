/**
 * sanitizeInput.js
 *
 * Express middleware that strips all HTML tags from string fields in req.body,
 * and strips any object key that could act as a MongoDB query operator
 * ($ne, $gt, $where, ...) or a dotted path (a.b), so a route that builds a
 * Mongoose filter directly from req.body (e.g. { email, otp } spread into a
 * findOne()) can never have an attacker-supplied operator object smuggled in
 * as a field's value. Applied globally after express.json() to protect every
 * route, not just the ones that happen to validate their body shape.
 *
 * Targeted fields: title, description, comment, name (and any other string values).
 * Uses sanitize-html with an allowlist of zero tags/attributes — pure plaintext output.
 */

const sanitizeHtml = require('sanitize-html');

const SANITIZE_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
};

// A key is a Mongo-operator/injection risk if it starts with '$' (query/update
// operators like $ne, $gt, $where) or contains '.' (dotted-path traversal).
function isDangerousKey(key) {
  return key.startsWith('$') || key.includes('.');
}

/**
 * Recursively sanitize all string values in an object, and drop any key that
 * looks like a Mongo operator or dotted path at any depth.
 * Preserves non-string, non-dangerous types (numbers, booleans, arrays, nested objects).
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isDangerousKey(key)) continue; // drop $-operator / dotted-path keys entirely

    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, SANITIZE_OPTIONS);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Middleware: sanitizes req.body string fields in-place.
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

module.exports = sanitizeInput;
