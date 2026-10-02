import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { analyticsService } from '../services';
import { useAppContext } from '../context/AppContext';

const ShopSidebar = ({ sortBy, setSortBy, priceRange, setPriceRange }) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const { isAuthenticated } = useAppContext();
  const [co2Saved, setCo2Saved] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    analyticsService
      .getMyImpact()
      .then((data) => {
        if (isMounted) setCo2Saved(data.co2Saved || 0);
      })
      .catch(() => {
        if (isMounted) setCo2Saved(null);
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const sortOptions = ['Distance (Nearest First)', 'Date Posted', 'A to Z', 'Vendor Rating'];

  return (
    <div
      className="w-full flex flex-col rounded-2xl p-5 h-full"
      style={{
        backgroundColor: 'white',
        border: '1px solid #E5E5E5',
      }}
    >
      {/* Sort By Section */}
      <div className="mb-6">
        <label
          className="block mb-2 text-xs font-semibold"
          style={{ color: 'var(--color-textColor)' }}
        >
          Sort By
        </label>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all hover:border-opacity-70"
            style={{
              border: '1px solid var(--color-moringa-muted)',
              color: 'var(--color-textColor)',
            }}
          >
            <span>{sortBy}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-moringa-muted)' }}
            />
          </button>

          {showSortDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg py-2 z-50"
              style={{
                backgroundColor: 'white',
                border: '1px solid #E5E5E5',
              }}
            >
              {sortOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors"
                  style={{
                    color: sortBy === option ? 'var(--color-solid)' : 'var(--color-textColor)',
                    fontWeight: sortBy === option ? '600' : '400',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Price Range Section */}
      <div className="flex-1">
        <label
          className="block mb-2 text-xs font-semibold"
          style={{ color: 'var(--color-textColor)' }}
        >
          Price Range
        </label>

        <div className="mb-4">
          <input
            id="price-range"
            type="range"
            min="0"
            max="100000"
            step="1000"
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-solid) 0%, var(--color-solid) ${(priceRange / 100000) * 100}%, #E5E5E5 ${(priceRange / 100000) * 100}%, #E5E5E5 100%)`,
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: var(--color-solid);
              cursor: pointer;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: var(--color-solid);
              cursor: pointer;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
          `}</style>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color: 'var(--color-textColor)' }}>
            RWF 0
          </span>
          <span className="font-semibold" style={{ color: 'var(--color-solid)' }}>
            RWF {priceRange.toLocaleString()}
          </span>
          <span className="font-medium" style={{ color: 'var(--color-textColor)' }}>
            RWF 100,000
          </span>
        </div>
      </div>

      {/* Your Impact Section */}
      <div
        className="mt-auto pt-4 rounded-xl p-4"
        style={{
          backgroundColor: 'var(--color-primary)',
          border: '1px solid #E5E5E5',
        }}
      >
        <h3
          className="text-xs font-semibold mb-2 text-center"
          style={{ color: 'var(--color-solid)' }}
        >
          Your Impact
        </h3>
        <p
          className="text-xs leading-relaxed text-center"
          style={{ color: 'var(--color-moringa-muted)' }}
        >
          {isAuthenticated && co2Saved !== null ? (
            <>
              You've saved{' '}
              <strong style={{ color: 'var(--color-textColor)' }}>{co2Saved.toFixed(1)}kg</strong>{' '}
              of CO
              <sub>2</sub> so far. Keep it up!
            </>
          ) : (
            'Sign in to track your food-waste impact.'
          )}
        </p>
      </div>
    </div>
  );
};

export default ShopSidebar;
