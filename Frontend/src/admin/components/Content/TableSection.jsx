import { MoreHorizontal, SlidersHorizontal, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { orderService } from '../../../services';
import { useAdminMode } from '../../context/AdminModeContext';

const TableSection = ({ onNavigate }) => {
  const { adminMode } = useAdminMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentOrders();
  }, [adminMode]);

  const fetchRecentOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch recent orders based on admin mode
      const filters = { page: 1, limit: 5 };
      const response =
        adminMode === 'website'
          ? await orderService.getAdminOrders(filters)
          : await orderService.getOrders(filters);

      // Transform orders to display format
      const transformedOrders = (response.orders || []).map((order, index) => ({
        _id: order._id,
        orderId: order.orderNumber || `#ORD-${order._id?.slice(-4) || index}`,
        name: order.items?.[0]?.listing?.title || order.items?.[0]?.name || 'Unknown Product',
        image: order.items?.[0]?.listing?.images?.[0] || order.items?.[0]?.image || null,
        category: order.items?.[0]?.listing?.category || 'N/A',
        price: order.pricing?.total || order.total || 0,
        status: formatStatus(order.status),
        customerName: order.customer
          ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
          : 'Unknown',
      }));

      setOrders(transformedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load recent orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      pending: 'Pending',
      confirmed: 'Accepted',
      ready_for_pickup: 'Ready',
      out_for_delivery: 'In Transit',
      completed: 'Delivered',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Accepted':
      case 'Ready':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Transit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Orders</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest Customer Orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('all-orders')}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                See All
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-solid mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading orders...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button onClick={fetchRecentOrders} className="mt-2 text-sm text-solid hover:underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-sm text-slate-500 dark:text-slate-400">No recent orders</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && orders.length > 0 && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {orders.map((order) => (
                <tr
                  key={order._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {order.orderId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {order.image ? (
                        <img
                          src={order.image}
                          alt={order.name || 'Product'}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs text-slate-500">N/A</span>
                        </div>
                      )}
                      <span className="text-sm text-slate-900 dark:text-white truncate max-w-[120px]">
                        {order.name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {order.customerName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      RWF {(order.price || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TableSection;
