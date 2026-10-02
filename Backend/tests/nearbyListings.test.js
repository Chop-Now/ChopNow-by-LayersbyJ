/**
 * GET /api/v1/listings/nearby (H19)
 *
 * The mobile distance filter/sort depends on this endpoint returning a real
 * per-listing distance. It previously queried the unindexed
 * `address.location` path (MongoDB rejects $near without a geo index) and
 * never returned a distance at all.
 */
const request = require('supertest');
const app = require('./app');
const Business = require('../models/Business');
const { createBusinessOwnerWithBusiness, createListing } = require('./fixtures');

// Kigali city centre, and two points ~1.1 km and ~22 km away.
const USER = { lat: -1.9441, lng: 30.0619 };
const NEAR = [30.0619, -1.9341];
const FAR = [30.26, -1.9441];

beforeAll(async () => {
  // $geoNear needs the 2dsphere index to exist before the first query.
  await Business.createIndexes();
});

async function listingAt(coordinates, title) {
  const { business } = await createBusinessOwnerWithBusiness({
    location: { type: 'Point', coordinates },
  });
  return createListing(business, { title });
}

describe('GET /api/v1/listings/nearby (H19)', () => {
  it('should return only listings within the radius, each with a distance in km', async () => {
    await listingAt(NEAR, 'Near bakery');
    await listingAt(FAR, 'Far bakery');

    const res = await request(app)
      .get('/api/v1/listings/nearby')
      .query({ lat: USER.lat, lng: USER.lng, radius: 5000 });

    expect(res.status).toBe(200);
    const titles = res.body.listings.map((l) => l.title);
    expect(titles).toContain('Near bakery');
    expect(titles).not.toContain('Far bakery');

    const near = res.body.listings.find((l) => l.title === 'Near bakery');
    expect(near.distance).toBeGreaterThan(0.9);
    expect(near.distance).toBeLessThan(1.3);
  });

  it('should include farther listings when the radius is widened', async () => {
    await listingAt(NEAR, 'Near bakery');
    await listingAt(FAR, 'Far bakery');

    const res = await request(app)
      .get('/api/v1/listings/nearby')
      .query({ lat: USER.lat, lng: USER.lng, radius: 30000 });

    const far = res.body.listings.find((l) => l.title === 'Far bakery');
    expect(far).toBeDefined();
    expect(far.distance).toBeGreaterThan(20);
  });

  it('should reject missing or invalid coordinates', async () => {
    const missing = await request(app).get('/api/v1/listings/nearby');
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .get('/api/v1/listings/nearby')
      .query({ lat: 'abc', lng: 30 });
    expect(invalid.status).toBe(400);
  });
});
