import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hourglass,
  Clock,
  FileSearch,
  MailCheck,
  LayoutDashboard,
  MessageCircleQuestion,
  Mail,
} from 'lucide-react';

const PendingReview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
          {/* Hourglass Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <Hourglass className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-xl font-semibold text-center mb-2"
            style={{ color: 'var(--color-textColor)' }}
          >
            We're reviewing your details
          </h1>

          {/* Description */}
          <p className="text-xs text-center mb-5" style={{ color: 'var(--color-moringa-muted)' }}>
            Thank you for submitting your details. Your application is now under manual review by
            our team to ensure everything is in order.
          </p>

          {/* Estimated Review Time */}
          <div className="flex items-center justify-center mb-5">
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="w-3.5 h-3.5 text-black" />
              <p className="text-[10px] font-medium" style={{ color: 'var(--color-textColor)' }}>
                Estimated Review Time: 2-3 business days
              </p>
            </div>
          </div>

          {/* Dashboard Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="w-64 h-10 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'var(--color-solid)' }}
            >
              Go to My Dashboard
            </button>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-300 mb-6"></div>

          {/* What's Next Section */}
          <div className="mb-6">
            <h2
              className="text-base font-semibold mb-5"
              style={{ color: 'var(--color-textColor)' }}
            >
              What's next?
            </h2>

            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <FileSearch className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3
                    className="text-xs font-semibold mb-1"
                    style={{ color: 'var(--color-textColor)' }}
                  >
                    1. Admin review
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--color-moringa-muted)' }}>
                    Our team is carefully reviewing your application.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <MailCheck className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3
                    className="text-xs font-semibold mb-1"
                    style={{ color: 'var(--color-textColor)' }}
                  >
                    2. Approval email
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--color-moringa-muted)' }}>
                    We will notify you via email once the review is complete.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3
                    className="text-xs font-semibold mb-1"
                    style={{ color: 'var(--color-textColor)' }}
                  >
                    3. Full dashboard access
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--color-moringa-muted)' }}>
                    Once approved, you'll gain full access to your vendor dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-300 mb-5"></div>

          {/* Have Questions Section */}
          <div>
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--color-textColor)' }}
            >
              Have Questions?
            </h2>
            <p className="text-[10px] mb-3" style={{ color: 'var(--color-moringa-muted)' }}>
              Find answers to common questions in our FAQ or contact our support.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2">
              <button
                className="flex-1 h-9 rounded-lg border border-gray-300 flex items-center justify-center gap-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ color: 'var(--color-textColor)' }}
              >
                <MessageCircleQuestion className="w-3.5 h-3.5" />
                Visit FAQ
              </button>
              <button
                className="flex-1 h-9 rounded-lg border border-gray-300 flex items-center justify-center gap-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ color: 'var(--color-textColor)' }}
              >
                <Mail className="w-3.5 h-3.5" />
                Email Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingReview;
