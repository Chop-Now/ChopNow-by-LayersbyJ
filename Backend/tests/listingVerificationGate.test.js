/**
 * A business pending KYC review (or suspended by an admin) must not be able
 * to create listings just by calling POST /api/v1/listings directly - the
 * signup UI tells every business type it can't sell until approved, but
 * nothing on the backend actually enforced that. Found live in production:
 * a freshly-registered, still-pending business could immediately create a
 * real, publicly-visible listing.
 */
const request = require('supertest');
const app = require('./app');
const { createBusinessOwnerWithBusiness } = require('./fixtures');

const validListingPayload = () => {
  const now = Date.now();
  return {
    title: 'Test Listing',
    description: 'A test listing',
    category: 'meals',
    pricing: { price: 1000, originalPrice: 2000 },
    inventory: { quantity: 5 },
    fulfillment: 'pickup',
    timeWindow: {
      availableFrom: new Date(now).toISOString(),
      availableUntil: new Date(now + 60 * 60 * 1000).toISOString(),
    },
  };
};

describe('POST /api/v1/listings (business-approval gate)', () => {
  it('should let an active, verified business create a listing', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness();

    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validListingPayload(), business: business._id });

    expect(res.status).toBe(201);
  });

  it('should refuse to let an inactive (pending-verification) business create a listing', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness({
      status: 'inactive',
      verification: { status: 'unverified' },
    });

    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validListingPayload(), business: business._id });

    expect(res.status).toBe(403);
  });

  it('should refuse to let a suspended business create a listing', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness({
      status: 'suspended',
    });

    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validListingPayload(), business: business._id });

    expect(res.status).toBe(403);
  });
});
