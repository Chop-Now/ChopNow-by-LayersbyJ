const express = require('express');
const router = express.Router();
const {
  createDispute,
  getMyDisputes,
  getBusinessDisputes,
  getAdminDisputes,
  getDisputeById,
  resolveDispute,
  getDisputeStats,
  getRefundRequests,
  updateRefundRequest,
} = require('../controllers/disputeController');
const { protect, authorize } = require('../middleware/auth');
const { validateCreateDispute } = require('../middleware/validation');

router.post('/', protect, validateCreateDispute, createDispute);
router.get('/me', protect, getMyDisputes);
router.get('/stats', protect, authorize('admin'), getDisputeStats);
router.get('/business', protect, authorize('admin', 'business_owner'), getBusinessDisputes);
router.get('/admin', protect, authorize('admin'), getAdminDisputes);
// Must come before /:id, or 'refund-requests' would be parsed as a dispute id.
router.get('/refund-requests', protect, authorize('admin'), getRefundRequests);
router.patch('/refund-requests/:id', protect, authorize('admin'), updateRefundRequest);
router.get('/:id', protect, getDisputeById);
router.patch('/:id/resolve', protect, authorize('admin'), resolveDispute);

module.exports = router;
