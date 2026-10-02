const express = require('express');
const router = express.Router();
const {
  requestPayout,
  getMyPayouts,
  getLedger,
  getAdminPayouts,
  updatePayoutStatus,
} = require('../controllers/payoutController');
const { protect, authorize } = require('../middleware/auth');
const { validatePayoutRequest, validatePayoutStatus } = require('../middleware/validation');

router.post(
  '/request',
  protect,
  authorize('business_owner', 'rider'),
  validatePayoutRequest,
  requestPayout
);
router.get('/me', protect, authorize('business_owner', 'rider'), getMyPayouts);
// Balance history: payees see their own; admins pass ?business= or ?user=.
router.get('/ledger', protect, authorize('business_owner', 'rider', 'admin'), getLedger);
router.get('/admin', protect, authorize('admin'), getAdminPayouts);
router.patch('/:id/status', protect, authorize('admin'), validatePayoutStatus, updatePayoutStatus);

module.exports = router;
