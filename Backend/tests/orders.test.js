/**
 * Order creation money-correctness tests (Phase 2)
 *
 * Covers:
 *   C4 - order pricing must be computed server-side, never trusted from the
 *        client, regardless of what unitPrice/subtotal the request supplies.
 *   C5 - there is no real card payment gateway; 'card' must be rejected
 *        entirely and can never mark an order paid for free.
 */
const request = require('supertest');
const app = require('./app');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  enableCashPayments,
} = require('./fixtures');

// These tests place cash orders; cash is off by default.
beforeEach(enableCashPayments);

describe('POST /api/v1/orders - server-side pricing (C4)', () => {
  it('should price the order from the listing, ignoring a tampered unitPrice/subtotal', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 5000, currency: 'RWF' } });
    const { token } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        listing: listing._id.toString(),
        items: [
          {
            listing: listing._id.toString(),
            quantity: 2,
            // Tampered: real price is 5000/unit (10000 for 2), attacker claims 1.
            unitPrice: 1,
            subtotal: 2,
          },
        ],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'cash' },
      });

    expect(res.status).toBe(201);
    expect(res.body.items[0].unitPrice).toBe(5000);
    expect(res.body.items[0].subtotal).toBe(10000);
    expect(res.body.pricing.subtotal).toBe(10000);
    expect(res.body.pricing.total).toBe(10000);
  });

  it('should price correctly even when the client omits unitPrice/subtotal entirely', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 3000, currency: 'RWF' } });
    const { token } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 3 }],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'cash' },
      });

    expect(res.status).toBe(201);
    expect(res.body.pricing.subtotal).toBe(9000);
  });
});

describe('POST /api/v1/orders - no fake card payment path (C5)', () => {
  it('should reject paymentMethod: "card" at validation, never marking an order paid', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { token } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'card' },
      });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('status', 'paid');
  });

  it('should never mark an order "paid" at creation regardless of PAYMENT_TEST_MODE', async () => {
    const originalTestMode = process.env.PAYMENT_TEST_MODE;
    process.env.PAYMENT_TEST_MODE = 'true';
    try {
      const { business } = await createBusinessOwnerWithBusiness();
      const listing = await createListing(business);
      const { token } = await createConsumer();

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          listing: listing._id.toString(),
          items: [{ listing: listing._id.toString(), quantity: 1 }],
          fulfillmentType: 'pickup',
          payment: { paymentMethod: 'mobile_money' },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending_payment');
      expect(res.body.payment.paymentStatus).toBe('pending');
    } finally {
      process.env.PAYMENT_TEST_MODE = originalTestMode;
    }
  });
});

describe('POST /api/v1/orders - delivery address normalization (H14)', () => {
  const Order = require('../models/Order');

  async function deliveryOrder(deliveryDetails) {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { fulfillment: 'delivery' });
    const { token } = await createConsumer();
    return request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'delivery',
        deliveryDetails,
        payment: { paymentMethod: 'cash' },
      });
  }

  it('should accept the string address + {lat,lng} shape both web and mobile send', async () => {
    const res = await deliveryOrder({
      address: 'KN 5 Rd, Kigali, Rwanda',
      location: { lat: -1.9501, lng: 30.0588 },
    });
    expect(res.status).toBe(201);

    const stored = await Order.findById(res.body._id).lean();
    expect(stored.deliveryDetails.address.street).toBe('KN 5 Rd, Kigali, Rwanda');
    expect(stored.deliveryDetails.address.location).toEqual({
      type: 'Point',
      coordinates: [30.0588, -1.9501],
    });
  });

  it('should still accept the schema-native object shape', async () => {
    const res = await deliveryOrder({
      address: {
        street: '1 Main St',
        city: 'Kigali',
        location: { type: 'Point', coordinates: [30.06, -1.95] },
      },
    });
    expect(res.status).toBe(201);
    const stored = await Order.findById(res.body._id).lean();
    expect(stored.deliveryDetails.address.city).toBe('Kigali');
    expect(stored.deliveryDetails.address.location.coordinates).toEqual([30.06, -1.95]);
  });

  it('should drop out-of-range coordinates rather than store them', async () => {
    const res = await deliveryOrder({ address: 'Somewhere', location: { lat: 500, lng: 30 } });
    expect(res.status).toBe(201);
    const stored = await Order.findById(res.body._id).lean();
    // Mongoose materializes an empty `coordinates: []` default for the nested
    // path; what matters is that the bogus pair was not stored.
    expect(stored.deliveryDetails.address.location?.coordinates ?? []).toEqual([]);
  });
});

describe('GET /api/v1/orders - role switch', () => {
  it("should not let a customer list other customers' orders with ?role=admin", async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { token: alice } = await createConsumer();
    const { token: bob } = await createConsumer();
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${alice}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'mobile_money' },
      });

    const res = await request(app)
      .get('/api/v1/orders?role=admin')
      .set('Authorization', `Bearer ${bob}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
  });
});
