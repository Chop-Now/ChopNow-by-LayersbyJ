const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Schema = mongoose.Schema;

const reviewSchema = new Schema(
  {
    // Order Reference
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      unique: true,
    },

    // Customer Reference
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
    },

    // Business Reference
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
    },

    // Rating
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    // Comment
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },

    // Business Response
    businessResponse: {
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Response cannot exceed 500 characters'],
      },
      respondedAt: {
        type: Date,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'hidden'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
reviewSchema.index({ business: 1, status: 1, createdAt: -1 }); // Business reviews sorted by date
reviewSchema.index({ customer: 1, createdAt: -1 }); // Customer's reviews
reviewSchema.index({ business: 1, rating: -1, status: 1 }); // Top-rated reviews for business
reviewSchema.index({ rating: -1, status: 1, createdAt: -1 }); // Reviews by rating
reviewSchema.index({ 'businessResponse.respondedAt': -1 }, { sparse: true }); // Reviews with responses

// Ensure rating is an integer
reviewSchema.pre('save', function () {
  if (this.rating) {
    this.rating = Math.round(this.rating);
  }
});

// Static method to calculate average rating for a business
reviewSchema.statics.calculateAverageRating = async function (businessId) {
  const result = await this.aggregate([
    {
      $match: {
        business: businessId,
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$business',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: result[0].reviewCount,
    };
  }

  return {
    averageRating: 0,
    reviewCount: 0,
  };
};

// Method to add business response
reviewSchema.methods.addBusinessResponse = function (responseComment) {
  this.businessResponse = {
    comment: responseComment,
    respondedAt: new Date(),
  };
  return this.save();
};

// Post-save hook to update business stats
reviewSchema.post('save', async function (doc) {
  try {
    const Business = mongoose.model('Business');
    const stats = await doc.constructor.calculateAverageRating(doc.business);

    // Update both stats and rating fields for consistency
    await Business.findByIdAndUpdate(doc.business, {
      'stats.averageRating': stats.averageRating,
      'stats.reviewCount': stats.reviewCount,
      'rating.average': stats.averageRating,
      'rating.count': stats.reviewCount,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating business stats');
  }
});

// Post-remove hook to update business stats
reviewSchema.post('deleteOne', { document: true, query: false }, async function (doc) {
  try {
    const Business = mongoose.model('Business');
    const stats = await doc.constructor.calculateAverageRating(doc.business);

    // Update both stats and rating fields for consistency
    await Business.findByIdAndUpdate(doc.business, {
      'stats.averageRating': stats.averageRating,
      'stats.reviewCount': stats.reviewCount,
      'rating.average': stats.averageRating,
      'rating.count': stats.reviewCount,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating business stats');
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
