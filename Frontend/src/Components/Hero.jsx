import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { Video, X } from 'lucide-react';
import { assets } from '../assets/assets.js';

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);
  const [count4, setCount4] = useState(0);

  // Animated counter effect
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    const animateCount = (target, setter) => {
      let current = 0;
      const increment = target / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, interval);
      return timer;
    };

    const timer1 = animateCount(25, setCount1);
    const timer2 = animateCount(50, setCount2);
    const timer3 = animateCount(120, setCount3);
    const timer4 = animateCount(3, setCount4);

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
      clearInterval(timer3);
      clearInterval(timer4);
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-12 lg:pl-24" id="home">
      <div className="h-screen w-full rounded-2xl relative overflow-hidden">
        {/* Badge centered at top */}
        <motion.div
          className="absolute top-20 md:top-24 left-1/2 transform -translate-x-1/2 z-10"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-2 md:gap-2 border border-moringa/15 p-1.5 md:p-2 pr-3 md:pr-4 rounded-full bg-surface/85 backdrop-blur-sm whitespace-nowrap">
            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fHBlb3BsZXxlbnwwfHwwfHx8MA%3D%3D"
                alt="User 1"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-surface object-cover shrink-0"
              />
              <img
                src="https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fHBlb3BsZXxlbnwwfHwwfHx8MA%3D%3D"
                alt="User 2"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-surface object-cover shrink-0"
              />
              <img
                src="https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjF8fHBlb3BsZXxlbnwwfHwwfHx8MA%3D%3D"
                alt="User 3"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-surface object-cover shrink-0"
              />
              <img
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fHBlb3BsZXxlbnwwfHwwfHx8MA%3D%3D"
                alt="User 4"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-surface object-cover shrink-0"
              />
            </div>
            <p className="text-[11px] md:text-xs font-medium text-moringa">
              Trusted by 1000+ consumers across Africa
            </p>
          </div>
        </motion.div>

        {/*Container with Flex Layout*/}
        <div className="mx-auto max-w-[1440px] px-4 h-full flex flex-col lg:flex-row items-center md:items-center lg:items-start justify-start lg:justify-between pt-44 md:pt-40 lg:pt-32 gap-2 md:gap-4 lg:gap-8">
          {/* Left Side - Content */}
          <div className="flex-1 max-w-[650px] relative z-10 w-full lg:mt-24 text-center lg:text-left">
            <motion.h2
              className="mb-3 font-bold leading-tight text-moringa"
              style={{ fontSize: 'clamp(24px, 5vw, 42px)' }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            >
              Rescue <span className="text-pepper-dark">Surplus Meals</span> <br /> Elevate Taste{' '}
              <br />{' '}
              <span className="bg-yellow px-2 py-0.5 rounded-lg box-decoration-clone">
                Sustain Tomorrow
              </span>
            </motion.h2>
            <motion.p
              className="leading-relaxed max-w-lg mb-5 mx-auto lg:mx-0 text-moringa-muted"
              style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', lineHeight: '1.5' }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
            >
              ChopNow connects you with African grocers, restaurants, and farmers to discover fresh
              surplus meals at up to 70% off — reducing food waste while fueling communities.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center sm:items-center justify-center md:justify-center lg:justify-start gap-2 sm:gap-2.5 mb-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
            >
              <Link
                to="/login"
                className="px-6 py-3 transition-all border border-moringa/20 text-fufu text-sm font-semibold cursor-pointer active:scale-95 hover:bg-moringa-dark bg-moringa rounded-md h-11 sm:text-base shadow-[5px_5px_0px_0px_rgba(15,61,46,0.35)] w-80 sm:w-auto flex items-center justify-center"
              >
                Get started
              </Link>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 border border-moringa/30 active:scale-95 hover:bg-scaffold transition text-moringa rounded-md px-4 h-11 text-sm sm:text-base font-semibold bg-surface shadow-[5px_5px_0px_0px_rgba(15,61,46,0.25)] cursor-pointer w-80 sm:w-auto"
              >
                <Video size={18} />
                <span>Watch demo</span>
              </button>
            </motion.div>

            {/* Stats — pre-launch targets, not achieved figures. The caption
                below is load-bearing: without it these read as live numbers. */}
            <motion.div
              className="mt-5 max-w-xl mx-auto lg:mx-0"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
            >
              <p className="text-[9px] md:text-[11px] font-semibold uppercase tracking-wider text-moringa-muted mb-2">
                Projected impact by 2027
              </p>
              <div className="grid grid-cols-4 gap-3 md:gap-5">
                <div>
                  <h4
                    className="font-bold mb-0.5 text-base md:text-xl"
                    style={{ color: 'var(--color-moringa)' }}
                  >
                    {count1}+
                  </h4>
                  <p
                    className="text-[8px] md:text-xs leading-tight"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    Launch Partners
                  </p>
                </div>
                <div>
                  <h4
                    className="font-bold mb-0.5 text-base md:text-xl"
                    style={{ color: 'var(--color-moringa)' }}
                  >
                    {count2}K
                  </h4>
                  <p
                    className="text-[8px] md:text-xs leading-tight"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    Households
                  </p>
                </div>
                <div>
                  <h4
                    className="font-bold mb-0.5 text-base md:text-xl"
                    style={{ color: 'var(--color-moringa)' }}
                  >
                    {count3}K
                  </h4>
                  <p
                    className="text-[8px] md:text-xs leading-tight"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    Meals Rescued
                  </p>
                </div>
                <div>
                  <h4
                    className="font-bold mb-0.5 text-base md:text-xl"
                    style={{ color: 'var(--color-moringa)' }}
                  >
                    {count4}
                  </h4>
                  <p
                    className="text-[8px] md:text-xs leading-tight"
                    style={{ color: 'var(--color-moringa-muted)' }}
                  >
                    Countries
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Background Image */}
          <motion.div
            className="flex-1 w-full h-[280px] md:h-[520px] lg:h-[780px] flex items-start justify-center -mt-20 md:-mt-44 lg:-mt-72"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          >
            <img
              src={assets.bg}
              alt="ChopNow"
              className="w-full md:w-[120%] h-full md:h-[120%] object-cover"
            />
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      {isModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full max-w-4xl">
            <motion.button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-14 right-0 z-10 bg-surface hover:bg-scaffold rounded-full p-2.5 transition-all active:scale-95 shadow-lg"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
            >
              <X size={28} className="text-moringa cursor-pointer" />
            </motion.button>
            <motion.div
              className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: '0 0 60px rgba(255, 255, 255, 0.2), 0 20px 50px rgba(0, 0, 0, 0.8)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/d9mWh03Z0SA?autoplay=1"
                title="ChopNow Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Hero;
