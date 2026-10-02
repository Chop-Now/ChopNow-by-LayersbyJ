const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const Business = require('../models/Business');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * Multi-vendor checkout.
 *
 * A cart may hold listings from several vendors. The customer pays ONCE for
 * the whole cart, but each vendor gets its own Order (own notification,
 * pickup code, status, delivery and payout credit). The orders share a
 * `checkoutGroup` id and are paid by a single Payment (see paymentController).
 *
 * Every price is computed here from the stored listings and platform
 * settings - the client only says what it wants and how many.
 */

const MAX_VENDORS_PER_CHECKOUT = 10;
const MAX_LINES_PER_CHECKOUT = 50;

class CheckoutError extends Error {
  constructor(message, { status = 400, details } = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Both clients send deliveryDetails as `{ address: "<string>", location: { lat,
 * lng } }`, but the Order schema stores `address` as an object with a GeoJSON
 * `location`. Accept either shape and convert to the schema's, dropping
 * coordinates that aren't a valid lat/lng pair rather than storing garbage.
 */
const normalizeDeliveryDetails = (deliveryDetails) => {
  if (!deliveryDetails) return deliveryDetails;
  const { address, location, ...rest } = deliveryDetails;
  const addressObj =
    typeof address === 'string' ? { street: address.trim() } : { ...(address || {}) };

  const loc = location || addressObj.location;
  let coords;
  if (Array.isArray(loc?.coordinates)) {
    coords = loc.coordinates.map(Number);
  } else if (loc && loc.lat !== undefined && loc.lng !== undefined) {
    coords = [Number(loc.lng), Number(loc.lat)];
  }
  const [lng, lat] = coords || [];
  const validCoords =
    Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  if (validCoords) {
    addressObj.location = { type: 'Point', coordinates: [lng, lat] };
  } else {
    delete addressObj.location;
  }
  return { ...rest, address: addressObj };
};

const percentOf = (amount, percent) => Math.round((amount * (percent || 0)) / 100);

/**
 * Merges duplicate lines and validates shape. Returns [{ listingId, quantity }].
 */
const normalizeLines = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError('Your cart is empty');
  }
  const byListing = new Map();
  for (const item of items) {
    const listingId = String(item?.listing || item?.listingId || '');
    const quantity = Number(item?.quantity);
    if (!mongoose.isValidObjectId(listingId)) {
      throw new CheckoutError('Each item needs a valid listing');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw new CheckoutError('Each item needs a whole-number quantity of at least 1');
    }
    byListing.set(listingId, (byListing.get(listingId) || 0) + quantity);
  }
  if (byListing.size > MAX_LINES_PER_CHECKOUT) {
    throw new CheckoutError(`A checkout can hold at most ${MAX_LINES_PER_CHECKOUT} items`);
  }
  return [...byListing.entries()].map(([listingId, quantity]) => ({ listingId, quantity }));
};

/**
 * Prices a cart without touching stock. Throws CheckoutError for anything the
 * customer must fix (unavailable listing, not enough stock, delivery not
 * offered, cash disabled...).
 *
 * @returns {Promise<{vendors: Array, totals: object, options: object}>}
 */
const buildQuote = async ({ items, fulfillmentType, paymentMethod }, settings) => {
  if (!['pickup', 'delivery'].includes(fulfillmentType)) {
    throw new CheckoutError('Fulfillment type must be pickup or delivery');
  }
  settings = settings || (await PlatformSettings.getSettings());
  if (paymentMethod && !['mobile_money', 'cash'].includes(paymentMethod)) {
    throw new CheckoutError('Payment method must be mobile_money or cash');
  }
  if (paymentMethod === 'cash' && !settings.cashPaymentsEnabled) {
    throw new CheckoutError('Cash payments are not available. Please pay with mobile money.');
  }

  const lines = normalizeLines(items);
  const listings = await Listing.find({ _id: { $in: lines.map((l) => l.listingId) } }).populate(
    'business',
    'name status address location'
  );
  const listingById = new Map(listings.map((l) => [String(l._id), l]));

  const problems = [];
  const vendorsById = new Map();
  for (const { listingId, quantity } of lines) {
    const listing = listingById.get(listingId);
    if (!listing || !listing.business) {
      problems.push({ listing: listingId, message: 'This item no longer exists' });
      continue;
    }
    const title = listing.title;
    if (!listing.isAvailable() || listing.business.status !== 'active') {
      problems.push({ listing: listingId, message: `"${title}" is no longer available` });
      continue;
    }
    if (listing.inventory.quantity < quantity) {
      problems.push({
        listing: listingId,
        message: `Only ${listing.inventory.quantity} of "${title}" left`,
      });
      continue;
    }
    if (fulfillmentType === 'delivery' && listing.fulfillment !== 'delivery') {
      problems.push({ listing: listingId, message: `"${title}" is pickup only` });
      continue;
    }

    const businessId = String(listing.business._id);
    if (!vendorsById.has(businessId)) {
      vendorsById.set(businessId, { business: listing.business, items: [] });
    }
    const unitPrice = listing.pricing.price;
    vendorsById.get(businessId).items.push({
      listing: listing._id,
      title,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
      currency: listing.pricing.currency || 'RWF',
    });
  }

  if (problems.length) {
    throw new CheckoutError(problems[0].message, { details: problems });
  }
  if (vendorsById.size > MAX_VENDORS_PER_CHECKOUT) {
    throw new CheckoutError(
      `A checkout can include at most ${MAX_VENDORS_PER_CHECKOUT} different vendors`
    );
  }

  const platformFeePercent = settings.platformFeePercent ?? 10;
  const taxPercent = settings.taxPercent || 0;
  const deliveryCommissionPercent = settings.deliveryCommissionPercent ?? 10;

  const vendors = [...vendorsById.values()].map(({ business, items: vendorItems }) => {
    const currency = vendorItems[0].currency;
    const subtotal = vendorItems.reduce((sum, i) => sum + i.subtotal, 0);
    const deliveryFee = fulfillmentType === 'delivery' ? settings.deliveryFee || 0 : 0;
    const deliveryCommission = percentOf(deliveryFee, deliveryCommissionPercent);
    const platformFee = percentOf(subtotal, platformFeePercent);
    const tax = percentOf(subtotal + deliveryFee, taxPercent);
    return {
      business: {
        _id: business._id,
        name: business.name,
        address: business.address,
        location: business.location,
      },
      items: vendorItems.map(({ currency: _c, ...i }) => i),
      pricing: {
        subtotal,
        deliveryFee,
        deliveryCommission,
        riderAmount: deliveryFee - deliveryCommission,
        platformFee,
        platformFeePercent,
        vendorAmount: subtotal - platformFee,
        tax,
        taxPercent,
        total: subtotal + deliveryFee + tax,
        currency,
      },
    };
  });

  const sum = (key) => vendors.reduce((acc, v) => acc + v.pricing[key], 0);
  return {
    vendors,
    totals: {
      subtotal: sum('subtotal'),
      deliveryFee: sum('deliveryFee'),
      tax: sum('tax'),
      total: sum('total'),
      currency: vendors[0]?.pricing.currency || 'RWF',
    },
    options: {
      cashPaymentsEnabled: !!settings.cashPaymentsEnabled,
      deliveryFeePerVendor: settings.deliveryFee || 0,
      taxPercent,
      taxLabel: settings.taxLabel || 'VAT',
    },
  };
};

/**
 * Reserves stock for every line and creates one pending_payment Order per
 * vendor, all in one transaction - either the whole checkout is placed or
 * nothing is (no half-reserved carts).
 *
 * @returns {Promise<{checkoutGroup: ObjectId, orders: Order[], quote: object}>}
 */
const placeCheckout = async ({
  customerId,
  items,
  fulfillmentType,
  deliveryDetails,
  pickupDetails,
  paymentMethod,
}) => {
  if (!paymentMethod) {
    throw new CheckoutError('Payment method must be mobile_money or cash');
  }
  if (fulfillmentType === 'delivery') {
    const address = deliveryDetails?.address;
    const hasAddress =
      typeof address === 'string' ? address.trim().length > 0 : !!(address && address.street);
    if (!hasAddress) {
      throw new CheckoutError('Delivery address required for delivery orders');
    }
  }

  const quote = await buildQuote({ items, fulfillmentType, paymentMethod });
  const normalizedDelivery =
    fulfillmentType === 'delivery' ? normalizeDeliveryDetails(deliveryDetails) : undefined;
  const checkoutGroup = new mongoose.Types.ObjectId();

  let orders = [];
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      orders = [];
      for (const vendor of quote.vendors) {
        for (const item of vendor.items) {
          const updated = await Listing.findOneAndUpdate(
            {
              _id: item.listing,
              status: 'active',
              'inventory.quantity': { $gte: item.quantity },
            },
            {
              $inc: {
                'inventory.quantity': -item.quantity,
                'inventory.reserved': item.quantity,
                'stats.orders': 1,
              },
            },
            { session, new: true }
          );
          if (!updated) {
            throw new CheckoutError(`Not enough stock left for "${item.title}"`);
          }
          if (updated.inventory.quantity === 0) {
            updated.status = 'sold_out';
            await updated.save({ session });
          }
        }

        const [order] = await Order.create(
          [
            {
              customer: customerId,
              business: vendor.business._id,
              listing: vendor.items[0].listing,
              checkoutGroup,
              items: vendor.items,
              pricing: vendor.pricing,
              fulfillmentType,
              deliveryDetails: normalizedDelivery,
              pickupDetails:
                fulfillmentType === 'pickup'
                  ? {
                      ...(pickupDetails || {}),
                      pickupCode: crypto
                        .randomBytes(4)
                        .toString('hex')
                        .substring(0, 6)
                        .toUpperCase(),
                    }
                  : undefined,
              status: 'pending_payment',
              // Never taken from the client: a client-sent 'completed' would
              // make an unpaid order look paid (and refundable).
              payment: { paymentMethod, paymentStatus: 'pending' },
            },
          ],
          { session }
        );
        orders.push(order);

        await Business.findByIdAndUpdate(
          vendor.business._id,
          { $inc: { 'stats.totalOrders': 1 } },
          { session }
        );
      }

      await User.findByIdAndUpdate(
        customerId,
        { $inc: { 'stats.ordersCount': orders.length } },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  return { checkoutGroup, orders, quote };
};

module.exports = {
  CheckoutError,
  buildQuote,
  placeCheckout,
  normalizeDeliveryDetails,
};
