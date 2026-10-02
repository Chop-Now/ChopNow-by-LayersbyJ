import React from 'react';
import { Link } from 'react-router-dom';
import { CMark } from './Illustrations';

/**
 * Small building blocks for the LayersbyJ tile revamp. Keep pages composed
 * from these so the system stays consistent.
 */

const cx = (...c) => c.filter(Boolean).join(' ');

/* Logo lockup. `tone` picks an approved brand lockup. */
export const Logo = ({ tone = 'dark', size = 'md', className }) => {
  const sizes = {
    sm: { mark: 'w-6', text: 'text-lg' },
    md: { mark: 'w-8', text: 'text-2xl' },
    lg: { mark: 'w-11', text: 'text-[32px]' },
  }[size];
  const tones = {
    // Yellow mark + Fufu wordmark: on Moringa (the cover lockup)
    dark: { mark: 'var(--color-yellow)', text: 'text-fufu' },
    // Moringa mark + Moringa wordmark: on Fufu and light tiles
    light: { mark: 'var(--color-moringa)', text: 'text-moringa' },
    // Moringa on Yellow
    yellow: { mark: 'var(--color-moringa)', text: 'text-moringa' },
  }[tone];
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <CMark fill={tones.mark} className={sizes.mark} />
      <span className={cx('wordmark leading-none', sizes.text, tones.text)}>ChopNow</span>
    </span>
  );
};

export const Eyebrow = ({ as: As = 'p', className, children }) => (
  <As className={cx('eyebrow', className)}>{children}</As>
);

export const Display = ({ as: As = 'h2', className, children, style }) => (
  <As className={cx('display', className)} style={style}>
    {children}
  </As>
);

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2';

const BTN_VARIANTS = {
  // Default primary on light ground (CLAUDE.md: primary CTA is Moringa)
  primary: 'bg-moringa text-fufu hover:bg-moringa-dark focus-visible:outline-moringa',
  // Primary when the button sits on a Moringa tile
  yellow: 'bg-yellow text-moringa hover:bg-yellow-dark focus-visible:outline-yellow',
  light: 'bg-fufu text-moringa hover:bg-white focus-visible:outline-fufu',
  outline:
    'border-2 border-current bg-transparent hover:bg-moringa/5 focus-visible:outline-current',
  ghost: 'bg-transparent underline-offset-4 hover:underline',
};

const BTN_SIZES = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-6 text-[15px]',
  lg: 'h-14 px-7 text-base',
};

export const Button = ({
  to,
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}) => {
  const cls = cx(BTN_BASE, BTN_VARIANTS[variant], BTN_SIZES[size], className);
  if (to)
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
};

/* A flat colour block. Tiles butt against each other: no gap, no radius. */
export const Tile = ({ as: As = 'div', className, children, ...rest }) => (
  <As className={cx('relative overflow-hidden', className)} {...rest}>
    {children}
  </As>
);

/* Page-level hero band used across the web app (shop, orders, profile...). */
export const PageHero = ({ eyebrow, title, intro, tone = 'moringa', aside, children }) => {
  const tones = {
    moringa: 'bg-moringa text-fufu',
    yellow: 'bg-yellow text-moringa',
    pepper: 'bg-pepper text-fufu',
    lime: 'bg-lime text-moringa',
    peach: 'bg-peach text-clay',
    fufu: 'bg-fufu text-moringa border-b border-hairline',
  }[tone];
  const accent = tone === 'moringa' ? 'text-yellow' : '';
  return (
    <section className={cx('relative overflow-hidden', tones)}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-10 md:py-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && <Eyebrow className={cx('mb-4 opacity-90', accent)}>{eyebrow}</Eyebrow>}
          <Display as="h1" className="text-[56px] sm:text-[72px] md:text-[96px]">
            {title}
          </Display>
          {intro && (
            <p className="mt-4 max-w-xl text-base md:text-lg font-medium opacity-90">{intro}</p>
          )}
          {children}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  );
};
