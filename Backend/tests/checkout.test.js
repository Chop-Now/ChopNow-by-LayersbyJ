/**
 * Multi-vendor checkout: one payment for a cart spanning several vendors,
 * one order per vendor, platform-set delivery fee + rider commission, tax
 * line, cash toggle, and vendor-vs-platform funded dispute refunds.
 */
const request = require('supertest');
const app = require('./app');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const RefundRequest = require('../models/RefundRequest');
const Dispute = require('../models/Dispute');
const PlatformSettings = require('../models/PlatformSettings');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  enableCashPayments,
  eventually,
} = require('./fixtures');

async function setSettings(values) {
  const settings = await PlatformSettings.getSettings();
  Object.assign(settings, values);
  await settings.save();
}

/**
 * Vendor A sells two listings (3000 and 2000), vendor B one (4000). All offer
 * delivery. Returns tokens, businesses, listings and a ready-made cart.
 */
async function twoVendorCart() {
  const a = await createBusinessOwnerWithBusiness({ name: 'Vendor A' });
  const b = await createBusinessOwnerWithBusiness({ name: 'Vendor B' });
  const a1 = await createListing(a.business, {
    title: 'A bread',
    fulfillment: 'delivery',
    pricing: { price: 3000, currency: 'RWF' },
    inventory: { quantity: 10 },
  });
  const a2 = await createListing(a.business, {
    title: 'A cake',
    fulfillment: 'delivery',
    pricing: { price: 2000, currency: 'RWF' },
    inventory: { quantity: 10 },
  });
  const b1 = await createListing(b.business, {
    title: 'B rice',
    fulfillment: 'delivery',
    pricing: { price: 4000, currency: 'RWF' },
    inventory: { quantity: 10 },
  });
  const { token: buyer, user: buyerUser } = await createConsumer();
  const items = [
    { listing: String(a1._id), quantity: 2, unitPrice: 1 }, // unitPrice is ignored
    { listing: String(a2._id), quantity: 1 },
    { listing: String(b1._id), quantity: 1 },
  ];
  return { a, b, a1, a2, b1, buyer, buyerUser, items };
}

const checkout = (token, body) =>
  request(app).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${token}`).send(body);

const deliveryBody = (items, paymentMethod = 'mobile_money') => ({
  items,
  fulfillmentType: 'delivery',
  deliveryDetails: { address: 'KG 11 Ave', location: { lat: -1.95, lng: 30.07 } },
  payment: { paymentMethod },
});

async function payCheckout(token, checkoutId, status = 'COMPLETED') {
  const orders = await Order.find({ checkoutGroup: checkoutId, status: 'pending_payment' });
  const depositId = `dep-${checkoutId}-${Date.now()}`;
  await Payment.create({
    order: orders[0]._id,
    orders: orders.map((o) => o._id),
    checkoutGroup: checkoutId,
    depositId,
    amount: orders.reduce((s, o) => s + o.pricing.total, 0),
    payerPhoneNumber: '250780000000',
    correspondent: 'MTN_MOMO_RWA',
  });
  await request(app).post('/api/v1/payments/webhook').send({ depositId, status });
  return depositId;
}

describe('POST /api/v1/orders/quote', () => {
  it('prices a multi-vendor cart per vendor with platform delivery fee, commission and tax', async () => {
    await setSettings({ deliveryFee: 1500, deliveryCommissionPercent: 10, taxPercent: 18 });
    const { a, b, buyer, items } = await twoVendorCart();

    const res = await request(app)
      .post('/api/v1/orders/quote')
      .set('Authorization', `Bearer ${buyer}`)
      .send({ items, fulfillmentType: 'delivery' });
    expect(res.status).toBe(200);
    expect(res.body.vendors).toHaveLength(2);

    const vA = res.body.vendors.find((v) => v.business._id === String(a.business._id));
    const vB = res.body.vendors.find((v) => v.business._id === String(b.business._id));
    // A: 2x3000 + 1x2000 = 8000 (the client's unitPrice of 1 is ignored)
    expect(vA.pricing.subtotal).toBe(8000);
    expect(vA.pricing.deliveryFee).toBe(1500);
    expect(vA.pricing.deliveryCommission).toBe(150);
    expect(vA.pricing.riderAmount).toBe(1350);
    expect(vA.pricing.platformFee).toBe(800);
    expect(vA.pricing.vendorAmount).toBe(7200);
    expect(vA.pricing.tax).toBe(Math.round((8000 + 1500) * 0.18)); // 1710
    expect(vA.pricing.total).toBe(8000 + 1500 + 1710);
    expect(vB.pricing.subtotal).toBe(4000);
    expect(res.body.totals.total).toBe(vA.pricing.total + vB.pricing.total);
    expect(res.body.totals.deliveryFee).toBe(3000);
    expect(res.body.options).toMatchObject({ cashPaymentsEnabled: false, taxPercent: 18 });

    // The placed orders (and so the payment) must carry exactly the quoted
    // totals, tax included.
    const placed = await checkout(buyer, deliveryBody(items));
    expect(placed.status).toBe(201);
    const saved = await Order.find({ checkoutGroup: placed.body.checkoutId });
    expect(saved.reduce((sum, o) => sum + o.pricing.total, 0)).toBe(res.body.totals.total);
    expect(saved.every((o) => /^ORD-\d{8}-[0-9A-F]{8}$/.test(o.orderNumber))).toBe(true);
  });

  it('explains what the customer must fix', async () => {
    const { a, buyer } = await twoVendorCart();
    const pickupOnly = await createListing(a.business, { title: 'Pickup soup' });
    const low = await createListing(a.business, {
      title: 'Last pie',
      inventory: { quantity: 1 },
    });
    const quote = (body) =>
      request(app).post('/api/v1/orders/quote').set('Authorization', `Bearer ${buyer}`).send(body);

    const delivery = await quote({
      items: [{ listing: String(pickupOnly._id), quantity: 1 }],
      fulfillmentType: 'delivery',
    });
    expect(delivery.status).toBe(400);
    expect(delivery.body.message).toMatch(/pickup only/);

    const stock = await quote({
      items: [{ listing: String(low._id), quantity: 3 }],
      fulfillmentType: 'pickup',
    });
    expect(stock.status).toBe(400);
    expect(stock.body.message).toMatch(/Only 1/);

    const cash = await quote({
      items: [{ listing: String(low._id), quantity: 1 }],
      fulfillmentType: 'pickup',
      payment: { paymentMethod: 'cash' },
    });
    expect(cash.status).toBe(400);
    expect(cash.body.message).toMatch(/Cash payments are not available/);

    const badQty = await quote({
      items: [{ listing: String(low._id), quantity: 0 }],
      fulfillmentType: 'pickup',
    });
    expect(badQty.status).toBe(400);
  });
});

describe('POST /api/v1/orders/checkout', () => {
  it('creates one order per vendor in one checkout group and reserves each listing', async () => {
    const { a, b, a1, a2, b1, buyer, items } = await twoVendorCart();

    const res = await checkout(buyer, deliveryBody(items));
    expect(res.status).toBe(201);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.checkoutId).toBeTruthy();

    const orders = await Order.find({ checkoutGroup: res.body.checkoutId });
    expect(orders).toHaveLength(2);
    const oA = orders.find((o) => String(o.business) === String(a.business._id));
    const oB = orders.find((o) => String(o.business) === String(b.business._id));
    expect(oA.items).toHaveLength(2);
    expect(oA.pricing.subtotal).toBe(8000);
    expect(oB.items).toHaveLength(1);
    expect(oB.pricing.subtotal).toBe(4000);
    expect(orders.every((o) => o.status === 'pending_payment')).toBe(true);
    expect(res.body.totals.total).toBe(oA.pricing.total + oB.pricing.total);

    expect((await Listing.findById(a1._id)).inventory.quantity).toBe(8);
    expect((await Listing.findById(a2._id)).inventory.quantity).toBe(9);
    expect((await Listing.findById(b1._id)).inventory.quantity).toBe(9);
  });

  it('places nothing if any line fails while reserving (all or nothing)', async () => {
    const { a1, b1, buyer, items } = await twoVendorCart();
    const original = Listing.findOneAndUpdate.bind(Listing);
    let calls = 0;
    const spy = jest.spyOn(Listing, 'findOneAndUpdate').mockImplementation((...args) => {
      calls += 1;
      // The third reservation "loses" a race for the last stock.
      return calls === 3 ? Promise.resolve(null) : original(...args);
    });
    try {
      const res = await checkout(buyer, deliveryBody(items));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Not enough stock/);
    } finally {
      spy.mockRestore();
    }
    expect(await Order.countDocuments({})).toBe(0);
    expect((await Listing.findById(a1._id)).inventory.quantity).toBe(10);
    expect((await Listing.findById(b1._id)).inventory.quantity).toBe(10);
  });

  it('rejects cash while cash payments are switched off, allows it when on', async () => {
    const { buyer, items } = await twoVendorCart();
    const off = await checkout(buyer, deliveryBody(items, 'cash'));
    expect(off.status).toBe(400);
    await enableCashPayments();
    const on = await checkout(buyer, deliveryBody(items, 'cash'));
    expect(on.status).toBe(201);
  });

  it('refuses a mixed cart on the legacy single-order endpoint instead of mis-charging it', async () => {
    const { a1, b1, buyer } = await twoVendorCart();
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyer}`)
      .send({
        listing: String(a1._id),
        items: [
          { listing: String(a1._id), quantity: 1 },
          { listing: String(b1._id), quantity: 1 },
        ],
        fulfillmentType: 'pickup',
        payment: { paymentMethod: 'mobile_money' },
      });
    expect(res.status).toBe(400);
    expect(await Order.countDocuments({})).toBe(0);
  });
});

describe('One payment for the whole checkout', () => {
  it('pays every vendor order at once, and each vendor is notified of their own order', async () => {
    const { a, b, buyer, items } = await twoVendorCart();
    const { body } = await checkout(buyer, deliveryBody(items));

    // The deposit covers the whole checkout in one prompt.
    process.env.PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY || 'test-key';
    const dep = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${buyer}`)
      .send({
        checkoutId: body.checkoutId,
        phoneNumber: '0781234567',
        correspondent: 'MTN_MOMO_RWA',
      });
    expect(dep.status).toBe(200);
    expect(dep.body.amount).toBe(body.totals.total);
    expect(dep.body.orders).toHaveLength(2);

    await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId: dep.body.depositId, status: 'COMPLETED' });

    const orders = await Order.find({ checkoutGroup: body.checkoutId });
    expect(orders.every((o) => o.status === 'paid')).toBe(true);

    for (const vendor of [a, b]) {
      const notes = await eventually(async () => {
        const found = await Notification.find({ user: vendor.user._id });
        return found.length ? found : null;
      });
      expect(notes.length).toBeGreaterThanOrEqual(1);
    }

    // Polling with either order id finds the shared payment.
    const poll = await request(app)
      .get(`/api/v1/payments/status/${orders[1]._id}`)
      .set('Authorization', `Bearer ${buyer}`);
    expect(poll.status).toBe(200);
    expect(poll.body.status).toBe('completed');
  });

  it('leaves every order retryable and every listing reserved if the payment fails (M9)', async () => {
    const { a1, a2, b1, buyer, items } = await twoVendorCart();
    const { body } = await checkout(buyer, deliveryBody(items));
    await payCheckout(buyer, body.checkoutId, 'FAILED');

    // M9: a failed checkout payment does NOT cancel the orders - they stay
    // pending_payment so the buyer can retry the same checkout instead of
    // rebuilding their cart, and stock stays reserved exactly as it was.
    const orders = await Order.find({ checkoutGroup: body.checkoutId });
    expect(orders.every((o) => o.status === 'pending_payment')).toBe(true);
    for (const [l, orderedQty] of [
      [a1, 2],
      [a2, 1],
      [b1, 1],
    ]) {
      const fresh = await Listing.findById(l._id);
      expect(fresh.inventory.quantity).toBe(10 - orderedQty);
      expect(fresh.inventory.reserved).toBe(orderedQty);
    }
  });

  it('only charges for the vendors still in the checkout if one was cancelled before paying', async () => {
    const { b, buyer, items } = await twoVendorCart();
    const { body } = await checkout(buyer, deliveryBody(items));
    const oB = body.orders.find((o) => String(o.business) === String(b.business._id));
    const oA = body.orders.find((o) => o._id !== oB._id);

    await request(app)
      .put(`/api/v1/orders/${oB._id}/cancel`)
      .set('Authorization', `Bearer ${buyer}`);
    const dep = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${buyer}`)
      .send({
        checkoutId: body.checkoutId,
        phoneNumber: '0781234567',
        correspondent: 'AIRTEL_RWA',
      });
    expect(dep.status).toBe(200);
    expect(dep.body.amount).toBe(oA.pricing.total);
    expect(dep.body.orders).toEqual([oA._id]);
  });

  it('refunds only the cancelled vendor order after the whole checkout was paid', async () => {
    const { b, buyer, items } = await twoVendorCart();
    const { body } = await checkout(buyer, deliveryBody(items));
    await payCheckout(buyer, body.checkoutId);
    const oB = body.orders.find((o) => String(o.business) === String(b.business._id));

    const res = await request(app)
      .put(`/api/v1/orders/${oB._id}/cancel`)
      .set('Authorization', `Bearer ${buyer}`);
    expect(res.status).toBe(200);
    const refunds = await RefundRequest.find({});
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(oB.pricing.total);
    const others = await Order.find({ checkoutGroup: body.checkoutId, _id: { $ne: oB._id } });
    expect(others.every((o) => o.status === 'paid')).toBe(true);
  });

  it('credits each vendor only for their own completed order', async () => {
    const { a, b, buyer, items } = await twoVendorCart();
    const { body } = await checkout(buyer, { ...deliveryBody(items), fulfillmentType: 'pickup' });
    await payCheckout(buyer, body.checkoutId);
    const oA = await Order.findOne({ checkoutGroup: body.checkoutId, business: a.business._id });

    const res = await request(app)
      .put(`/api/v1/orders/${oA._id}/status`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect((await Business.findById(a.business._id)).stats.balance).toBe(7200);
    expect((await Business.findById(b.business._id)).stats.balance).toBe(0);

    // Vendor B cannot touch vendor A's order.
    const other = await request(app)
      .put(`/api/v1/orders/${oA._id}/status`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ status: 'confirmed' });
    expect(other.status).toBe(403);
  });
});

describe('Dispute refunds: vendor fault vs platform goodwill', () => {
  async function completedPaidOrder() {
    const { a, buyer, buyerUser, items } = await twoVendorCart();
    const { body } = await checkout(buyer, {
      ...deliveryBody(items.slice(0, 2)),
      fulfillmentType: 'pickup',
    });
    await payCheckout(buyer, body.checkoutId);
    const order = await Order.findOne({ checkoutGroup: body.checkoutId });
    return { a, buyer, buyerUser, order };
  }

  async function adminToken() {
    const bcrypt = require('bcrypt');
    const User = require('../models/User');
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
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email, password: 'Password1' });
    return res.body.token;
  }

  const dispute = (order, buyerUser) =>
    Dispute.create({
      order: order._id,
      customer: buyerUser._id,
      business: order.business,
      type: 'poor_quality',
      title: 'Stale',
      description: 'The bread was stale and hard.',
    });

  it("takes the vendor's share back from their balance when it's the vendor's fault", async () => {
    const { a, buyerUser, order } = await completedPaidOrder();
    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'completed' });
    expect((await Business.findById(a.business._id)).stats.balance).toBe(7200);

    const d = await dispute(order, buyerUser);
    const res = await request(app)
      .patch(`/api/v1/disputes/${d._id}/resolve`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .send({ action: 'full_refund', refundFundedBy: 'vendor' });
    expect(res.status).toBe(200);
    expect((await Business.findById(a.business._id)).stats.balance).toBe(0);
    const refund = await RefundRequest.findOne({ dispute: d._id });
    expect(refund.fundedBy).toBe('vendor');
    expect(refund.vendorDeduction).toBe(7200);
  });

  it('leaves the vendor balance alone for platform goodwill', async () => {
    const { a, buyerUser, order } = await completedPaidOrder();
    await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'completed' });

    const d = await dispute(order, buyerUser);
    await request(app)
      .patch(`/api/v1/disputes/${d._id}/resolve`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .send({ action: 'full_refund', refundFundedBy: 'platform' });
    expect((await Business.findById(a.business._id)).stats.balance).toBe(7200);
    expect((await RefundRequest.findOne({ dispute: d._id })).fundedBy).toBe('platform');
  });

  it('reduces what completion pays when a vendor-fault refund comes first', async () => {
    const { a, buyerUser, order } = await completedPaidOrder();
    const d = await dispute(order, buyerUser);
    // Partial refund of half the order total, vendor's fault.
    const half = Math.round(order.pricing.total / 2);
    await request(app)
      .patch(`/api/v1/disputes/${d._id}/resolve`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .send({ action: 'partial_refund', amount: half, refundFundedBy: 'vendor' });

    // The order is still completable after a partial refund...
    const done = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'completed' });
    expect(done.status).toBe(200);
    // ...and the vendor is credited only the unrefunded share.
    const expected = 7200 - Math.round((half * 7200) / order.pricing.total);
    expect((await Business.findById(a.business._id)).stats.balance).toBe(expected);
  });
});

describe('Admin checkout settings', () => {
  it('rejects out-of-range values with a 400', async () => {
    const bcrypt = require('bcrypt');
    const User = require('../models/User');
    await User.create({
      email: 'settings-admin@example.com',
      passwordHash: await bcrypt.hash('Password1', 12),
      firstName: 'Ad',
      lastName: 'Min',
      roles: ['admin'],
      activeRole: 'admin',
      emailVerified: true,
    });
    const login = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'settings-admin@example.com', password: 'Password1' });
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ taxPercent: 150 });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Stock-reservation race at order creation (M11)
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/orders/checkout - stock-reservation race', () => {
  it('lets exactly one of two simultaneous buyers reserve the last unit of stock', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, {
      fulfillment: 'delivery',
      pricing: { price: 4000, currency: 'RWF' },
      inventory: { quantity: 1 },
    });
    const { token: buyerA } = await createConsumer();
    const { token: buyerB } = await createConsumer();
    const items = [{ listing: String(listing._id), quantity: 1 }];

    const [resA, resB] = await Promise.all([
      checkout(buyerA, deliveryBody(items)),
      checkout(buyerB, deliveryBody(items)),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const winner = resA.status === 201 ? resA : resB;
    const loser = resA.status === 201 ? resB : resA;
    expect(winner.body.checkoutId).toBeTruthy();
    expect(loser.body.message).toMatch(/not enough stock|only .* left/i);

    // Never both, never neither, never oversold.
    const fresh = await Listing.findById(listing._id);
    expect(fresh.inventory.quantity).toBe(0);
    expect(fresh.inventory.reserved).toBe(1);

    const orders = await Order.find({ business: business._id });
    expect(orders).toHaveLength(1);
  });

  it('lets 3 buyers race for 2 units - exactly 2 win, stock never goes negative', async () => {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, {
      fulfillment: 'delivery',
      pricing: { price: 4000, currency: 'RWF' },
      inventory: { quantity: 2 },
    });
    const buyers = await Promise.all([createConsumer(), createConsumer(), createConsumer()]);
    const items = [{ listing: String(listing._id), quantity: 1 }];

    const results = await Promise.all(
      buyers.map(({ token }) => checkout(token, deliveryBody(items)))
    );

    const succeeded = results.filter((r) => r.status === 201);
    const failed = results.filter((r) => r.status === 400);
    expect(succeeded).toHaveLength(2);
    expect(failed).toHaveLength(1);

    const fresh = await Listing.findById(listing._id);
    expect(fresh.inventory.quantity).toBe(0);
    expect(fresh.inventory.reserved).toBe(2);
  });
});
