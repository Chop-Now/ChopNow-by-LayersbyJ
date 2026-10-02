import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import { PageHero } from '../Components/brand/Kit';
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
    { id: 'rider', label: 'Rider status' },
    { id: 'announcement', label: 'App announcements' },
    { id: 'milestone', label: 'Impact milestones' },
  ];

  const getIconConfig = (type) => {
    switch (type) {
      case 'rider':
        return { Icon: Truck, tile: 'bg-mint text-moringa' };
      case 'announcement':
        return { Icon: Megaphone, tile: 'bg-peach text-clay' };
      case 'milestone':
        return { Icon: PartyPopper, tile: 'bg-lime text-moringa' };
      case 'order':
        return { Icon: Store, tile: 'bg-yellow text-moringa' };
      default:
        return { Icon: Bell, tile: 'bg-moringa text-yellow' };
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

    const { Icon, tile } = getIconConfig(selectedNotification.type);
    const meta = selectedNotification.metadata || {};

    return (
      <div
        className="fixed inset-0 bg-char/60 z-50 flex items-center justify-center p-0 sm:p-4"
        onClick={closeDetail}
      >
        <div
          className="bg-fufu w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-moringa text-fufu px-5 py-4 flex items-center justify-between gap-4">
            <h2 className="eyebrow text-yellow">Notification details</h2>
            <button
              onClick={closeDetail}
              className="h-10 w-10 flex items-center justify-center bg-yellow text-moringa hover:bg-yellow-dark transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-moringa" aria-hidden="true" />
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              {/* Icon and Title */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-14 h-14 flex items-center justify-center shrink-0 ${tile}`}>
                  <Icon size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="display text-[30px] sm:text-[36px] text-moringa leading-[0.95]">
                    {selectedNotification.title}
                  </h3>
                  <p className="text-moringa-muted mt-2">
                    {selectedNotification.description || selectedNotification.message}
                  </p>
                </div>
              </div>

              {/* Order/Listing Details */}
              {(meta.orderNumber || meta.listingTitle) && (
                <div className="bg-white border border-char/10 p-4 mb-4">
                  {meta.listingImage && (
                    <div className="mb-3">
                      <img
                        src={meta.listingImage}
                        alt={meta.listingTitle}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  {meta.listingTitle && (
                    <p className="font-bold text-moringa mb-2">{meta.listingTitle}</p>
                  )}

                  <div className="space-y-2">
                    {meta.orderNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-moringa" aria-hidden="true" />
                        <span className="text-moringa-muted">Order:</span>
                        <span className="font-mono font-medium text-moringa">
                          #{meta.orderNumber}
                        </span>
                      </div>
                    )}

                    {meta.orderTotal && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-moringa-muted ml-6">Total:</span>
                        <span className="font-bold text-moringa">
                          {meta.currency || 'RWF'} {meta.orderTotal?.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {meta.businessName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Store size={16} className="text-moringa" aria-hidden="true" />
                        <span className="text-moringa-muted">From:</span>
                        <span className="font-medium text-moringa">{meta.businessName}</span>
                      </div>
                    )}

                    {meta.customerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-moringa-muted ml-6">Customer:</span>
                        <span className="font-medium text-moringa">{meta.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pickup Code - Prominent Display */}
              {meta.pickupCode && (
                <div className="bg-lime text-moringa p-5 mb-4 text-center">
                  <p className="eyebrow text-[11px]">Your pickup code</p>
                  <p className="display text-[48px] tracking-widest mt-1">{meta.pickupCode}</p>
                  <p className="text-xs font-medium mt-1">
                    Show this code when you pick up your order
                  </p>
                </div>
              )}

              {/* Delivery Address */}
              {meta.deliveryAddress && (
                <div className="flex items-start gap-2 text-sm mb-4 bg-mint text-moringa p-4">
                  <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="eyebrow text-[10px]">Delivery address</span>
                    <p className="font-medium mt-1">{meta.deliveryAddress}</p>
                  </div>
                </div>
              )}

              {/* Fulfillment Type */}
              {meta.fulfillmentType && (
                <div className="flex items-center gap-2 text-sm text-moringa mb-4">
                  {meta.fulfillmentType === 'delivery' ? (
                    <Truck size={16} aria-hidden="true" />
                  ) : (
                    <Store size={16} aria-hidden="true" />
                  )}
                  <span className="eyebrow text-[11px]">{meta.fulfillmentType}</span>
                </div>
              )}

              {/* Review Details */}
              {meta.reviewRating && (
                <div className="bg-yellow text-moringa p-4 mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={
                          i < meta.reviewRating ? 'text-moringa fill-moringa' : 'text-moringa/40'
                        }
                      />
                    ))}
                  </div>
                  {meta.reviewText && <p className="font-medium italic">"{meta.reviewText}"</p>}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm text-moringa-muted mb-6">
                <Clock size={16} aria-hidden="true" />
                <span>{formatFullDate(selectedNotification.createdAt)}</span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleDetailAction(selectedNotification)}
                className="w-full h-14 bg-moringa text-fufu font-bold flex items-center justify-center gap-2 hover:bg-moringa-dark transition-colors cursor-pointer"
              >
                {meta.actionLabel || 'View Details'}
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow={`Your account / ${unreadCount} unread`}
        title="Notifications"
        intro="All your recent updates in one place."
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-[88px] bg-white border border-char/10 p-5">
            <h3 className="eyebrow text-moringa mb-4">Filter by</h3>

            {/* Status Title */}
            <h4 className="eyebrow text-[11px] text-moringa-muted mb-2">Status</h4>

            {/* All/Unread Buttons */}
            <div className="grid grid-cols-2 border-2 border-moringa mb-6">
              {['all', 'unread'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  aria-pressed={selectedFilter === f}
                  className={`h-11 text-sm font-bold capitalize transition-colors cursor-pointer ${
                    selectedFilter === f
                      ? 'bg-moringa text-yellow'
                      : 'bg-white text-moringa hover:bg-mint'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="eyebrow text-[11px] text-moringa-muted mb-3">Categories</h4>
              <div className="space-y-3">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="w-4 h-4 accent-[#0F3D2E] cursor-pointer"
                    />
                    <span className="text-sm font-medium text-moringa">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="w-full h-11 text-sm font-bold text-moringa border-2 border-moringa hover:bg-mint transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full min-w-0">
            {/* Mobile Filters */}
            <div className="lg:hidden mb-4">
              {/* All/Unread Buttons */}
              <div className="grid grid-cols-2 border-2 border-moringa mb-3">
                {['all', 'unread'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilter(f)}
                    aria-pressed={selectedFilter === f}
                    className={`h-11 text-sm font-bold capitalize transition-colors cursor-pointer ${
                      selectedFilter === f
                        ? 'bg-moringa text-yellow'
                        : 'bg-white text-moringa hover:bg-mint'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    aria-pressed={selectedCategories.includes(category.id)}
                    className={`h-9 px-3 text-xs font-bold border-2 border-moringa transition-colors cursor-pointer ${
                      selectedCategories.includes(category.id)
                        ? 'bg-yellow text-moringa'
                        : 'bg-white text-moringa hover:bg-mint'
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
                  className="eyebrow text-[11px] text-moringa underline underline-offset-4 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex justify-end items-center gap-2 mb-4">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 h-10 px-4 text-sm font-bold text-moringa border-2 border-moringa hover:bg-mint transition-colors cursor-pointer"
              >
                <CheckCheck size={16} aria-hidden="true" />
                <span>Mark all as read</span>
              </button>
              <button
                onClick={archiveAll}
                className="flex items-center gap-2 h-10 px-4 text-sm font-bold text-moringa border-2 border-moringa hover:bg-mint transition-colors cursor-pointer"
              >
                <ArchiveRestore size={16} aria-hidden="true" />
                <span>Archive all</span>
              </button>
            </div>

            {/* Notifications List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-char/10">
                <Loader2 className="w-8 h-8 animate-spin text-moringa mb-4" aria-hidden="true" />
                <p className="eyebrow text-moringa-muted">Loading notifications</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="bg-mint text-moringa px-6 py-14 text-center flex flex-col items-center">
                <Bell size={40} aria-hidden="true" />
                <p className="display text-[40px] mt-4">All quiet</p>
                <p className="mt-2 font-medium">No notifications to display</p>
              </div>
            ) : (
              <ul className="bg-white border border-char/10">
                {filteredNotifications.map((notification) => {
                  const { Icon, tile } = getIconConfig(notification.type);
                  const meta = notification.metadata || {};
                  return (
                    <li
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative flex gap-4 p-4 sm:p-5 border-b border-hairline last:border-b-0 cursor-pointer transition-colors hover:bg-fufu ${
                        !notification.isRead ? 'border-l-4 border-l-yellow' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 flex items-center justify-center shrink-0 ${tile}`}
                      >
                        <Icon size={22} aria-hidden="true" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-moringa mb-1 text-[15px] flex items-center gap-2">
                              {!notification.isRead && (
                                <span
                                  className="w-2 h-2 bg-pepper shrink-0"
                                  aria-label="Unread"
                                ></span>
                              )}
                              <span className="truncate">{notification.title}</span>
                            </h3>
                            <p className="text-sm text-moringa-muted mb-2 line-clamp-2">
                              {notification.description}
                            </p>

                            {/* Quick info preview */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-moringa-muted">
                              <span className="eyebrow text-[10px]">{notification.timestamp}</span>
                              {meta.orderNumber && (
                                <span className="font-mono bg-fufu-dim text-moringa px-2 py-0.5">
                                  #{meta.orderNumber}
                                </span>
                              )}
                              {meta.pickupCode && (
                                <span className="bg-lime text-moringa px-2 py-0.5 font-bold">
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
                              className="h-9 w-9 flex items-center justify-center text-moringa hover:bg-mint transition-colors cursor-pointer"
                              aria-label="More actions"
                            >
                              <EllipsisVertical size={18} aria-hidden="true" />
                            </button>

                            {dropdownOpen === notification.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border-2 border-moringa z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="w-full text-left px-4 h-11 text-sm font-semibold text-moringa hover:bg-mint transition-colors cursor-pointer"
                                >
                                  Mark as read
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="w-full text-left px-4 h-11 text-sm font-semibold text-clay border-t border-hairline hover:bg-peach transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tap to view indicator */}
                        <div className="flex items-center gap-1 eyebrow text-[10px] text-moringa mt-2">
                          <span>View details</span>
                          <ChevronRight size={14} aria-hidden="true" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </main>
        </div>
      </div>

      <Footer />

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default Notification;
