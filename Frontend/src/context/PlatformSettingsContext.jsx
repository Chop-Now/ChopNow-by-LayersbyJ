import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services';

const PlatformSettingsContext = createContext();

export const usePlatformSettings = () => {
  const context = useContext(PlatformSettingsContext);
  if (!context) {
    throw new Error('usePlatformSettings must be used within a PlatformSettingsProvider');
  }
  return context;
};

export const PlatformSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    // Default values
    platformName: 'ChopNow',
    platformTagline: 'Save Food, Save Money, Save the Planet',
    supportEmail: 'chopnow.app@gmail.com',
    supportPhone: '+250 788 000 000',
    allowNewRegistrations: true,
    requireEmailVerification: true,
    allowGuestCheckout: false,
    enableReviews: true,
    enableNotifications: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch public settings on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const publicSettings = await settingsService.getPublicSettings();
        if (!isMounted) return;
        setSettings((prev) => ({ ...prev, ...publicSettings }));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch platform settings:', err);
        setError(err.message);
        // Use defaults if fetch fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh settings
  const refreshSettings = async () => {
    try {
      const publicSettings = await settingsService.getPublicSettings();
      setSettings((prev) => ({ ...prev, ...publicSettings }));
      return publicSettings;
    } catch (err) {
      console.error('Failed to refresh platform settings:', err);
      throw err;
    }
  };

  // Check if a feature is enabled
  const isFeatureEnabled = (featureName) => {
    const featureMap = {
      registration: settings.allowNewRegistrations,
      emailVerification: settings.requireEmailVerification,
      guestCheckout: settings.allowGuestCheckout,
      reviews: settings.enableReviews,
      notifications: settings.enableNotifications,
      maintenance: settings.maintenanceMode,
    };
    return featureMap[featureName] ?? true;
  };

  // Check if platform is in maintenance mode
  const isMaintenanceMode = () => settings.maintenanceMode;

  const value = {
    settings,
    loading,
    error,
    refreshSettings,
    isFeatureEnabled,
    isMaintenanceMode,
  };

  return (
    <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
  );
};

export default PlatformSettingsContext;
