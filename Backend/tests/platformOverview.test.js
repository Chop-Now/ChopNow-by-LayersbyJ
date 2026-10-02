/**
 * Phase 7 regression - GET /api/v1/analytics/platform/overview's totalRevenue
 * matched `status: 'delivered'`, a value that doesn't exist in the Order
 * status enum at all (the real terminal status is 'completed') - so the
 * platform-wide "Total Revenue" stat silently returned 0 always, regardless
 * of real completed-order history. Found alongside the identical bug in
 * getBusinessOverview's weeklyTrend/topProducts (see businessOverview.test.js).
 */
const request = require('supertest');
const app = require('./app');
const Order = require('../models/Order');
const {
  createAdmin,
  createBusinessOwnerWithBusiness,
  createConsumer,
  createListing,
} = require('./fixtures');

describe('GET /api/v1/analytics/platform/overview (Phase 7)', () => {
  it('returns real platform-wide revenue summed from completed orders, not zero', async () => {
    const { token: adminToken } = await createAdmin();
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { user: customer } = await createConsumer();

    await Order.create({
      customer: customer._id,
      business: business._id,
      listing: listing._id,
      items: [
        {
          listing: listing._id,
          title: listing.title,
          quantity: 1,
          unitPrice: 4000,
          subtotal: 4000,
        },
      ],
      pricing: {
        subtotal: 4000,
        deliveryFee: 0,
        platformFee: 400,
        vendorAmount: 3600,
        total: 4000,
      },
      fulfillmentType: 'pickup',
      status: 'completed',
      payment: { paymentMethod: 'cash', paymentStatus: 'completed' },
    });

    const res = await request(app)
      .get('/api/v1/analytics/platform/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.overview.totalRevenue).toBe(4000);
  });
});
