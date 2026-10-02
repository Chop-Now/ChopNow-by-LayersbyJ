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
    <div className="w-full flex flex-col h-full border border-char/10 bg-white">
      <div className="p-5 border-b border-hairline">
        <label className="eyebrow text-moringa block mb-3">Sort by</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            aria-expanded={showSortDropdown}
            className="w-full h-11 px-3 flex items-center justify-between text-sm font-semibold text-moringa bg-fufu border-2 border-moringa"
          >
            <span>{sortBy}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
            />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full left-0 right-0 bg-white border-2 border-t-0 border-moringa z-50">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSortBy(option);
                    setShowSortDropdown(false);
                  }}
                  className={`w-full h-11 px-3 text-left text-sm transition-colors ${
                    sortBy === option
                      ? 'bg-moringa text-yellow font-semibold'
                      : 'text-moringa hover:bg-fufu'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex-1">
        <label htmlFor="price-range" className="eyebrow text-moringa block mb-3">
          Max price
        </label>
        <p className="display text-moringa text-[34px] mb-4">
          <span className="text-[0.6em] mr-1">RWF</span>
          {priceRange.toLocaleString()}
        </p>
        <input
          id="price-range"
          type="range"
          min="0"
          max="100000"
          step="1000"
          value={priceRange}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          className="chop-range w-full"
          style={{ '--fill': `${(priceRange / 100000) * 100}%` }}
        />
        <div className="mt-2 flex justify-between eyebrow text-[10px] text-moringa-muted">
          <span>RWF 0</span>
          <span>RWF 100,000</span>
        </div>
      </div>

      <div className="mt-auto bg-moringa text-fufu p-5">
        <p className="eyebrow text-yellow">Your impact</p>
        {isAuthenticated && co2Saved !== null ? (
          <>
            <p className="display text-[48px] mt-3">
              {co2Saved.toFixed(1)}
              <span className="text-[0.5em] ml-1">kg CO2</span>
            </p>
            <p className="text-sm text-fufu/85 mt-1">saved so far. Keep it up.</p>
          </>
        ) : (
          <p className="text-sm mt-3 text-fufu/90">Sign in to track the food waste you prevent.</p>
        )}
      </div>
    </div>
  );
};

export default ShopSidebar;
