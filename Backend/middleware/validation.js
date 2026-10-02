const { body, param, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  // Support both 'role' (legacy single role) and 'roles' (new array format)
  // Both are optional - controller defaults to ['consumer'] if neither provided
  //
  // 'admin' and 'rider' are deliberately NOT self-registerable: admin accounts
  // must be created out-of-band (see scripts/makeAdmin.js), and 'rider' is only
  // granted by an admin approving a rider application (reviewRider) after KYC
  // review - see registerUser's SELF_REGISTERABLE_ROLES for the enforcement.
  body('role')
    .optional()
    .isIn(['consumer', 'business_owner'])
    .withMessage('Role must be consumer or business_owner'),
  body('roles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Roles must be a non-empty array')
    .custom((roles) => {
      const validRoles = ['consumer', 'business_owner'];
      for (const role of roles) {
        if (!validRoles.includes(role)) {
          throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
        }
      }
      return true;
    }),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors,
];

// Profile update validation - same format rules as registration, but every
// field is optional since this is a partial update, not a full replacement.
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors,
];

// User login validation
const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// Business creation validation
const validateCreateBusiness = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Business name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('type')
    .isIn(['farmer', 'restaurant', 'bakery', 'supermarket', 'grocery', 'cafe', 'other'])
    .withMessage('Invalid business type'),
  body('contact.email')
    .isEmail()
    .withMessage('Please provide a valid contact email')
    .normalizeEmail(),
  body('contact.phone')
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('address.street').trim().notEmpty().withMessage('Street address is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  body('address.location.coordinates.*').isFloat().withMessage('Coordinates must be valid numbers'),
  handleValidationErrors,
];

// Listing creation validation
const validateCreateListing = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('business').isMongoId().withMessage('Valid business ID is required'),
  body('category')
    .isIn(['fruit-veg', 'baked-goods', 'meals', 'dairy', 'meat', 'beverages', 'pantry', 'other'])
    .withMessage(
      'Invalid category. Must be one of: fruit-veg, baked-goods, meals, dairy, meat, beverages, pantry, other'
    ),
  body('pricing.originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('pricing.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('timeWindow.availableFrom').isISO8601().withMessage('Available from must be a valid date'),
  body('timeWindow.availableUntil')
    .isISO8601()
    .withMessage('Available until must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.timeWindow?.availableFrom)) {
        throw new Error('Available until must be after available from');
      }
      return true;
    }),
  handleValidationErrors,
];

// Order creation validation
// C4 fix: no longer validates a client-supplied unitPrice - the controller
// (createOrder) now always computes item.unitPrice from the listing's own
// stored price server-side and ignores whatever the client sends, so there is
// nothing meaningful to validate about it here (an absent or bogus value has
// zero effect on the resulting order).
const validateCreateOrder = [
  body('listing').isMongoId().withMessage('Valid listing ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('fulfillmentType')
    .isIn(['pickup', 'delivery'])
    .withMessage('Fulfillment type must be pickup or delivery'),
  body('deliveryDetails.address')
    .if(body('fulfillmentType').equals('delivery'))
    .notEmpty()
    .withMessage('Delivery address is required for delivery orders'),
  // C5 fix: 'card' removed - there is no real card gateway integration.
  body('payment.paymentMethod')
    .isIn(['mobile_money', 'cash'])
    .withMessage('Payment method must be mobile_money or cash'),
  handleValidationErrors,
];

// Order status update validation
// H7 fix: 'cancelled' removed - cancellation must always go through the
// dedicated PUT /orders/:id/cancel endpoint (cancelOrder), which is the only
// path that restores reserved inventory. The generic status endpoint never
// did that restore, so a vendor cancelling via this endpoint silently left
// the listing's stock permanently reserved/unavailable.
const validateUpdateOrderStatus = [
  param('id').isMongoId().withMessage('Valid order ID is required'),
  body('status')
    // 'paid' is set only by the payment flow and 'pending_payment' only at
    // creation - letting a vendor set 'paid' would mark an unpaid order paid.
    .isIn(['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed'])
    .withMessage('Invalid order status'),
  handleValidationErrors,
];

// Review creation validation
const validateCreateReview = [
  body('order').isMongoId().withMessage('Valid order ID is required'),
  // `business` is derived from the order server-side (reviewController); any
  // client-supplied value is ignored.
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  handleValidationErrors,
];

// Password reset validation
const validateResetPassword = [
  (req, res, next) => {
    if (req.body.otp && !req.body.token) {
      req.body.token = req.body.otp;
    }
    if (req.body.newPassword && !req.body.password) {
      req.body.password = req.body.newPassword;
    }
    next();
  },
  body('token').notEmpty().withMessage('Reset token/code is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  handleValidationErrors,
];

// Forgot password validation
const validateForgotPassword = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  handleValidationErrors,
];

// Verify reset OTP validation
const validateVerifyResetOTP = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('otp')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  handleValidationErrors,
];

// Google login validation - H5 fix companion: this only guards the request
// shape (the actual security fix, audience verification, happens in
// googleLogin via _client.verifyIdToken).
const validateGoogleLogin = [
  body('idToken').notEmpty().isString().withMessage('idToken is required'),
  handleValidationErrors,
];

// Send OTP (email login) validation - C3 fix: this route previously had no
// validation at all, so a non-string 'email' (e.g. a Mongo operator object like
// {"$ne": null}) reached User.findOne({ email }) unvalidated.
const validateSendOTP = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  handleValidationErrors,
];

// Verify OTP (email login) validation - same C3 fix, for the endpoint that
// actually authenticates the user from the submitted code.
const validateVerifyOTP = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('otp')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  handleValidationErrors,
];

// Payout request validation
const validatePayoutRequest = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('method').isIn(['bank', 'mobile']).withMessage('Payment method must be bank or mobile'),
  handleValidationErrors,
];

// Payout status update validation
const validatePayoutStatus = [
  param('id').isMongoId().withMessage('Valid payout ID is required'),
  body('status')
    .isIn(['processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid payout status'),
  body('reference')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Reference cannot be empty if provided'),
  handleValidationErrors,
];

// Dispute creation validation
const validateCreateDispute = [
  body('order').isMongoId().withMessage('Valid order ID is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be at most 200 characters'),
  body('type')
    .optional()
    .isIn([
      'refund',
      'missing_item',
      'vendor_unresponsive',
      'delivery_issue',
      'poor_quality',
      'other',
    ])
    .withMessage('Invalid dispute type'),
  handleValidationErrors,
];

// MongoId param validation
const validateMongoId = [
  param('id').isMongoId().withMessage('Valid ID is required'),
  handleValidationErrors,
];

// Pagination sanitization middleware
const sanitizePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  req.pagination = {
    page: Math.max(page, 1),
    limit,
    skip: (Math.max(page, 1) - 1) * limit,
  };
  next();
};

module.exports = {
  handleValidationErrors,
  sanitizePagination,
  validateRegister,
  validateUpdateProfile,
  validateLogin,
  validateCreateBusiness,
  validateCreateListing,
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateCreateReview,
  validateResetPassword,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateSendOTP,
  validateVerifyOTP,
  validateGoogleLogin,
  validatePayoutRequest,
  validatePayoutStatus,
  validateCreateDispute,
  validateMongoId,
};
