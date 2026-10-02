/**
 * Pending-payment expiry + payment test-mode gating.
 *
 * - The expiry job must not cancel an order that got paid (or was already
 *   cancelled) between its find and its write, and must release stock once.
 * - A COMPLETED callback arriving after the expiry job timed the payment out
 *   is real money: it must be queued for refund, not ignored.
 * - C5: simulated payments are never allowed in pawaPay production, whatever
 *   PAYMENT_TEST_MODE says.
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./app');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Listing = require('../models/Listing');
const RefundRequest = require('../models/RefundRequest');
const { expirePendingPayments } = require('../services/pendingPaymentExpiryJob');
const { isPaymentTestMode } = require('../controllers/paymentController');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  placePendingMobileMoneyOrder,
} = require('./fixtures');

const HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);

async function stalePendingOrder() {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, { inventory: { quantity: 5 } });
  const { token } = await createConsumer();
  const { order, depositId } = await placePendingMobileMoneyOrder(token, listing, { quantity: 2 });
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(order._id) },
    { $set: { createdAt: HOUR_AGO } }
  );
  return { order, listing, depositId };
}

describe('pendingPaymentExpiryJob', () => {
  it('should cancel a stale unpaid order, fail its payment and release stock once', async () => {
    const { order, listing, depositId } = await stalePendingOrder();

    await Promise.all([expirePendingPayments(), expirePendingPayments()]);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('cancelled');
    expect(updatedOrder.payment.paymentStatus).toBe('failed');
    const payment = await Payment.findOne({ depositId });
    expect(payment.status).toBe('failed');
    expect(payment.failureReason.code).toBe('TIMEOUT');
    expect((await Listing.findById(listing._id)).inventory.quantity).toBe(5);
  });

  it('should leave an order alone if it was paid before the job wrote', async () => {
    const { order, listing, depositId } = await stalePendingOrder();
    await request(app).post('/api/v1/payments/webhook').send({ depositId, status: 'COMPLETED' });

    await expirePendingPayments();

    expect((await Order.findById(order._id)).status).toBe('paid');
    expect((await Listing.findById(listing._id)).inventory.quantity).toBe(3);
  });

  it('should queue a refund when the payment completes after being timed out', async () => {
    const { order, depositId } = await stalePendingOrder();
    await expirePendingPayments();

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId, status: 'COMPLETED', providerTransactionId: 'late' });
    expect(res.status).toBe(200);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('cancelled');
    expect(updatedOrder.payment.paymentStatus).toBe('refund_pending');
    expect(await RefundRequest.countDocuments({ order: order._id })).toBe(1);
    expect((await Payment.findOne({ depositId })).status).toBe('completed');
  });
});

describe('isPaymentTestMode (C5)', () => {
  const saved = {};
  beforeEach(() => {
    saved.env = process.env.PAWAPAY_ENVIRONMENT;
    saved.mode = process.env.PAYMENT_TEST_MODE;
  });
  afterEach(() => {
    if (saved.env === undefined) delete process.env.PAWAPAY_ENVIRONMENT;
    else process.env.PAWAPAY_ENVIRONMENT = saved.env;
    if (saved.mode === undefined) delete process.env.PAYMENT_TEST_MODE;
    else process.env.PAYMENT_TEST_MODE = saved.mode;
  });

  it('is never on in pawaPay production, even with PAYMENT_TEST_MODE=true', () => {
    process.env.PAWAPAY_ENVIRONMENT = 'production';
    process.env.PAYMENT_TEST_MODE = 'true';
    expect(isPaymentTestMode()).toBe(false);
  });

  it('is on in sandbox unless explicitly disabled', () => {
    process.env.PAWAPAY_ENVIRONMENT = 'sandbox';
    delete process.env.PAYMENT_TEST_MODE;
    expect(isPaymentTestMode()).toBe(true);
    process.env.PAYMENT_TEST_MODE = 'false';
    expect(isPaymentTestMode()).toBe(false);
  });
});
