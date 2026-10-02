import React from 'react';
import { Wrench, Mail, Phone } from 'lucide-react';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const MaintenanceMode = () => {
  const { settings } = usePlatformSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated wrench icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Wrench className="w-12 h-12 text-yellow-500" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-yellow-500/30 animate-ping" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-4">{settings.platformName || 'ChopNow'}</h1>

        <h2 className="text-2xl font-semibold text-yellow-500 mb-6">Under Maintenance</h2>

        {/* Message */}
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience. We'll be back
          shortly. Thank you for your patience!
        </p>

        {/* Contact Info */}
        <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700">
          <p className="text-slate-400 mb-4">Need urgent assistance? Contact us:</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`mailto:${settings.supportEmail || 'chopnow.app@gmail.com'}`}
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>{settings.supportEmail || 'chopnow.app@gmail.com'}</span>
            </a>

            <span className="hidden sm:block text-slate-600">|</span>

            <a
              href={`tel:${settings.supportPhone || '+250788000000'}`}
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>{settings.supportPhone || '+250 788 000 000'}</span>
            </a>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-slate-500 mt-8 text-sm">
          {settings.platformTagline || 'Save Food, Save Money, Save the Planet'}
        </p>
      </div>
    </div>
  );
};

export default MaintenanceMode;
