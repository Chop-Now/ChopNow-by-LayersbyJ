/**
 * Consumer order cancellation tests (H15)
 *
 * Consumers can cancel from My Orders; the backend enforces the eligible
 * states (Order.canBeCancelled: pending_payment/paid/confirmed), restores
 * inventory, and - for a mobile-money order that was already paid - queues a
 * tracked refund instead of silently keeping the customer's money.
 */
const request = require('supertest');
const app = require('./app');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const RefundRequest = require('../models/RefundRequest');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  enableCashPayments,
} = require('./fixtures');

// These tests place cash orders; cash is off by default.
beforeEach(enableCashPayments);

async function placeOrder(paymentMethod = 'cash') {
  const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, { inventory: { quantity: 5 } });
  const { token } = await createConsumer();
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity: 2 }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod },
    });
  return { order: res.body, listing, token, vendorToken };
}

describe('PUT /api/v1/orders/:id/cancel (H15)', () => {
  it('should cancel a pending order and restore its inventory', async () => {
    const { order, listing, token } = await placeOrder();

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    expect((await Order.findById(order._id)).status).toBe('cancelled');
    expect((await Listing.findById(listing._id)).inventory.quantity).toBe(5);
    expect(await RefundRequest.countDocuments({ order: order._id })).toBe(0);
  });

  it('should refuse to cancel once the order is past the cancellable stage', async () => {
    const { order, token, vendorToken } = await placeOrder();
    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'ready_for_pickup' });

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id)).status).toBe('ready_for_pickup');
  });

  it('should queue a refund when cancelling an already-paid mobile money order', async () => {
    const { order, token } = await placeOrder('mobile_money');
    const payment = await Payment.create({
      order: order._id,
      depositId: `dep-${order._id}`,
      amount: order.pricing.total,
      payerPhoneNumber: '+250700000000',
      correspondent: 'MTN_MOMO_RWA',
      status: 'completed',
    });
    await Order.findByIdAndUpdate(order._id, {
      status: 'paid',
      'payment.paymentStatus': 'completed',
    });

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const refund = await RefundRequest.findOne({ order: order._id });
    expect(refund).not.toBeNull();
    expect(refund.amount).toBe(order.pricing.total);
    expect(refund.status).toBe('pending_manual');
    expect(String(refund.payment)).toBe(String(payment._id));
    expect((await Order.findById(order._id)).payment.paymentStatus).toBe('refund_pending');
  });
});
