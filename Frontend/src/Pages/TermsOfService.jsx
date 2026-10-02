import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../Components/Footer';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-fufu">
      {/* Header */}
      <div className="bg-fufu/95 backdrop-blur-md border-b border-fufu-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-moringa-muted hover:text-moringa transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-moringa mb-2">Terms of Service</h1>
        <p className="text-moringa-muted mb-8">Last updated: February 13, 2026</p>

        <div className="prose prose-gray max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">1. Introduction</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              Welcome to ChopNow! These Terms of Service ("Terms") govern your access to and use of
              the ChopNow platform, including our website, mobile applications, and related services
              (collectively, the "Service"). ChopNow is a food rescue marketplace that connects
              consumers with businesses offering surplus food at discounted prices, helping to
              reduce food waste across Africa.
            </p>
            <p className="text-moringa-muted leading-relaxed">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not
              agree to these Terms, please do not use our Service.
            </p>
          </section>

          {/* Definitions */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>
                <strong>"ChopNow," "we," "us," or "our"</strong> refers to ChopNow Limited and its
                affiliates.
              </li>
              <li>
                <strong>"User," "you," or "your"</strong> refers to any individual or entity using
                our Service.
              </li>
              <li>
                <strong>"Consumer"</strong> refers to users who purchase food items through the
                platform.
              </li>
              <li>
                <strong>"Vendor" or "Business"</strong> refers to restaurants, grocery stores,
                bakeries, and other food establishments that list surplus food on our platform.
              </li>
              <li>
                <strong>"Listing"</strong> refers to any food item offered for sale on the platform.
              </li>
              <li>
                <strong>"Order"</strong> refers to a purchase made by a Consumer from a Vendor
                through the platform.
              </li>
            </ul>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">3. Eligibility</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Be at least 18 years of age or the age of majority in your jurisdiction.</li>
              <li>Have the legal capacity to enter into binding contracts.</li>
              <li>Not be prohibited from using the Service under applicable laws.</li>
              <li>Provide accurate and complete registration information.</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">4. Account Registration</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              To access certain features of our Service, you must create an account. When creating
              an account, you agree to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Provide accurate, current, and complete information.</li>
              <li>Maintain and promptly update your account information.</li>
              <li>Keep your password secure and confidential.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
            </ul>
          </section>

          {/* For Consumers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">5. Terms for Consumers</h2>
            <h3 className="text-xl font-medium text-moringa mb-3">5.1 Ordering Food</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              When you place an order through ChopNow, you agree to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Pay the listed price plus any applicable fees and taxes.</li>
              <li>Pick up your order within the specified collection window.</li>
              <li>
                Present valid identification or order confirmation when collecting your order.
              </li>
              <li>
                Understand that food items may vary slightly from descriptions due to the nature of
                surplus food.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">5.2 Food Safety</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              While we require all Vendors to comply with food safety regulations, you acknowledge
              that:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Surplus food may have shorter consumption windows than regular retail items.</li>
              <li>
                You should consume food items promptly and follow any storage instructions provided.
              </li>
              <li>You are responsible for checking allergen information and ingredient lists.</li>
              <li>
                ChopNow is not responsible for food-related illness resulting from improper storage
                or handling after collection.
              </li>
            </ul>
          </section>

          {/* For Vendors */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">6. Terms for Vendors</h2>
            <h3 className="text-xl font-medium text-moringa mb-3">
              6.1 Registration and Verification
            </h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              To list food items on ChopNow, Vendors must:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Complete our business verification process.</li>
              <li>Provide valid business registration and food handling licenses.</li>
              <li>Maintain compliance with all applicable food safety regulations.</li>
              <li>Keep business information accurate and up-to-date.</li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">6.2 Listing Responsibilities</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              When listing items on ChopNow, Vendors agree to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Provide accurate descriptions of all food items.</li>
              <li>List only safe, consumable food that meets health standards.</li>
              <li>Clearly indicate allergens and dietary information.</li>
              <li>Honor all orders placed through the platform.</li>
              <li>Maintain appropriate food storage and handling practices.</li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">6.3 Fees and Payments</h3>
            <p className="text-moringa-muted leading-relaxed">
              ChopNow charges a service fee on each transaction. Payment terms, including payout
              schedules and applicable fees, are detailed in your Vendor Agreement. We reserve the
              right to modify fees with reasonable notice.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">7. Prohibited Activities</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose.</li>
              <li>List or sell unsafe, expired, or contaminated food items.</li>
              <li>Provide false or misleading information about food items.</li>
              <li>Harass, abuse, or harm other users.</li>
              <li>Attempt to circumvent platform fees or payment processes.</li>
              <li>Use automated systems to access the Service without permission.</li>
              <li>Interfere with or disrupt the Service or servers.</li>
              <li>Impersonate another person or entity.</li>
              <li>Engage in fraudulent activities or transactions.</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">8. Intellectual Property</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              The ChopNow name, logo, and all related trademarks, service marks, and content on the
              platform are owned by ChopNow or its licensors. You may not use our intellectual
              property without prior written consent.
            </p>
            <p className="text-moringa-muted leading-relaxed">
              By posting content on ChopNow (including reviews, photos, and listings), you grant us
              a non-exclusive, worldwide, royalty-free license to use, display, and distribute that
              content in connection with our Service.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">9. Disclaimers</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. CHOPNOW DOES NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
            <p className="text-moringa-muted leading-relaxed">
              ChopNow acts as a marketplace connecting Consumers and Vendors. We do not prepare,
              handle, or deliver food items. Vendors are solely responsible for the quality and
              safety of their food products.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-moringa-muted leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHOPNOW SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
              LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
              LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">11. Indemnification</h2>
            <p className="text-moringa-muted leading-relaxed">
              You agree to indemnify, defend, and hold harmless ChopNow and its officers, directors,
              employees, and agents from any claims, damages, losses, or expenses (including
              reasonable attorney fees) arising from your use of the Service, violation of these
              Terms, or infringement of any third-party rights.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">12. Termination</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We may suspend or terminate your access to the Service at any time, with or without
              cause, with or without notice. You may terminate your account at any time by
              contacting our support team.
            </p>
            <p className="text-moringa-muted leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. Provisions
              that by their nature should survive termination will remain in effect.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">13. Dispute Resolution</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              Any disputes arising from these Terms or your use of the Service shall be resolved
              through:
            </p>
            <ol className="list-decimal pl-6 text-moringa-muted space-y-2">
              <li>
                <strong>Informal Resolution:</strong> Contact our support team first to attempt to
                resolve the dispute informally.
              </li>
              <li>
                <strong>Mediation:</strong> If informal resolution fails, the parties agree to
                attempt mediation before pursuing other remedies.
              </li>
              <li>
                <strong>Arbitration:</strong> Any unresolved disputes shall be settled by binding
                arbitration in accordance with applicable laws.
              </li>
            </ol>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">14. Governing Law</h2>
            <p className="text-moringa-muted leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              Federal Republic of Nigeria, without regard to its conflict of law provisions. You
              agree to submit to the exclusive jurisdiction of the courts located in Nigeria for the
              resolution of any disputes.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">15. Changes to These Terms</h2>
            <p className="text-moringa-muted leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes by posting the updated Terms on this page and updating the "Last updated"
              date. Your continued use of the Service after changes become effective constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">16. Contact Us</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none text-moringa-muted space-y-2">
              <li>
                <strong>Email:</strong> chopnow.app@gmail.com
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <Link to="/contact-us" className="text-moringa hover:underline">
                  Contact Us Page
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;
