import PageNavbar from '../Components/PageNavbar';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Megaphone,
  PartyPopper,
  Store,
  CheckCheck,
  ArchiveRestore,
  EllipsisVertical,
  Loader2,
  Bell,
  X,
  MapPin,
  Package,
  Clock,
  ChevronRight,
  Star,
} from 'lucide-react';
import { notificationService } from '../services';
import toast from 'react-hot-toast';

const Notification = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const response = await notificationService.getNotifications();
        if (!isMounted) return;
        const notifs = (response.notifications || []).map((n) => ({
          id: n._id,
          type: mapNotificationType(n.type),
          originalType: n.type,
          title: n.title,
          description: n.message,
          isRead: n.read,
          timestamp: formatTimestamp(n.createdAt),
          createdAt: n.createdAt,
          link: n.link,
          relatedOrder: n.relatedOrder,
          relatedBusiness: n.relatedBusiness,
          relatedListing: n.relatedListing,
          metadata: n.metadata || {},
        }));
        setNotifications(notifs);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      const notifs = (response.notifications || []).map((n) => ({
        id: n._id,
        type: mapNotificationType(n.type),
        originalType: n.type,
        title: n.title,
        description: n.message,
        isRead: n.read,
        timestamp: formatTimestamp(n.createdAt),
        createdAt: n.createdAt,
        link: n.link,
        relatedOrder: n.relatedOrder,
        relatedBusiness: n.relatedBusiness,
        relatedListing: n.relatedListing,
        metadata: n.metadata || {},
      }));
      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Map backend notification types to frontend types
  const mapNotificationType = (type) => {
    const typeMap = {
      order_confirmed: 'order',
      order_ready: 'order',
      order_completed: 'order',
      order_cancelled: 'order',
      order_out_for_delivery: 'rider',
      delivery_assigned: 'rider',
      delivery_completed: 'rider',
      impact_milestone: 'milestone',
      system: 'announcement',
      promotion: 'announcement',
      other: 'announcement',
    };
    return typeMap[type] || 'announcement';
  };

  // Handle notification click - show details
  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Fetch full notification details
    setDetailLoading(true);
    try {
      const fullNotification = await notificationService.getNotificationById(notification.id);
      setSelectedNotification({
        ...notification,
        ...fullNotification,
        metadata: fullNotification.metadata || notification.metadata || {},
      });
    } catch (error) {
      console.error('Error fetching notification details:', error);
      // Fallback to current notification data
      setSelectedNotification(notification);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close detail modal
  const closeDetail = () => {
    setSelectedNotification(null);
  };

  // Navigate from detail view
  const handleDetailAction = (notification) => {
    closeDetail();
    const actionUrl = notification.metadata?.actionUrl || notification.link;

    switch (notification.originalType) {
      case 'order_confirmed':
      case 'order_ready':
      case 'order_completed':
      case 'order_cancelled':
      case 'order_out_for_delivery':
      case 'delivery_assigned':
      case 'review_response':
        navigate('/my-orders');
        break;
      case 'new_order':
      case 'order_status_changed':
      case 'new_review':
        navigate('/dashboard');
        break;
      case 'new_listing_nearby':
      case 'favorite_business_new_listing':
        if (notification.relatedListing?._id || notification.relatedListing) {
          const listingId = notification.relatedListing?._id || notification.relatedListing;
          navigate(`/shop/all/${listingId}`);
        } else {
          navigate('/shop');
        }
        break;
      default:
        if (actionUrl) navigate(actionUrl);
        break;
    }
  };

  // Format timestamp to relative time
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
    return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  };

  // Format date for detail view
  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const categories = [
    { id: 'order', label: 'Order updates' },
    { id: 'rider', label: 'Rider Status' },
    { id: 'announcement', label: 'App announcements' },
    { id: 'milestone', label: 'Impact Milestones' },
  ];

  const getIconConfig = (type) => {
    switch (type) {
      case 'rider':
        return { Icon: Truck, color: '#0F3D2E', bgColor: '#E6F9F2' };
      case 'announcement':
        return { Icon: Megaphone, color: '#E8552F', bgColor: '#FFF0E6' };
      case 'milestone':
        return { Icon: PartyPopper, color: '#4CAF50', bgColor: '#FAF3E4' };
      case 'order':
        return { Icon: Store, color: '#0A2A20', bgColor: '#E0F2ED' };
      default:
        return { Icon: Bell, color: '#0A2A20', bgColor: '#E0F2ED' };
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedFilter('all');
    setSelectedCategories([]);
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const archiveAll = async () => {
    try {
      for (const notif of notifications) {
        await notificationService.deleteNotification(notif.id);
      }
      setNotifications([]);
      toast.success('All notifications archived');
    } catch (error) {
      console.error('Error archiving all:', error);
      toast.error('Failed to archive notifications');
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
    setDropdownOpen(null);
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
    setDropdownOpen(null);
  };

  const filteredNotifications = notifications.filter((notif) => {
    const filterMatch = selectedFilter === 'all' || (selectedFilter === 'unread' && !notif.isRead);
    const categoryMatch =
      selectedCategories.length === 0 || selectedCategories.includes(notif.type);
    return filterMatch && categoryMatch;
  });

  // Render notification detail modal
  const renderDetailModal = () => {
    if (!selectedNotification) return null;

    const { Icon, color, bgColor } = getIconConfig(selectedNotification.type);
    const meta = selectedNotification.metadata || {};

    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={closeDetail}
      >
        <div
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-textColor">Notification Details</h2>
            <button
              onClick={closeDetail}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: bgColor }}
                >
                  <Icon size={28} style={{ color }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-textColor mb-1">
                    {selectedNotification.title}
                  </h3>
                  <p className="text-gray-600">
                    {selectedNotification.description || selectedNotification.message}
                  </p>
                </div>
              </div>

              {/* Order/Listing Details */}
              {(meta.orderNumber || meta.listingTitle) && (
                <div className="bg-fufu-dim rounded-xl p-4 mb-4">
                  {meta.listingImage && (
                    <div className="mb-3">
                      <img
                        src={meta.listingImage}
                        alt={meta.listingTitle}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {meta.listingTitle && (
                    <p className="font-medium text-textColor mb-2">{meta.listingTitle}</p>
                  )}

                  <div className="space-y-2">
                    {meta.orderNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-gray-400" />
                        <span className="text-gray-600">Order:</span>
                        <span className="font-medium text-textColor">#{meta.orderNumber}</span>
                      </div>
                    )}

                    {meta.orderTotal && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 ml-6">Total:</span>
                        <span className="font-bold text-green-600">
                          {meta.currency || 'RWF'} {meta.orderTotal?.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {meta.businessName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Store size={16} className="text-gray-400" />
                        <span className="text-gray-600">From:</span>
                        <span className="font-medium text-textColor">{meta.businessName}</span>
                      </div>
                    )}

                    {meta.customerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 ml-6">Customer:</span>
                        <span className="font-medium text-textColor">{meta.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pickup Code - Prominent Display */}
              {meta.pickupCode && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm text-green-700 mb-2">Your Pickup Code</p>
                  <p className="text-3xl font-bold text-green-600 tracking-widest">
                    {meta.pickupCode}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Show this code when you pick up your order
                  </p>
                </div>
              )}

              {/* Delivery Address */}
              {meta.deliveryAddress && (
                <div className="flex items-start gap-2 text-sm mb-4 bg-blue-50 rounded-lg p-3">
                  <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-blue-700 font-medium">Delivery Address:</span>
                    <p className="text-blue-600">{meta.deliveryAddress}</p>
                  </div>
                </div>
              )}

              {/* Fulfillment Type */}
              {meta.fulfillmentType && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  {meta.fulfillmentType === 'delivery' ? (
                    <Truck size={16} className="text-gray-400" />
                  ) : (
                    <Store size={16} className="text-gray-400" />
                  )}
                  <span className="capitalize">{meta.fulfillmentType}</span>
                </div>
              )}

              {/* Review Details */}
              {meta.reviewRating && (
                <div className="bg-yellow-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={
                          i < meta.reviewRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                  {meta.reviewText && <p className="text-gray-700 italic">"{meta.reviewText}"</p>}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Clock size={16} />
                <span>{formatFullDate(selectedNotification.createdAt)}</span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleDetailAction(selectedNotification)}
                className="w-full bg-solid text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
              >
                {meta.actionLabel || 'View Details'}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen pt-20">
      <PageNavbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-64 shrink-0 -ml-8">
            <div className="bg-primary rounded-lg p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-textColor mb-4">Filter by</h3>

              {/* Status Title */}
              <h4 className="text-sm font-semibold text-textColor mb-3">Status</h4>

              {/* All/Unread Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-center cursor-pointer ${
                    selectedFilter === 'all'
                      ? 'bg-solid text-white'
                      : 'bg-white text-textColor hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('unread')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-center cursor-pointer ${
                    selectedFilter === 'unread'
                      ? 'bg-solid text-white'
                      : 'bg-white text-textColor hover:bg-gray-100'
                  }`}
                >
                  Unread
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-textColor mb-3">Categories:</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="w-4 h-4 text-solid border-gray-300 rounded focus:ring-solid"
                      />
                      <span className="text-sm text-textColor">{category.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm text-solid border border-solid rounded-lg hover:bg-solid hover:text-white transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-textColor mb-2">Notifications Center</h1>
              <p className="text-moringa-muted">All your recent updates in one place</p>
            </div>

            {/* Mobile Filters - Below Title */}
            <div className="lg:hidden mb-6 bg-primary rounded-lg p-4">
              {/* All/Unread Buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-center text-sm ${
                    selectedFilter === 'all'
                      ? 'bg-solid text-white'
                      : 'bg-white text-textColor hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('unread')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-center text-sm ${
                    selectedFilter === 'unread'
                      ? 'bg-solid text-white'
                      : 'bg-white text-textColor hover:bg-gray-100'
                  }`}
                >
                  Unread
                </button>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-solid text-white'
                        : 'bg-white text-textColor hover:bg-gray-100'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Clear Filters */}
              {(selectedFilter !== 'all' || selectedCategories.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-xs text-solid border border-solid rounded-lg hover:bg-solid hover:text-white transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex justify-end items-center gap-6 mb-6 pb-4 border-b border-gray-200">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 text-sm text-textColor hover:text-moringa-muted transition-colors cursor-pointer"
              >
                <CheckCheck size={18} />
                <span>Mark all as read</span>
              </button>
              <button
                onClick={archiveAll}
                className="flex items-center gap-2 text-sm text-textColor hover:text-moringa-muted transition-colors cursor-pointer"
              >
                <ArchiveRestore size={18} />
                <span>Archive All</span>
              </button>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-4" />
                  <p className="text-moringa-muted">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-moringa-muted">
                  <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No notifications to display</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const { Icon, color, bgColor } = getIconConfig(notification.type);
                  const meta = notification.metadata || {};
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative bg-primary rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                        !notification.isRead
                          ? 'ring-2 ring-solid ring-opacity-30 bg-green-50/30'
                          : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Icon with unread indicator */}
                        <div className="relative shrink-0">
                          {!notification.isRead && (
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full z-10 animate-pulse"></div>
                          )}
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: bgColor }}
                          >
                            <Icon size={22} style={{ color: color }} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-textColor mb-1 text-sm">
                                {notification.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {notification.description}
                              </p>

                              {/* Quick info preview */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span>{notification.timestamp}</span>
                                {meta.orderNumber && (
                                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                                    #{meta.orderNumber}
                                  </span>
                                )}
                                {meta.pickupCode && (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                    Code: {meta.pickupCode}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions Menu */}
                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownOpen(
                                    dropdownOpen === notification.id ? null : notification.id
                                  );
                                }}
                                className="p-1 text-gray-400 hover:text-textColor transition-colors rounded-full hover:bg-gray-100"
                              >
                                <EllipsisVertical size={18} />
                              </button>

                              {dropdownOpen === notification.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-textColor hover:bg-gray-100 transition-colors"
                                  >
                                    Mark as read
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tap to view indicator */}
                          <div className="flex items-center gap-1 text-xs text-solid mt-2">
                            <span>Tap to view details</span>
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default Notification;
