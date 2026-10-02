/**
 * Payout rules and transparency:
 *  - earnings are held N days after an order completes before they can be
 *    withdrawn;
 *  - one payout request per N days (a failed/cancelled payout doesn't count);
 *  - a vendor-fault refund comes out of held money / the balance, and out of a
 *    still-unpaid payout request if the balance can't cover it;
 *  - every change is a row in the balance history (ledger) that the vendor and
 *    admins can read, and the vendor is notified.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('./app');
const Business = require('../models/Business');
const User = require('../models/User');
const Payout = require('../models/Payout');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const BalanceTransaction = require('../models/BalanceTransaction');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  placePaidOrder,
  setPayoutRules,
  eventually,
} = require('./fixtures');

const DAY = 24 * 60 * 60 * 1000;

async function adminToken() {
  const email = `admin-${Date.now()}-${Math.random()}@example.com`;
  await User.create({
    email,
    passwordHash: await bcrypt.hash('Password1', 12),
    firstName: 'Ad',
    lastName: 'Min',
    roles: ['admin'],
    activeRole: 'admin',
    emailVerified: true,
  });
  const res = await request(app).post('/api/v1/users/login').send({ email, password: 'Password1' });
  return res.body.token;
}

/** A vendor with one completed, paid 10,000 RWF order (vendor share 9,000). */
async function vendorWithCompletedOrder() {
  const vendor = await createBusinessOwnerWithBusiness();
  const listing = await createListing(vendor.business, {
    pricing: { price: 10000, currency: 'RWF' },
  });
  const { token: buyer, user: buyerUser } = await createConsumer();
  const { order } = await placePaidOrder(buyer, listing);
  const done = await request(app)
    .put(`/api/v1/orders/${order._id}/status`)
    .set('Authorization', `Bearer ${vendor.token}`)
    .send({ status: 'completed' });
  expect(done.status).toBe(200);
  return { ...vendor, order, buyerUser };
}

/** Moves the holding period of this business's earnings into the past. */
const releaseHolds = (businessId) =>
  BalanceTransaction.updateMany(
    { business: businessId, type: 'order_earning' },
    { $set: { availableAt: new Date(Date.now() - 1000) } }
  );

const me = (token) =>
  request(app).get('/api/v1/payouts/me').set('Authorization', `Bearer ${token}`);
const requestPayout = (token, amount) =>
  request(app)
    .post('/api/v1/payouts/request')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount, method: 'mobile' });

describe('Holding period', () => {
  it('holds new earnings, shows when they release, then lets them be withdrawn', async () => {
    await setPayoutRules({ holdDays: 7, intervalDays: 0 });
    const { token, business } = await vendorWithCompletedOrder();

    const held = await me(token);
    expect(held.body).toMatchObject({
      balance: 9000,
      availableBalance: 0,
      heldAmount: 9000,
      holdDays: 7,
    });
    expect(held.body.releases).toHaveLength(1);
    const releaseIn = new Date(held.body.releases[0].availableAt) - Date.now();
    expect(releaseIn).toBeGreaterThan(6.9 * DAY);

    const tooEarly = await requestPayout(token, 5000);
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.message).toMatch(/on hold/);
    expect((await Business.findById(business._id)).stats.balance).toBe(9000);

    await releaseHolds(business._id);
    const released = await me(token);
    expect(released.body).toMatchObject({ availableBalance: 9000, heldAmount: 0 });
    expect((await requestPayout(token, 9000)).status).toBe(201);
  });
});

describe('One payout request per interval', () => {
  it('blocks a second request inside the interval and says when the next is possible', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 7 });
    const { token, business } = await vendorWithCompletedOrder();
    // Enough for two payouts, so only the interval rule can stop the second.
    await Business.findByIdAndUpdate(business._id, { 'stats.balance': 20000 });

    expect((await requestPayout(token, 5000)).status).toBe(201);
    const second = await requestPayout(token, 5000);
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/one payout every 7 days/);
    expect(new Date(second.body.nextRequestAt) - Date.now()).toBeGreaterThan(6.9 * DAY);

    const status = await me(token);
    expect(status.body.nextRequestAt).toBeTruthy();
    expect(status.body.availableBalance).toBe(15000);
  });

  it('allows only one of two simultaneous requests', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 7 });
    const { token, business } = await vendorWithCompletedOrder();
    const results = await Promise.all([requestPayout(token, 5000), requestPayout(token, 5000)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect((await Business.findById(business._id)).stats.balance).toBe(4000);
  });

  it('lets the vendor request again straight away after a payout fails', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 7 });
    const { token, business } = await vendorWithCompletedOrder();
    const first = await requestPayout(token, 9000);
    const admin = await adminToken();
    await request(app)
      .patch(`/api/v1/payouts/${first.body._id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'failed', failureReason: 'Wrong number' });

    expect((await Business.findById(business._id)).stats.balance).toBe(9000);
    expect((await requestPayout(token, 9000)).status).toBe(201);
  });
});

describe('Refunds come out of the vendor side before money leaves', () => {
  async function resolveVendorFaultRefund(vendor, amount) {
    const dispute = await Dispute.create({
      order: vendor.order._id,
      customer: vendor.buyerUser._id,
      business: vendor.business._id,
      type: 'poor_quality',
      title: 'Bad food',
      description: 'The food was not good at all.',
    });
    const res = await request(app)
      .patch(`/api/v1/disputes/${dispute._id}/resolve`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .send({ action: 'partial_refund', amount, refundFundedBy: 'vendor' });
    expect(res.status).toBe(200);
    return dispute;
  }

  it('deducts from held earnings, so less becomes available', async () => {
    await setPayoutRules({ holdDays: 7, intervalDays: 0 });
    const vendor = await vendorWithCompletedOrder();
    // Order total 10,000; half refunded -> vendor share 4,500 deducted.
    await resolveVendorFaultRefund(vendor, 5000);

    const status = await me(vendor.token);
    expect(status.body).toMatchObject({ balance: 4500, heldAmount: 4500, availableBalance: 0 });
    await releaseHolds(vendor.business._id);
    expect((await me(vendor.token)).body.availableBalance).toBe(4500);
  });

  it('reduces a payout request that has not been paid yet when the balance cannot cover the refund', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 7 });
    const vendor = await vendorWithCompletedOrder();
    const payout = await requestPayout(vendor.token, 9000); // balance now 0
    expect(payout.status).toBe(201);

    await resolveVendorFaultRefund(vendor, 5000); // vendor share 4,500

    const reduced = await Payout.findById(payout.body._id);
    expect(reduced.amount).toBe(4500);
    expect(reduced.requestedAmount).toBe(9000);
    expect(reduced.adjustments).toHaveLength(1);
    expect(reduced.adjustments[0].amount).toBe(-4500);
    expect((await Business.findById(vendor.business._id)).stats.balance).toBe(0);

    // The vendor was told, in plain words.
    const note = await eventually(() =>
      Notification.findOne({ user: vendor.user._id, type: 'payout_update' })
    );
    expect(note.message).toMatch(/reduced by 4,?500/);
  });

  it('never touches a payout the admin is already sending', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 0 });
    const vendor = await vendorWithCompletedOrder();
    const payout = await requestPayout(vendor.token, 9000);
    await request(app)
      .patch(`/api/v1/payouts/${payout.body._id}/status`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .send({ status: 'processing' });

    await resolveVendorFaultRefund(vendor, 5000);
    expect((await Payout.findById(payout.body._id)).amount).toBe(9000);
    // The vendor owes it back from future earnings.
    expect((await Business.findById(vendor.business._id)).stats.balance).toBe(-4500);
  });
});

describe('Balance history (ledger)', () => {
  it('records every movement with a running balance, visible to the vendor and admins only', async () => {
    await setPayoutRules({ holdDays: 0, intervalDays: 0 });
    const vendor = await vendorWithCompletedOrder();
    const payout = await requestPayout(vendor.token, 6000);
    const admin = await adminToken();
    await request(app)
      .patch(`/api/v1/payouts/${payout.body._id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'processing' });
    await request(app)
      .patch(`/api/v1/payouts/${payout.body._id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'completed', reference: 'MTN-REF-9' });

    const own = await request(app)
      .get('/api/v1/payouts/ledger')
      .set('Authorization', `Bearer ${vendor.token}`);
    expect(own.status).toBe(200);
    const rows = own.body.entries; // newest first
    expect(rows.map((r) => r.type)).toEqual(['payout', 'order_earning']);
    expect(rows[1]).toMatchObject({ amount: 9000, balanceAfter: 9000 });
    expect(rows[1].order.orderNumber).toBe(vendor.order.orderNumber);
    expect(rows[0]).toMatchObject({ amount: -6000, balanceAfter: 3000 });
    expect(rows[0].payout).toMatchObject({ status: 'completed', reference: 'MTN-REF-9' });

    // Admin can read this vendor's history...
    const asAdmin = await request(app)
      .get(`/api/v1/payouts/ledger?business=${vendor.business._id}`)
      .set('Authorization', `Bearer ${admin}`);
    expect(asAdmin.body.entries).toHaveLength(2);

    // ...another vendor can't (the ?business= switch is admin-only).
    const other = await createBusinessOwnerWithBusiness();
    const snoop = await request(app)
      .get(`/api/v1/payouts/ledger?business=${vendor.business._id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(snoop.status).toBe(200);
    expect(snoop.body.entries).toHaveLength(0);

    // The vendor was told about each payout step.
    const notes = await eventually(async () => {
      const found = await Notification.find({ user: vendor.user._id, type: 'payout_update' });
      return found.length >= 2 ? found : null;
    });
    expect(notes.map((n) => n.title).sort()).toEqual(['Payout approved', 'Payout sent']);
  });
});
