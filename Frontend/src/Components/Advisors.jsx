import React from 'react';
import { FlipCard } from './animate-ui/components/community/flip-card';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const Advisors = () => {
  const advisors = [
    {
      name: 'Chinedu Okafor',
      role: 'Former COO at NaijaGrocer',
      description:
        'With 20+ years orchestrating cross-border supply chains. Chinedu guides our operational playbooks for scale.',
      image:
        'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=400&h=360&fit=crop',
    },
    {
      name: 'Fatima Gaye',
      role: 'Ex-program director at EcoSavor Senegal',
      description: 'Fatima shapes our measurement framework for environmental and social impact.',
      image:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&h=360&fit=crop',
    },
    {
      name: 'Michael Adeyemi',
      role: 'Former product lead at MarketSquare',
      description:
        'Michael keeps our product roadmap inclusive, data-informed, and grounded in African consumer behavior.',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&h=360&fit=crop',
    },
    {
      name: 'Oluwatobi Mensah',
      role: 'Co-founder of HarvestAid Ghana',
      description:
        'With deep redistribution expertise. Oluwatobi helps us forge partnerships with NGOs, schools, and food heroes.',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&h=360&fit=crop',
    },
  ];

  return (
    <div
      className="flex flex-col items-center text-center px-6 md:px-4 py-12 md:py-16"
      id="advisors"
    >
      <motion.h1
        className="text-3xl md:text-4xl font-semibold mb-4"
        style={{ color: 'var(--color-textColor)' }}
        initial={{ y: -30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Meet Our Advisors
      </motion.h1>
      <motion.p
        className="max-w-2xl mb-12 text-sm md:text-base"
        style={{ color: 'var(--color-moringa-muted)' }}
        initial={{ y: -20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      >
        Industry leaders guiding ChopNow's mission to transform food access and sustainability.
      </motion.p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-sm sm:max-w-6xl w-full">
        {advisors.map((advisor, index) => {
          const cardData = {
            image: advisor.image,
            name: advisor.name,
            role: advisor.role,
            bio: advisor.description,
            socialLinks: {
              linkedin: '#',
            },
          };
          return (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <FlipCard data={cardData} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Advisors;
