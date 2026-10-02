const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deliverySchema = new Schema(
  {
    // Order Reference
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      unique: true,
    },

    // Rider Information
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    riderName: {
      type: String,
      trim: true,
    },
    riderPhone: {
      type: String,
      trim: true,
    },

    // Pickup Location
    pickupLocation: {
      businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Pickup address is required'],
        trim: true,
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      contactPhone: {
        type: String,
        trim: true,
      },
    },

    // Dropoff Location
    dropoffLocation: {
      recipientName: {
        type: String,
        required: [true, 'Recipient name is required'],
        trim: true,
      },
      recipientPhone: {
        type: String,
        required: [true, 'Recipient phone is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Dropoff address is required'],
        trim: true,
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      instructions: {
        type: String,
        trim: true,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'],
      default: 'pending',
    },

    // Current Location (for real-time tracking)
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    lastLocationUpdate: {
      type: Date,
    },

    // Distance and Time
    distance: {
      type: Number, // in kilometers
      min: 0,
    },
    estimatedDuration: {
      type: Number, // in minutes
      min: 0,
    },

    // Delivery Fee
    deliveryFee: {
      type: Number,
      required: [true, 'Delivery fee is required'],
      min: [0, 'Delivery fee cannot be negative'],
    },
    currency: {
      type: String,
      default: 'RWF',
    },

    // Proof of Delivery
    proofOfDelivery: {
      photo: {
        type: String,
        trim: true,
      },
      signature: {
        type: String,
        trim: true,
      },
      notes: {
        type: String,
        trim: true,
      },
    },

    // Timestamps for status changes
    statusTimestamps: {
      assignedAt: {
        type: Date,
      },
      pickedUpAt: {
        type: Date,
      },
      deliveredAt: {
        type: Date,
      },
      cancelledAt: {
        type: Date,
      },
    },

    // Cancellation
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
deliverySchema.index({ 'pickupLocation.location': '2dsphere' }); // Nearby pickup search
deliverySchema.index({ 'dropoffLocation.location': '2dsphere' }); // Nearby dropoff search
deliverySchema.index({ currentLocation: '2dsphere' }); // Real-time location tracking
deliverySchema.index({ rider: 1, status: 1, createdAt: -1 }); // Rider's deliveries
deliverySchema.index({ status: 1, createdAt: -1 }); // Deliveries by status
deliverySchema.index({ 'statusTimestamps.deliveredAt': -1 }, { sparse: true }); // Completed deliveries
deliverySchema.index({ status: 1, rider: 1 }, { sparse: true }); // Available/unassigned deliveries

// Validate coordinates
deliverySchema.pre('save', function () {
  const validateCoordinates = (coords, fieldName) => {
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return `Invalid ${fieldName} coordinates. Longitude must be between -180 and 180, latitude between -90 and 90`;
      }
    }
    return null;
  };

  let error = null;

  if (this.pickupLocation && this.pickupLocation.location) {
    error = validateCoordinates(this.pickupLocation.location.coordinates, 'pickup location');
  }

  if (!error && this.dropoffLocation && this.dropoffLocation.location) {
    error = validateCoordinates(this.dropoffLocation.location.coordinates, 'dropoff location');
  }

  if (!error && this.currentLocation && this.currentLocation.coordinates) {
    error = validateCoordinates(this.currentLocation.coordinates, 'current location');
  }

  if (error) {
    throw new Error(error);
  }
});

// Method to update delivery status with timestamp
deliverySchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;

  const statusTimestampMap = {
    assigned: 'assignedAt',
    picked_up: 'pickedUpAt',
    delivered: 'deliveredAt',
    cancelled: 'cancelledAt',
  };

  const timestampField = statusTimestampMap[newStatus];
  if (timestampField) {
    this.statusTimestamps[timestampField] = new Date();
  }

  return this.save();
};

// Method to update current location
deliverySchema.methods.updateLocation = function (longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  this.lastLocationUpdate = new Date();
  return this.save();
};

// Method to calculate distance between two points (Haversine formula)
deliverySchema.methods.calculateDistance = function () {
  if (!this.pickupLocation.location || !this.dropoffLocation.location) {
    return 0;
  }

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const [lng1, lat1] = this.pickupLocation.location.coordinates;
  const [lng2, lat2] = this.dropoffLocation.location.coordinates;

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  this.distance = Math.round(distance * 100) / 100; // Round to 2 decimal places
  return this.distance;
};

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery;
