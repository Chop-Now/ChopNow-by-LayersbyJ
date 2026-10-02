const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getNearbyListings,
  getListingById,
  updateListing,
  deleteListing,
  uploadPhotos,
  getListingsByBusiness,
} = require('../controllers/listingController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateCreateListing } = require('../middleware/validation');
const { cacheListings, cacheListing, invalidateAfter } = require('../middleware/cache');
const { checkListingOwnership } = require('../middleware/ownership');

// Public routes

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Get all listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of listings
 */
router.get('/', optionalAuth, cacheListings, getListings);
router.get('/nearby', optionalAuth, getNearbyListings);
router.get('/business/:businessId', getListingsByBusiness);
router.get('/:id', optionalAuth, cacheListing, getListingById);

// Protected routes - business owner or admin

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create a new listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - business
 *               - title
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Listing created
 */
router.post(
  '/',
  protect,
  authorize('business_owner', 'admin'),
  validateCreateListing,
  invalidateAfter('listing', (req, body) => body?.listing?._id),
  createListing
);
router.put(
  '/:id',
  protect,
  authorize('business_owner', 'admin'),
  checkListingOwnership(),
  invalidateAfter('listing'),
  updateListing
);
router.delete(
  '/:id',
  protect,
  authorize('business_owner', 'admin'),
  checkListingOwnership(),
  invalidateAfter('listing'),
  deleteListing
);

// Image upload routes
router.post(
  '/:id/photos',
  protect,
  authorize('business_owner', 'admin'),
  checkListingOwnership(),
  upload.array('photos', 5),
  uploadPhotos
);

module.exports = router;
