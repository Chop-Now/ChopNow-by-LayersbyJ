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
  Bike,
  ShoppingBag,
  Banknote,
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
import { assets } from '../assets/assets';
import { PageHero } from '../Components/brand/Kit';

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

const Panel = ({ step, title, children, tone = 'bg-white' }) => (
  <section className={`${tone} p-5 sm:p-6 border-b border-hairline`}>
    <div className="flex items-baseline gap-3 mb-4">
      <span className="display text-[32px] text-moringa leading-none">{step}</span>
      <h2 className="eyebrow text-moringa">{title}</h2>
    </div>
    {children}
  </section>
);

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

  const payOptions = [
    { key: 'momo', logo: assets.momo, title: 'MTN Mobile Money', subtitle: 'Pay with MoMo' },
    {
      key: 'airtel',
      logo: assets.airtel_money,
      title: 'Airtel Money',
      subtitle: 'Pay with Airtel',
    },
    ...(cashEnabled
      ? [
          {
            key: 'cash',
            title: fulfillmentMethod === 'Delivery' ? 'Cash on delivery' : 'Cash on pickup',
            subtitle: 'Pay in person',
          },
        ]
      : []),
  ];

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow={`Your cart / ${getTotalCartItems()} ${getTotalCartItems() === 1 ? 'item' : 'items'}`}
        title="Your rescue"
        art="bag"
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        {getTotalCartItems() === 0 ? (
          <div className="bg-yellow text-moringa px-6 py-14 text-center flex flex-col items-center rounded-lg">
            <ShoppingBag className="w-10 h-10" aria-hidden="true" />
            <h2 className="display text-[48px] md:text-[64px] mt-4">Your cart is empty</h2>
            <p className="mt-3 max-w-sm font-medium">
              Vendors near you post fresh surplus every day. Grab something before it is gone.
            </p>
            <button
              onClick={() => {
                navigate('/shop');
                window.scrollTo(0, 0);
              }}
              className="mt-6 h-12 px-6 bg-moringa text-fufu font-semibold hover:bg-moringa-dark cursor-pointer"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            {/* Items */}
            <div className="flex-1 w-full">
              {urgentItems.length > 0 && (
                <div className="flex items-start gap-3 p-4 mb-4 bg-pepper text-char rounded-lg">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold">
                      {urgentItems.length === 1
                        ? `"${urgentItems[0].name}" is expiring soon`
                        : `${urgentItems.length} items in your cart are expiring soon`}
                    </p>
                    <p className="text-xs mt-0.5 font-medium">
                      Complete your order before these deals are gone.
                    </p>
                  </div>
                </div>
              )}

              <ul className="bg-white border border-char/10">
                {cartArray.map((product, index) => (
                  <li
                    key={index}
                    className="flex gap-4 p-4 sm:p-5 border-b border-hairline last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        navigate(
                          `/shop/${(product.category || 'all').toLowerCase()}/${product._id}`
                        );
                        window.scrollTo(0, 0);
                      }}
                      className="cursor-pointer w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden bg-fufu-dim"
                      aria-label={`View ${product.name}`}
                    >
                      <img
                        className="w-full h-full object-cover"
                        src={product.image?.[0] || '/placeholder-food.jpg'}
                        alt=""
                      />
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="eyebrow text-[10px] text-moringa-muted truncate">
                            {product.vendor}
                          </p>
                          <h3 className="font-bold text-[15px] sm:text-base text-moringa mt-0.5">
                            {product.name}
                          </h3>
                        </div>
                        <p className="display text-[22px] sm:text-[26px] text-moringa whitespace-nowrap">
                          <span className="text-[0.6em] mr-1">RWF</span>
                          {(product.offerPrice * product.cartQuantity).toLocaleString()}
                        </p>
                      </div>
                      {product.availableUntil && (
                        <div className="mt-2">
                          <ExpiryCountdown until={product.availableUntil} variant="inline" />
                        </div>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <div className="flex items-center h-10 border-2 border-moringa">
                          <button
                            onClick={() => removeFromCart(product._id)}
                            className="w-9 h-full font-bold text-moringa hover:bg-mint cursor-pointer"
                            aria-label={`Remove one ${product.name}`}
                          >
                            -
                          </button>
                          <span
                            className="w-8 text-center font-bold text-sm text-moringa"
                            aria-live="polite"
                          >
                            {product.cartQuantity}
                          </span>
                          <button
                            onClick={() => addToCart(product._id)}
                            disabled={product.cartQuantity >= product.quantity}
                            className="w-9 h-full font-bold text-moringa hover:bg-mint disabled:opacity-40 cursor-pointer"
                            aria-label={`Add one more ${product.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(product._id)}
                          className="h-10 w-10 flex items-center justify-center text-moringa-muted hover:text-clay hover:bg-peach transition-colors cursor-pointer"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  navigate('/shop');
                  window.scrollTo(0, 0);
                }}
                className="group flex items-center mt-5 gap-2 eyebrow text-moringa hover:underline underline-offset-4 cursor-pointer"
              >
                <MoveLeft
                  className="w-4 h-4 group-hover:-translate-x-1 transition"
                  aria-hidden="true"
                />
                Keep shopping
              </button>

              <div className="mt-6 grid sm:grid-cols-2 rounded-lg overflow-hidden">
                <div className="bg-lime text-moringa p-6">
                  <p className="eyebrow flex items-center gap-2">
                    <Leaf className="w-4 h-4" aria-hidden="true" /> Food kept out of the bin
                  </p>
                  <p className="display text-[56px] mt-3">
                    {(getTotalCartItems() * IMPACT_FACTORS.AVG_MEAL_WEIGHT).toFixed(1)}
                    <span className="text-[0.45em] ml-1">kg</span>
                  </p>
                </div>
                <div className="bg-moringa text-fufu p-6">
                  <p className="eyebrow text-yellow">CO2 saved</p>
                  <p className="display text-[56px] mt-3">
                    {(getTotalCartItems() * IMPACT_FACTORS.CO2_PER_MEAL).toFixed(1)}
                    <span className="text-[0.45em] ml-1">kg</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Checkout column */}
            <aside className="w-full lg:w-[420px] shrink-0 lg:sticky lg:top-[88px] border border-char/10 bg-white">
              <Panel step="1" title="How you get it">
                <div className="grid grid-cols-2 border-2 border-moringa">
                  {['Pickup', 'Delivery'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setFulfillmentMethod(method)}
                      aria-pressed={fulfillmentMethod === method}
                      className={`h-12 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                        fulfillmentMethod === method
                          ? 'bg-moringa text-yellow'
                          : 'text-moringa hover:bg-mint'
                      }`}
                    >
                      {method === 'Pickup' ? (
                        <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Bike className="w-4 h-4" aria-hidden="true" />
                      )}
                      {method}
                    </button>
                  ))}
                </div>
                {fulfillmentMethod === 'Delivery' && vendors.length > 1 && (
                  <p className="text-xs mt-3 text-moringa-muted">
                    Each vendor delivers separately, so there is one delivery fee per vendor.
                  </p>
                )}
              </Panel>

              <Panel
                step="2"
                title={
                  fulfillmentMethod === 'Delivery'
                    ? 'Delivery address'
                    : vendors.length > 1
                      ? 'Pickup addresses'
                      : 'Pickup address'
                }
              >
                {fulfillmentMethod === 'Delivery' ? (
                  <>
                    <p className="text-sm text-moringa">
                      {deliveryAddress || 'No delivery address set'}
                    </p>
                    <button
                      onClick={() => setShowMapEdit(!showMapEdit)}
                      className="mt-3 h-10 px-4 border-2 border-moringa text-moringa text-sm font-bold hover:bg-mint cursor-pointer"
                    >
                      {showMapEdit ? 'Cancel' : deliveryLocation ? 'Change address' : 'Set address'}
                    </button>
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
                  <p className="text-sm text-moringa-muted">
                    {quoteLoading ? 'Loading pickup details…' : 'Pickup details unavailable'}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {vendors.map((vendor) => (
                      <li key={vendor.business._id}>
                        <p className="font-bold text-sm text-moringa flex items-center gap-1.5">
                          <Store className="w-4 h-4" aria-hidden="true" />
                          {vendor.business.name}
                        </p>
                        <p className="text-sm text-moringa-muted mt-0.5">
                          {formatAddress(vendor.business.address)}
                        </p>
                        <a
                          href={mapsLink(vendor)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-moringa underline underline-offset-4"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          Open in Google Maps
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel step="3" title="Payment">
                <div className="flex flex-col gap-2">
                  {payOptions.map((option) => (
                    <label
                      key={option.key}
                      className={`flex items-center justify-between gap-3 p-3 border-2 cursor-pointer transition-colors ${
                        paymentMethod === option.key
                          ? 'border-moringa bg-mint'
                          : 'border-hairline hover:border-moringa'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-11 h-11 bg-fufu flex items-center justify-center p-1.5 shrink-0">
                          {option.logo ? (
                            <img
                              src={option.logo}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Banknote className="w-5 h-5 text-moringa" aria-hidden="true" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-moringa">
                            {option.title}
                          </span>
                          <span className="block text-xs text-moringa-muted">
                            {option.subtitle}
                          </span>
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === option.key}
                        onChange={() => setPaymentMethod(option.key)}
                        className="w-4 h-4 accent-[#0F3D2E]"
                      />
                    </label>
                  ))}
                </div>
                {vendors.length > 1 && paymentMethod !== 'cash' && (
                  <p className="text-xs mt-3 text-moringa-muted">
                    You pay once for all {vendors.length} vendors.
                  </p>
                )}
              </Panel>

              <section className="p-5 sm:p-6 bg-fufu">
                <h2 className="eyebrow text-moringa mb-4">Order summary</h2>
                {quoteError ? (
                  <div className="p-3 bg-peach text-clay text-sm font-semibold flex items-start gap-2 mb-4 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{quoteError}</span>
                  </div>
                ) : !quote ? (
                  <p className="text-sm mb-4 text-moringa-muted">Calculating your total…</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-4 mb-4">
                      {vendors.map((vendor) => (
                        <div key={vendor.business._id}>
                          <p className="text-sm font-bold mb-1 text-moringa flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5" aria-hidden="true" />
                            {vendor.business.name}
                          </p>
                          <div className="flex flex-col gap-1 tabular-nums">
                            {vendor.items.map((item) => (
                              <div key={item.listing} className="flex justify-between text-sm">
                                <span className="text-moringa-muted">
                                  {item.title} x{item.quantity}
                                </span>
                                <span className="text-moringa">{formatRwf(item.subtotal)}</span>
                              </div>
                            ))}
                            {vendor.pricing.deliveryFee > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-moringa-muted">Delivery</span>
                                <span className="text-moringa">
                                  {formatRwf(vendor.pricing.deliveryFee)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-hairline pt-4 flex flex-col gap-2 text-sm tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-moringa-muted">Subtotal</span>
                        <span className="text-moringa">{formatRwf(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-moringa-muted">
                          Delivery fee
                          {vendors.length > 1 && totals.deliveryFee > 0
                            ? ` (${vendors.length} vendors)`
                            : ''}
                        </span>
                        <span className="text-moringa">
                          {totals.deliveryFee === 0 ? 'Free' : formatRwf(totals.deliveryFee)}
                        </span>
                      </div>
                      {totals.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-moringa-muted">
                            {taxLabel} ({quote.options.taxPercent}%)
                          </span>
                          <span className="text-moringa">{formatRwf(totals.tax)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="mt-4 pt-4 border-t-2 border-moringa flex items-end justify-between">
                  <span className="eyebrow text-moringa">Total</span>
                  <span className="display text-[40px] text-moringa tabular-nums">
                    {totals ? formatRwf(totals.total) : '-'}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutDisabled}
                  className="mt-5 w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {placing
                    ? 'Placing your order…'
                    : vendors.length > 1
                      ? `Place ${vendors.length} orders / ${totals ? formatRwf(totals.total) : ''}`
                      : 'Place order'}
                </button>
                {fulfillmentMethod === 'Delivery' && !deliveryLocation && (
                  <p className="text-xs mt-2 flex items-center gap-1 text-moringa-muted">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    Set your delivery address to continue
                  </p>
                )}
              </section>
            </aside>
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
