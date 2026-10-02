import { useEffect, useState } from 'react';

/*
 * Landing page motion helpers. Everything here is progressive: without
 * IntersectionObserver, or with reduced motion on, content simply shows.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Reveal [data-reveal] elements inside `rootRef` as they scroll into view. */
export const useReveal = (rootRef) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    root.classList.add('reveal-on');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove('reveal-on');
    };
  }, [rootRef]);
};

/* Which landing section is under the middle of the viewport (or null). */
export const useActiveSection = (ids) => {
  const [active, setActive] = useState(null);
  const key = ids.join('|');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const els = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    els.forEach((el) => io.observe(el));
    // Above the first section (the hero) nothing is active.
    const onScroll = () => {
      const first = els[0];
      if (first && first.getBoundingClientRect().top > window.innerHeight * 0.5) setActive(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [key]);
  return active;
};

/* Page scroll progress written straight to a CSS variable (no re-renders). */
export const useScrollProgress = (ref) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty('--progress', max > 0 ? String(window.scrollY / max) : '0');
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
};
