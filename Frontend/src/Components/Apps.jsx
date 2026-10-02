import React from 'react';
import { assets } from '../assets/assets';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const Apps = () => {
  return (
    <div className="flex justify-center items-center px-4 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col md:flex-row items-center justify-around text-sm rounded-2xl max-w-5xl w-full relative overflow-hidden bg-yellow"
        style={{
          boxShadow: '0 10px 30px rgba(15, 61, 46, 0.18)',
        }}
      >
        <div className="flex flex-col text-center md:text-left items-center md:items-start pt-14 md:p-10 relative z-10">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-moringa text-fufu"
            initial={{ y: -20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Coming Soon
          </motion.div>
          <motion.h2
            className="md:text-4xl text-2xl font-semibold text-moringa"
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Download Mobile App
          </motion.h2>
          <motion.p
            className="mt-2 w-3/4 text-moringa/85"
            style={{ fontSize: '15px' }}
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Mobile app for iOS & Android to get a personalized feed of nearby surplus meals,
            exclusive drops, and smart pick-up reminders, all inside an intuitive experience built
            for busy urban explorers.
          </motion.p>

          <motion.div
            className="flex items-center gap-4 mt-6"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <button
              aria-label="googlePlayBtn"
              className="transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl"
              type="button"
            >
              <img
                className="md:w-44 w-28 rounded-2xl cursor-pointer"
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/googlePlayBtn.svg"
                alt="googlePlayBtn"
              />
            </button>
            <button
              aria-label="appleStoreBtn"
              className="transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl"
              type="button"
            >
              <img
                className="md:w-44 w-28 rounded-2xl cursor-pointer"
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/appleStoreBtn.svg"
                alt="appleStoreBtn"
              />
            </button>
          </motion.div>
        </div>

        <motion.img
          initial={{ x: 100, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-[375px] pt-10 md:p-0"
          src={assets.pointing}
          alt="Man pointing left"
        />
      </motion.div>
    </div>
  );
};

export default Apps;
