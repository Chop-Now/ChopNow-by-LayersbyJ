import React, { useState, useEffect } from 'react';
import { useAdminMode } from '../context/AdminModeContext';
import { payoutService, businessService } from '../../services';
import LoadingSpinner from '../../Components/ui/LoadingSpinner';
import {
  Pencil,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  Smartphone,
  Building2,
  AlertCircle,
  History,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Shop Admin Payouts Component
const ShopAdminPayouts = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState('bank'); // 'bank' or 'mobile'
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showMobileNumber, setShowMobileNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [summary, setSummary] = useState({
    balance: 0,
    availableBalance: 0,
    heldAmount: 0,
    releases: [],
    pendingAmount: 0,
    minimumWithdrawal: 5000,
    holdDays: 0,
    intervalDays: 0,
    nextRequestAt: null,
  });
  const [requestForm, setRequestForm] = useState({ open: false, amount: '', submitting: false });
  const [showLedger, setShowLedger] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    swiftCode: '',
    mobileProvider: 'MTN',
    mobilePhone: '',
    mobileAccountName: '',
  });

  // Fetch business info and payouts on mount
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const businessData = await businessService.getMyBusiness();
        if (!isMounted) return;
        setBusiness(businessData);

        if (businessData.payoutInfo) {
          const info = businessData.payoutInfo;
          setFormData({
            bankName: info.bankName || '',
            accountHolder: info.accountHolder || '',
            accountNumber: info.accountNumber || '',
            swiftCode: info.swiftCode || '',
            mobileProvider: info.mobileProvider || 'MTN',
            mobilePhone: info.mobilePhone || '',
            mobileAccountName: info.mobileAccountName || '',
          });
          setPreferredMethod(info.preferredMethod || 'bank');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch business info:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    fetchPayouts(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  // Balance, pending requests and history come from one call.
  const fetchPayouts = async (isMounted = () => true) => {
    try {
      setPayoutsLoading(true);
      const data = await payoutService.getMyPayouts();
      if (!isMounted()) return;
      setRecentPayouts(data.payouts || []);
      setSummary({
        balance: data.balance || 0,
        availableBalance: data.availableBalance ?? data.balance ?? 0,
        heldAmount: data.heldAmount || 0,
        releases: data.releases || [],
        pendingAmount: data.pendingAmount || 0,
        minimumWithdrawal: data.minimumWithdrawal || 5000,
        holdDays: data.holdDays || 0,
        intervalDays: data.intervalDays || 0,
        nextRequestAt: data.nextRequestAt || null,
      });
    } catch (error) {
      if (!isMounted()) return;
      console.error('Failed to fetch payouts:', error);
      setRecentPayouts([]);
    } finally {
      if (isMounted()) setPayoutsLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const data = await payoutService.getLedger();
      setLedger(data.entries || []);
    } catch (error) {
      console.error('Failed to fetch balance history:', error);
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const hasPayoutDetails =
    preferredMethod === 'mobile'
      ? !!formData.mobilePhone?.trim()
      : !!formData.accountNumber?.trim() && !!formData.bankName?.trim();

  const openRequestForm = () => {
    if (!hasPayoutDetails) {
      toast.error('Add your payout details below (and save) before requesting a payout');
      setIsEditing(true);
      return;
    }
    if (summary.nextRequestAt) {
      toast.error(
        `You can request one payout every ${summary.intervalDays} days. Next request possible ${formatDate(summary.nextRequestAt)}.`
      );
      return;
    }
    setRequestForm({ open: true, amount: String(summary.availableBalance), submitting: false });
  };

  const submitPayoutRequest = async () => {
    const amount = Number(requestForm.amount);
    if (!amount || amount < summary.minimumWithdrawal || amount > summary.availableBalance) {
      toast.error(
        `Enter an amount between ${formatAmount(summary.minimumWithdrawal)} and ${formatAmount(summary.availableBalance)}`
      );
      return;
    }
    setRequestForm((f) => ({ ...f, submitting: true }));
    try {
      await payoutService.requestPayout({ amount, method: preferredMethod });
      toast.success('Payout requested. ChopNow will send it to your payout method.');
      setRequestForm({ open: false, amount: '', submitting: false });
      await fetchPayouts();
    } catch (error) {
      toast.error(error.message || 'Could not request payout');
      setRequestForm((f) => ({ ...f, submitting: false }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const payoutInfo = {
        ...formData,
        preferredMethod,
      };
      await businessService.updateMyBusiness({ payoutInfo });
      toast.success('Payout settings updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update payout settings');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (business?.payoutInfo) {
      const info = business.payoutInfo;
      setFormData({
        bankName: info.bankName || '',
        accountHolder: info.accountHolder || '',
        accountNumber: info.accountNumber || '',
        swiftCode: info.swiftCode || '',
        mobileProvider: info.mobileProvider || 'MTN',
        mobilePhone: info.mobilePhone || '',
        mobileAccountName: info.mobileAccountName || '',
      });
      setPreferredMethod(info.preferredMethod || 'bank');
    }
    setIsEditing(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format amount for display
  const formatAmount = (amount) => {
    return `RWF ${amount?.toLocaleString() || 0}`;
  };

  const maskAccountNumber = (number) => {
    if (!number) return '';
    // Handle numbers shorter than 4 characters
    if (number.length <= 4) return number;
    return '•'.repeat(number.length - 4) + number.slice(-4);
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      requested: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      cancelled: 'bg-fufu-dim text-moringa-muted dark:bg-slate-800 dark:text-slate-400',
    };

    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-22 ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moringa dark:text-white">Payment Settings</h1>
          <p className="text-moringa-muted dark:text-slate-400 mt-1">
            Manage your payout methods and view payment history
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-4 py-2.5 bg-solid hover:bg-tertiary text-white rounded-lg transition-colors font-medium text-sm cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
          Update Info
        </button>
      </div>

      {/* Balance & payout request */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-moringa-muted dark:text-slate-400">Your balance</p>
              <p className="text-3xl font-bold text-moringa dark:text-white">
                {payoutsLoading ? '…' : formatAmount(summary.balance)}
              </p>
              {!payoutsLoading && summary.heldAmount > 0 && (
                <p className="text-sm text-moringa-muted dark:text-slate-400 mt-0.5">
                  {formatAmount(summary.availableBalance)} ready to withdraw right now
                </p>
              )}
              <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1">
                Your earnings from completed mobile-money orders, after ChopNow&apos;s fee.
                {summary.pendingAmount > 0 &&
                  ` ${formatAmount(summary.pendingAmount)} already requested and on its way.`}
              </p>
              {summary.heldAmount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-start gap-1">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {summary.availableBalance > 0
                      ? `${formatAmount(summary.availableBalance)} is ready to pay out now - the rest, ${formatAmount(summary.heldAmount)}, is still settling`
                      : `Nothing is ready to cash out just yet - ${formatAmount(summary.heldAmount)} is still settling from a recent order`}
                    {summary.releases?.[0]
                      ? ` and unlocks ${formatDate(summary.releases[0].availableAt)}`
                      : ''}
                    {summary.holdDays
                      ? `. New earnings are held ${summary.holdDays} day${summary.holdDays === 1 ? '' : 's'} so there's time to catch any refunds first.`
                      : ''}
                  </span>
                </p>
              )}
              {summary.nextRequestAt && (
                <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Next payout request possible {formatDate(summary.nextRequestAt)} (one every{' '}
                  {summary.intervalDays} days)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={openRequestForm}
            disabled={
              payoutsLoading ||
              summary.availableBalance < summary.minimumWithdrawal ||
              !!summary.nextRequestAt
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-solid hover:bg-tertiary text-white rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request payout
          </button>
        </div>
        {!payoutsLoading &&
          !summary.nextRequestAt &&
          summary.availableBalance < summary.minimumWithdrawal && (
            <p className="text-xs text-moringa-muted dark:text-slate-400 mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              You can request a payout once your available balance reaches{' '}
              {formatAmount(summary.minimumWithdrawal)}.
            </p>
          )}

        {requestForm.open && (
          <div className="mt-4 pt-4 border-t border-hairline dark:border-slate-700 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-moringa dark:text-slate-300 mb-1">
                Amount (RWF)
              </label>
              <input
                type="number"
                min={summary.minimumWithdrawal}
                max={summary.availableBalance}
                value={requestForm.amount}
                onChange={(e) => setRequestForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-40 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-moringa dark:text-slate-200"
              />
            </div>
            <p className="text-xs text-moringa-muted dark:text-slate-400 pb-2">
              Sent to your {preferredMethod === 'mobile' ? 'mobile money number' : 'bank account'}{' '}
              below.
            </p>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setRequestForm({ open: false, amount: '', submitting: false })}
                className="px-4 py-2 text-sm border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitPayoutRequest}
                disabled={requestForm.submitting}
                className="px-4 py-2 text-sm bg-solid hover:bg-tertiary text-white rounded-lg font-medium disabled:opacity-50"
              >
                {requestForm.submitting ? 'Requesting…' : 'Confirm request'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout Method Form */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <h2 className="text-lg font-semibold text-moringa dark:text-white mb-4">Payout Method</h2>

        {/* Preferred Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-3">
            Preferred Payout Method
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setPreferredMethod('bank')}
              disabled={!isEditing}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                preferredMethod === 'bank'
                  ? 'border-solid bg-solid/10 text-solid dark:bg-solid/20'
                  : 'border-moringa/25 dark:border-slate-600 text-moringa-muted dark:text-slate-400'
              } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-solid'}`}
            >
              Bank Account
            </button>
            <button
              onClick={() => setPreferredMethod('mobile')}
              disabled={!isEditing}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                preferredMethod === 'mobile'
                  ? 'border-solid bg-solid/10 text-solid dark:bg-solid/20'
                  : 'border-moringa/25 dark:border-slate-600 text-moringa-muted dark:text-slate-400'
              } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-solid'}`}
            >
              Mobile Money
            </button>
          </div>
        </div>

        {/* Bank Account Details */}
        <div className={`space-y-4 pb-6 ${preferredMethod !== 'bank' ? 'opacity-40' : ''}`}>
          <h3 className="text-base font-medium text-moringa dark:text-white">
            Bank Account Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                disabled={!isEditing || preferredMethod !== 'bank'}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                name="accountHolder"
                value={formData.accountHolder}
                onChange={handleInputChange}
                disabled={!isEditing || preferredMethod !== 'bank'}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Account Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="accountNumber"
                  value={
                    showAccountNumber
                      ? formData.accountNumber
                      : maskAccountNumber(formData.accountNumber)
                  }
                  onChange={handleInputChange}
                  disabled={!isEditing || preferredMethod !== 'bank'}
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-moringa-muted hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showAccountNumber ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                SWIFT/BIC Code
              </label>
              <input
                type="text"
                name="swiftCode"
                value={formData.swiftCode}
                onChange={handleInputChange}
                disabled={!isEditing || preferredMethod !== 'bank'}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-hairline dark:border-slate-700 my-6"></div>

        {/* Mobile Money Details */}
        <div className={`space-y-4 ${preferredMethod !== 'mobile' ? 'opacity-40' : ''}`}>
          <h3 className="text-base font-medium text-moringa dark:text-white">Mobile Money</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Provider
              </label>
              <select
                name="mobileProvider"
                value={formData.mobileProvider}
                onChange={handleInputChange}
                disabled={!isEditing || preferredMethod !== 'mobile'}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              >
                <option value="MTN">MTN</option>
                <option value="Vodafone">Vodafone</option>
                <option value="Airtel">Airtel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Account Name
              </label>
              <input
                type="text"
                name="mobileAccountName"
                value={formData.mobileAccountName}
                onChange={handleInputChange}
                disabled={!isEditing || preferredMethod !== 'mobile'}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="mobilePhone"
                  value={
                    showMobileNumber
                      ? formData.mobilePhone
                      : maskAccountNumber(formData.mobilePhone)
                  }
                  onChange={handleInputChange}
                  disabled={!isEditing || preferredMethod !== 'mobile'}
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowMobileNumber(!showMobileNumber)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-moringa-muted hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showMobileNumber ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-hairline dark:border-slate-700">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-solid hover:bg-tertiary text-white rounded-lg transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Recent Payouts Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <h2 className="text-lg font-semibold text-moringa dark:text-white mb-4">Recent Payouts</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Payout ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {payoutsLoading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : recentPayouts.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="py-8 text-center text-moringa-muted dark:text-slate-400"
                  >
                    No payouts found
                  </td>
                </tr>
              ) : (
                recentPayouts.map((payout) => (
                  <tr
                    key={payout._id}
                    className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-moringa-muted dark:text-slate-400">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-moringa dark:text-white">
                      {payout._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-moringa dark:text-white">
                      {formatAmount(payout.amount)}
                      {payout.adjustments?.length > 0 && (
                        <span
                          className="block text-xs font-normal text-amber-600 dark:text-amber-400"
                          title={payout.adjustments
                            .map((a) => `${a.reason}: ${formatAmount(a.amount)}`)
                            .join('; ')}
                        >
                          Reduced from {formatAmount(payout.requestedAmount)} (refund)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(payout.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance History (ledger) - full transparency into every credit/debit */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-moringa dark:text-white">Balance History</h2>
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              Every order earning, refund deduction and payout that changed your balance.
            </p>
          </div>
          <button
            onClick={() => {
              setShowLedger((v) => !v);
              if (!showLedger) fetchLedger();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800"
          >
            <History className="w-4 h-4" />
            {showLedger ? 'Hide' : 'Show'} history
          </button>
        </div>

        {showLedger && (
          <div className="overflow-x-auto">
            {ledgerLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : ledger.length === 0 ? (
              <p className="py-8 text-center text-sm text-moringa-muted dark:text-slate-400">
                No balance activity yet
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline dark:border-slate-700">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-moringa dark:text-slate-300">
                      Date
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-moringa dark:text-slate-300">
                      Description
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-moringa dark:text-slate-300">
                      Amount
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-moringa dark:text-slate-300">
                      Balance after
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry._id} className="border-b border-hairline dark:border-slate-800">
                      <td className="py-2.5 px-3 text-xs text-moringa-muted dark:text-slate-400 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-moringa dark:text-slate-200">
                        {entry.description}
                        {entry.order?.orderNumber && (
                          <span className="text-moringa-muted/70 dark:text-slate-500">
                            {' '}
                            · {entry.order.orderNumber}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-xs font-semibold text-right whitespace-nowrap ${
                          entry.amount >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.amount >= 0 ? '+' : ''}
                        {formatAmount(entry.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right text-moringa dark:text-slate-300 whitespace-nowrap">
                        {formatAmount(entry.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Website Admin Payouts Component
const WebsiteAdminPayouts = () => {
  const [messageModal, setMessageModal] = useState({ open: false, vendor: null });
  const [actionModal, setActionModal] = useState({ open: false, payout: null, action: null });
  const [ledgerModal, setLedgerModal] = useState({
    open: false,
    name: '',
    entries: [],
    loading: false,
  });

  const openLedgerModal = async (owner) => {
    setLedgerModal({ open: true, name: owner.name || 'Payee', entries: [], loading: true });
    try {
      const data = await payoutService.getLedger(
        owner.business ? { business: owner.business } : { user: owner.user }
      );
      setLedgerModal((m) => ({ ...m, entries: data.entries || [], loading: false }));
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
      setLedgerModal((m) => ({ ...m, loading: false }));
    }
  };
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [allPayouts, setAllPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // pending, processing, completed, failed, all
  const [showHistory, setShowHistory] = useState(false);
  const itemsPerPage = 10;

  // Fetch all payouts on mount
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const data = await payoutService.getAllPayouts();
      setAllPayouts(data.payouts || []);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      toast.error('Failed to load payouts');
      setAllPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  // Filter payouts by status
  const pendingPayouts = allPayouts.filter((p) => p.status === 'requested');
  const processingPayouts = allPayouts.filter((p) => p.status === 'processing');
  const completedPayouts = allPayouts.filter((p) => p.status === 'completed');
  const failedPayouts = allPayouts.filter((p) => p.status === 'failed');

  // Get filtered payouts based on active tab
  const getFilteredPayouts = () => {
    switch (activeTab) {
      case 'pending':
        return pendingPayouts;
      case 'processing':
        return processingPayouts;
      case 'completed':
        return completedPayouts;
      case 'failed':
        return failedPayouts;
      case 'all':
        return allPayouts;
      default:
        return pendingPayouts;
    }
  };

  const filteredPayouts = getFilteredPayouts();

  // Calculate stats
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const mtnPayouts = pendingPayouts.filter((p) => p.method === 'mobile');
  const mtnAmount = mtnPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const bankPayouts = pendingPayouts.filter((p) => p.method === 'bank');
  const bankAmount = bankPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalFailed = failedPayouts.length;
  const totalProcessing = processingPayouts.length;

  // Format amount for display
  const formatAmount = (amount) => `RWF ${(amount || 0).toLocaleString()}`;

  // Format date
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // Pagination
  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayouts = filteredPayouts.slice(startIndex, endIndex);
  const showingFrom = filteredPayouts.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredPayouts.length);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Handle individual payout approval
  const handleApprovePayout = async (payoutId) => {
    try {
      setProcessingId(payoutId);
      await payoutService.updatePayoutStatus(payoutId, { status: 'processing' });
      toast.success('Payout approved and processing');
      await fetchPayouts();
    } catch (error) {
      toast.error(error.message || 'Failed to approve payout');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle individual payout completion
  const handleCompletePayout = async (payoutId, reference) => {
    try {
      setProcessingId(payoutId);
      await payoutService.updatePayoutStatus(payoutId, { status: 'completed', reference });
      toast.success('Payout marked as completed');
      await fetchPayouts();
      setActionModal({ open: false, payout: null, action: null });
    } catch (error) {
      toast.error(error.message || 'Failed to complete payout');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle payout rejection/failure
  const handleRejectPayout = async (payoutId, reason) => {
    try {
      setProcessingId(payoutId);
      await payoutService.updatePayoutStatus(payoutId, { status: 'failed', failureReason: reason });
      toast.success('Payout marked as failed');
      await fetchPayouts();
      setActionModal({ open: false, payout: null, action: null });
    } catch (error) {
      toast.error(error.message || 'Failed to reject payout');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReleaseMTNPayouts = async () => {
    if (mtnPayouts.length === 0) {
      toast.error('No MTN payouts to process');
      return;
    }
    try {
      for (const payout of mtnPayouts) {
        await payoutService.updatePayoutStatus(payout._id, { status: 'processing' });
      }
      toast.success(`Processing ${mtnPayouts.length} MTN payouts`);
      await fetchPayouts();
    } catch (error) {
      toast.error(error.message || 'Failed to process MTN payouts');
    }
  };

  const handleReleaseBankPayouts = async () => {
    if (bankPayouts.length === 0) {
      toast.error('No bank payouts to process');
      return;
    }
    try {
      for (const payout of bankPayouts) {
        await payoutService.updatePayoutStatus(payout._id, { status: 'processing' });
      }
      toast.success(`Processing ${bankPayouts.length} bank payouts`);
      await fetchPayouts();
    } catch (error) {
      toast.error(error.message || 'Failed to process bank payouts');
    }
  };

  const handleSendMessage = (vendor) => {
    setMessageModal({ open: true, vendor });
    setMessage('');
  };

  const handleSendMessageSubmit = () => {
    console.log(`Sending message to ${messageModal.vendor.email}: ${message}`);
    setMessageModal({ open: false, vendor: null });
    setMessage('');
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      requested: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-fufu-dim text-moringa dark:bg-slate-900/30 dark:text-slate-400',
    };
    const labels = {
      requested: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.requested}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  // Get payout method display
  // Admins send the money, so they need the full destination: the one saved
  // on the payout when it was requested (older payouts fall back to the
  // vendor's current payout details).
  const getPayoutMethodDisplay = (payout) => {
    const saved = payout.destination || {};
    const current = payout.business?.payoutInfo || {};
    if (payout.method === 'mobile') {
      const phone = saved.phone || current.mobilePhone || payout.user?.phone;
      const name = saved.accountName || current.mobileAccountName;
      return {
        type: `Mobile Money (${saved.provider || current.mobileProvider || 'MTN'})`,
        details: phone
          ? `${phone}${name ? ` · ${name}` : ''}`
          : 'No mobile money number on file - contact the payee',
      };
    }
    const accountNumber = saved.accountNumber || current.accountNumber;
    return {
      type: `Bank (${saved.bankName || current.bankName || 'bank not set'})`,
      details: accountNumber
        ? `${accountNumber} · ${saved.accountHolder || current.accountHolder || ''}`
        : 'No bank account on file - contact the payee',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-moringa dark:text-white">Payout Management</h1>
          <p className="text-moringa-muted dark:text-slate-400 mt-1">
            Review and approve vendor payout requests
          </p>
        </div>
        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div
          className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group cursor-pointer"
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Pending Approval
              </p>
              <p className="text-xl font-bold text-moringa dark:text-white mb-2">
                RWF {totalPendingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-moringa-muted dark:text-slate-400">
                {pendingPayouts.length} requests
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 group-hover:scale-110 transition-all duration-300">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Processing */}
        <div
          className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group cursor-pointer"
          onClick={() => setActiveTab('processing')}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Processing
              </p>
              <p className="text-xl font-bold text-moringa dark:text-white mb-2">
                {totalProcessing}
              </p>
              <p className="text-xs text-moringa-muted dark:text-slate-400">Awaiting completion</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 group-hover:scale-110 transition-all duration-300">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Mobile Money */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Mobile Money (Pending)
              </p>
              <p className="text-xl font-bold text-moringa dark:text-white mb-2">
                RWF {mtnAmount.toLocaleString()}
              </p>
              <p className="text-xs text-moringa-muted dark:text-slate-400">
                {mtnPayouts.length} requests
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 group-hover:scale-110 transition-all duration-300">
              <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Failed */}
        <div
          className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group cursor-pointer"
          onClick={() => setActiveTab('failed')}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Failed
              </p>
              <p className="text-xl font-bold text-moringa dark:text-white mb-2">{totalFailed}</p>
              <p className="text-xs text-moringa-muted dark:text-slate-400">Requires attention</p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 group-hover:scale-110 transition-all duration-300">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Batch Action Buttons (only show for pending tab) */}
      {activeTab === 'pending' && pendingPayouts.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleReleaseMTNPayouts}
            disabled={mtnPayouts.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Smartphone className="w-4 h-4" />
            Approve All Mobile Money ({mtnPayouts.length})
          </button>
          <button
            onClick={handleReleaseBankPayouts}
            disabled={bankPayouts.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Building2 className="w-4 h-4" />
            Approve All Bank Transfers ({bankPayouts.length})
          </button>
        </div>
      )}

      {/* Tabs and Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-hairline dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'pending', label: 'Pending', count: pendingPayouts.length },
            { id: 'processing', label: 'Processing', count: processingPayouts.length },
            { id: 'completed', label: 'Completed', count: completedPayouts.length },
            { id: 'failed', label: 'Failed', count: failedPayouts.length },
            { id: 'all', label: 'All', count: allPayouts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-solid text-white'
                  : 'text-moringa-muted dark:text-slate-400 hover:bg-fufu dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-hairline dark:bg-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Vendor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Method
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : currentPayouts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-12 text-center text-moringa-muted dark:text-slate-400"
                    >
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  currentPayouts.map((payout) => {
                    const methodInfo = getPayoutMethodDisplay(payout);
                    return (
                      <tr
                        key={payout._id}
                        className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-moringa dark:text-white">
                              {payout.business?.name ||
                                (payout.user
                                  ? `${payout.user.firstName || ''} ${payout.user.lastName || ''}`.trim() +
                                    ' (rider)'
                                  : 'Unknown')}
                            </p>
                            <p className="text-xs text-moringa-muted dark:text-slate-400">
                              {payout.business?.contact?.email || payout.user?.email || ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-moringa dark:text-white">
                              {methodInfo.type}
                            </p>
                            <p className="text-xs text-moringa-muted dark:text-slate-400">
                              {methodInfo.details}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-moringa dark:text-white">
                          {formatAmount(payout.amount)}
                          {payout.adjustments?.length > 0 && (
                            <span
                              className="block text-xs font-normal text-amber-600 dark:text-amber-400"
                              title={payout.adjustments
                                .map((a) => `${a.reason}: ${formatAmount(a.amount)}`)
                                .join('; ')}
                            >
                              was {formatAmount(payout.requestedAmount)} - refund adjusted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-moringa-muted dark:text-slate-400">
                          {formatDate(payout.createdAt)}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(payout.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                openLedgerModal(
                                  payout.business
                                    ? { business: payout.business._id, name: payout.business.name }
                                    : {
                                        user: payout.user?._id,
                                        name: `${payout.user?.firstName || ''} ${payout.user?.lastName || ''}`.trim(),
                                      }
                                )
                              }
                              className="px-3 py-1.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 hover:bg-fufu dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <History className="w-3.5 h-3.5" />
                              History
                            </button>
                            {payout.status === 'requested' && (
                              <>
                                <button
                                  onClick={() => handleApprovePayout(payout._id)}
                                  disabled={processingId === payout._id}
                                  className="px-3 py-1.5 bg-solid hover:bg-tertiary text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  {processingId === payout._id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() =>
                                    setActionModal({ open: true, payout, action: 'reject' })
                                  }
                                  className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {payout.status === 'processing' && (
                              <>
                                <button
                                  onClick={() =>
                                    setActionModal({ open: true, payout, action: 'complete' })
                                  }
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                  Mark Complete
                                </button>
                                <button
                                  onClick={() =>
                                    setActionModal({ open: true, payout, action: 'reject' })
                                  }
                                  className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Failed
                                </button>
                              </>
                            )}
                            {payout.status === 'failed' && (
                              <button
                                onClick={() =>
                                  handleSendMessage({
                                    name: payout.business?.name,
                                    email: payout.business?.contact?.email,
                                  })
                                }
                                className="px-3 py-1.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 hover:bg-fufu dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
                              >
                                Contact Vendor
                              </button>
                            )}
                            {payout.status === 'completed' && payout.reference && (
                              <span className="text-xs text-moringa-muted dark:text-slate-400">
                                Ref: {payout.reference}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredPayouts.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-hairline dark:border-slate-700">
              <div className="text-sm text-moringa-muted dark:text-slate-400">
                Showing {showingFrom} to {showingTo} of {filteredPayouts.length} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-solid text-white'
                          : 'text-moringa dark:text-slate-300 hover:bg-fufu dark:hover:bg-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal (Complete/Reject) */}
      {actionModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-hairline dark:border-slate-700 shadow-xl">
            <h3 className="text-xl font-semibold text-moringa dark:text-white mb-2">
              {actionModal.action === 'complete'
                ? 'Mark Payout as Complete'
                : 'Mark Payout as Failed'}
            </h3>
            <p className="text-sm text-moringa-muted dark:text-slate-400 mb-4">
              {actionModal.payout?.business?.name} - {formatAmount(actionModal.payout?.amount)}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                {actionModal.action === 'complete' ? 'Transaction Reference' : 'Failure Reason'}
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  actionModal.action === 'complete'
                    ? 'Enter transaction reference...'
                    : 'Enter reason for failure...'
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActionModal({ open: false, payout: null, action: null });
                  setMessage('');
                }}
                className="flex-1 px-4 py-2.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionModal.action === 'complete') {
                    handleCompletePayout(actionModal.payout._id, message);
                  } else {
                    handleRejectPayout(actionModal.payout._id, message);
                  }
                }}
                disabled={processingId === actionModal.payout?._id}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 ${
                  actionModal.action === 'complete'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingId === actionModal.payout?._id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-hairline dark:border-slate-700 shadow-xl">
            <h3 className="text-xl font-semibold text-moringa dark:text-white mb-2">
              Send Message to {messageModal.vendor?.name}
            </h3>
            <p className="text-sm text-moringa-muted dark:text-slate-400 mb-4">
              {messageModal.vendor?.email}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please update your payout information..."
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-moringa/25 dark:border-slate-600 rounded-lg text-moringa dark:text-white focus:ring-2 focus:ring-solid/20 focus:border-solid outline-none transition-all resize-none"
                rows="5"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMessageModal({ open: false, vendor: null })}
                className="flex-1 px-4 py-2.5 border border-moringa/25 dark:border-slate-600 text-moringa dark:text-slate-300 rounded-lg hover:bg-fufu dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessageSubmit}
                className="flex-1 px-4 py-2.5 bg-solid hover:bg-tertiary text-white rounded-lg transition-colors font-medium"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance History (ledger) - same view a payee sees, so admin and vendor
          are looking at the same numbers when there's a question. */}
      {ledgerModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-hairline dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-moringa dark:text-white">
                Balance History — {ledgerModal.name}
              </h3>
              <button
                onClick={() =>
                  setLedgerModal({ open: false, name: '', entries: [], loading: false })
                }
                className="text-moringa-muted/70 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            {ledgerModal.loading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : ledgerModal.entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-moringa-muted dark:text-slate-400">
                No balance activity yet
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-moringa dark:text-slate-300">
                      Date
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-moringa dark:text-slate-300">
                      Description
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-moringa dark:text-slate-300">
                      Amount
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-moringa dark:text-slate-300">
                      Balance after
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerModal.entries.map((entry) => (
                    <tr key={entry._id} className="border-b border-hairline dark:border-slate-800">
                      <td className="py-2 px-2 text-xs text-moringa-muted dark:text-slate-400 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-2 px-2 text-xs text-moringa dark:text-slate-200">
                        {entry.description}
                        {entry.order?.orderNumber && (
                          <span className="text-moringa-muted/70 dark:text-slate-500">
                            {' '}
                            · {entry.order.orderNumber}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2 px-2 text-xs font-semibold text-right whitespace-nowrap ${
                          entry.amount >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.amount >= 0 ? '+' : ''}
                        {formatAmount(entry.amount)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right text-moringa dark:text-slate-300 whitespace-nowrap">
                        {formatAmount(entry.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Payouts Component
const Payouts = () => {
  const { adminMode } = useAdminMode();

  return adminMode === 'shop' ? <ShopAdminPayouts /> : <WebsiteAdminPayouts />;
};

export default Payouts;
