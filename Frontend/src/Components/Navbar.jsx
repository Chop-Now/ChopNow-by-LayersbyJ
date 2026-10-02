import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const Navbar = ({ containerStyles, setMenuOpened, menuOpened }) => {
  const [activeSection, setActiveSection] = useState('');

  const navLinks = [
    { path: '#howItWorks', title: 'How It Works' },
    // { path: '#testimonials', title: 'Testimonials' },
    // { path: '#advisors', title: 'Advisors' },
    { path: '#Milestones', title: 'Milestones' },
    { path: '#AboutUs', title: 'About Us' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map((link) => link.path.substring(1));
      const scrollPosition = window.scrollY + 100;
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(`#${section}`);
            return;
          }
        }
      }

      // Clear active section if not in any tracked section
      setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = (path) => {
    setMenuOpened(false);
    const element = document.getElementById(path.substring(1));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={containerStyles}>
      {navLinks.map((link, index) => (
        <motion.a
          href={link.path}
          onClick={(e) => {
            e.preventDefault();
            handleClick(link.path);
          }}
          key={link.title}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          className={`${activeSection === link.path ? "relative after:content-[''] after:w-[40%] after:h-1 after:rounded-full after:bg-moringa after:absolute after:-bottom-0.5 after:right-3" : ''} px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap text-moringa`}
        >
          {link.title}
        </motion.a>
      ))}
      {menuOpened && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/login"
            className="px-6 py-3 transition-all bg-moringa hover:bg-moringa-dark border border-moringa text-fufu text-sm font-semibold rounded-full cursor-pointer active:scale-95 flex items-center justify-center gap-2 w-full mt-2"
          >
            Get Started
          </Link>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
