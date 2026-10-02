import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useAppContext } from '../context/AppContext';
import ProductCard from './ProductCard';

const Products = forwardRef(({ sortBy, priceRange, category, setSortBy, setPriceRange }, ref) => {
  const { products, searchQuery, productsLoading } = useAppContext();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Expose method to parent
  useImperativeHandle(ref, () => ({
    openMobileSort: () => setShowMobileSort(true),
  }));

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const productsPerPage = isMobile ? 10 : 9;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // Ensure products is an array before filtering
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }

    let filtered = products.filter((product) => product?.inStock);

    // Filter by category if provided
    if (category) {
      filtered = filtered.filter(
        (product) => product?.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery && searchQuery.length > 0) {
      filtered = filtered.filter((product) =>
        product?.name?.toLowerCase()?.includes(searchQuery.toLowerCase())
      );
    }

    // Filter by price range
    filtered = filtered.filter((product) => (product?.offerPrice || 0) <= priceRange);

    // Sort products
    if (sortBy === 'Distance (Nearest First)') {
      // Products without a known distance (no geolocation permission, or the
      // listing's business has no location on file) sort to the end.
      filtered = [...filtered].sort((a, b) => {
        if (a?.distance == null && b?.distance == null) return 0;
        if (a?.distance == null) return 1;
        if (b?.distance == null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === 'Date Posted') {
      filtered = filtered.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    } else if (sortBy === 'A to Z') {
      filtered = filtered.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    } else if (sortBy === 'Vendor Rating') {
      filtered = filtered.sort((a, b) => (b?.rating || 0) - (a?.rating || 0));
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [products, searchQuery, sortBy, priceRange, category]);

  const getSortTitle = () => {
    switch (sortBy) {
      case 'Distance (Nearest First)':
        return 'Fresh Deals Near You';
      case 'Date Posted':
        return 'Recently Posted Deals';
      case 'A to Z':
        return 'All Deals A-Z';
      case 'Vendor Rating':
        return 'Top Rated Vendors';
      default:
        return 'Fresh Deals Near You';
    }
  };
  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Generate page numbers to display (max 5)
  const getPageNumbers = () => {
    const pages = [];
    const maxPages = 5;

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxPages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxPages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="mt-1 flex flex-col relative">
        {/* Title and Price Slider Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-end w-max">
            <p className="md:text-2xl text-lg font-medium">{getSortTitle()}</p>
            <div className="w-16 h-0.5 bg-solid rounded-full"></div>
          </div>

          {/* Mobile Price Slider */}
          <div className="md:hidden flex flex-col items-end">
            <label className="text-xs font-medium mb-1" style={{ color: 'var(--color-textColor)' }}>
              Price: RWF {priceRange.toLocaleString()}
            </label>
            <input
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(parseInt(e.target.value))}
              className="w-24 h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-solid) 0%, var(--color-solid) ${(priceRange / 100000) * 100}%, #E5E5E5 ${(priceRange / 100000) * 100}%, #E5E5E5 100%)`,
              }}
            />
          </div>
        </div>

        {/* Mobile Sort Modal */}
        {showMobileSort && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setShowMobileSort(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden animate-slide-up">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-textColor)' }}>
                    Sort By
                  </h3>
                  <button onClick={() => setShowMobileSort(false)} className="text-gray-500">
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {['Distance (Nearest First)', 'Date Posted', 'A to Z', 'Vendor Rating'].map(
                    (option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setSortBy(option);
                          setShowMobileSort(false);
                        }}
                        className={`text-left px-4 py-3 rounded-lg transition ${
                          sortBy === option ? 'font-semibold' : ''
                        }`}
                        style={{
                          color:
                            sortBy === option ? 'var(--color-solid)' : 'var(--color-textColor)',
                          backgroundColor:
                            sortBy === option ? 'rgba(0, 168, 107, 0.1)' : 'transparent',
                        }}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {productsLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div
                className="w-10 h-10 border-4 border-solid border-t-transparent rounded-full animate-spin mx-auto mb-3"
                style={{ borderColor: 'var(--color-solid)', borderTopColor: 'transparent' }}
              ></div>
              <p className="text-sm text-gray-500">Loading products...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!productsLoading && currentProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No products found</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {category
                ? `No ${category} products available at the moment.`
                : 'No products match your search criteria.'}
            </p>
          </div>
        )}

        {/* Product Grid */}
        {!productsLoading && currentProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-6">
            {currentProducts.map((product, index) => (
              <ProductCard key={product._id || index} product={product} />
            ))}
          </div>
        )}

        {/* Pagination absolutely positioned so sidebar matches only grid height */}
        {!productsLoading && totalPages > 1 && (
          <div className="absolute left-0 right-0 top-full mt-8 flex items-center justify-center w-full">
            <div className="flex items-center justify-between w-full max-w-80 text-gray-500 font-medium">
              <button
                type="button"
                aria-label="prev"
                className="rounded-full bg-slate-200/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z"
                    fill="#475569"
                    stroke="#475569"
                    strokeWidth=".078"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-2 text-sm font-medium">
                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-10 w-10 flex items-center justify-center aspect-square cursor-pointer ${
                      currentPage === pageNum ? 'border rounded-full' : ''
                    }`}
                    style={
                      currentPage === pageNum
                        ? {
                            color: 'var(--color-solid)',
                            borderColor: 'var(--color-solid)',
                          }
                        : {}
                    }
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="next"
                className="rounded-full bg-slate-200/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <svg
                  className="rotate-180"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z"
                    fill="#475569"
                    stroke="#475569"
                    strokeWidth=".078"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

Products.displayName = 'Products';

export default Products;
