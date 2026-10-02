import { MoreHorizontal, SlidersHorizontal, Loader2, AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import disputeService from '../../../services/disputeService';

const STATUS_LABELS = {
  open: 'Pending',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const TYPE_LABELS = {
  refund: 'Refund Request',
  missing_item: 'Missing Item',
  vendor_unresponsive: 'Vendor Unresponsive',
  delivery_issue: 'Delivery Issue',
  poor_quality: 'Poor Quality',
  other: 'Other',
};

const formatAmount = (order) => {
  const total = order?.pricing?.total;
  if (total === undefined || total === null) return '—';
  return `${Number(total).toLocaleString()} ${order?.pricing?.currency || 'Frw'}`;
};

const DisputesTable = ({ onNavigate }) => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await disputeService.getDisputes('admin');
      const list = response.disputes || response.data || response || [];
      setDisputes(list.slice(0, 5));
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError('Failed to load disputes');
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'escalated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Disputes</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Latest Customer Disputes & Complaints
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDisputes}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Refresh
              </span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('complaints')}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                See All
              </span>
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-solid mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading disputes...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button onClick={fetchDisputes} className="mt-2 text-sm text-solid hover:underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && disputes.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">No disputes right now.</p>
        </div>
      )}

      {!loading && !error && disputes.length > 0 && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Dispute
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Amount
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
              {disputes.map((dispute) => (
                <tr
                  key={dispute._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {dispute.order?.orderNumber || dispute._id?.slice(-8) || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900 dark:text-white">
                      {dispute.customer?.firstName
                        ? `${dispute.customer.firstName} ${dispute.customer.lastName || ''}`.trim()
                        : dispute.customer?.email || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {dispute.business?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {TYPE_LABELS[dispute.type] || dispute.type || 'Other'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatAmount(dispute.order)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}
                    >
                      {STATUS_LABELS[dispute.status] || dispute.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onNavigate && onNavigate('complaints')}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
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

export default DisputesTable;
