const Business = require('../models/Business');
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryUpload');
const {
  sendBusinessApprovedEmail,
  sendBusinessRejectedEmail,
  sendBusinessInfoRequestedEmail,
  sendBusinessRescindedEmail,
} = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * @desc    Create a new business
 * @route   POST /api/businesses
 * @access  Private (business_owner, admin)
 */
const createBusiness = async (req, res) => {
  try {
    const { name, type, description, contact, address, deliverySettings } = req.body;

    // Validation
    if (!name || !type || !contact || !address) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Set location from address coordinates if provided
    const location = address?.location?.coordinates
      ? { type: 'Point', coordinates: address.location.coordinates }
      : undefined;

    if (address && address.location) {
      delete address.location;
    }

    // Every business type requires admin document verification before it
    // can start selling - matches the signup UI, which already told every
    // type (bakery, farmer, supermarket included) that verification was
    // required and forced them through the KYC upload step regardless.
    const requiresVerification = true;

    const verificationData = {
      status: 'unverified',
      documents: [],
    };

    const businessStatus = 'inactive';

    const business = await Business.create({
      name,
      type,
      description,
      owner: req.user._id,
      email: contact?.email,
      phone: contact?.phone,
      website: contact?.website,
      address,
      location,
      deliverySettings,
      status: businessStatus,
      verification: verificationData,
    });

    // Upgrade user role if they don't already have business_owner role
    if (!req.user.roles.includes('business_owner')) {
      req.user.roles.push('business_owner');
      req.user.activeRole = 'business_owner';
      await req.user.save();
    }

    res.status(201).json({
      ...business.toObject(),
      requiresVerification,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all businesses with filters
 * @route   GET /api/businesses
 * @access  Public
 */
const getBusinesses = async (req, res) => {
  try {
    const { type, status, search, lat, lng, radius = 5000 } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by type
    if (type) query.type = type;

    // Filter by status (default to active only). Special-case 'all' to disable status filtering.
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'active';
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Geospatial search (nearby businesses). `location` is the 2dsphere-indexed
    // field createBusiness populates; `address.location` is deleted on create.
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius), // in meters
        },
      };
    }

    const businesses = await Business.find(query)
      .populate('owner', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Business.countDocuments(query);

    res.json({
      businesses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get business by ID
 * @route   GET /api/businesses/:id
 * @access  Public
 */
const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone')
      .lean();

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update business
 * @route   PUT /api/businesses/:id
 * @access  Private (owner or admin)
 */
const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this business' });
    }

    // Update fields
    const allowedUpdates = [
      'name',
      'type',
      'description',
      'contact',
      'address',
      'deliverySettings',
      'payoutInfo',
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'contact') {
          if (req.body.contact.email) business.email = req.body.contact.email;
          if (req.body.contact.phone) business.phone = req.body.contact.phone;
          if (req.body.contact.website) business.website = req.body.contact.website;
        } else {
          business[field] = req.body[field];
        }
      }
    });

    // Admin-only: allow operational status change (active/suspended)
    if (req.user.role === 'admin' && req.body.status !== undefined) {
      business.status = req.body.status;
    }

    await business.save();

    res.json(business);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete business
 * @route   DELETE /api/businesses/:id
 * @access  Private (owner or admin)
 */
const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this business' });
    }

    await business.deleteOne();

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload business logo
 * @route   POST /api/businesses/:id/logo
 * @access  Private (owner or admin)
 */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'chopnow/businesses/logos');

    // Initialize media object if not exists
    if (!business.media) business.media = {};
    business.media.logo = result.secure_url;
    await business.save();

    res.json({
      message: 'Logo uploaded successfully',
      logo: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload business cover image
 * @route   POST /api/businesses/:id/cover
 * @access  Private (owner or admin)
 */
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'chopnow/businesses/covers');

    // Initialize media object if not exists
    if (!business.media) business.media = {};
    business.media.coverImage = result.secure_url;
    await business.save();

    res.json({
      message: 'Cover image uploaded successfully',
      coverImage: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload business photos
 * @route   POST /api/businesses/:id/photos
 * @access  Private (owner or admin)
 */
const uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to Cloudinary
    const photoUrls = await uploadMultipleToCloudinary(req.files, 'chopnow/businesses/photos');

    // Initialize media object if not exists
    if (!business.media) business.media = { photos: [] };
    if (!business.media.photos) business.media.photos = [];
    business.media.photos.push(...photoUrls);
    await business.save();

    res.json({
      message: 'Photos uploaded successfully',
      photos: business.media.photos,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload business KYC documents
 * @route   POST /api/businesses/:id/kyc
 * @access  Private (owner or admin)
 */
const uploadKYC = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload a document (Image or PDF)' });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check ownership
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload all files to Cloudinary
    const uploadedDocuments = [];

    for (const file of req.files) {
      // Determine resource type
      const isPDF = file.mimetype === 'application/pdf';
      const resourceType = isPDF ? 'auto' : 'image';

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file.buffer, 'chopnow/businesses/kyc', resourceType);

      uploadedDocuments.push({
        url: result.secure_url,
        uploadedAt: new Date(),
      });
    }

    // UPDATE BUSINESS DETAILS (Phone, Address, Location)
    if (req.body.phone) business.phone = req.body.phone;

    if (req.body.address) {
      // If address is just a string, update the text part
      if (typeof business.address === 'object') {
        business.address.text = req.body.address;
      } else {
        business.address = req.body.address;
      }
    }

    if (req.body.location) {
      try {
        const locationData = JSON.parse(req.body.location);
        if (locationData.lat && locationData.lng) {
          business.location = {
            type: 'Point',
            coordinates: [locationData.lng, locationData.lat],
          };

          // Also update address object if it exists
          if (business.address && typeof business.address === 'object') {
            business.address.lat = locationData.lat;
            business.address.lng = locationData.lng;
          }
        }
      } catch (e) {
        logger.error({ err: e }, 'Error parsing location');
      }
    }

    // Initialize verification object if it doesn't exist
    if (!business.verification) {
      business.verification = {
        status: 'pending',
        documents: [],
        submittedAt: new Date(),
      };
    }

    // Add new documents to existing documents array
    business.verification.documents.push(...uploadedDocuments);
    business.verification.status = 'pending';
    business.verification.submittedAt = new Date();

    await business.save();

    res.json({
      message: 'KYC documents uploaded successfully. Verification is pending.',
      verification: business.verification,
      documentsUploaded: uploadedDocuments.length,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get my businesses
 * @route   GET /api/businesses/my/list
 * @access  Private (business_owner)
 */
const getMyBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { owner: req.user._id };

    const [businesses, total] = await Promise.all([
      Business.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Business.countDocuments(query),
    ]);

    res.json({
      businesses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get business statistics
 * @route   GET /api/businesses/:id/stats
 * @access  Private (business owner, admin)
 */
const getBusinessStats = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).lean();
    const Listing = require('../models/Listing');
    const Order = require('../models/Order');

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check authorization
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all independent queries in parallel
    const [activeListings, ordersToday, revenueResult, mealsSaved] = await Promise.all([
      // Count active listings
      Listing.countDocuments({
        business: business._id,
        status: 'active',
      }),
      // Count orders today
      Order.countDocuments({
        business: business._id,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      // Calculate total revenue using aggregation instead of loading all orders
      Order.aggregate([
        { $match: { business: business._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      // Calculate impact (meals saved)
      Order.countDocuments({
        business: business._id,
        status: 'completed',
      }),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      activeListings,
      ordersToday,
      totalRevenue,
      mealsSaved,
      totalOrders: business.stats.totalOrders || 0,
      averageRating: business.stats.averageRating || 0,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get pending businesses (admin approval queue)
 * @route   GET /api/businesses/pending
 * @access  Private (admin)
 */
const getPendingBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Query by verification.status - include 'pending' (submitted KYC) and 'unverified' (awaiting KYC)
    const query = { 'verification.status': { $in: ['pending', 'unverified'] } };

    const businesses = await Business.find(query)
      .populate('owner', 'firstName lastName email phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Business.countDocuments(query);

    res.json({
      businesses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Approve business
 * @route   PATCH /api/businesses/:id/approve
 * @access  Private (admin)
 */
const approveBusiness = async (req, res) => {
  try {
    const { message } = req.body;

    const business = await Business.findById(req.params.id).populate(
      'owner',
      'firstName lastName email'
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    business.status = 'active';
    if (!business.verification) {
      business.verification = {};
    }
    business.verification.status = 'approved';
    business.verification.reviewedAt = new Date();
    business.verification.reviewedBy = req.user._id;
    if (message) {
      business.verification.approvalMessage = message;
    }

    await business.save();

    // Send approval email to business owner
    if (business.owner && business.owner.email) {
      const ownerName =
        `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim() ||
        'Business Owner';
      try {
        await sendBusinessApprovedEmail(
          business.owner.email,
          business.name,
          ownerName,
          message || ''
        );
        logger.info(
          { businessId: business._id, email: business.owner.email },
          'Business approval email sent'
        );
      } catch (emailError) {
        logger.error(
          { err: emailError, businessId: business._id },
          'Failed to send business approval email'
        );
        // Don't fail the approval if email fails
      }
    }

    res.json({ message: 'Business approved successfully', business });
  } catch (error) {
    logger.error({ err: error }, 'Error approving business');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Reject business
 * @route   PATCH /api/businesses/:id/reject
 * @access  Private (admin)
 */
const rejectBusiness = async (req, res) => {
  try {
    const { reason } = req.body;

    const business = await Business.findById(req.params.id).populate(
      'owner',
      'firstName lastName email'
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Set main status to inactive (rejected is not a valid status in the schema)
    business.status = 'inactive';
    if (!business.verification) {
      business.verification = {};
    }
    business.verification.status = 'rejected';
    business.verification.rejectionReason = reason || 'Application rejected';
    business.verification.reviewedAt = new Date();
    business.verification.reviewedBy = req.user._id;

    await business.save();

    // Send rejection email to business owner
    if (business.owner && business.owner.email) {
      const ownerName =
        `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim() ||
        'Business Owner';
      try {
        await sendBusinessRejectedEmail(
          business.owner.email,
          business.name,
          ownerName,
          reason || ''
        );
        logger.info(
          { businessId: business._id, email: business.owner.email },
          'Business rejection email sent'
        );
      } catch (emailError) {
        logger.error(
          { err: emailError, businessId: business._id },
          'Failed to send business rejection email'
        );
        // Don't fail the rejection if email fails
      }
    }

    res.json({ message: 'Business rejected', business });
  } catch (error) {
    logger.error({ err: error }, 'Error rejecting business');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Request more info from business
 * @route   PATCH /api/businesses/:id/request-info
 * @access  Private (admin)
 */
const requestMoreInfo = async (req, res) => {
  try {
    const { message } = req.body;

    const business = await Business.findById(req.params.id).populate(
      'owner',
      'firstName lastName email'
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    if (!business.verification) {
      business.verification = {};
    }
    business.verification.status = 'info_requested';
    business.verification.infoRequestMessage = message || 'Please provide additional information';
    business.verification.reviewedAt = new Date();
    business.verification.reviewedBy = req.user._id;

    await business.save();

    // Send info request email to business owner
    if (business.owner && business.owner.email) {
      const ownerName =
        `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim() ||
        'Business Owner';
      try {
        await sendBusinessInfoRequestedEmail(
          business.owner.email,
          business.name,
          ownerName,
          message || ''
        );
        logger.info(
          { businessId: business._id, email: business.owner.email },
          'Business info request email sent'
        );
      } catch (emailError) {
        logger.error(
          { err: emailError, businessId: business._id },
          'Failed to send business info request email'
        );
        // Don't fail the request if email fails
      }
    }

    res.json({ message: 'Information requested', business });
  } catch (error) {
    logger.error({ err: error }, 'Error requesting info from business');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Rescind business approval (revoke approved status)
 * @route   PATCH /api/businesses/:id/rescind
 * @access  Private (admin)
 */
const rescindBusiness = async (req, res) => {
  try {
    const { reason } = req.body;

    const business = await Business.findById(req.params.id).populate(
      'owner',
      'firstName lastName email'
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Can only rescind if currently approved/active
    if (business.verification?.status !== 'approved' && business.status !== 'active') {
      return res.status(400).json({ message: 'Can only rescind approved businesses' });
    }

    // Move back to pending status for re-review
    business.status = 'inactive';
    if (!business.verification) {
      business.verification = {};
    }
    business.verification.status = 'pending';
    business.verification.rescindReason = reason || 'Approval rescinded for review';
    business.verification.rescindedAt = new Date();
    business.verification.rescindedBy = req.user._id;

    await business.save();

    // Send rescind email to business owner
    if (business.owner && business.owner.email) {
      const ownerName =
        `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim() ||
        'Business Owner';
      try {
        await sendBusinessRescindedEmail(
          business.owner.email,
          business.name,
          ownerName,
          reason || ''
        );
        logger.info(
          { businessId: business._id, email: business.owner.email },
          'Business rescind email sent'
        );
      } catch (emailError) {
        logger.error(
          { err: emailError, businessId: business._id },
          'Failed to send business rescind email'
        );
        // Don't fail the rescind if email fails
      }
    }

    res.json({ message: 'Business approval rescinded', business });
  } catch (error) {
    logger.error({ err: error }, 'Error rescinding business');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  uploadLogo,
  uploadCoverImage,
  uploadPhotos,
  uploadKYC,
  getMyBusinesses,
  getBusinessStats,
  getPendingBusinesses,
  approveBusiness,
  rejectBusiness,
  requestMoreInfo,
  rescindBusiness,
};
