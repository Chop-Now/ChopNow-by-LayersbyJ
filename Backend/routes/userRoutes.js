const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  googleLogin,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  addAddress,
  updateAddress,
  deleteAddress,
  getUsersForAdmin,
  updateUserByAdmin,
  suspendUser,
  activateUser,
  deleteUserByAdmin,
  deleteOwnAccount,
  requestPasswordChangeOTP,
  changePassword,
  requestSensitiveChangeOTP,
  verifySensitiveChangeOTP,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  sendOTP,
  verifyOTP,
  switchRole,
  addRole,
  getActiveSessions,
  getLoginActivity,
  logoutSession,
  logoutAllDevices,
  refreshAccessToken,
  registerFcmToken,
  deleteFcmToken,
  applyRider,
  getRidersForAdmin,
  reviewRider,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadDocs = require('../middleware/uploadDocs');
const {
  validateRegister,
  validateUpdateProfile,
  validateLogin,
  validateResetPassword,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateSendOTP,
  validateVerifyOTP,
  validateGoogleLogin,
} = require('../middleware/validation');
const { checkRegistrationAllowed } = require('../middleware/platformSettings');

// Public routes

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post('/register', checkRegistrationAllowed, validateRegister, registerUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateLogin, loginUser);
router.post('/google-login', validateGoogleLogin, googleLogin);

// Email verification
router.get('/verify-email', verifyEmail);
// Same shape as forgot-password: a single, valid, normalized email.
router.post('/resend-verification', validateForgotPassword, resendVerificationEmail);

// Password reset
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-reset-otp', validateVerifyResetOTP, verifyResetOTP);
router.post('/reset-password', validateResetPassword, resetPassword);

// OTP login
router.post('/send-otp', validateSendOTP, sendOTP);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);

// Token refresh
router.post('/refresh-token', refreshAccessToken);

// Protected routes (MUST be defined BEFORE parameterized routes like /:id)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validateUpdateProfile, updateUserProfile);
router.delete('/profile', protect, deleteOwnAccount);

// Password change with OTP verification
router.post('/profile/password/request-otp', protect, requestPasswordChangeOTP);
// validateResetPassword already aliases otp->token and newPassword->password,
// so it applies here unchanged - one strength rule (8+ chars, upper/lower/
// digit), not two (M3).
router.put('/profile/password', protect, validateResetPassword, changePassword);

// Sensitive information change OTP (for vendors)
router.post('/request-sensitive-change-otp', protect, requestSensitiveChangeOTP);
router.post('/verify-sensitive-change-otp', protect, verifySensitiveChangeOTP);

router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

// Role management routes
router.post('/switch-role', protect, switchRole);
router.post('/add-role', protect, addRole);
router.post(
  '/apply-rider',
  protect,
  uploadDocs.fields([
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'nationalIdPhoto', maxCount: 1 },
  ]),
  applyRider
);

// FCM device tokens
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, deleteFcmToken);

// Session management routes
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:sessionId', protect, logoutSession);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/login-activity', protect, getLoginActivity);

// Address routes
router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

// Admin-only: list all users
router.get('/', protect, authorize('admin'), getUsersForAdmin);
router.get('/admin/riders', protect, authorize('admin'), getRidersForAdmin);
router.post('/admin/riders/:id/review', protect, authorize('admin'), reviewRider);

// Admin-only: user management (parameterized routes AFTER specific routes)
router.put('/:id', protect, authorize('admin'), updateUserByAdmin);
router.patch('/:id/suspend', protect, authorize('admin'), suspendUser);
router.patch('/:id/activate', protect, authorize('admin'), activateUser);
router.delete('/:id', protect, authorize('admin'), deleteUserByAdmin);

module.exports = router;
