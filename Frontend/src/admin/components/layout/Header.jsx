import {
  Bell,
  ChevronDown,
  MenuIcon,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  CircleUserRound,
  Settings,
  BadgeInfo,
  LogOut,
  X,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2,
  Store,
  LayoutDashboard,
  ChartNoAxesCombined,
  FileText,
  Leaf,
  ShoppingBasket,
  Clock,
  Truck,
  List,
  Plus,
  Coins,
  User,
  Shield,
  Activity,
  Ban,
  MessageSquare,
  ShoppingCart,
  Star,
  Megaphone,
  PartyPopper,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminMode } from '../../context/AdminModeContext';
import { useAppContext } from '../../../context/AppContext';
import ConfirmationModal from '../ConfirmationModal';
import notificationService from '../../../services/notificationService';

const Header = ({ onMenuClick, onNavigateToSettings, onPageChange, isAdminDashboard = false }) => {
  const { toggleAdminMode } = useAdminMode();
  const { user, logout, availableRoles, switchRole } = useAppContext();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);

  // Shop Admin searchable items
  const shopAdminSearchItems = [
    // Pages
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: 'Pages',
      icon: 'LayoutDashboard',
      keywords: ['home', 'main', 'overview', 'welcome', 'start', 'summary', 'quick stats'],
    },
    // Analytics
    {
      id: 'overview',
      label: 'Analytics Overview',
      path: 'Analytics > Overview',
      icon: 'ChartNoAxesCombined',
      keywords: [
        'sales',
        'revenue',
        'stats',
        'metrics',
        'performance',
        'charts',
        'graphs',
        'data',
        'analytics',
        'today',
        'weekly',
        'monthly',
        'total sales',
        'order count',
      ],
    },
    {
      id: 'reports',
      label: 'Analytics Reports',
      path: 'Analytics > Reports',
      icon: 'FileText',
      keywords: [
        'revenue',
        'cost',
        'category',
        'peak hours',
        'fulfillment',
        'export',
        'download',
        'csv',
        'pdf',
        'breakdown',
        'analysis',
        'income',
        'expenses',
        'profit',
        'margin',
        'best selling',
        'top products',
      ],
    },
    {
      id: 'insights',
      label: 'Analytics Insights',
      path: 'Analytics > Insights',
      icon: 'TrendingUp',
      keywords: [
        'customer behavior',
        'conversion',
        'growth',
        'opportunities',
        'retention',
        'trends',
        'patterns',
        'recommendations',
        'suggestions',
        'improve',
        'optimize',
      ],
    },
    {
      id: 'impact',
      label: 'Analytics Impact',
      path: 'Analytics > Impact',
      icon: 'Leaf',
      keywords: [
        'meals rescued',
        'co2',
        'carbon',
        'water saved',
        'environmental',
        'ranking',
        'sustainability',
        'food waste',
        'green',
        'eco',
        'impact score',
        'saved meals',
      ],
    },
    // Orders
    {
      id: 'all-orders',
      label: 'All Orders',
      path: 'Orders > All Orders',
      icon: 'ShoppingBasket',
      keywords: [
        'view orders',
        'order list',
        'order management',
        'purchases',
        'transactions',
        'order history',
        'customer orders',
        'search order',
        'find order',
      ],
    },
    {
      id: 'pending-orders',
      label: 'Pending Orders',
      path: 'Orders > Pending',
      icon: 'Clock',
      keywords: [
        'awaiting',
        'processing',
        'new orders',
        'incoming',
        'waiting',
        'unconfirmed',
        'accept order',
        'confirm order',
      ],
    },
    {
      id: 'completed-orders',
      label: 'Completed Orders',
      path: 'Orders > Completed',
      icon: 'CheckCircle',
      keywords: [
        'fulfilled',
        'delivered',
        'finished',
        'done',
        'successful',
        'past orders',
        'order history',
      ],
    },
    {
      id: 'deliveries',
      label: 'Deliveries',
      path: 'Orders > Deliveries',
      icon: 'Truck',
      keywords: [
        'shipping',
        'delivery tracking',
        'dispatch',
        'rider',
        'in transit',
        'on the way',
        'track',
        'driver',
        'courier',
      ],
    },
    // Listings
    {
      id: 'all-listings',
      label: 'All Listings',
      path: 'Listings > All',
      icon: 'List',
      keywords: [
        'products',
        'inventory',
        'catalog',
        'items',
        'menu',
        'food items',
        'stock',
        'available',
        'active listings',
        'manage products',
      ],
    },
    {
      id: 'new-listing',
      label: 'New Listing',
      path: 'Listings > New',
      icon: 'Plus',
      keywords: [
        'add product',
        'create listing',
        'new item',
        'upload',
        'add food',
        'new product',
        'add menu item',
        'post',
        'sell',
      ],
    },
    // Finance
    {
      id: 'payouts',
      label: 'Payouts',
      path: 'Finance > Payouts',
      icon: 'Coins',
      keywords: [
        'payments',
        'bank',
        'mtn',
        'earnings',
        'payment settings',
        'withdrawal',
        'money',
        'funds',
        'balance',
        'transfer',
        'bank account',
        'mobile money',
        'airtel',
        'cashout',
        'get paid',
      ],
    },
    // Settings - Main
    {
      id: 'settings',
      label: 'Settings',
      path: 'Settings',
      icon: 'Settings',
      keywords: ['preferences', 'configuration', 'account', 'options', 'customize', 'setup'],
    },
    // Settings - Profile Tab
    {
      id: 'settings',
      label: 'Profile Settings',
      path: 'Settings > Profile',
      icon: 'CircleUserRound',
      tab: 'profile',
      keywords: [
        'edit profile',
        'profile picture',
        'avatar',
        'name',
        'email',
        'phone number',
        'contact info',
        'personal information',
        'update profile',
        'business name',
        'business logo',
        'tagline',
        'contact person',
      ],
    },
    // Settings - Business Tab (Shop Admin)
    {
      id: 'settings',
      label: 'Business Details',
      path: 'Settings > Business',
      icon: 'ReceiptText',
      tab: 'business',
      keywords: [
        'business hours',
        'opening hours',
        'closing time',
        'working hours',
        'schedule',
        'location',
        'address',
        'map',
        'physical address',
        'certificates',
        'license',
        'health certificate',
        'tax registration',
        'documents',
        'special hours',
        'holidays',
      ],
    },
    // Settings - Security Tab
    {
      id: 'settings',
      label: 'Security Settings',
      path: 'Settings > Security',
      icon: 'Shield',
      tab: 'security',
      keywords: [
        'two factor',
        'two-factor',
        '2fa',
        'authentication',
        'password',
        'change password',
        'reset password',
        'active sessions',
        'login activity',
        'logout all devices',
        'security',
        'protect account',
        'verification',
        'otp',
      ],
    },
    // Profile Menu Actions
    {
      id: 'profile',
      label: 'Edit Profile',
      path: 'Profile Menu > Edit Profile',
      icon: 'CircleUserRound',
      keywords: [
        'profile',
        'edit',
        'personal info',
        'update profile',
        'my profile',
        'account info',
      ],
      type: 'action',
      action: 'profile',
    },
    {
      id: 'security',
      label: 'Account Settings',
      path: 'Profile Menu > Settings',
      icon: 'Settings',
      keywords: ['security', 'password', 'account settings', 'privacy'],
      type: 'action',
      action: 'security',
    },
    {
      id: 'support',
      label: 'Support',
      path: 'Profile Menu > Support',
      icon: 'BadgeInfo',
      keywords: [
        'help',
        'assistance',
        'contact support',
        'customer service',
        'faq',
        'question',
        'issue',
        'problem',
      ],
      type: 'action',
      action: 'support',
    },
    {
      id: 'logout',
      label: 'Sign Out',
      path: 'Profile Menu > Sign Out',
      icon: 'LogOut',
      keywords: ['logout', 'sign out', 'exit', 'log out', 'leave', 'end session'],
      type: 'action',
      action: 'logout',
    },
    {
      id: 'dark-mode',
      label: 'Toggle Dark Mode',
      path: 'Header > Theme',
      icon: 'Moon',
      keywords: [
        'dark mode',
        'light mode',
        'theme',
        'appearance',
        'night mode',
        'display',
        'brightness',
        'color scheme',
      ],
      type: 'action',
      action: 'dark-mode',
    },
    {
      id: 'notifications',
      label: 'View Notifications',
      path: 'Header > Notifications',
      icon: 'Bell',
      keywords: ['notifications', 'alerts', 'updates', 'messages', 'inbox', 'new', 'unread'],
      type: 'action',
      action: 'notifications',
    },
    {
      id: 'switch-admin',
      label: 'Switch to Website Admin',
      path: 'Header > Admin Mode',
      icon: 'Building2',
      keywords: ['switch mode', 'admin mode', 'website admin', 'change mode', 'toggle admin'],
      type: 'action',
      action: 'switch-admin',
    },
    {
      id: 'storefront',
      label: 'View Storefront',
      path: 'Sidebar > Storefront',
      icon: 'Store',
      keywords: [
        'shop',
        'storefront',
        'view shop',
        'my store',
        'preview',
        'customer view',
        'public page',
      ],
      type: 'action',
      action: 'storefront',
    },
  ];

  // Website Admin searchable items
  const websiteAdminSearchItems = [
    // Pages
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: 'Pages',
      icon: 'LayoutDashboard',
      keywords: [
        'home',
        'main',
        'overview',
        'welcome',
        'start',
        'summary',
        'quick stats',
        'platform overview',
      ],
    },
    // Analytics
    {
      id: 'overview',
      label: 'Analytics Overview',
      path: 'Analytics > Overview',
      icon: 'ChartNoAxesCombined',
      keywords: [
        'co2',
        'meals',
        'water',
        'vendor leaderboard',
        'environmental',
        'platform stats',
        'total users',
        'total vendors',
        'charts',
        'graphs',
        'data',
      ],
    },
    {
      id: 'reports',
      label: 'Analytics Reports',
      path: 'Analytics > Reports',
      icon: 'FileText',
      keywords: [
        'revenue',
        'expenses',
        'category',
        'peak hours',
        'fulfillment',
        'export',
        'download',
        'csv',
        'pdf',
        'breakdown',
        'income',
        'profit',
        'platform revenue',
        'commission',
      ],
    },
    {
      id: 'insights',
      label: 'Analytics Insights',
      path: 'Analytics > Insights',
      icon: 'TrendingUp',
      keywords: [
        'user growth',
        'vendor metrics',
        'regional',
        'demographics',
        'trends',
        'patterns',
        'analysis',
        'growth rate',
        'retention',
      ],
    },
    {
      id: 'impact',
      label: 'Analytics Impact',
      path: 'Analytics > Impact',
      icon: 'Leaf',
      keywords: [
        'meals rescued',
        'co2',
        'carbon',
        'water saved',
        'environmental',
        'monthly impact',
        'sustainability',
        'food waste',
        'green',
        'eco',
        'platform impact',
      ],
    },
    // Users
    {
      id: 'all-users',
      label: 'All Users',
      path: 'Users > All Users',
      icon: 'User',
      keywords: [
        'customers',
        'user list',
        'accounts',
        'members',
        'registered users',
        'customer list',
        'search user',
        'find user',
        'user management',
      ],
    },
    {
      id: 'roles',
      label: 'Roles & Permissions',
      path: 'Users > Roles',
      icon: 'Shield',
      keywords: [
        'permissions',
        'access',
        'roles',
        'authorization',
        'admin roles',
        'user roles',
        'access control',
        'privileges',
        'restrict access',
      ],
    },
    {
      id: 'activity',
      label: 'User Activity',
      path: 'Users > Activity',
      icon: 'Activity',
      keywords: [
        'logs',
        'activity log',
        'user behavior',
        'tracking',
        'audit log',
        'history',
        'actions',
        'user actions',
        'recent activity',
      ],
    },
    // Vendors
    {
      id: 'all-vendors',
      label: 'All Vendors',
      path: 'Vendors > All Vendors',
      icon: 'Store',
      keywords: [
        'shops',
        'merchants',
        'sellers',
        'vendor list',
        'pending',
        'active',
        'suspended',
        'all shops',
        'vendor management',
        'search vendor',
        'find vendor',
      ],
    },
    {
      id: 'vendor-approval',
      label: 'Vendor Approval',
      path: 'Vendors > Approval',
      icon: 'CheckCircle',
      keywords: [
        'awaiting approval',
        'pending',
        'verification',
        'approve vendors',
        'new vendors',
        'review vendors',
        'accept vendor',
        'reject vendor',
        'onboarding',
      ],
    },
    // Disputes
    {
      id: 'refunds',
      label: 'Refund Requests',
      path: 'Disputes > Refunds',
      icon: 'AlertCircle',
      keywords: [
        'disputes',
        'refunds',
        'money back',
        'returns',
        'refund request',
        'customer refund',
        'cancel order',
        'chargeback',
        'reimburse',
      ],
    },
    {
      id: 'complaints',
      label: 'Customer Complaints',
      path: 'Disputes > Complaints',
      icon: 'MessageSquare',
      keywords: [
        'complaints',
        'issues',
        'problems',
        'customer service',
        'report',
        'feedback',
        'negative review',
        'bad experience',
        'resolve issue',
      ],
    },
    // Finance
    {
      id: 'payouts',
      label: 'Payouts',
      path: 'Finance > Payouts',
      icon: 'Coins',
      keywords: [
        'payments',
        'bank',
        'mtn',
        'vendor payouts',
        'release payout',
        'pay vendors',
        'withdrawal',
        'transfer',
        'mobile money',
        'airtel',
        'funds',
        'balance',
        'pending payouts',
      ],
    },
    // Settings - Main
    {
      id: 'settings',
      label: 'Settings',
      path: 'Settings',
      icon: 'Settings',
      keywords: ['preferences', 'configuration', 'account', 'options', 'customize', 'setup'],
    },
    // Settings - Profile Tab
    {
      id: 'settings',
      label: 'Profile Settings',
      path: 'Settings > Profile',
      icon: 'CircleUserRound',
      tab: 'profile',
      keywords: [
        'edit profile',
        'profile picture',
        'avatar',
        'name',
        'email',
        'phone number',
        'contact info',
        'personal information',
        'update profile',
        'admin profile',
      ],
    },
    // Settings - Security Tab
    {
      id: 'settings',
      label: 'Security Settings',
      path: 'Settings > Security',
      icon: 'Shield',
      tab: 'security',
      keywords: [
        'two factor',
        'two-factor',
        '2fa',
        'authentication',
        'password',
        'change password',
        'reset password',
        'active sessions',
        'login activity',
        'logout all devices',
        'security',
        'protect account',
        'verification',
        'otp',
      ],
    },
    // Profile Menu Actions
    {
      id: 'profile',
      label: 'Edit Profile',
      path: 'Profile Menu > Edit Profile',
      icon: 'CircleUserRound',
      keywords: [
        'profile',
        'edit',
        'personal info',
        'update profile',
        'my profile',
        'account info',
      ],
      type: 'action',
      action: 'profile',
    },
    {
      id: 'security',
      label: 'Account Settings',
      path: 'Profile Menu > Settings',
      icon: 'Settings',
      keywords: ['security', 'password', 'account settings', 'privacy'],
      type: 'action',
      action: 'security',
    },
    {
      id: 'support',
      label: 'Support',
      path: 'Profile Menu > Support',
      icon: 'BadgeInfo',
      keywords: [
        'help',
        'assistance',
        'contact support',
        'customer service',
        'faq',
        'question',
        'issue',
        'problem',
      ],
      type: 'action',
      action: 'support',
    },
    {
      id: 'logout',
      label: 'Sign Out',
      path: 'Profile Menu > Sign Out',
      icon: 'LogOut',
      keywords: ['logout', 'sign out', 'exit', 'log out', 'leave', 'end session'],
      type: 'action',
      action: 'logout',
    },
    {
      id: 'dark-mode',
      label: 'Toggle Dark Mode',
      path: 'Header > Theme',
      icon: 'Moon',
      keywords: [
        'dark mode',
        'light mode',
        'theme',
        'appearance',
        'night mode',
        'display',
        'brightness',
        'color scheme',
      ],
      type: 'action',
      action: 'dark-mode',
    },
    {
      id: 'notifications',
      label: 'View Notifications',
      path: 'Header > Notifications',
      icon: 'Bell',
      keywords: ['notifications', 'alerts', 'updates', 'messages', 'inbox', 'new', 'unread'],
      type: 'action',
      action: 'notifications',
    },
    {
      id: 'switch-admin',
      label: 'Switch to Shop Admin',
      path: 'Header > Admin Mode',
      icon: 'Store',
      keywords: [
        'switch mode',
        'admin mode',
        'shop admin',
        'change mode',
        'toggle admin',
        'vendor mode',
      ],
      type: 'action',
      action: 'switch-admin',
    },
  ];

  // Get current search items based on dashboard type

  // Get current search items based on dashboard type
  // For admin dashboard (/admin), always use website admin search items
  // For vendor dashboard (/dashboard), use shop admin search items
  const baseSearchItems = isAdminDashboard ? websiteAdminSearchItems : shopAdminSearchItems;
  // Filter out admin mode toggle for dedicated dashboards
  const currentSearchItems = baseSearchItems.filter((item) => item.action !== 'switch-admin');

  // Map backend notification type to icon config
  const getNotifIconConfig = (type) => {
    switch (type) {
      case 'order_confirmed':
      case 'order_ready':
      case 'order_completed':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'order_cancelled':
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case 'new_order':
      case 'order_status_changed':
        return {
          icon: Package,
          iconBg: 'bg-orange-100 dark:bg-orange-900/30',
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'order_out_for_delivery':
      case 'delivery_assigned':
      case 'delivery_completed':
        return {
          icon: Truck,
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'new_review':
      case 'review_response':
        return {
          icon: Star,
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'impact_milestone':
        return {
          icon: PartyPopper,
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'promotion':
        return {
          icon: Megaphone,
          iconBg: 'bg-purple-100 dark:bg-purple-900/30',
          iconColor: 'text-purple-600 dark:text-purple-400',
        };
      default:
        return {
          icon: Bell,
          iconBg: 'bg-slate-100 dark:bg-slate-700',
          iconColor: 'text-slate-600 dark:text-slate-400',
        };
    }
  };

  const formatNotifTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const data = await notificationService.getNotifications({ limit: 8 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkNotifRead = async (notifId) => {
    try {
      await notificationService.markAsRead(notifId);
      setNotifications((prev) => prev.map((n) => (n._id === notifId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Fetch real notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Check for saved theme preference or default to light mode
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark =
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 0) {
      setIsSearchOpen(true);
      // Filter search items based on query - search in label, path, and keywords
      const filtered = currentSearchItems.filter((item) => {
        const searchText = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(searchText) ||
          item.path.toLowerCase().includes(searchText) ||
          (item.keywords && item.keywords.some((keyword) => keyword.includes(searchText)))
        );
      });
      setSearchResults(filtered);
    } else {
      setIsSearchOpen(false);
      setSearchResults([]);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (item) => {
    // Handle different action types
    if (item.type === 'action') {
      // Close search modal first for actions
      setSearchQuery('');
      setIsSearchOpen(false);
      setSearchResults([]);

      switch (item.action) {
        case 'logout':
          setShowLogoutModal(true);
          break;
        case 'dark-mode':
          toggleDarkMode();
          break;
        case 'notifications':
          setIsNotificationOpen(true);
          break;
        case 'switch-admin':
          toggleAdminMode();
          break;
        case 'profile':
          handleEditProfile();
          break;
        case 'security':
          handleAccountSettings();
          break;
        case 'support':
          break;
        case 'storefront':
          window.open('/shop', '_blank');
          break;
        default:
          break;
      }
    } else {
      // Navigate to page - call the function first
      const pageId = item.id;

      // Close modal
      setSearchQuery('');
      setIsSearchOpen(false);
      setSearchResults([]);

      // Navigate using the page change function
      if (onPageChange) {
        onPageChange(pageId);
      }
    }
  };

  // Close search when pressing Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen]);

  const handleEditProfile = () => {
    setIsProfileOpen(false);
    onNavigateToSettings('profile');
  };

  const handleAccountSettings = () => {
    setIsProfileOpen(false);
    onNavigateToSettings('security');
  };

  const handleSignOut = () => {
    setIsProfileOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          {/*Left section*/}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Mobile search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Desktop search input */}
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search or type command..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setIsSearchOpen(true);
                  }
                }}
                className="w-64 md:w-80 lg:w-96 pl-10 pr-12 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                    setSearchResults([]);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/*Right side*/}
          <div className="flex items-center gap-3">
            {/* Shop as Buyer Button - Only show if user has consumer role */}
            {availableRoles && availableRoles.includes('consumer') && (
              <button
                onClick={async () => {
                  try {
                    await switchRole('consumer');
                    navigate('/shop');
                  } catch (error) {
                    console.error('Failed to switch role:', error);
                  }
                }}
                className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-solid text-solid rounded-lg hover:bg-solid hover:text-white transition-all duration-200"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">Shop as Buyer</span>
              </button>
            )}

            {/* Dashboard Label - Shows current dashboard type */}
            {isAdminDashboard ? (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-solid to-tertiary text-white rounded-lg">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Admin Panel</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-solid to-tertiary text-white rounded-lg">
                <Store className="w-4 h-4" />
                <span className="text-sm font-medium">Vendor Dashboard</span>
              </div>
            )}

            {/*Toggle switch*/}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {/*Notification*/}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  if (!isNotificationOpen) fetchNotifications();
                }}
                className="relative p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-orange-500 rounded-full animate-ping"></span>
                    <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center"></span>
                  </>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-90 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-9999">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-solid hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-solid border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif, index) => {
                        const { icon: Icon, iconBg, iconColor } = getNotifIconConfig(notif.type);
                        return (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (!notif.read) handleMarkNotifRead(notif._id);
                            }}
                            className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                              !notif.read ? 'bg-orange-50/40 dark:bg-orange-900/10' : ''
                            } ${index < notifications.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 ${iconBg} rounded-full shrink-0 relative`}>
                                <Icon className={`w-4 h-4 ${iconColor}`} />
                                {!notif.read && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium text-slate-800 dark:text-white truncate ${!notif.read ? 'font-semibold' : ''}`}
                                >
                                  {notif.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  {formatNotifTime(notif.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Button */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        if (onPageChange) onPageChange('notifications');
                      }}
                      className="w-9/10 px-4 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/*User profile*/}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-4 ml-2 border-l border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img
                  src={
                    user?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`
                  }
                  alt="user"
                  className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0"
                />
                <div className="hidden md:flex md:flex-col md:justify-center text-left min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {user?.firstName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                    {user?.activeRole === 'admin'
                      ? 'Administrator'
                      : user?.activeRole === 'business_owner'
                        ? 'Vendor'
                        : 'Member'}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-9999">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={handleEditProfile}
                      className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                    >
                      <CircleUserRound className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Edit Profile
                      </span>
                    </button>

                    <button
                      onClick={handleAccountSettings}
                      className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Account Settings
                      </span>
                    </button>

                    <button className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer">
                      <BadgeInfo className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Support</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>

                  {/* Sign Out */}
                  <div className="py-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Sign Out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
          type="logout"
          title="Sign Out?"
          message="Do you really want to sign out from your account?"
        />
      </div>

      {/* Search Results Overlay and Modal */}
      {isSearchOpen && (
        <>
          {/* Dark Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-9998"
            onMouseDown={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
          />

          {/* Search Results Modal */}
          <div
            className="fixed top-24 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-9999"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mx-4">
              {/* Search Input in Modal */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search or type command..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Header */}
              <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {searchResults.length > 0 ? (
                      <>
                        {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}{' '}
                        found
                      </>
                    ) : (
                      'No results'
                    )}
                  </h3>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Results List */}
              <div className="max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((item) => {
                      const IconComponent = {
                        LayoutDashboard,
                        ChartNoAxesCombined,
                        FileText,
                        TrendingUp,
                        Leaf,
                        ShoppingBasket,
                        Clock,
                        CheckCircle,
                        Truck,
                        List,
                        Plus,
                        Coins,
                        Settings,
                        User,
                        Shield,
                        Activity,
                        Store,
                        Ban,
                        AlertCircle,
                        MessageSquare,
                        CircleUserRound,
                        BadgeInfo,
                        LogOut,
                        Moon,
                        Bell,
                        Building2,
                      }[item.icon];

                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Handle different action types
                            if (item.type === 'action') {
                              setSearchQuery('');
                              setIsSearchOpen(false);
                              setSearchResults([]);

                              switch (item.action) {
                                case 'logout':
                                  setShowLogoutModal(true);
                                  break;
                                case 'dark-mode':
                                  toggleDarkMode();
                                  break;
                                case 'notifications':
                                  setIsNotificationOpen(true);
                                  break;
                                case 'switch-admin':
                                  toggleAdminMode();
                                  break;
                                case 'profile':
                                  handleEditProfile();
                                  break;
                                case 'security':
                                  handleAccountSettings();
                                  break;
                                case 'storefront':
                                  window.open('/shop', '_blank');
                                  break;
                                default:
                                  break;
                              }
                            } else {
                              // Navigate to page
                              const pageId = item.id;
                              const tabId = item.tab;

                              // Check if this is a settings tab navigation
                              if (tabId && onNavigateToSettings) {
                                // Navigate to specific settings tab
                                onNavigateToSettings(tabId);
                              } else if (onPageChange) {
                                // Navigate to regular page
                                onPageChange(pageId);
                              }

                              // Then close modal
                              setSearchQuery('');
                              setIsSearchOpen(false);
                              setSearchResults([]);
                            }
                          }}
                          className="w-full px-6 py-3 flex items-center space-x-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer"
                        >
                          <div className="p-2 bg-solid/10 dark:bg-solid/20 rounded-lg shrink-0">
                            {IconComponent && <IconComponent className="w-5 h-5 text-solid" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                              {item.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.path}
                            </p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 px-6 text-center">
                    <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      No results found for "{searchQuery}"
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Try searching with different keywords
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Hint */}
              {searchResults.length > 0 && (
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Press ESC to close</span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs">
                        ↑
                      </kbd>
                      <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs">
                        ↓
                      </kbd>
                      <span className="ml-1">to navigate</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
