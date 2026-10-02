import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import { PageHero } from '../Components/brand/Kit';

const FAQ = () => {
  const [openIndex, setOpenIndex] = React.useState(null);
  const [userType, setUserType] = React.useState('buyer');

  const buyerFAQs = [
    {
      question: 'How does ChopNow help me save money on food?',
      answer:
        'ChopNow connects you with restaurants, bakeries, and shops selling surplus food at discounted prices, often 50 to 70% off. You get quality meals while helping reduce food waste.',
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
        "Customers pay you via MTN Mobile Money or Airtel Money. There's no card payment option. Your earnings build up in your ChopNow balance as orders are completed, and you request a payout to your mobile money account or bank account whenever you want it. There's no fixed daily, weekly or monthly schedule.",
    },
    {
      question: 'Do I need special equipment or training?',
      answer:
        'No special equipment needed! Our platform is easy to use. We provide onboarding support, tutorial videos, and dedicated account management to ensure your success.',
    },
  ];

  const navigate = useNavigate();
  const faqs = userType === 'buyer' ? buyerFAQs : vendorFAQs;

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow="Help centre"
        title="FAQs"
        intro="Find answers to common questions about ChopNow and how we're fighting food waste together."
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 eyebrow text-moringa hover:underline underline-offset-4 cursor-pointer mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" aria-hidden="true" />
          Back
        </button>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start">
          {/* Audience switch */}
          <aside className="lg:sticky lg:top-[88px] rounded-lg overflow-hidden">
            <div className="bg-yellow text-moringa p-6">
              <p className="eyebrow">I am a</p>
              <div className="mt-4 grid grid-cols-2 border-2 border-moringa" role="tablist">
                {[
                  ['buyer', 'Buyer'],
                  ['vendor', 'Vendor'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={userType === value}
                    onClick={() => {
                      setUserType(value);
                      setOpenIndex(null);
                    }}
                    className={`h-12 text-sm font-bold transition-colors cursor-pointer ${
                      userType === value
                        ? 'bg-moringa text-yellow'
                        : 'bg-yellow text-moringa hover:bg-yellow-dark'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm font-medium">
                {userType === 'buyer'
                  ? 'Ordering, pickup, safety and how your orders cut waste.'
                  : 'Joining, pricing, verification and getting paid.'}
              </p>
            </div>
            <div className="bg-moringa text-fufu p-6">
              <p className="eyebrow text-yellow">Still stuck?</p>
              <p className="mt-2 text-sm opacity-90">
                Our support team is happy to help with anything not covered here.
              </p>
              <Link
                to="/contact-us"
                className="mt-4 inline-flex h-11 px-5 items-center bg-yellow text-moringa text-sm font-bold hover:bg-yellow-dark transition-colors"
              >
                Contact us
              </Link>
            </div>
          </aside>

          {/* Questions */}
          <ul className="bg-white border border-char/10">
            {faqs.map((faq, index) => {
              const open = openIndex === index;
              return (
                <li key={index} className="border-b border-hairline last:border-b-0">
                  <button
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    className={`w-full flex items-start gap-4 text-left p-5 sm:p-6 cursor-pointer transition-colors ${
                      open ? 'bg-mint' : 'hover:bg-fufu'
                    }`}
                  >
                    <span className="display text-[28px] text-moringa leading-none w-8 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className="flex-1 font-bold text-moringa text-base sm:text-lg pt-0.5">
                      {faq.question}
                    </h2>
                    <ChevronDown
                      className={`w-5 h-5 text-moringa shrink-0 mt-1 transition-transform duration-300 ${
                        open ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      open ? 'grid-rows-[1fr] bg-mint' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <p className="overflow-hidden text-moringa pl-[68px] sm:pl-[72px] pr-6">
                      <span className="block pb-6">{faq.answer}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
