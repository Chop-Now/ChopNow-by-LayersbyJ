import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ListFilter,
  X,
  MapPin,
  Phone,
  Mail,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Bike,
  Car,
  ShieldAlert,
  UserCheck,
  Eye,
  ArrowDownUp,
} from 'lucide-react';
import { userService } from '../../services';
import toast from 'react-hot-toast';

// Details Modal Component
const RiderDetailsModal = ({ rider, onClose, onApprove, onReject, showActions = false }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      await onApprove(rider._id);
      onClose();
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setSubmittingAction(true);
    try {
      await onReject(rider._id, rejectionReason);
      onClose();
    } finally {
      setSubmittingAction(false);
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      url.includes('/image/upload/')
    );
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50 my-auto shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {rider.firstName} {rider.lastName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rider Application Details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                rider.riderStatus === 'approved'
                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400'
                  : rider.riderStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
              }`}
            >
              {rider.riderStatus}
            </span>
          </div>

          {/* Details sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Personal Info
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{rider.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{rider.riderDetails?.phone || rider.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Applied on:{' '}
                    {rider.riderDetails?.appliedAt
                      ? new Date(rider.riderDetails.appliedAt).toLocaleDateString()
                      : new Date(rider.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Vehicle & ID Info
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {rider.riderDetails?.vehicleType === 'car' ? (
                    <Car className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <Bike className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="capitalize">
                    Vehicle Type: {rider.riderDetails?.vehicleType || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>National ID: {rider.riderDetails?.nationalId || 'N/A'}</span>
                </div>
                {rider.riderDetails?.licensePlate && (
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>License Plate: {rider.riderDetails.licensePlate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rejection Detail if rejected */}
          {rider.riderStatus === 'rejected' && rider.riderDetails?.rejectedReason && (
            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                Rejection Reason
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                {rider.riderDetails.rejectedReason}
              </p>
            </div>
          )}

          {/* Verification documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Verification Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* National ID doc */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    National ID Photo
                  </span>
                  <a
                    href={rider.riderDetails?.nationalIdPhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-green-600 font-semibold hover:underline"
                  >
                    Open Full
                  </a>
                </div>
                {isImageFile(rider.riderDetails?.nationalIdPhoto) ? (
                  <img
                    src={rider.riderDetails.nationalIdPhoto}
                    alt="National ID Copy"
                    className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                    onClick={() => window.open(rider.riderDetails.nationalIdPhoto, '_blank')}
                  />
                ) : (
                  <div
                    onClick={() => window.open(rider.riderDetails?.nationalIdPhoto, '_blank')}
                    className="w-full h-40 bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileText className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-semibold">
                      View Document Binary
                    </span>
                  </div>
                )}
              </div>

              {/* Vehicle photo doc */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Vehicle Photo
                  </span>
                  <a
                    href={rider.riderDetails?.vehiclePhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-green-600 font-semibold hover:underline"
                  >
                    Open Full
                  </a>
                </div>
                {isImageFile(rider.riderDetails?.vehiclePhoto) ? (
                  <img
                    src={rider.riderDetails.vehiclePhoto}
                    alt="Vehicle Copy"
                    className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                    onClick={() => window.open(rider.riderDetails.vehiclePhoto, '_blank')}
                  />
                ) : (
                  <div
                    onClick={() => window.open(rider.riderDetails?.vehiclePhoto, '_blank')}
                    className="w-full h-40 bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileText className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-semibold">
                      View Document Binary
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action dialogs */}
          {showActions && rider.riderStatus === 'pending' && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={submittingAction}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md"
                  >
                    {submittingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                    Approve Application
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submittingAction}
                    className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-rose-200"
                  >
                    Reject Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReject} className="space-y-3 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason for Rejection
                  </label>
                  <textarea
                    required
                    placeholder="Provide a detailed reason so the applicant can resolve the issue..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none min-h-[80px]"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-75 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {submittingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirm Rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Riders = ({ defaultStatus = 'all' }) => {
  const [riders, setRiders] = useState([]);
  const [totalRiders, setTotalRiders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [selectedRider, setSelectedRider] = useState(null);

  const fetchRidersList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getRiders({
        page: currentPage,
        limit: 10,
        status: statusFilter,
      });

      if (data?.success) {
        setRiders(data.riders);
        setTotalRiders(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching riders:', err);
      toast.error('Failed to load riders list');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    setStatusFilter(defaultStatus);
    setCurrentPage(1);
  }, [defaultStatus]);

  useEffect(() => {
    fetchRidersList();
  }, [fetchRidersList]);

  const handleApproveRider = async (id) => {
    try {
      const response = await userService.reviewRider(id, 'approved');
      toast.success(response.message || 'Rider application approved!');
      fetchRidersList();
    } catch (err) {
      toast.error(err.message || 'Failed to approve application.');
    }
  };

  const handleRejectRider = async (id, reason) => {
    try {
      const response = await userService.reviewRider(id, 'rejected', reason);
      toast.success(response.message || 'Rider application rejected.');
      fetchRidersList();
    } catch (err) {
      toast.error(err.message || 'Failed to reject application.');
    }
  };

  const filteredRiders = riders.filter((rider) => {
    const query = search.toLowerCase();
    const fullName = `${rider.firstName} ${rider.lastName}`.toLowerCase();
    return (
      fullName.includes(query) ||
      rider.email.toLowerCase().includes(query) ||
      (rider.phone && rider.phone.includes(query)) ||
      (rider.riderDetails?.phone && rider.riderDetails.phone.includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            Rider Approvals & Partners
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review applicant documentation, verify vehicle details, and manage active logistics
            partners.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Total Applicant Entries
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalRiders}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm border-l-amber-500 border-l-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Pending Review
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-1">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              riders.filter((r) => r.riderStatus === 'pending').length
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm border-l-green-500 border-l-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Active Approved Riders
          </p>
          <p className="text-2xl font-black text-green-600 dark:text-green-500 mt-1">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              riders.filter((r) => r.riderStatus === 'approved').length
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm border-l-rose-500 border-l-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Rejected Entries
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-500 mt-1">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              riders.filter((r) => r.riderStatus === 'rejected').length
            )}
          </p>
        </div>
      </div>

      {/* Main Filter & Table Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rider name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <ListFilter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Status:
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Applicants</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading riders database...</p>
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-xs">No rider records found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200/60 dark:border-slate-800">
                  <th className="p-4">Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Vehicle Type</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRiders.map((rider) => (
                  <tr
                    key={rider._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-xs"
                  >
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                      {rider.firstName} {rider.lastName}
                    </td>
                    <td className="p-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <div className="font-semibold">{rider.email}</div>
                      <div className="text-[10px] text-slate-400">
                        {rider.riderDetails?.phone || rider.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 capitalize text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        {rider.riderDetails?.vehicleType === 'car' ? (
                          <Car className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Bike className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{rider.riderDetails?.vehicleType || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500">
                      {rider.riderDetails?.appliedAt
                        ? new Date(rider.riderDetails.appliedAt).toLocaleDateString()
                        : new Date(rider.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          rider.riderStatus === 'approved'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400'
                            : rider.riderStatus === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                        }`}
                      >
                        {rider.riderStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedRider(rider)}
                        className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-lg font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="py-1 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg font-bold text-[10px] cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="py-1 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg font-bold text-[10px] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {selectedRider && (
        <RiderDetailsModal
          rider={selectedRider}
          onClose={() => setSelectedRider(null)}
          onApprove={handleApproveRider}
          onReject={handleRejectRider}
          showActions={true}
        />
      )}
    </div>
  );
};

export default Riders;
