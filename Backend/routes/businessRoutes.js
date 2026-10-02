const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/businessController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadDocs = require('../middleware/uploadDocs');
const { validateCreateBusiness } = require('../middleware/validation');
const { cacheBusinesses, cacheBusiness, invalidateAfter } = require('../middleware/cache');
const { checkOwnership } = require('../middleware/ownership');

// Public routes

/**
 * @swagger
 * /businesses:
 *   get:
 *     summary: Get all businesses
 *     tags: [Businesses]
 *     responses:
 *       200:
 *         description: List of businesses
 */
router.get('/', cacheBusinesses, getBusinesses);

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get my businesses - must be before /:id
router.get('/my/list', protect, authorize('business_owner', 'admin'), getMyBusinesses);

// Admin-only: Business approval workflow
router.get('/pending', protect, authorize('admin'), getPendingBusinesses);
router.patch(
  '/:id/approve',
  protect,
  authorize('admin'),
  invalidateAfter('business'),
  approveBusiness
);
router.patch(
  '/:id/reject',
  protect,
  authorize('admin'),
  invalidateAfter('business'),
  rejectBusiness
);
router.patch(
  '/:id/request-info',
  protect,
  authorize('admin'),
  invalidateAfter('business'),
  requestMoreInfo
);
router.patch(
  '/:id/rescind',
  protect,
  authorize('admin'),
  invalidateAfter('business'),
  rescindBusiness
);

// Get by ID - comes after specific routes
router.get('/:id', cacheBusiness, getBusinessById);

// Get business stats - must be before other /:id routes
router.get('/:id/stats', protect, authorize('business_owner', 'admin'), getBusinessStats);

// Protected routes - business owner or admin

/**
 * @swagger
 * /businesses:
 *   post:
 *     summary: Create a new business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business created
 */
router.post(
  '/',
  protect,
  authorize('business_owner', 'admin'),
  validateCreateBusiness,
  invalidateAfter('business', (req, body) => body?.business?._id),
  createBusiness
);
router.put(
  '/:id',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  invalidateAfter('business'),
  updateBusiness
);
router.delete(
  '/:id',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  invalidateAfter('business'),
  deleteBusiness
);

// Image upload routes - business_owner and admin only, with ownership check
router.post(
  '/:id/logo',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  upload.single('logo'),
  uploadLogo
);
router.post(
  '/:id/cover',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  upload.single('cover'),
  uploadCoverImage
);
router.post(
  '/:id/photos',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  upload.array('photos', 10),
  uploadPhotos
);
router.post(
  '/:id/kyc',
  protect,
  authorize('business_owner', 'admin'),
  checkOwnership('Business'),
  uploadDocs.array('documents'),
  uploadKYC
);

module.exports = router;
