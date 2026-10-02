import { assets } from '../assets/assets';
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Mail } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-20 bg-linear-to-br from-slate-900 via-slate-800 to-solid/10">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-solid/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-solidOne/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
        {/* 404 Badge */}
        <div className="mb-6 px-4 py-2 bg-solid/20 border-2 border-solid/30 rounded-full">
          <span className="text-solid font-bold text-xs md:text-sm tracking-wider">ERROR 404</span>
        </div>

        {/* Astronaut Image */}
        <div className="mb-8">
          <img
            src={assets.lost}
            alt="Lost in space"
            className="w-50 h-50 object-contain drop-shadow-2xl animate-float"
          />
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 text-center">
          Lost?
        </h1>

        {/* Subheading */}
        <p className="text-base md:text-lg lg:text-xl text-solid font-semibold mb-6 text-center">
          It happens to the best of us
        </p>

        {/* Divider */}
        <div className="h-px w-64 md:w-80 bg-linear-to-r from-transparent via-slate-600 to-transparent my-6"></div>

        {/* Description */}
        <p className="text-sm md:text-base text-slate-300 max-w-lg text-center mb-10 leading-relaxed">
          We couldn't find the page you're looking for. Don't worry though, even the best explorers
          get a little lost sometimes. Let's get you back on track!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            to="/"
            className="group flex items-center justify-center gap-2 bg-solid hover:bg-tertiary px-5 md:px-6 py-2.5 md:py-3 text-white text-sm rounded-full font-medium active:scale-95 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
            <svg
              className="group-hover:translate-x-1 transition-transform"
              width="18"
              height="18"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.583 11h12.833m0 0L11 4.584M17.416 11 11 17.417"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <Link
            to="/contact-us"
            className="group flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border-2 border-solid px-5 md:px-6 py-2.5 md:py-3 text-solid text-sm rounded-full font-medium active:scale-95 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Us</span>
          </Link>
        </div>

        {/* Helper Text */}
        <p className="mt-10 text-[10px] md:text-xs text-slate-400 text-center">
          Need help? Our support team is here for you.
        </p>
      </div>

      {/* Floating Animation Keyframes */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFound;
