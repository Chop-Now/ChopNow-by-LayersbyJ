const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favoriteSchema = new Schema(
  {
    // User Reference
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },

    // Favorite Type
    favoriteType: {
      type: String,
      enum: ['business', 'listing'],
      required: [true, 'Favorite type is required'],
    },

    // Business Reference (for business favorites)
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
    },

    // Listing Reference (for listing favorites)
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
    },

    // Notes
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Unique compound index for user + business (sparse to allow null business)
favoriteSchema.index({ user: 1, business: 1 }, { unique: true, sparse: true });

// Unique compound index for user + listing (sparse to allow null listing)
favoriteSchema.index({ user: 1, listing: 1 }, { unique: true, sparse: true });

// Index for querying favorites by user and type
favoriteSchema.index({ user: 1, favoriteType: 1 });

// Validation to ensure either business or listing is set based on favoriteType
favoriteSchema.pre('save', function () {
  if (this.favoriteType === 'business') {
    if (!this.business) {
      throw new Error('Business reference is required when favoriteType is "business"');
    }
    if (this.listing) {
      throw new Error('Listing reference should not be set when favoriteType is "business"');
    }
  } else if (this.favoriteType === 'listing') {
    if (!this.listing) {
      throw new Error('Listing reference is required when favoriteType is "listing"');
    }
    if (this.business) {
      throw new Error('Business reference should not be set when favoriteType is "listing"');
    }
  }
});

// Static method to toggle favorite
favoriteSchema.statics.toggleFavorite = async function (userId, favoriteType, referenceId) {
  const query = { user: userId, favoriteType };

  if (favoriteType === 'business') {
    query.business = referenceId;
  } else if (favoriteType === 'listing') {
    query.listing = referenceId;
  }

  const existingFavorite = await this.findOne(query);

  if (existingFavorite) {
    // Remove favorite
    await existingFavorite.deleteOne();
    return { action: 'removed', favorite: null };
  } else {
    // Add favorite
    const newFavorite = await this.create(query);
    return { action: 'added', favorite: newFavorite };
  }
};

// Static method to check if item is favorited by user
favoriteSchema.statics.isFavorited = async function (userId, favoriteType, referenceId) {
  const query = { user: userId, favoriteType };

  if (favoriteType === 'business') {
    query.business = referenceId;
  } else if (favoriteType === 'listing') {
    query.listing = referenceId;
  }

  const favorite = await this.findOne(query);
  return !!favorite;
};

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
