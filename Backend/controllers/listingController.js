const Listing = require('../models/Listing');
const Business = require('../models/Business');
const { uploadMultipleToCloudinary } = require('../utils/cloudinaryUpload');
const logger = require('../utils/logger');

/**
 * @desc    Create a new listing
 * @route   POST /api/listings
 * @access  Private (business_owner, admin)
 */
const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      business,
      category,
      pricing,
      inventory,
      timeWindow,
      fulfillment,
      nutritionalInfo, // Added
      images, // Added
    } = req.body;

    // Validation
    if (!title || !description || !business || !category || !pricing || !inventory || !timeWindow) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify business exists and user owns it
    const businessDoc = await Business.findById(business);
    if (!businessDoc) {
      return res.status(404).json({ message: 'Business not found' });
    }

    if (businessDoc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Not authorized to create listing for this business' });
    }

    // businessDoc.status is the same active/inactive/suspended gate
    // approveBusiness/rejectBusiness/admin-suspend already set - a business
    // pending KYC review (inactive) or suspended must not be able to start
    // selling just by calling this endpoint directly, regardless of what
    // the signup UI implies. Types exempt from verification (bakery, farmer,
    // supermarket - see createBusiness) are created 'active' immediately, so
    // this doesn't block them.
    if (businessDoc.status !== 'active' && req.user.role !== 'admin') {
      return res.status(403).json({
        message:
          'This business is not yet approved to sell. Please wait for verification to complete.',
      });
    }

    const listing = await Listing.create({
      title,
      description,
      business,
      category,
      pricing,
      inventory,
      timeWindow,
      fulfillment,
      nutritionalInfo,
      images,
    });

    // Update business stats
    businessDoc.stats.totalListings += 1;
    await businessDoc.save();

    res.status(201).json(listing);
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all listings with filters
 * @route   GET /api/listings
 * @access  Public
 */
const getListings = async (req, res) => {
  try {
    const { category, status, business, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by category
    if (category) query.category = category;

    // Filter by status (default to active only). Special-case 'all' to disable status filtering.
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'active';
    }

    // Filter by business
    if (business) query.business = business;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Only apply the time window filter for the default/public "active now" view.
    // If a caller explicitly requests a status (e.g. inactive/expired/all), don't filter by time window
    // so admin/business dashboards can view historical/expired listings.
    if (!status) {
      const now = new Date();
      query['timeWindow.availableFrom'] = { $lte: now };
      query['timeWindow.availableUntil'] = { $gt: now };
    }

    const listings = await Listing.find(query)
      .populate('business', 'name type address media')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Listing.countDocuments(query);

    res.json({
      listings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get listings near a location
 * @route   GET /api/listings/nearby
 * @access  Public
 */
const getNearbyListings = async (req, res) => {
  try {
    const { category } = req.query;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    // Radius in meters, capped so one request can't scan the whole country.
    const radius = Math.min(parseInt(req.query.radius) || 5000, 50000);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return res.status(400).json({ message: 'Please provide a valid latitude and longitude' });
    }

    // Businesses store coordinates in the top-level `location` field, which is
    // the one with the 2dsphere index (createBusiness moves them there and
    // deletes address.location). $geoNear also gives each business its
    // distance, which clients need to filter/sort by - this endpoint used to
    // query the unindexed `address.location` path (which MongoDB rejects) and
    // never returned a distance at all.
    const nearbyBusinesses = await Business.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: radius,
          spherical: true,
          query: { status: 'active' },
        },
      },
      { $project: { _id: 1, distanceMeters: 1 } },
    ]);

    const businessIds = nearbyBusinesses.map((b) => b._id);
    const distanceKmByBusiness = new Map(
      nearbyBusinesses.map((b) => [String(b._id), Math.round(b.distanceMeters / 100) / 10])
    );

    // Then find active listings from those businesses
    const query = {
      business: { $in: businessIds },
      status: 'active',
    };

    if (category) query.category = category;

    // Only show listings within time window
    const now = new Date();
    query['timeWindow.availableFrom'] = { $lte: now };
    query['timeWindow.availableUntil'] = { $gt: now };

    const listings = await Listing.find(query)
      .populate('business', 'name type address media')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Listing.countDocuments(query);

    res.json({
      // Distance in km (one decimal), from the listing's business.
      listings: listings.map((l) => ({
        ...l,
        distance: distanceKmByBusiness.get(String(l.business?._id || l.business)),
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get listing by ID
 * @route   GET /api/listings/:id
 * @access  Public
 */
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      'business',
      'name type address contact media deliverySettings'
    );

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Increment view count atomically without calling save() (which runs full schema validation and can fail on read-only requests)
    await Listing.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.views': 1 },
    });
    if (!listing.stats) listing.stats = { views: 0, orders: 0 };
    listing.stats.views = (listing.stats.views || 0) + 1;

    res.json(listing);
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update listing
 * @route   PUT /api/listings/:id
 * @access  Private (business owner or admin)
 */
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('business');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check ownership
    if (
      listing.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    // Update fields
    const allowedUpdates = [
      'title',
      'description',
      'category',
      'pricing',
      'inventory',
      'timeWindow',
      'fulfillment',
      'status',
      'nutritionalInfo',
      'images',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();

    res.json(listing);
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete listing
 * @route   DELETE /api/listings/:id
 * @access  Private (business owner or admin)
 */
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('business');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check ownership
    if (
      listing.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await listing.deleteOne();

    // Update business stats
    const business = await Business.findById(listing.business._id);
    if (business.stats.totalListings > 0) {
      business.stats.totalListings -= 1;
      await business.save();
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload listing photos
 * @route   POST /api/listings/:id/photos
 * @access  Private (business owner or admin)
 */
const uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    const listing = await Listing.findById(req.params.id).populate('business');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check ownership
    if (
      listing.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to Cloudinary
    const photoUrls = await uploadMultipleToCloudinary(req.files, 'chopnow/listings');

    listing.images.push(...photoUrls);
    await listing.save();

    res.json({
      message: 'Photos uploaded successfully',
      images: listing.images,
    });
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get listings by business
 * @route   GET /api/listings/business/:businessId
 * @access  Public
 */
const getListingsByBusiness = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { business: req.params.businessId };

    if (status) {
      query.status = status;
    }

    const [listings, total] = await Promise.all([
      Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Listing.countDocuments(query),
    ]);

    res.json({
      listings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Listing error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createListing,
  getListings,
  getNearbyListings,
  getListingById,
  updateListing,
  deleteListing,
  uploadPhotos,
  getListingsByBusiness,
};
