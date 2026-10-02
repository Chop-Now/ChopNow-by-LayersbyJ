import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import socketService from '../../services/socket';

const PROVIDERS = {
  momo: { label: 'MTN Mobile Money', short: 'MoMo', correspondent: 'MTN_MOMO_RWA' },
  airtel: { label: 'Airtel Money', short: 'Airtel', correspondent: 'AIRTEL_RWA' },
};
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60 seconds

/**
 * One mobile-money prompt for a whole checkout (several vendor orders) or a
 * single unpaid order.
 *
 * @param {object} props
 * @param {{checkoutId?: string, orderId?: string, orderIds: string[], total: number}} props.target
 * @param {'momo'|'airtel'} [props.initialProvider]
 * @param {string} [props.initialPhone]
 * @param {() => void} props.onClose - dismissed without paying
 * @param {() => void} props.onPaid - payment confirmed
 */
const MobileMoneyPaymentModal = ({
  target,
  initialProvider = 'momo',
  initialPhone = '',
  onClose,
  onPaid,
}) => {
  const [provider, setProvider] = useState(initialProvider);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const cleanupRef = useRef(() => {});

  // Stop polling / socket listening if the modal goes away mid-payment.
  useEffect(() => () => cleanupRef.current(), []);

  const { label, short, correspondent } = PROVIDERS[provider];
  const amount = (target?.total ?? 0).toLocaleString();

  const succeed = () => {
    cleanupRef.current();
    setStatusText('Payment successful! Redirecting...');
    toast.success('Payment completed successfully!');
    setTimeout(onPaid, 1500);
  };

  const fail = (message) => {
    cleanupRef.current();
    setLoading(false);
    setError(message);
  };

  const pay = async () => {
    let formatted = phone.replace(/[\s+]/g, '');
    if (formatted.startsWith('0')) formatted = '250' + formatted.substring(1);
    if (!/^250\d{9}$/.test(formatted)) {
      setError('Please enter a valid Rwandan number (e.g. 078xxxxxxx)');
      return;
    }

    setLoading(true);
    setError('');
    setStatusText('Initiating payment...');

    try {
      const { data } = await api.post(
        '/api/payments/deposit',
        {
          ...(target.checkoutId ? { checkoutId: target.checkoutId } : { orderId: target.orderId }),
          phoneNumber: formatted,
          correspondent,
        },
        { silent: true }
      );
      if (!data?.success) {
        fail('Payment initiation failed');
        return;
      }
      setStatusText('Prompt sent! Enter your PIN on your phone...');

      const orderIds = (data.orders || target.orderIds || []).map(String);
      let done = false;

      const onOrderUpdate = (order) => {
        if (!done && orderIds.includes(String(order?._id)) && order.status === 'paid') {
          done = true;
          succeed();
        }
      };
      socketService.connect();
      socketService.on('order_status_updated', onOrderUpdate);

      let polls = 0;
      const timer = setInterval(async () => {
        if (done) return;
        polls += 1;
        try {
          const res = await api.get(`/api/payments/status/${orderIds[0]}`, { silent: true });
          if (res.data?.status === 'completed') {
            done = true;
            succeed();
            return;
          }
          if (res.data?.status === 'failed') {
            done = true;
            fail(`Payment failed: ${res.data.failureReason?.description || 'Transaction failed'}`);
            return;
          }
        } catch {
          // transient polling error - keep trying until the timeout
        }
        if (polls >= MAX_POLLS && !done) {
          done = true;
          fail(
            'Payment confirmation timed out. If money left your account, your order will update shortly - check My Orders.'
          );
        }
      }, POLL_INTERVAL_MS);

      cleanupRef.current = () => {
        done = true;
        clearInterval(timer);
        socketService.off('order_status_updated', onOrderUpdate);
      };
    } catch (err) {
      fail(err.response?.data?.message || err.message || 'Payment initiation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col items-center text-center">
        {!loading && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="mb-4 mt-2">
          {provider === 'momo' ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-xl font-black text-blue-900 shadow-md">
              {short}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-xl font-black text-white shadow-md">
              {short}
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-1">{label} Payment</h3>
        <p className="text-sm text-gray-500 mb-6">
          {target?.orderIds?.length > 1
            ? `One payment for your ${target.orderIds.length} vendor orders: `
            : 'Complete your rescue order for a total of '}
          <strong className="text-gray-800">RWF {amount}</strong>
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-4 w-full">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{
                borderColor: 'var(--color-solid) transparent var(--color-solid) transparent',
              }}
            />
            <p className="text-sm font-semibold text-gray-700">{statusText}</p>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Please check your phone for a PIN prompt to authorize RWF {amount}.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex gap-2">
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setProvider(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    provider === key
                      ? key === 'momo'
                        ? 'border-amber-400 bg-amber-50 text-gray-800'
                        : 'border-red-400 bg-red-50 text-gray-800'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-left">
              <label
                htmlFor="momo-phone"
                className="text-xs font-semibold text-gray-500 mb-1 block"
              >
                Phone Number
              </label>
              <input
                id="momo-phone"
                type="tel"
                placeholder="078xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={pay}
              className="w-full py-3 rounded-xl text-white font-semibold shadow-md transition-all hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: provider === 'momo' ? '#EAB308' : '#DC2626' }}
            >
              Confirm & Pay RWF {amount}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition cursor-pointer"
            >
              Pay Later from My Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMoneyPaymentModal;
