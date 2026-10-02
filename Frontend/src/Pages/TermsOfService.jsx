import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import { PageHero } from '../Components/brand/Kit';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-fufu pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow="Legal / Last updated February 13, 2026"
        title="Terms of service"
        art="leaf"
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 eyebrow text-moringa hover:underline underline-offset-4 mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" aria-hidden="true" />
          Back to home
        </Link>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 lg:gap-8 items-start">
          <nav
            aria-label="Contents"
            className="hidden lg:block sticky top-[88px] bg-white border border-char/10 py-3 max-h-[calc(100vh-110px)] overflow-y-auto"
          >
            <p className="eyebrow text-[11px] text-moringa-muted px-4 pb-2">Contents</p>
            <ol>
              <li>
                <a
                  href="#s1"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">01</span>
                  Introduction
                </a>
              </li>
              <li>
                <a
                  href="#s2"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">02</span>
                  Definitions
                </a>
              </li>
              <li>
                <a
                  href="#s3"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">03</span>
                  Eligibility
                </a>
              </li>
              <li>
                <a
                  href="#s4"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">04</span>
                  Account Registration
                </a>
              </li>
              <li>
                <a
                  href="#s5"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">05</span>
                  Terms for Consumers
                </a>
              </li>
              <li>
                <a
                  href="#s6"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">06</span>
                  Terms for Vendors
                </a>
              </li>
              <li>
                <a
                  href="#s7"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">07</span>
                  Prohibited Activities
                </a>
              </li>
              <li>
                <a
                  href="#s8"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">08</span>
                  Intellectual Property
                </a>
              </li>
              <li>
                <a
                  href="#s9"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">09</span>
                  Disclaimers
                </a>
              </li>
              <li>
                <a
                  href="#s10"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">10</span>
                  Limitation of Liability
                </a>
              </li>
              <li>
                <a
                  href="#s11"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">11</span>
                  Indemnification
                </a>
              </li>
              <li>
                <a
                  href="#s12"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">12</span>
                  Termination
                </a>
              </li>
              <li>
                <a
                  href="#s13"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">13</span>
                  Dispute Resolution
                </a>
              </li>
              <li>
                <a
                  href="#s14"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">14</span>
                  Governing Law
                </a>
              </li>
              <li>
                <a
                  href="#s15"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">15</span>
                  Changes to These Terms
                </a>
              </li>
              <li>
                <a
                  href="#s16"
                  className="flex gap-3 px-4 py-2.5 text-sm font-semibold text-moringa hover:bg-mint transition-colors"
                >
                  <span className="font-mono text-[11px] text-moringa-muted pt-0.5">16</span>
                  Contact Us
                </a>
              </li>
            </ol>
          </nav>

          <article className="bg-white border border-char/10 p-5 sm:p-10 min-w-0 [&>section]:max-w-3xl">
            {/* Introduction */}
            <section
              id="s1"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">01</span>
                <span>Introduction</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                Welcome to ChopNow! These Terms of Service ("Terms") govern your access to and use
                of the ChopNow platform, including our website, mobile applications, and related
                services (collectively, the "Service"). ChopNow is a food rescue marketplace that
                connects consumers with businesses offering surplus food at discounted prices,
                helping to reduce food waste across Africa.
              </p>
              <p className="text-char/80 leading-relaxed">
                By accessing or using our Service, you agree to be bound by these Terms. If you do
                not agree to these Terms, please do not use our Service.
              </p>
            </section>

            {/* Definitions */}
            <section
              id="s2"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">02</span>
                <span>Definitions</span>
              </h2>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper">
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
                  <strong>"Listing"</strong> refers to any food item offered for sale on the
                  platform.
                </li>
                <li>
                  <strong>"Order"</strong> refers to a purchase made by a Consumer from a Vendor
                  through the platform.
                </li>
              </ul>
            </section>

            {/* Eligibility */}
            <section
              id="s3"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">03</span>
                <span>Eligibility</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">To use our Service, you must:</p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper">
                <li>Be at least 18 years of age or the age of majority in your jurisdiction.</li>
                <li>Have the legal capacity to enter into binding contracts.</li>
                <li>Not be prohibited from using the Service under applicable laws.</li>
                <li>Provide accurate and complete registration information.</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section
              id="s4"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">04</span>
                <span>Account Registration</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                To access certain features of our Service, you must create an account. When creating
                an account, you agree to:
              </p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper">
                <li>Provide accurate, current, and complete information.</li>
                <li>Maintain and promptly update your account information.</li>
                <li>Keep your password secure and confidential.</li>
                <li>Notify us immediately of any unauthorized use of your account.</li>
                <li>Accept responsibility for all activities that occur under your account.</li>
              </ul>
            </section>

            {/* For Consumers */}
            <section
              id="s5"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">05</span>
                <span>Terms for Consumers</span>
              </h2>
              <h3 className="font-bold text-lg text-moringa mt-6 mb-3">5.1 Ordering Food</h3>
              <p className="text-char/80 leading-relaxed mb-4">
                When you place an order through ChopNow, you agree to:
              </p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper mb-4">
                <li>Pay the listed price plus any applicable fees and taxes.</li>
                <li>Pick up your order within the specified collection window.</li>
                <li>
                  Present valid identification or order confirmation when collecting your order.
                </li>
                <li>
                  Understand that food items may vary slightly from descriptions due to the nature
                  of surplus food.
                </li>
              </ul>

              <h3 className="font-bold text-lg text-moringa mt-6 mb-3">5.2 Food Safety</h3>
              <p className="text-char/80 leading-relaxed mb-4">
                While we require all Vendors to comply with food safety regulations, you acknowledge
                that:
              </p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper">
                <li>
                  Surplus food may have shorter consumption windows than regular retail items.
                </li>
                <li>
                  You should consume food items promptly and follow any storage instructions
                  provided.
                </li>
                <li>You are responsible for checking allergen information and ingredient lists.</li>
                <li>
                  ChopNow is not responsible for food-related illness resulting from improper
                  storage or handling after collection.
                </li>
              </ul>
            </section>

            {/* For Vendors */}
            <section
              id="s6"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">06</span>
                <span>Terms for Vendors</span>
              </h2>
              <h3 className="font-bold text-lg text-moringa mt-6 mb-3">
                6.1 Registration and Verification
              </h3>
              <p className="text-char/80 leading-relaxed mb-4">
                To list food items on ChopNow, Vendors must:
              </p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper mb-4">
                <li>Complete our business verification process.</li>
                <li>Provide valid business registration and food handling licenses.</li>
                <li>Maintain compliance with all applicable food safety regulations.</li>
                <li>Keep business information accurate and up-to-date.</li>
              </ul>

              <h3 className="font-bold text-lg text-moringa mt-6 mb-3">
                6.2 Listing Responsibilities
              </h3>
              <p className="text-char/80 leading-relaxed mb-4">
                When listing items on ChopNow, Vendors agree to:
              </p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper mb-4">
                <li>Provide accurate descriptions of all food items.</li>
                <li>List only safe, consumable food that meets health standards.</li>
                <li>Clearly indicate allergens and dietary information.</li>
                <li>Honor all orders placed through the platform.</li>
                <li>Maintain appropriate food storage and handling practices.</li>
              </ul>

              <h3 className="font-bold text-lg text-moringa mt-6 mb-3">6.3 Fees and Payments</h3>
              <p className="text-char/80 leading-relaxed">
                ChopNow charges a service fee on each transaction. Payment terms, including payout
                schedules and applicable fees, are detailed in your Vendor Agreement. We reserve the
                right to modify fees with reasonable notice.
              </p>
            </section>

            {/* Prohibited Activities */}
            <section
              id="s7"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">07</span>
                <span>Prohibited Activities</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-char/80 space-y-2 marker:text-pepper">
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
            <section
              id="s8"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">08</span>
                <span>Intellectual Property</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                The ChopNow name, logo, and all related trademarks, service marks, and content on
                the platform are owned by ChopNow or its licensors. You may not use our intellectual
                property without prior written consent.
              </p>
              <p className="text-char/80 leading-relaxed">
                By posting content on ChopNow (including reviews, photos, and listings), you grant
                us a non-exclusive, worldwide, royalty-free license to use, display, and distribute
                that content in connection with our Service.
              </p>
            </section>

            {/* Disclaimers */}
            <section
              id="s9"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">09</span>
                <span>Disclaimers</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED. CHOPNOW DOES NOT WARRANT THAT THE SERVICE WILL BE
                UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
              <p className="text-char/80 leading-relaxed">
                ChopNow acts as a marketplace connecting Consumers and Vendors. We do not prepare,
                handle, or deliver food items. Vendors are solely responsible for the quality and
                safety of their food products.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section
              id="s10"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">10</span>
                <span>Limitation of Liability</span>
              </h2>
              <p className="text-char/80 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHOPNOW SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
                LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12)
                MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Indemnification */}
            <section
              id="s11"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">11</span>
                <span>Indemnification</span>
              </h2>
              <p className="text-char/80 leading-relaxed">
                You agree to indemnify, defend, and hold harmless ChopNow and its officers,
                directors, employees, and agents from any claims, damages, losses, or expenses
                (including reasonable attorney fees) arising from your use of the Service, violation
                of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            {/* Termination */}
            <section
              id="s12"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">12</span>
                <span>Termination</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                We may suspend or terminate your access to the Service at any time, with or without
                cause, with or without notice. You may terminate your account at any time by
                contacting our support team.
              </p>
              <p className="text-char/80 leading-relaxed">
                Upon termination, your right to use the Service will immediately cease. Provisions
                that by their nature should survive termination will remain in effect.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section
              id="s13"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">13</span>
                <span>Dispute Resolution</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                Any disputes arising from these Terms or your use of the Service shall be resolved
                through:
              </p>
              <ol className="list-decimal pl-6 text-char/80 space-y-2 marker:text-pepper">
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
            <section
              id="s14"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">14</span>
                <span>Governing Law</span>
              </h2>
              <p className="text-char/80 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the
                Federal Republic of Nigeria, without regard to its conflict of law provisions. You
                agree to submit to the exclusive jurisdiction of the courts located in Nigeria for
                the resolution of any disputes.
              </p>
            </section>

            {/* Changes to Terms */}
            <section
              id="s15"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">15</span>
                <span>Changes to These Terms</span>
              </h2>
              <p className="text-char/80 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on this page and updating the "Last
                updated" date. Your continued use of the Service after changes become effective
                constitutes acceptance of the revised Terms.
              </p>
            </section>

            {/* Contact Us */}
            <section
              id="s16"
              className="py-8 border-b border-hairline last:border-b-0 first:pt-0 scroll-mt-24"
            >
              <h2 className="display text-[30px] sm:text-[40px] text-moringa mb-4 leading-[0.95] flex gap-3">
                <span className="text-pepper">16</span>
                <span>Contact Us</span>
              </h2>
              <p className="text-char/80 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <ul className="list-none text-char/80 space-y-2">
                <li>
                  <strong>Email:</strong> chopnow.app@gmail.com
                </li>
                <li>
                  <strong>Website:</strong>{' '}
                  <Link
                    to="/contact-us"
                    className="text-moringa font-bold underline underline-offset-4"
                  >
                    Contact Us Page
                  </Link>
                </li>
              </ul>
            </section>
          </article>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;
