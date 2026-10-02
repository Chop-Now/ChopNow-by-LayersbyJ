/**
 * Delivery status update money-correctness tests (C6)
 *
 * Covers: replaying `status: 'delivered'` on an already-delivered delivery
 * must not re-credit the rider's balance. The bug was that validTransitions
 * had no entry at all for a terminal delivery.status, so the guard was
 * silently skipped for any status already at delivered/cancelled/failed.
 */
const request = require('supertest');
const app = require('./app');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  createRider,
  placePendingMobileMoneyOrder,
  placePaidOrder,
  enableCashPayments,
} = require('./fixtures');

// Some tests place cash orders; cash is off by default.
beforeEach(enableCashPayments);

/**
 * Creates an order (delivery fulfillment) and a matching Delivery document
 * already in 'in_transit' with the given rider assigned, ready for a single
 * 'delivered' transition.
 */
async function createInTransitDelivery({
  deliveryFee = 1000,
  paymentMethod = 'mobile_money',
} = {}) {
  const { business } = await createBusinessOwnerWithBusiness();
  const listing = await createListing(business, {
    fulfillment: 'delivery',
    pricing: { price: 5000, currency: 'RWF' },
  });
  const { token: consumerToken } = await createConsumer();
  const { token: riderToken, user: rider } = await createRider();

  const deliveryDetails = { address: { street: '1 Main St', city: 'Kigali' } };
  let order;
  if (paymentMethod === 'cash') {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'delivery',
        deliveryDetails,
        payment: { paymentMethod: 'cash' },
      });
    order = orderRes.body;
  } else {
    ({ order } = await placePaidOrder(consumerToken, listing, {
      fulfillmentType: 'delivery',
      deliveryDetails,
    }));
  }

  const delivery = await Delivery.create({
    order: order._id,
    rider: rider._id,
    pickupLocation: {
      businessName: business.name,
      address: '123 Test St',
      location: { type: 'Point', coordinates: [0, 0] },
    },
    dropoffLocation: {
      recipientName: 'Test Consumer',
      recipientPhone: '+250700000000',
      address: '1 Main St',
      location: { type: 'Point', coordinates: [0, 0] },
    },
    status: 'in_transit',
    deliveryFee,
  });

  return { delivery, rider, riderToken, orderId: order._id };
}

describe('PATCH /api/v1/deliveries/:id/status - rider balance replay (C6)', () => {
  it('should credit the rider balance exactly once even if "delivered" is sent twice', async () => {
    // Platform delivery fee 1000, 10% platform commission -> rider earns 900.
    const { delivery, rider, riderToken } = await createInTransitDelivery({ deliveryFee: 1000 });

    const first = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'delivered' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'delivered' });
    expect(second.status).toBe(400);

    const updatedRider = await User.findById(rider._id).select('+stats.riderBalance');
    expect(updatedRider.stats.riderBalance).toBe(900);
  });

  it('should not credit the rider from platform funds for a cash delivery', async () => {
    const { delivery, rider, riderToken } = await createInTransitDelivery({
      paymentMethod: 'cash',
    });
    const res = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    const updatedRider = await User.findById(rider._id).select('+stats.riderBalance');
    expect(updatedRider.stats.riderBalance || 0).toBe(0);
  });

  it('should reject any transition once a delivery is cancelled/failed', async () => {
    const { delivery, riderToken } = await createInTransitDelivery();

    const failRes = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'failed' });
    expect(failRes.status).toBe(200);

    const replay = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'delivered' });
    expect(replay.status).toBe(400);
  });
});

describe('POST /api/v1/deliveries - dispatch', () => {
  async function paidDeliveryOrder() {
    const { token: vendorToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, { fulfillment: 'delivery' });
    // No phone on the profile, and the clients never send recipientPhone.
    const { token: consumerToken } = await createConsumer();
    const { order } = await placePendingMobileMoneyOrder(consumerToken, listing, {
      fulfillmentType: 'delivery',
      deliveryDetails: { address: 'KG 11 Ave', location: { lat: -1.95, lng: 30.07 } },
    });
    return { vendorToken, consumerToken, listing, order };
  }

  it('should refuse to dispatch an unpaid mobile-money order', async () => {
    const { vendorToken, order } = await paidDeliveryOrder();
    const res = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ orderId: order._id });
    expect(res.status).toBe(400);
  });

  it("should fall back to the paying phone when the customer's profile has none", async () => {
    const { vendorToken, order } = await paidDeliveryOrder();
    const Payment = require('../models/Payment');
    const { depositId } = await Payment.findOne({ order: order._id });
    await request(app).post('/api/v1/payments/webhook').send({ depositId, status: 'COMPLETED' });

    const res = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ orderId: order._id });
    expect(res.status).toBe(201);
    expect(res.body.dropoffLocation.recipientPhone).toBe('+250780000000');
  });
});

describe('PATCH /api/v1/deliveries/:id/assign - double-claim race', () => {
  async function pendingUnassignedDelivery() {
    const { business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, {
      fulfillment: 'delivery',
      pricing: { price: 5000, currency: 'RWF' },
    });
    const { token: consumerToken } = await createConsumer();
    const { order } = await placePaidOrder(consumerToken, listing, {
      fulfillmentType: 'delivery',
      deliveryDetails: { address: { street: '1 Main St', city: 'Kigali' } },
    });

    const delivery = await Delivery.create({
      order: order._id,
      pickupLocation: {
        businessName: business.name,
        address: '123 Test St',
        location: { type: 'Point', coordinates: [0, 0] },
      },
      dropoffLocation: {
        recipientName: 'Test Consumer',
        recipientPhone: '+250700000000',
        address: '1 Main St',
        location: { type: 'Point', coordinates: [0, 0] },
      },
      status: 'pending',
      deliveryFee: 1000,
    });

    return { delivery };
  }

  it('should let a rider self-assign a pending, unassigned delivery', async () => {
    const { delivery } = await pendingUnassignedDelivery();
    const { token: riderToken, user: rider } = await createRider();

    const res = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/assign`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.rider).toBe(rider._id.toString());
    expect(res.body.status).toBe('assigned');
  });

  it('should answer 409 (not 400) to a second rider claiming an already-claimed delivery', async () => {
    const { delivery } = await pendingUnassignedDelivery();
    const { token: tokenA } = await createRider();
    const { token: tokenB } = await createRider();

    const first = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/assign`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/v1/deliveries/${delivery._id}/assign`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({});
    expect(second.status).toBe(409);
  });

  it('should let only one of two riders racing to self-assign the same delivery win, not silently overwrite', async () => {
    const { delivery } = await pendingUnassignedDelivery();
    const { token: tokenA, user: riderA } = await createRider();
    const { token: tokenB, user: riderB } = await createRider();

    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/v1/deliveries/${delivery._id}/assign`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({}),
      request(app)
        .patch(`/api/v1/deliveries/${delivery._id}/assign`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({}),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = resA.status === 200 ? riderA : riderB;
    const final = await Delivery.findById(delivery._id);
    expect(final.rider.toString()).toBe(winner._id.toString());
  });
});
