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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-char/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-title"
    >
      <div className="bg-fufu max-w-md w-full relative border-t-4 sm:border-4 border-moringa rounded-t-lg sm:rounded-lg overflow-hidden">
        <div
          className={`${provider === 'momo' ? 'bg-yellow text-moringa' : 'bg-pepper text-char'} px-6 pt-6 pb-5`}
        >
          {!loading && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center bg-moringa text-fufu cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <p className="eyebrow">Mobile money / {short}</p>
          <h3 id="pay-title" className="display text-[44px] mt-2">
            {label}
          </h3>
          <p className="mt-2 text-sm font-semibold">
            {target?.orderIds?.length > 1
              ? `One payment for your ${target.orderIds.length} vendor orders`
              : 'Complete your rescue order'}
          </p>
          <p className="display text-[40px] mt-1">RWF {amount}</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-6 flex flex-col items-center gap-4 text-center" role="status">
              <div className="w-12 h-12 rounded-full border-4 border-moringa border-t-yellow animate-spin" />
              <p className="text-sm font-bold text-moringa">{statusText}</p>
              <p className="text-sm text-moringa-muted max-w-xs leading-relaxed">
                Check your phone for a PIN prompt to approve RWF {amount}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 border-2 border-moringa">
                {Object.entries(PROVIDERS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setProvider(key)}
                    aria-pressed={provider === key}
                    className={`h-11 text-sm font-bold transition-colors cursor-pointer ${
                      provider === key ? 'bg-moringa text-yellow' : 'text-moringa hover:bg-mint'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="momo-phone" className="eyebrow text-moringa mb-2 block">
                  Phone number
                </label>
                <input
                  id="momo-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="078xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 px-4 bg-white border-2 border-moringa text-moringa font-semibold focus:outline-none focus:border-yellow"
                />
              </div>

              {error && (
                <div className="p-3 bg-peach text-clay text-sm font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={pay}
                className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors cursor-pointer"
              >
                Confirm and pay RWF {amount}
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 border-2 border-moringa text-moringa font-semibold hover:bg-mint transition-colors cursor-pointer"
              >
                Pay later from My orders
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMoneyPaymentModal;
