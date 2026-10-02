import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatedTestimonials } from './ui/animated-testimonials';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const Testimonials = () => {
  // ChopNow has not launched yet, so these are stated expectations from
  // vendors and consumers ahead of the pilot — not reports of past results.
  const testimonials = [
    {
      quote:
        "Every night we bin food that's still perfectly good. If ChopNow can put it in someone's hands instead, that changes how we close up shop.",
      name: 'Amara Okonkwo',
      designation: 'Restaurant Owner, Lagos',
      src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=3560&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      quote:
        "What I want is simple: sell what's left at the end of the day instead of carrying it home to spoil. If ChopNow does that, it pays for itself.",
      name: 'Kwame Mensah',
      designation: 'Market Vendor, Accra',
      src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      quote:
        'Affordable meals near us go fast and word travels slowly. Real-time alerts are the part I am waiting for.',
      name: 'Fatima Diallo',
      designation: 'Community Leader, Dakar',
      src: 'https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      quote:
        'If surplus can reach us on a predictable schedule rather than by chance, we could feed noticeably more families each week. That is what we are signing up for.',
      name: 'Emmanuel Banda',
      designation: 'NGO Director, Nairobi',
      src: 'https://images.unsplash.com/photo-1636041293178-808a6762ab39?q=80&w=3464&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      quote:
        'We need measured numbers on waste diverted, not estimates. Credible impact tracking from day one is what would make us commit.',
      name: 'Aisha Mohammed',
      designation: 'Sustainability Officer, Kigali',
      src: 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=2592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
  ];

  return (
    <div id="testimonials" className="py-12 md:py-16">
      <div className="text-center mb-8 px-4">
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl md:text-4xl font-semibold mb-4 text-moringa"
        >
          What People Expect From Us
        </motion.h1>
        <motion.p
          className="max-w-2xl mx-auto text-sm md:text-base text-moringa-muted"
          initial={{ y: -20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          We haven't launched yet. Here's what vendors, consumers, and partners told us they're
          hoping ChopNow will do for them.
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
      </motion.div>

      {/* CTA Section */}
      <motion.div
        className="flex flex-col md:flex-row items-center justify-around rounded-2xl mx-6 md:mx-auto max-w-5xl shadow-lg mt-12 bg-moringa"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <motion.div
          className="flex flex-col text-center md:text-left items-center md:items-start pt-14 md:p-10 px-6"
          initial={{ x: -30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="md:text-4xl text-2xl font-bold mb-3 text-fufu">
            Ready to start buying your meals while saving the environment?
          </h2>
          <p className="text-sm md:text-base mb-6 text-fufu/75">
            Create your account now and be first in line when we launch in Kigali.
          </p>
          <Link
            to="/login"
            aria-label="getStarted"
            className="px-7 py-3 bg-yellow hover:bg-yellow-dark text-char rounded-md active:scale-95 transition-all font-semibold cursor-pointer flex items-center justify-center"
          >
            Get started
          </Link>
        </motion.div>
        <motion.img
          className="max-w-[375px] w-full pt-10 md:p-0"
          src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/excitedWomenImage.png"
          alt="Excited person using ChopNow"
          initial={{ x: 30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        />
      </motion.div>
    </div>
  );
};

export default Testimonials;
