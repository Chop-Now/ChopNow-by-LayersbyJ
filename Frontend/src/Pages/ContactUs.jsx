import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Phone, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
            .button-wrapper::before {
                animation: spin-gradient 4s linear infinite;
            }
        
            @keyframes spin-gradient {
                from {
                    transform: rotate(0deg);
                }
        
                to {
                    transform: rotate(360deg);
                }
            }
        `}</style>
      <div className="min-h-screen w-full bg-white px-6 md:px-16 lg:px-24 xl:px-32 py-12">
        {/* Back button */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative inline-block p-0.5 rounded-full overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[conic-gradient(from_0deg,#0F3D2E,#0F3D2E30,#E8552F,#E8552F30,#0F3D2E)] button-wrapper">
            <motion.button
              onClick={() => navigate(-1)}
              className="relative z-10 rounded-full px-6 py-2.5 font-medium text-sm flex items-center gap-2 cursor-pointer text-white"
              style={{ backgroundColor: 'var(--color-solid)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <ArrowLeft size={18} />
              Back
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-800 mt-2">
            Get in touch with us
          </h1>
          <p className="text-sm text-slate-500 text-center mt-4 max-w-xl">
            Have questions about ChopNow? We'd love to hear from you.
            <br />
            Send us a message and we'll respond as soon as possible.
          </p>

          {/* Contact Info */}
          <motion.div
            className="flex flex-col md:flex-row items-center gap-6 mt-8 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin size={18} style={{ color: 'var(--color-solid)' }} />
              <span>Kigali, Rwanda</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone size={18} style={{ color: 'var(--color-solid)' }} />
              <span>+250 788 123 456</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail size={18} style={{ color: 'var(--color-solid)' }} />
              <span>chopnow.app@gmail.com</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.form
          className="flex flex-col items-center text-sm max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row items-start gap-6 w-full">
            <div className="w-full">
              <label className="text-slate-700 font-medium" htmlFor="name">
                Your Name
              </label>
              <div className="relative mt-2">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  className="h-12 pl-10 pr-4 w-full border-2 border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-(--color-solid)"
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            <div className="w-full">
              <label className="text-slate-700 font-medium" htmlFor="email">
                Your Email
              </label>
              <div className="relative mt-2">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  className="h-12 pl-10 pr-4 w-full border-2 border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-(--color-solid)"
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-6 w-full">
            <label className="text-slate-700 font-medium" htmlFor="message">
              Message
            </label>
            <textarea
              className="w-full mt-2 p-4 h-40 border-2 border-gray-200 rounded-lg resize-none outline-none transition-all duration-200 focus:border-(--color-solid)"
              placeholder="Tell us how we can help you..."
              required
            ></textarea>
          </div>

          <motion.button
            type="submit"
            className="mt-8 text-white h-12 px-8 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-solid)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Send Message
          </motion.button>
        </motion.form>
      </div>
    </>
  );
};

export default ContactUs;
