/**
 * Health Check Endpoint Tests
 *
 * Covers:
 *   GET /health
 *   GET /ready
 *   GET /.well-known/security.txt
 */
const request = require('supertest');
const app = require('./app');

describe('GET /health', () => {
  it('should return 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /ready', () => {
  it('should return a status field', async () => {
    const res = await request(app).get('/ready');

    // If the test MongoDB is connected (setup.js connects before tests), expect 200.
    // Otherwise the endpoint returns 503 -- either way the shape is the same.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });

  it('should report "ready" when the database is connected', async () => {
    const res = await request(app).get('/ready');

    // setup.js ensures a connection is open before tests run
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', database: 'connected' });
  });
});

describe('GET /.well-known/security.txt', () => {
  it('should return text/plain content', async () => {
    const res = await request(app).get('/.well-known/security.txt');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('Contact: mailto:security@chopnow.app');
    expect(res.text).toContain('Preferred-Languages: en');
    expect(res.text).toContain('Canonical:');
    expect(res.text).toContain('Policy:');
  });
});
