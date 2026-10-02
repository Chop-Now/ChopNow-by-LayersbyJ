const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // H1 fix: access and refresh tokens are signed with the same secret and
      // verified by the same jwt.verify call above - without this check, a 7-day
      // refresh token (which lives in the same client-side storage as the access
      // token, so is equally exposed to theft) works as a full 1h-access-token
      // replacement for its entire 7-day lifetime. Refresh tokens must only ever
      // be usable at POST /refresh-token, never as a Bearer access token.
      if (decoded.type === 'refresh') {
        return res
          .status(401)
          .json({ message: 'Not authorized, refresh token cannot be used as an access token' });
      }

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-passwordHash +tokenVersion');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // H3 fix: a token issued before a password change / "logout all devices"
      // must stop working immediately rather than remaining valid for its full
      // 1h/7d lifetime - see the tokenVersion field on the User model.
      if ((decoded.tokenVersion || 0) !== (req.user.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Not authorized, token has been revoked' });
      }

      if (req.user.status === 'suspended') {
        return res.status(403).json({ message: 'Account suspended' });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Token verification failed');
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Role-based authorization middleware
 * Checks activeRole for authorization, supports multi-role users
 * Admin users can access admin routes regardless of activeRole
 * @param  {...any} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRoles = req.user.roles || [];
    const userActiveRole = req.user.activeRole || userRoles[0];

    // IMPORTANT: If the route allows 'admin' and user HAS admin role,
    // allow access regardless of their current activeRole.
    // This ensures admins can perform admin tasks without switching roles.
    if (roles.includes('admin') && userRoles.includes('admin')) {
      return next();
    }

    // Check if user's activeRole is in the allowed roles
    if (!roles.includes(userActiveRole)) {
      // Check if user HAS one of the required roles but it's not active
      const hasRequiredRole = roles.some((role) => userRoles.includes(role));

      if (hasRequiredRole) {
        // User has the role but needs to switch to it
        const availableRole = roles.find((role) => userRoles.includes(role));
        return res.status(403).json({
          message: `Please switch to your '${availableRole}' role to access this resource`,
          code: 'WRONG_ACTIVE_ROLE',
          requiredRole: availableRole,
          currentActiveRole: userActiveRole,
          availableRoles: userRoles,
        });
      }

      return res.status(403).json({
        message: `User role '${userActiveRole}' is not authorized to access this route`,
      });
    }

    next();
  };
};

/**
 * Optional authentication - Attach user if token exists but don't require it
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'refresh') {
        const candidate = await User.findById(decoded.id).select('-passwordHash +tokenVersion');
        if (candidate && (decoded.tokenVersion || 0) === (candidate.tokenVersion || 0)) {
          req.user = candidate;
        }
      }
    } catch (_error) {
      // Token invalid but don't block the request
      req.user = null;
    }
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };
