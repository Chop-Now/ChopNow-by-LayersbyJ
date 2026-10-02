import { useAppContext } from '../context/AppContext';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import LocationPicker from '../Components/maps/LocationPicker';
import MobileMoneyPaymentModal from '../Components/payments/MobileMoneyPaymentModal';
import {
  MoveLeft,
  MapPin,
  ExternalLink,
  Leaf,
  Calendar,
  Trash2,
  AlertTriangle,
  Store,
} from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ExpiryCountdown from '../Components/ui/ExpiryCountdown';
import api from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import { toast } from 'react-hot-toast';

// Mirrors Backend/controllers/analyticsController.js's IMPACT_FACTORS so the
// cart's "your impact" preview matches what the backend actually records
// once the order completes, instead of a fixed placeholder number.
const IMPACT_FACTORS = {
  CO2_PER_MEAL: 2.5, // kg CO2e saved per meal rescued
  AVG_MEAL_WEIGHT: 0.5, // average kg per meal for food-waste calculation
};

const formatRwf = (amount) => `RWF ${Math.round(amount || 0).toLocaleString()}`;

const formatAddress = (address) => {
  if (!address) return 'Address not available';
  if (typeof address === 'string') return address;
  return (
    [address.street, address.city, address.country].filter(Boolean).join(', ') ||
    'Address not available'
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const { products, cartItems, removeFromCart, addToCart, getTotalCartItems, clearCart, user } =
    useAppContext();

  const [cartArray, setCartArray] = useState([]);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('Pickup'); // 'Pickup' or 'Delivery'
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [showMapEdit, setShowMapEdit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo', 'airtel', 'cash'

  // Server-computed prices for the whole cart, grouped per vendor.
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [placing, setPlacing] = useState(false);
  // What the payment modal is paying for: one checkout (all vendors) at once.
  const [paymentTarget, setPaymentTarget] = useState(null);

  useEffect(() => {
    if (products.length > 0 && cartItems) {
      let tempArray = [];
      for (const key in cartItems) {
        const product = products.find((item) => item._id === key);
        if (product && cartItems[key] > 0) {
          tempArray.push({ ...product, cartQuantity: cartItems[key] });
        }
      }
      setCartArray(tempArray);
    }
  }, [products, cartItems]);

  const fulfillmentType = fulfillmentMethod.toLowerCase();
  const cartLines = useMemo(
    () => cartArray.map((item) => ({ listing: item._id, quantity: item.cartQuantity })),
    [cartArray]
  );
  const cartKey = JSON.stringify(cartLines);

  // Re-price the cart on the server whenever it or the fulfillment changes.
  useEffect(() => {
    if (cartLines.length === 0) {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post(
          '/api/orders/quote',
          { items: cartLines, fulfillmentType },
          { silent: true }
        );
        if (cancelled) return;
        setQuote(data);
        setQuoteError('');
      } catch (err) {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(err.response?.data?.message || 'Could not price your cart. Please retry.');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // cartKey captures cartLines' contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, fulfillmentType]);

  const cashEnabled = !!quote?.options?.cashPaymentsEnabled;

  useEffect(() => {
    if (!cashEnabled && paymentMethod === 'cash') setPaymentMethod('momo');
  }, [cashEnabled, paymentMethod]);

  // Items expiring within 1 hour
  const urgentItems = useMemo(
    () =>
      cartArray.filter(
        (p) => p.availableUntil && new Date(p.availableUntil) - Date.now() < 60 * 60 * 1000
      ),
    [cartArray]
  );

  const vendors = quote?.vendors || [];
  const totals = quote?.totals;
  const taxLabel = quote?.options?.taxLabel || 'Tax';

  const handleLocationSelect = async (location) => {
    setDeliveryLocation(location);
    setShowMapEdit(false);
    setLookingUpAddress(true);
    setDeliveryAddress('Looking up address…');
    try {
      const result = await reverseGeocode(location.lat, location.lng);
      setDeliveryAddress(
        result.display_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
      );
    } catch {
      // Coordinates still travel with the order; this is only the readable label.
      setDeliveryAddress(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
    } finally {
      setLookingUpAddress(false);
    }
  };

  const mapsLink = (vendor) => {
    const [lng, lat] = vendor.business?.location?.coordinates || [];
    const query =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? `${lat},${lng}`
        : encodeURIComponent(formatAddress(vendor.business?.address));
    return `https://www.google.com/maps?q=${query}`;
  };

  const handleCheckout = async () => {
    if (placing || getTotalCartItems() === 0) return;
    if (quoteError || !quote) {
      toast.error(quoteError || 'Please wait while we price your cart');
      return;
    }
    if (fulfillmentMethod === 'Delivery') {
      if (!deliveryLocation) {
        toast.error('Please set your delivery location on the map');
        return;
      }
      if (lookingUpAddress) {
        toast.error('Still looking up your address - one moment');
        return;
      }
    }

    setPlacing(true);
    try {
      const { data } = await api.post(
        '/api/orders/checkout',
        {
          items: cartLines,
          fulfillmentType,
          deliveryDetails:
            fulfillmentMethod === 'Delivery'
              ? { address: deliveryAddress, location: deliveryLocation }
              : undefined,
          payment: { paymentMethod: paymentMethod === 'cash' ? 'cash' : 'mobile_money' },
        },
        { silent: true }
      );
      clearCart();

      if (paymentMethod === 'cash') {
        toast.success(
          data.orders.length > 1
            ? `${data.orders.length} orders placed - one per vendor`
            : 'Order placed successfully!'
        );
        navigate('/my-orders');
        return;
      }
      toast.success('Order placed - complete your payment');
      setPaymentTarget({
        checkoutId: data.checkoutId,
        orderIds: data.orders.map((o) => o._id),
        total: data.totals.total,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const checkoutDisabled = placing || quoteLoading || !!quoteError || !quote;

  return (
    <div className="bg-white min-h-screen pt-20">
      <PageNavbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {getTotalCartItems() === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl font-semibold mb-4" style={{ color: 'var(--color-textColor)' }}>
              Your cart is empty
            </p>
            <button
              onClick={() => {
                navigate('/shop');
                window.scrollTo(0, 0);
              }}
              className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-solid)' }}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Cart Items */}
            <div className="flex-1">
              <h1
                className="text-xl md:text-2xl font-semibold mb-4"
                style={{ color: 'var(--color-textColor)' }}
              >
                Shopping Cart{' '}
                <span
                  className="text-sm font-normal"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  ({getTotalCartItems()} Items)
                </span>
              </h1>

              {/* Urgent expiry warning banner */}
              {urgentItems.length > 0 && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl mb-5 border"
                  style={{ backgroundColor: '#fff3e0', borderColor: '#ffb74d' }}
                >
                  <AlertTriangle
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: 'var(--color-solidOne)' }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#b45309' }}>
                      {urgentItems.length === 1
                        ? `"${urgentItems[0].name}" is expiring soon!`
                        : `${urgentItems.length} items in your cart are expiring soon!`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>
                      Complete your order before these time-sensitive deals are gone.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {cartArray.map((product, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 border rounded-xl"
                    style={{ borderColor: '#E5E5E5' }}
                  >
                    <div
                      onClick={() => {
                        navigate(
                          `/shop/${(product.category || 'all').toLowerCase()}/${product._id}`
                        );
                        window.scrollTo(0, 0);
                      }}
                      className="cursor-pointer w-24 h-24 shrink-0 rounded-lg overflow-hidden border"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <img
                        className="w-full h-full object-cover"
                        src={product.image?.[0] || '/placeholder-food.jpg'}
                        alt={product.name || 'Product'}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3
                          className="font-semibold text-sm"
                          style={{ color: 'var(--color-textColor)' }}
                        >
                          {product.name}
                        </h3>
                        <p
                          className="font-semibold text-base"
                          style={{ color: 'var(--color-solid)' }}
                        >
                          RWF {(product.offerPrice * product.cartQuantity).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                          {product.vendor}
                        </p>
                        <button
                          onClick={() => removeFromCart(product._id)}
                          className="group text-xs transition cursor-pointer flex items-center justify-center"
                          style={{ color: 'var(--color-moringa-muted)' }}
                        >
                          <Trash2 className="w-5 h-5 group-hover:stroke-solidOne transition" />
                        </button>
                      </div>
                      {/* Per-item expiry countdown */}
                      {product.availableUntil && (
                        <div className="mb-2">
                          <ExpiryCountdown until={product.availableUntil} variant="inline" />
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeFromCart(product._id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold cursor-pointer hover:opacity-80 transition"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-solid)',
                          }}
                        >
                          -
                        </button>
                        <span
                          className="font-semibold text-sm"
                          style={{ color: 'var(--color-textColor)' }}
                        >
                          {product.cartQuantity}
                        </span>
                        <button
                          onClick={() => addToCart(product._id)}
                          disabled={product.cartQuantity >= product.quantity}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold disabled:opacity-50 cursor-pointer hover:opacity-80 transition"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-solid)',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  navigate('/shop');
                  window.scrollTo(0, 0);
                }}
                className="group flex items-center mt-6 gap-2 text-sm font-medium hover:opacity-70 transition cursor-pointer"
                style={{ color: 'var(--color-solid)' }}
              >
                <MoveLeft className="group-hover:-translate-x-1 transition" />
                Continue Shopping
              </button>

              {/* Positive Impact Banner */}
              <div
                className="mt-8 p-6 rounded-xl"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="w-5 h-5" style={{ color: 'var(--color-solid)' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-textColor)' }}>
                    Your Positive Impact
                  </h3>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  This order prevents{' '}
                  <strong style={{ color: 'var(--color-solid)' }}>
                    {(getTotalCartItems() * IMPACT_FACTORS.AVG_MEAL_WEIGHT).toFixed(1)}kg
                  </strong>{' '}
                  of food waste and saves{' '}
                  <strong style={{ color: 'var(--color-solid)' }}>
                    {(getTotalCartItems() * IMPACT_FACTORS.CO2_PER_MEAL).toFixed(1)}kg
                  </strong>{' '}
                  of CO₂ emissions. Thank you!
                </p>
              </div>
            </div>

            {/* Right Side - Fulfillment & Summary */}
            <div className="lg:w-96 shrink-0">
              {/* 1. Fulfillment Method */}
              <div className="p-5 rounded-xl border mb-6" style={{ borderColor: '#E5E5E5' }}>
                <h3
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  1. Fulfillment Method
                </h3>
                <div className="p-1 rounded-lg" style={{ backgroundColor: '#E5E5E5' }}>
                  <div className="flex gap-2">
                    {['Pickup', 'Delivery'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setFulfillmentMethod(method)}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2 ${fulfillmentMethod === method ? 'shadow-md' : ''}`}
                        style={{
                          backgroundColor: fulfillmentMethod === method ? 'white' : 'transparent',
                          color: '#17150F',
                        }}
                      >
                        <Calendar className="w-4 h-4" />
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                {fulfillmentMethod === 'Delivery' && vendors.length > 1 && (
                  <p className="text-xs mt-3" style={{ color: 'var(--color-moringa-muted)' }}>
                    Each vendor delivers separately, so there is one delivery fee per vendor.
                  </p>
                )}
              </div>

              {/* 2. Address Section */}
              <div className="p-5 rounded-xl border mb-6" style={{ borderColor: '#E5E5E5' }}>
                <h3
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  2.{' '}
                  {fulfillmentMethod === 'Delivery'
                    ? 'Delivery Address'
                    : vendors.length > 1
                      ? 'Pickup Addresses'
                      : 'Vendor Address'}
                </h3>

                {fulfillmentMethod === 'Delivery' ? (
                  <>
                    <div className="mb-3">
                      <p className="text-xs mb-2" style={{ color: 'var(--color-moringa-muted)' }}>
                        {deliveryAddress || 'No delivery address set'}
                      </p>
                      <button
                        onClick={() => setShowMapEdit(!showMapEdit)}
                        className="text-xs font-medium hover:opacity-70 transition cursor-pointer"
                        style={{ color: 'var(--color-solid)' }}
                      >
                        {showMapEdit
                          ? 'Cancel'
                          : deliveryLocation
                            ? 'Change Address'
                            : 'Set Address'}
                      </button>
                    </div>
                    {showMapEdit && (
                      <div className="mt-4">
                        <LocationPicker
                          selectedLocation={deliveryLocation}
                          onLocationSelect={handleLocationSelect}
                        />
                      </div>
                    )}
                  </>
                ) : vendors.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                    {quoteLoading ? 'Loading pickup details…' : 'Pickup details unavailable'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {vendors.map((vendor) => (
                      <div key={vendor.business._id}>
                        <p
                          className="font-medium text-xs mb-1 flex items-center gap-1"
                          style={{ color: 'var(--color-textColor)' }}
                        >
                          <Store className="w-3.5 h-3.5" />
                          {vendor.business.name}
                        </p>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-moringa-muted)' }}>
                          {formatAddress(vendor.business.address)}
                        </p>
                        <a
                          href={mapsLink(vendor)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-medium hover:opacity-70 transition"
                          style={{ color: 'var(--color-solid)' }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open in Google Maps
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Payment Method */}
              <div className="p-5 rounded-xl border mb-6" style={{ borderColor: '#E5E5E5' }}>
                <h3
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  3. Payment Method
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      key: 'momo',
                      icon: '📱',
                      title: 'MTN Mobile Money',
                      subtitle: 'Pay securely with MoMo',
                      active: 'border-amber-400 bg-amber-50/50',
                      accent: 'accent-amber-500',
                    },
                    {
                      key: 'airtel',
                      icon: '📲',
                      title: 'Airtel Money',
                      subtitle: 'Pay securely with Airtel',
                      active: 'border-red-400 bg-red-50/50',
                      accent: 'accent-red-500',
                    },
                    ...(cashEnabled
                      ? [
                          {
                            key: 'cash',
                            icon: '💵',
                            title:
                              fulfillmentMethod === 'Delivery'
                                ? 'Cash on Delivery'
                                : 'Cash on Pickup',
                            subtitle: 'Pay in person',
                            active: 'border-emerald-400 bg-emerald-50/50',
                            accent: 'accent-emerald-500',
                          },
                        ]
                      : []),
                  ].map((option) => (
                    <label
                      key={option.key}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === option.key
                          ? option.active
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{option.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{option.title}</p>
                          <p className="text-xs text-gray-500">{option.subtitle}</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === option.key}
                        onChange={() => setPaymentMethod(option.key)}
                        className={`w-4 h-4 ${option.accent}`}
                      />
                    </label>
                  ))}
                </div>
                {vendors.length > 1 && paymentMethod !== 'cash' && (
                  <p className="text-xs mt-3" style={{ color: 'var(--color-moringa-muted)' }}>
                    You pay once for all {vendors.length} vendors.
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div
                className="p-5 rounded-xl border"
                style={{ borderColor: '#E5E5E5', backgroundColor: 'var(--color-primary)' }}
              >
                <h3
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Order Summary
                </h3>

                {quoteError ? (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-start gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{quoteError}</span>
                  </div>
                ) : !quote ? (
                  <p className="text-xs mb-4" style={{ color: 'var(--color-moringa-muted)' }}>
                    Calculating your total…
                  </p>
                ) : (
                  <>
                    {/* Per-vendor breakdown */}
                    <div className="space-y-4 mb-4">
                      {vendors.map((vendor) => (
                        <div key={vendor.business._id}>
                          <p
                            className="text-xs font-semibold mb-1 flex items-center gap-1"
                            style={{ color: 'var(--color-textColor)' }}
                          >
                            <Store className="w-3.5 h-3.5" />
                            {vendor.business.name}
                          </p>
                          <div className="space-y-1">
                            {vendor.items.map((item) => (
                              <div key={item.listing} className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-moringa-muted)' }}>
                                  {item.title} x{item.quantity}
                                </span>
                                <span style={{ color: 'var(--color-textColor)' }}>
                                  {formatRwf(item.subtotal)}
                                </span>
                              </div>
                            ))}
                            {vendor.pricing.deliveryFee > 0 && (
                              <div className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-moringa-muted)' }}>
                                  Delivery
                                </span>
                                <span style={{ color: 'var(--color-textColor)' }}>
                                  {formatRwf(vendor.pricing.deliveryFee)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <hr className="my-4" style={{ borderColor: '#E5E5E5' }} />

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--color-moringa-muted)' }}>Subtotal</span>
                        <span style={{ color: 'var(--color-textColor)' }}>
                          {formatRwf(totals.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--color-moringa-muted)' }}>
                          Delivery Fee
                          {vendors.length > 1 && totals.deliveryFee > 0
                            ? ` (${vendors.length} vendors)`
                            : ''}
                        </span>
                        <span style={{ color: 'var(--color-textColor)' }}>
                          {totals.deliveryFee === 0 ? 'Free' : formatRwf(totals.deliveryFee)}
                        </span>
                      </div>
                      {totals.tax > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-moringa-muted)' }}>
                            {taxLabel} ({quote.options.taxPercent}%)
                          </span>
                          <span style={{ color: 'var(--color-textColor)' }}>
                            {formatRwf(totals.tax)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <hr className="my-4" style={{ borderColor: '#E5E5E5' }} />

                <div className="flex justify-between text-base font-semibold mb-6">
                  <span style={{ color: 'var(--color-textColor)' }}>Total</span>
                  <span style={{ color: 'var(--color-solid)' }}>
                    {totals ? formatRwf(totals.total) : '—'}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutDisabled}
                  className="w-full py-3 rounded-lg text-sm text-white font-medium hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-solid)' }}
                >
                  {placing
                    ? 'Placing your order…'
                    : vendors.length > 1
                      ? `Place ${vendors.length} orders · ${totals ? formatRwf(totals.total) : ''}`
                      : 'Proceed to Checkout'}
                </button>
                {fulfillmentMethod === 'Delivery' && !deliveryLocation && (
                  <p
                    className="text-xs mt-2 flex items-center gap-1"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Set your delivery address to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {paymentTarget && (
        <MobileMoneyPaymentModal
          target={paymentTarget}
          initialProvider={paymentMethod === 'airtel' ? 'airtel' : 'momo'}
          initialPhone={user?.phone || ''}
          onClose={() => {
            setPaymentTarget(null);
            navigate('/my-orders');
          }}
          onPaid={() => {
            setPaymentTarget(null);
            navigate('/my-orders');
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default Cart;
