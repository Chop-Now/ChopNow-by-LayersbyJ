const express = require('express');
const router = express.Router();
const {
  createDelivery,
  getDeliveryByOrder,
  getAvailableDeliveries,
  getMyDeliveries,
  assignRider,
  updateDeliveryStatus,
  updateRiderLocation,
  uploadProofOfDelivery,
  getAllDeliveries,
  getRiderStats,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET  /api/v1/deliveries          — all deliveries (admin)
router.get('/', protect, authorize('admin'), getAllDeliveries);

// POST /api/v1/deliveries          — create delivery for a delivery order (vendor/admin)
router.post('/', protect, authorize('business_owner', 'admin'), createDelivery);

// ── Rider ──────────────────────────────────────────────────────────────────────

// GET  /api/v1/deliveries/available — unassigned deliveries nearby (rider/admin)
router.get('/available', protect, authorize('rider', 'admin'), getAvailableDeliveries);

// GET  /api/v1/deliveries/my        — rider's own deliveries
router.get('/my', protect, authorize('rider'), getMyDeliveries);

// GET  /api/v1/deliveries/rider-stats — rider stats
router.get('/rider-stats', protect, authorize('rider'), getRiderStats);

// ── Shared (by orderId) ────────────────────────────────────────────────────────

// GET  /api/v1/deliveries/order/:orderId — delivery status for an order
router.get('/order/:orderId', protect, getDeliveryByOrder);

// ── Delivery-level actions ────────────────────────────────────────────────────

// PATCH /api/v1/deliveries/:id/assign    — assign rider (admin self-assigns as rider too)
router.patch('/:id/assign', protect, authorize('rider', 'admin'), assignRider);

// PATCH /api/v1/deliveries/:id/status    — rider updates status
router.patch('/:id/status', protect, authorize('rider', 'admin'), updateDeliveryStatus);

// PATCH /api/v1/deliveries/:id/location  — rider posts current GPS location
router.patch('/:id/location', protect, authorize('rider'), updateRiderLocation);

// POST  /api/v1/deliveries/:id/proof     — rider uploads proof of delivery photo
router.post(
  '/:id/proof',
  protect,
  authorize('rider'),
  upload.single('photo'),
  uploadProofOfDelivery
);

module.exports = router;
