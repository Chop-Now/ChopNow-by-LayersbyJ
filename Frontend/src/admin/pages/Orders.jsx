import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Archive,
  Trash2,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Filter,
  Loader2,
  X,
  User,
  Phone,
  MapPin,
  Eye,
  RefreshCw,
  AlertCircle,
  Check,
  Copy,
} from 'lucide-react';
import { orderService } from '../../services';
import toast from 'react-hot-toast';
import { useAdminMode } from '../context/AdminModeContext';

const OrdersTable = ({ title, statusFilter }) => {
  const { adminMode } = useAdminMode();
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Detail Modal & Verification States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showQuickVerify, setShowQuickVerify] = useState(false);
  const [quickCode, setQuickCode] = useState('');
  const [quickVerifyResult, setQuickVerifyResult] = useState(null);

  const formatStatus = (status) => {
    const statusMap = {
      pending_payment: 'Pending',
      pending: 'Pending',
      paid: 'Paid',
      confirmed: 'Accepted',
      ready_for_pickup: 'Ready',
      out_for_delivery: 'In Transit',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return (
      statusMap[status] ||
      status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, ' ') ||
      'Unknown'
    );
  };

  // Fetch orders from API
  const loadOrders = async (isMounted = true) => {
    setLoading(true);
    try {
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter === 'pending') {
        filters.status = 'pending';
      } else if (statusFilter === 'completed') {
        filters.status = 'completed';
      } else if (statusFilter === 'deliveries') {
        filters.fulfillmentType = 'delivery';
        filters.status = 'pending';
      }

      const response =
        adminMode === 'website'
          ? await orderService.getAdminOrders(filters)
          : await orderService.getOrders(filters);

      if (!isMounted) return;

      const transformedOrders = (response.orders || []).map((order) => ({
        _id: order.orderNumber || order._id,
        orderId: order._id,
        customerName: order.customer
          ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
          : 'Unknown',
        vendor: order.business?.name || 'Unknown Vendor',
        status: formatStatus(order.status),
        rawStatus: order.status,
        total: order.pricing?.total || 0,
        pickupWindow: order.pickupDetails?.pickupTime || 'N/A',
        createdAt: order.createdAt,
        type: order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup',
      }));

      setOrders(transformedOrders);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      if (!isMounted) return;
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
      setOrders([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadOrders(isMounted);
    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter, adminMode]);

  const fetchOrders = () => {
    loadOrders(true);
  };

  // Update order status helper
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${formatStatus(newStatus)}`);
      fetchOrders();
      // If the selected order modal is open, refresh its data
      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.orderId === orderId)) {
        handleRowClick(orderId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Verify pickup code helper
  const handleVerifyPickup = async (orderId, codeVal) => {
    if (!codeVal || codeVal.trim().length < 4) {
      toast.error('Please enter a valid pickup code');
      return;
    }
    setVerifyingCode(true);
    try {
      const res = await orderService.verifyPickupCode(orderId, codeVal.trim().toUpperCase());
      toast.success(res.message || 'Pickup verified successfully and order completed!');
      setPickupCode('');
      fetchOrders();
      setSelectedOrder(null); // Close details modal
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error verifying pickup code:', error);
      toast.error(error.message || 'Invalid pickup code');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Direct quick verify helper (by code only)
  const handleDirectQuickVerify = async (e) => {
    e.preventDefault();
    if (!quickCode || quickCode.trim().length < 4) {
      toast.error('Please enter a valid pickup code');
      return;
    }
    setVerifyingCode(true);
    setQuickVerifyResult(null);
    try {
      const res = await orderService.verifyPickupCodeDirect(quickCode.trim().toUpperCase());
      toast.success(res.message || 'Pickup verified successfully!');
      setQuickVerifyResult({
        success: true,
        orderId: res.order._id || res.order.orderId,
        customerName: res.order.customerName,
        total: res.order.total,
      });
      setQuickCode('');
      fetchOrders();
    } catch (error) {
      console.error('Error verifying pickup code directly:', error);
      toast.error(error.message || 'Failed to verify pickup code');
      setQuickVerifyResult({
        success: false,
        message: error.message || 'Invalid or inactive pickup code',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  // Fetch full details of clicked order
  const handleRowClick = async (orderId) => {
    setLoadingDetails(true);
    try {
      const res = await orderService.getOrderById(orderId);
      setSelectedOrder(res.order || res);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error getting order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text, typeLabel) => {
    navigator.clipboard.writeText(text);
    toast.success(`${typeLabel} copied to clipboard!`);
  };

  // Client-side filtering for search and date (API handles status filter)
  let filteredOrders = orders;

  // Apply search filter (client-side)
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(
      (order) =>
        order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply date range filter (client-side)
  if (dateFrom) {
    filteredOrders = filteredOrders.filter(
      (order) => new Date(order.createdAt) >= new Date(dateFrom)
    );
  }
  if (dateTo) {
    filteredOrders = filteredOrders.filter(
      (order) => new Date(order.createdAt) <= new Date(dateTo + 'T23:59:59')
    );
  }

  // Apply sorting (client-side)
  filteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'highest') {
      return b.total - a.total;
    } else if (sortBy === 'lowest') {
      return a.total - b.total;
    }
    return 0;
  });

  // Display values
  const currentOrders = filteredOrders;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const showingFrom = filteredOrders.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredOrders.length);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(currentOrders.map((o) => o.orderId));
    } else {
      setSelectedOrders([]);
    }
  };

  // Handle individual select
  const handleSelect = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter((oId) => oId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  // Handle archive
  const handleArchive = () => {
    if (window.confirm(`Archive ${selectedOrders.length} order(s)?`)) {
      setOrders(orders.filter((order) => !selectedOrders.includes(order.orderId)));
      setSelectedOrders([]);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm(`Delete ${selectedOrders.length} order(s)? This action cannot be undone.`)) {
      setOrders(orders.filter((order) => !selectedOrders.includes(order.orderId)));
      setSelectedOrders([]);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Paid':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Accepted':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'Completed':
      case 'Delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Ready':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'In Transit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search, Filter, and Action Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={() => {
                  setShowQuickVerify(true);
                  setQuickCode('');
                  setQuickVerifyResult(null);
                }}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-green-500/10 hover:shadow-green-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4" />
                Quick Verify Pickup
              </button>

              <button
                onClick={fetchOrders}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Refresh List"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Date From
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Date To
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Sort By
              </label>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Manage and update order fulfillment processes
            </p>
          </div>
          {loading && <Loader2 className="w-4 h-4 text-solid animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70 dark:bg-slate-800/30">
              <tr>
                <th className="px-5 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedOrders.length === currentOrders.length && currentOrders.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-solid focus:ring-solid cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fulfillment Type
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Total
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {currentOrders.map((order) => (
                <tr
                  key={order.orderId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.orderId)}
                      onChange={() => handleSelect(order.orderId)}
                      className="w-4 h-4 rounded border-slate-300 text-solid focus:ring-solid cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => handleRowClick(order.orderId)}
                      className="text-xs font-bold text-solid hover:underline cursor-pointer text-left"
                    >
                      {order._id}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {order.customerName}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-900 dark:text-white">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                        order.type === 'Delivery'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      }`}
                    >
                      {order.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-slate-900 dark:text-white">
                    RWF {order.total.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleRowClick(order.orderId)}
                        className="p-1 text-slate-500 hover:text-solid dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* State-specific Acceptance Action */}
                      {['Pending', 'Paid'].includes(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'confirmed')}
                          disabled={updatingStatus}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Accept
                        </button>
                      )}

                      {/* State-specific Ready Pickup Action */}
                      {order.status === 'Accepted' && order.type === 'Pickup' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'ready_for_pickup')}
                          disabled={updatingStatus}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Ready
                        </button>
                      )}

                      {/* State-specific Ship Delivery Action */}
                      {order.status === 'Accepted' && order.type === 'Delivery' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'out_for_delivery')}
                          disabled={updatingStatus}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Ship
                        </button>
                      )}

                      {/* State-specific Complete Delivery Action */}
                      {order.status === 'In Transit' && order.type === 'Delivery' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'completed')}
                          disabled={updatingStatus}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Deliver
                        </button>
                      )}

                      {/* State-specific Verify Code Action */}
                      {order.status === 'Ready' && order.type === 'Pickup' && (
                        <button
                          onClick={() => handleRowClick(order.orderId)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer animate-pulse shrink-0"
                        >
                          Verify Code
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="font-semibold text-xs">No orders found</p>
            <p className="text-[10px]">Verify your filter conditions or reload the list.</p>
          </div>
        )}

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/10">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Showing {showingFrom} to {showingTo} of {filteredOrders.length} orders
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                    currentPage === index + 1
                      ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                      : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Drawer Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Order Details
                  </h3>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${getStatusColor(formatStatus(selectedOrder.status))}`}
                  >
                    {formatStatus(selectedOrder.status)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ID:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedOrder.orderNumber || selectedOrder._id}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowDetailsModal(false);
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-xs">
              {/* Order Info & Customer Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Order Information
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Date:</span>
                      <span className="font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Type:</span>
                      <span className="font-semibold text-solid">
                        {selectedOrder.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Payment Method:</span>
                      <span className="font-medium uppercase">
                        {selectedOrder.payment?.paymentMethod || 'COD'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Payment Status:</span>
                      <span
                        className={`font-semibold ${selectedOrder.payment?.paymentStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}
                      >
                        {selectedOrder.payment?.paymentStatus || 'pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Customer Details
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Name:</span>
                      <span className="font-medium">
                        {selectedOrder.customer
                          ? `${selectedOrder.customer.firstName || ''} ${selectedOrder.customer.lastName || ''}`.trim()
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Email:</span>
                      <span className="font-medium">{selectedOrder.customer?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                      {selectedOrder.customer?.phone ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${selectedOrder.customer.phone}`}
                            className="font-semibold text-solid hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {selectedOrder.customer.phone}
                          </a>
                          <button
                            onClick={() =>
                              handleCopyToClipboard(selectedOrder.customer.phone, 'Phone number')
                            }
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                            title="Copy Phone"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                  Items Ordered
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                          Price
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {item.name || 'Product'}
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            RWF {item.unitPrice?.toLocaleString() || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            RWF {(item.unitPrice * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                        <td
                          colSpan="3"
                          className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400"
                        >
                          Delivery Fee:
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-white">
                          RWF {selectedOrder.pricing?.deliveryFee?.toLocaleString() || 0}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-900">
                        <td
                          colSpan="3"
                          className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white"
                        >
                          Grand Total:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-solid">
                          RWF {selectedOrder.pricing?.total?.toLocaleString() || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery / Shipping details */}
              {selectedOrder.fulfillmentType === 'delivery' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Delivery Details
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-solid shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Delivery Address
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          {selectedOrder.deliveryDetails?.address
                            ? typeof selectedOrder.deliveryDetails.address === 'string'
                              ? selectedOrder.deliveryDetails.address
                              : `${selectedOrder.deliveryDetails.address.street || ''}, ${selectedOrder.deliveryDetails.address.city || ''}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedOrder.delivery && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Assigned Rider
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {selectedOrder.delivery.riderName || 'Rider Assigned'}
                          </p>
                        </div>
                        {selectedOrder.delivery.riderPhone && (
                          <a
                            href={`tel:${selectedOrder.delivery.riderPhone}`}
                            className="px-3 py-1.5 bg-solid hover:bg-tertiary text-white rounded-lg flex items-center gap-1 font-semibold transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call Rider
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor Actions Area */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                {/* 1. Verify Pickup Code Block */}
                {selectedOrder.fulfillmentType === 'pickup' &&
                  ['paid', 'confirmed', 'ready_for_pickup'].includes(selectedOrder.status) && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                        <h5 className="font-bold text-emerald-800 dark:text-emerald-300">
                          Verify Customer Pickup Code
                        </h5>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Enter the customer's 6-digit pickup code to confirm pickup and complete the
                        order.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength="6"
                          placeholder="Enter pickup code"
                          value={pickupCode}
                          onChange={(e) => setPickupCode(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg text-sm text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                        />
                        <button
                          onClick={() =>
                            handleVerifyPickup(
                              selectedOrder._id || selectedOrder.orderId,
                              pickupCode
                            )
                          }
                          disabled={verifyingCode}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-bold transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {verifyingCode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Verify Code'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                {/* 2. Standard State Transitions buttons */}
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {/* Mark Ready for Pickup */}
                  {selectedOrder.fulfillmentType === 'pickup' &&
                    ['paid', 'confirmed'].includes(selectedOrder.status) && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedOrder._id || selectedOrder.orderId,
                            'ready_for_pickup'
                          )
                        }
                        disabled={updatingStatus}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        {updatingStatus ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                        Mark Ready for Pickup
                      </button>
                    )}

                  {/* Accept Order (if pending_payment or paid but not confirmed yet) */}
                  {['pending_payment', 'paid'].includes(selectedOrder.status) && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedOrder._id || selectedOrder.orderId, 'confirmed')
                      }
                      disabled={updatingStatus}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept Order
                    </button>
                  )}

                  {/* Mark Out for Delivery */}
                  {selectedOrder.fulfillmentType === 'delivery' &&
                    ['paid', 'confirmed'].includes(selectedOrder.status) && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedOrder._id || selectedOrder.orderId,
                            'out_for_delivery'
                          )
                        }
                        disabled={updatingStatus}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        {updatingStatus ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                        Mark Out for Delivery
                      </button>
                    )}

                  {/* Mark Delivered & Complete */}
                  {selectedOrder.fulfillmentType === 'delivery' &&
                    selectedOrder.status === 'out_for_delivery' && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedOrder._id || selectedOrder.orderId,
                            'completed'
                          )
                        }
                        disabled={updatingStatus}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        {updatingStatus ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Mark Delivered & Complete
                      </button>
                    )}

                  {/* Cancel Order */}
                  {['pending_payment', 'paid', 'confirmed'].includes(selectedOrder.status) && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to cancel this order?')) {
                          setUpdatingStatus(true);
                          try {
                            await orderService.cancelOrder(
                              selectedOrder._id || selectedOrder.orderId
                            );
                            toast.success('Order cancelled successfully');
                            fetchOrders();
                            setSelectedOrder(null);
                            setShowDetailsModal(false);
                          } catch (err) {
                            console.error('Cancel order failed:', err);
                            toast.error(err.message || 'Failed to cancel order');
                          } finally {
                            setUpdatingStatus(false);
                          }
                        }
                      }}
                      disabled={updatingStatus}
                      className="px-3.5 py-2 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/10 text-red-600 dark:text-red-400 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Verify Modal */}
      {showQuickVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                Quick Verify Pickup Code
              </h3>
              <button
                onClick={() => setShowQuickVerify(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDirectQuickVerify} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Enter the customer's 6-digit pickup code to instantly complete the order. No need to
                locate the order first.
              </p>

              <div className="space-y-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Pickup Code
                </label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="e.g. A9B8C7"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-lg text-center font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-slate-800 dark:text-white"
                  required
                />
              </div>

              {/* Status Results Display */}
              {quickVerifyResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    quickVerifyResult.success
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
                  }`}
                >
                  {quickVerifyResult.success ? (
                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-green-700 dark:text-green-400">
                        <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                        Verification Successful!
                      </p>
                      <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">
                        Order <span className="font-bold">#{quickVerifyResult.orderId}</span> has
                        been marked as Completed.
                      </p>
                      <p className="text-[11px] text-green-700 dark:text-green-400">
                        Customer:{' '}
                        <span className="font-semibold">{quickVerifyResult.customerName}</span>
                      </p>
                      <p className="text-[11px] text-green-700 dark:text-green-400">
                        Total:{' '}
                        <span className="font-semibold">
                          RWF {quickVerifyResult.total.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4.5 h-4.5 text-red-600" />
                        Verification Failed
                      </p>
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                        {quickVerifyResult.message}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickVerify(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-bold shadow-md shadow-green-500/10 hover:shadow-green-500/20 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {verifyingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Verify & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AllOrders = () => <OrdersTable title="All Orders" statusFilter="all" />;
export const PendingOrders = () => <OrdersTable title="Pending Orders" statusFilter="pending" />;
export const CompletedOrders = () => (
  <OrdersTable title="Completed/Delivered Orders" statusFilter="completed" />
);
export const Deliveries = () => (
  <OrdersTable title="Deliveries Management" statusFilter="deliveries" />
);
