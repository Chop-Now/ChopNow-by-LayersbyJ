/**
 * Every business type requires admin document verification before it can
 * start selling (user's explicit decision, matching the signup UI's own
 * "ALL categories require document verification for platform safety").
 * createBusiness used to auto-approve farmer/supermarket/bakery ('active',
 * 'verified') and only gate restaurant/cafe behind admin review - now every
 * type starts 'inactive'/'unverified', same as restaurant/cafe always did.
 */
const request = require('supertest');
const app = require('./app');
const { createConsumer } = require('./fixtures');

const validBusinessPayload = (overrides = {}) => ({
  name: 'Test Business',
  description: 'A test business',
  contact: { email: 'business@example.com', phone: '+250788000111' },
  address: {
    street: 'KG 15 Ave',
    city: 'Kigali',
    location: { type: 'Point', coordinates: [30.0619, -1.9441] },
  },
  ...overrides,
});

describe('POST /api/v1/businesses (verification gate applies to every type)', () => {
  it.each(['farmer', 'supermarket', 'bakery', 'restaurant', 'cafe'])(
    'should create a %s business as inactive/unverified, not auto-approved',
    async (type) => {
      const { token } = await createConsumer({ role: 'business_owner' });

      const res = await request(app)
        .post('/api/v1/businesses')
        .set('Authorization', `Bearer ${token}`)
        .send(validBusinessPayload({ type }));

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('inactive');
      expect(res.body.verification.status).toBe('unverified');
      expect(res.body.requiresVerification).toBe(true);
    }
  );
});
