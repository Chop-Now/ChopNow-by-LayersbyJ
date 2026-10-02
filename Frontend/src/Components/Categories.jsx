import { categories } from '../assets/assets';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Categories = () => {
  const navigate = useNavigate();

  return (
    <div className="mt-8 px-6 md:px-8 lg:px-18">
      <style>{`
        .marquee-inner {
          animation: marqueeScroll linear infinite;
        }

        @keyframes marqueeScroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .marquee-container {
          position: relative;
        }

        .marquee-container::before,
        .marquee-container::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100px;
          z-index: 10;
          pointer-events: none;
        }

        .marquee-container::before {
          left: 0;
          background: linear-gradient(to right, rgba(246, 255, 249, 1), rgba(246, 255, 249, 0));
        }

        .marquee-container::after {
          right: 0;
          background: linear-gradient(to left, rgba(246, 255, 249, 1), rgba(246, 255, 249, 0));
        }
      `}</style>

      <div className="marquee-container overflow-hidden">
        <div
          className="marquee-inner flex will-change-transform gap-4"
          style={{ animationDuration: '30s' }}
        >
          {/* Render categories multiple times for seamless loop */}
          {[...Array(4)].map((_, setIndex) => (
            <React.Fragment key={setIndex}>
              {categories.map((category, index) => (
                <div
                  key={`${setIndex}-${index}`}
                  className="group cursor-pointer py-2.5 px-2 gap-1.5 rounded-lg flex flex-col justify-center items-center shrink-0"
                  style={{
                    backgroundColor: category.bgColor,
                    minWidth: '105px',
                    maxWidth: '105px',
                  }}
                  onClick={() => {
                    navigate(`/shop/${category.path.toLowerCase()}`);
                    scrollTo(0, 0);
                  }}
                >
                  <img
                    src={category.image}
                    alt={category.text}
                    className="group-hover:scale-110 transition max-w-16"
                  />
                  <p className="text-xs font-medium">{category.text}</p>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
