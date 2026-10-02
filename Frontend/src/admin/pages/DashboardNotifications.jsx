import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Loader2,
  Package,
  Truck,
  Star,
  Megaphone,
  PartyPopper,
  ShoppingBag,
  ChevronRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { notificationService } from '../../services';
import toast from 'react-hot-toast';
import { useAdminMode } from '../context/AdminModeContext';

const getIconConfig = (type) => {
  switch (type) {
    case 'order_confirmed':
    case 'order_ready':
    case 'order_completed':
      return {
        Icon: CheckCheck,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      };
    case 'order_cancelled':
      return {
        Icon: X,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
      };
    case 'new_order':
    case 'order_status_changed':
      return {
        Icon: ShoppingBag,
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
      };
    case 'order_out_for_delivery':
    case 'delivery_assigned':
    case 'delivery_completed':
      return {
        Icon: Truck,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      };
    case 'new_review':
    case 'review_response':
      return {
        Icon: Star,
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      };
    case 'impact_milestone':
      return {
        Icon: PartyPopper,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      };
    case 'promotion':
      return {
        Icon: Megaphone,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
      };
    default:
      return {
        Icon: Bell,
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-700',
      };
  }
};

const formatTimestamp = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DashboardNotifications = () => {
  const { adminMode } = useAdminMode();
  const isVendor = adminMode === 'shop';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [selectedType, setSelectedType] = useState(null);

  const vendorCategories = [
    { type: 'new_order', label: 'New Orders' },
    { type: 'order_status_changed', label: 'Order Updates' },
    { type: 'new_review', label: 'Reviews' },
    { type: 'impact_milestone', label: 'Milestones' },
  ];

  const adminCategories = [
    { type: 'new_order', label: 'Orders' },
    { type: 'new_review', label: 'Reviews' },
    { type: 'system', label: 'System' },
    { type: 'promotion', label: 'Promotions' },
  ];

  const categories = isVendor ? vendorCategories : adminCategories;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({ limit: 50 });
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification removed');
    } catch (error) {
      toast.error('Failed to remove notification');
    }
  };

  const filtered = notifications.filter((n) => {
    const readMatch = filter === 'all' || (filter === 'unread' && !n.read);
    const typeMatch = !selectedType || n.type === selectedType;
    return readMatch && typeMatch;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isVendor ? 'Your store activity and updates' : 'Platform-wide alerts and updates'}
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-solid text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-solid text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          Unread ({unreadCount})
        </button>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
        {categories.map((cat) => (
          <button
            key={cat.type}
            onClick={() => setSelectedType(selectedType === cat.type ? null : cat.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedType === cat.type ? 'bg-solid/10 dark:bg-solid/20 text-solid border border-solid/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {cat.label}
          </button>
        ))}
        {selectedType && (
          <button
            onClick={() => setSelectedType(null)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-solid" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Bell className="w-14 h-14 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
              No notifications
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filter === 'unread' ? "You're all caught up!" : 'Nothing to show here yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((notif) => {
              const { Icon, color, bg } = getIconConfig(notif.type);
              return (
                <div
                  key={notif._id}
                  className={`flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${!notif.read ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
                >
                  {/* Icon */}
                  <div
                    className={`relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bg}`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                    {!notif.read && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm text-slate-900 dark:text-white mb-0.5 ${!notif.read ? 'font-semibold' : 'font-medium'}`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        title="Mark as read"
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif._id)}
                      title="Remove"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardNotifications;
