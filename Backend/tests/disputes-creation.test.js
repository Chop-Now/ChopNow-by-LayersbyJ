/**
 * POST /api/v1/disputes - dispute creation regression tests.
 *
 * The only real caller of this endpoint is the mobile app's "Report an
 * Issue" screen (Mobile/lib/features/orders/dispute_screen.dart), which
 * sends { order, reason, description } - no `type`, no `title`. That body
 * used to 500: the controller read a nonexistent `orderId` field instead of
 * `order`, the request validator's `type` enum didn't match the Dispute
 * model's own `type` enum, and neither `title` nor `description` (both
 * required by the model) were validated. These tests hit the endpoint with
 * that exact real-world payload shape.
 */
const request = require('supertest');
const app = require('./app');
const { createConsumer, createBusinessOwnerWithBusiness, createListing } = require('./fixtures');

async function createOrderForDispute() {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, { pricing: { price: 3000, currency: 'RWF' } });
  const { token: consumerToken, user: consumer } = await createConsumer();

  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${consumerToken}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity: 1 }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod: 'mobile_money' },
    });

  return { order: orderRes.body, consumerToken, consumer, business };
}

describe('POST /api/v1/disputes - creation matches the real mobile payload', () => {
  it('creates a dispute from the exact body the mobile app sends (order, reason, description)', async () => {
    const { order, consumerToken } = await createOrderForDispute();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        order: order._id,
        reason: 'Missing items',
        description: 'Two of the three items I ordered were missing from the bag.',
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBe(order._id);
    expect(res.body.type).toBe('missing_item');
    expect(res.body.title).toBe('Missing items');
    expect(res.body.description).toBe(
      'Two of the three items I ordered were missing from the bag.'
    );
  });

  it('falls back to type "other" for a reason with no explicit mapping', async () => {
    const { order, consumerToken } = await createOrderForDispute();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        order: order._id,
        reason: 'Wrong item received',
        description: 'I received a completely different meal than what I ordered.',
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('other');
  });

  it('rejects a request missing the required description with a 400, not a 500', async () => {
    const { order, consumerToken } = await createOrderForDispute();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        order: order._id,
        reason: 'Missing items',
      });

    expect(res.status).toBe(400);
  });

  it('rejects a dispute for an order the requesting user does not own', async () => {
    const { order } = await createOrderForDispute();
    const { token: otherConsumerToken } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${otherConsumerToken}`)
      .send({
        order: order._id,
        reason: 'Missing items',
        description: 'Trying to dispute an order that is not mine.',
      });

    expect(res.status).toBe(403);
  });
});
