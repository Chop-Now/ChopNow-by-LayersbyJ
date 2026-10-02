const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const Delivery = require('./models/Delivery');
const redis = require('./config/redis');
const logger = require('./utils/logger');

let io;
let pubClient = null;
let subClient = null;

// Wires the Socket.IO Redis adapter so `io.to(room).emit(...)` reaches
// sockets connected to ANY server instance, not just this process - required
// once the backend runs behind a load balancer with more than one instance.
// Non-fatal if Redis isn't configured/reachable: falls back to the default
// in-memory adapter (fine for a single instance, same as before this existed).
const attachRedisAdapter = async () => {
  const client = redis.getClient();
  if (!client) return false;

  try {
    pubClient = client.duplicate();
    subClient = client.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter attached - events now sync across instances');
    return true;
  } catch (err) {
    logger.warn(
      { err },
      'Failed to attach Socket.IO Redis adapter - falling back to single-instance mode'
    );
    try {
      pubClient?.disconnect();
    } catch {
      // best-effort cleanup, already falling back to single-instance mode
    }
    try {
      subClient?.disconnect();
    } catch {
      // best-effort cleanup, already falling back to single-instance mode
    }
    pubClient = null;
    subClient = null;
    return false;
  }
};

module.exports = {
  init: async (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    await attachRedisAdapter();

    // Authenticate socket connection — look up user from DB so we have activeRole
    io.use(async (socket, next) => {
      const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!authHeader) {
        return next(new Error('Authentication error: No token provided'));
      }

      const token = authHeader.split(' ')[1] || authHeader;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('activeRole roles status').lean();
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }
        if (user.status === 'suspended') {
          return next(new Error('Authentication error: Account suspended'));
        }
        socket.user = { id: decoded.id, role: user.activeRole, roles: user.roles };
        next();
      } catch {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      logger.info(
        { socketId: socket.id, userId: socket.user.id, role: socket.user.role },
        'New socket connection'
      );

      // Every user joins their personal room (covers all roles for DMs/notifications)
      socket.join(`user_${socket.user.id}`);

      if (socket.user.role === 'business_owner') {
        // Business owner also joins a business_owner room; business-specific room
        // is joined dynamically when the client emits join_business
        socket.join(`business_owner_${socket.user.id}`);
        logger.info({ socketId: socket.id }, `Socket joined room business_owner_${socket.user.id}`);
      } else if (socket.user.role === 'rider') {
        socket.join(`rider_${socket.user.id}`);
        logger.info({ socketId: socket.id }, `Socket joined room rider_${socket.user.id}`);
      } else if (socket.user.role === 'admin') {
        socket.join('admin_room');
      }

      // Allow business owners to join a specific business room after providing businessId
      socket.on('join_business', (businessId) => {
        if (socket.user.role === 'business_owner' || socket.user.roles.includes('admin')) {
          socket.join(`business_${businessId}`);
          logger.info({ socketId: socket.id, businessId }, 'Socket joined business room');
        }
      });

      // Allow riders to broadcast their location and save to MongoDB.
      // The rider must actually be the one assigned to this order (M8) -
      // otherwise any authenticated rider could inject spoofed GPS
      // coordinates into an unrelated order's tracking room just by
      // supplying an arbitrary orderId, regardless of track_order's
      // join-time authorization (M7).
      socket.on('rider_location_update', async (data) => {
        if (
          socket.user.role !== 'rider' ||
          !data.orderId ||
          !mongoose.isValidObjectId(data.orderId) ||
          data.lat === undefined ||
          data.lng === undefined
        ) {
          return;
        }

        const latitude = parseFloat(data.lat);
        const longitude = parseFloat(data.lng);
        if (isNaN(latitude) || isNaN(longitude)) return;

        try {
          const delivery = await Delivery.findOneAndUpdate(
            { order: data.orderId, rider: socket.user.id },
            {
              currentLocation: { type: 'Point', coordinates: [longitude, latitude] },
              lastLocationUpdate: new Date(),
            }
          ).select('_id');

          if (!delivery) {
            logger.warn(
              { socketId: socket.id, userId: socket.user.id, orderId: data.orderId },
              'Rejected rider_location_update: rider is not assigned to this order'
            );
            return;
          }

          io.to(`order_tracking_${data.orderId}`).emit('location_update', {
            riderId: socket.user.id,
            lat: latitude,
            lng: longitude,
            timestamp: new Date(),
          });
        } catch (err) {
          logger.error({ err, orderId: data.orderId }, 'Failed to save rider location from socket');
        }
      });

      // Allow customers/vendors to subscribe to a specific order tracking
      // room - but only someone with an actual reason to see it: the
      // customer, the assigned rider, the owning business, or an admin
      // (M7). Without this, any authenticated socket could join ANY order's
      // room just by guessing/enumerating an orderId and start receiving a
      // stranger's live delivery GPS coordinates via rider_location_update.
      socket.on('track_order', async (orderId) => {
        if (!orderId || !mongoose.isValidObjectId(orderId)) return;

        try {
          if (socket.user.roles.includes('admin')) {
            socket.join(`order_tracking_${orderId}`);
            return;
          }

          const order = await Order.findById(orderId)
            .select('customer business')
            .populate('business', 'owner')
            .lean();
          if (!order) return;

          const isCustomer = order.customer?.toString() === socket.user.id;
          const isOwningBusiness = order.business?.owner?.toString() === socket.user.id;

          let isAssignedRider = false;
          if (!isCustomer && !isOwningBusiness && socket.user.role === 'rider') {
            const delivery = await Delivery.findOne({ order: orderId, rider: socket.user.id })
              .select('_id')
              .lean();
            isAssignedRider = !!delivery;
          }

          if (isCustomer || isOwningBusiness || isAssignedRider) {
            socket.join(`order_tracking_${orderId}`);
          } else {
            logger.warn(
              { socketId: socket.id, userId: socket.user.id, orderId },
              'Rejected track_order: requester has no relationship to this order'
            );
          }
        } catch (err) {
          logger.error({ err, orderId }, 'track_order authorization check failed');
        }
      });

      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Socket disconnected');
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  // Closes the adapter's dedicated Redis connections. Called during
  // graceful shutdown, separately from config/redis.js's own close() which
  // only owns the caching client.
  closeAdapter: async () => {
    try {
      if (pubClient) await pubClient.quit();
    } catch {
      // best-effort cleanup during shutdown
    }
    try {
      if (subClient) await subClient.quit();
    } catch {
      // best-effort cleanup during shutdown
    }
    pubClient = null;
    subClient = null;
  },
};
