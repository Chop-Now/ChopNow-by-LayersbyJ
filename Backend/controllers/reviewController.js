const Review = require('../models/Review');
const Order = require('../models/Order');
const Business = require('../models/Business');
const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const _User = require('../models/User');

/**
 * @desc    Create a review
 * @route   POST /api/reviews
 * @access  Private (consumer)
 */
const createReview = async (req, res) => {
  try {
    const { order, rating, comment } = req.body;

    // Validation
    if (!order || !rating) {
      return res.status(400).json({ message: 'Please provide order and rating' });
    }

    // Verify order exists and belongs to user
    const orderDoc = await Order.findById(order);
    if (!orderDoc) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (orderDoc.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    // Check if order is completed
    if (orderDoc.status !== 'completed') {
      return res.status(400).json({ message: 'Order must be completed before reviewing' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ order });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already exists for this order' });
    }

    // The reviewed business always comes from the order itself - a client-
    // supplied `business` was previously trusted, letting a buyer attach a
    // review to any business, not the one they actually bought from.
    const business = orderDoc.business;

    const review = await Review.create({
      order,
      customer: req.user._id,
      business,
      rating,
      comment,
    });

    // Notify business owner of new review with rich metadata
    const businessDoc = await Business.findById(business).populate('owner');
    if (businessDoc && businessDoc.owner) {
      const customerName =
        `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'A customer';
      await Notification.createNotification({
        user: businessDoc.owner._id,
        title: 'New Review Received',
        message: `${customerName} left a ${rating}-star review`,
        type: 'new_review',
        relatedBusiness: business,
        relatedOrder: order,
        link: '/dashboard',
        metadata: {
          orderNumber: orderDoc.orderNumber,
          customerName,
          reviewRating: rating,
          reviewText: comment,
          businessName: businessDoc.name,
          actionLabel: 'View & Respond',
          actionUrl: '/dashboard',
        },
      });
    }

    res.status(201).json(review);
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get reviews for a business
 * @route   GET /api/reviews/business/:businessId
 * @access  Public
 */
const getBusinessReviews = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      business: req.params.businessId,
      status,
    };

    const reviews = await Review.find(query)
      .populate('customer', 'firstName lastName avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('customer', 'firstName lastName avatar')
      .populate('business', 'name type')
      .populate('order', 'orderNumber')
      .lean();

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private (review author)
 */
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check authorization
    if (review.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    if (req.body.rating) review.rating = req.body.rating;
    if (req.body.comment !== undefined) review.comment = req.body.comment;

    await review.save();

    res.json(review);
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private (review author or admin)
 */
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check authorization
    if (review.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Add business response to review
 * @route   POST /api/reviews/:id/response
 * @access  Private (business owner)
 */
const addBusinessResponse = async (req, res) => {
  try {
    // Accept either 'comment' or 'response' field for backward compatibility
    const comment = req.body.comment || req.body.response;

    if (!comment) {
      return res.status(400).json({ message: 'Please provide a response comment' });
    }

    const review = await Review.findById(req.params.id).populate('business');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check authorization - must be business owner
    const business = await Business.findById(review.business._id);
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to respond to this review' });
    }

    await review.addBusinessResponse(comment);

    // Notify the customer that business responded to their review
    const businessDoc = await Business.findById(review.business._id);
    if (businessDoc) {
      await Notification.createNotification({
        user: review.customer,
        title: 'Business Responded to Your Review',
        message: `${businessDoc.name} responded to your review`,
        type: 'review_response',
        relatedBusiness: review.business._id,
        relatedOrder: review.order,
        link: '/my-orders',
        metadata: {
          businessName: businessDoc.name,
          businessLogo: businessDoc.media?.logo,
          reviewRating: review.rating,
          reviewText: comment,
          actionLabel: 'View Response',
          actionUrl: '/my-orders',
        },
      });
    }

    res.json(review);
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get my reviews
 * @route   GET /api/reviews/my/list
 * @access  Private
 */
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user._id })
      .populate('business', 'name type media')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (error) {
    logger.error({ err: error }, 'Review error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createReview,
  getBusinessReviews,
  getReviewById,
  updateReview,
  deleteReview,
  addBusinessResponse,
  getMyReviews,
};
