import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  Compass,
  DollarSign,
  Smartphone,
  Download,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  MapPin,
  Loader2,
  ArrowRight,
  TrendingDown,
  CreditCard,
  History,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api, payoutService } from '../services';
import toast from 'react-hot-toast';

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUser, switchRole } = useAppContext();
  const [isOnline, setIsOnline] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // States for API data
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);

  // Payout request modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('mobile');
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchRiderStats();
    fetchPayoutHistory();
  }, []);

  const fetchRiderStats = async () => {
    try {
      setLoadingStats(true);
      const response = await api.get('/api/v1/deliveries/rider-stats');
      if (response.data?.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching rider stats:', err);
      toast.error('Failed to load rider statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      setLoadingPayouts(true);
      const data = await payoutService.getMyPayouts();
      if (data?.payouts) {
        setPayouts(data.payouts);
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
      toast.error('Failed to load payout history');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const toggleOnline = () => {
    setIsToggling(true);
    setTimeout(() => {
      setIsOnline(!isOnline);
      setIsToggling(false);
      toast.success(`You are now ${!isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    }, 400);
  };

  const handleSwitchToBuyer = async () => {
    try {
      await switchRole('consumer');
      toast.success('Switched to Buyer Mode 🛒');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to switch roles.');
    }
  };

  const handleRequestPayoutSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    const balance = user?.stats?.riderBalance || 0;

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }

    if (amountNum > balance) {
      toast.error('Requested amount exceeds available balance');
      return;
    }

    if (amountNum < 5000) {
      toast.error('Minimum payout amount is 5,000 RWF');
      return;
    }

    setRequestingPayout(true);
    try {
      await payoutService.requestPayout({
        amount: amountNum,
        method: payoutMethod,
      });
      toast.success('Payout requested successfully!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      // Refresh user balance and history
      await refreshUser();
      fetchPayoutHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to request payout. Try again.');
    } finally {
      setRequestingPayout(false);
    }
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US').format(val) + ' RWF';
  };

  // Helper to color-code payout statuses
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            Completed
          </span>
        );
      case 'requested':
      case 'processing':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse">
            Pending
          </span>
        );
      case 'failed':
      case 'cancelled':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            Failed
          </span>
        );
      default:
        return (
          <span className="bg-slate-50 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-[10px] tracking-widest text-green-400 font-bold uppercase">
                Rider Partner Portal
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Hello, {user?.firstName || 'Rider'} 👋
            </h1>
            <p className="text-slate-300 text-sm max-w-md">
              Welcome back to your dashboard. Deliver surplus meals, earn fees, and reduce food
              waste!
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-4 z-10">
            {/* Go Online Switcher Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 shrink-0 flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Status
                </p>
                <p className="text-xs font-bold flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}
                  />
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <button
                onClick={toggleOnline}
                disabled={isToggling}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                  isOnline
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isToggling ? 'Syncing...' : isOnline ? 'Go Offline' : 'Go Online'}
              </button>
            </div>

            {/* Switch to Buyer Mode shortcut */}
            <button
              onClick={handleSwitchToBuyer}
              className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              Switch to Buyer Mode 🛒
            </button>
          </div>

          {/* Absolute decorative background sphere */}
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-green-500/10 blur-3xl -z-0" />
        </div>

        {/* Dynamic Mobile App Promo Notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900">
                Rider Deliveries are Mobile-Only 📱
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                To accept orders, use live GPS navigation, and upload proof of delivery, please use
                the ChopNow Mobile App. Download it from the Google Play Store or iOS App Store
                today.
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto shrink-0 justify-end">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              <Download className="w-4 h-4" />
              Get Android App
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              <Download className="w-4 h-4" />
              Get iOS App
            </button>
          </div>
        </div>

        {/* Payout & Earnings Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Available Balance
              </p>
              <h2 className="text-3xl font-black text-slate-900 mt-0.5">
                {formatCurrency(user?.stats?.riderBalance || 0)}
              </h2>
            </div>
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            className="w-full sm:w-auto py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            Withdraw Earnings
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Earnings Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {loadingStats ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      All-Time Earnings
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {formatCurrency(stats?.totalEarnings || 0)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-green-50 text-green-700 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] text-green-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{formatCurrency(stats?.weeklyEarningsSum || 0)} this week</span>
                </div>
              </>
            )}
          </div>

          {/* Deliveries Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            {loadingStats ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Total Deliveries
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {stats?.totalTrips || 0} Trips
                    </p>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                    <Bike className="w-5 h-5" />
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-slate-400">
                  {stats?.activeTrips > 0 ? (
                    <span className="text-green-600 font-semibold">
                      {stats.activeTrips} active deliveries
                    </span>
                  ) : (
                    'No active deliveries'
                  )}
                </p>
              </>
            )}
          </div>

          {/* Rating Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            {loadingStats ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Rider Rating
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {(stats?.rating || 4.9).toFixed(1)} / 5.0
                    </p>
                  </div>
                  <div className="p-2.5 bg-orange-50 text-orange-700 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] text-orange-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Excellent Standing (Top 5%)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lower Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Center: Weekly Earnings Chart Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Weekly Earnings</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Overview of earnings for the last 7 days
              </p>
            </div>

            {loadingStats ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                {/* Custom SVG/CSS Bar Chart */}
                <div className="h-64 flex items-end gap-3 sm:gap-6 pt-4 border-b border-slate-100 pb-2">
                  {(stats?.weeklyData || []).map((bar, index) => {
                    const maxAmount = Math.max(
                      ...(stats?.weeklyData || []).map((b) => b.amount),
                      5000
                    );
                    const heightPercent = bar.amount > 0 ? (bar.amount / maxAmount) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                      >
                        <div className="relative w-full flex justify-center">
                          {/* Tooltip */}
                          {bar.amount > 0 && (
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shadow z-20">
                              {formatCurrency(bar.amount)}
                            </div>
                          )}
                          <div
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${
                              bar.amount > 0
                                ? 'bg-gradient-to-t from-green-500 to-emerald-600'
                                : 'bg-slate-100'
                            }`}
                            style={{ height: `${heightPercent || 5}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{bar.day}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
                  <span className="font-semibold text-slate-800">Total Weekly Earnings:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(stats?.weeklyEarningsSum || 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right: Payout Details & History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-sans flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  Payout History
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Overview of recent cashouts completed
                </p>
              </div>

              {loadingPayouts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No payouts requested yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {payouts.map((pay) => (
                    <div
                      key={pay._id}
                      className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">
                          {formatCurrency(pay.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(pay.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          · {pay.method === 'mobile' ? 'Mobile Money' : 'Bank Transfer'}
                        </p>
                      </div>
                      {getStatusBadge(pay.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Request Payout</h3>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayoutSubmit} className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Available Balance
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {formatCurrency(user?.stats?.riderBalance || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Withdrawal Amount (RWF)
                </label>
                <input
                  type="number"
                  required
                  min="5000"
                  max={user?.stats?.riderBalance || 0}
                  placeholder="Minimum 5,000 RWF"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('mobile')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      payoutMethod === 'mobile'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('bank')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      payoutMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={requestingPayout}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                >
                  {requestingPayout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing request...
                    </>
                  ) : (
                    'Confirm Withdrawal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;
