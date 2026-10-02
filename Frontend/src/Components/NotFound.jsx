import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Mail, ArrowRight } from 'lucide-react';
import { Logo } from './brand/Kit';
import { Pin, Fork } from './brand/Illustrations';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col bg-fufu">
      {/* Top bar */}
      <header className="bg-moringa h-[72px] flex items-center px-4 sm:px-8 lg:px-12">
        <Link to="/" aria-label="ChopNow home">
          <Logo tone="dark" size="md" />
        </Link>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        {/* Message tile */}
        <section className="bg-yellow text-moringa px-4 sm:px-8 lg:px-12 py-12 md:py-16 flex flex-col justify-center">
          <p className="eyebrow">Error 404</p>
          <h1 className="display text-[120px] sm:text-[160px] lg:text-[220px] mt-2 leading-[0.82]">
            Lost?
          </h1>
          <p className="mt-6 text-lg font-bold">It happens to the best of us</p>
          <p className="mt-3 max-w-md font-medium">
            We couldn't find the page you're looking for. Don't worry though, even the best
            explorers get a little lost sometimes. Let's get you back on track!
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row">
            <Link
              to="/"
              className="group h-14 px-6 bg-moringa text-fufu font-bold flex items-center justify-center gap-2 hover:bg-moringa-dark transition-colors"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Back to home
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/contact-us"
              className="h-14 px-6 border-2 border-moringa sm:border-l-0 text-moringa font-bold flex items-center justify-center gap-2 hover:bg-yellow-dark transition-colors"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              Contact us
            </Link>
          </div>

          <p className="mt-8 eyebrow text-[11px]">Need help? Our support team is here for you.</p>
        </section>

        {/* Illustration tiles */}
        <section className="grid grid-rows-2 min-h-[360px] md:min-h-0" aria-hidden="true">
          <div className="relative overflow-hidden bg-moringa">
            <Pin
              fill="var(--color-pepper)"
              hole="var(--color-moringa)"
              className="absolute w-[30%] left-[34%] top-[12%] -rotate-[14deg]"
            />
          </div>
          <div className="grid grid-cols-2">
            <div className="relative overflow-hidden bg-lime">
              <Fork className="absolute w-[40%] left-[30%] top-[8%] rotate-[18deg]" />
            </div>
            <div className="relative overflow-hidden bg-peach flex items-center justify-center">
              <span className="display text-[96px] sm:text-[128px] text-clay">404</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default NotFound;
