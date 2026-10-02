import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import LoadingSpinner from '../Components/ui/LoadingSpinner';

/**
 * ProtectedRoute - Guards routes that require authentication.
 * Redirects unauthenticated users to /login, preserving the intended destination.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component(s) to render if authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

/**
 * RoleRoute - Guards routes that require a specific role.
 * Must be used inside ProtectedRoute or on an already-authenticated route.
 * Redirects users without the required role to the home page.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component(s) to render if authorized
 * @param {string|string[]} props.roles - Required role(s). User must have at least one.
 * @param {string} [props.fallback="/"] - Where to redirect unauthorized users
 */
const RoleRoute = ({ children, roles, fallback = '/' }) => {
  const { user, activeRole, availableRoles, isLoading } = useAppContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Verifying access..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  // Check activeRole, user.role, and the full availableRoles array
  const userActiveRole = activeRole || user.activeRole || user.role;
  const userRoles =
    availableRoles.length > 0 ? availableRoles : user.roles || [user.role].filter(Boolean);

  const hasRequiredRole = requiredRoles.some(
    (role) => role === userActiveRole || userRoles.includes(role)
  );

  if (!hasRequiredRole) {
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export { ProtectedRoute, RoleRoute };
export default ProtectedRoute;
