import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Content from './components/Content/Content';
import { AdminModeProvider } from './context/AdminModeContext';
import { useAppContext } from '../context/AppContext';
import { usePlatformSettings } from '../context/PlatformSettingsContext';
import { userService } from '../services';
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
// Riders pages
import Riders from './pages/Riders';
// Disputes pages
import { RefundRequests, CustomerComplaints } from './pages/Disputes';
// Other pages
import Payouts from './pages/Payouts';
import Settings from './pages/Settings';
import DashboardNotifications from './pages/DashboardNotifications';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, switchRole, logout } = useAppContext();
  const { settings } = usePlatformSettings();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('profile');

  // Check authentication - ADMIN ONLY
  useEffect(() => {
    const checkAccess = async () => {
      // Skip if already checked or still loading
      if (isLoading || authChecked) return;

      // Check if user is logged in
      if (!isAuthenticated || !user) {
        navigate('/admin/login');
        return;
      }

      // Check if user has admin role (either as activeRole or in roles array)
      const currentRole = user.activeRole || user.role;
      const userRoles = user.roles || [user.role];
      const hasAdminRole = userRoles.includes('admin') || currentRole === 'admin';

      if (!hasAdminRole) {
        // If maintenance mode is on, don't redirect - show access denied instead
        // This prevents the loop where redirect leads to maintenance screen
        if (settings.maintenanceMode) {
          setAccessDenied(true);
          setAuthChecked(true);
          return;
        }
        // Non-admins go to their appropriate page (only when not in maintenance mode)
        if (currentRole === 'business_owner' || userRoles.includes('business_owner')) {
          navigate('/dashboard'); // Vendor dashboard
        } else {
          navigate('/shop');
        }
        return;
      }

      // If user has admin role but it's not currently active, switch to admin
      if (currentRole !== 'admin' && userRoles.includes('admin')) {
        try {
          const result = await switchRole('admin');
          // Verify the switch was successful
          if (result?.activeRole === 'admin') {
            setIsAdminRole(true);
          } else {
            throw new Error('Role switch did not return admin role');
          }
        } catch (error) {
          console.error('Failed to switch to admin role:', error);
          // Try direct API call as fallback
          try {
            const result = await userService.switchRole('admin');
            if (result?.activeRole === 'admin') {
              // Update localStorage with the result
              const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
              storedUser.activeRole = 'admin';
              storedUser.role = 'admin';
              if (result.user) {
                Object.assign(storedUser, result.user);
              }
              localStorage.setItem('user', JSON.stringify(storedUser));
              setIsAdminRole(true);
            } else {
              throw new Error('Fallback role switch failed', { cause: error });
            }
          } catch (fallbackError) {
            console.error('Fallback role switch failed:', fallbackError);
            navigate('/admin/login');
            return;
          }
        }
      } else if (currentRole === 'admin') {
        setIsAdminRole(true);
      }

      setAuthChecked(true);
    };

    checkAccess();
  }, [isAuthenticated, isLoading, user, navigate, switchRole]);

  // Show access denied message if user doesn't have admin role
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fufu dark:bg-char">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-moringa dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-moringa-muted dark:text-slate-400 mb-4">
            You don't have admin privileges to access this page.
            {settings.maintenanceMode && ' The platform is currently in maintenance mode.'}
          </p>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Login with Admin Account
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking auth
  if (isLoading || !authChecked || !isAdminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fufu dark:bg-char">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-solid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const handleNavigateToSettings = (pageOrTab) => {
    if (['profile', 'business', 'security', 'notifications', 'preferences'].includes(pageOrTab)) {
      setSettingsTab(pageOrTab);
      setCurrentPage('settings');
    } else {
      setCurrentPage(pageOrTab);
    }
  };

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId);
  };

  const renderPage = () => {
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
      // Users
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
      // Vendors
      case 'all-vendors':
        return <AllVendors />;
      case 'vendor-approval':
        return <VendorApproval />;
      // Riders
      case 'all-riders':
        return <Riders defaultStatus="all" />;
      case 'rider-approval':
        return <Riders defaultStatus="pending" />;
      // Disputes
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
    <AdminModeProvider userRole="admin">
      <div className="min-h-screen bg-fufu dark:bg-char transition-colors duration-500">
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            collapsed={sideBarCollapsed}
            onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onPageChange={setCurrentPage}
            isAdminDashboard={true}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              onMenuClick={() => setSideBarCollapsed(!sideBarCollapsed)}
              onNavigateToSettings={handleNavigateToSettings}
              onPageChange={handlePageChange}
              isAdminDashboard={true}
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

export default AdminDashboard;
