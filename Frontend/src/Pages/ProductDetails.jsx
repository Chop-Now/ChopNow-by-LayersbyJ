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
import { Flame, Users, Clock } from 'lucide-react';

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
        const list = data?.reviews || data;
        setReviews(Array.isArray(list) ? list : []);
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
      <div className="bg-fufu min-h-screen pt-[72px]">
        <PageNavbar />
        <section className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-20">
          <div className="bg-yellow text-moringa px-6 py-14 text-center flex flex-col items-center">
            <p className="eyebrow">404 / listing</p>
            <h1 className="display text-[56px] md:text-[80px] mt-3">Product not found</h1>
            <p className="mt-3 max-w-sm font-medium">
              It may have sold out or the vendor took it down. There is more food in the shop.
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="mt-6 h-12 px-6 bg-moringa text-fufu font-semibold hover:bg-moringa-dark"
            >
              Back to the shop
            </button>
          </div>
        </section>
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

  const Star5 = ({ value, size = 'w-4 h-4' }) => (
    <div className="flex gap-0.5" aria-label={`${value || 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={size}
          fill={value >= n ? 'var(--color-pepper)' : 'none'}
          stroke={value >= n ? 'var(--color-pepper)' : 'var(--color-moringa-muted)'}
          aria-hidden="true"
        />
      ))}
    </div>
  );

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />

      {/* Breadcrumb band */}
      <div className="bg-moringa text-fufu">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-4 flex flex-wrap items-center gap-2 eyebrow"
        >
          <Link to="/" className="hover:text-yellow flex items-center gap-1">
            <Home className="w-3.5 h-3.5" aria-hidden="true" /> Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="hover:text-yellow">
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/shop/${(product.category || 'all').toLowerCase()}`}
            className="hover:text-yellow"
          >
            {product.category || 'All'}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-yellow truncate max-w-[50vw]">{product.name}</span>
        </nav>
      </div>

      <section className="mx-auto max-w-[1440px] grid lg:grid-cols-2">
        {/* Gallery */}
        <div className="bg-fufu-dim lg:sticky lg:top-[72px] self-start">
          <div
            className="relative aspect-[4/3] overflow-hidden cursor-crosshair"
            onMouseEnter={() => setShowMagnifier(true)}
            onMouseLeave={() => setShowMagnifier(false)}
            onMouseMove={handleMouseMove}
          >
            <img src={thumbnail} alt={product.name} className="w-full h-full object-cover" />
            {discountPercent > 0 && (
              <div className="absolute top-0 left-0 bg-pepper text-char display text-[34px] px-4 py-2 leading-none">
                -{discountPercent}%
              </div>
            )}
            {showMagnifier && (
              <div
                className="absolute pointer-events-none border-4 border-moringa rounded-full"
                style={{
                  width: '150px',
                  height: '150px',
                  top: `${magnifierPosition.y}%`,
                  left: `${magnifierPosition.x}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundImage: `url(${thumbnail})`,
                  backgroundSize: '400%',
                  backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                  backgroundColor: 'white',
                  zIndex: 10,
                }}
              />
            )}
          </div>
          {(product.image || []).length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {(product.image || []).map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setThumbnail(image)}
                  aria-label={`Show image ${index + 1}`}
                  className={`w-20 h-20 shrink-0 overflow-hidden border-2 ${
                    thumbnail === image ? 'border-moringa' : 'border-transparent'
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="px-4 sm:px-8 lg:px-12 pt-8 pb-6 bg-white">
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow text-moringa-muted flex flex-wrap items-center gap-x-2">
                <span>{product.vendor}</span>
                {product.distance != null && (
                  <span className="flex items-center gap-1">
                    / <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {product.distance} km
                    away
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  aria-label={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
                  aria-pressed={isFavorite}
                  className="w-11 h-11 flex items-center justify-center border-2 border-moringa text-moringa hover:bg-mint transition-colors cursor-pointer disabled:opacity-50"
                >
                  {favoriteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className="w-4 h-4"
                      fill={isFavorite ? 'var(--color-pepper)' : 'none'}
                      stroke={isFavorite ? 'var(--color-pepper)' : 'currentColor'}
                    />
                  )}
                </button>
                <button
                  onClick={handleShareProduct}
                  className="h-11 px-4 flex items-center gap-2 border-2 border-moringa text-moringa hover:bg-mint transition-colors cursor-pointer text-sm font-semibold"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share
                </button>
              </div>
            </div>
            <h1 className="display text-moringa text-[48px] md:text-[64px] mt-4">{product.name}</h1>
            <div className="mt-4 flex items-center gap-2">
              <Star5 value={product.rating} size="w-5 h-5" />
              {product.rating ? (
                <span className="text-sm text-moringa-muted">({product.rating})</span>
              ) : null}
            </div>
          </div>

          {/* Price tile */}
          <div className="bg-yellow text-moringa px-4 sm:px-8 lg:px-12 py-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Rescue price</p>
              <p className="display text-[56px] md:text-[72px] mt-2">
                <span className="text-[0.5em] mr-2">RWF</span>
                {(productOfferPrice || 0).toLocaleString()}
              </p>
              {productPrice > productOfferPrice && (
                <p className="mt-2 text-sm font-semibold line-through opacity-70">
                  Was RWF {(productPrice || 0).toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${product.quantity <= 5 ? 'text-clay' : ''}`}>
                {product.quantity > 0 ? `Only ${product.quantity} left` : 'Out of stock'}
              </p>
              {currentCartQuantity > 0 && (
                <p className="text-xs mt-1">{currentCartQuantity} in your cart</p>
              )}
            </div>
          </div>

          {/* Pickup + urgency */}
          <div className="grid sm:grid-cols-2">
            <div className="bg-mint text-moringa px-4 sm:px-8 lg:px-12 py-5">
              <p className="eyebrow flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Pickup window
              </p>
              <p className="mt-2 text-lg font-bold">{product.pickupTime}</p>
            </div>
            <div className="bg-white px-4 sm:px-8 lg:px-12 py-5 flex flex-col justify-center gap-2 border-l border-hairline">
              {product.availableUntil && (
                <ExpiryCountdown until={product.availableUntil} variant="banner" />
              )}
              {(isSellingFast || isLowStock || cartCount >= 2) && (
                <div className="flex flex-wrap gap-2">
                  {isSellingFast && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pepper text-char text-xs font-bold">
                      <Flame className="w-3.5 h-3.5" aria-hidden="true" /> Selling fast
                    </span>
                  )}
                  {isLowStock && (
                    <span className="px-2.5 py-1.5 bg-peach text-clay text-xs font-bold">
                      Only {qty} left
                    </span>
                  )}
                  {cartCount >= 2 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-fufu-dim text-moringa text-xs font-bold">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      {cartCount} {cartCount === 1 ? 'person has' : 'people have'} this in their
                      cart
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white px-4 sm:px-8 lg:px-12 py-8 flex flex-col gap-7 flex-1 border-t border-hairline">
            {product.dietary_information && product.dietary_information.length > 0 && (
              <div>
                <p className="eyebrow text-moringa mb-3">Dietary information</p>
                <div className="flex flex-wrap gap-2">
                  {product.dietary_information.map((diet, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-lime text-moringa text-xs font-bold"
                    >
                      {diet}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.ingredients_allergens && product.ingredients_allergens.length > 0 && (
              <div>
                <p className="eyebrow text-moringa mb-3">Ingredients and allergens</p>
                {product.ingredients_allergens.map((item, index) => (
                  <div key={index} className="text-sm mb-2 text-moringa-muted leading-relaxed">
                    {item.ingredient && (
                      <p>
                        <strong className="text-moringa">Ingredients:</strong> {item.ingredient}
                      </p>
                    )}
                    {item.contains && (
                      <p>
                        <strong className="text-moringa">Contains:</strong> {item.contains}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="eyebrow text-moringa mb-3">About this food</p>
              {Array.isArray(product.description) ? (
                <ul className="list-disc ml-5 space-y-1 text-[15px] leading-relaxed text-moringa-muted">
                  {product.description.map((desc, index) => (
                    <li key={index}>{desc}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[15px] leading-relaxed text-moringa-muted">
                  {product.description || 'No description available.'}
                </p>
              )}
            </div>

            <div className="mt-auto grid sm:grid-cols-2 gap-2">
              {currentCartQuantity > 0 ? (
                <button
                  onClick={handleRemoveFromCart}
                  className="h-14 font-bold flex items-center justify-center gap-2 cursor-pointer bg-peach text-clay hover:bg-pepper hover:text-char transition-colors"
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                  Remove from cart ({currentCartQuantity})
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={product.quantity === 0}
                  className="h-14 font-bold flex items-center justify-center gap-2 cursor-pointer border-2 border-moringa text-moringa hover:bg-mint transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  Add to cart
                </button>
              )}
              <button
                onClick={handleBuyNow}
                disabled={product.quantity === 0 || currentCartQuantity >= product.quantity}
                className="h-14 font-bold bg-moringa text-fufu hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Buy now
              </button>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 pt-14">
          <div className="flex items-end justify-between border-b-2 border-moringa pb-4">
            <h2 className="display text-moringa text-[40px] md:text-[56px]">More like this</h2>
            <Link to="/shop" className="eyebrow text-moringa hover:underline underline-offset-4">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-6">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct._id} product={relProduct} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-moringa pb-4">
          <h2 className="display text-moringa text-[40px] md:text-[56px]">Reviews</h2>
          <p className="text-sm text-moringa-muted">
            Ordered from this vendor?{' '}
            <Link to="/my-orders" className="underline font-semibold text-moringa">
              Leave a review from My orders
            </Link>{' '}
            once it is completed.
          </p>
        </div>

        <div className="mt-2">
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-moringa" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="py-10 text-center text-moringa-muted">
              No reviews yet. Be the first to review this product.
            </p>
          ) : (
            reviews.map((reviewItem) => (
              <article
                key={reviewItem._id}
                className="py-6 border-b border-hairline grid md:grid-cols-[220px_1fr] gap-3"
              >
                <div>
                  <p className="font-bold text-moringa">
                    {reviewItem.customer?.firstName || 'Anonymous'}
                    {reviewItem.customer?.lastName
                      ? ` ${reviewItem.customer.lastName.charAt(0)}.`
                      : ''}
                  </p>
                  <div className="mt-1">
                    <Star5 value={reviewItem.rating} />
                  </div>
                  <p className="eyebrow text-[10px] text-moringa-muted mt-2">
                    {new Date(reviewItem.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[15px] leading-relaxed text-moringa">{reviewItem.comment}</p>
                  {reviewItem.response && (
                    <div className="mt-3 p-4 bg-mint">
                      <p className="eyebrow text-moringa mb-1">Vendor response</p>
                      <p className="text-sm text-moringa">{reviewItem.response.text}</p>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ProductDetails;
