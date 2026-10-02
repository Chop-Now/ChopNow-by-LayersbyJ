import React from 'react';
import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/chopnowapp',
    Icon: Instagram,
  },
  { label: 'X', href: 'https://x.com/chopnowapp', Icon: Twitter },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/chop-now/',
    Icon: Linkedin,
  },
];

const Footer = () => {
  const linkSections = [
    {
      title: 'Quick Links',
      links: ['Contact Us', 'FAQs', 'Privacy Policy'],
    },
    {
      // 'Delivery Information' and 'Return & Refund Policy' used to be listed
      // here too, but neither has a real page - no route, no content, ever -
      // so they rendered as dead `href="#"` links that looked clickable and
      // did nothing. Removed rather than inventing policy content on the
      // business's behalf; add them back once those pages actually exist.
      title: 'Need Help?',
      links: ['Terms & Conditions'],
    },
  ];
  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 text-moringa-muted">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <img className="h-9 md:h-10" src={assets.wordmarklogo} alt="ChopNow" />
          <p className="max-w-[410px] mt-6">
            Fueling Africa's food security by rescuing meals, fighting waste, and empowering
            communities.
          </p>
        </motion.div>
        <div className="flex flex-wrap justify-between w-full md:w-[60%] gap-8">
          {linkSections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <h3 className="font-semibold text-base text-moringa md:mb-5 mb-2">{section.title}</h3>
              <ul className="text-sm space-y-1">
                {section.links.map((link, i) => (
                  <li key={i}>
                    {link === 'FAQs' ? (
                      <Link to="/faq" className="hover:underline transition">
                        {link}
                      </Link>
                    ) : link === 'Contact Us' ? (
                      <Link to="/contact-us" className="hover:underline transition">
                        {link}
                      </Link>
                    ) : link === 'Privacy Policy' ? (
                      <Link to="/privacy-policy" className="hover:underline transition">
                        {link}
                      </Link>
                    ) : link === 'Terms & Conditions' ? (
                      <Link to="/terms-of-service" className="hover:underline transition">
                        {link}
                      </Link>
                    ) : (
                      <a href="#" className="hover:underline transition">
                        {link}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
          <motion.div
            className="max-w-xs text-center md:text-left w-full mx-auto md:mx-0"
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="font-semibold text-base text-moringa md:mb-5 mb-2">
              Stay updated with ChopNow
            </h3>
            <p className="text-sm mb-4">
              Join our newsletter and be the first to discover new updates, exclusive offers, and
              inspiration.
            </p>
            <div className="flex items-center border border-moringa/25 focus-within:border-moringa focus-within:ring-2 focus-within:ring-moringa/20 text-sm rounded-full h-12 w-full transition-all mx-auto md:mx-0">
              <input
                type="email"
                className="bg-transparent outline-none rounded-full px-4 h-full flex-1 text-moringa placeholder:text-moringa/45"
                placeholder="Enter your email"
              />
              <button className="bg-moringa hover:bg-moringa-dark text-fufu rounded-full h-9 mr-1.5 px-6 flex items-center justify-center text-xs font-semibold transition-all active:scale-95 cursor-pointer">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Payment Methods Section */}
      <motion.div
        className="flex flex-col items-center pb-8 border-b border-moringa/15"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-moringa-muted font-medium mb-4">We accept</p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* MTN Momo */}
          <div className="w-16 h-16 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center p-2 hover:border-moringa transition-colors">
            <img
              src={assets.momo}
              alt="MTN Mobile Money"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Airtel Money */}
          <div className="w-16 h-16 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center p-2 hover:border-moringa transition-colors">
            <img
              src={assets.airtel_money}
              alt="Airtel Money"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Bank */}
          <div className="w-16 h-16 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center p-2 hover:border-moringa transition-colors">
            <img src={assets.bank} alt="Bank Transfer" className="w-full h-full object-contain" />
          </div>

          {/* Mastercard */}
          <div className="w-16 h-16 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center p-2 hover:border-moringa transition-colors">
            <img
              src={assets.mastercard}
              alt="Mastercard"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Visa */}
          <div className="w-16 h-16 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center p-2 hover:border-moringa transition-colors">
            <img src={assets.visa} alt="Visa" className="w-full h-full object-contain" />
          </div>
        </div>
      </motion.div>

      <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <motion.p
          className="text-sm md:text-base text-moringa-muted"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Copyright 2026 ©{' '}
          <a href="#" className="hover:underline">
            ChopNow
          </a>{' '}
          All Right Reserved.
        </motion.p>
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {socialLinks.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ChopNow on ${label}`}
              className="text-moringa-muted hover:text-moringa transition"
            >
              <Icon size={20} />
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Footer;
