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

  const SORTS = ['Distance (Nearest First)', 'Date Posted', 'A to Z', 'Vendor Rating'];

  return (
    <>
      <div className="flex flex-col relative">
        {/* Title row */}
        <div className="flex items-end justify-between gap-4 pb-4 border-b-2 border-moringa">
          <div>
            <p className="eyebrow text-moringa-muted">
              {!productsLoading ? `${currentProducts.length} on this page` : 'Loading'}
            </p>
            <h2 className="display text-moringa text-[40px] md:text-[56px] mt-1">
              {getSortTitle()}
            </h2>
          </div>

          <div className="md:hidden flex flex-col items-end gap-2">
            <label htmlFor="price-mobile" className="eyebrow text-[10px] text-moringa">
              Up to RWF {priceRange.toLocaleString()}
            </label>
            <input
              id="price-mobile"
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(parseInt(e.target.value))}
              className="chop-range w-28"
              style={{ '--fill': `${(priceRange / 100000) * 100}%` }}
            />
          </div>
        </div>

        {/* Mobile sort sheet */}
        {showMobileSort && (
          <>
            <div
              className="fixed inset-0 bg-char/40 z-40 md:hidden"
              onClick={() => setShowMobileSort(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-fufu z-50 md:hidden animate-slide-up border-t-4 border-moringa">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="display text-[36px] text-moringa">Sort by</h3>
                  <button
                    onClick={() => setShowMobileSort(false)}
                    className="w-11 h-11 bg-moringa text-fufu font-bold"
                    aria-label="Close sort options"
                  >
                    X
                  </button>
                </div>
                <div className="flex flex-col">
                  {SORTS.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setShowMobileSort(false);
                      }}
                      className={`text-left px-4 h-14 border-b border-hairline font-semibold transition-colors ${
                        sortBy === option ? 'bg-moringa text-yellow' : 'text-moringa'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {productsLoading && (
          <div className="flex items-center justify-center py-24" role="status">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-moringa border-t-yellow rounded-full animate-spin mx-auto mb-3" />
              <p className="eyebrow text-moringa-muted">Loading food near you</p>
            </div>
          </div>
        )}

        {!productsLoading && currentProducts.length === 0 && (
          <div className="mt-6 bg-yellow text-moringa px-6 py-12 md:py-16 text-center flex flex-col items-center rounded-lg">
            <p className="eyebrow">Nothing here yet</p>
            <h3 className="display text-[48px] md:text-[64px] mt-3">The plate is empty</h3>
            <p className="mt-3 text-base font-medium max-w-sm">
              {category
                ? `No ${category} listings right now. Vendors post fresh surplus every day, so check back soon.`
                : 'Nothing matches your search. Try a wider price range or a different word.'}
            </p>
          </div>
        )}

        {!productsLoading && currentProducts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-6">
            {currentProducts.map((product, index) => (
              <ProductCard key={product._id || index} product={product} />
            ))}
          </div>
        )}

        {!productsLoading && totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="absolute left-0 right-0 top-full mt-8 flex items-center justify-center w-full"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                className="h-11 px-4 bg-moringa text-fufu font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                  className={`h-11 w-11 flex items-center justify-center font-bold cursor-pointer transition-colors ${
                    currentPage === pageNum
                      ? 'bg-yellow text-moringa'
                      : 'text-moringa hover:bg-fufu-dim'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                className="h-11 px-4 bg-moringa text-fufu font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </>
  );
});

Products.displayName = 'Products';

export default Products;
