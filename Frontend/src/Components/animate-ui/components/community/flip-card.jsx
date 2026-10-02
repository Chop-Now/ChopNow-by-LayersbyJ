// eslint-disable-next-line no-unused-vars
import { easeOut, motion } from 'motion/react';
import * as React from 'react';
import { Linkedin } from 'lucide-react';

export function FlipCard({ data }) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleClick = () => {
    if (isTouchDevice) setIsFlipped(!isFlipped);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsFlipped(true);
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) setIsFlipped(false);
  };

  const cardVariants = {
    front: { rotateY: 0, transition: { duration: 0.5, ease: easeOut } },
    back: { rotateY: 180, transition: { duration: 0.5, ease: easeOut } },
  };

  return (
    <div
      className="relative w-full h-[360px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* FRONT: Profile */}
      <motion.div
        className="absolute inset-0 backface-hidden rounded-md overflow-hidden shadow-2xl"
        animate={isFlipped ? 'back' : 'front'}
        variants={cardVariants}
        style={{
          transformStyle: 'preserve-3d',
          height: '360px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <img
          src={data.image}
          alt={data.name}
          className="w-full h-full object-cover absolute inset-0"
        />
        <div className="absolute bottom-0 z-10 h-60 w-full bg-linear-to-t pointer-events-none from-black to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
          <h2 className="text-lg font-bold text-white">{data.name}</h2>
          <p className="text-sm text-white/90">{data.role}</p>
        </div>
      </motion.div>
      {/* BACK: Bio + Socials */}
      <motion.div
        className="absolute inset-0 backface-hidden rounded-md px-6 py-6 flex flex-col justify-center items-center gap-y-6 bg-linear-to-tr from-muted via-background to-muted shadow-2xl"
        initial={{ rotateY: 180 }}
        animate={isFlipped ? 'front' : 'back'}
        variants={cardVariants}
        style={{
          transformStyle: 'preserve-3d',
          rotateY: 180,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <p className="text-xs md:text-sm text-muted-foreground text-center">{data.bio}</p>

        {/* Social Media Icons */}
        {data.socialLinks?.linkedin && (
          <a
            href={data.socialLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <Linkedin size={24} />
          </a>
        )}
      </motion.div>
    </div>
  );
}
