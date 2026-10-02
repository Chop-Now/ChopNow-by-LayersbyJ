import React, { useState } from 'react';
import { Plane, Users, Truck, Check, Sprout, Coins, MessageCircleHeart } from 'lucide-react';
import { assets } from '../assets/assets';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const stepsForVendors = [
  {
    id: '01',
    title: 'List Surplus Food',
    description:
      'Post your surplus meals with photos, pricing, and pickup times. Set your availability and quantities.',
    icon: <Plane className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    id: '02',
    title: 'Get Matched',
    description:
      'Connect with nearby consumers and NGOs looking for affordable meals. Review orders instantly.',
    icon: <Users className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
  },
  {
    id: '03',
    title: 'Fulfill Orders',
    description:
      'Prepare orders and coordinate pickup times. Track your environmental impact in real-time.',
    icon: <Truck className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-green-400 to-green-600',
  },
  {
    id: '04',
    title: 'Earn & Impact',
    description:
      'Receive payments automatically. Reduce waste, help communities, and track your sustainability metrics.',
    icon: <Check className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-orange-400 to-orange-500',
  },
];

const stepsForConsumers = [
  {
    id: '01',
    title: 'Browse Meals',
    description:
      'Discover surplus meals from restaurants, markets, and bakeries near you at discounted prices.',
    icon: <Plane className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    id: '02',
    title: 'Place Order',
    description:
      'Select your meals, choose pickup time, and complete secure payment through the app.',
    icon: <Users className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
  },
  {
    id: '03',
    title: 'Pick Up',
    description:
      'Head to the vendor location at your scheduled time. Show your QR code or ticket and collect your meal.',
    icon: <Truck className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-green-400 to-green-600',
  },
  {
    id: '04',
    title: 'Enjoy & Rate',
    description:
      'Enjoy quality food at great prices. Rate your experience and see the waste you helped prevent.',
    icon: <Check className="w-6 h-6 text-white" />,
    bg: 'bg-gradient-to-br from-orange-400 to-orange-500',
  },
];

const features = [
  {
    icon: <Truck />,
    title: 'Fastest Delivery',
    description: 'Groceries delivered in under 30 minutes.',
  },
  {
    icon: <Sprout />,
    title: 'Freshness Guaranteed',
    description: 'Fresh produce straight from local farms.',
  },
  {
    icon: <Coins />,
    title: 'Affordable Prices',
    description: 'Save money with discounted surplus food.',
  },
  {
    icon: <MessageCircleHeart />,
    title: 'Trusted by Thousands',
    description: 'Join a community of satisfied users.',
  },
];

const HowItWorks = () => {
  const [active, setActive] = useState('consumer');
  const steps = active === 'consumer' ? stepsForConsumers : stepsForVendors;

  return (
    <div id="howItWorks" className="py-14 w-full relative overflow-hidden bg-fufu">
      {/* Section Title */}
      <motion.div
        className="text-center mb-8 px-4"
        initial={{ y: -30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-moringa">How ChopNow Works</h1>
        <p className="max-w-2xl mx-auto text-sm md:text-base text-moringa-muted">
          Inspired by the simplicity of rescue platforms you love. Three steps to fresher eats.
        </p>
      </motion.div>

      {/* Toggle Switch */}
      <motion.div
        className="flex justify-center mb-16"
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-surface shadow-lg rounded-xl p-1.5 flex gap-1">
          <button
            onClick={() => setActive('consumer')}
            className={`px-6 py-2.5 rounded-lg transition font-semibold cursor-pointer ${
              active === 'consumer'
                ? 'bg-moringa text-fufu'
                : 'text-moringa-muted hover:bg-scaffold hover:text-moringa'
            }`}
          >
            For Consumers
          </button>

          <button
            onClick={() => setActive('vendor')}
            className={`px-6 py-2.5 rounded-lg transition font-semibold cursor-pointer ${
              active === 'vendor'
                ? 'bg-moringa text-fufu'
                : 'text-moringa-muted hover:bg-scaffold hover:text-moringa'
            }`}
          >
            For Vendors
          </button>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              className={`bg-surface rounded-2xl p-8 shadow-lg flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl max-w-sm mx-auto md:max-w-none md:mx-0 ${
                index === 1 || index === 3 ? 'md:mt-12' : 'md:mt-0'
              }`}
              style={{ height: '350px' }}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
            >
              {/* Step number */}
              <p className="text-5xl font-extrabold text-moringa/15 mb-6">{step.id}</p>

              {/* Title */}
              <h3 className="font-bold text-xl mb-4 text-moringa">{step.title}</h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-moringa-muted">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Why We Are The Best Banner */}
      <motion.div
        className="mt-24 max-w-6xl mx-auto px-4 md:px-6"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-surface rounded-3xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
            {/* Left Side - Image */}
            <motion.div
              className="w-full md:w-1/2 shrink-0 overflow-hidden"
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={assets.fresh_produce}
                alt="Man holding basket"
                className="w-full h-56 md:h-72 object-cover cursor-pointer transition-transform duration-300 hover:scale-110"
              />
            </motion.div>

            {/* Right Side - Content */}
            <motion.div
              className="flex-1 pl-8 md:pl-12"
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-6 text-moringa">
                Why We Are the Best?
              </h1>
              <div className="space-y-5">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-4"
                    initial={{ x: 30, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  >
                    {/* Cocoa tile + yellow glyph mirrors the brand app icon */}
                    <div className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center bg-moringa">
                      {React.cloneElement(feature.icon, {
                        className: 'w-5 h-5 md:w-6 md:h-6 text-yellow',
                      })}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-semibold text-moringa">
                        {feature.title}
                      </h3>
                      <p className="text-sm md:text-base text-moringa-muted">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HowItWorks;
