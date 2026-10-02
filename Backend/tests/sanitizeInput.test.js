/**
 * sanitizeInput middleware tests
 *
 * Covers the C3 fix: sanitizeInput must strip any object key that could act
 * as a MongoDB query operator ($ne, $gt, $where, ...) or a dotted path (a.b)
 * from req.body, at any nesting depth - not just sanitize string values for
 * XSS. This is the repo-wide defense-in-depth layer (server.js mounts it
 * globally before any route), independent of per-route express-validator
 * checks.
 */
// sanitize-html pulls in htmlparser2, which ships ESM-only with no CJS build
// and isn't transformable under this repo's plain (babel-less) Jest config -
// unrelated to the logic under test here (the Mongo-operator key stripping),
// so mock it out rather than change repo-wide Jest/Babel config for one test.
jest.mock('sanitize-html', () => (value) => value);

const sanitizeInput = require('../middleware/sanitizeInput');

const runMiddleware = (body) => {
  const req = { body };
  const res = {};
  let nextCalled = false;
  sanitizeInput(req, res, () => {
    nextCalled = true;
  });
  expect(nextCalled).toBe(true);
  return req.body;
};

describe('sanitizeInput middleware - Mongo operator key stripping', () => {
  it('should strip a top-level $-operator key used as a field value', () => {
    const result = runMiddleware({ email: { $ne: null }, otp: { $ne: null } });

    expect(result.email).toEqual({});
    expect(result.otp).toEqual({});
  });

  it('should strip $where and other operator keys at any nesting depth', () => {
    const result = runMiddleware({
      filter: { nested: { $where: 'sleep(10000)', safeKey: 'ok' } },
    });

    expect(result.filter.nested).toEqual({ safeKey: 'ok' });
  });

  it('should strip dotted-path keys', () => {
    const result = runMiddleware({ 'user.role': 'admin', normalField: 'value' });

    expect(result).not.toHaveProperty('user.role');
    expect(result.normalField).toBe('value');
  });

  it('should leave ordinary string, number, and array fields untouched', () => {
    const result = runMiddleware({
      email: 'test@example.com',
      age: 30,
      tags: ['a', 'b'],
    });

    expect(result).toEqual({ email: 'test@example.com', age: 30, tags: ['a', 'b'] });
  });
});
