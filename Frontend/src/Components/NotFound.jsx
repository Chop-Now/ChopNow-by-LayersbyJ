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
          <h1 className="display text-[72px] sm:text-[104px] lg:text-[132px] mt-2 leading-[0.92]">
            Someone ate this page.
          </h1>
          <p className="mt-6 text-lg font-bold">It was rescued before you got here.</p>
          <p className="mt-3 max-w-md font-medium">
            Good news: there's still plenty of food left. Bad news: this page isn't on the menu any
            more. Let's get you back to the good stuff.
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

          <p className="mt-8 eyebrow text-[11px]">
            No crumbs were harmed in the making of this error.
          </p>
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
              <span className="text-center">
                <span className="display block text-[96px] sm:text-[128px] text-clay">404</span>
                <span className="eyebrow text-[10px] text-clay">Plate licked clean</span>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default NotFound;
