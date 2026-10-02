import React, { useState, useEffect } from 'react';
import {
  Search,
  ListFilter,
  ArrowDownUp,
  Store,
  XCircle,
  Clock,
  X,
  MapPin,
  Building2,
  Phone,
  Mail,
  FileText,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  CheckSquare,
  XSquare,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { businessService } from '../../services';
import toast from 'react-hot-toast';

// Vendor Details Modal Component
const VendorDetailsModal = ({
  vendor,
  onClose,
  onApprove,
  onReject,
  onRequestInfo,
  onRescind,
  showActions = false,
}) => {
  const [actionNote, setActionNote] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(null);

  const handleAction = (action) => {
    if (action === 'approve') {
      onApprove(vendor.id, actionNote);
    } else if (action === 'reject') {
      onReject(vendor.id, actionNote);
    } else if (action === 'requestInfo') {
      onRequestInfo(vendor.id, actionNote);
    } else if (action === 'rescind') {
      onRescind(vendor.id, actionNote);
    }
    setActionNote('');
    setShowActionDialog(null);
    onClose();
  };

  const handleDocumentClick = (doc) => {
    // In a real app, this would open the document in a viewer or download it
    window.open(doc, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50 my-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{vendor.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vendor Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  vendor.status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : vendor.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : vendor.status === 'moreInfoRequested'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {vendor.status === 'moreInfoRequested'
                  ? 'More Info Requested'
                  : vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
              </span>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Business Type
                </p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-solid" />
                  <p className="text-sm text-slate-800 dark:text-white">{vendor.businessType}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-solid" />
                  <p className="text-sm text-slate-800 dark:text-white">{vendor.location}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-solid" />
                  <p className="text-sm text-slate-800 dark:text-white">{vendor.phone}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-solid" />
                  <p className="text-sm text-slate-800 dark:text-white">{vendor.email}</p>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Business Registration
                </p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-solid" />
                  <p className="text-sm text-slate-800 dark:text-white">
                    {vendor.businessRegistration}
                  </p>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Address</p>
                <p className="text-sm text-slate-800 dark:text-white">{vendor.address}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</p>
              <p className="text-sm text-slate-800 dark:text-white">{vendor.description}</p>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Submitted Documents
              </p>
              <div className="flex flex-wrap gap-2">
                {vendor.documents.map((doc, index) => (
                  <button
                    key={index}
                    onClick={() => handleDocumentClick(doc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-solid/10 text-solid rounded-lg text-xs hover:bg-solid/20 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    {doc}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Bank Details</p>
              <p className="text-sm text-slate-800 dark:text-white">{vendor.bankDetails}</p>
            </div>

            {/* Contact Person Details */}
            {vendor.contactPerson && (
              <div className="p-4 bg-solid/5 dark:bg-solid/10 rounded-lg border border-solid/20 dark:border-solid/30">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeCheck className="w-5 h-5 text-solid" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    Contact Person Details
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Full Name
                    </p>
                    <p className="text-sm text-slate-800 dark:text-white font-medium">
                      {vendor.contactPerson.fullName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Role</p>
                    <p className="text-sm text-slate-800 dark:text-white">
                      {vendor.contactPerson.role}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Email Address
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-solid" />
                      <p className="text-sm text-slate-800 dark:text-white">
                        {vendor.contactPerson.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Mobile Number
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-solid" />
                      <p className="text-sm text-slate-800 dark:text-white">
                        {vendor.contactPerson.mobile}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Submission Date
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-800 dark:text-white">
                    {new Date(vendor.submissionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {vendor.approvedDate && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Approved Date
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-slate-800 dark:text-white">
                      {new Date(vendor.approvedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {vendor.rejectedDate && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Rejected Date
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-slate-800 dark:text-white">
                      {new Date(vendor.rejectedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {vendor.rejectionReason && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs font-medium text-red-800 dark:text-red-400 mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{vendor.rejectionReason}</p>
              </div>
            )}

            {vendor.infoRequestedMessage && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">
                  Information Requested
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {vendor.infoRequestedMessage}
                </p>
                {vendor.infoRequestedDate && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Requested on: {new Date(vendor.infoRequestedDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && vendor.status === 'pending' && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-6 border-t border-slate-200/50 dark:border-slate-700/50">
            {showActionDialog ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  {showActionDialog === 'approve'
                    ? 'Approve Vendor'
                    : showActionDialog === 'reject'
                      ? 'Reject Vendor'
                      : 'Request More Information'}
                </p>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    showActionDialog === 'approve'
                      ? 'Add approval notes (optional)'
                      : showActionDialog === 'reject'
                        ? 'Reason for rejection'
                        : 'Specify what information is needed'
                  }
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all resize-none"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(showActionDialog)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
                      showActionDialog === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : showActionDialog === 'reject'
                          ? 'bg-red-600 hover:bg-red-700'
                          : showActionDialog === 'rescind'
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-solid hover:bg-tertiary'
                    }`}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowActionDialog(null);
                      setActionNote('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowActionDialog('approve')}
                  className="flex items-center gap-2 flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setShowActionDialog('reject')}
                  className="flex items-center gap-2 flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <XSquare className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setShowActionDialog('requestInfo')}
                  className="flex items-center gap-2 flex-1 px-4 py-2 bg-solid hover:bg-tertiary text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  Request Info
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rescind Approval Button for Approved Vendors */}
        {vendor.status === 'approved' && onRescind && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-6 border-t border-slate-200/50 dark:border-slate-700/50">
            {showActionDialog === 'rescind' ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  Rescind Vendor Approval
                </p>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Reason for rescinding approval"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all resize-none"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('rescind')}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-orange-600 hover:bg-orange-700 cursor-pointer"
                  >
                    Confirm Rescind
                  </button>
                  <button
                    onClick={() => {
                      setShowActionDialog(null);
                      setActionNote('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowActionDialog('rescind')}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Rescind Approval
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const AllVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const itemsPerPage = 10;

  // Fetch all businesses from API
  useEffect(() => {
    let isMounted = true;
    const loadBusinesses = async () => {
      setLoading(true);
      try {
        const filters = { page: currentPage, limit: itemsPerPage, status: 'all' };
        if (statusFilter !== 'all') {
          filters.status = statusFilter === 'approved' ? 'active' : statusFilter;
        }
        const response = await businessService.getBusinesses(filters);
        if (!isMounted) return;
        const transformedVendors = (response.businesses || []).map((business) => ({
          id: business._id,
          name: business.name,
          location: business.address?.city || business.address?.text || 'N/A',
          businessType: business.type || 'Other',
          status: business.status === 'active' ? 'approved' : business.status || 'pending',
          phone: business.phone || 'N/A',
          email: business.email || 'N/A',
          description: business.description || '',
          submissionDate: business.createdAt?.split('T')[0] || 'N/A',
          approvedDate: business.verification?.reviewedAt?.split('T')[0] || null,
          documents: business.verification?.documents?.map((d) => d.url) || [],
          address: business.address?.text || 'N/A',
          contactPerson: {
            fullName: business.owner
              ? `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim()
              : 'N/A',
            role: 'Business Owner',
            email: business.owner?.email || business.email || 'N/A',
            mobile: business.owner?.phone || business.phone || 'N/A',
          },
        }));
        setVendors(transformedVendors);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching businesses:', error);
        toast.error('Failed to fetch businesses');
        setVendors([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadBusinesses();
    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const filters = { page: currentPage, limit: itemsPerPage, status: 'all' };
      if (statusFilter !== 'all') {
        filters.status = statusFilter === 'approved' ? 'active' : statusFilter;
      }
      const response = await businessService.getBusinesses(filters);
      const transformedVendors = (response.businesses || []).map((business) => ({
        id: business._id,
        name: business.name,
        location: business.address?.city || business.address?.text || 'N/A',
        businessType: business.type || 'Other',
        status: business.status === 'active' ? 'approved' : business.status || 'pending',
        phone: business.phone || 'N/A',
        email: business.email || 'N/A',
        description: business.description || '',
        submissionDate: business.createdAt?.split('T')[0] || 'N/A',
        approvedDate: business.verification?.reviewedAt?.split('T')[0] || null,
        documents: business.verification?.documents?.map((d) => d.url) || [],
        address: business.address?.text || 'N/A',
        contactPerson: {
          fullName: business.owner
            ? `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim()
            : 'N/A',
          role: 'Business Owner',
          email: business.owner?.email || business.email || 'N/A',
          mobile: business.owner?.phone || business.phone || 'N/A',
        },
      }));
      setVendors(transformedVendors);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Failed to fetch businesses');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle vendor approval
  const handleApprove = async (vendorId, note) => {
    try {
      await businessService.approveBusiness(vendorId, note);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? { ...v, status: 'approved', approvedDate: new Date().toISOString().split('T')[0] }
            : v
        )
      );
      setSelectedVendor(null);
      toast.success('Business approved successfully. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error approving business:', error);
      toast.error(error.message || 'Failed to approve business');
    }
  };

  // Handle vendor rejection
  const handleReject = async (vendorId, reason) => {
    try {
      await businessService.rejectBusiness(vendorId, reason);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                status: 'rejected',
                rejectedDate: new Date().toISOString().split('T')[0],
                rejectionReason: reason,
              }
            : v
        )
      );
      setSelectedVendor(null);
      toast.success('Business rejected. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error rejecting business:', error);
      toast.error(error.message || 'Failed to reject business');
    }
  };

  // Handle request more info
  const handleRequestInfo = async (vendorId, message) => {
    try {
      await businessService.requestMoreInfo(vendorId, message);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                status: 'moreInfoRequested',
                infoRequestedDate: new Date().toISOString(),
                infoRequestedMessage: message,
              }
            : v
        )
      );
      setSelectedVendor(null);
      toast.success('Information request sent. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error requesting info:', error);
      toast.error(error.message || 'Failed to send request');
    }
  };

  // Handle vendor rescind
  const handleRescind = async (vendorId, reason) => {
    try {
      await businessService.rescindBusiness(vendorId, reason);
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, status: 'pending', approvedDate: null } : v))
      );
      setSelectedVendor(null);
      toast.success('Vendor approval rescinded. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error rescinding business:', error);
      toast.error(error.message || 'Failed to rescind vendor approval');
    }
  };

  // Get unique business types and locations for filter
  const businessTypes = ['all', ...new Set(vendors.map((v) => v.businessType))];
  const locations = ['all', ...new Set(vendors.map((v) => v.location))];

  // Calculate stats
  const stats = {
    approved: vendors.filter((v) => v.status === 'approved').length,
    pending: vendors.filter((v) => v.status === 'pending').length,
    approvedThisWeek: vendors.filter((v) => {
      if (v.status === 'approved' && v.approvedDate) {
        const approvedDate = new Date(v.approvedDate);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return approvedDate >= oneWeekAgo;
      }
      return false;
    }).length,
    rejectedThisWeek: vendors.filter((v) => {
      if (v.status === 'rejected' && v.rejectedDate) {
        const rejectedDate = new Date(v.rejectedDate);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return rejectedDate >= oneWeekAgo;
      }
      return false;
    }).length,
  };

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.businessType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      const matchesBusinessType =
        businessTypeFilter === 'all' || vendor.businessType === businessTypeFilter;
      const matchesLocation = locationFilter === 'all' || vendor.location === locationFilter;
      return matchesSearch && matchesStatus && matchesBusinessType && matchesLocation;
    })
    .sort((a, b) => {
      let aValue, bValue;
      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === 'date') {
        aValue = new Date(a.submissionDate);
        bValue = new Date(b.submissionDate);
      } else if (sortBy === 'location') {
        aValue = a.location.toLowerCase();
        bValue = b.location.toLowerCase();
      } else if (sortBy === 'businessType') {
        aValue = a.businessType.toLowerCase();
        bValue = b.businessType.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = filteredVendors.slice(startIndex, endIndex);
  const showingFrom = filteredVendors.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredVendors.length);

  const statsCards = [
    {
      title: 'Approved Vendors',
      value: stats.approved,
      icon: <BadgeCheck className="w-6 h-6" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Pending Applications',
      value: stats.pending,
      icon: <Clock className="w-6 h-6" />,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Approved This Week',
      value: stats.approvedThisWeek,
      icon: <Store className="w-6 h-6" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Rejected This Week',
      value: stats.rejectedThisWeek,
      icon: <XCircle className="w-6 h-6" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              </div>
              <div
                className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-all duration-300`}
              >
                <div className={stat.iconColor}>{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter Section */}
      <div className="relative z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ListFilter className="w-4 h-4" />
                Filter
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="moreInfoRequested">More Info Requested</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Business Type
                    </label>
                    <select
                      value={businessTypeFilter}
                      onChange={(e) => setBusinessTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === 'all' ? 'All Types' : type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location
                    </label>
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc === 'all' ? 'All Locations' : loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setBusinessTypeFilter('all');
                      setLocationFilter('all');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ArrowDownUp className="w-4 h-4" />
                Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      <option value="name">Name</option>
                      <option value="date">Submission Date</option>
                      <option value="location">Location</option>
                      <option value="businessType">Business Type</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">All Vendors</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage vendor accounts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Business Type
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {currentVendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-solid/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-solid" />
                      </div>
                      <span className="text-xs font-medium text-slate-900 dark:text-white">
                        {vendor.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {vendor.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {vendor.businessType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        vendor.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : vendor.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : vendor.status === 'moreInfoRequested'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {vendor.status === 'moreInfoRequested'
                        ? 'More Info Requested'
                        : vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredVendors.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Showing {showingFrom} to {showingTo} of {filteredVendors.length} vendors
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>

              {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filteredVendors.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No vendors found</p>
          </div>
        )}
      </div>

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <VendorDetailsModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestInfo={handleRequestInfo}
          onRescind={handleRescind}
          showActions={
            selectedVendor.status === 'pending' || selectedVendor.status === 'moreInfoRequested'
          }
        />
      )}
    </div>
  );
};

export const VendorApproval = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const itemsPerPage = 10;

  // Fetch pending businesses from API
  useEffect(() => {
    let isMounted = true;
    const loadPendingBusinesses = async () => {
      setLoading(true);
      try {
        const response = await businessService.getPendingBusinesses({
          page: currentPage,
          limit: itemsPerPage,
        });
        if (!isMounted) return;
        const transformedVendors = (response.businesses || []).map((business) => ({
          id: business._id,
          name: business.name,
          location: business.address?.city || business.address?.text || 'N/A',
          businessType: business.type || 'Other',
          status:
            business.verification?.status === 'unverified'
              ? 'pending'
              : business.verification?.status || 'pending',
          phone: business.phone || 'N/A',
          email: business.email || 'N/A',
          description: business.description || '',
          businessRegistration: business.verification?.documents?.[0]?.url || 'N/A',
          submissionDate:
            business.verification?.submittedAt?.split('T')[0] ||
            business.createdAt?.split('T')[0] ||
            'N/A',
          documents: business.verification?.documents?.map((d) => d.url) || [],
          address: business.address?.text || 'N/A',
          contactPerson: {
            fullName: business.owner
              ? `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim()
              : 'N/A',
            role: 'Business Owner',
            email: business.owner?.email || business.email || 'N/A',
            mobile: business.owner?.phone || business.phone || 'N/A',
          },
        }));
        setVendors(transformedVendors);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching pending businesses:', error);
        toast.error('Failed to fetch pending applications');
        setVendors([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadPendingBusinesses();
    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const fetchPendingBusinesses = async () => {
    setLoading(true);
    try {
      const response = await businessService.getPendingBusinesses({
        page: currentPage,
        limit: itemsPerPage,
      });
      const transformedVendors = (response.businesses || []).map((business) => ({
        id: business._id,
        name: business.name,
        location: business.address?.city || business.address?.text || 'N/A',
        businessType: business.type || 'Other',
        status:
          business.verification?.status === 'unverified'
            ? 'pending'
            : business.verification?.status || 'pending',
        phone: business.phone || 'N/A',
        email: business.email || 'N/A',
        description: business.description || '',
        businessRegistration: business.verification?.documents?.[0]?.url || 'N/A',
        submissionDate:
          business.verification?.submittedAt?.split('T')[0] ||
          business.createdAt?.split('T')[0] ||
          'N/A',
        documents: business.verification?.documents?.map((d) => d.url) || [],
        address: business.address?.text || 'N/A',
        contactPerson: {
          fullName: business.owner
            ? `${business.owner.firstName || ''} ${business.owner.lastName || ''}`.trim()
            : 'N/A',
          role: 'Business Owner',
          email: business.owner?.email || business.email || 'N/A',
          mobile: business.owner?.phone || business.phone || 'N/A',
        },
      }));
      setVendors(transformedVendors);
    } catch (error) {
      console.error('Error fetching pending businesses:', error);
      toast.error('Failed to fetch pending applications');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique business types and locations for filter
  const businessTypes = ['all', ...new Set(vendors.map((v) => v.businessType))];
  const locations = ['all', ...new Set(vendors.map((v) => v.location))];

  // Handle vendor approval
  const handleApprove = async (vendorId, note) => {
    try {
      await businessService.approveBusiness(vendorId, note);
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
      setSelectedVendor(null);
      toast.success('Business approved successfully. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error approving business:', error);
      toast.error(error.message || 'Failed to approve business');
    }
  };

  // Handle vendor rejection
  const handleReject = async (vendorId, reason) => {
    try {
      await businessService.rejectBusiness(vendorId, reason);
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
      setSelectedVendor(null);
      toast.success('Business rejected. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error rejecting business:', error);
      toast.error(error.message || 'Failed to reject business');
    }
  };

  // Handle request more info
  const handleRequestInfo = async (vendorId, message) => {
    try {
      await businessService.requestMoreInfo(vendorId, message);
      // Update the vendor status locally instead of removing
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                status: 'moreInfoRequested',
                infoRequestedMessage: message,
                infoRequestedDate: new Date().toISOString(),
              }
            : v
        )
      );
      setSelectedVendor(null);
      toast.success('Information request sent. Email notification sent to vendor.');
    } catch (error) {
      console.error('Error requesting info:', error);
      toast.error(error.message || 'Failed to send request');
    }
  };

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.businessType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBusinessType =
        businessTypeFilter === 'all' || vendor.businessType === businessTypeFilter;
      const matchesLocation = locationFilter === 'all' || vendor.location === locationFilter;
      return matchesSearch && matchesBusinessType && matchesLocation;
    })
    .sort((a, b) => {
      let aValue, bValue;
      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === 'date') {
        aValue = new Date(a.submissionDate);
        bValue = new Date(b.submissionDate);
      } else if (sortBy === 'location') {
        aValue = a.location.toLowerCase();
        bValue = b.location.toLowerCase();
      } else if (sortBy === 'businessType') {
        aValue = a.businessType.toLowerCase();
        bValue = b.businessType.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = filteredVendors.slice(startIndex, endIndex);
  const showingFrom = filteredVendors.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredVendors.length);

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="relative z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search pending applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ListFilter className="w-4 h-4" />
                Filter
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Business Type
                    </label>
                    <select
                      value={businessTypeFilter}
                      onChange={(e) => setBusinessTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === 'all' ? 'All Types' : type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location
                    </label>
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc === 'all' ? 'All Locations' : loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setBusinessTypeFilter('all');
                      setLocationFilter('all');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ArrowDownUp className="w-4 h-4" />
                Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-60 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      <option value="name">Name</option>
                      <option value="date">Submission Date</option>
                      <option value="location">Location</option>
                      <option value="businessType">Business Type</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid cursor-pointer"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Applications Table */}
      <div className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Pending Applications
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review and approve vendor applications
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Submission Date
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Business Type
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {currentVendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-solid/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-solid" />
                      </div>
                      <span className="text-xs font-medium text-slate-900 dark:text-white">
                        {vendor.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(vendor.submissionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {vendor.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {vendor.businessType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        vendor.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {vendor.status === 'moreInfoRequested' ? 'More Info Requested' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredVendors.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Showing {showingFrom} to {showingTo} of {filteredVendors.length} applications
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>

              {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filteredVendors.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No pending applications</p>
          </div>
        )}
      </div>

      {/* Vendor Details Modal with Actions */}
      {selectedVendor && (
        <VendorDetailsModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestInfo={handleRequestInfo}
          showActions={true}
        />
      )}
    </div>
  );
};
