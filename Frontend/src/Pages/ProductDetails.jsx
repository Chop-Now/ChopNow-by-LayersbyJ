import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import ProductCard from '../Components/ProductCard';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Home, Star, ShoppingCart, Trash2, Share2, Heart, Loader2, MapPin } from 'lucide-react';
import { reviewService, favoriteService } from '../services';
import toast from 'react-hot-toast';
import ExpiryCountdown from '../Components/ui/ExpiryCountdown';
import { Flame, Users } from 'lucide-react';

const ProductDetails = () => {
  const { products, addToCart, cartItems, removeAllFromCart, isAuthenticated } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Favorites state
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const product = products.find((item) => item._id === id);

  useEffect(() => {
    if (products.length > 0 && product) {
      let productsCopy = products.slice();
      productsCopy = productsCopy.filter(
        (item) => product.category === item.category && item._id !== product._id
      );
      setRelatedProducts(productsCopy.slice(0, 5));
    }
  }, [products, product]);

  useEffect(() => {
    setThumbnail(product?.image?.[0] || null);
  }, [product]);

  // Fetch reviews for the product's business
  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      if (!product?.vendorId) return;
      try {
        setReviewsLoading(true);
        const data = await reviewService.getBusinessReviews(product.vendorId);
        if (!isMounted) return;
        setReviews(data.reviews || data || []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch reviews:', error);
        setReviews([]);
      } finally {
        if (isMounted) setReviewsLoading(false);
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [product?.vendorId]);

  // Check if product is favorited (for logged-in users)
  useEffect(() => {
    let isMounted = true;
    const checkFavorite = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const data = await favoriteService.checkFavorite('listing', id);
        if (!isMounted) return;
        setIsFavorite(data.isFavorite || false);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to check favorite status:', error);
      }
    };
    checkFavorite();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, id]);

  if (!product) {
    return (
      <div className="bg-white min-h-screen pt-20">
        <PageNavbar />
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <p className="text-xl" style={{ color: 'var(--color-textColor)' }}>
            Product not found
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--color-solid)' }}
          >
            Back to Shop
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    const currentQuantity = cartItems[product._id] || 0;
    if (currentQuantity >= product.quantity) {
      toast.error(`Only ${product.quantity} items available in stock`);
      return;
    }
    addToCart(product._id);
  };

  const handleRemoveFromCart = () => {
    removeAllFromCart(product._id);
  };

  const handleBuyNow = () => {
    const currentQuantity = cartItems[product._id] || 0;
    if (currentQuantity >= product.quantity) {
      toast.error(`Only ${product.quantity} items available in stock`);
      return;
    }
    // Only add a unit if this item isn't in the cart yet - previously this
    // unconditionally called addToCart even when the item was already there,
    // so clicking Buy Now on an item you'd already added bumped the quantity
    // up by one instead of just taking you to checkout with what you'd
    // already selected (found during the 2026-09-26 E2E pass: 1 already in
    // cart, "Buy Now" silently made it 2).
    if (currentQuantity === 0) {
      addToCart(product._id);
    }
    navigate('/cart');
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMagnifierPosition({ x, y });
  };

  const handleShareProduct = () => {
    const productUrl = window.location.href;
    navigator.clipboard
      .writeText(productUrl)
      .then(() => {
        toast.success('Product link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      navigate('/login');
      return;
    }

    setFavoriteLoading(true);
    try {
      const result = await favoriteService.toggleFavorite('listing', id);
      setIsFavorite(result.isFavorite);
      toast.success(result.isFavorite ? 'Added to favorites!' : 'Removed from favorites');
    } catch (error) {
      toast.error(error.message || 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const productPrice = product?.price || 0;
  const productOfferPrice = product?.offerPrice || productPrice;
  const discountPercent =
    productPrice > 0 ? Math.round(((productPrice - productOfferPrice) / productPrice) * 100) : 0;
  const currentCartQuantity = cartItems[product._id] || 0;

  // Urgency signals
  const qty = product?.quantity || 0;
  const isLowStock = qty > 0 && qty <= 3;
  const totalQty = product?.totalQuantity || qty;
  const soldPct = totalQty > 0 ? (product?.soldCount || 0) / totalQty : 0;
  const isSellingFast = soldPct >= 0.5 && qty > 0;
  const cartCount = product?.cartCount || 0;

  return (
    <div className="bg-white min-h-screen pt-20">
      <PageNavbar />
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: 'var(--color-moringa-muted)' }}
        >
          <Link to="/" className="hover:opacity-70">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:opacity-70">
            Shop
          </Link>
          <span>/</span>
          <Link
            to={`/shop/${(product.category || 'all').toLowerCase()}`}
            className="hover:opacity-70"
          >
            {product.category || 'All'}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--color-solid)' }}>{product.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Side - Images */}
          <div className="flex gap-4 lg:w-1/2">
            <div className="flex flex-col gap-3">
              {(product.image || []).map((image, index) => (
                <div
                  key={index}
                  onClick={() => setThumbnail(image)}
                  className={`border rounded-lg overflow-hidden cursor-pointer hover:border-solid transition w-20 h-20 ${thumbnail === image ? 'border-2' : ''}`}
                  style={{ borderColor: thumbnail === image ? 'var(--color-solid)' : '#E5E5E5' }}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div
              className="flex-1 border rounded-lg overflow-hidden relative cursor-crosshair"
              style={{ borderColor: '#E5E5E5' }}
              onMouseEnter={() => setShowMagnifier(true)}
              onMouseLeave={() => setShowMagnifier(false)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={thumbnail}
                alt="Selected product"
                className="w-full h-full object-contain max-h-96"
              />

              {/* Magnifier Glass */}
              {showMagnifier && (
                <div
                  className="absolute pointer-events-none border-2 rounded-full"
                  style={{
                    borderColor: 'var(--color-solid)',
                    width: '150px',
                    height: '150px',
                    top: `${magnifierPosition.y}%`,
                    left: `${magnifierPosition.x}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundImage: `url(${thumbnail})`,
                    backgroundSize: '400%',
                    backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1
                className="text-2xl md:text-3xl font-semibold"
                style={{ color: 'var(--color-textColor)' }}
              >
                {product.name}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                  style={{
                    border: '1px solid var(--color-moringa-muted)',
                    color: isFavorite ? 'var(--color-solidOne)' : 'var(--color-textColor)',
                  }}
                >
                  {favoriteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className="w-4 h-4"
                      fill={isFavorite ? 'var(--color-solidOne)' : 'none'}
                    />
                  )}
                </button>
                <button
                  onClick={handleShareProduct}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    border: '1px solid var(--color-moringa-muted)',
                    color: 'var(--color-textColor)',
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
                {product.vendor}
              </p>
              {product.distance != null && (
                <p
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {product.distance} km away
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
              {Array(5)
                .fill('')
                .map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5"
                    fill={product.rating && product.rating > i ? 'var(--color-solidOne)' : 'none'}
                    stroke={
                      product.rating && product.rating > i
                        ? 'var(--color-solidOne)'
                        : 'var(--color-moringa-muted)'
                    }
                  />
                ))}
              {product.rating && (
                <span className="text-sm ml-2" style={{ color: 'var(--color-moringa-muted)' }}>
                  ({product.rating})
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold" style={{ color: 'var(--color-solid)' }}>
                  RWF {(productOfferPrice || 0).toLocaleString()}
                </p>
                {discountPercent > 0 && (
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--color-solidOne)' }}
                  >
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p
                className="text-sm line-through mt-1"
                style={{ color: 'var(--color-moringa-muted)' }}
              >
                RWF {(productPrice || 0).toLocaleString()}
              </p>
            </div>

            {/* Stock Info */}
            <div className="mb-6">
              <p
                className="text-sm font-medium"
                style={{
                  color: product.quantity <= 5 ? 'var(--color-solidOne)' : 'var(--color-solid)',
                }}
              >
                {product.quantity > 0
                  ? `Only ${product.quantity} remaining in stock`
                  : 'Out of stock'}
              </p>
              {currentCartQuantity > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-moringa-muted)' }}>
                  {currentCartQuantity} in your cart
                </p>
              )}
            </div>

            {/* Expiry countdown banner */}
            {product.availableUntil && (
              <div className="mb-4">
                <ExpiryCountdown until={product.availableUntil} variant="banner" />
              </div>
            )}

            {/* Pickup Time */}
            <div
              className="mb-4 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-textColor)' }}>
                🕐 Pickup: {product.pickupTime}
              </p>
            </div>

            {/* Social proof + urgency signals */}
            {(isSellingFast || isLowStock || cartCount >= 2) && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {isSellingFast && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#fff3e0', color: 'var(--color-solidOne)' }}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Selling fast
                  </div>
                )}
                {isLowStock && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                  >
                    ⚠ Only {qty} left
                  </div>
                )}
                {cartCount >= 2 && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#fff7ed', color: '#b45309' }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {cartCount} {cartCount === 1 ? 'person has' : 'people have'} this in their cart
                  </div>
                )}
              </div>
            )}

            {/* Dietary Information */}
            {product.dietary_information && product.dietary_information.length > 0 && (
              <div className="mb-6">
                <p
                  className="text-base font-semibold mb-2"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Dietary Information
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.dietary_information.map((diet, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-solid)',
                      }}
                    >
                      {diet}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients & Allergens */}
            {product.ingredients_allergens && product.ingredients_allergens.length > 0 && (
              <div className="mb-6">
                <p
                  className="text-base font-semibold mb-2"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Ingredients & Allergens
                </p>
                {product.ingredients_allergens.map((item, index) => (
                  <div
                    key={index}
                    className="text-sm mb-2"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    {item.ingredient && (
                      <p>
                        <strong>Ingredients:</strong> {item.ingredient}
                      </p>
                    )}
                    {item.contains && (
                      <p>
                        <strong>Contains:</strong> {item.contains}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* About Product */}
            <div className="mb-6">
              <p
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--color-textColor)' }}
              >
                About Product
              </p>
              {Array.isArray(product.description) ? (
                <ul
                  className="list-disc ml-5 space-y-1 text-sm"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  {product.description.map((desc, index) => (
                    <li key={index}>{desc}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
                  {product.description || 'No description available.'}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {currentCartQuantity > 0 ? (
                <button
                  onClick={handleRemoveFromCart}
                  className="flex-1 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-solidOne)',
                    color: 'white',
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                  Remove from Cart ({currentCartQuantity})
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={product.quantity === 0}
                  className="flex-1 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-solid)',
                    border: '2px solid var(--color-solid)',
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              )}
              <button
                onClick={handleBuyNow}
                disabled={product.quantity === 0 || currentCartQuantity >= product.quantity}
                className="flex-1 py-3 rounded-lg font-medium text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-solid)' }}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-textColor)' }}>
              Related Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct._id} product={relProduct} />
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews Section */}
        <div className="mt-12 border-t pt-8" style={{ borderColor: '#E5E5E5' }}>
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-textColor)' }}>
            Customer Reviews
          </h2>

          {/* Reviews are written per completed order, from My Orders */}
          <p className="mb-6 text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
            Ordered from this vendor?{' '}
            <Link to="/my-orders" className="underline" style={{ color: 'var(--color-solid)' }}>
              Leave a review from My Orders
            </Link>{' '}
            once your order is completed.
          </p>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-solid)' }} />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
                  No reviews yet. Be the first to review this product!
                </p>
              </div>
            ) : (
              reviews.map((reviewItem) => (
                <div
                  key={reviewItem._id}
                  className="p-5 rounded-lg border"
                  style={{ borderColor: '#E5E5E5' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--color-textColor)' }}>
                        {reviewItem.customer?.firstName || 'Anonymous'}
                        {reviewItem.customer?.lastName
                          ? ` ${reviewItem.customer.lastName.charAt(0)}.`
                          : ''}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="w-4 h-4"
                            fill={reviewItem.rating >= star ? 'var(--color-solidOne)' : 'none'}
                            stroke={
                              reviewItem.rating >= star
                                ? 'var(--color-solidOne)'
                                : 'var(--color-moringa-muted)'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                      {new Date(reviewItem.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
                    {reviewItem.comment}
                  </p>
                  {reviewItem.response && (
                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'var(--color-solid)' }}
                      >
                        Business Response:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-textColor)' }}>
                        {reviewItem.response.text}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetails;
