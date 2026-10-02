const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const AuditLog = require('../models/AuditLog');
const { decryptField } = require('../utils/fieldEncryption');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');
const {
  sendVerificationEmail,
  sendPasswordResetOTPEmail,
  sendOTPEmail,
  sendPasswordChangeOTP,
  sendPasswordChangedConfirmation,
  sendSensitiveChangeOTP,
} = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');
const {
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  csrfHeaderMatchesCookie,
} = require('../utils/authCookies');

const _client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Roles a person can grant themselves through public registration. 'admin' must
// only ever be created out-of-band (scripts/makeAdmin.js); 'rider' is only granted
// by an admin approving a rider application (see reviewRider) after KYC review.
// This is enforced here independent of request-body validation, so a bypassed or
// future new entry point can never grant a self-registering user either role.
const SELF_REGISTERABLE_ROLES = ['consumer', 'business_owner'];

// Generate JWT Access Token (short-lived).
// tokenVersion is embedded so it can be compared against the user's current
// tokenVersion at verification time (see middleware/auth.js) - bumping the
// stored value (on password change or "logout all devices") immediately
// invalidates every token issued before the bump, regardless of expiresIn.
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

// Generate JWT Refresh Token (longer-lived)
const generateRefreshToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, phone, role, roles, firstName, lastName } = req.body;

    // Validation - support both 'role' (legacy) and 'roles' (new)
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Determine roles array
    let userRoles;
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = roles;
    } else if (role) {
      // Legacy support: convert single role to array
      // For business_owner, also grant consumer role
      userRoles = role === 'business_owner' ? ['consumer', 'business_owner'] : [role];
    } else {
      userRoles = ['consumer']; // Default to consumer
    }

    // Hard filter to the self-registerable set regardless of what validation
    // already checked - never trust request input for privilege assignment.
    userRoles = userRoles.filter((r) => SELF_REGISTERABLE_ROLES.includes(r));
    if (userRoles.length === 0) {
      userRoles = ['consumer'];
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Determine initial active role
    // If registering as business, default to business_owner, otherwise consumer
    const initialActiveRole = userRoles.includes('business_owner')
      ? 'business_owner'
      : userRoles[0];

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      phone,
      roles: userRoles,
      activeRole: initialActiveRole,
      firstName,
      lastName,
      verificationToken,
      verificationTokenExpires,
    });

    if (user) {
      // Send verification email (don't await - send in background)
      sendVerificationEmail(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        verificationToken
      ).catch((err) => logger.error({ err }, 'Failed to send verification email'));

      const refreshTokenValue = generateRefreshToken(user._id, user.tokenVersion);
      const csrfToken = setAuthCookies(res, refreshTokenValue);

      res.status(201).json({
        _id: user._id,
        email: user.email,
        roles: user.roles,
        activeRole: user.activeRole,
        role: user.activeRole, // Backward compatibility
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        token: generateToken(user._id, user.tokenVersion),
        refreshToken: refreshTokenValue,
        csrfToken,
        message: 'Registration successful. Please check your email to verify your account.',
      });
    }
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      logger.warn(
        { email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' },
        'Login attempt with missing credentials'
      );
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check user - include passwordHash since it's select:false
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+passwordHash +tokenVersion'
    );
    if (!user) {
      logger.warn({ email }, 'Login attempt - user not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password hash exists
    if (!user.passwordHash) {
      logger.warn({ email }, 'Login attempt - user has no password (possibly Google-only account)');
      return res.status(401).json({ message: 'Please use Google Sign-In for this account' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn({ email }, 'Login attempt - invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if suspended
    if (user.status === 'suspended') {
      logger.warn({ email }, 'Login attempt - account suspended');
      return res.status(403).json({ message: 'Account suspended' });
    }

    // Enforced only while the admin "Require email verification" setting is on.
    // Admins are exempt so a misconfigured email provider can never lock out
    // the only people able to switch the setting off.
    if (!user.emailVerified && !user.roles.includes('admin')) {
      const settings = await PlatformSettings.getSettings();
      if (settings.requireEmailVerification) {
        return res.status(403).json({
          message: 'Please verify your email address before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        });
      }
    }

    logger.info({ email, userId: user._id }, 'User logged in successfully');

    const refreshTokenValue = generateRefreshToken(user._id, user.tokenVersion);
    const csrfToken = setAuthCookies(res, refreshTokenValue);

    res.json({
      _id: user._id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
      role: user.activeRole, // Backward compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      token: generateToken(user._id, user.tokenVersion),
      refreshToken: refreshTokenValue,
      csrfToken,
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.phone !== undefined) user.phone = req.body.phone;

      if (req.body.preferences) {
        user.preferences = { ...user.preferences, ...req.body.preferences };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        preferences: updatedUser.preferences,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Upload user avatar
 * @route   POST /api/users/avatar
 * @access  Private
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'chopnow/avatars');

    // Update user
    const user = await User.findById(req.user._id);
    user.avatar = result.secure_url;
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Add address to user profile
 * @route   POST /api/users/addresses
 * @access  Private
 */
const addAddress = async (req, res) => {
  try {
    const { label, street, city, coordinates, isDefault } = req.body;

    if (!street || !city || !coordinates) {
      return res.status(400).json({ message: 'Please provide street, city, and coordinates' });
    }

    const user = await User.findById(req.user._id);

    // If this is set as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push({
      label,
      street,
      city,
      location: {
        type: 'Point',
        coordinates: coordinates, // [lng, lat]
      },
      isDefault: isDefault || user.addresses.length === 0,
    });

    await user.save();

    res.status(201).json({
      message: 'Address added successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private
 */
const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Update fields
    if (req.body.label) address.label = req.body.label;
    if (req.body.street) address.street = req.body.street;
    if (req.body.city) address.city = req.body.city;
    if (req.body.coordinates) {
      address.location.coordinates = req.body.coordinates;
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
      address.isDefault = true;
    }

    await user.save();

    res.json({
      message: 'Address updated successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.addressId);
    await user.save();

    res.json({
      message: 'Address deleted successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private (admin)
 */
const getUsersForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const status = req.query.status;

    const query = {};
    // Filter by role - check if role exists in the roles array
    if (role) {
      query.roles = { $in: [role] };
    }
    if (status) query.status = status;

    const users = await User.find(query)
      .select('-passwordHash')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
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
 * @desc    Verify email address
 * @route   GET /api/users/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/users/resend-verification
 * @access  Public
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Same generic response whether the account is missing, already verified,
    // or just re-sent - distinct 404/400 responses let anyone enumerate which
    // emails are registered.
    const genericResponse = {
      message: 'If an unverified account exists for that email, a new link has been sent.',
    };

    const user = await User.findOne({ email }).select(
      '+verificationToken +verificationTokenExpires'
    );
    if (!user || user.emailVerified) {
      return res.json(genericResponse);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const sent = await sendVerificationEmail(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      verificationToken
    );

    if (sent) {
      logger.info({ email: user.email }, 'Verification email sent successfully');
    } else {
      logger.error(
        { email: user.email },
        'Failed to send verification email (service error or address rejected)'
      );
    }
    // Always return 200 to avoid leaking whether the email was accepted
    res.json(genericResponse);
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Forgot password - send reset email
 * @route   POST /api/users/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetPasswordToken +resetPasswordExpires'
    );

    // Generic message to prevent email enumeration
    const successMessage =
      'If your email is registered, we have sent a 6-digit verification code to it.';

    if (!user) {
      logger.info({ email: normalizedEmail }, 'Password reset requested for non-existent email');
      return res.json({ message: successMessage });
    }

    // Generate 6-digit numeric OTP code
    const resetOtp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordToken = resetOtp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const sent = await sendPasswordResetOTPEmail(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      resetOtp
    );

    if (sent) {
      logger.info({ email: normalizedEmail }, 'Password reset OTP code sent successfully');
    } else {
      logger.error(
        { email: normalizedEmail },
        'Failed to send password reset OTP email (email service error or address rejected)'
      );
    }
    // Always return 200 to prevent email enumeration and avoid 500 on email service failures
    res.json({ message: successMessage });
  } catch (error) {
    logger.error({ err: error }, 'Forgot password error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Verify reset OTP code
 * @route   POST /api/users/verify-reset-otp
 * @access  Public
 */
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      logger.warn(
        { email: normalizedEmail, otpProvided: Boolean(otp) },
        'Invalid or expired OTP verification attempt'
      );
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    logger.info({ email: normalizedEmail }, 'Password reset OTP verified successfully');
    res.json({ message: 'Verification code verified successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Verify reset OTP error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/users/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password, email } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token/OTP and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Query construction
    const query = {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    };

    if (email) {
      query.email = email.toLowerCase().trim();
    }

    const user = await User.findOne(query).select(
      '+passwordHash +resetPasswordToken +resetPasswordExpires +tokenVersion'
    );

    if (!user) {
      logger.warn(
        { tokenProvided: Boolean(token), email },
        'Password reset failed - invalid or expired token/code'
      );
      return res.status(400).json({ message: 'Invalid or expired reset token/code' });
    }

    // Update password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // H3 fix: see changePassword - a "forgot password" reset must also
    // invalidate tokens issued before it (this is the account-recovery path,
    // where an attacker having a live session is precisely the threat model).
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    logger.info({ email: user.email, userId: user._id }, 'Password reset completed successfully');

    // Send confirmation email in background
    sendPasswordChangedConfirmation(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    ).catch((err) => logger.error({ err }, 'Failed to send password reset confirmation email'));

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error({ err: error }, 'Reset password error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Send OTP for email login
 * @route   POST /api/users/send-otp
 * @access  Public
 */
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('+otpCode +otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const sent = await sendOTPEmail(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      otpCode
    );

    if (sent) {
      res.json({ message: 'OTP sent to your email' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Verify OTP and login
 * @route   POST /api/users/verify-otp
 * @access  Public
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({
      email,
      otpCode: otp,
      otpExpires: { $gt: Date.now() },
    }).select('+otpCode +otpExpires +tokenVersion');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }

    // Clear OTP. Receiving and entering a code sent to this inbox proves the
    // user controls the address, so it also counts as email verification.
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.emailVerified = true;
    await user.save();

    const refreshTokenValue = generateRefreshToken(user._id, user.tokenVersion);
    const csrfToken = setAuthCookies(res, refreshTokenValue);

    res.json({
      _id: user._id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
      role: user.activeRole, // Backward compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      token: generateToken(user._id, user.tokenVersion),
      refreshToken: refreshTokenValue,
      csrfToken,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Google login/signup
 * @route   POST /api/users/google-login
 * @access  Public
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // H5 fix: verify the ID token's signature, issuer, expiry, and - critically -
    // its audience against our own GOOGLE_CLIENT_ID. The previous implementation
    // called the userinfo endpoint with a bare access token, which only proves
    // the token is valid for *some* Google OAuth client, not necessarily ours -
    // an access token minted for a completely different app could be replayed
    // here to authenticate as that email address.
    let googlePayload;
    try {
      const ticket = await _client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } catch (verifyError) {
      logger.warn({ err: verifyError }, 'Google ID token verification failed');
      return res.status(401).json({ message: 'Invalid Google ID token' });
    }

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture: avatar,
      email_verified,
    } = googlePayload;

    // Check if user exists by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    }).select('+tokenVersion');

    if (!user) {
      // Create new user if not exists
      // For Google users, we set a dummy passwordHash since they authenticate via Google
      const salt = await bcrypt.genSalt(12);
      const dummyPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(dummyPassword, salt);

      user = await User.create({
        email: email.toLowerCase(),
        googleId,
        firstName,
        lastName,
        avatar,
        roles: ['consumer'], // Default roles for Google login
        activeRole: 'consumer',
        emailVerified: email_verified,
        passwordHash, // Required by model
        status: 'active',
      });

      logger.info({ userId: user._id }, 'New user registered via Google');
    } else {
      // If user exists but doesn't have googleId linked, link it
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar) user.avatar = avatar;
        if (email_verified && !user.emailVerified) user.emailVerified = true;
        await user.save();
      }

      // Check if suspended
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account suspended' });
      }
    }

    const refreshTokenValue = generateRefreshToken(user._id, user.tokenVersion);
    const csrfToken = setAuthCookies(res, refreshTokenValue);

    res.json({
      _id: user._id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
      role: user.activeRole, // Backward compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      token: generateToken(user._id, user.tokenVersion),
      refreshToken: refreshTokenValue,
      csrfToken,
    });
  } catch (error) {
    logger.error({ err: error }, 'Google login error');
    if (error.response) {
      logger.error(
        { status: error.response.status, data: error.response.data },
        'Google API error'
      );
    }

    res.status(500).json({ message: 'Google authentication failed' });
  }
};

/**
 * @desc    Update user by admin
 * @route   PUT /api/users/:id
 * @access  Private (admin)
 */
const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // M4: snapshot roles before any mutation below, so we can tell whether
    // this request is the one that newly granted 'admin' (as opposed to an
    // update that just re-saves an account that already had it).
    const rolesBefore = [...user.roles];

    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle roles update (array of roles)
    if (req.body.roles !== undefined && Array.isArray(req.body.roles)) {
      // Validate roles
      const validRoles = ['consumer', 'business_owner', 'rider', 'admin'];
      const newRoles = req.body.roles.filter((role) => validRoles.includes(role));

      if (newRoles.length === 0) {
        return res.status(400).json({ message: 'User must have at least one valid role' });
      }

      user.roles = newRoles;

      // If activeRole is no longer in roles, reset it to first role
      if (!newRoles.includes(user.activeRole)) {
        user.activeRole = newRoles[0];
      }
    }

    // Handle activeRole update
    if (req.body.activeRole !== undefined) {
      if (user.roles.includes(req.body.activeRole)) {
        user.activeRole = req.body.activeRole;
      }
    }

    // Legacy support: handle single 'role' field
    if (req.body.role !== undefined && !req.body.roles) {
      const validRoles = ['consumer', 'business_owner', 'rider', 'admin'];
      if (validRoles.includes(req.body.role)) {
        // Add the role if not already present
        if (!user.roles.includes(req.body.role)) {
          user.roles.push(req.body.role);
        }
        user.activeRole = req.body.role;
      }
    }

    await user.save();

    // M4: an admin-only, append-only trail of who granted the admin role to
    // whom and when - written only on the transition (didn't have it, now
    // does), not on every save of an already-admin account. Awaited (not
    // fire-and-forget) so the log is durable before the response returns.
    if (!rolesBefore.includes('admin') && user.roles.includes('admin')) {
      try {
        await AuditLog.create({
          action: 'grant_admin_role',
          actor: req.user._id,
          targetUser: user._id,
          rolesBefore,
          rolesAfter: [...user.roles],
        });
      } catch (err) {
        logger.error({ err, targetUserId: user._id }, 'Failed to write admin-grant audit log');
      }
    }

    res.json({
      message: 'User updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        activeRole: user.activeRole,
        role: user.activeRole, // Backward compatibility
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Suspend user
 * @route   PATCH /api/users/:id/suspend
 * @access  Private (admin)
 */
const suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has admin role (check roles array, not activeRole)
    if (user.roles && user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Cannot suspend admin users' });
    }

    user.status = 'suspended';
    await user.save();

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Activate user
 * @route   PATCH /api/users/:id/activate
 * @access  Private (admin)
 */
const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'active';
    await user.save();

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete user by admin
 * @route   DELETE /api/users/:id
 * @access  Private (admin)
 */
const deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has admin role (check roles array, not activeRole)
    if (user.roles && user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Delete the logged-in user's own account. The frontend (both the
 *          buyer MyProfile page and the admin Settings page) has always
 *          called DELETE /api/users/profile for this, but no such route
 *          existed - it fell through to DELETE /:id with id="profile",
 *          which is admin-only and 403'd for every non-admin, and would
 *          have hit a CastError for an admin (Mongoose can't cast "profile"
 *          to an ObjectId). This is the actual self-delete this UI needs.
 * @route   DELETE /api/users/profile
 * @access  Private
 */
const deleteOwnAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't let the platform's last admin delete themselves and lock
    // everyone out of the admin panel.
    if (user.roles && user.roles.includes('admin')) {
      const otherAdmins = await User.countDocuments({
        roles: 'admin',
        _id: { $ne: user._id },
      });
      if (otherAdmins === 0) {
        return res.status(400).json({ message: 'Cannot delete the only remaining admin account' });
      }
    }

    await user.deleteOne();
    clearAuthCookies(res);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Delete own account failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Request password change OTP
 * @route   POST /api/users/profile/password/request-otp
 * @access  Private
 */
const requestPasswordChangeOTP = async (req, res) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Please provide current password' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash +otpCode +otpExpires');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP email
    const sent = await sendPasswordChangeOTP(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      otpCode
    );

    if (sent) {
      res.json({ message: 'OTP sent to your email. Please verify to complete password change.' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Change user password with OTP verification
 * @route   PUT /api/users/profile/password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide OTP and new password' });
    }
    // Strength (8+ chars, upper/lower/digit) is enforced upstream by
    // validateResetPassword on this route (M3) - no separate, weaker check here.

    const user = await User.findById(req.user._id).select(
      '+passwordHash +otpCode +otpExpires +tokenVersion'
    );

    // Verify OTP
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    // Clear OTP
    user.otpCode = undefined;
    user.otpExpires = undefined;
    // H3 fix: changing the password must invalidate every access/refresh token
    // issued before this point - otherwise a token stolen before the change
    // (the actual reason someone changes their password) keeps working.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Send confirmation email
    sendPasswordChangedConfirmation(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    ).catch((err) => logger.error({ err }, 'Failed to send password changed confirmation'));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Request OTP for sensitive information change (vendor)
 * @route   POST /api/users/request-sensitive-change-otp
 * @access  Private
 */
const requestSensitiveChangeOTP = async (req, res) => {
  try {
    const { changeType } = req.body;

    if (!changeType) {
      return res.status(400).json({ message: 'Please specify change type' });
    }

    const validChangeTypes = [
      'payout settings',
      'bank account',
      'business information',
      'email address',
    ];
    if (!validChangeTypes.includes(changeType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid change type' });
    }

    const user = await User.findById(req.user._id).select('+otpCode +otpExpires');

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP email
    const sent = await sendSensitiveChangeOTP(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      otpCode,
      changeType
    );

    if (sent) {
      res.json({ message: 'OTP sent to your email. Please verify to continue.' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Verify OTP for sensitive changes
 * @route   POST /api/users/verify-sensitive-change-otp
 * @access  Private
 */
const verifySensitiveChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Please provide OTP' });
    }

    const user = await User.findById(req.user._id).select('+otpCode +otpExpires');

    // Verify OTP
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Clear OTP after successful verification
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      message: 'OTP verified successfully',
      verified: true,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get user's active sessions
 * @route   GET /api/users/sessions
 * @access  Private
 */
const getActiveSessions = async (req, res) => {
  try {
    // Return current session info from request headers
    const currentSession = {
      id: req.user._id.toString(),
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Current Location',
      lastActive: new Date().toISOString(),
      isCurrent: true,
    };
    res.json({ sessions: [currentSession] });
  } catch (error) {
    logger.error({ err: error }, 'Get active sessions failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get user's login activity/history
 * @route   GET /api/users/login-activity
 * @access  Private
 */
const getLoginActivity = async (req, res) => {
  try {
    // Login history tracking not yet implemented in schema
    // Return empty array - frontend should handle gracefully
    res.json({ loginActivity: [] });
  } catch (error) {
    logger.error({ err: error }, 'Get login activity failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Logout from specific session
 * @route   DELETE /api/users/sessions/:sessionId
 * @access  Private
 */
const logoutSession = async (req, res) => {
  try {
    // Session management not yet implemented - acknowledge the request
    clearAuthCookies(res);
    res.json({ message: 'Session logged out successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Logout session failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Logout from all devices
 * @route   POST /api/users/logout-all
 * @access  Private
 */
const logoutAllDevices = async (req, res) => {
  try {
    // H3 fix: bump tokenVersion so every access/refresh token issued before now
    // - on this device and any other - is rejected by protect/optionalAuth and
    // refreshAccessToken from this point on.
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    clearAuthCookies(res);
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Logout all devices failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Switch active role
 * @route   POST /api/users/switch-role
 * @access  Private
 */
const switchRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has the requested role
    if (!user.roles.includes(role)) {
      return res.status(403).json({
        message: `You do not have the '${role}' role`,
        availableRoles: user.roles,
      });
    }

    // Update active role
    user.activeRole = role;
    await user.save();

    res.json({
      success: true,
      activeRole: user.activeRole,
      roles: user.roles,
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
        activeRole: user.activeRole,
        role: user.activeRole,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Add a role to existing user (e.g., consumer adds business_owner)
 * @route   POST /api/users/add-role
 * @access  Private
 */
const addRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    // Validate the role
    const validRoles = ['consumer', 'business_owner', 'rider'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Only admin can add admin role
    if (role === 'admin') {
      return res.status(403).json({ message: 'Cannot self-assign admin role' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has this role
    if (user.roles.includes(role)) {
      return res.status(400).json({
        message: `You already have the '${role}' role`,
        roles: user.roles,
      });
    }

    // Add the new role
    user.roles.push(role);

    // Optionally switch to the new role
    if (req.body.switchToNew) {
      user.activeRole = role;
    }

    await user.save();

    logger.info({ userId: user._id, newRole: role }, 'User added new role');

    res.json({
      success: true,
      message: `Successfully added '${role}' role`,
      roles: user.roles,
      activeRole: user.activeRole,
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
        activeRole: user.activeRole,
        role: user.activeRole,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/users/refresh-token
 * @access  Public
 */
const refreshAccessToken = async (req, res) => {
  try {
    // H2 fix: prefer the httpOnly cookie (web); fall back to the request body
    // (Mobile, which stores the refresh token via secure device storage rather
    // than a cookie jar). A cookie-sourced refresh token was attached to this
    // request automatically by the browser, so it must clear the CSRF
    // double-submit check below; a body-sourced one was explicitly supplied by
    // the calling app and isn't CSRF-exposed the same way.
    const fromCookie = Boolean(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    if (fromCookie && !csrfHeaderMatchesCookie(req)) {
      return res.status(403).json({ message: 'Invalid or missing CSRF token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash +tokenVersion');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }

    // H3 fix: a refresh token issued before a password change / "logout all
    // devices" must not be usable to mint new access tokens - otherwise that
    // revocation is cosmetic (an attacker holding a still-valid refresh token
    // could just keep refreshing forever).
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res
        .status(401)
        .json({ message: 'Refresh token has been revoked, please login again' });
    }

    const newRefreshToken = generateRefreshToken(user._id, user.tokenVersion);
    const csrfToken = setAuthCookies(res, newRefreshToken);

    res.json({
      token: generateToken(user._id, user.tokenVersion),
      refreshToken: newRefreshToken,
      csrfToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired, please login again' });
    }
    logger.error({ err: error }, 'Refresh token error');
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/**
 * @desc    Register FCM device token for push notifications
 * @route   POST /api/users/fcm-token
 * @access  Private
 */
const registerFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add token if it doesn't exist
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Register FCM token failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Unregister FCM device token
 * @route   DELETE /api/users/fcm-token
 * @access  Private
 */
const deleteFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fcmToken) {
      user.fcmTokens = user.fcmTokens.filter((token) => token !== fcmToken);
    } else {
      user.fcmTokens = [];
    }
    await user.save();

    res.json({ success: true, message: 'FCM token unregistered successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Unregister FCM token failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Submit rider application with vehicle and ID document uploads
 * @route   POST /api/users/apply-rider
 * @access  Private
 */
const applyRider = async (req, res) => {
  try {
    const { phone, vehicleType, nationalId, licensePlate } = req.body;

    if (!phone || !vehicleType || !nationalId) {
      return res.status(400).json({ message: 'Phone, vehicle type, and national ID are required' });
    }

    if (['motorcycle', 'car'].includes(vehicleType) && !licensePlate) {
      return res.status(400).json({ message: 'License plate is required for motor vehicles' });
    }

    // Check files uploaded
    if (!req.files || !req.files.vehiclePhoto || !req.files.nationalIdPhoto) {
      return res
        .status(400)
        .json({ message: 'Both vehicle photo and national ID photo are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.riderStatus === 'pending') {
      return res.status(400).json({ message: 'Your application is already pending review' });
    }

    // Upload to Cloudinary
    const vehiclePhotoResult = await uploadToCloudinary(
      req.files.vehiclePhoto[0].buffer,
      'chopnow/riders/vehicles',
      'auto'
    );
    const nationalIdPhotoResult = await uploadToCloudinary(
      req.files.nationalIdPhoto[0].buffer,
      'chopnow/riders/ids',
      'auto'
    );

    // Save details
    user.riderStatus = 'pending';
    user.riderDetails = {
      phone,
      vehicleType,
      nationalId,
      licensePlate: ['motorcycle', 'car'].includes(vehicleType) ? licensePlate : undefined,
      vehiclePhoto: vehiclePhotoResult.secure_url,
      nationalIdPhoto: nationalIdPhotoResult.secure_url,
      appliedAt: new Date(),
    };

    // Keep phone number synced if they don't have one
    if (!user.phone) {
      user.phone = phone;
    }

    await user.save();

    logger.info({ userId: user._id }, 'User submitted rider application');

    res.json({
      success: true,
      message: 'Rider application submitted successfully. Pending admin review.',
      riderStatus: user.riderStatus,
      // M5: an embedded subdocument pulled out into a plain object like this
      // serializes through its OWN toJSON/toObject, not the parent User
      // document's - confirmed by testing that this does NOT inherit
      // userSchema's `getters: true`, and that even an explicit
      // `.toObject({ getters: true })` call on the subdocument itself still
      // returns raw ciphertext (a Mongoose quirk, not something to rely on).
      // decryptField() directly is the reliable fix.
      riderDetails: {
        ...user.riderDetails.toObject(),
        nationalId: decryptField(user.riderDetails.nationalId),
        licensePlate: decryptField(user.riderDetails.licensePlate),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Rider application failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get riders list with optional status filters (Admin only)
 * @route   GET /api/users/admin/riders
 * @access  Private (Admin)
 */
const getRidersForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { riderStatus: { $ne: 'none' } };

    if (status && status !== 'all') {
      query.riderStatus = status;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [riders, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email phone roles riderStatus riderDetails createdAt')
        .sort({ 'riderDetails.appliedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // M5: .lean() returns plain objects, which skip Mongoose getters - the
    // encrypted nationalId/licensePlate need decrypting by hand here, or
    // admins would see raw ciphertext instead of the value they need to
    // verify a rider's application.
    const decryptedRiders = riders.map((rider) => ({
      ...rider,
      riderDetails: rider.riderDetails
        ? {
            ...rider.riderDetails,
            nationalId: decryptField(rider.riderDetails.nationalId),
            licensePlate: decryptField(rider.riderDetails.licensePlate),
          }
        : rider.riderDetails,
    }));

    res.json({
      success: true,
      riders: decryptedRiders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch riders for admin failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Approve or reject a rider's application (Admin only)
 * @route   POST /api/users/admin/riders/:id/review
 * @access  Private (Admin)
 */
const reviewRider = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res
        .status(400)
        .json({ message: 'Rejection reason is required when status is rejected' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.riderStatus !== 'pending') {
      return res.status(400).json({
        message: `Rider application is not pending (current status: ${user.riderStatus})`,
      });
    }

    user.riderStatus = status;
    user.riderDetails.reviewedAt = new Date();

    if (status === 'approved') {
      // Add rider role
      if (!user.roles.includes('rider')) {
        user.roles.push('rider');
      }
      user.activeRole = 'rider'; // Default active role to rider for convenience
    } else {
      user.riderDetails.rejectedReason = rejectionReason;
    }

    await user.save();

    logger.info({ userId: user._id, status }, 'Admin reviewed rider application');

    res.json({
      success: true,
      message: `Rider application successfully ${status}`,
      riderStatus: user.riderStatus,
      roles: user.roles,
    });
  } catch (error) {
    logger.error({ err: error }, 'Rider review failed');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get rider online availability status
 * @route   GET /api/v1/rider/availability
 * @access  Private (Rider)
 */
const getRiderAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      success: true,
      isOnline: user.riderDetails?.isOnline === true,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Update rider online availability status
 * @route   PUT /api/v1/rider/availability
 * @access  Private (Rider)
 */
const updateRiderAvailability = async (req, res) => {
  try {
    const { isOnline } = req.body;
    if (isOnline === undefined) {
      return res.status(400).json({ message: 'isOnline is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.riderDetails) {
      user.riderDetails = {};
    }
    user.riderDetails.isOnline = isOnline === true;
    await user.save();

    res.json({
      success: true,
      isOnline: user.riderDetails.isOnline,
    });
  } catch (error) {
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
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
  getRiderAvailability,
  updateRiderAvailability,
};
