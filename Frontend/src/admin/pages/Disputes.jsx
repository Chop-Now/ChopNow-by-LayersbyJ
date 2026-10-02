import React, { useState, useEffect } from 'react';
import {
  Search,
  History,
  RotateCw,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle,
  Phone,
  MessageSquare,
  ShieldAlert,
  Check,
  BadgeDollarSign,
  TruckIcon,
  Clock,
  Package,
  Store,
  Truck,
  DollarSign,
  CircleCheck,
  X,
  FileText,
  MapPin,
  User,
  Calendar,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { disputeService } from '../../services';
import toast from 'react-hot-toast';
import { useAdminMode } from '../context/AdminModeContext';

/**
 * Resolve a dispute: choose the outcome and, for refunds, who pays for it -
 * the vendor (their share comes out of their earnings) or ChopNow (goodwill).
 */
const ResolveDisputeDialog = ({ issue, submitting, onCancel, onSubmit }) => {
  const [action, setAction] = useState('full_refund');
  const [amount, setAmount] = useState('');
  const [fundedBy, setFundedBy] = useState('vendor');
  const [comment, setComment] = useState('');
  const isRefund = action === 'full_refund' || action === 'partial_refund';
  const orderTotal = issue.orderValue || 0;
  const partialAmount = Number(amount);
  const partialInvalid =
    action === 'partial_refund' &&
    (!partialAmount || partialAmount <= 0 || (orderTotal && partialAmount > orderTotal));

  const submit = () => {
    if (partialInvalid) {
      toast.error(`Enter a refund amount between 1 and ${orderTotal.toLocaleString()} RWF`);
      return;
    }
    onSubmit({
      action,
      ...(action === 'partial_refund' ? { amount: partialAmount } : {}),
      ...(isRefund ? { refundFundedBy: fundedBy } : {}),
      comment: comment.trim() || undefined,
    });
  };

  const option = (value, label, hint) => (
    <label
      key={value}
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
        action === value
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <input
        type="radio"
        name="resolution_action"
        checked={action === value}
        onChange={() => setAction(value)}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Resolve dispute
            </h3>
            <p className="text-xs text-slate-500">
              Order {issue.orderId}
              {orderTotal ? ` · RWF ${orderTotal.toLocaleString()}` : ''}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {option(
            'full_refund',
            'Full refund',
            orderTotal ? `RWF ${orderTotal.toLocaleString()} back to the customer` : null
          )}
          {option('partial_refund', 'Partial refund')}
          {action === 'partial_refund' && (
            <input
              type="number"
              min="1"
              max={orderTotal || undefined}
              placeholder="Refund amount (RWF)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-800"
            />
          )}
          {option('replacement', 'Replacement arranged', 'No money is refunded')}
          {option('rejected', 'Reject the complaint', 'No money is refunded')}
        </div>

        {isRefund && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Who pays for this refund?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['vendor', "Vendor's fault", "Taken from the vendor's earnings"],
                ['platform', 'Platform goodwill', 'ChopNow covers it'],
              ].map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFundedBy(value)}
                  className={`text-left p-3 rounded-lg border ${
                    fundedBy === value
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                    {label}
                  </span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          rows={3}
          placeholder="Note for the record (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-800 mb-4"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Ops queue of refunds owed to customers (paid orders that were cancelled,
 * dispute refunds, payments that arrived for cancelled orders). There is no
 * automatic pawaPay refund yet: ops sends the money back to the payer's
 * number, then records it here.
 */
export const RefundRequests = () => {
  const [status, setStatus] = useState('pending_manual');
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async (filter) => {
    setLoading(true);
    try {
      const data = await disputeService.getRefundRequests(filter);
      setRefunds(data.refundRequests || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load refund requests');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(status);
  }, [status]);

  const settle = async (refund, outcome) => {
    const note = window.prompt(
      outcome === 'completed'
        ? 'Mobile money reference for the refund (optional):'
        : 'Why could this refund not be made? (optional)'
    );
    if (note === null) return; // cancelled
    setBusyId(refund._id);
    try {
      await disputeService.updateRefundRequest(refund._id, { status: outcome, notes: note });
      toast.success(outcome === 'completed' ? 'Refund recorded as paid' : 'Refund marked failed');
      setRefunds((prev) => prev.filter((r) => r._id !== refund._id));
    } catch (error) {
      toast.error(error.message || 'Failed to update refund');
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (n) => `RWF ${Math.round(n || 0).toLocaleString()}`;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Refund Requests</h1>
          <p className="text-sm text-gray-500">
            Send the money back to the customer&apos;s mobile money number, then record it here.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="pending_manual">To process</option>
          <option value="completed">Refunded</option>
          <option value="failed">Failed</option>
          <option value="">All</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : refunds.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center text-gray-600 dark:text-gray-400">
          No refund requests here.
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div
              key={refund._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {fmt(refund.amount)} ·{' '}
                  <span className="font-normal text-slate-600 dark:text-slate-300">
                    Order {refund.order?.orderNumber || '—'}
                  </span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {[refund.customer?.firstName, refund.customer?.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Customer'}
                  {refund.payment?.payerPhoneNumber
                    ? ` · pay back to +${String(refund.payment.payerPhoneNumber).replace(/^\+/, '')}`
                    : refund.customer?.phone
                      ? ` · ${refund.customer.phone}`
                      : ''}
                  {refund.payment?.correspondent
                    ? ` (${refund.payment.correspondent === 'AIRTEL_RWA' ? 'Airtel' : 'MTN'})`
                    : ''}
                </p>
                <p className="text-xs text-slate-500">
                  {refund.business?.name ? `${refund.business.name} · ` : ''}
                  {refund.reason || 'Refund'} ·{' '}
                  {refund.fundedBy === 'vendor'
                    ? `vendor's fault (${fmt(refund.vendorDeduction)} from vendor)`
                    : 'ChopNow pays'}{' '}
                  · {new Date(refund.createdAt).toLocaleString()}
                </p>
                {refund.notes && (
                  <p className="text-xs text-slate-500 mt-1">Note: {refund.notes}</p>
                )}
              </div>
              {refund.status === 'pending_manual' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => settle(refund, 'failed')}
                    disabled={busyId === refund._id}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                  >
                    Couldn&apos;t refund
                  </button>
                  <button
                    onClick={() => settle(refund, 'completed')}
                    disabled={busyId === refund._id}
                    className="px-3 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
                  >
                    Mark refunded
                  </button>
                </div>
              ) : (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    refund.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {refund.status === 'completed' ? 'Refunded' : 'Failed'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CustomerComplaints = () => {
  const { adminMode } = useAdminMode();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState('priority');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  // Dispute being resolved in the resolution dialog
  const [resolveTarget, setResolveTarget] = useState(null);
  const itemsPerPage = 9;

  // Transform backend dispute format to frontend issue format
  const transformDispute = (dispute) => ({
    id: dispute._id,
    orderId: dispute.order?.orderNumber || dispute.orderId || 'N/A',
    orderValue: dispute.order?.pricing?.total || 0,
    priority: dispute.priority || 'medium',
    type: dispute.type || 'other',
    title: dispute.subject || dispute.title || 'Issue',
    incident: dispute.description || '',
    fullComplaint: dispute.description || '',
    since: new Date(dispute.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    reportedAt: dispute.createdAt,
    customer: {
      name: dispute.customer?.name || dispute.user?.name || 'Unknown',
      email: dispute.customer?.email || dispute.user?.email || '',
      phone: dispute.customer?.phone || dispute.user?.phone || 'N/A',
      status: dispute.customer?.tier || 'Customer',
      location: dispute.customer?.address?.city || '',
      image: dispute.customer?.avatar || null,
    },
    vendor: dispute.business
      ? {
          name: dispute.business.name || 'Unknown Vendor',
          phone: dispute.business.phone || 'N/A',
          location: dispute.business.address?.city || '',
        }
      : null,
    deliveryStatus: dispute.order?.status || 'unknown',
    rider: dispute.rider
      ? {
          name: dispute.rider.name || 'Unknown',
          phone: dispute.rider.phone || 'N/A',
          vehicleNumber: dispute.rider.vehicleNumber || 'N/A',
        }
      : null,
    images: dispute.attachments || null,
    timeline: dispute.timeline || [],
    actions: getActionsForType(dispute.type),
    status: dispute.status,
  });

  // Get appropriate actions based on dispute type. These strings must match
  // the real Dispute.type enum (models/Dispute.js) - they previously used
  // short-form values ('missing', 'vendor', 'delivery') that never matched
  // any real dispute, so every dispute silently fell through to `default`.
  // (No 'track' action: there's no order-tracking view in the admin
  // frontend to send an admin to - see M15 in the audit checklist.)
  const getActionsForType = (type) => {
    switch (type) {
      case 'missing_item':
        return ['call', 'refund', 'alert', 'resolve'];
      case 'vendor_unresponsive':
        return ['call', 'message', 'alert', 'resolve'];
      case 'delivery_issue':
        return ['call', 'alert', 'resolve'];
      case 'refund':
        return ['call', 'refund', 'alert', 'resolve'];
      default:
        return ['call', 'message', 'alert', 'resolve'];
    }
  };

  // Fetch disputes from API
  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const scope = adminMode === 'website' ? 'admin' : 'business';
      const response = await disputeService.getDisputes(scope);
      const disputes = response.disputes || response.data || response || [];
      const transformedDisputes = disputes
        .filter((d) => d.status !== 'resolved' && d.status !== 'closed')
        .map(transformDispute);
      setIssues(transformedDisputes);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadDisputes = async () => {
      setLoading(true);
      try {
        const scope = adminMode === 'website' ? 'admin' : 'business';
        const response = await disputeService.getDisputes(scope);
        if (!isMounted) return;
        const disputes = response.disputes || response.data || response || [];
        const transformedDisputes = disputes
          .filter((d) => d.status !== 'resolved' && d.status !== 'closed')
          .map(transformDispute);
        setIssues(transformedDisputes);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching disputes:', error);
        toast.error('Failed to load disputes');
        setIssues([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDisputes();
    return () => {
      isMounted = false;
    };
  }, [adminMode]);

  // State for dispute stats
  const [disputeStats, setDisputeStats] = useState({
    resolvedToday: 0,
    avgResolutionMinutes: 0,
  });

  // Fetch dispute stats from API
  useEffect(() => {
    let isMounted = true;
    const fetchDisputeStats = async () => {
      try {
        const stats = await disputeService.getDisputeStats();
        if (!isMounted) return;
        setDisputeStats({
          resolvedToday: stats.resolvedToday || 0,
          avgResolutionMinutes: stats.avgResolutionMinutes || 0,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching dispute stats:', error);
      }
    };
    fetchDisputeStats();
    return () => {
      isMounted = false;
    };
  }, [adminMode]);

  // Calculate stats
  const stats = {
    critical: issues.filter((i) => i.priority === 'critical').length,
    high: issues.filter((i) => i.priority === 'high').length,
    medium: issues.filter((i) => i.priority === 'medium').length,
    resolvedToday: disputeStats.resolvedToday,
  };

  const activeIssues = issues.filter(
    (i) => i.priority === 'critical' || i.priority === 'high'
  ).length;

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || issue.type === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Get category counts
  const categoryCounts = {
    all: issues.length,
    missing: issues.filter((i) => i.type === 'missing').length,
    vendor: issues.filter((i) => i.type === 'vendor').length,
    delivery: issues.filter((i) => i.type === 'delivery').length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIssues = filteredIssues.slice(startIndex, endIndex);
  const showingFrom = filteredIssues.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredIssues.length);

  // Resolving moves money (refunds), so it always goes through the dialog
  // where the admin picks the outcome and who pays for a refund.
  const handleResolve = (issueId) => {
    if (adminMode !== 'website') {
      toast.error('Only ChopNow admins can resolve disputes');
      return;
    }
    const issue = issues.find((i) => i.id === issueId);
    if (issue) setResolveTarget(issue);
  };

  const submitResolution = async (resolution) => {
    const issueId = resolveTarget.id;
    setResolvingId(issueId);
    try {
      await disputeService.resolveDispute(issueId, resolution);
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
      setResolveTarget(null);
      toast.success(
        resolution.action === 'full_refund' || resolution.action === 'partial_refund'
          ? 'Dispute resolved - refund queued for processing'
          : 'Dispute resolved'
      );
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error(error.message || 'Failed to resolve dispute');
    } finally {
      setResolvingId(null);
    }
  };

  // Format resolution time for display
  const formatResolutionTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const statsCards = [
    {
      title: 'Critical Priority',
      value: stats.critical,
      subtitle: `${stats.critical} active issues`,
      icon: <AlertOctagon className="w-6 h-6" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'High Priority',
      value: stats.high,
      subtitle: `${stats.high} active issues`,
      icon: <AlertTriangle className="w-6 h-6" />,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Medium Priority',
      value: stats.medium,
      subtitle: `${stats.medium} active issues`,
      icon: <AlertCircle className="w-6 h-6" />,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Resolved Today',
      value: stats.resolvedToday,
      subtitle:
        disputeStats.avgResolutionMinutes > 0
          ? `Avg Resolution: ${formatResolutionTime(disputeStats.avgResolutionMinutes)}`
          : 'No resolutions yet',
      icon: <CircleCheck className="w-6 h-6" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  const getActionButton = (action, issue) => {
    switch (action) {
      case 'call':
        return (
          <a
            href={
              issue.customer?.phone && issue.customer.phone !== 'N/A'
                ? `tel:${issue.customer.phone}`
                : undefined
            }
            onClick={(e) => {
              if (!issue.customer?.phone || issue.customer.phone === 'N/A') {
                e.preventDefault();
                toast.error('No phone number on file for this customer');
              }
            }}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
        );
      case 'message':
        return (
          <a
            href={
              issue.customer?.email
                ? `mailto:${issue.customer.email}?subject=${encodeURIComponent(`ChopNow: your dispute on order ${issue.orderId}`)}`
                : undefined
            }
            onClick={(e) => {
              if (!issue.customer?.email) {
                e.preventDefault();
                toast.error('No email on file for this customer');
              }
            }}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Message
          </a>
        );
      case 'refund':
        return (
          <button
            onClick={() => handleResolve(issue.id)}
            className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <BadgeDollarSign className="w-4 h-4" />
            Refund
          </button>
        );
      case 'alert':
        return (
          <button
            onClick={() => setSelectedIssue(issue)}
            className="flex items-center gap-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        );
      case 'resolve':
        return (
          <button
            onClick={() => handleResolve(issue.id)}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Problem Queue</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {activeIssues} active issues require immediate resolution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={fetchDisputes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-solid hover:bg-tertiary text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500">{stat.subtitle}</p>
              </div>
              <div
                className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-all duration-300`}
              >
                <div className={stat.iconColor}>{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="relative z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by order ID, customer name, or vendor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
          />
        </div>

        {/* Category and Priority Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Category Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-solid text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Issues ({categoryCounts.all})
            </button>
            <button
              onClick={() => setCategoryFilter('missing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                categoryFilter === 'missing'
                  ? 'bg-solid text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Missing Items ({categoryCounts.missing})
            </button>
            <button
              onClick={() => setCategoryFilter('vendor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                categoryFilter === 'vendor'
                  ? 'bg-solid text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Vendor Issues ({categoryCounts.vendor})
            </button>
            <button
              onClick={() => setCategoryFilter('delivery')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                categoryFilter === 'delivery'
                  ? 'bg-solid text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Late Delivery ({categoryCounts.delivery})
            </button>
          </div>

          {/* Priority and Sort Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Priority Filter
              </button>
              {showPriorityMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-2">
                  <button
                    onClick={() => {
                      setPriorityFilter('all');
                      setShowPriorityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    All Priorities
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter('critical');
                      setShowPriorityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
                  >
                    Critical
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter('high');
                      setShowPriorityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors cursor-pointer"
                  >
                    High
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter('medium');
                      setShowPriorityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md transition-colors cursor-pointer"
                  >
                    Medium
                  </button>
                </div>
              )}
            </div>

            {/* Sort Order Filter */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Sort Order
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-2">
                  <button
                    onClick={() => {
                      setSortBy('priority');
                      setShowSortMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    By Priority (Default)
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('received');
                      setShowSortMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    By Time Received
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-slate-200/50 dark:border-slate-700/50 text-center">
          <Loader2 className="w-12 h-12 mx-auto text-solid animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Loading Disputes...
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please wait while we fetch the latest issues.
          </p>
        </div>
      )}

      {/* Issues Kanban Cards */}
      {!loading && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentIssues.map((issue) => {
            const getBorderColor = (priority) => {
              if (priority === 'critical') return 'border-red-500 dark:border-red-500';
              if (priority === 'high') return 'border-orange-500 dark:border-orange-500';
              return 'border-slate-200/50 dark:border-slate-700/50';
            };

            return (
              <div
                key={issue.id}
                className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border-2 ${getBorderColor(issue.priority)} hover:shadow-xl transition-all duration-300 flex flex-col h-full`}
              >
                {/* Header with Priority Tag and Time */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase border ${getPriorityColor(issue.priority)}`}
                  >
                    {issue.priority}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    since {issue.since}
                  </div>
                </div>

                {/* Title - Fixed Height */}
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-3 h-11 line-clamp-2">
                  {issue.title}
                </h3>

                {/* Incident Description - Fixed Height with Scrollable Content */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mb-3 h-[120px] overflow-y-auto">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Incident:
                  </p>
                  <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {issue.incident}
                  </p>
                </div>

                {/* Order Info */}
                <div className="flex items-center justify-between py-2 border-y border-slate-200 dark:border-slate-700 mb-3">
                  <span className="text-[13px] text-slate-600 dark:text-slate-400">
                    {issue.orderId}
                  </span>
                  <span className="text-[13px] font-bold text-solid">
                    RWF {issue.orderValue.toLocaleString()}
                  </span>
                </div>

                {/* Customer Information */}
                <div className="space-y-2 mb-3 grow">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Customer Information:
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-solid/10 flex items-center justify-center text-solid font-semibold text-[15px] shrink-0">
                      {issue.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate">
                        {issue.customer.name}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        {issue.customer.phone}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[11px] font-medium">
                    {issue.customer.status}
                  </span>
                </div>

                {/* Action Buttons - Always at Bottom */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
                  {issue.actions.map((action, idx) => (
                    <React.Fragment key={idx}>{getActionButton(action, issue)}</React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredIssues.length === 0 && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-slate-200/50 dark:border-slate-700/50 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Issues Found</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            All complaints matching your filters have been resolved or there are no active issues.
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredIssues.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {showingFrom} to {showingTo} of {filteredIssues.length} issues
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>

            {[...Array(Math.min(totalPages, 5))].map((_, index) => {
              const pageNum = index + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-solid text-white'
                      : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Complaint Details Sidebar */}
      {selectedIssue && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-9999 w-screen h-screen"
            onClick={() => setSelectedIssue(null)}
          ></div>
          <div
            className="fixed top-0 right-0 h-screen w-full md:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-10000 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              {/* Header with Close Button */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Complaint Details
                </h2>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Priority Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border-2 ${getPriorityColor(selectedIssue.priority)}`}
                >
                  {selectedIssue.priority} Priority
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  Since {selectedIssue.since}
                </div>
              </div>

              {/* Order Information */}
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Order ID</p>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                      {selectedIssue.orderId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Order Value</p>
                    <p className="text-sm font-bold text-solid">
                      RWF {selectedIssue.orderValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Issue Type</p>
                  <span className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                    {selectedIssue.type.charAt(0).toUpperCase() + selectedIssue.type.slice(1)} Issue
                  </span>
                </div>
              </div>

              {/* Complaint Title */}
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {selectedIssue.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Brief Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  {selectedIssue.incident}
                </p>
              </div>

              {/* Full Complaint Text */}
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  Full Complaint
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedIssue.fullComplaint || selectedIssue.incident}
                </p>
              </div>

              {/* Customer-Provided Photos */}
              {selectedIssue.images && selectedIssue.images.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    Customer Photos ({selectedIssue.images.length}{' '}
                    {selectedIssue.images.length === 1 ? 'photo' : 'photos'})
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Photos provided by customer as evidence
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIssue.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-solid dark:hover:border-solid transition-colors cursor-pointer"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Customer Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-solid/10 flex items-center justify-center text-solid font-semibold text-lg shrink-0">
                      {selectedIssue.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedIssue.customer.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {selectedIssue.customer.email || 'No email provided'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {selectedIssue.customer.phone}
                      </p>
                    </div>
                    {selectedIssue.customer.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {selectedIssue.customer.location}
                        </p>
                      </div>
                    )}
                    <span className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium mt-2">
                      {selectedIssue.customer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              {selectedIssue.vendor && (
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Vendor Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Business Name</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedIssue.vendor.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {selectedIssue.vendor.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {selectedIssue.vendor.location}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rider Information - Show if order was delivered or in transit */}
              {selectedIssue.rider &&
                (selectedIssue.deliveryStatus === 'delivered' ||
                  selectedIssue.deliveryStatus === 'in_transit') && (
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      Rider Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-600 dark:text-orange-400 font-semibold shrink-0">
                          {selectedIssue.rider.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {selectedIssue.rider.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {selectedIssue.deliveryStatus === 'delivered'
                              ? 'Delivered order'
                              : 'Currently delivering'}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-orange-200 dark:border-orange-800 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {selectedIssue.rider.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            Vehicle: {selectedIssue.rider.vehicleNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Timeline */}
              {selectedIssue.timeline && selectedIssue.timeline.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    Issue Timeline
                  </h4>
                  <div className="space-y-2">
                    {selectedIssue.timeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-solid rounded-full mt-1.5 shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900 dark:text-white">
                            {item.event}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

              {/* Quick Actions */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Phone className="w-4 h-4" />
                    Call Customer
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <BadgeDollarSign className="w-4 h-4" />
                    Issue Refund
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <TruckIcon className="w-4 h-4" />
                    Track Order
                  </button>
                </div>
              </div>

              {/* Resolve Button */}
              <button
                onClick={() => {
                  handleResolve(selectedIssue.id);
                  setSelectedIssue(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Resolved
              </button>
            </div>
          </div>
        </>
      )}

      {resolveTarget && (
        <ResolveDisputeDialog
          issue={resolveTarget}
          submitting={resolvingId === resolveTarget.id}
          onCancel={() => setResolveTarget(null)}
          onSubmit={submitResolution}
        />
      )}
    </div>
  );
};
