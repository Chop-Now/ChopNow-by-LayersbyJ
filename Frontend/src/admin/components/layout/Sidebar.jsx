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
import { Logo } from '../../../Components/brand/Kit';
import { CMark } from '../../../Components/brand/Illustrations';

const shopAdminMenuItems = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Dashboard',
  },
  {
    id: 'analytics',
    icon: <ChartNoAxesCombined className="w-5 h-5 shrink-0" aria-hidden="true" />,
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
    icon: <ShoppingBasket className="w-5 h-5 shrink-0" aria-hidden="true" />,
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
    icon: <List className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Listings',
    submenu: [
      { id: 'all-listings', label: 'All Listings' },
      { id: 'new-listing', label: 'New Listing' },
    ],
  },
  {
    id: 'payouts',
    icon: <Coins className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Payouts',
  },
  {
    id: 'settings',
    icon: <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Settings',
  },
];

const websiteAdminMenuItems = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Dashboard',
  },
  {
    id: 'analytics',
    icon: <ChartNoAxesCombined className="w-5 h-5 shrink-0" aria-hidden="true" />,
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
    icon: <User className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Users',
    submenu: [
      { id: 'all-users', label: 'All Users' },
      { id: 'roles', label: 'Roles & Permissions' },
      { id: 'activity', label: 'User Activity' },
    ],
  },
  {
    id: 'orders',
    icon: <ShoppingBasket className="w-5 h-5 shrink-0" aria-hidden="true" />,
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
    icon: <List className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Listings',
    submenu: [{ id: 'all-listings', label: 'All Listings' }],
  },
  {
    id: 'vendors',
    icon: <Store className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Vendors',
    submenu: [
      { id: 'all-vendors', label: 'All Vendors' },
      { id: 'vendor-approval', label: 'Vendor Approval' },
    ],
  },
  {
    id: 'riders',
    icon: <Bike className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Riders',
    submenu: [
      { id: 'all-riders', label: 'All Riders' },
      { id: 'rider-approval', label: 'Rider Approval' },
    ],
  },
  {
    id: 'disputes',
    icon: <ServerCrash className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Disputes',
    submenu: [{ id: 'complaints', label: 'Complaints' }],
  },
  {
    id: 'payouts',
    icon: <Coins className="w-5 h-5 shrink-0" aria-hidden="true" />,
    label: 'Payouts',
  },
  {
    id: 'settings',
    icon: <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />,
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
      className={`${isExpanded ? 'w-72' : 'w-20'} transition-all duration-300 ease-in-out bg-moringa text-fufu flex flex-col relative z-10`}
      onMouseEnter={() => collapsed && setIsHovered(true)}
      onMouseLeave={() => collapsed && setIsHovered(false)}
    >
      {/*Logo*/}
      <div
        className={`h-20 flex items-center border-b border-moringa-2 ${isExpanded ? 'px-6' : 'justify-center'}`}
      >
        {/*Conditional Rendering*/}
        {isExpanded ? (
          <div>
            <Logo tone="dark" size="sm" />
            <p className="eyebrow text-[10px] text-yellow mt-1.5">
              {isAdminDashboard ? 'Admin Panel' : 'Vendor Dashboard'}
            </p>
          </div>
        ) : (
          <CMark fill="var(--color-yellow)" className="w-7 logo-mark" label="ChopNow" />
        )}
      </div>

      {/*Sidebar Items*/}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
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
              className={`w-full flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} h-11 px-3 rounded-md transition-colors duration-200 cursor-pointer ${
                currentPage === item.id
                  ? 'bg-yellow text-moringa'
                  : openMenus[item.id]
                    ? 'bg-moringa-2 text-fufu'
                    : 'text-fufu/85 hover:bg-moringa-2 hover:text-fufu'
              }`}
            >
              <div className={`flex items-center ${isExpanded ? 'space-x-3' : ''}`}>
                {item.icon}
                {/*conditional rendering*/}
                {isExpanded && (
                  <>
                    <span className="text-sm font-semibold">{item.label}</span>
                    {item.count && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-yellow text-moringa rounded-sm ml-2">
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
              <div className="ml-6 mt-1 mb-2 pl-3 border-l border-moringa-2 space-y-0.5">
                {item.submenu.map((subitem) => (
                  <button
                    key={subitem.id}
                    onClick={() => onPageChange(subitem.id)}
                    className={`w-full text-left px-3 h-9 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                      currentPage === subitem.id
                        ? 'bg-yellow text-moringa font-semibold'
                        : 'text-fufu/75 hover:text-fufu hover:bg-moringa-2'
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
        <div className="p-3 border-t border-moringa-2">
          <button
            onClick={() => {
              // Navigate to storefront - you can customize the URL or navigation logic
              window.open('/shop', '_blank');
            }}
            className={`w-full flex items-center ${isExpanded ? 'justify-center gap-3 px-4' : 'justify-center'} h-12 rounded-md transition-colors bg-yellow hover:bg-yellow-dark text-moringa font-bold cursor-pointer`}
          >
            <ExternalLink className="w-5 h-5" aria-hidden="true" />
            {isExpanded && <span className="text-sm">View Storefront</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
