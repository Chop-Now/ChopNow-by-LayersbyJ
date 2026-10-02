/**
 * Shared Phase-2 (money correctness) test fixtures.
 *
 * Business/Listing records are created directly via their Mongoose models
 * (bypassing the real onboarding/KYC-approval HTTP flow, which is unrelated
 * to what these tests verify) so each test can set up a minimal, valid chain
 * - User(business_owner) -> Business -> Listing - quickly. Users are created
 * through the real /register endpoint so the returned JWT is genuinely valid
 * for use as a Bearer token in subsequent requests.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('./app');
const User = require('../models/User');
const Business = require('../models/Business');
const Listing = require('../models/Listing');

let emailCounter = 0;
const uniqueEmail = (label) => {
  emailCounter += 1;
  return `${label}${emailCounter}@example.com`;
};

/**
 * Registers a consumer via the real endpoint and returns { user, token }.
 */
async function createConsumer(overrides = {}) {
  const email = overrides.email || uniqueEmail('consumer');
  const res = await request(app)
    .post('/api/v1/users/register')
    .send({
      email,
      password: 'Password1',
      firstName: 'Test',
      lastName: 'Consumer',
      ...overrides,
    });
  return { token: res.body.token, user: res.body };
}

/**
 * Registers a business_owner via the real endpoint, then creates a Business
 * document directly (skipping the KYC/verification flow) owned by that user.
 * Returns { token, user, business }.
 */
async function createBusinessOwnerWithBusiness(businessOverrides = {}) {
  const email = uniqueEmail('vendor');
  const res = await request(app).post('/api/v1/users/register').send({
    email,
    password: 'Password1',
    firstName: 'Test',
    lastName: 'Vendor',
    role: 'business_owner',
  });
  const token = res.body.token;
  const ownerId = res.body._id;

  const business = await Business.create({
    owner: ownerId,
    name: 'Test Business',
    address: '123 Test St',
    status: 'active',
    verification: { status: 'verified' },
    deliverySettings: { enabled: true, fee: 500 },
    // Payout requests need somewhere to send the money.
    payoutInfo: {
      preferredMethod: 'mobile',
      mobileProvider: 'MTN',
      mobilePhone: '0788000000',
      mobileAccountName: 'Test Vendor',
    },
    ...businessOverrides,
  });

  return { token, user: res.body, business };
}

/**
 * Creates a Listing directly for the given business. Defaults to plenty of
 * stock, active status, and a wide availability window so isAvailable()
 * passes without each test having to restate it.
 */
async function createListing(business, overrides = {}) {
  const now = Date.now();
  return Listing.create({
    business: business._id,
    title: 'Test Listing',
    description: 'A test listing',
    category: 'meals',
    pricing: { price: 5000, currency: 'RWF' },
    inventory: { quantity: 10 },
    fulfillment: 'pickup',
    timeWindow: {
      availableFrom: new Date(now - 60 * 60 * 1000),
      availableUntil: new Date(now + 60 * 60 * 1000),
    },
    status: 'active',
    ...overrides,
  });
}

/**
 * Creates a rider (registers as consumer then admin-approves as a rider
 * would be too heavy for most tests) - most Phase-2 delivery tests only need
 * a User with the 'rider' role and a riderBalance stat, so this grants the
 * role directly.
 */
async function createRider(overrides = {}) {
  const email = overrides.email || uniqueEmail('rider');
  const passwordHash = await bcrypt.hash('Password1', 12);
  const user = await User.create({
    email,
    passwordHash,
    firstName: 'Test',
    lastName: 'Rider',
    roles: ['rider'],
    activeRole: 'rider',
    riderStatus: 'approved',
    status: 'active',
    emailVerified: true,
    ...overrides,
  });

  const res = await request(app).post('/api/v1/users/login').send({ email, password: 'Password1' });

  return { token: res.body.token, user };
}

/**
 * Places a mobile-money order through the real endpoint and leaves it with a
 * pending pawaPay Payment, as initiatePayment would. Returns { order, depositId }.
 */
async function placePendingMobileMoneyOrder(
  consumerToken,
  listing,
  { quantity = 1, fulfillmentType = 'pickup', deliveryDetails } = {}
) {
  const Payment = require('../models/Payment');
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${consumerToken}`)
    .send({
      listing: listing._id.toString(),
      items: [{ listing: listing._id.toString(), quantity }],
      fulfillmentType,
      ...(deliveryDetails ? { deliveryDetails } : {}),
      payment: { paymentMethod: 'mobile_money' },
    });
  const order = res.body;
  const depositId = `dep-${order._id}-${Date.now()}`;
  await Payment.create({
    order: order._id,
    depositId,
    amount: order.pricing.total,
    currency: order.pricing.currency,
    payerPhoneNumber: '250780000000',
    correspondent: 'MTN_MOMO_RWA',
    status: 'pending',
  });
  return { order, depositId };
}

/**
 * Places a mobile-money order and pays it via the real (unsigned, non-
 * production) pawaPay webhook. Returns { order, depositId }.
 */
async function placePaidOrder(consumerToken, listing, options = {}) {
  const { order, depositId } = await placePendingMobileMoneyOrder(consumerToken, listing, options);
  await request(app)
    .post('/api/v1/payments/webhook')
    .send({ depositId, status: 'COMPLETED', providerTransactionId: `ptx-${depositId}` });
  return { order, depositId };
}

/**
 * Cash is off by default (the platform can't collect commission on it);
 * suites that exercise cash orders turn it on for each test.
 */
async function enableCashPayments() {
  const PlatformSettings = require('../models/PlatformSettings');
  const settings = await PlatformSettings.getSettings();
  settings.cashPaymentsEnabled = true;
  await settings.save();
}

/**
 * Payout rules (holding period / request interval, in days). Tests that
 * withdraw right after an order completes switch the hold off.
 */
async function setPayoutRules({ holdDays = 0, intervalDays = 0 } = {}) {
  const PlatformSettings = require('../models/PlatformSettings');
  const settings = await PlatformSettings.getSettings();
  settings.payoutHoldDays = holdDays;
  settings.payoutIntervalDays = intervalDays;
  await settings.save();
}

/**
 * Toggles maintenance mode (off by default; tests that turn it on should
 * turn it back off in the same test so it doesn't leak into the next one).
 */
async function setMaintenanceMode(on) {
  const PlatformSettings = require('../models/PlatformSettings');
  const settings = await PlatformSettings.getSettings();
  settings.maintenanceMode = on;
  await settings.save();
}

/**
 * Registers an admin via the real endpoint (roles can't self-register as
 * admin - see the C1 fix - so this promotes one directly) and returns
 * { token, user }.
 */
async function createAdmin(overrides = {}) {
  const email = overrides.email || uniqueEmail('admin');
  const { token, user } = await createConsumer({ email });
  await User.findByIdAndUpdate(user._id, { $addToSet: { roles: 'admin' } });
  const res = await request(app).post('/api/v1/users/login').send({ email, password: 'Password1' });
  return { token: res.body.token, user };
}

/**
 * Waits (up to timeoutMs) until check() returns something truthy - for effects
 * the server runs in the background after responding (notifications).
 */
async function eventually(check, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let result = await check();
  while (!result && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    result = await check();
  }
  return result;
}

module.exports = {
  eventually,
  setPayoutRules,
  setMaintenanceMode,
  enableCashPayments,
  createConsumer,
  createAdmin,
  createBusinessOwnerWithBusiness,
  createListing,
  createRider,
  placePendingMobileMoneyOrder,
  placePaidOrder,
};
