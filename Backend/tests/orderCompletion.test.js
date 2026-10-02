/**
 * Order completion money-correctness tests (Phase 2)
 *
 * Covers:
 *   C7 - completing an order must fund Business.stats.balance by
 *        order.pricing.vendorAmount - this is "the single most important fix
 *        in the entire audit," since without it payouts are structurally
 *        impossible.
 *   H6 - completing the same order twice (retried/duplicated request) must
 *        only credit the balance and increment stats once.
 *   H7 - cancellation must always go through the dedicated /cancel endpoint,
 *        which restores reserved inventory; the generic status endpoint no
 *        longer accepts 'cancelled' at all.
 *   H8 - a payout that already reached a terminal state (completed/failed/
 *        cancelled) can never be transitioned again, so its balance-refund
 *        $inc can't fire twice.
 */
const request = require('supertest');
const app = require('./app');
const Business = require('../models/Business');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  placePendingMobileMoneyOrder,
  placePaidOrder,
  enableCashPayments,
  setPayoutRules,
} = require('./fixtures');

// These tests place cash orders; cash is off by default.
beforeEach(enableCashPayments);
// These tests withdraw right after completing an order: no holding period or
// request interval here (those rules are covered in payoutRules.test.js).
beforeEach(() => setPayoutRules({ holdDays: 0, intervalDays: 0 }));

/**
 * Places a pickup order paid by mobile money (through the real webhook) and
 * returns the created order body. Only mobile-money money reaches the
 * platform, so only these fund the payout balance.
 */
async function placeOrder(consumerToken, listing, quantity = 1) {
  const { order } = await placePaidOrder(consumerToken, listing, { quantity });
  return order;
}

async function placeCashOrder(consumerToken, listing) {
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${consumerToken}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity: 1 }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod: 'cash' },
    });
  return res.body;
}

describe('Order status guards - no crediting unpaid or already-completed orders', () => {
  it('should not let a vendor progress or complete an unpaid mobile-money order', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const { order } = await placePendingMobileMoneyOrder(consumerToken, listing);

    for (const status of ['confirmed', 'completed']) {
      const res = await request(app)
        .put(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status });
      expect(res.status).toBe(400);
    }

    const pickupRes = await request(app)
      .post(`/api/v1/orders/${order._id}/verify-pickup`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ pickupCode: order.pickupDetails.pickupCode });
    expect(pickupRes.status).toBe(400);

    expect((await Order.findById(order._id)).status).toBe('pending_payment');
    expect((await Business.findById(business._id)).stats.balance).toBe(0);
  });

  it('should not let a vendor set "paid" directly', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { token: consumerToken } = await createConsumer();
    const { order } = await placePendingMobileMoneyOrder(consumerToken, listing);

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'paid' });
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id)).status).toBe('pending_payment');
  });

  it('should ignore a client-supplied paymentStatus when creating an order', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { token: consumerToken } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'mobile_money', paymentStatus: 'completed' },
      });
    expect(res.status).toBe(201);
    expect(res.body.payment.paymentStatus).toBe('pending');
  });

  it('should not let a completed order be moved back and completed (credited) again', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);

    const send = (status) =>
      request(app)
        .put(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status });

    expect((await send('completed')).status).toBe(200);
    expect((await send('confirmed')).status).toBe(400);
    expect((await send('completed')).status).toBe(400);
    expect((await Business.findById(business._id)).stats.balance).toBe(5400);
  });

  it('should complete a cash order without crediting the payout balance', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeCashOrder(consumerToken, listing);

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);

    const updated = await Business.findById(business._id);
    // The customer paid the vendor in cash - the platform holds nothing to pay out.
    expect(updated.stats.balance).toBe(0);
    expect(updated.stats.impact.mealsRescued).toBe(1);
  });
});

describe('PUT /api/v1/orders/:id/status - completion funds the payout balance (C7/H6)', () => {
  it("should credit the business's balance by exactly the order's vendorAmount", async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();

    const order = await placeOrder(consumerToken, listing);
    expect(order.pricing.vendorAmount).toBe(5400); // 6000 - 10% platform fee

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    // The response (and socket broadcast) must reflect the completion, not the
    // pre-completion copy loaded before the atomic update.
    expect(res.body.status).toBe('completed');

    const updatedBusiness = await Business.findById(business._id);
    expect(updatedBusiness.stats.balance).toBe(5400);
  });

  it('should only credit the balance once even if "completed" is sent twice', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);

    const first = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });
    expect(second.status).toBe(400);

    const updatedBusiness = await Business.findById(business._id);
    expect(updatedBusiness.stats.balance).toBe(5400);
  });

  it('should let the vendor request a payout from a freshly-credited balance', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);

    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });

    const payoutRes = await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ amount: 5000, method: 'mobile' });

    expect(payoutRes.status).toBe(201);

    const updatedBusiness = await Business.findById(business._id);
    expect(updatedBusiness.stats.balance).toBe(400); // 5400 - 5000
  });
});

describe('POST /api/v1/payouts/request - balance deduction is atomic with the payout record', () => {
  it('should not deduct the balance if creating the Payout record fails', async () => {
    const Payout = require('../models/Payout');
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);
    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });

    const spy = jest.spyOn(Payout, 'create').mockRejectedValueOnce(new Error('simulated failure'));
    try {
      const res = await request(app)
        .post('/api/v1/payouts/request')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ amount: 5000, method: 'mobile' });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    const updatedBusiness = await Business.findById(business._id);
    expect(updatedBusiness.stats.balance).toBe(5400); // untouched
    expect(await Payout.countDocuments({ business: business._id })).toBe(0);
  });

  it('should reject a payout larger than the balance without deducting anything', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    await Business.findByIdAndUpdate(business._id, { 'stats.balance': 6000 });

    const res = await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ amount: 7000, method: 'mobile' });

    expect(res.status).toBe(400);
    const updatedBusiness = await Business.findById(business._id);
    expect(updatedBusiness.stats.balance).toBe(6000);
  });
});

describe('PUT /api/v1/orders/:id/status - cancellation routing (H7)', () => {
  it('should reject "cancelled" on the generic status endpoint', async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
  });

  it('should restore inventory when cancelling via the dedicated /cancel endpoint', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { inventory: { quantity: 5 } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing, 2);

    const afterOrder = await Listing.findById(listing._id);
    expect(afterOrder.inventory.quantity).toBe(3); // 5 - 2 reserved

    const res = await request(app)
      .put(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(res.status).toBe(200);

    const afterCancel = await Listing.findById(listing._id);
    expect(afterCancel.inventory.quantity).toBe(5); // fully restored
  });
});

describe('PATCH /api/v1/payouts/:id/status - terminal-state guard (H8)', () => {
  it('should refund the balance exactly once even if "failed" is sent twice', async () => {
    const {
      token: vendorToken,
      user: vendorUser,
      business,
    } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 6000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);

    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });

    const payoutRes = await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ amount: 5000, method: 'mobile' });
    const payoutId = payoutRes.body._id;

    // Promote the requesting user to admin in-place so it can call the admin-only
    // payout status endpoint without a second registration round trip.
    const User = require('../models/User');
    await User.findByIdAndUpdate(vendorUser._id, { $addToSet: { roles: 'admin' } });
    const adminLogin = await request(app)
      .post('/api/v1/users/login')
      .send({ email: vendorUser.email, password: 'Password1' });
    const adminToken = adminLogin.body.token;

    const first = await request(app)
      .patch(`/api/v1/payouts/${payoutId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'failed' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/v1/payouts/${payoutId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'failed' });
    expect(second.status).toBe(400);

    const updatedBusiness = await Business.findById(business._id);
    // 5400 - 5000 (payout) + 5000 (single refund) = 5400, never 10400.
    expect(updatedBusiness.stats.balance).toBe(5400);
  });
});

describe('GET /api/v1/payouts/me - balance for the payouts screen', () => {
  it("should return the vendor's withdrawable balance, pending requests and the minimum", async () => {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { pricing: { price: 10000, currency: 'RWF' } });
    const { token: consumerToken } = await createConsumer();
    const order = await placeOrder(consumerToken, listing);
    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'completed' });

    const before = await request(app)
      .get('/api/v1/payouts/me')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ balance: 9000, pendingAmount: 0, minimumWithdrawal: 5000 });

    await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ amount: 6000, method: 'mobile' });
    const after = await request(app)
      .get('/api/v1/payouts/me')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(after.body).toMatchObject({ balance: 3000, pendingAmount: 6000 });
    expect(after.body.payouts).toHaveLength(1);
  });
});

describe('POST /api/v1/payouts/request - payout destination', () => {
  async function vendorWithBalance(businessOverrides = {}) {
    const { token, business } = await createBusinessOwnerWithBusiness(businessOverrides);
    await Business.findByIdAndUpdate(business._id, { 'stats.balance': 9000 });
    return { token, business };
  }

  it('should snapshot the payout destination so later edits cannot redirect it', async () => {
    const { token, business } = await vendorWithBalance();
    const res = await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000, method: 'mobile' });
    expect(res.status).toBe(201);
    expect(res.body.destination).toMatchObject({ provider: 'MTN', phone: '0788000000' });

    // The vendor (or someone in their account) changes the number afterwards...
    await Business.findByIdAndUpdate(business._id, { 'payoutInfo.mobilePhone': '0799999999' });
    const Payout = require('../models/Payout');
    const saved = await Payout.findById(res.body._id);
    // ...the requested payout still goes to the original number.
    expect(saved.destination.phone).toBe('0788000000');
  });

  it('should refuse a payout with no payout details, without touching the balance', async () => {
    const { token, business } = await vendorWithBalance({
      payoutInfo: { preferredMethod: 'mobile' },
    });
    const res = await request(app)
      .post('/api/v1/payouts/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000, method: 'mobile' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payout details/);
    expect((await Business.findById(business._id)).stats.balance).toBe(9000);
  });
});
