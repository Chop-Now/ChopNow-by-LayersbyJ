/**
 * Review submission tests (C11)
 *
 * Reviews are written per completed order (from My Orders). The reviewed
 * business is always derived from the order server-side; a client-supplied
 * `business` is ignored, so a buyer can't attach a review to a business they
 * never bought from.
 */
const request = require('supertest');
const app = require('./app');
const Business = require('../models/Business');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  enableCashPayments,
} = require('./fixtures');

// These tests place cash orders; cash is off by default.
beforeEach(enableCashPayments);

async function completedOrderFor(consumerToken) {
  const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business);
  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${consumerToken}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity: 1 }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod: 'cash' },
    });
  await request(app)
    .put(`/api/v1/orders/${orderRes.body._id}/status`)
    .set('Authorization', `Bearer ${vendorToken}`)
    .send({ status: 'completed' });
  return { order: orderRes.body, business };
}

describe('POST /api/v1/reviews (C11)', () => {
  it('should create a review for a completed order and show it on the business', async () => {
    const { token } = await createConsumer();
    const { order, business } = await completedOrderFor(token);

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ order: order._id, rating: 5, comment: 'Great food' });
    expect(res.status).toBe(201);

    const list = await request(app).get(`/api/v1/reviews/business/${business._id}`);
    expect(list.status).toBe(200);
    const reviews = list.body.reviews || list.body;
    expect(reviews.some((r) => r.comment === 'Great food')).toBe(true);

    const updated = await Business.findById(business._id);
    expect(updated.stats.averageRating).toBe(5);
  });

  it("should attach the review to the order's business, ignoring a spoofed business id", async () => {
    const { token } = await createConsumer();
    const { order, business } = await completedOrderFor(token);
    const { business: otherBusiness } = await createBusinessOwnerWithBusiness();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ order: order._id, business: otherBusiness._id, rating: 1 });
    expect(res.status).toBe(201);
    expect(String(res.body.business)).toBe(String(business._id));
  });

  it('should reject a second review for the same order', async () => {
    const { token } = await createConsumer();
    const { order } = await completedOrderFor(token);
    const body = { order: order._id, rating: 4 };

    await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${token}`).send(body);
    const again = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(again.status).toBe(400);
  });

  it("should not let someone review an order that isn't theirs", async () => {
    const { token: ownerToken } = await createConsumer();
    const { order } = await completedOrderFor(ownerToken);
    const { token: strangerToken } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ order: order._id, rating: 1 });
    expect(res.status).toBe(403);
  });
});
