import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../Components/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-fufu">
      {/* Header */}
      <div className="bg-fufu/95 border-b border-fufu-border sticky top-0 z-10">
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
        <h1 className="text-4xl font-bold text-moringa mb-2">Privacy Policy</h1>
        <p className="text-moringa-muted mb-8">Last updated: February 13, 2026</p>

        <div className="prose prose-gray max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">1. Introduction</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              ChopNow ("we," "us," or "our") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your personal information
              when you use our website, mobile applications, and related services (collectively, the
              "Service").
            </p>
            <p className="text-moringa-muted leading-relaxed">
              By using our Service, you consent to the collection and use of your information as
              described in this Privacy Policy. If you do not agree with our policies and practices,
              please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-moringa mb-3">2.1 Information You Provide</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We collect information you voluntarily provide when using our Service, including:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>
                <strong>Account Information:</strong> Name, email address, phone number, password,
                and profile picture.
              </li>
              <li>
                <strong>Business Information (for Vendors):</strong> Business name, address,
                registration documents, food handling licenses, and banking details for payouts.
              </li>
              <li>
                <strong>Transaction Information:</strong> Order history, payment details, and
                delivery/pickup addresses.
              </li>
              <li>
                <strong>Communications:</strong> Messages, reviews, ratings, and customer support
                inquiries.
              </li>
              <li>
                <strong>Identity Verification:</strong> Government-issued ID and verification
                documents when required.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">
              2.2 Information Collected Automatically
            </h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              When you use our Service, we automatically collect certain information, including:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>
                <strong>Device Information:</strong> Device type, operating system, unique device
                identifiers, and browser type.
              </li>
              <li>
                <strong>Location Information:</strong> GPS data, IP address, and general location to
                show nearby food options.
              </li>
              <li>
                <strong>Usage Information:</strong> Pages visited, features used, search queries,
                and interaction with listings.
              </li>
              <li>
                <strong>Cookies and Tracking:</strong> We use cookies and similar technologies to
                enhance your experience and analyze usage patterns.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">
              2.3 Information from Third Parties
            </h3>
            <p className="text-moringa-muted leading-relaxed">
              We may receive information from third parties, including:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>
                <strong>Social Login Providers:</strong> If you sign in using Google or other social
                accounts, we receive your name, email, and profile picture.
              </li>
              <li>
                <strong>Payment Processors:</strong> Transaction confirmations and payment status
                updates.
              </li>
              <li>
                <strong>Analytics Providers:</strong> Aggregated usage data and insights.
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>
                <strong>Provide Our Service:</strong> Process orders, facilitate payments, and
                enable communication between Consumers and Vendors.
              </li>
              <li>
                <strong>Personalize Your Experience:</strong> Show relevant food listings,
                recommendations, and content based on your preferences and location.
              </li>
              <li>
                <strong>Improve Our Service:</strong> Analyze usage patterns, identify issues, and
                develop new features.
              </li>
              <li>
                <strong>Communicate With You:</strong> Send order updates, notifications,
                newsletters, and promotional materials (with your consent).
              </li>
              <li>
                <strong>Ensure Safety and Security:</strong> Detect fraud, enforce our Terms of
                Service, and protect users.
              </li>
              <li>
                <strong>Comply With Legal Obligations:</strong> Meet regulatory requirements,
                respond to legal requests, and protect our rights.
              </li>
              <li>
                <strong>Measure Impact:</strong> Track food waste reduction metrics and
                environmental impact statistics.
              </li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              4. How We Share Your Information
            </h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-medium text-moringa mb-3">4.1 With Other Users</h3>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Vendors can see Consumer names and order details to fulfill orders.</li>
              <li>Consumers can see Vendor business information, ratings, and reviews.</li>
              <li>Your reviews and ratings are publicly visible on the platform.</li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">4.2 With Service Providers</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We share information with trusted third-party service providers who assist us in
              operating our Service, including:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Payment processors (for handling transactions)</li>
              <li>Cloud hosting providers (for data storage)</li>
              <li>Analytics providers (for usage analysis)</li>
              <li>Email service providers (for communications)</li>
              <li>Customer support tools</li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">4.3 For Legal Reasons</h3>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We may disclose your information if required by law or if we believe disclosure is
              necessary to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>Comply with legal obligations or court orders.</li>
              <li>Protect the rights, property, or safety of ChopNow, our users, or the public.</li>
              <li>Detect, prevent, or address fraud, security, or technical issues.</li>
            </ul>

            <h3 className="text-xl font-medium text-moringa mb-3">4.4 Business Transfers</h3>
            <p className="text-moringa-muted leading-relaxed">
              If ChopNow is involved in a merger, acquisition, or sale of assets, your information
              may be transferred as part of that transaction. We will notify you of any such change
              and any choices you may have.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">5. Data Security</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your
              personal information, including:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Encryption of data in transit and at rest.</li>
              <li>Secure authentication mechanisms.</li>
              <li>Regular security assessments and audits.</li>
              <li>Access controls limiting who can view your data.</li>
              <li>Employee training on data protection practices.</li>
            </ul>
            <p className="text-moringa-muted leading-relaxed mt-4">
              However, no method of transmission over the internet or electronic storage is 100%
              secure. While we strive to protect your information, we cannot guarantee absolute
              security.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">6. Data Retention</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>Provide our Service and maintain your account.</li>
              <li>Comply with legal, accounting, or reporting requirements.</li>
              <li>Resolve disputes and enforce our agreements.</li>
              <li>Support business operations and improve our Service.</li>
            </ul>
            <p className="text-moringa-muted leading-relaxed mt-4">
              When you delete your account, we will delete or anonymize your personal information
              within 90 days, except where retention is required by law or for legitimate business
              purposes.
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">7. Your Rights and Choices</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal
              information:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of the personal information we hold about
                you.
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or incomplete
                information.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal information, subject to
                legal requirements.
              </li>
              <li>
                <strong>Portability:</strong> Request a copy of your data in a portable format.
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Where processing is based on consent, you may
                withdraw it at any time.
              </li>
            </ul>
            <p className="text-moringa-muted leading-relaxed mt-4">
              To exercise these rights, please contact us at chopnow.app@gmail.com. We will respond
              to your request within 30 days.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              8. Cookies and Tracking Technologies
            </h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc pl-6 text-moringa-muted space-y-2 mb-4">
              <li>
                <strong>Essential Cookies:</strong> Enable core functionality like authentication
                and security.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Understand how users interact with our Service.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and preferences.
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Deliver relevant advertisements (with your
                consent).
              </li>
            </ul>
            <p className="text-moringa-muted leading-relaxed">
              You can control cookies through your browser settings. Note that disabling certain
              cookies may affect the functionality of our Service.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">9. Children's Privacy</h2>
            <p className="text-moringa-muted leading-relaxed">
              Our Service is not intended for children under 18 years of age. We do not knowingly
              collect personal information from children. If you believe we have collected
              information from a child, please contact us immediately at chopnow.app@gmail.com, and
              we will take steps to delete such information.
            </p>
          </section>

          {/* International Data Transfers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              10. International Data Transfers
            </h2>
            <p className="text-moringa-muted leading-relaxed">
              Your information may be transferred to and processed in countries other than your
              country of residence. These countries may have different data protection laws. When we
              transfer your information internationally, we take appropriate safeguards to ensure
              your information remains protected in accordance with this Privacy Policy and
              applicable laws.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">11. Third-Party Links</h2>
            <p className="text-moringa-muted leading-relaxed">
              Our Service may contain links to third-party websites or services. We are not
              responsible for the privacy practices of these third parties. We encourage you to read
              the privacy policies of any third-party sites you visit.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              12. Changes to This Privacy Policy
            </h2>
            <p className="text-moringa-muted leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the "Last updated"
              date. We encourage you to review this Privacy Policy periodically. Your continued use
              of the Service after changes become effective constitutes acceptance of the revised
              policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">13. Contact Us</h2>
            <p className="text-moringa-muted leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us:
            </p>
            <ul className="list-none text-moringa-muted space-y-2">
              <li>
                <strong>Email:</strong> chopnow.app@gmail.com
              </li>
              <li>
                <strong>General Inquiries:</strong> chopnow.app@gmail.com
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <Link to="/contact-us" className="text-moringa hover:underline">
                  Contact Us Page
                </Link>
              </li>
            </ul>
          </section>

          {/* Data Protection Officer */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-moringa mb-4">
              14. Data Protection Officer
            </h2>
            <p className="text-moringa-muted leading-relaxed">
              For data protection inquiries, you may contact our Data Protection Officer at
              dpo@chopnow.app.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
