const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  handleWebhook,
  getPaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Initiate deposit payment - protected
router.post('/deposit', protect, initiatePayment);

// Get payment status by orderId (polling fallback) - protected
router.get('/status/:orderId', protect, getPaymentStatus);

// pawaPay webhook endpoint - public (secured cryptographically in controller)
router.post('/webhook', handleWebhook);

module.exports = router;
