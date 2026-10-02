import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Hourglass,
  Clock,
  FileSearch,
  MailCheck,
  LayoutDashboard,
  MessageCircleQuestion,
  Mail,
} from 'lucide-react';
import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';

const STEPS = [
  {
    Icon: FileSearch,
    title: 'Admin review',
    copy: 'Our team is carefully reviewing your application.',
    tone: 'bg-yellow text-moringa',
  },
  {
    Icon: MailCheck,
    title: 'Approval email',
    copy: 'We will notify you via email once the review is complete.',
    tone: 'bg-mint text-moringa',
  },
  {
    Icon: LayoutDashboard,
    title: 'Full dashboard access',
    copy: "Once approved, you'll gain full access to your vendor dashboard.",
    tone: 'bg-lime text-moringa',
  },
];

const PendingReview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex bg-fufu">
      {/* Left Side - Brand panel (hidden on mobile) */}
      <div className="w-1/2 hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
        <AuthArt eyebrow="Application received" title={['Hang', 'tight,', "we're on it."]} />
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col items-center px-4 py-8">
        <div className="mb-8">
          <Link to="/" aria-label="ChopNow home">
            <Logo tone="light" size="lg" />
          </Link>
        </div>

        <div className="w-full max-w-lg">
          {/* Status tile */}
          <div className="bg-yellow text-moringa p-6 sm:p-8">
            <div className="w-14 h-14 bg-moringa text-yellow flex items-center justify-center">
              <Hourglass className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="eyebrow mt-6">Under review</p>
            <h1 className="display text-[44px] sm:text-[56px] mt-2 leading-[0.92]">
              We're reviewing your details
            </h1>
            <p className="mt-3 font-medium">
              Thank you for submitting your details. Your application is now under manual review by
              our team to ensure everything is in order.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 bg-moringa text-fufu px-3 py-2 eyebrow text-[11px]">
              <Clock className="w-3.5 h-3.5 text-yellow" aria-hidden="true" />
              Estimated review time: 2 to 3 business days
            </p>
          </div>

          {/* Dashboard Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors cursor-pointer"
          >
            Go to my dashboard
          </button>

          {/* What's Next Section */}
          <section className="mt-8">
            <p className="eyebrow text-moringa-muted">What's next</p>
            <ol className="mt-3 bg-white border border-char/10">
              {STEPS.map(({ Icon, title, copy, tone }, i) => (
                <li
                  key={title}
                  className="flex gap-4 p-4 sm:p-5 border-b border-hairline last:border-b-0"
                >
                  <div className={`w-12 h-12 flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-moringa flex items-baseline gap-2">
                      <span className="display text-[22px] leading-none">{i + 1}</span>
                      {title}
                    </h3>
                    <p className="text-sm text-moringa-muted mt-1">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Have Questions Section */}
          <section className="mt-8 bg-mint text-moringa p-5 sm:p-6">
            <h2 className="display text-[32px]">Have questions?</h2>
            <p className="text-sm mt-1 mb-4">
              Find answers to common questions in our FAQ or contact our support.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2">
              <button className="h-12 border-2 border-moringa flex items-center justify-center gap-2 text-sm font-bold hover:bg-white transition-colors cursor-pointer">
                <MessageCircleQuestion className="w-4 h-4" aria-hidden="true" />
                Visit FAQ
              </button>
              <button className="h-12 border-2 border-l-0 border-moringa flex items-center justify-center gap-2 text-sm font-bold hover:bg-white transition-colors cursor-pointer">
                <Mail className="w-4 h-4" aria-hidden="true" />
                Email support
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PendingReview;
