import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = React.useState(null);
  const [userType, setUserType] = React.useState('buyer');

  const buyerFAQs = [
    {
      question: 'How does ChopNow help me save money on food?',
      answer:
        'ChopNow connects you with restaurants, bakeries, and shops selling surplus food at discounted prices—often up to 50-70% off. You get quality meals while helping reduce food waste.',
    },
    {
      question: 'Is the food on ChopNow safe to eat?',
      answer:
        'Yes! All food items meet safety standards and are from verified businesses. Items are perfectly good to eat but may be nearing their "best before" date or are end-of-day surplus.',
    },
    {
      question: 'How do I pick up my order?',
      answer:
        "After purchasing, you'll receive a pickup time and location. Simply head to the business during that window, show your order confirmation, and collect your surprise bag or meal.",
    },
    {
      question: "Can I choose what's in my order?",
      answer:
        'Most orders are "surprise bags" where businesses pack a variety of items. This helps them manage surplus efficiently. However, some vendors list specific items you can select.',
    },
    {
      question: "What if I can't make it to pick up my order?",
      answer:
        'Cancellation policies vary by vendor. Check the specific policy before purchasing. Some may offer refunds if cancelled within a certain timeframe, while others may not allow cancellations.',
    },
    {
      question: 'How does ChopNow contribute to reducing food waste?',
      answer:
        "Every order you place rescues food from going to waste. You're directly helping reduce environmental impact while supporting local businesses and making nutritious food more accessible.",
    },
  ];

  const vendorFAQs = [
    {
      question: 'How can ChopNow help my business?',
      answer:
        "ChopNow helps you sell surplus inventory instead of throwing it away, turning potential losses into revenue. You'll also attract new customers and strengthen your brand's sustainability profile.",
    },
    {
      question: 'What types of businesses can partner with ChopNow?',
      answer:
        'We work with restaurants, cafes, bakeries, grocery stores, caterers, and any food business with surplus inventory. If you have excess food, we can help you sell it.',
    },
    {
      question: 'How do I set my prices?',
      answer:
        'You control your pricing. Most vendors price surplus items at 50-70% off regular price. Our platform guides you to set competitive prices that attract buyers while maximizing your recovery.',
    },
    {
      question: 'How does the verification process work?',
      answer:
        'After signing up, submit your business documents and verification information. Our team reviews submissions within 48-72 hours. Once approved, you can start listing your surplus immediately.',
    },
    {
      question: 'What payment methods do you support?',
      answer:
        "Customers pay you via MTN Mobile Money or Airtel Money - there's no card payment option. Your earnings build up in your ChopNow balance as orders are completed, and you request a payout to your mobile money account or bank account whenever you want it - there's no fixed daily/weekly/monthly schedule.",
    },
    {
      question: 'Do I need special equipment or training?',
      answer:
        'No special equipment needed! Our platform is easy to use. We provide onboarding support, tutorial videos, and dedicated account management to ensure your success.',
    },
  ];

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
                
                html {
                    scroll-behavior: auto !important;
                }
            `}</style>
      <div className="flex flex-col items-center text-center text-moringa px-6 md:px-16 lg:px-24 xl:px-32 py-12 bg-fufu min-h-screen">
        {/* Back button for mobile - visible only on small screens */}
        <motion.div
          className="w-full max-w-7xl mb-8 md:hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative inline-block p-0.5 rounded-full overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[conic-gradient(from_0deg,#0F3D2E,#0F3D2E30,#E8552F,#E8552F30,#0F3D2E)] button-wrapper">
            <motion.button
              onClick={() => navigate(-1)}
              className="relative z-10 rounded-full px-6 py-2.5 font-medium text-sm flex items-center gap-2 cursor-pointer text-moringa"
              style={{ backgroundColor: 'var(--color-yellow)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <ArrowLeft size={18} />
              Back
            </motion.button>
          </div>
        </motion.div>

        {/* Title with back button on desktop */}
        <motion.div
          className="w-full max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Back button for desktop - visible only on medium screens and up */}
          <div className="hidden md:block">
            <div className="relative inline-block p-0.5 rounded-full overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[conic-gradient(from_0deg,#0F3D2E,#0F3D2E30,#E8552F,#E8552F30,#0F3D2E)] button-wrapper">
              <motion.button
                onClick={() => navigate(-1)}
                className="relative z-10 rounded-full px-6 py-2.5 font-medium text-sm flex items-center gap-2 cursor-pointer text-moringa"
                style={{ backgroundColor: 'var(--color-yellow)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <ArrowLeft size={18} />
                Back
              </motion.button>
            </div>
          </div>

          <div className="flex-1 md:text-center">
            <h1 className="text-3xl md:text-4xl font-semibold">Frequently Asked Questions</h1>
          </div>

          {/* Spacer for symmetry on desktop */}
          <div className="hidden md:block md:w-[120px]"></div>
        </motion.div>

        <motion.p
          className="text-sm text-moringa-muted mt-2 max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Find answers to common questions about ChopNow and how we're fighting food waste together.
        </motion.p>
        <motion.div
          className="flex space-x-2 bg-fufu p-1 border border-moringa/25 rounded-full text-sm mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="options"
              id="option1"
              className="hidden peer"
              checked={userType === 'buyer'}
              onChange={() => {
                setUserType('buyer');
                setOpenIndex(null);
              }}
            />
            <motion.label
              htmlFor="option1"
              className="cursor-pointer rounded-full py-2 px-9 text-moringa-muted transition-colors duration-200 peer-checked:text-fufu"
              style={{
                backgroundColor: userType === 'buyer' ? 'var(--color-moringa)' : 'transparent',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              For Buyers
            </motion.label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              name="options"
              id="option2"
              className="hidden peer"
              checked={userType === 'vendor'}
              onChange={() => {
                setUserType('vendor');
                setOpenIndex(null);
              }}
            />
            <motion.label
              htmlFor="option2"
              className="cursor-pointer rounded-full py-2 px-9 text-moringa-muted transition-colors duration-200 peer-checked:text-fufu"
              style={{
                backgroundColor: userType === 'vendor' ? 'var(--color-moringa)' : 'transparent',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              For Vendors
            </motion.label>
          </div>
        </motion.div>
        <div className="max-w-xl w-full mt-6 flex flex-col gap-4 items-start text-left">
          {(userType === 'buyer' ? buyerFAQs : vendorFAQs).map((faq, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-start w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
            >
              <motion.div
                className="flex items-center justify-between w-full cursor-pointer bg-linear-to-r from-yellow/25 via-pepper/10 to-fufu border-2 border-fufu-border p-4 rounded transition-all duration-200"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                whileHover={{
                  scale: 1.01,
                  borderColor: '#0F3D2E',
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <h2 className="text-sm font-medium">{faq.question}</h2>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <ChevronDown
                    className="shrink-0 ml-4"
                    size={20}
                    style={{ color: 'var(--color-moringa)' }}
                  />
                </motion.div>
              </motion.div>
              <motion.p
                className="text-sm text-moringa-muted px-4 overflow-hidden"
                initial={false}
                animate={{
                  opacity: openIndex === index ? 1 : 0,
                  maxHeight: openIndex === index ? 300 : 0,
                  paddingTop: openIndex === index ? 16 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {faq.answer}
              </motion.p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default FAQ;
