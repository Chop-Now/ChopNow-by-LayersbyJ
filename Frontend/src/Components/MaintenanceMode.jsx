import React from 'react';
import { Wrench, Mail, Phone } from 'lucide-react';
import { usePlatformSettings } from '../context/PlatformSettingsContext';
import { CMark } from './brand/Illustrations';

const MaintenanceMode = () => {
  const { settings } = usePlatformSettings();

  return (
    <div className="min-h-screen bg-moringa text-fufu flex flex-col">
      <div className="flex-1 grid lg:grid-cols-[1.2fr_1fr]">
        {/* Message */}
        <section className="px-4 sm:px-8 lg:px-12 py-12 md:py-16 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <CMark fill="var(--color-yellow)" className="w-9" />
            <span className="wordmark text-2xl">{settings.platformName || 'ChopNow'}</span>
          </div>

          <p className="eyebrow text-yellow mt-12 flex items-center gap-2">
            <Wrench className="w-4 h-4 animate-pulse" aria-hidden="true" />
            Scheduled maintenance
          </p>
          <h1 className="display text-[64px] sm:text-[96px] lg:text-[128px] mt-3 leading-[0.86]">
            Under <span className="text-yellow">maintenance</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg font-medium opacity-90 leading-relaxed">
            We're currently performing scheduled maintenance to improve your experience. We'll be
            back shortly. Thank you for your patience!
          </p>

          <p className="mt-10 eyebrow text-[11px] opacity-80">
            {settings.platformTagline || 'Save Food, Save Money, Save the Planet'}
          </p>
        </section>

        {/* Contact Info */}
        <section className="bg-yellow text-moringa px-4 sm:px-8 lg:px-12 py-12 flex flex-col justify-center">
          <p className="eyebrow">Need urgent assistance?</p>
          <p className="display text-[40px] sm:text-[48px] mt-2">Contact us</p>

          <div className="mt-6 flex flex-col border-2 border-moringa">
            <a
              href={`mailto:${settings.supportEmail || 'chopnow.app@gmail.com'}`}
              className="flex items-center gap-3 h-14 px-4 font-bold hover:bg-yellow-dark transition-colors break-all"
            >
              <Mail className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{settings.supportEmail || 'chopnow.app@gmail.com'}</span>
            </a>
            <a
              href={`tel:${settings.supportPhone || '+250788000000'}`}
              className="flex items-center gap-3 h-14 px-4 font-bold border-t-2 border-moringa hover:bg-yellow-dark transition-colors"
            >
              <Phone className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{settings.supportPhone || '+250 788 000 000'}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MaintenanceMode;
