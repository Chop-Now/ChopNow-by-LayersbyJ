import React from 'react';
import { ArrowLeft, MapPin, Phone, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import { PageHero } from '../Components/brand/Kit';

const FIELD =
  'h-12 pl-10 pr-4 w-full bg-white border-2 border-moringa text-sm font-medium text-moringa placeholder:text-moringa-muted/70 outline-none focus:bg-fufu';
const LABEL = 'block eyebrow text-[11px] text-moringa-muted mb-2';

const CONTACTS = [
  { Icon: MapPin, label: 'Visit', value: 'Kigali, Rwanda', tone: 'bg-lime text-moringa' },
  { Icon: Phone, label: 'Call', value: '+250 788 123 456', tone: 'bg-yellow text-moringa' },
  { Icon: Mail, label: 'Email', value: 'chopnow.app@gmail.com', tone: 'bg-peach text-clay' },
];

const ContactUs = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        art="pin"
        intro="Have questions about ChopNow? We'd love to hear from you. Send us a message and we'll respond as soon as possible."
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 eyebrow text-moringa hover:underline underline-offset-4 cursor-pointer mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" aria-hidden="true" />
          Back
        </button>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-8 items-start">
          {/* Contact Info */}
          <ul className="grid sm:grid-cols-3 lg:grid-cols-1 rounded-lg overflow-hidden">
            {CONTACTS.map(({ Icon, label, value, tone }) => (
              <li key={label} className={`${tone} p-6 min-h-[140px] flex flex-col`}>
                <p className="eyebrow text-[11px] flex items-center gap-2">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </p>
                <p className="mt-auto pt-6 text-lg font-bold break-words select-all">{value}</p>
              </li>
            ))}
          </ul>

          {/* Form */}
          <form className="bg-white border border-char/10 p-5 sm:p-8">
            <p className="eyebrow text-moringa">Send a message</p>
            <h2 className="display text-[40px] sm:text-[48px] text-moringa mt-2">
              How can we help?
            </h2>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor="name">
                  Your name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                    size={18}
                    aria-hidden="true"
                  />
                  <input id="name" className={FIELD} type="text" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="email">
                  Your email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-moringa pointer-events-none"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    className={FIELD}
                    type="email"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL} htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                className="w-full p-4 h-40 bg-white border-2 border-moringa text-sm font-medium text-moringa placeholder:text-moringa-muted/70 resize-none outline-none focus:bg-fufu"
                placeholder="Tell us how we can help you..."
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="mt-6 h-14 px-8 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors cursor-pointer w-full sm:w-auto"
            >
              Send message
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;
