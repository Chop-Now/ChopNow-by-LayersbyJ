/**
 * M7 - Backend/socket.js's `track_order` handler must only let a socket join
 * an order's tracking room if it belongs to the order's customer, the
 * assigned rider, the owning business, or an admin. Before this fix, ANY
 * authenticated socket could join ANY order's room just by supplying an
 * orderId, receiving a stranger's live delivery location.
 */
const request = require('supertest');
const { createServer } = require('http');
const { io: ioClient } = require('socket.io-client');
const app = require('./app');
const socketManager = require('../socket');
const Delivery = require('../models/Delivery');
const {
  createConsumer,
  createBusinessOwnerWithBusiness,
  createListing,
  createRider,
  createAdmin,
  enableCashPayments,
} = require('./fixtures');

beforeEach(enableCashPayments);

const PORT = 5299;
let httpServer;

beforeAll(async () => {
  httpServer = createServer();
  await socketManager.init(httpServer, ['*']);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
});

afterAll(async () => {
  await socketManager.closeAdapter();
  socketManager.getIO().close();
  await new Promise((resolve) => httpServer.close(resolve));
});

function connectClient(token) {
  return ioClient(`http://localhost:${PORT}`, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
    reconnection: false,
  });
}

// Emits track_order, then asks the server whether this socket ended up in
// the room - more reliable than waiting for a broadcast, since it directly
// inspects adapter state.
async function attemptTrackOrder(client, orderId) {
  client.emit('track_order', orderId);
  await new Promise((r) => setTimeout(r, 300)); // let the async authorization check land
  const io = socketManager.getIO();
  const room = io.sockets.adapter.rooms.get(`order_tracking_${orderId}`);
  return !!(room && room.has(client.id));
}

describe('track_order authorization (M7)', () => {
  let customerToken, otherConsumerToken, ownerToken, riderToken, otherRiderToken, adminToken;
  let orderId;

  beforeEach(async () => {
    const customer = await createConsumer();
    customerToken = customer.token;
    const otherConsumer = await createConsumer();
    otherConsumerToken = otherConsumer.token;
    const { token: bizToken, business } = await createBusinessOwnerWithBusiness();
    ownerToken = bizToken;
    const listing = await createListing(business, {
      fulfillment: 'delivery',
      pricing: { price: 5000, currency: 'RWF' },
    });
    const rider = await createRider();
    riderToken = rider.token;
    const otherRider = await createRider();
    otherRiderToken = otherRider.token;
    const admin = await createAdmin();
    adminToken = admin.token;

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'delivery',
        deliveryDetails: { address: { street: '1 Main St', city: 'Kigali' } },
        payment: { paymentMethod: 'cash' },
      });
    orderId = orderRes.body._id;

    await Delivery.create({
      order: orderId,
      rider: rider.user._id,
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
      status: 'assigned',
      deliveryFee: 500,
    });
  });

  it('should let the customer join their own order tracking room', async () => {
    const client = connectClient(customerToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(true);
    client.close();
  });

  it('should let the assigned rider join', async () => {
    const client = connectClient(riderToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(true);
    client.close();
  });

  it('should let the owning business join', async () => {
    const client = connectClient(ownerToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(true);
    client.close();
  });

  it('should let an admin join', async () => {
    const client = connectClient(adminToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(true);
    client.close();
  });

  it('should REJECT an unrelated consumer', async () => {
    const client = connectClient(otherConsumerToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(false);
    client.close();
  });

  it('should REJECT a rider who is not assigned to this order', async () => {
    const client = connectClient(otherRiderToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, orderId)).toBe(false);
    client.close();
  });

  it('should ignore a malformed/non-ObjectId orderId without crashing', async () => {
    const client = connectClient(customerToken);
    await new Promise((r) => client.on('connect', r));
    expect(await attemptTrackOrder(client, 'not-a-real-id')).toBe(false);
    client.close();
  });
});

/**
 * M8 - Backend/socket.js's `rider_location_update` handler must only
 * broadcast/persist a rider's GPS position if that rider is the one actually
 * assigned to the order. Before this fix, the broadcast to
 * `order_tracking_${orderId}` happened BEFORE the assignment check (which
 * ran afterward as an unchecked, fire-and-forget DB write), so any
 * authenticated rider could inject spoofed location data into ANY order's
 * tracking room just by supplying an arbitrary orderId.
 */
describe('rider_location_update authorization (M8)', () => {
  let customerToken, riderToken, otherRiderToken, assignedRiderId, otherRiderId;
  let orderId;

  beforeEach(async () => {
    const customer = await createConsumer();
    customerToken = customer.token;
    const { token: bizToken, business } = await createBusinessOwnerWithBusiness();
    const listing = await createListing(business, {
      fulfillment: 'delivery',
      pricing: { price: 5000, currency: 'RWF' },
    });
    const rider = await createRider();
    riderToken = rider.token;
    assignedRiderId = rider.user._id.toString();
    const otherRider = await createRider();
    otherRiderToken = otherRider.token;
    otherRiderId = otherRider.user._id.toString();

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        listing: listing._id.toString(),
        items: [{ listing: listing._id.toString(), quantity: 1 }],
        fulfillmentType: 'delivery',
        deliveryDetails: { address: { street: '1 Main St', city: 'Kigali' } },
        payment: { paymentMethod: 'cash' },
      });
    orderId = orderRes.body._id;

    await Delivery.create({
      order: orderId,
      rider: assignedRiderId,
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
      status: 'assigned',
      deliveryFee: 500,
    });
  });

  // Joins the tracking room as the customer (a legitimate listener per M7),
  // then emits rider_location_update from `riderClient` and reports whether
  // the listener received the broadcast.
  async function attemptLocationUpdate(riderClient, listenerClient, lat, lng) {
    listenerClient.emit('track_order', orderId);
    await new Promise((r) => setTimeout(r, 200));

    const received = [];
    listenerClient.on('location_update', (payload) => received.push(payload));

    riderClient.emit('rider_location_update', { orderId, lat, lng });
    await new Promise((r) => setTimeout(r, 300));

    return received;
  }

  it('should REJECT a rider who is not assigned to this order - no broadcast, no leak', async () => {
    const listenerClient = connectClient(customerToken);
    const riderClient = connectClient(otherRiderToken);
    await Promise.all([
      new Promise((r) => listenerClient.on('connect', r)),
      new Promise((r) => riderClient.on('connect', r)),
    ]);

    const received = await attemptLocationUpdate(riderClient, listenerClient, 1.234, 2.345);
    expect(received).toHaveLength(0);

    const delivery = await Delivery.findOne({ order: orderId, rider: otherRiderId });
    expect(delivery).toBeNull();

    const assignedDelivery = await Delivery.findOne({ order: orderId, rider: assignedRiderId });
    expect(assignedDelivery.currentLocation?.coordinates).toBeUndefined();
    expect(assignedDelivery.lastLocationUpdate).toBeUndefined();

    listenerClient.close();
    riderClient.close();
  });

  it('should let the assigned rider broadcast and persist their location', async () => {
    const listenerClient = connectClient(customerToken);
    const riderClient = connectClient(riderToken);
    await Promise.all([
      new Promise((r) => listenerClient.on('connect', r)),
      new Promise((r) => riderClient.on('connect', r)),
    ]);

    const received = await attemptLocationUpdate(riderClient, listenerClient, 1.234, 2.345);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ riderId: assignedRiderId, lat: 1.234, lng: 2.345 });

    const assignedDelivery = await Delivery.findOne({ order: orderId, rider: assignedRiderId });
    expect(assignedDelivery.currentLocation.coordinates).toEqual([2.345, 1.234]);

    listenerClient.close();
    riderClient.close();
  });
});
