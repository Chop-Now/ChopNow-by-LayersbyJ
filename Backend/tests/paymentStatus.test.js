/**
 * Payment status polling fallback idempotency tests (H9, getPaymentStatus)
 *
 * GET /payments/status/:orderId polls pawaPay directly while the local
 * Payment is still 'pending'. It used to read-check-then-save the Payment and
 * Order, so two concurrent polls that both saw a remote FAILED status could
 * both cancel the order and both restore the reserved listing stock.
 *
 * axios is mocked so the "remote" pawaPay status is whatever each test says.
 */
jest.mock('axios');

const axios = require('axios');
const request = require('supertest');
const app = require('./app');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { createConsumer, createBusinessOwnerWithBusiness, createListing } = require('./fixtures');

const originalApiKey = process.env.PAWAPAY_API_KEY;
const originalTestMode = process.env.PAYMENT_TEST_MODE;

beforeAll(() => {
  process.env.PAWAPAY_API_KEY = 'test-pawapay-key';
  // Exercise the real (sandbox) polling path; in test mode there's nothing to poll.
  process.env.PAYMENT_TEST_MODE = 'false';
});

afterAll(() => {
  if (originalApiKey === undefined) delete process.env.PAWAPAY_API_KEY;
  else process.env.PAWAPAY_API_KEY = originalApiKey;
  if (originalTestMode === undefined) delete process.env.PAYMENT_TEST_MODE;
  else process.env.PAYMENT_TEST_MODE = originalTestMode;
});

afterEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
});

function mockRemoteStatus(data) {
  axios.get.mockResolvedValue({ data: { status: 'FOUND', data } });
}

async function createPendingMobileMoneyOrder({ quantity = 2, startingStock = 5 } = {}) {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, {
    pricing: { price: 4000, currency: 'RWF' },
    inventory: { quantity: startingStock },
  });
  const { token } = await createConsumer();

  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
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

  return { order, listing, depositId, token };
}

function pollStatus(orderId, token) {
  return request(app)
    .get(`/api/v1/payments/status/${orderId}`)
    .set('Authorization', `Bearer ${token}`);
}

describe('GET /api/v1/payments/status/:orderId - idempotency (H9)', () => {
  it('should mark the Payment failed exactly once for two concurrent polls that see FAILED, leaving the order retryable (M9)', async () => {
    const { order, listing, token } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    const afterOrder = await Listing.findById(listing._id);
    expect(afterOrder.inventory.quantity).toBe(3); // 5 - 2 reserved

    mockRemoteStatus({ status: 'FAILED', failureReason: { code: 'X', description: 'Y' } });

    const [first, second] = await Promise.all([
      pollStatus(order._id, token),
      pollStatus(order._id, token),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.status).toBe('failed');
    expect(second.body.status).toBe('failed');

    // M9: a failed attempt does NOT cancel the order or release its stock -
    // the order stays pending_payment so the customer can retry the SAME
    // order (initiatePayment only requires pending_payment status).
    const afterPolls = await Listing.findById(listing._id);
    expect(afterPolls.inventory.quantity).toBe(3);
    expect(afterPolls.inventory.reserved).toBe(2);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('pending_payment');
  });

  it('should not double-process a failure seen by both the webhook and a concurrent poll', async () => {
    const { order, listing, depositId, token } = await createPendingMobileMoneyOrder({
      quantity: 2,
      startingStock: 5,
    });

    mockRemoteStatus({ status: 'FAILED' });

    const [webhookRes] = await Promise.all([
      request(app).post('/api/v1/payments/webhook').send({ depositId, status: 'FAILED' }),
      pollStatus(order._id, token),
    ]);
    expect(webhookRes.status).toBe(200);

    // Still just the one reservation from order creation - neither path
    // touched stock, and the Payment was claimed exactly once between them.
    const afterBoth = await Listing.findById(listing._id);
    expect(afterBoth.inventory.quantity).toBe(3);
    expect(afterBoth.inventory.reserved).toBe(2);

    const payment = await Payment.findOne({ depositId });
    expect(payment.status).toBe('failed');
  });

  it('should let the customer retry payment on the same order after a failed attempt (M9)', async () => {
    const { order, token } = await createPendingMobileMoneyOrder();
    mockRemoteStatus({ status: 'FAILED' });
    const failedPoll = await pollStatus(order._id, token);
    expect(failedPoll.body.status).toBe('failed');

    // initiatePayment's own pawaPay call - separate from the axios.get mock
    // used for the status-poll fallback above.
    axios.post.mockResolvedValue({ data: { status: 'ACCEPTED' } });

    const retryRes = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order._id, phoneNumber: '0788000000', correspondent: 'MTN_MOMO_RWA' });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    const paymentsForOrder = await Payment.find({ order: order._id }).sort({ createdAt: 1 });
    expect(paymentsForOrder).toHaveLength(2);
    expect(paymentsForOrder[0].status).toBe('failed');
    expect(paymentsForOrder[1].status).toBe('pending');
  });

  it('should mark the order paid once for two concurrent polls that see COMPLETED', async () => {
    const { order, token } = await createPendingMobileMoneyOrder();

    mockRemoteStatus({ status: 'COMPLETED', providerTransactionId: 'ptx-456' });

    const [first, second] = await Promise.all([
      pollStatus(order._id, token),
      pollStatus(order._id, token),
    ]);
    expect(first.body.status).toBe('completed');
    expect(second.body.status).toBe('completed');

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.payment.paymentStatus).toBe('completed');

    const payment = await Payment.findOne({ order: order._id });
    expect(payment.providerTransactionId).toBe('ptx-456');
  });
});
