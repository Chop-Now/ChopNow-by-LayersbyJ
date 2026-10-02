import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  DollarSign,
  Smartphone,
  Download,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ArrowRight,
  CreditCard,
  History,
  X,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api, payoutService } from '../services';
import toast from 'react-hot-toast';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import { PageHero } from '../Components/brand/Kit';

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
      toast.success(`You are now ${!isOnline ? 'online' : 'offline'}`);
    }, 400);
  };

  const handleSwitchToBuyer = async () => {
    try {
      await switchRole('consumer');
      toast.success('Switched to Buyer Mode');
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
    const pill = 'eyebrow text-[10px] px-2 py-1 whitespace-nowrap';
    switch (status) {
      case 'completed':
        return <span className={`${pill} bg-lime text-moringa`}>Completed</span>;
      case 'requested':
      case 'processing':
        return <span className={`${pill} bg-mint text-moringa animate-pulse`}>Pending</span>;
      case 'failed':
      case 'cancelled':
        return <span className={`${pill} bg-peach text-clay`}>Failed</span>;
      default:
        return <span className={`${pill} bg-fufu-dim text-moringa`}>{status}</span>;
    }
  };

  const statSpinner = (
    <div className="flex items-center justify-center h-[120px]">
      <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
    </div>
  );

  return (
    <div className="min-h-screen bg-fufu pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow="Rider partner portal"
        title={`Hello, ${user?.firstName || 'Rider'}`}
        art="chilli"
        intro="Welcome back to your dashboard. Deliver surplus meals, earn fees, and reduce food waste!"
        aside={
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Go Online Switcher */}
            <div className="flex items-center gap-4 bg-moringa-dark px-4 h-14">
              <div>
                <p className="eyebrow text-[10px] opacity-80">Status</p>
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 ${isOnline ? 'bg-lime' : 'bg-pepper'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <button
                onClick={toggleOnline}
                disabled={isToggling}
                className={`h-9 px-3 text-xs font-bold transition-colors cursor-pointer ${
                  isOnline
                    ? 'bg-peach text-clay hover:bg-fufu'
                    : 'bg-lime text-moringa hover:bg-fufu'
                }`}
              >
                {isToggling ? 'Syncing...' : isOnline ? 'Go offline' : 'Go online'}
              </button>
            </div>

            {/* Switch to Buyer Mode shortcut */}
            <button
              onClick={handleSwitchToBuyer}
              className="h-14 px-5 bg-yellow text-moringa hover:bg-yellow-dark text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              Switch to buyer mode
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20 space-y-6">
        {/* Mobile App Notice */}
        <div className="bg-mint text-moringa p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-moringa text-yellow flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold">Rider deliveries are mobile only</h3>
              <p className="text-sm leading-relaxed max-w-xl">
                To accept orders, use live GPS navigation, and upload proof of delivery, please use
                the ChopNow Mobile App. Download it from the Google Play Store or iOS App Store
                today.
              </p>
            </div>
          </div>
          <div className="flex shrink-0">
            <button className="flex items-center gap-2 h-11 px-4 border-2 border-moringa bg-white text-sm font-bold hover:bg-fufu transition-colors cursor-pointer">
              <Download className="w-4 h-4" aria-hidden="true" />
              Android app
            </button>
            <button className="flex items-center gap-2 h-11 px-4 border-2 border-l-0 border-moringa bg-white text-sm font-bold hover:bg-fufu transition-colors cursor-pointer">
              <Download className="w-4 h-4" aria-hidden="true" />
              iOS app
            </button>
          </div>
        </div>

        {/* Balance + Stats tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Balance */}
          <div className="bg-moringa text-fufu p-6 flex flex-col min-h-[200px]">
            <p className="eyebrow text-[11px] text-yellow flex items-center gap-2">
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              Available balance
            </p>
            <p className="display text-[44px] mt-auto pt-4 tabular-nums">
              {formatCurrency(user?.stats?.riderBalance || 0)}
            </p>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="mt-4 h-11 px-4 bg-yellow text-moringa text-sm font-bold hover:bg-yellow-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Withdraw earnings
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Earnings */}
          <div className="bg-lime text-moringa p-6 flex flex-col min-h-[200px]">
            {loadingStats ? (
              statSpinner
            ) : (
              <>
                <p className="eyebrow text-[11px] flex items-center gap-2">
                  <DollarSign className="w-4 h-4" aria-hidden="true" />
                  All-time earnings
                </p>
                <p className="display text-[44px] mt-auto pt-4 tabular-nums">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />+
                  {formatCurrency(stats?.weeklyEarningsSum || 0)} this week
                </p>
              </>
            )}
          </div>

          {/* Deliveries */}
          <div className="bg-yellow text-moringa p-6 flex flex-col min-h-[200px]">
            {loadingStats ? (
              statSpinner
            ) : (
              <>
                <p className="eyebrow text-[11px] flex items-center gap-2">
                  <Bike className="w-4 h-4" aria-hidden="true" />
                  Total deliveries
                </p>
                <p className="display text-[44px] mt-auto pt-4 tabular-nums">
                  {stats?.totalTrips || 0}
                  <span className="text-[0.45em] ml-1">trips</span>
                </p>
                <p className="mt-2 text-xs font-bold">
                  {stats?.activeTrips > 0
                    ? `${stats.activeTrips} active deliveries`
                    : 'No active deliveries'}
                </p>
              </>
            )}
          </div>

          {/* Rating */}
          <div className="bg-peach text-clay p-6 flex flex-col min-h-[200px]">
            {loadingStats ? (
              statSpinner
            ) : (
              <>
                <p className="eyebrow text-[11px] flex items-center gap-2">
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  Rider rating
                </p>
                <p className="display text-[44px] mt-auto pt-4 tabular-nums">
                  {(stats?.rating || 4.9).toFixed(1)}
                  <span className="text-[0.45em] ml-1">/ 5.0</span>
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Excellent standing (top 5%)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Lower Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Earnings Chart Panel */}
          <div className="bg-white border border-char/10 p-5 sm:p-6 lg:col-span-2">
            <p className="eyebrow text-moringa">Weekly earnings</p>
            <p className="text-sm text-moringa-muted mt-1">
              Overview of earnings for the last 7 days
            </p>

            {loadingStats ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-moringa" aria-hidden="true" />
              </div>
            ) : (
              <>
                {/* Bar Chart */}
                <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 mt-2 border-b-2 border-moringa pb-2">
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
                        <div className="relative w-full flex justify-center h-full items-end">
                          {/* Tooltip */}
                          {bar.amount > 0 && (
                            <div
                              className="absolute mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-char text-fufu text-[10px] px-2 py-0.5 font-bold whitespace-nowrap z-20"
                              style={{ bottom: `${heightPercent}%` }}
                            >
                              {formatCurrency(bar.amount)}
                            </div>
                          )}
                          <div
                            className={`w-full max-w-[40px] transition-all duration-500 ${
                              bar.amount > 0 ? 'bg-moringa group-hover:bg-pepper' : 'bg-fufu-dim'
                            }`}
                            style={{ height: `${heightPercent || 5}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] uppercase text-moringa-muted">
                          {bar.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-end pt-4">
                  <span className="eyebrow text-[11px] text-moringa">Total weekly earnings</span>
                  <span className="display text-[28px] text-moringa tabular-nums">
                    {formatCurrency(stats?.weeklyEarningsSum || 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Payout History */}
          <div className="bg-white border border-char/10 p-5 sm:p-6">
            <p className="eyebrow text-moringa flex items-center gap-2">
              <History className="w-4 h-4" aria-hidden="true" />
              Payout history
            </p>
            <p className="text-sm text-moringa-muted mt-1">Overview of recent cashouts completed</p>

            {loadingPayouts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-moringa" aria-hidden="true" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="mt-5 text-center py-10 bg-fufu text-moringa-muted">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm">No payouts requested yet</p>
              </div>
            ) : (
              <ul className="mt-4 max-h-72 overflow-y-auto">
                {payouts.map((pay) => (
                  <li
                    key={pay._id}
                    className="flex items-center justify-between gap-3 py-3 border-b border-hairline last:border-0"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-moringa tabular-nums">
                        {formatCurrency(pay.amount)}
                      </p>
                      <p className="text-xs text-moringa-muted">
                        {new Date(pay.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        / {pay.method === 'mobile' ? 'Mobile Money' : 'Bank Transfer'}
                      </p>
                    </div>
                    {getStatusBadge(pay.status)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-char/60">
          <div className="bg-fufu w-full max-w-md">
            <div className="px-5 py-4 bg-moringa text-fufu flex justify-between items-center">
              <h3 className="eyebrow text-yellow flex items-center gap-2">
                <DollarSign className="w-4 h-4" aria-hidden="true" />
                Request payout
              </h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="h-10 w-10 flex items-center justify-center bg-yellow text-moringa hover:bg-yellow-dark transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleRequestPayoutSubmit} className="p-5 sm:p-6 space-y-5">
              <div className="bg-lime text-moringa p-4">
                <p className="eyebrow text-[11px]">Available balance</p>
                <p className="display text-[36px] mt-1 tabular-nums">
                  {formatCurrency(user?.stats?.riderBalance || 0)}
                </p>
              </div>

              <div>
                <label className="block eyebrow text-[11px] text-moringa-muted mb-2">
                  Withdrawal amount (RWF)
                </label>
                <input
                  type="number"
                  required
                  min="5000"
                  max={user?.stats?.riderBalance || 0}
                  placeholder="Minimum 5,000 RWF"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full h-12 px-3 bg-white border-2 border-moringa text-sm font-semibold text-moringa placeholder:text-moringa-muted/70 focus:outline-none focus:bg-fufu"
                />
              </div>

              <div>
                <label className="block eyebrow text-[11px] text-moringa-muted mb-2">
                  Payment method
                </label>
                <div className="grid grid-cols-2 border-2 border-moringa">
                  {[
                    ['mobile', 'Mobile Money'],
                    ['bank', 'Bank Transfer'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPayoutMethod(value)}
                      aria-pressed={payoutMethod === value}
                      className={`h-12 text-sm font-bold transition-colors cursor-pointer ${
                        payoutMethod === value
                          ? 'bg-moringa text-yellow'
                          : 'bg-white text-moringa hover:bg-mint'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={requestingPayout}
                className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {requestingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing request...
                  </>
                ) : (
                  'Confirm withdrawal'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;
