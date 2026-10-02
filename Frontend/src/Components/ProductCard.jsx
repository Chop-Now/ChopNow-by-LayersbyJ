import { ShoppingCart, Flame, Users, MapPin } from 'lucide-react';
import React, { useCallback, memo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import ExpiryCountdown from './ui/ExpiryCountdown';

const ProductCard = memo(({ product }) => {
  const { addToCart, removeFromCart, cartItems, setSearchQuery } = useAppContext();
  const navigate = useNavigate();

  if (!product) return null;

  const price = product.price || 0;
  const offerPrice = product.offerPrice || price;
  const discountPercent = price > 0 ? Math.round(((price - offerPrice) / price) * 100) : 0;

  // Urgency signals
  const qty = product.quantity || 0;
  const isLowStock = qty > 0 && qty <= 3;
  const totalQty = product.totalQuantity || qty;
  const soldPercent = totalQty > 0 ? (product.soldCount || 0) / totalQty : 0;
  const isSellingFast = soldPercent >= 0.5 && qty > 0;
  const cartCount = product.cartCount || 0;

  // Show expiry if within 12 hours
  const showExpiry = product.availableUntil
    ? new Date(product.availableUntil) - Date.now() < 12 * 60 * 60 * 1000
    : false;

  const handleProductClick = () => {
    setSearchQuery('');
    const category = product.category?.toLowerCase() || 'all';
    navigate(`/shop/${category}/${product._id}`);
    window.scrollTo(0, 0);
  };

  return (
    <article
      onClick={handleProductClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleProductClick();
        }
      }}
      aria-label={`${product.name || 'Product'} - RWF ${(offerPrice || 0).toLocaleString()}${discountPercent > 0 ? `, ${discountPercent}% off` : ''}`}
      className="relative bg-white w-full h-full flex flex-col border border-char/10 hover:border-moringa transition-colors duration-200 overflow-hidden cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-moringa group"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-fufu-dim">
        <img
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          src={product.image?.[0] || '/placeholder-food.jpg'}
          alt={product.name || 'Product'}
          loading="lazy"
          decoding="async"
        />

        {discountPercent > 0 && (
          <div className="absolute top-0 right-0 bg-pepper text-char px-2.5 py-1.5 z-10 display text-[20px] leading-none">
            -{discountPercent}%
          </div>
        )}

        {isSellingFast && (
          <div className="absolute top-0 left-0 flex items-center gap-1 bg-yellow text-moringa px-2.5 py-1.5 eyebrow text-[10px] z-10">
            <Flame className="w-3 h-3" aria-hidden="true" />
            Selling fast
          </div>
        )}

        {product.status !== 'active' && (
          <div className="absolute inset-0 bg-char/60 flex items-center justify-center z-10">
            <span className="display text-fufu text-[28px]">
              {product.status === 'expired' ? 'Expired' : 'Sold out'}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-3 md:px-4 pt-3 pb-3 md:pb-4">
        <p className="eyebrow text-[10px] text-moringa-muted flex items-center gap-1 min-w-0">
          <span className="truncate">{product.vendor || 'Unknown vendor'}</span>
          {product.distance != null && (
            <span className="flex items-center gap-0.5 shrink-0 whitespace-nowrap">
              <span aria-hidden="true">/</span>
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {product.distance} km
            </span>
          )}
        </p>
        <p className="mt-1 font-bold text-[15px] md:text-base leading-snug text-moringa line-clamp-2">
          {product.name || 'Product'}
        </p>
        <p className="mt-1 text-xs text-moringa-muted">Pickup {product.pickupTime || 'flexible'}</p>

        {showExpiry ? (
          <div className="mt-2">
            <ExpiryCountdown until={product.availableUntil} variant="pill" />
          </div>
        ) : isLowStock ? (
          <p className="mt-2 text-xs font-bold text-clay">Only {qty} left</p>
        ) : cartCount >= 3 ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-clay">
            <Users className="w-3 h-3" aria-hidden="true" />
            {cartCount} people eyeing this
          </p>
        ) : null}

        <div className="mt-auto pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="min-w-0">
            {price > offerPrice && (
              <p className="text-xs line-through text-moringa-muted">
                RWF {price.toLocaleString()}
              </p>
            )}
            <p className="display text-[22px] md:text-[26px] text-moringa whitespace-nowrap">
              <span className="text-[0.62em] mr-1">RWF</span>
              {(offerPrice || 0).toLocaleString()}
            </p>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto [&>div]:justify-between"
          >
            {!cartItems[product._id] || cartItems[product._id] === 0 ? (
              <button
                className="flex items-center justify-center gap-1.5 h-10 px-3 md:px-4 bg-moringa text-fufu text-xs font-bold hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => addToCart(product._id)}
                disabled={product.status !== 'active'}
                aria-label={`Add ${product.name || 'product'} to cart`}
              >
                <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                Add
              </button>
            ) : (
              <div className="flex items-center h-10 border-2 border-moringa select-none">
                <button
                  onClick={() => removeFromCart(product._id)}
                  className="cursor-pointer w-8 h-full font-bold text-moringa hover:bg-mint transition-colors"
                  aria-label={`Remove one ${product.name || 'item'} from cart`}
                >
                  -
                </button>
                <span className="w-6 text-center font-bold text-sm text-moringa" aria-live="polite">
                  {cartItems[product._id]}
                </span>
                <button
                  onClick={() => addToCart(product._id)}
                  className="cursor-pointer w-8 h-full font-bold text-moringa hover:bg-mint transition-colors"
                  aria-label={`Add another ${product.name || 'item'} to cart`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
