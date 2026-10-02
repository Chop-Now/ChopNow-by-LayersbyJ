/**
 * Phase 7 regression - GET /api/v1/analytics/business/overview must return
 * real revenue computed from the business's completed orders. It previously
 * computed `completedRevenue` internally but never included it in the JSON
 * response, so the vendor dashboard always showed "Total Revenue: RWF 0"
 * even right after a completed order (found during live checkout testing,
 * see the Fix Checklist's Phase 7).
 */
const request = require('supertest');
const app = require('./app');
const Order = require('../models/Order');
const { createBusinessOwnerWithBusiness, createConsumer, createListing } = require('./fixtures');

describe('GET /api/v1/analytics/business/overview (Phase 7)', () => {
  it('returns real revenue summed from completed orders, not zero', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness();
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
          unitPrice: 5000,
          subtotal: 5000,
        },
      ],
      pricing: {
        subtotal: 5000,
        deliveryFee: 0,
        platformFee: 500,
        vendorAmount: 4500,
        total: 5000,
      },
      fulfillmentType: 'pickup',
      status: 'completed',
      payment: { paymentMethod: 'cash', paymentStatus: 'completed' },
    });

    const res = await request(app)
      .get('/api/v1/analytics/business/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(5000);
  });

  it('returns 0 revenue (not undefined) when there are no completed orders', async () => {
    const { token } = await createBusinessOwnerWithBusiness();

    const res = await request(app)
      .get('/api/v1/analytics/business/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(0);
  });

  // Regression: weeklyTrend and topProducts both matched `status: 'delivered'`,
  // a value that doesn't exist in the Order status enum at all (the real
  // terminal status is 'completed') - so both silently returned empty for
  // every business, always, regardless of real order history.
  it('populates weeklyTrend and topProducts from completed orders', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness();
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
          quantity: 2,
          unitPrice: 3000,
          subtotal: 6000,
        },
      ],
      pricing: {
        subtotal: 6000,
        deliveryFee: 0,
        platformFee: 600,
        vendorAmount: 5400,
        total: 6000,
      },
      fulfillmentType: 'pickup',
      status: 'completed',
      payment: { paymentMethod: 'cash', paymentStatus: 'completed' },
    });

    const res = await request(app)
      .get('/api/v1/analytics/business/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.weeklyTrend.length).toBeGreaterThan(0);
    expect(res.body.weeklyTrend.reduce((sum, w) => sum + w.sales, 0)).toBe(6000);
    expect(res.body.topProducts).toHaveLength(1);
    expect(res.body.topProducts[0]).toMatchObject({
      name: listing.title,
      sold: 2,
      revenue: 6000,
    });
  });

  it('returns a real order-status breakdown in fulfillmentBreakdown', async () => {
    const { token, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business);
    const { user: customer } = await createConsumer();

    const makeOrder = (status) =>
      Order.create({
        customer: customer._id,
        business: business._id,
        listing: listing._id,
        items: [
          {
            listing: listing._id,
            title: listing.title,
            quantity: 1,
            unitPrice: 1000,
            subtotal: 1000,
          },
        ],
        pricing: {
          subtotal: 1000,
          deliveryFee: 0,
          platformFee: 100,
          vendorAmount: 900,
          total: 1000,
        },
        fulfillmentType: 'pickup',
        status,
        payment: {
          paymentMethod: 'cash',
          paymentStatus: status === 'completed' ? 'completed' : 'pending',
        },
      });

    await makeOrder('completed');
    await makeOrder('completed');
    await makeOrder('completed');
    await makeOrder('cancelled');

    const res = await request(app)
      .get('/api/v1/analytics/business/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.fulfillmentBreakdown).toMatchObject({
      total: 4,
      completed: { count: 3, percent: 75 },
      cancelled: { count: 1, percent: 25 },
      inProgress: { count: 0, percent: 0 },
    });
  });
});
