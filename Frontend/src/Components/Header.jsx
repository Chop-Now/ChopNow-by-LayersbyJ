import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { assets } from '../assets/assets.js';
import Navbar from './Navbar.jsx';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [menuOpened, setMenuOpened] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleMenu = () => setMenuOpened((prev) => !prev);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`${isScrolled ? 'fixed' : 'absolute'} top-0 left-0 right-0 z-50 py-3 transition-all duration-300 ${isScrolled ? 'bg-scaffold/95 backdrop-blur-md shadow-md' : ''}`}
    >
      {/* Container */}
      <div className="mx-auto max-w-[1440px] px-4 lg:px-12 flex items-center justify-between">
        {/* Logo*/}
        <motion.div
          className="flex flex-1"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link to="/" className="flex items-end">
            <img src={assets.wordmarklogo} alt="ChopNow" className="h-10" />
          </Link>
        </motion.div>
        {/*Navbar*/}
        <div className="flex items-center justify-center flex-1">
          <Navbar
            setMenuOpened={setMenuOpened}
            menuOpened={menuOpened}
            containerStyles={`${
              menuOpened
                ? 'flex items-start flex-col gap-y-4 fixed top-16 left-0 right-0 p-6 bg-surface shadow-md w-full ring-1 ring-moringa/10 z-50'
                : 'hidden lg:flex gap-x-5 xl:gap-x-1 medium-15 p-1'
            }`}
          />
        </div>
        {/*Button and menu*/}
        <div className="flex flex-1 items-center justify-end gap-x-4 sm:gap-x-8">
          <button
            onClick={toggleMenu}
            className="relative lg:hidden w-7 h-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-moringa text-moringa rounded"
            aria-label={menuOpened ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpened}
          >
            <Menu
              className={`absolute inset-0 transition-opacity duration-700 ${
                menuOpened ? 'opacity-0' : 'opacity-100'
              }`}
              strokeWidth={3}
              aria-hidden="true"
            />
            <X
              className={`absolute inset-0 transition-opacity duration-700 ${
                menuOpened ? 'opacity-100' : 'opacity-0'
              }`}
              strokeWidth={3}
              aria-hidden="true"
            />
          </button>
          {/*Get started button*/}
          <motion.div
            className="hidden lg:block"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to="/login"
              className="px-6 py-3 transition-all bg-moringa hover:bg-moringa-dark border border-moringa text-fufu text-sm font-semibold rounded-full cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
