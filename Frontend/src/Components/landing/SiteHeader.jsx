import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo, Button } from '../brand/Kit';

const NAV = [
  { href: '#howItWorks', label: 'How it works' },
  { href: '#vendors', label: 'For vendors' },
  { href: '#Milestones', label: 'Milestones' },
  { href: '#AboutUs', label: 'About' },
];

const SiteHeader = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (e, href) => {
    e.preventDefault();
    setOpen(false);
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-moringa">
      <div className="mx-auto max-w-[1440px] h-16 md:h-20 px-4 sm:px-8 lg:px-12 flex items-center justify-between">
        <Link to="/" aria-label="ChopNow home" className="shrink-0">
          <Logo tone="dark" size="md" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-9">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => go(e, n.href)}
              className="eyebrow text-[13px] text-fufu hover:text-yellow transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/login" className="eyebrow text-[13px] text-fufu hover:text-yellow px-3">
            Log in
          </Link>
          <Button to="/shop" variant="yellow" size="sm" className="eyebrow text-[13px] px-5">
            Find food
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden w-11 h-11 bg-yellow text-moringa flex items-center justify-center"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-moringa z-50 flex flex-col">
          <nav aria-label="Mobile" className="flex flex-col border-t border-moringa-2">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(e) => go(e, n.href)}
                className="display text-[44px] text-fufu px-4 sm:px-8 py-4 border-b border-moringa-2"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto p-4 sm:p-8 grid grid-cols-2 gap-3">
            <Button to="/login" variant="outline" className="text-fufu" onClick={() => setOpen(false)}>
              Log in
            </Button>
            <Button to="/shop" variant="yellow" onClick={() => setOpen(false)}>
              Find food
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
