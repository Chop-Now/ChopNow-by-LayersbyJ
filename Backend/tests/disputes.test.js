/**
 * Dispute resolution money-correctness tests (C8)
 *
 * Covers: resolving a dispute with a refund action must actually create a
 * traceable refund record (there is no real pawaPay refund API integrated,
 * so this is the tracked pending_manual RefundRequest queue) and update the
 * order's payment status - not just flip dispute.status to 'resolved' with
 * nothing behind it.
 *
 * Dispute/Payment fixtures are created directly via their models rather than
 * through POST /disputes, to keep this suite focused on resolveDispute's
 * money-correctness rather than dispute creation. See
 * disputes-creation.test.js for coverage of POST /api/v1/disputes itself
 * (previously broken: the request validator's `type` enum didn't match the
 * Dispute model's enum, title/description weren't validated, and the
 * controller read a nonexistent `orderId` field instead of `order` - now
 * fixed).
 */
const request = require('supertest');
const app = require('./app');
const Dispute = require('../models/Dispute');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const RefundRequest = require('../models/RefundRequest');
const { createConsumer, createBusinessOwnerWithBusiness, createListing } = require('./fixtures');

async function createDisputedOrder() {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, { pricing: { price: 4000, currency: 'RWF' } });
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
  const order = orderRes.body;

  const payment = await Payment.create({
    order: order._id,
    depositId: `dep-${order._id}`,
    amount: order.pricing.total,
    currency: order.pricing.currency,
    payerPhoneNumber: '+250700000000',
    correspondent: 'MTN_MOMO_RWA',
    status: 'completed',
  });

  const dispute = await Dispute.create({
    order: order._id,
    customer: consumer._id,
    business: business._id,
    type: 'poor_quality',
    title: 'Food was cold',
    description: 'The order arrived cold and inedible on arrival at pickup time.',
  });

  return { dispute, order, payment, business, consumer };
}

// Admin fixture for resolving disputes.
async function createAdmin() {
  const bcrypt = require('bcrypt');
  const User = require('../models/User');
  const email = `admin-dispute-${Date.now()}-${Math.random()}@example.com`;
  const passwordHash = await bcrypt.hash('Password1', 12);
  await User.create({
    email,
    passwordHash,
    firstName: 'Test',
    lastName: 'Admin',
    roles: ['admin'],
    activeRole: 'admin',
    status: 'active',
  });
  const res = await request(app).post('/api/v1/users/login').send({ email, password: 'Password1' });
  return res.body.token;
}

describe('PATCH /api/v1/disputes/:id/resolve - refunds must move money (C8)', () => {
  it('should create a traceable RefundRequest and mark the order refund-pending on full_refund', async () => {
    const { dispute, order, payment } = await createDisputedOrder();
    const adminToken = await createAdmin();

    const res = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund', comment: 'Confirmed cold food on arrival' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    expect(res.body.resolution.amount).toBe(order.pricing.total);

    const refundRequest = await RefundRequest.findOne({ dispute: dispute._id });
    expect(refundRequest).not.toBeNull();
    expect(refundRequest.status).toBe('pending_manual');
    expect(refundRequest.amount).toBe(order.pricing.total);
    expect(refundRequest.payment.toString()).toBe(payment._id.toString());

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.payment.paymentStatus).toBe('refund_pending');
  });

  it('should honor a partial_refund amount and reject one exceeding the order total', async () => {
    const { dispute, order } = await createDisputedOrder();
    const adminToken = await createAdmin();

    const tooMuch = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'partial_refund', amount: order.pricing.total + 1000 });
    expect(tooMuch.status).toBe(400);

    const ok = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'partial_refund', amount: 1000 });
    expect(ok.status).toBe(200);
    expect(ok.body.resolution.amount).toBe(1000);

    const refundRequest = await RefundRequest.findOne({ dispute: dispute._id });
    expect(refundRequest.amount).toBe(1000);
  });

  it('should not allow resolving (and re-refunding) the same dispute twice', async () => {
    const { dispute } = await createDisputedOrder();
    const adminToken = await createAdmin();

    const first = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });
    expect(second.status).toBe(400);

    const refundRequests = await RefundRequest.find({ dispute: dispute._id });
    expect(refundRequests).toHaveLength(1);
  });

  it('should queue exactly one refund for two concurrent resolve calls', async () => {
    const { dispute } = await createDisputedOrder();
    const adminToken = await createAdmin();

    const results = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .patch(`/api/v1/disputes/${dispute._id}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ action: 'full_refund' })
      )
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await RefundRequest.countDocuments({ dispute: dispute._id })).toBe(1);
  });

  it('should not refund more than the order total across refunds for the same order', async () => {
    const { dispute, order, consumer, business } = await createDisputedOrder();
    const adminToken = await createAdmin();
    // e.g. the order was already refunded in part (or in full, by cancellation).
    await RefundRequest.create({
      order: order._id,
      business: business._id,
      customer: consumer._id,
      amount: order.pricing.total - 1000,
      requestedBy: consumer._id,
    });

    const full = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });
    expect(full.status).toBe(400);
    // The failed attempt must not leave the dispute stuck as resolved.
    expect((await Dispute.findById(dispute._id)).status).toBe('open');

    const rest = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'partial_refund', amount: 1000 });
    expect(rest.status).toBe(200);
  });

  it('should resolve non-refund actions (e.g. rejected) without creating a RefundRequest', async () => {
    const { dispute } = await createDisputedOrder();
    const adminToken = await createAdmin();

    const res = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'rejected', comment: 'No evidence of an issue' });

    expect(res.status).toBe(200);
    const refundRequest = await RefundRequest.findOne({ dispute: dispute._id });
    expect(refundRequest).toBeNull();
  });
});

describe('GET /api/v1/disputes/refund-requests - ops queue', () => {
  it('should list pending refund requests for admins', async () => {
    const { dispute } = await createDisputedOrder();
    const adminToken = await createAdmin();

    await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });

    const res = await request(app)
      .get('/api/v1/disputes/refund-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refundRequests.length).toBeGreaterThanOrEqual(1);
    expect(res.body.refundRequests[0].status).toBe('pending_manual');
  });

  it('should record a refund as paid exactly once and mark a fully refunded order refunded', async () => {
    const { dispute, order } = await createDisputedOrder();
    const adminToken = await createAdmin();
    await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });
    const refund = await RefundRequest.findOne({ dispute: dispute._id });

    const settle = () =>
      request(app)
        .patch(`/api/v1/disputes/refund-requests/${refund._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed', notes: 'MTN ref 123' });
    const [first, second] = await Promise.all([settle(), settle()]);
    expect([first.status, second.status].sort()).toEqual([200, 400]);

    const updated = await RefundRequest.findById(refund._id);
    expect(updated.status).toBe('completed');
    expect(updated.notes).toBe('MTN ref 123');
    expect((await Order.findById(order._id)).payment.paymentStatus).toBe('refunded');
  });

  it('should reject an invalid refund outcome', async () => {
    const adminToken = await createAdmin();
    const { dispute } = await createDisputedOrder();
    await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'full_refund' });
    const refund = await RefundRequest.findOne({ dispute: dispute._id });
    const res = await request(app)
      .patch(`/api/v1/disputes/refund-requests/${refund._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending_manual' });
    expect(res.status).toBe(400);
  });
});
