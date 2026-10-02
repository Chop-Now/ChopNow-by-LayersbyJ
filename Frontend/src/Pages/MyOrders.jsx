import React, { useEffect, useState } from 'react';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import {
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Utensils,
  Trash2,
  Loader2,
  Phone,
  Navigation,
  Copy,
  Check,
  Star,
  Store,
  Home,
  Bike,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderService, reviewService } from '../services';
import MobileMoneyPaymentModal from '../Components/payments/MobileMoneyPaymentModal';
import { PageHero, BrandLoader } from '../Components/brand/Kit';
import { Bag } from '../Components/brand/Illustrations';

// Brand select / input used by the desktop filter row.
const FIELD =
  'h-11 w-full border-2 border-moringa bg-white pl-9 pr-3 text-sm font-medium text-moringa focus:outline-none focus:bg-fufu cursor-pointer';

// Status pill colours, keyed by getStatusCategory().
const STATUS_PILL = {
  completed: 'bg-lime text-moringa',
  processing: 'bg-mint text-moringa',
  cancelled: 'bg-fufu-dim text-moringa',
  failed: 'bg-peach text-clay',
};

const StatusPill = ({ category, children }) => (
  <span
    className={`inline-block eyebrow text-[10px] px-2 py-1 whitespace-nowrap ${STATUS_PILL[category] || STATUS_PILL.processing}`}
  >
    {children}
  </span>
);

// Mirrors Order.canBeCancelled() on the backend, which is what actually
// enforces this - the button is just hidden for other states.
const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'confirmed'];

// Mirrors Order.js's payment.paymentMethod enum - friendly labels for display.
const PAYMENT_METHOD_LABELS = {
  mobile_money: 'Mobile Money',
  cash: 'Cash',
};
import toast from 'react-hot-toast';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import socketService from '../services/socket';

// Helper to create beautiful, inline SVG icons for Leaflet
const createMarkerIcon = (color, svgPath) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        border: 3px solid #FAF3E4;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        ${svgPath}
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

const restaurantSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 0v1a3 3 0 0 0 6 0v-1m0 0v1a3 3 0 0 0 6 0v-1"/><path d="M4 21V10m16 11V10"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>`;
const customerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const riderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6h1a2 2 0 0 1 2 2v2"/><path d="M12 17.5V14l-3-3-3 1"/><path d="m14 17.5-1.5-4h-3"/></svg>`;

const vendorIcon = createMarkerIcon('#0F3D2E', restaurantSvg);
const homeIcon = createMarkerIcon('#17150F', customerSvg);
const deliveryIcon = createMarkerIcon('#E8552F', riderSvg);

// Component to dynamically fit map bounds to pickup, dropoff, and rider locations
const ChangeMapBounds = ({ pickup, dropoff, rider }) => {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (pickup) points.push(pickup);
    if (dropoff) points.push(dropoff);
    if (rider) points.push([rider.lat, rider.lng]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pickup, dropoff, rider, map]);
  return null;
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [myOrders, setMyOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [mobileStatusFilter, setMobileStatusFilter] = useState('processing');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('Delivery');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const itemsPerPage = 5;

  const [orderDetails, setOrderDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [riderLocation, setRiderLocation] = useState(null);

  const [copiedText, setCopiedText] = useState('');
  const [reviewedOrderIds, setReviewedOrderIds] = useState(() => new Set());
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);

  useEffect(() => {
    reviewService
      .getMyReviews()
      .then((reviews) => {
        setReviewedOrderIds(new Set(reviews.map((r) => String(r.order?._id || r.order))));
      })
      .catch(() => {
        // Non-critical: worst case the review button shows and the backend
        // rejects a duplicate with a clear message.
      });
  }, []);

  // Pay for an unpaid order. Orders from the same checkout (one per vendor)
  // are paid together with a single prompt.
  const handleCompletePayment = (order) => {
    const unpaidSiblings = order.checkoutGroup
      ? myOrders.filter(
          (o) =>
            String(o.checkoutGroup) === String(order.checkoutGroup) &&
            o.rawStatus === 'pending_payment'
        )
      : [order];
    setSelectedOrder(null);
    setPaymentTarget({
      ...(order.checkoutGroup ? { checkoutId: order.checkoutGroup } : { orderId: order.orderId }),
      orderIds: unpaidSiblings.map((o) => o.orderId),
      total: unpaidSiblings.reduce((sum, o) => sum + (o.amount || 0), 0),
    });
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await orderService.cancelOrder(order.orderId);
      toast.success(
        order.rawStatus === 'pending_payment'
          ? 'Order cancelled'
          : 'Order cancelled. Any payment you made will be refunded.'
      );
      setSelectedOrder(null);
      await fetchMyOrders();
    } catch (error) {
      toast.error(error.message || 'Could not cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (order) => {
    if (reviewForm.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        order: order.orderId,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim() || undefined,
      });
      setReviewedOrderIds((prev) => new Set(prev).add(String(order.orderId)));
      setReviewForm({ rating: 0, comment: '' });
      toast.success('Thanks for your review!');
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    toast.success(`${type === 'code' ? 'Pickup code' : 'Store address'} copied to clipboard!`);
    setTimeout(() => {
      setCopiedText('');
    }, 2000);
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setOrderDetails(null);
    setReviewForm({ rating: 0, comment: '' });
    setFetchingDetails(true);
    try {
      const data = await orderService.getOrderById(order.orderId);
      setOrderDetails(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load live delivery tracking information.');
    } finally {
      setFetchingDetails(false);
    }
  };

  const isValidCoords = (coords) => {
    return Array.isArray(coords) && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0;
  };

  const getPickupCoords = () => {
    if (orderDetails?.delivery?.pickupLocation?.location?.coordinates) {
      const coords = orderDetails.delivery.pickupLocation.location.coordinates;
      if (isValidCoords(coords)) return [coords[1], coords[0]];
    }
    if (orderDetails?.business?.location?.coordinates) {
      const coords = orderDetails.business.location.coordinates;
      if (isValidCoords(coords)) return [coords[1], coords[0]];
    }
    return null;
  };

  const getDropoffCoords = () => {
    if (orderDetails?.delivery?.dropoffLocation?.location?.coordinates) {
      const coords = orderDetails.delivery.dropoffLocation.location.coordinates;
      if (isValidCoords(coords)) return [coords[1], coords[0]];
    }
    if (orderDetails?.deliveryDetails?.address?.location?.coordinates) {
      const coords = orderDetails.deliveryDetails.address.location.coordinates;
      if (isValidCoords(coords)) return [coords[1], coords[0]];
    }
    return null;
  };

  // Connection management for socket
  useEffect(() => {
    if (selectedOrder && selectedOrder.type === 'Delivery' && orderDetails) {
      const socket = socketService.connect();
      if (socket) {
        socketService.trackOrder(selectedOrder.orderId);

        if (orderDetails.delivery?.currentLocation?.coordinates) {
          const [lng, lat] = orderDetails.delivery.currentLocation.coordinates;
          if (lat !== 0 && lng !== 0) {
            setRiderLocation({ lat, lng });
          }
        } else {
          setRiderLocation(null);
        }

        const handleLocationUpdate = (data) => {
          console.log('Rider location updated in Web client:', data);
          if (data.lat && data.lng) {
            setRiderLocation({ lat: data.lat, lng: data.lng });
          }
        };

        socketService.on('location_update', handleLocationUpdate);

        return () => {
          socketService.off('location_update', handleLocationUpdate);
        };
      }
    } else {
      setRiderLocation(null);
    }
  }, [selectedOrder, orderDetails]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Transform backend order format to frontend format
  const transformOrder = (order) => {
    return {
      _id: order.orderNumber || order._id,
      orderId: order._id,
      rawStatus: order.status,
      checkoutGroup: order.checkoutGroup,
      rawPaymentMethod: order.payment?.paymentMethod,
      vendor: order.business?.name || 'Unknown Vendor',
      vendorId: order.business?._id,
      status:
        order.status?.charAt(0).toUpperCase() + order.status?.slice(1).replace(/_/g, ' ') ||
        'Pending',
      amount: order.pricing?.total || 0,
      type: order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup',
      order_type: order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup',
      createdAt: order.createdAt,
      // Was reading order.payment?.method (not a real field - the schema
      // calls it paymentMethod) and order.payment?.status (also not real -
      // it's paymentStatus), so this always fell back to the hardcoded
      // defaults regardless of the real order: every order showed "COD" and
      // "Unpaid" even after a real payment completed (found during the
      // 2026-09-26 E2E pass - a real MTN MoMo payment still showed as COD).
      paymentMethod:
        PAYMENT_METHOD_LABELS[order.payment?.paymentMethod] ||
        order.payment?.paymentMethod ||
        'Cash',
      isPaid: order.payment?.paymentStatus === 'completed',
      items:
        order.items?.map((item) => ({
          quantity: item.quantity,
          product: {
            _id: item.listing?._id || item.listing || item.productId || order.listing?._id,
            name: item.title || item.name || order.listing?.title || 'Product',
            image: order.listing?.photos || ['/placeholder-food.jpg'],
            offerPrice: item.unitPrice || 0,
          },
        })) || [],
      pricing: order.pricing || null,
    };
  };

  const fetchMyOrders = async (options = {}) => {
    const { isMounted = () => true } = options;
    setLoading(true);
    try {
      const response = await orderService.getOrders({ role: 'consumer' });
      if (!isMounted()) return;
      const orders = (response.orders || []).map(transformOrder);
      setMyOrders(orders);
      setFilteredOrders(orders);
    } catch (error) {
      if (!isMounted()) return;
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
      setMyOrders([]);
      setFilteredOrders([]);
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchMyOrders({ isMounted: () => isMounted });
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to categorize status
  const getStatusCategory = (statusText) => {
    if (!statusText) return 'processing';
    const s = statusText.toLowerCase();
    if (s.includes('completed') || s.includes('delivered')) return 'completed';
    if (s.includes('cancelled')) return 'cancelled';
    if (s.includes('failed')) return 'failed';
    return 'processing'; // pending_payment, paid, confirmed, ready_for_pickup, out_for_delivery, etc.
  };

  // Apply mobile filters for mobile view
  useEffect(() => {
    if (window.innerWidth < 768) {
      const filtered = myOrders.filter((order) => {
        const cat = getStatusCategory(order.status);
        const matchesStatus =
          mobileStatusFilter === 'failed'
            ? cat === 'cancelled' || cat === 'failed'
            : cat === mobileStatusFilter;
        return matchesStatus && order.type === selectedDeliveryType;
      });
      setFilteredOrders(filtered);
    }
  }, [myOrders, mobileStatusFilter, selectedDeliveryType]);

  // Handle mobile status filter change
  const handleMobileStatusChange = (status) => {
    setMobileStatusFilter(status);
    setCurrentPage(1);
  };

  // Handle mobile delivery type change
  const handleDeliveryTypeChange = (type) => {
    setSelectedDeliveryType(type);
    setCurrentPage(1);
  };

  // Get unique vendors from orders
  const vendors = ['all', ...new Set(myOrders.map((order) => order.vendor))];

  // Filter orders
  const handleFilterOrders = () => {
    let filtered = [...myOrders];

    if (selectedVendor !== 'all') {
      filtered = filtered.filter((order) => order.vendor === selectedVendor);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((order) => {
        const cat = getStatusCategory(order.status);
        return cat === selectedStatus.toLowerCase();
      });
    }

    if (startDate && endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
      });
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString, includeTime = false) => {
    const date = new Date(dateString);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    if (includeTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${month} ${day}, ${year} at ${hours}:${minutes}`;
    }
    return `${month} ${day}, ${year}`;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Get empty state message based on filter
  const getEmptyStateMessage = () => {
    const statusText = mobileStatusFilter.charAt(0).toUpperCase() + mobileStatusFilter.slice(1);
    return `Oops! There is no ${statusText.toLowerCase()} order. Start browsing and place your order, and your history will show up here!`;
  };

  return (
    <>
      <div className="bg-fufu min-h-screen pt-[72px]">
        <PageNavbar />
        <PageHero
          eyebrow="Your account / Order history"
          title="My orders"
          art="bag"
          intro="Your past and current rescues. Thank you for helping reduce food waste."
        />
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-char/10">
              <BrandLoader className="w-10 text-moringa mb-4" />
              <p className="eyebrow text-moringa-muted">Fetching your receipts</p>
            </div>
          ) : (
            <>
              {/* Mobile Delivery Type Filter */}
              <div className="md:hidden mb-3 grid grid-cols-2 border-2 border-moringa">
                {['Delivery', 'Pickup'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleDeliveryTypeChange(type)}
                    aria-pressed={selectedDeliveryType === type}
                    className={`h-12 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      selectedDeliveryType === type
                        ? 'bg-moringa text-yellow'
                        : 'bg-white text-moringa hover:bg-mint'
                    }`}
                  >
                    {type === 'Delivery' ? (
                      <Bike className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Store className="w-4 h-4" aria-hidden="true" />
                    )}
                    {type}
                  </button>
                ))}
              </div>

              {/* Mobile Status Filter Tabs */}
              <div className="md:hidden mb-6 grid grid-cols-3 border-2 border-moringa">
                {[
                  ['processing', 'Processing'],
                  ['completed', 'Completed'],
                  ['failed', 'Failed'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => handleMobileStatusChange(value)}
                    aria-pressed={mobileStatusFilter === value}
                    className={`h-11 text-[13px] font-bold cursor-pointer transition-colors border-r-2 border-moringa last:border-r-0 ${
                      mobileStatusFilter === value
                        ? 'bg-yellow text-moringa'
                        : 'bg-white text-moringa hover:bg-mint'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Desktop Filters */}
              <div className="hidden md:block bg-white border border-char/10 p-6 mb-6">
                <p className="eyebrow text-moringa mb-4">Filter orders</p>
                <div className="grid grid-cols-5 gap-3 items-end">
                  {/* Vendor Filter */}
                  <label className="flex flex-col">
                    <span className="eyebrow text-[11px] text-moringa-muted mb-2">Vendor</span>
                    <span className="relative">
                      <Utensils
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                        aria-hidden="true"
                      />
                      <select
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className={FIELD}
                      >
                        {vendors.map((vendor, index) => (
                          <option key={index} value={vendor}>
                            {vendor === 'all' ? 'All vendors' : vendor}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>

                  {/* Status Filter */}
                  <label className="flex flex-col">
                    <span className="eyebrow text-[11px] text-moringa-muted mb-2">Status</span>
                    <span className="relative">
                      <Truck
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                        aria-hidden="true"
                      />
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className={FIELD}
                      >
                        <option value="all">All statuses</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                      </select>
                    </span>
                  </label>

                  {/* Date Range Filter */}
                  <label className="flex flex-col">
                    <span className="eyebrow text-[11px] text-moringa-muted mb-2">Start date</span>
                    <span className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={FIELD}
                      />
                    </span>
                  </label>

                  <label className="flex flex-col">
                    <span className="eyebrow text-[11px] text-moringa-muted mb-2">End date</span>
                    <span className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={FIELD}
                      />
                    </span>
                  </label>

                  {/* Filter Button */}
                  <button
                    onClick={handleFilterOrders}
                    className="h-11 px-5 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer"
                  >
                    Filter orders
                  </button>
                </div>
              </div>

              {/* Orders List */}
              {currentOrders.length === 0 ? (
                <div className="grid md:grid-cols-[1fr_360px] border border-char/10 overflow-hidden">
                  <div className="bg-yellow text-moringa px-6 py-12 md:p-12 flex flex-col items-start justify-center">
                    <p className="eyebrow">Nothing here yet</p>
                    <h2 className="display text-[44px] md:text-[64px] mt-3">Nothing cooking yet</h2>
                    <p className="mt-3 max-w-md font-medium">{getEmptyStateMessage()}</p>
                    <button
                      onClick={() => navigate('/shop')}
                      className="mt-6 h-12 px-6 bg-moringa text-fufu font-semibold hover:bg-moringa-dark transition-colors cursor-pointer"
                    >
                      Start shopping
                    </button>
                  </div>
                  <div className="relative hidden md:block bg-moringa min-h-[280px]">
                    <Bag className="absolute w-[240px] -right-10 -bottom-12" rotate={-12} />
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-white border border-char/10">
                    <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-moringa text-fufu rounded-t-lg">
                      {['Order ID', 'Date', 'Vendor', 'Total', 'Status'].map((h) => (
                        <div key={h} className="eyebrow text-[11px]">
                          {h}
                        </div>
                      ))}
                      <div className="eyebrow text-[11px] text-right">Action</div>
                    </div>
                    {currentOrders.map((order, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-6 gap-3 items-center px-5 py-4 text-sm border-b border-hairline last:border-b-0 hover:bg-fufu transition-colors"
                      >
                        <div className="font-mono text-[13px] font-medium text-moringa truncate">
                          {order._id}
                        </div>
                        <div className="text-moringa-muted">{formatDate(order.createdAt)}</div>
                        <div className="text-moringa font-medium truncate">{order.vendor}</div>
                        <div className="font-bold text-moringa tabular-nums">
                          RWF {order.amount.toLocaleString()}
                        </div>
                        <div>
                          <StatusPill category={getStatusCategory(order.status)}>
                            {order.status}
                          </StatusPill>
                        </div>
                        <div className="text-right">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="h-9 px-4 border-2 border-moringa text-moringa text-xs font-bold hover:bg-mint transition-colors cursor-pointer"
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Order Cards */}
                  <div className="md:hidden bg-white border border-char/10">
                    {currentOrders.map((order, index) => {
                      const firstProduct =
                        order.items?.[0]?.product || order.items?.[0]?.listing || {};
                      const productImage =
                        firstProduct.image?.[0] || firstProduct.images?.[0] || '/placeholder.png';
                      const productName = firstProduct.name || firstProduct.title || 'Product';
                      return (
                        <div
                          key={index}
                          onClick={() => handleViewDetails(order)}
                          className="flex gap-4 p-4 border-b border-hairline last:border-b-0 active:bg-mint cursor-pointer"
                        >
                          <img
                            src={productImage}
                            alt={productName}
                            className="w-20 h-20 object-cover shrink-0 bg-fufu-dim"
                          />
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-mono text-[11px] text-moringa-muted truncate">
                                {order._id}
                              </p>
                              <StatusPill category={getStatusCategory(order.status)}>
                                {order.status}
                              </StatusPill>
                            </div>
                            <p className="text-sm font-bold text-moringa line-clamp-2 mt-1">
                              {productName}
                            </p>
                            <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                              <p className="text-xs text-moringa-muted">
                                {formatDate(order.createdAt)} / {order.order_type}
                              </p>
                              <p className="display text-[20px] text-moringa whitespace-nowrap">
                                <span className="text-[0.6em] mr-1">RWF</span>
                                {order.amount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-6 flex-wrap gap-4">
                    <p className="eyebrow text-[11px] text-moringa-muted">
                      Showing {indexOfFirstItem + 1} to{' '}
                      {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length}{' '}
                      results
                    </p>
                    <div className="flex">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 h-11 px-4 border-2 border-moringa text-sm font-bold text-moringa bg-white hover:bg-mint transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 h-11 px-4 border-2 border-l-0 border-moringa text-sm font-bold text-moringa bg-white hover:bg-mint transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-char/60 z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="bg-fufu w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto sm:rounded-lg">
              <div className="sticky top-0 z-20 bg-moringa text-fufu px-5 sm:px-6 py-4 flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <p className="eyebrow text-yellow text-[11px]">Order details</p>
                  <h3 className="display text-[28px] sm:text-[34px] mt-1 truncate">
                    {selectedOrder._id}
                  </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="h-10 w-10 flex items-center justify-center text-fufu hover:bg-moringa-2 transition-colors cursor-pointer"
                    title="Delete Order"
                    aria-label="Delete order"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="h-10 w-10 flex items-center justify-center bg-yellow text-moringa hover:bg-yellow-dark transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                {/* Complete an unpaid mobile-money order */}
                {selectedOrder.rawStatus === 'pending_payment' &&
                  selectedOrder.rawPaymentMethod !== 'cash' && (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-yellow text-moringa p-4 rounded-lg">
                      <p className="text-sm font-semibold">
                        This order is waiting for payment. The vendor sees it once it's paid.
                      </p>
                      <button
                        onClick={() => handleCompletePayment(selectedOrder)}
                        className="shrink-0 h-11 px-5 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer"
                      >
                        Complete payment
                      </button>
                    </div>
                  )}

                {/* Cancel order */}
                {CANCELLABLE_STATUSES.includes(selectedOrder.rawStatus) && (
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-peach text-clay p-4 rounded-lg">
                    <p className="text-sm font-semibold">
                      Changed your mind? You can cancel until the vendor starts preparing it.
                    </p>
                    <button
                      onClick={() => handleCancelOrder(selectedOrder)}
                      disabled={cancelling}
                      className="shrink-0 h-11 px-5 border-2 border-clay text-clay text-sm font-bold hover:bg-clay hover:text-fufu transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  </div>
                )}

                {/* Leave a review */}
                {selectedOrder.rawStatus === 'completed' &&
                  (reviewedOrderIds.has(String(selectedOrder.orderId)) ? (
                    <div className="mb-4 flex items-center gap-2 bg-lime text-moringa p-4 text-sm font-semibold rounded-lg">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      You reviewed this order. Thank you!
                    </div>
                  ) : (
                    <div className="mb-4 bg-white border border-char/10 p-4 sm:p-5">
                      <h4 className="eyebrow text-moringa mb-3">How was your order?</h4>
                      <div className="mb-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                            className="cursor-pointer"
                          >
                            <Star
                              className="h-7 w-7"
                              fill={reviewForm.rating >= star ? '#FFC531' : 'none'}
                              stroke={reviewForm.rating >= star ? '#0F3D2E' : '#4F625A'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                        maxLength={1000}
                        rows={3}
                        placeholder="Tell others about the food and the vendor (optional)"
                        className="mb-3 w-full border-2 border-moringa bg-white p-3 text-sm text-moringa placeholder:text-moringa-muted focus:outline-none focus:bg-fufu"
                      />
                      <button
                        onClick={() => handleSubmitReview(selectedOrder)}
                        disabled={submittingReview}
                        className="h-11 px-5 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingReview ? 'Submitting…' : 'Submit review'}
                      </button>
                    </div>
                  ))}

                {/* Order Info */}
                <section className="mb-4 bg-white border border-char/10">
                  <h4 className="eyebrow text-moringa px-4 sm:px-5 pt-4 sm:pt-5">
                    Order information
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:p-5 text-sm">
                    {[
                      ['Order ID', selectedOrder._id],
                      ['Date and time', formatDate(selectedOrder.createdAt, true)],
                      [
                        'Status',
                        <StatusPill key="s" category={getStatusCategory(selectedOrder.status)}>
                          {selectedOrder.status}
                        </StatusPill>,
                      ],
                      ['Order type', selectedOrder.order_type],
                      ['Delivery type', selectedOrder.type],
                      ['Vendor', selectedOrder.vendor],
                      ['Payment method', selectedOrder.paymentMethod],
                      ['Payment status', selectedOrder.isPaid ? 'Paid' : 'Unpaid'],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="eyebrow text-[10px] text-moringa-muted">{label}</dt>
                        <dd className="mt-1 font-semibold text-moringa break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Products */}
                <section className="mb-4 bg-white border border-char/10">
                  <h4 className="eyebrow text-moringa px-4 sm:px-5 pt-4 sm:pt-5 pb-2">Products</h4>
                  <ul>
                    {selectedOrder.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-4 px-4 sm:px-5 py-3 border-t border-hairline"
                      >
                        <img
                          src={item.product.image[0]}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover bg-fufu-dim shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-moringa">{item.product.name}</p>
                          <p className="text-sm text-moringa-muted">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-moringa tabular-nums whitespace-nowrap">
                          RWF {(item.product.offerPrice * item.quantity).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Order Summary */}
                <section className="bg-white border border-char/10 p-4 sm:p-5">
                  <h4 className="eyebrow text-moringa mb-3">Order summary</h4>
                  <div className="space-y-2 text-sm tabular-nums">
                    <div className="flex justify-between">
                      <p className="text-moringa-muted">Subtotal</p>
                      <p className="text-moringa">
                        RWF{' '}
                        {selectedOrder.items
                          .reduce((sum, item) => sum + item.product.offerPrice * item.quantity, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    {selectedOrder.type === 'Delivery' &&
                      (selectedOrder.pricing?.deliveryFee || 0) > 0 && (
                        <div className="flex justify-between">
                          <p className="text-moringa-muted">Delivery charges</p>
                          <p className="text-moringa">
                            RWF {selectedOrder.pricing.deliveryFee.toLocaleString()}
                          </p>
                        </div>
                      )}
                    {/* "Container Charge: RWF 500" used to render here unconditionally
                        on every order - there's no such fee anywhere in the backend's
                        pricing model (Order.js's pricing has no containerCharge field),
                        and it was never included in the real Total below. Found during
                        the 2026-09-26 E2E pass; removed rather than wired up, since
                        there's no real fee to wire it to. */}
                    <div className="flex justify-between items-end pt-3 mt-2 border-t-2 border-moringa">
                      <p className="eyebrow text-moringa">Total</p>
                      <p className="display text-[32px] text-moringa">
                        <span className="text-[0.55em] mr-1">RWF</span>
                        {selectedOrder.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </section>

                {selectedOrder.type === 'Pickup' && (
                  <section className="mt-6">
                    <h4 className="eyebrow text-moringa mb-3 flex items-center gap-2">
                      <Store className="w-4 h-4" aria-hidden="true" />
                      Pickup information
                    </h4>

                    {fetchingDetails ? (
                      <div className="flex items-center justify-center py-8 bg-white border border-char/10">
                        <Loader2
                          className="w-6 h-6 animate-spin text-moringa mr-2"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-moringa-muted">
                          Loading pickup details...
                        </span>
                      </div>
                    ) : orderDetails ? (
                      <div className="space-y-4">
                        {/* Pickup Code & QR Code Pass */}
                        <div className="bg-lime text-moringa p-5 flex flex-col sm:flex-row items-center gap-5 text-left rounded-lg">
                          {/* QR Code */}
                          <div className="bg-white p-2.5 shrink-0 rounded-md">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${orderDetails.pickupDetails?.pickupCode || 'N/A'}`}
                              alt="Pickup QR Code"
                              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                            />
                          </div>

                          {/* Code details & Copy */}
                          <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                            <p className="eyebrow text-[11px]">Your store pickup pass</p>
                            <div>
                              <p className="eyebrow text-[10px] opacity-80 mt-1">Pickup code</p>
                              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                <span className="display text-[40px] sm:text-[48px] tracking-widest">
                                  {orderDetails.pickupDetails?.pickupCode || 'N/A'}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopy(orderDetails.pickupDetails?.pickupCode || '', 'code')
                                  }
                                  className="h-9 w-9 flex items-center justify-center border-2 border-moringa hover:bg-moringa hover:text-lime transition-colors cursor-pointer"
                                  title="Copy Code"
                                >
                                  {copiedText === 'code' ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed font-medium">
                              Show either this QR code or the code digits to the vendor at the
                              pickup counter.
                            </p>
                          </div>
                        </div>

                        {/* Store Info Card */}
                        <div className="bg-white border border-char/10 text-left">
                          <div className="px-4 py-3 border-b border-hairline flex justify-between items-center gap-3">
                            <h5 className="eyebrow text-[11px] text-moringa">
                              Store info and directions
                            </h5>
                            {orderDetails.business?.contact?.phone && (
                              <a
                                href={`tel:${orderDetails.business.contact.phone}`}
                                className="flex items-center gap-1.5 h-9 px-3 text-xs font-bold border-2 border-moringa text-moringa hover:bg-mint transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                                Call store
                              </a>
                            )}
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Name and Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="eyebrow text-[10px] text-moringa-muted block">
                                  Store name
                                </span>
                                <p className="font-bold text-moringa">
                                  {orderDetails.business?.name || 'N/A'}
                                </p>
                              </div>
                              {orderDetails.pickupDetails?.pickupTime && (
                                <div className="space-y-1">
                                  <span className="eyebrow text-[10px] text-moringa-muted block">
                                    Pickup window
                                  </span>
                                  <p className="font-semibold text-moringa">
                                    {orderDetails.pickupDetails.pickupTime}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="border-t border-hairline pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1 max-w-md">
                                <span className="eyebrow text-[10px] text-moringa-muted block">
                                  Store address
                                </span>
                                <div className="flex items-start gap-1">
                                  <p className="font-medium text-moringa text-sm">
                                    {typeof orderDetails.business?.address === 'string'
                                      ? orderDetails.business.address
                                      : orderDetails.business?.address
                                        ? `${orderDetails.business.address.street || ''}, ${orderDetails.business.address.city || ''}`
                                        : 'N/A'}
                                  </p>
                                  {orderDetails.business?.address && (
                                    <button
                                      onClick={() =>
                                        handleCopy(
                                          typeof orderDetails.business.address === 'string'
                                            ? orderDetails.business.address
                                            : `${orderDetails.business.address.street || ''}, ${orderDetails.business.address.city || ''}`,
                                          'address'
                                        )
                                      }
                                      className="p-1 text-moringa-muted hover:text-moringa hover:bg-mint transition-colors shrink-0 cursor-pointer"
                                      title="Copy Address"
                                    >
                                      {copiedText === 'address' ? (
                                        <Check className="w-3.5 h-3.5 text-moringa" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {getPickupCoords() && (
                                <div className="flex">
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${getPickupCoords()[0]},${getPickupCoords()[1]}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 h-10 px-4 text-xs font-bold bg-moringa text-fufu hover:bg-moringa-dark transition-colors"
                                  >
                                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                                    Google Maps
                                  </a>
                                  <a
                                    href={`https://waze.com/ul?ll=${getPickupCoords()[0]},${getPickupCoords()[1]}&navigate=yes`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center h-10 px-4 text-xs font-bold border-2 border-l-0 border-moringa text-moringa hover:bg-mint transition-colors"
                                  >
                                    Waze
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Store Location Map */}
                        {getPickupCoords() && (
                          <div className="space-y-2 text-left">
                            <span className="eyebrow text-[11px] text-moringa-muted block">
                              Store location map
                            </span>
                            <div className="w-full h-60 overflow-hidden relative border-2 border-moringa z-10">
                              <MapContainer
                                center={getPickupCoords()}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={false}
                              >
                                <TileLayer
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={getPickupCoords()} icon={vendorIcon}>
                                  <Popup>
                                    <div className="text-xs font-semibold flex items-center gap-1.5">
                                      <Store className="w-3.5 h-3.5" aria-hidden="true" />
                                      {orderDetails.business?.name || 'Store'}
                                    </div>
                                  </Popup>
                                </Marker>
                              </MapContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-clay bg-peach p-4 font-semibold rounded-lg">
                        Failed to load pickup information.
                      </p>
                    )}
                  </section>
                )}

                {selectedOrder.type === 'Delivery' && (
                  <section className="mt-6">
                    <h4 className="eyebrow text-moringa mb-3 flex items-center gap-2">
                      <Bike className="w-4 h-4" aria-hidden="true" />
                      Delivery information
                    </h4>

                    {fetchingDetails ? (
                      <div className="flex items-center justify-center py-8 bg-white border border-char/10">
                        <Loader2
                          className="w-6 h-6 animate-spin text-moringa mr-2"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-moringa-muted">
                          Loading live tracking details...
                        </span>
                      </div>
                    ) : orderDetails ? (
                      <div className="space-y-4">
                        {/* Rider details card if assigned */}
                        {orderDetails.delivery?.rider ? (
                          <div className="bg-moringa text-fufu p-4 flex items-center justify-between gap-3 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="bg-yellow text-moringa w-11 h-11 flex items-center justify-center display text-[22px] shrink-0">
                                {orderDetails.delivery.riderName?.charAt(0) || 'R'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm">
                                  {orderDetails.delivery.riderName || 'Assigned Rider'}
                                </p>
                                <p className="text-xs opacity-80">
                                  {orderDetails.delivery.status === 'assigned' &&
                                    'Rider heading to restaurant'}
                                  {orderDetails.delivery.status === 'picked_up' &&
                                    'Rider picked up order'}
                                  {orderDetails.delivery.status === 'in_transit' &&
                                    'Rider on the way to you!'}
                                  {orderDetails.delivery.status === 'delivered' &&
                                    'Order delivered successfully'}
                                </p>
                              </div>
                            </div>
                            {orderDetails.delivery.riderPhone && (
                              <a
                                href={`tel:${orderDetails.delivery.riderPhone}`}
                                className="shrink-0 flex items-center gap-1.5 h-10 px-4 bg-yellow text-moringa text-xs font-bold hover:bg-yellow-dark transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                                Call rider
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white border border-char/10 p-4 flex items-center justify-between gap-3 text-sm">
                            <span className="text-moringa-muted">
                              Assigning a delivery agent...
                            </span>
                            <span className="eyebrow text-[10px] bg-yellow text-moringa px-2.5 py-1 animate-pulse">
                              Pending
                            </span>
                          </div>
                        )}

                        {/* Address */}
                        <div className="text-sm bg-white border border-char/10 p-4">
                          <p className="eyebrow text-[10px] text-moringa-muted mb-1 flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5" aria-hidden="true" />
                            Delivery address
                          </p>
                          <p className="font-semibold text-moringa">
                            {orderDetails.delivery?.dropoffLocation?.address ||
                              (orderDetails.deliveryDetails?.address
                                ? `${orderDetails.deliveryDetails.address.street || ''}, ${orderDetails.deliveryDetails.address.city || ''}`
                                : 'N/A')}
                          </p>
                          {orderDetails.delivery?.dropoffLocation?.instructions && (
                            <p className="text-xs text-moringa-muted mt-1 italic">
                              Instructions: "{orderDetails.delivery.dropoffLocation.instructions}"
                            </p>
                          )}
                        </div>

                        {/* Real-time Tracking Map */}
                        {getPickupCoords() && getDropoffCoords() ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center gap-3">
                              <span className="eyebrow text-[11px] text-moringa">
                                Live delivery route
                              </span>
                              {riderLocation && (
                                <span className="eyebrow text-[10px] flex items-center gap-1.5 bg-pepper text-char px-2 py-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-char animate-ping"></span>
                                  Live GPS connected
                                </span>
                              )}
                            </div>
                            <div className="w-full h-80 overflow-hidden relative border-2 border-moringa z-10">
                              <MapContainer
                                center={getPickupCoords()}
                                zoom={14}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={false}
                              >
                                <TileLayer
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {/* Pickup/Restaurant Marker */}
                                <Marker position={getPickupCoords()} icon={vendorIcon}>
                                  <Popup>
                                    <div className="text-xs font-semibold flex items-center gap-1.5">
                                      <Store className="w-3.5 h-3.5" aria-hidden="true" />
                                      {orderDetails.delivery?.pickupLocation?.businessName ||
                                        orderDetails.business?.name ||
                                        'Restaurant'}
                                    </div>
                                  </Popup>
                                </Marker>

                                {/* Dropoff/Customer Marker */}
                                <Marker position={getDropoffCoords()} icon={homeIcon}>
                                  <Popup>
                                    <div className="text-xs font-semibold flex items-center gap-1.5">
                                      <Home className="w-3.5 h-3.5" aria-hidden="true" />
                                      Delivery destination
                                    </div>
                                  </Popup>
                                </Marker>

                                {/* Rider Live Location Marker */}
                                {riderLocation && (
                                  <Marker
                                    position={[riderLocation.lat, riderLocation.lng]}
                                    icon={deliveryIcon}
                                  >
                                    <Popup>
                                      <div className="text-xs font-semibold flex items-center gap-1.5">
                                        <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                                        Rider (live)
                                      </div>
                                    </Popup>
                                  </Marker>
                                )}

                                <ChangeMapBounds
                                  pickup={getPickupCoords()}
                                  dropoff={getDropoffCoords()}
                                  rider={riderLocation}
                                />
                              </MapContainer>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow text-moringa text-xs font-semibold rounded-lg">
                            Location coordinates are not available for this delivery. Live map
                            tracking is disabled.
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-clay bg-peach p-4 font-semibold rounded-lg">
                        Failed to load detailed delivery information.
                      </p>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {paymentTarget && (
        <MobileMoneyPaymentModal
          target={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onPaid={() => {
            setPaymentTarget(null);
            fetchMyOrders();
          }}
        />
      )}

      <Footer />
    </>
  );
};

export default MyOrders;
