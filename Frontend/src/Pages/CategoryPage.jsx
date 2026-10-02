import Breadcrumb from '../Components/Breadcrumb';
import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import Products from '../Components/Products';
import ShopSidebar from '../Components/ShopSidebar';
import React, { useState, useRef } from 'react';
import Categories from '../Components/Categories';
import { PageHero } from '../Components/brand/Kit';
import { useParams } from 'react-router-dom';

const CategoryPage = () => {
  const { category } = useParams();
  const [sortBy, setSortBy] = useState('Distance (Nearest First)');
  const [priceRange, setPriceRange] = useState(50000);
  const productsRef = useRef();

  // Capitalize first letter of category for display (with fallback)
  const displayCategory = category
    ? category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')
    : 'All Products';

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar onMobileFilterClick={() => productsRef.current?.openMobileSort()} />

      <PageHero eyebrow="Shop / category" title={displayCategory}>
        <div className="mt-5">
          <Breadcrumb category={displayCategory} />
        </div>
      </PageHero>
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
              category={category}
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

export default CategoryPage;
