import Categories from '../Components/Categories';
import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import Products from '../Components/Products';
import ShopSidebar from '../Components/ShopSidebar';
import SEO from '../Components/SEO';
import React, { useState, useRef } from 'react';

const Shop = () => {
  const [sortBy, setSortBy] = useState('Distance (Nearest First)');
  const [priceRange, setPriceRange] = useState(50000);
  const productsRef = useRef();

  return (
    <div className="bg-white min-h-screen pt-20">
      <SEO
        title="Shop"
        description="Browse surplus food deals from local businesses near you. Save up to 70% on quality food while reducing waste."
        keywords="surplus food, discount food, food deals, Kigali, food near me"
      />
      <PageNavbar onMobileFilterClick={() => productsRef.current?.openMobileSort()} />
      <Categories />

      <div className="px-6 md:px-8 lg:px-12 xl:px-16 py-6">
        <div className="flex gap-6 items-start pb-12">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 self-stretch">
            <ShopSidebar
              sortBy={sortBy}
              setSortBy={setSortBy}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
            />
          </aside>
          {/* Main Content Area */}
          <main className="flex-1">
            <Products
              ref={productsRef}
              sortBy={sortBy}
              priceRange={priceRange}
              setSortBy={setSortBy}
              setPriceRange={setPriceRange}
            />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
