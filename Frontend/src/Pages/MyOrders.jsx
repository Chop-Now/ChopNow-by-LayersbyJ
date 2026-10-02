import { assets } from '../assets/assets';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderService, reviewService } from '../services';
import MobileMoneyPaymentModal from '../Components/payments/MobileMoneyPaymentModal';

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
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
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

const vendorIcon = createMarkerIcon('#16a34a', restaurantSvg);
const homeIcon = createMarkerIcon('#2563eb', customerSvg);
const deliveryIcon = createMarkerIcon('#ea580c', riderSvg);

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
      <div className="bg-white min-h-screen pt-20">
        <PageNavbar />
        <div className="mt-10 pb-16 px-6 md:px-16 lg:px-24 xl:px-32">
          <div className="flex flex-col items-start mb-8 mt-12">
            <h2 className="text-2xl font-medium">Order History</h2>
            <p className="text-moringa-muted">
              Review your past and current orders. Thank you for helping reduce food waste!
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-4" />
              <p className="text-moringa-muted">Loading your orders...</p>
            </div>
          ) : (
            <>
              {/* Mobile Delivery Type Filter */}
              <div className="md:hidden mb-4">
                <div className="flex gap-2 relative">
                  {/* Sliding background */}
                  <div
                    className={`absolute top-0 bottom-0 w-[calc(50%-4px)] bg-green-600 rounded-md transition-transform duration-300 ease-in-out ${
                      selectedDeliveryType === 'Delivery'
                        ? 'transform translate-x-0'
                        : 'transform translate-x-[calc(100%+8px)]'
                    }`}
                  />
                  <button
                    onClick={() => handleDeliveryTypeChange('Delivery')}
                    className={`flex-1 py-3 px-6 rounded-md text-sm font-medium z-10 transition-colors duration-300 border ${
                      selectedDeliveryType === 'Delivery'
                        ? 'text-white border-green-600'
                        : 'text-moringa border-moringa/25 bg-white'
                    }`}
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => handleDeliveryTypeChange('Pickup')}
                    className={`flex-1 py-3 px-6 rounded-md text-sm font-medium z-10 transition-colors duration-300 border ${
                      selectedDeliveryType === 'Pickup'
                        ? 'text-white border-green-600'
                        : 'text-moringa border-moringa/25 bg-white'
                    }`}
                  >
                    Pickup
                  </button>
                </div>
              </div>

              {/* Mobile Status Filter Tabs */}
              <div className="md:hidden mb-6">
                <div className="bg-fufu-dim rounded-full p-1 flex relative">
                  {/* Sliding background */}
                  <div
                    className={`absolute top-1 bottom-1 w-1/3 bg-green-600 rounded-full transition-transform duration-300 ease-in-out ${
                      mobileStatusFilter === 'processing'
                        ? 'transform translate-x-0'
                        : mobileStatusFilter === 'completed'
                          ? 'transform translate-x-full'
                          : 'transform translate-x-[200%]'
                    }`}
                  />
                  <button
                    onClick={() => handleMobileStatusChange('processing')}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-medium z-10 transition-colors duration-300 ${
                      mobileStatusFilter === 'processing' ? 'text-white' : 'text-moringa'
                    }`}
                  >
                    Processing
                  </button>
                  <button
                    onClick={() => handleMobileStatusChange('completed')}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-medium z-10 transition-colors duration-300 ${
                      mobileStatusFilter === 'completed' ? 'text-white' : 'text-moringa'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => handleMobileStatusChange('failed')}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-medium z-10 transition-colors duration-300 ${
                      mobileStatusFilter === 'failed' ? 'text-white' : 'text-moringa'
                    }`}
                  >
                    Failed
                  </button>
                </div>
              </div>

              {/* Desktop Filters */}
              <div className="hidden md:block bg-white border border-hairline rounded-lg p-6 mb-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Vendor Filter */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1.5">Search by Vendor</label>
                    <div className="relative">
                      <Utensils className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-moringa-muted/70" />
                      <select
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="border border-moringa/25 rounded-md pl-9 pr-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {vendors.map((vendor, index) => (
                          <option key={index} value={vendor}>
                            {vendor === 'all' ? 'All Vendors' : vendor}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1.5">Status</label>
                    <div className="relative">
                      <Truck className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-moringa-muted/70" />
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-moringa/25 rounded-md pl-9 pr-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1.5">Start Date</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-moringa-muted/70" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-moringa/25 rounded-md pl-9 pr-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1.5">End Date</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-moringa-muted/70" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border border-moringa/25 rounded-md pl-9 pr-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Filter Button */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1.5 opacity-0">Action</label>
                    <button
                      onClick={handleFilterOrders}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors h-full cursor-pointer"
                    >
                      Filter Orders
                    </button>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              {currentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img
                    src={assets.oops}
                    alt="No orders"
                    className="w-48 h-48 mb-6 object-contain"
                  />
                  <p className="text-moringa-muted max-w-md mb-6 px-4">{getEmptyStateMessage()}</p>
                  <button
                    onClick={() => navigate('/shop')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table Header */}
                  <div className="hidden md:block border border-hairline rounded-t-lg p-3 mb-1 bg-white">
                    <div className="grid grid-cols-6 gap-3 text-xs font-semibold text-moringa">
                      <div>Order ID</div>
                      <div>Date</div>
                      <div>Vendor</div>
                      <div>Total</div>
                      <div>Status</div>
                      <div className="text-right">Action</div>
                    </div>
                  </div>

                  {/* Desktop Table Rows */}
                  <div className="hidden md:block">
                    {currentOrders.map((order, index) => (
                      <div key={index} className="border border-hairline border-t-0 p-3 bg-white">
                        <div className="grid grid-cols-6 gap-3 items-center text-xs">
                          <div className="font-semibold text-moringa">{order._id}</div>
                          <div className="text-moringa-muted">{formatDate(order.createdAt)}</div>
                          <div className="text-moringa-muted">{order.vendor}</div>
                          <div className="font-semibold text-moringa">
                            RWF {order.amount.toLocaleString()}
                          </div>
                          <div>
                            <span
                              className={`text-xs px-3 py-1 rounded-full ${
                                order.status === 'Completed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'Processing'
                                    ? 'bg-blue-100 text-blue-700'
                                    : order.status === 'Cancelled'
                                      ? 'bg-fufu-dim text-moringa'
                                      : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <button
                              onClick={() => handleViewDetails(order)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium underline cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Order Cards */}
                  <div className="md:hidden space-y-3">
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
                          className="border border-hairline rounded-lg p-4 bg-white active:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-12 h-12 rounded-full object-cover shrink-0"
                            />
                            <p className="text-sm font-medium text-moringa line-clamp-2">
                              {productName}
                            </p>
                          </div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-moringa mb-2">{order._id}</p>
                              <p className="text-xs text-moringa-muted">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-sm font-semibold text-moringa mb-2">
                                RWF {order.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-moringa-muted">{order.order_type}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-8 flex-wrap gap-4">
                    <p className="text-sm text-moringa-muted">
                      Showing {indexOfFirstItem + 1} to{' '}
                      {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length}{' '}
                      results
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className={`flex items-center gap-1 px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-fufu-dim text-moringa-muted/70 cursor-not-allowed'
                            : 'bg-white text-moringa hover:bg-fufu'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`flex items-center gap-1 px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                          currentPage === totalPages
                            ? 'bg-fufu-dim text-moringa-muted/70 cursor-not-allowed'
                            : 'bg-white text-moringa hover:bg-fufu'
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
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
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold">Order Details</h3>
                  <button
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete Order"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-moringa-muted hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {/* Complete an unpaid mobile-money order */}
                {selectedOrder.rawStatus === 'pending_payment' &&
                  selectedOrder.rawPaymentMethod !== 'cash' && (
                    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-moringa">
                        This order is waiting for payment. The vendor sees it once it's paid.
                      </p>
                      <button
                        onClick={() => handleCompletePayment(selectedOrder)}
                        className="shrink-0 rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-solid)' }}
                      >
                        Complete payment
                      </button>
                    </div>
                  )}

                {/* Cancel order */}
                {CANCELLABLE_STATUSES.includes(selectedOrder.rawStatus) && (
                  <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-100 bg-red-50 p-4">
                    <p className="text-sm text-moringa">
                      Changed your mind? You can cancel until the vendor starts preparing it.
                    </p>
                    <button
                      onClick={() => handleCancelOrder(selectedOrder)}
                      disabled={cancelling}
                      className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  </div>
                )}

                {/* Leave a review */}
                {selectedOrder.rawStatus === 'completed' &&
                  (reviewedOrderIds.has(String(selectedOrder.orderId)) ? (
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                      <Check className="h-4 w-4" />
                      You reviewed this order. Thank you!
                    </div>
                  ) : (
                    <div className="mb-6 rounded-lg border border-hairline p-4">
                      <h4 className="mb-2 font-semibold">How was your order?</h4>
                      <div className="mb-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                          >
                            <Star
                              className="h-7 w-7"
                              fill={reviewForm.rating >= star ? '#F59E0B' : 'none'}
                              stroke={reviewForm.rating >= star ? '#F59E0B' : '#9CA3AF'}
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
                        className="mb-3 w-full rounded-md border border-moringa/25 p-2 text-sm"
                      />
                      <button
                        onClick={() => handleSubmitReview(selectedOrder)}
                        disabled={submittingReview}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {submittingReview ? 'Submitting…' : 'Submit review'}
                      </button>
                    </div>
                  ))}

                {/* Order Info */}
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-3">Order Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-moringa-muted">Order ID</p>
                      <p className="font-medium">{selectedOrder._id}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Date & Time</p>
                      <p className="font-medium">{formatDate(selectedOrder.createdAt, true)}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Status</p>
                      <p
                        className={`font-medium ${
                          selectedOrder.status === 'Completed'
                            ? 'text-green-700'
                            : selectedOrder.status === 'Processing'
                              ? 'text-blue-700'
                              : selectedOrder.status === 'Cancelled'
                                ? 'text-moringa'
                                : 'text-red-700'
                        }`}
                      >
                        {selectedOrder.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Order Type</p>
                      <p className="font-medium">{selectedOrder.order_type}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Delivery Type</p>
                      <p className="font-medium">{selectedOrder.type}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Vendor</p>
                      <p className="font-medium">{selectedOrder.vendor}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Payment Method</p>
                      <p className="font-medium">{selectedOrder.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-moringa-muted">Payment Status</p>
                      <p className="font-medium">{selectedOrder.isPaid ? 'Paid' : 'Unpaid'}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-3">Products</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                        <img
                          src={item.product.image[0]}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-moringa-muted">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">
                          RWF {(item.product.offerPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-lg mb-3">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <p className="text-moringa-muted">Subtotal</p>
                      <p className="font-medium">
                        RWF{' '}
                        {selectedOrder.items
                          .reduce((sum, item) => sum + item.product.offerPrice * item.quantity, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    {selectedOrder.type === 'Delivery' &&
                      (selectedOrder.pricing?.deliveryFee || 0) > 0 && (
                        <div className="flex justify-between">
                          <p className="text-moringa-muted">Delivery Charges</p>
                          <p className="font-medium">
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
                    <div className="flex justify-between pt-2 border-t">
                      <p className="font-semibold text-base">Total</p>
                      <p className="font-semibold text-base">
                        RWF {selectedOrder.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedOrder.type === 'Pickup' && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="font-semibold text-lg mb-4 text-moringa font-medium">
                      Pickup Information
                    </h4>

                    {fetchingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-green-600 mr-2" />
                        <span className="text-sm text-moringa-muted">
                          Loading pickup details...
                        </span>
                      </div>
                    ) : orderDetails ? (
                      <div className="space-y-6">
                        {/* Pickup Code & QR Code Pass */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-sm text-left">
                          {/* QR Code */}
                          <div className="bg-white p-2.5 rounded-xl border border-green-100/50 shadow-sm flex-shrink-0">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${orderDetails.pickupDetails?.pickupCode || 'N/A'}`}
                              alt="Pickup QR Code"
                              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                            />
                          </div>

                          {/* Code details & Copy */}
                          <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                            <span className="text-[10px] tracking-wider font-bold text-green-700 uppercase bg-green-100/80 px-2.5 py-1 rounded-full">
                              Your Store Pickup Pass
                            </span>
                            <div>
                              <p className="text-moringa-muted font-semibold text-xs mt-1">
                                PICKUP CODE
                              </p>
                              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                <span className="text-2xl sm:text-3xl font-extrabold text-green-800 tracking-widest font-mono">
                                  {orderDetails.pickupDetails?.pickupCode || 'N/A'}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopy(orderDetails.pickupDetails?.pickupCode || '', 'code')
                                  }
                                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
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
                            <p className="text-xs text-green-800/80 leading-relaxed font-medium">
                              Show either this QR code or the code digits to the vendor at the
                              pickup counter.
                            </p>
                          </div>
                        </div>

                        {/* Store Info Card */}
                        <div className="bg-white border border-hairline rounded-2xl shadow-sm overflow-hidden text-left">
                          <div className="p-4 border-b border-hairline bg-fufu-dim/50 flex justify-between items-center">
                            <h5 className="font-semibold text-moringa text-sm">
                              Store Info & Directions
                            </h5>
                            {orderDetails.business?.contact?.phone && (
                              <a
                                href={`tel:${orderDetails.business.contact.phone}`}
                                className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 border border-green-100 hover:bg-green-100 px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call Store
                              </a>
                            )}
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Name and Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] text-moringa-muted/70 font-bold uppercase tracking-wider block">
                                  Store Name
                                </span>
                                <p className="font-bold text-moringa">
                                  {orderDetails.business?.name || 'N/A'}
                                </p>
                              </div>
                              {orderDetails.pickupDetails?.pickupTime && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-moringa-muted/70 font-bold uppercase tracking-wider block">
                                    Pickup Window
                                  </span>
                                  <p className="font-semibold text-moringa">
                                    {orderDetails.pickupDetails.pickupTime}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="border-t pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1 max-w-md">
                                <span className="text-[10px] text-moringa-muted/70 font-bold uppercase tracking-wider block">
                                  Store Address
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
                                      className="p-1 text-moringa-muted/70 hover:text-gray-600 hover:bg-fufu rounded transition-colors flex-shrink-0"
                                      title="Copy Address"
                                    >
                                      {copiedText === 'address' ? (
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {getPickupCoords() && (
                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${getPickupCoords()[0]},${getPickupCoords()[1]}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-white font-bold bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition-all duration-300 shadow-md shadow-green-100"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Google Maps
                                  </a>
                                  <a
                                    href={`https://waze.com/ul?ll=${getPickupCoords()[0]},${getPickupCoords()[1]}&navigate=yes`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all duration-300 border border-blue-100 shadow-sm"
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
                            <span className="text-xs font-semibold text-moringa-muted block">
                              Store Location Map
                            </span>
                            <div className="w-full h-60 rounded-2xl overflow-hidden relative shadow-sm border border-hairline z-10">
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
                                    <div className="text-xs font-semibold text-center">
                                      🏪 {orderDetails.business?.name || 'Store'}
                                    </div>
                                  </Popup>
                                </Marker>
                              </MapContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-moringa-muted">
                        Failed to load pickup information.
                      </p>
                    )}
                  </div>
                )}

                {selectedOrder.type === 'Delivery' && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="font-semibold text-lg mb-3 text-moringa">
                      Delivery Information
                    </h4>

                    {fetchingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-green-600 mr-2" />
                        <span className="text-sm text-moringa-muted">
                          Loading live tracking details...
                        </span>
                      </div>
                    ) : orderDetails ? (
                      <div className="space-y-4">
                        {/* Rider details card if assigned */}
                        {orderDetails.delivery?.rider ? (
                          <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between shadow-sm transition-all duration-300">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner">
                                {orderDetails.delivery.riderName?.charAt(0) || 'R'}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-moringa">
                                  {orderDetails.delivery.riderName || 'Assigned Rider'}
                                </p>
                                <p className="text-xs text-moringa-muted">
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
                                className="bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors shadow-sm"
                              >
                                Call Rider
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="bg-fufu-dim border border-hairline p-4 rounded-xl flex items-center justify-between text-sm">
                            <span className="text-moringa-muted">
                              Assigning a delivery agent...
                            </span>
                            <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
                              Pending
                            </span>
                          </div>
                        )}

                        {/* Address */}
                        <div className="text-sm bg-fufu-dim p-3 rounded-lg border border-hairline">
                          <p className="text-moringa-muted font-medium text-xs mb-1">
                            DELIVERY ADDRESS
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
                            <div className="flex justify-between items-center text-xs text-moringa-muted">
                              <span className="font-medium text-moringa">Live Delivery Route</span>
                              {riderLocation && (
                                <span className="flex items-center text-orange-600 font-semibold gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                                  Live GPS Connected
                                </span>
                              )}
                            </div>
                            <div className="w-full h-80 rounded-xl overflow-hidden relative shadow-sm border border-hairline z-10">
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
                                    <div className="text-xs font-semibold">
                                      🏪{' '}
                                      {orderDetails.delivery?.pickupLocation?.businessName ||
                                        orderDetails.business?.name ||
                                        'Restaurant'}
                                    </div>
                                  </Popup>
                                </Marker>

                                {/* Dropoff/Customer Marker */}
                                <Marker position={getDropoffCoords()} icon={homeIcon}>
                                  <Popup>
                                    <div className="text-xs font-semibold">
                                      🏠 Delivery Destination
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
                                      <div className="text-xs font-semibold">🚴 Rider (Live)</div>
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
                          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-800">
                            Location coordinates are not available for this delivery. Live map
                            tracking is disabled.
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-moringa-muted">
                        Failed to load detailed delivery information.
                      </p>
                    )}
                  </div>
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
