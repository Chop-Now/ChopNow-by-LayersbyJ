import { assets } from '../../../assets/assets';
import {
  ChartNoAxesCombined,
  ChevronDown,
  CircleStar,
  Coins,
  LayoutDashboard,
  List,
  ServerCrash,
  Settings,
  ShoppingBasket,
  Store,
  User,
  ExternalLink,
  Bike,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAdminMode } from '../../context/AdminModeContext';
import { useAppContext } from '../../../context/AppContext';

const shopAdminMenuItems = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 text-slate-400" />,
    label: 'Dashboard',
  },
  {
    id: 'analytics',
    icon: <ChartNoAxesCombined className="w-5 h-5 text-slate-400" />,
    label: 'Analytics',
    submenu: [
      { id: 'overview', label: 'Overview' },
      { id: 'reports', label: 'Reports' },
      { id: 'insights', label: 'Insights' },
      { id: 'impact', label: 'Impact' },
    ],
  },
  {
    id: 'orders',
    icon: <ShoppingBasket className="w-5 h-5 text-slate-400" />,
    label: 'Orders',
    submenu: [
      { id: 'all-orders', label: 'All Orders' },
      { id: 'pending-orders', label: 'Pending Orders' },
      { id: 'completed-orders', label: 'Completed Orders' },
      { id: 'deliveries', label: 'Deliveries' },
    ],
  },
  {
    id: 'listings',
    icon: <List className="w-5 h-5 text-slate-400" />,
    label: 'Listings',
    submenu: [
      { id: 'all-listings', label: 'All Listings' },
      { id: 'new-listing', label: 'New Listing' },
    ],
  },
  {
    id: 'payouts',
    icon: <Coins className="w-5 h-5 text-slate-400" />,
    label: 'Payouts',
  },
  {
    id: 'settings',
    icon: <Settings className="w-5 h-5 text-slate-400" />,
    label: 'Settings',
  },
];

const websiteAdminMenuItems = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 text-slate-400" />,
    label: 'Dashboard',
  },
  {
    id: 'analytics',
    icon: <ChartNoAxesCombined className="w-5 h-5 text-slate-400" />,
    label: 'Analytics',
    submenu: [
      { id: 'overview', label: 'Overview' },
      { id: 'reports', label: 'Reports' },
      { id: 'insights', label: 'Insights' },
      { id: 'impact', label: 'Impact' },
    ],
  },
  {
    id: 'users',
    icon: <User className="w-5 h-5 text-slate-400" />,
    label: 'Users',
    submenu: [
      { id: 'all-users', label: 'All Users' },
      { id: 'roles', label: 'Roles & Permissions' },
      { id: 'activity', label: 'User Activity' },
    ],
  },
  {
    id: 'orders',
    icon: <ShoppingBasket className="w-5 h-5 text-slate-400" />,
    label: 'Orders',
    submenu: [
      { id: 'all-orders', label: 'All Orders' },
      { id: 'pending-orders', label: 'Pending Orders' },
      { id: 'completed-orders', label: 'Completed Orders' },
      { id: 'deliveries', label: 'Deliveries' },
    ],
  },
  {
    id: 'listings',
    icon: <List className="w-5 h-5 text-slate-400" />,
    label: 'Listings',
    submenu: [{ id: 'all-listings', label: 'All Listings' }],
  },
  {
    id: 'vendors',
    icon: <Store className="w-5 h-5 text-slate-400" />,
    label: 'Vendors',
    submenu: [
      { id: 'all-vendors', label: 'All Vendors' },
      { id: 'vendor-approval', label: 'Vendor Approval' },
    ],
  },
  {
    id: 'riders',
    icon: <Bike className="w-5 h-5 text-slate-400" />,
    label: 'Riders',
    submenu: [
      { id: 'all-riders', label: 'All Riders' },
      { id: 'rider-approval', label: 'Rider Approval' },
    ],
  },
  {
    id: 'disputes',
    icon: <ServerCrash className="w-5 h-5 text-slate-400" />,
    label: 'Disputes',
    submenu: [{ id: 'complaints', label: 'Complaints' }],
  },
  {
    id: 'payouts',
    icon: <Coins className="w-5 h-5 text-slate-400" />,
    label: 'Payouts',
  },
  {
    id: 'settings',
    icon: <Settings className="w-5 h-5 text-slate-400" />,
    label: 'Settings',
  },
];

const Sidebar = ({ collapsed, onToggle, currentPage, onPageChange, isAdminDashboard = false }) => {
  const { adminMode, isAdmin } = useAdminMode();
  const { user } = useAppContext();
  const [openMenus, setOpenMenus] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  // For admin dashboard (/admin), always use website admin menu items
  // For vendor dashboard (/dashboard), always use shop admin menu items
  const menuItems = isAdminDashboard ? websiteAdminMenuItems : shopAdminMenuItems;

  const toggleMenu = (menuId) => {
    setOpenMenus((prev) => {
      const isCurrentlyOpen = prev[menuId];
      // Close all menus and only open the clicked one if it was closed
      return isCurrentlyOpen ? {} : { [menuId]: true };
    });
  };

  const isExpanded = !collapsed || isHovered;

  return (
    <div
      className={`${isExpanded ? 'w-72' : 'w-20'} transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col relative z-10`}
      onMouseEnter={() => collapsed && setIsHovered(true)}
      onMouseLeave={() => collapsed && setIsHovered(false)}
    >
      {/*Logo*/}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3">
          <img src={assets.logomarkgreen} alt="ChopNow" className="w-10 h-10" />

          {/*Conditional Rendering*/}
          {isExpanded && (
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">ChopNow</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdminDashboard ? 'Admin Panel' : 'Vendor Dashboard'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/*Sidebar Items*/}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.submenu) {
                  toggleMenu(item.id);
                } else {
                  onPageChange(item.id);
                }
              }}
              className={`w-full flex items-center ${isExpanded ? 'justify-between pl-5' : 'justify-center'} p-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                currentPage === item.id
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`flex items-center ${isExpanded ? 'space-x-3' : ''}`}>
                {item.icon}
                {/*conditional rendering*/}
                {isExpanded && (
                  <>
                    <span className="text-sm text-slate-800 dark:text-white font-medium">
                      {item.label}
                    </span>
                    {item.count && (
                      <span className="px-2 py-0.5 text-xs bg-solidTwo text-white rounded-full ml-2">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </div>

              {isExpanded && item.submenu && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openMenus[item.id] ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {/*Submenu*/}
            {isExpanded && item.submenu && openMenus[item.id] && (
              <div className="ml-8 mt-2 space-y-1">
                {item.submenu.map((subitem) => (
                  <button
                    key={subitem.id}
                    onClick={() => onPageChange(subitem.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      currentPage === subitem.id
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {subitem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View Storefront Button - Only for Vendor Dashboard */}
      {!isAdminDashboard && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              // Navigate to storefront - you can customize the URL or navigation logic
              window.open('/shop', '_blank');
            }}
            className={`w-full flex items-center ${isExpanded ? 'justify-center gap-3 px-4' : 'justify-center'} py-3 rounded-xl transition-all duration-300 bg-solid hover:bg-tertiary text-white font-medium shadow-lg hover:shadow-xl hover:shadow-solid/20 cursor-pointer`}
          >
            <ExternalLink className="w-5 h-5" />
            {isExpanded && <span className="text-sm">View Storefront</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
