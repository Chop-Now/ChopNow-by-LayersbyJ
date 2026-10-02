import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { assets } from '../assets/assets';

const MilestoneCard = ({ image, badge, title, description }) => {
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const threshold = 8;

  const handleMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setTilt({ x: y * -threshold, y: x * threshold });
  };

  return (
    <div
      className="rounded-xl shadow-xl overflow-hidden transition-transform duration-200 ease-out cursor-pointer bg-surface border border-surface-border w-full h-full flex flex-col"
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
    >
      <div className="relative">
        <img src={image} alt={title} className="w-full h-48 md:h-52 object-cover" />
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold bg-pepper text-char">
          {badge}
        </div>
      </div>
      <div className="p-5 grow">
        <h3 className="mb-3 text-lg font-semibold text-moringa">{title}</h3>
        <p className="text-sm leading-relaxed text-moringa-muted">{description}</p>
      </div>
    </div>
  );
};

const Milestones = () => {
  const milestones = [
    {
      image: assets.kigali,
      badge: 'Late 2026',
      title: 'Kigali pilot launch with 25 food heroes',
      description:
        'Stand up Kigali-first operations, onboard supermarkets, restaurants, bakers, and farmers, and run the first surplus bundle drops with real-time rescue insights.',
    },
    {
      image:
        'https://images.unsplash.com/photo-1517821362941-f7f753200fef?q=80&w=2000&auto=format&fit=crop',
      badge: 'Mid 2027',
      title: 'Scale to Nairobi & Accra waitlists',
      description:
        'Translate Kigali learnings into regional toolkits, streamline logistics with pan-African couriers, and grow city waitlists ahead of phased launches.',
    },
    {
      image:
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop',
      badge: 'Late 2027',
      title: 'Rescue 150k meals across 4 cities',
      description:
        'Deploy circular logistics, community pick-up hubs, and redistribution partners to deliver rescued meals to schools, shelters, and families across Africa.',
    },
  ];

  return (
    <div
      id="Milestones"
      className="flex flex-col items-center text-center px-6 md:px-4 py-12 md:py-16"
    >
      <motion.h1
        className="text-3xl md:text-4xl font-semibold mb-4 text-moringa"
        initial={{ y: -30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Milestones we're rallying toward
      </motion.h1>
      <motion.p
        className="max-w-3xl mb-12 text-sm md:text-base text-moringa-muted"
        initial={{ y: -20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      >
        As an early-stage team, these are the impact goals guiding our roadmap from launch through
        2027.
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-sm md:max-w-5xl w-full">
        {milestones.map((milestone, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
          >
            <MilestoneCard {...milestone} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Milestones;
