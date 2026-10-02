/**
 * Standard transformation utilities for converting between backend and frontend data formats.
 * Ensures consistent data handling across the application.
 */

/**
 * Transform a backend listing to frontend product format
 * @param {Object} listing - Backend listing object
 * @returns {Object} - Frontend product format
 */
export const transformListingToProduct = (listing) => {
  if (!listing) return null;

  return {
    id: listing._id,
    name: listing.title,
    title: listing.title,
    description: listing.description,
    price: listing.pricing?.price || listing.price || 0,
    originalPrice: listing.pricing?.originalPrice || listing.originalPrice || null,
    discount:
      listing.pricing?.discountPercentage ||
      (listing.pricing?.originalPrice && listing.pricing?.price
        ? Math.round((1 - listing.pricing.price / listing.pricing.originalPrice) * 100)
        : 0),
    image: listing.images?.[0] || listing.image || '/placeholder-food.jpg',
    images: listing.images || (listing.image ? [listing.image] : []),
    category: listing.category,
    categoryDisplay: getCategoryDisplay(listing.category),
    quantity: listing.inventory?.quantity ?? listing.quantity ?? 0,
    unit: listing.inventory?.unit || listing.unit || 'item',
    business: listing.business,
    businessId: listing.business?._id || listing.business,
    businessName: listing.business?.name || '',
    pickupFrom: listing.timeWindow?.availableFrom,
    pickupTo: listing.timeWindow?.availableUntil,
    availableUntil: listing.timeWindow?.availableUntil || null,
    status: listing.status || 'active',
    rating: listing.rating || 0,
    reviewCount: listing.reviewCount || 0,
    isAvailable:
      listing.status === 'active' && (listing.inventory?.quantity > 0 || listing.quantity > 0),
    // Urgency signals
    cartCount: listing.stats?.cartCount || 0,
    soldCount: listing.inventory?.reserved || 0,
    totalQuantity: (listing.inventory?.quantity || 0) + (listing.inventory?.reserved || 0),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
};

/**
 * Transform a frontend product to backend listing format for API submission
 * @param {Object} product - Frontend product/form data
 * @param {string} businessId - Business ID
 * @returns {Object} - Backend listing format
 */
export const transformProductToListing = (product, businessId) => {
  return {
    title: product.name || product.title,
    description: product.description,
    business: businessId,
    category: getCategoryBackend(product.category),
    images: product.images || (product.image ? [product.image] : []),
    pricing: {
      originalPrice: parseFloat(product.originalPrice) || parseFloat(product.price),
      price: parseFloat(product.price),
      discountPercentage: product.discount || 0,
      currency: 'RWF',
    },
    inventory: {
      quantity: parseInt(product.quantity) || 0,
      unit: product.unit || 'item',
    },
    timeWindow: {
      availableFrom: product.pickupFrom
        ? new Date(product.pickupFrom).toISOString()
        : new Date().toISOString(),
      availableUntil: product.pickupTo
        ? new Date(product.pickupTo).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
};

/**
 * Transform backend order to consumer-friendly format
 * @param {Object} order - Backend order object
 * @returns {Object} - Consumer order format
 */
export const transformOrderForConsumer = (order) => {
  if (!order) return null;

  return {
    id: order._id,
    orderNumber: order.orderNumber || `ORD-${order._id?.slice(-8)?.toUpperCase()}`,
    status: normalizeStatus(order.status),
    statusDisplay: getStatusDisplay(order.status),
    items: (order.items || []).map((item) => ({
      id: item._id || item.listing?._id,
      name: item.listing?.title || item.name || 'Unknown Item',
      quantity: item.quantity,
      price: item.unitPrice || item.price,
      total: (item.quantity || 1) * (item.unitPrice || item.price || 0),
      image: item.listing?.images?.[0] || item.image || '/placeholder-food.jpg',
    })),
    subtotal: order.subtotal || order.payment?.subtotal || 0,
    deliveryFee: order.deliveryFee || order.payment?.deliveryFee || 0,
    serviceFee: order.serviceFee || order.payment?.serviceFee || 0,
    total: order.total || order.payment?.totalAmount || 0,
    business: {
      id: order.business?._id || order.business,
      name: order.business?.name || 'Unknown Business',
      image: order.business?.images?.[0] || order.business?.logo,
      address: order.business?.address?.text || '',
    },
    fulfillmentType: order.fulfillmentType || 'pickup',
    deliveryAddress: order.deliveryDetails?.address || '',
    pickupTime: order.fulfillmentDetails?.pickupTime,
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    paymentMethod: order.payment?.paymentMethod || 'card',
    paymentStatus: order.payment?.paymentStatus || 'pending',
  };
};

/**
 * Transform backend order to admin/vendor format
 * @param {Object} order - Backend order object
 * @returns {Object} - Admin order format
 */
export const transformOrderForAdmin = (order) => {
  if (!order) return null;

  const consumerOrder = transformOrderForConsumer(order);

  return {
    ...consumerOrder,
    customer: {
      id: order.user?._id || order.user,
      name:
        order.user?.firstName && order.user?.lastName
          ? `${order.user.firstName} ${order.user.lastName}`
          : order.user?.name || 'Unknown Customer',
      email: order.user?.email || '',
      phone: order.user?.phone || '',
      avatar: order.user?.avatar,
    },
    rider: order.rider
      ? {
          id: order.rider._id,
          name:
            order.rider.firstName && order.rider.lastName
              ? `${order.rider.firstName} ${order.rider.lastName}`
              : order.rider.name || 'Unknown Rider',
          phone: order.rider.phone,
          vehicleNumber: order.rider.vehicleNumber,
        }
      : null,
    timeline: order.statusHistory || [],
    notes: order.notes || '',
    refundStatus: order.refund?.status,
    refundAmount: order.refund?.amount,
  };
};

/**
 * Transform backend business to vendor format
 * @param {Object} business - Backend business object
 * @returns {Object} - Vendor format
 */
export const transformBusinessToVendor = (business) => {
  if (!business) return null;

  return {
    id: business._id,
    name: business.name,
    type: business.type,
    typeDisplay: getBusinessTypeDisplay(business.type),
    description: business.description || '',
    email: business.contact?.email || business.email || '',
    phone: business.contact?.phone || business.phone || '',
    address: business.address?.text || formatAddress(business.address),
    city: business.address?.city || '',
    location: {
      lat: business.address?.location?.coordinates?.[1],
      lng: business.address?.location?.coordinates?.[0],
    },
    images: business.images || [],
    logo: business.logo || business.images?.[0],
    status: business.status,
    isActive: business.status === 'active',
    verificationStatus: business.verification?.status || 'unverified',
    isVerified:
      business.verification?.status === 'verified' || business.verification?.status === 'approved',
    owner: {
      id: business.owner?._id || business.owner,
      name:
        business.owner?.firstName && business.owner?.lastName
          ? `${business.owner.firstName} ${business.owner.lastName}`
          : '',
      email: business.owner?.email || '',
      phone: business.owner?.phone || '',
    },
    rating: business.rating || 0,
    reviewCount: business.reviewCount || 0,
    createdAt: business.createdAt,
    submittedAt: business.verification?.submittedAt,
    approvedAt: business.verification?.reviewedAt,
  };
};

/**
 * Normalize status values to consistent format
 * @param {string} status - Raw status from backend
 * @returns {string} - Normalized status
 */
export const normalizeStatus = (status) => {
  if (!status) return 'pending';

  const statusMap = {
    pending: 'pending',
    confirmed: 'confirmed',
    preparing: 'preparing',
    ready: 'ready',
    ready_for_pickup: 'ready',
    out_for_delivery: 'delivering',
    in_transit: 'delivering',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };

  return statusMap[status.toLowerCase()] || status.toLowerCase();
};

/**
 * Get human-readable status display text
 * @param {string} status - Status value
 * @returns {string} - Display text
 */
export const getStatusDisplay = (status) => {
  const displayMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    ready_for_pickup: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    in_transit: 'In Transit',
    delivering: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  return displayMap[status?.toLowerCase()] || status || 'Unknown';
};

/**
 * Get category display name from backend value
 * @param {string} category - Backend category value
 * @returns {string} - Display name
 */
export const getCategoryDisplay = (category) => {
  const categoryMap = {
    'fruit-veg': 'Fruits & Vegetables',
    'baked-goods': 'Baked Goods',
    meals: 'Ready Meals',
    dairy: 'Dairy Products',
    meat: 'Meat & Poultry',
    beverages: 'Beverages',
    pantry: 'Pantry Items',
    other: 'Other',
  };

  return categoryMap[category] || category || 'Other';
};

/**
 * Get backend category value from frontend display/path
 * @param {string} category - Frontend category display or path
 * @returns {string} - Backend category value
 */
export const getCategoryBackend = (category) => {
  const categoryMap = {
    Vegetables: 'fruit-veg',
    Fruits: 'fruit-veg',
    'Fruits & Vegetables': 'fruit-veg',
    'fruit-veg': 'fruit-veg',
    Bakery: 'baked-goods',
    'Baked Goods': 'baked-goods',
    'baked-goods': 'baked-goods',
    Meals: 'meals',
    'Ready Meals': 'meals',
    Instant: 'meals',
    meals: 'meals',
    Dairy: 'dairy',
    'Dairy Products': 'dairy',
    dairy: 'dairy',
    Meat: 'meat',
    'Meat & Poultry': 'meat',
    meat: 'meat',
    Drinks: 'beverages',
    Beverages: 'beverages',
    beverages: 'beverages',
    Grains: 'pantry',
    Pantry: 'pantry',
    'Pantry Items': 'pantry',
    pantry: 'pantry',
    Other: 'other',
    other: 'other',
  };

  return categoryMap[category] || 'other';
};

/**
 * Get business type display name
 * @param {string} type - Backend business type
 * @returns {string} - Display name
 */
export const getBusinessTypeDisplay = (type) => {
  const typeMap = {
    farmer: 'Farm',
    restaurant: 'Restaurant',
    bakery: 'Bakery',
    supermarket: 'Supermarket',
    grocery: 'Grocery Store',
    cafe: 'Cafe',
    other: 'Other',
  };

  return typeMap[type] || type || 'Business';
};

/**
 * Format address object to string
 * @param {Object} address - Address object
 * @returns {string} - Formatted address string
 */
export const formatAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  const parts = [address.street, address.city, address.state, address.country].filter(Boolean);

  return parts.join(', ');
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: RWF)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'RWF') => {
  if (typeof amount !== 'number') return `${currency} 0`;
  return `${currency} ${amount.toLocaleString()}`;
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  try {
    return new Date(date).toLocaleDateString('en-US', defaultOptions);
  } catch {
    return '';
  }
};

/**
 * Format time for display
 * @param {string|Date} date - Date/time to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return '';

  try {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default {
  transformListingToProduct,
  transformProductToListing,
  transformOrderForConsumer,
  transformOrderForAdmin,
  transformBusinessToVendor,
  normalizeStatus,
  getStatusDisplay,
  getCategoryDisplay,
  getCategoryBackend,
  getBusinessTypeDisplay,
  formatAddress,
  formatCurrency,
  formatDate,
  formatTime,
};
