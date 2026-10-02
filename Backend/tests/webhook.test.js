/**
 * pawaPay webhook idempotency tests (H9)
 *
 * Covers: two webhook deliveries for the same depositId (pawaPay retries on
 * timeout, and can genuinely double-send) must claim the Payment exactly
 * once - the bug was a find-then-check-then-write pattern (Payment.findOne,
 * a callbackReceived/status check, then a later payment.save()) with a real
 * gap between the read and the write for two near-simultaneous requests to
 * land in. A FAILED outcome does NOT cancel the order or release stock (M9:
 * the order stays pending_payment so the customer can retry it), so what's
 * checked for FAILED is that the Payment is claimed once and the order/stock
 * are left untouched either way, not "restored exactly once".
 *
 * No Signature/Signature-Input headers are sent - verifySignature allows
 * that in non-production (PAWAPAY_ENVIRONMENT is unset in tests), so these
 * tests exercise handleWebhook's own idempotency logic directly.
 */
const request = require('supertest');
const app = require('./app');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const RefundRequest = require('../models/RefundRequest');
const { createConsumer, createBusinessOwnerWithBusiness, createListing } = require('./fixtures');

async function createPendingMobileMoneyOrder({ quantity = 2, startingStock = 5 } = {}) {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, {
    pricing: { price: 4000, currency: 'RWF' },
    inventory: { quantity: startingStock },
  });
  const { token: consumerToken } = await createConsumer();
  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${consumerToken}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod: 'mobile_money' },
    });
  const order = orderRes.body;

  const depositId = `dep-${order._id}`;
  await Payment.create({
    order: order._id,
    depositId,
    amount: order.pricing.total,
    currency: order.pricing.currency,
    payerPhoneNumber: '+250700000000',
    correspondent: 'MTN_MOMO_RWA',
    status: 'pending',
  });

  return { order, listing, depositId, consumerToken };
}

describe('POST /api/v1/payments/webhook - idempotency (H9)', () => {
  it('should claim the Payment exactly once for two concurrent FAILED callbacks, leaving stock reserved and the order retryable (M9)', async () => {
    const { listing, depositId } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    const afterOrder = await Listing.findById(listing._id);
    expect(afterOrder.inventory.quantity).toBe(3); // 5 - 2 reserved

    const payload = { depositId, status: 'FAILED', failureReason: { code: 'X', description: 'Y' } };

    const [first, second] = await Promise.all([
      request(app).post('/api/v1/payments/webhook').send(payload),
      request(app).post('/api/v1/payments/webhook').send(payload),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // M9: a failed attempt no longer cancels the order or releases stock -
    // both stay exactly as they were so the customer can retry.
    const afterWebhooks = await Listing.findById(listing._id);
    expect(afterWebhooks.inventory.quantity).toBe(3);
    expect(afterWebhooks.inventory.reserved).toBe(2);

    const payment = await Payment.findOne({ depositId });
    expect(payment.status).toBe('failed');
  });

  it('should not double-process a repeated FAILED callback for the same depositId', async () => {
    const { order, depositId } = await createPendingMobileMoneyOrder();

    const payload = { depositId, status: 'FAILED' };
    await request(app).post('/api/v1/payments/webhook').send(payload);
    const secondRes = await request(app).post('/api/v1/payments/webhook').send(payload);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.message).toMatch(/not found or already processed/i);

    // M9: order stays pending_payment (retryable), not cancelled.
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('pending_payment');
  });

  it('should ignore non-final statuses instead of failing the order', async () => {
    const { order, depositId } = await createPendingMobileMoneyOrder();

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId, status: 'ACCEPTED' });
    expect(res.status).toBe(200);
    expect((await Order.findById(order._id)).status).toBe('pending_payment');
    expect((await Payment.findOne({ depositId })).status).toBe('pending');
  });

  it('should answer 5xx (so pawaPay retries) and leave nothing half-applied on a processing error', async () => {
    const { order, depositId } = await createPendingMobileMoneyOrder();
    const spy = jest
      .spyOn(Order, 'findOneAndUpdate')
      .mockRejectedValueOnce(new Error('simulated DB failure'));
    try {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ depositId, status: 'COMPLETED' });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }
    // Payment claim rolled back with the transaction...
    expect((await Payment.findOne({ depositId })).status).toBe('pending');
    // ...so pawaPay's retry is applied.
    const retry = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId, status: 'COMPLETED' });
    expect(retry.status).toBe(200);
    expect((await Order.findById(order._id)).status).toBe('paid');
  });

  it('should queue a refund, not resurrect the order, when payment completes after the customer cancelled', async () => {
    const { order, listing, depositId, consumerToken } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    const cancelRes = await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(cancelRes.status).toBe(200);

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId, status: 'COMPLETED', providerTransactionId: 'late-ptx' });
    expect(res.status).toBe(200);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('cancelled');
    expect(updatedOrder.payment.paymentStatus).toBe('refund_pending');

    const refunds = await RefundRequest.find({ order: order._id });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(order.pricing.total);
    expect(refunds[0].status).toBe('pending_manual');

    // Stock stays restored exactly once (by the cancel).
    const updatedListing = await Listing.findById(listing._id);
    expect(updatedListing.inventory.quantity).toBe(5);
  });

  it('should not release stock again when payment fails after the customer cancelled', async () => {
    const { order, listing, depositId, consumerToken } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${consumerToken}`);
    await request(app).post('/api/v1/payments/webhook').send({ depositId, status: 'FAILED' });

    const updatedListing = await Listing.findById(listing._id);
    expect(updatedListing.inventory.quantity).toBe(5); // not 7
    expect(updatedListing.inventory.reserved).toBe(0);
  });

  it('should not cancel the order when one attempt fails while a retry is still pending', async () => {
    const { order, depositId } = await createPendingMobileMoneyOrder();
    const retryDepositId = `${depositId}-retry`;
    await Payment.create({
      order: order._id,
      depositId: retryDepositId,
      amount: order.pricing.total,
      currency: order.pricing.currency,
      payerPhoneNumber: '250780000000',
      correspondent: 'MTN_MOMO_RWA',
      status: 'pending',
    });

    await request(app).post('/api/v1/payments/webhook').send({ depositId, status: 'FAILED' });
    expect((await Order.findById(order._id)).status).toBe('pending_payment');

    await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId: retryDepositId, status: 'COMPLETED' });
    expect((await Order.findById(order._id)).status).toBe('paid');
  });

  it('should restore stock once when the customer double-taps cancel', async () => {
    const { order, listing, consumerToken } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    const results = await Promise.all([
      request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`),
      request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);

    const updatedListing = await Listing.findById(listing._id);
    expect(updatedListing.inventory.quantity).toBe(5);
    expect(updatedListing.inventory.reserved).toBe(0);
  });

  it('should mark the order paid on a COMPLETED callback', async () => {
    const { order, depositId } = await createPendingMobileMoneyOrder();

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId, status: 'COMPLETED', providerTransactionId: 'ptx-123' });

    expect(res.status).toBe(200);
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.payment.paymentStatus).toBe('completed');
  });
});
