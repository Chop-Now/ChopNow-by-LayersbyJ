import { categories } from '../assets/assets';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TINTS = ['bg-lime', 'bg-peach', 'bg-yellow', 'bg-mint', 'bg-fufu-dim', 'bg-peach', 'bg-lime'];

/*
 * Category strip (tile revamp): a row of square tiles that scrolls sideways
 * on small screens and fills the width on large ones. Replaces the old marquee.
 */
const Categories = () => {
  const navigate = useNavigate();
  const { category: active } = useParams();

  return (
    <nav aria-label="Food categories" className="border-b border-hairline bg-fufu">
      <ul className="mx-auto max-w-[1440px] flex overflow-x-auto snap-x lg:grid lg:grid-cols-7">
        {categories.map((c, i) => {
          const isActive = active && active.toLowerCase() === c.path.toLowerCase();
          return (
            <li key={c.path} className="snap-start shrink-0 w-[132px] sm:w-[160px] lg:w-auto">
              <button
                type="button"
                onClick={() => {
                  navigate(`/shop/${c.path.toLowerCase()}`);
                  window.scrollTo(0, 0);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-none group relative w-full h-[132px] sm:h-[150px] flex flex-col justify-between p-3 text-left overflow-hidden transition-colors ${
                  isActive ? 'bg-moringa text-yellow' : `${TINTS[i % TINTS.length]} text-moringa`
                }`}
              >
                <span className="eyebrow text-[10px] relative z-10">0{i + 1}</span>
                <img
                  src={c.image}
                  alt=""
                  className="absolute right-[-10%] bottom-[18%] w-[66%] max-w-[110px] group-hover:scale-105 transition-transform"
                />
                <span className="relative z-10 font-bold text-[14px] leading-tight max-w-[10ch]">
                  {c.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Categories;
