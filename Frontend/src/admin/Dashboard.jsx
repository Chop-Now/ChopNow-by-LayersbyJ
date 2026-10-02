import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Content from './components/Content/Content';
import { AdminModeProvider } from './context/AdminModeContext';
import { useAppContext } from '../context/AppContext';
import { businessService } from '../services';
// Analytics pages
import { Overview, Reports, Insights, Impact } from './pages/Analytics';
// Users pages
import { AllUsers, RolesPermissions, UserActivity } from './pages/Users';
// Orders pages
import { AllOrders, PendingOrders, CompletedOrders, Deliveries } from './pages/Orders';
// Listings pages
import { AllListings, NewListing } from './pages/Listings';
// Vendors pages
import { AllVendors, VendorApproval } from './pages/Vendors';
// Disputes pages
import { RefundRequests, CustomerComplaints } from './pages/Disputes';
// Other pages
import Payouts from './pages/Payouts';
import Settings from './pages/Settings';
import DashboardNotifications from './pages/DashboardNotifications';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAppContext();
  const [authChecked, setAuthChecked] = useState(false);

  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('profile'); // Track settings tab

  // Check authentication and business verification status
  useEffect(() => {
    let isMounted = true;
    const checkAccess = async () => {
      // Wait for auth to load
      if (isLoading) return;

      // Check if user is logged in
      if (!isAuthenticated || !user) {
        navigate('/login');
        return;
      }

      // Check user role - only business_owner can access this vendor dashboard
      // Use activeRole for multi-role users, fallback to role for single-role users
      const currentRole = user.activeRole || user.role;
      const userRoles = user.roles || [user.role];

      // Admin users should use the admin dashboard at /admin
      if (currentRole === 'admin' || userRoles.includes('admin')) {
        navigate('/admin');
        return;
      }

      if (currentRole !== 'business_owner' && !userRoles.includes('business_owner')) {
        // Consumers and other roles should go to shop
        navigate('/shop');
        return;
      }

      // Business owner - check if their business is verified
      try {
        const businessResponse = await businessService.getMyBusinesses();
        if (!isMounted) return;
        const businesses = businessResponse.businesses || businessResponse || [];

        if (businesses.length === 0) {
          // No business created yet
          navigate('/business-verification');
          return;
        }

        const business = businesses[0];
        const verificationStatus = business.verification?.status;

        // Check if business is approved/verified
        // Business is approved if status is 'active' and verification.status is 'verified' or 'approved'
        const isApproved =
          business.status === 'active' &&
          (verificationStatus === 'verified' || verificationStatus === 'approved');

        if (!isApproved) {
          // Check specific verification status
          if (verificationStatus === 'pending') {
            // Documents submitted, waiting for review
            navigate('/pending-review');
          } else if (verificationStatus === 'unverified') {
            // Restaurant/cafe that needs to submit documents
            navigate('/business-verification');
          } else {
            // Any other state - go to verification page
            navigate('/business-verification');
          }
          return;
        }

        // All checks passed - allow access
        setAuthChecked(true);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error checking business status:', error);
        navigate('/business-verification');
      }
    };

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading, user, navigate]);

  // Show loading while checking auth
  if (isLoading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fufu dark:bg-char">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleNavigateToSettings = (pageOrTab) => {
    // Check if it's a settings tab
    if (['profile', 'business', 'security', 'notifications', 'preferences'].includes(pageOrTab)) {
      setSettingsTab(pageOrTab);
      setCurrentPage('settings');
    } else {
      // Otherwise, navigate to the page directly
      setCurrentPage(pageOrTab);
    }
  };

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId);
  };

  // Get user's current role for AdminModeProvider
  const currentUserRole = user?.activeRole || user?.role;
  const userRoles = user?.roles || [user?.role];
  const isAdmin = currentUserRole === 'admin' || userRoles.includes('admin');

  // M18: this component is already gated to business_owner sessions by the
  // redirect in the access-check effect above, but `currentPage` is plain
  // React state with no validation - anything that pushes an admin-only key
  // into it directly (React DevTools' state editor, a compromised
  // extension, a future bug elsewhere that calls setCurrentPage) would
  // still render the admin-only page component here. The backend already
  // refuses the underlying data for a non-admin, but the component shell
  // itself shouldn't render at all for a role that can never legitimately
  // reach it - keep this switch to what a vendor can be here to see.
  const ADMIN_ONLY_PAGES = new Set([
    'all-users',
    'roles',
    'activity',
    'all-vendors',
    'vendor-approval',
    'refunds',
    'complaints',
  ]);

  const renderPage = () => {
    if (ADMIN_ONLY_PAGES.has(currentPage) && !isAdmin) {
      return <Content onNavigate={setCurrentPage} />;
    }
    switch (currentPage) {
      case 'dashboard':
        return <Content onNavigate={setCurrentPage} />;
      // Analytics
      case 'overview':
        return <Overview />;
      case 'reports':
        return <Reports />;
      case 'insights':
        return <Insights />;
      case 'impact':
        return <Impact />;
      // Users (admin only)
      case 'all-users':
        return <AllUsers />;
      case 'roles':
        return <RolesPermissions />;
      case 'activity':
        return <UserActivity />;
      // Orders
      case 'all-orders':
        return <AllOrders />;
      case 'pending-orders':
        return <PendingOrders />;
      case 'completed-orders':
        return <CompletedOrders />;
      case 'deliveries':
        return <Deliveries />;
      // Listings
      case 'all-listings':
        return <AllListings />;
      case 'new-listing':
        return <NewListing />;
      // Vendors (admin only)
      case 'all-vendors':
        return <AllVendors />;
      case 'vendor-approval':
        return <VendorApproval />;
      // Disputes (admin only)
      case 'refunds':
        return <RefundRequests />;
      case 'complaints':
        return <CustomerComplaints />;
      // Other
      case 'payouts':
        return <Payouts />;
      case 'notifications':
        return <DashboardNotifications />;
      case 'settings':
        return <Settings initialTab={settingsTab} />;
      default:
        return <Content />;
    }
  };

  return (
    <AdminModeProvider userRole={currentUserRole}>
      <div className="min-h-scren bg-fufu dark:bg-char transition-colors duration-500">
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            collapsed={sideBarCollapsed}
            onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onPageChange={setCurrentPage}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              onMenuClick={() => setSideBarCollapsed(!sideBarCollapsed)}
              onNavigateToSettings={handleNavigateToSettings}
              onPageChange={handlePageChange}
            />

            <div className="flex-1 overflow-y-auto bg-transparent">
              <div className="p-6 space-y-6">{renderPage()}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminModeProvider>
  );
};

export default Dashboard;
