import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MaintenanceMode from './Components/MaintenanceMode';
import { usePlatformSettings } from './context/PlatformSettingsContext';
import { useAppContext } from './context/AppContext';
import LoadingSpinner from './Components/ui/LoadingSpinner';
import { ProtectedRoute, RoleRoute } from './Components/ProtectedRoute';

// Lazy-loaded page components for code splitting
const Home = lazy(() => import('./Pages/Home'));
const Login = lazy(() => import('./Pages/Login'));
const SignUp = lazy(() => import('./Pages/SignUp'));
const Shop = lazy(() => import('./Pages/Shop'));
const CategoryPage = lazy(() => import('./Pages/CategoryPage'));
const ProductDetails = lazy(() => import('./Pages/ProductDetails'));
const Cart = lazy(() => import('./Pages/Cart'));
const MyOrders = lazy(() => import('./Pages/MyOrders'));
const MyImpact = lazy(() => import('./Pages/MyImpact'));
const Notification = lazy(() => import('./Pages/Notification'));
const MyProfile = lazy(() => import('./Pages/MyProfile'));
const BusinessVerification = lazy(() => import('./Pages/BusinessVerification'));
const RiderVerification = lazy(() => import('./Pages/RiderRegistration'));
const RiderDashboard = lazy(() => import('./Pages/RiderDashboard'));
const PendingReview = lazy(() => import('./Pages/PendingReview'));
const FAQ = lazy(() => import('./Pages/FAQ'));
const ContactUs = lazy(() => import('./Pages/ContactUs'));
const TermsOfService = lazy(() => import('./Pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./Pages/PrivacyPolicy'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./Pages/AdminLogin'));
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./Pages/VerifyEmail'));
const NotFound = lazy(() => import('./Components/NotFound'));

const App = () => {
  const { settings } = usePlatformSettings();
  const { user, isLoading } = useAppContext();
  const location = useLocation();

  // Check if user is admin (check all possible fields)
  const isAdmin =
    user &&
    (user.activeRole === 'admin' ||
      user.role === 'admin' ||
      (Array.isArray(user.roles) && user.roles.includes('admin')));

  // Check if current path is admin-related (allow access during maintenance)
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login';

  // Show maintenance mode for non-admin users on non-admin routes
  // But always allow admin routes and login page so admins can access the dashboard
  if (settings.maintenanceMode && !isAdmin && !isAdminRoute && !isLoading) {
    return <MaintenanceMode />;
  }

  return (
    <main className="overflow-x-clip text-textColor">
      {/* Skip to content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>

      <Toaster />

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <div id="main-content">
          <Routes>
            {/* ===== Public Routes ===== */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:category" element={<CategoryPage />} />
            <Route path="/shop/:category/:id" element={<ProductDetails />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* ===== Authenticated Routes ===== */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-impact"
              element={
                <ProtectedRoute>
                  <MyImpact />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-profile"
              element={
                <ProtectedRoute>
                  <MyProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notification />
                </ProtectedRoute>
              }
            />

            {/* ===== Business Routes ===== */}
            <Route
              path="/business-verification"
              element={
                <ProtectedRoute>
                  <BusinessVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-review"
              element={
                <ProtectedRoute>
                  <PendingReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute roles={['business_owner', 'admin']}>
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* ===== Rider Routes ===== */}
            <Route
              path="/rider-verification"
              element={
                <ProtectedRoute>
                  <RiderVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute roles={['rider', 'admin']}>
                    <RiderDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* ===== Admin Routes ===== */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/login/admin" element={<Navigate to="/admin/login" replace />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleRoute roles="admin" fallback="/login">
                    <AdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* ===== Catch-all ===== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
    </main>
  );
};

export default App;
