const crypto = require('crypto');

/**
 * Attach a request id to every request and return it as `x-request-id`.
 * If the client provides `x-request-id`, we keep it (useful for tracing across services).
 */
function requestId(req, res, next) {
  const headerId = req.headers['x-request-id'];
  const id =
    (typeof headerId === 'string' && headerId.trim() !== '' && headerId.trim()) ||
    crypto.randomUUID();

  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

module.exports = requestId;
