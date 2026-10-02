import Categories from '../Components/Categories';
import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import Products from '../Components/Products';
import ShopSidebar from '../Components/ShopSidebar';
import SEO from '../Components/SEO';
import { PageHero } from '../Components/brand/Kit';
import React, { useState, useRef } from 'react';

const Shop = () => {
  const [sortBy, setSortBy] = useState('Distance (Nearest First)');
  const [priceRange, setPriceRange] = useState(50000);
  const productsRef = useRef();

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <SEO
        title="Shop"
        description="Browse surplus food deals from local businesses near you. Save up to 70% on quality food while reducing waste."
        keywords="surplus food, discount food, food deals, Kigali, food near me"
      />
      <PageNavbar onMobileFilterClick={() => productsRef.current?.openMobileSort()} />
      <PageHero
        eyebrow="Live in Kigali / updated all day"
        title="Rescue today's food"
        intro="Surplus meals, bread and produce from vendors near you, at a discount. Order now, pick up later today."
      />
      <Categories />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex gap-6 items-start pb-24">
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
