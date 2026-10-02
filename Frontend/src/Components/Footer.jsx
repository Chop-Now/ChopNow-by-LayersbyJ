import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
import { assets } from '../assets/assets';
import { Eyebrow } from './brand/Kit';
import { CMark } from './brand/Illustrations';

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/chopnowapp', Icon: Instagram },
  { label: 'X', href: 'https://x.com/chopnowapp', Icon: Twitter },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/chop-now/', Icon: Linkedin },
];

const columns = [
  {
    title: 'Explore',
    links: [
      { to: '/shop', label: 'Find food' },
      { to: '/signup', label: 'Sell on ChopNow' },
      { to: '/faq', label: 'FAQs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/contact-us', label: 'Contact us' },
      { to: '/privacy-policy', label: 'Privacy policy' },
      { to: '/terms-of-service', label: 'Terms of service' },
    ],
  },
];

/*
 * Site footer (LayersbyJ revamp). Char ground, mono labels, oversized wordmark.
 * Payment logos are limited to the two methods the platform actually takes
 * (pawaPay: MTN MoMo and Airtel Money).
 */
const Footer = () => (
  <footer className="bg-char text-fufu overflow-hidden">
    <div className="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-14 pt-12 lg:pt-14">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
        <div className="col-span-2 lg:col-span-1">
          <Eyebrow className="text-yellow">ChopNow</Eyebrow>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-fufu/85">
            Good food. Less waste. Rescuing surplus meals from Kigali&apos;s kitchens, one pickup at
            a time.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`ChopNow on ${label}`}
                className="w-11 h-11 border border-fufu/25 flex items-center justify-center text-fufu hover:bg-yellow hover:text-moringa hover:border-yellow transition-colors"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <Eyebrow className="text-yellow">{col.title}</Eyebrow>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[15px] text-fufu hover:text-yellow transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-2 lg:col-span-1">
          <Eyebrow className="text-yellow">We accept</Eyebrow>
          <div className="mt-4 flex items-center gap-3">
            {[
              [assets.momo, 'MTN Mobile Money'],
              [assets.airtel_money, 'Airtel Money'],
            ].map(([src, alt]) => (
              <div key={alt} className="w-16 h-16 bg-fufu flex items-center justify-center p-2.5">
                <img src={src} alt={alt} className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-fufu/70">Paid upfront, in the app.</p>
        </div>
      </div>

      <div className="mt-12 pt-5 border-t border-fufu/15 flex flex-col sm:flex-row justify-between gap-2 text-fufu/70">
        <Eyebrow>© 2026 ChopNow. All rights reserved.</Eyebrow>
        <Eyebrow>Kigali, Rwanda</Eyebrow>
      </div>

      <div className="relative mt-6 -mb-[0.2em] flex items-end gap-[2vw] select-none" aria-hidden="true">
        <CMark fill="var(--color-yellow)" className="w-[11vw] max-w-[190px] mb-[2vw] xl:mb-7 shrink-0" />
        <span className="wordmark text-yellow leading-[0.8] text-[clamp(52px,15.5vw,250px)]">ChopNow</span>
      </div>
    </div>
  </footer>
);

export default Footer;
