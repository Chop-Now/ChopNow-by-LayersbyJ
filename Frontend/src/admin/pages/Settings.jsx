import React, { useState, useEffect } from 'react';
import {
  CircleUserRound,
  ReceiptText,
  Shield,
  Power,
  Trash2,
  Upload,
  Camera,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  MapPin,
  Monitor,
  Smartphone,
  Plus,
  Clock,
  FileText,
  X,
  LogOut,
  Loader2,
  Settings as SettingsIcon,
  Percent,
  Mail,
  Bell,
  Globe,
  Palette,
  CreditCard,
  ToggleLeft,
} from 'lucide-react';
import { useAdminMode } from '../context/AdminModeContext';
import { useAppContext } from '../../context/AppContext';
import { clearAccessToken } from '../../services/api';
import {
  businessService,
  authService,
  userService,
  settingsService,
  searchAddress,
  reverseGeocode,
} from '../../services';
import LocationPicker from '../../Components/maps/LocationPicker';
import ConfirmationModal from '../components/ConfirmationModal';
import toast from 'react-hot-toast';

const Settings = ({ initialTab = 'profile' }) => {
  const { adminMode } = useAdminMode();
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profileImage, setProfileImage] = useState(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Loading states for async actions
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [businessDetailsLoading, setBusinessDetailsLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState('');

  // Business Hours State
  const [businessHours, setBusinessHours] = useState([
    { day: 'Monday', from: '09:00', to: '17:00', closed: false },
    { day: 'Tuesday', from: '09:00', to: '17:00', closed: false },
    { day: 'Wednesday', from: '09:00', to: '17:00', closed: false },
    { day: 'Thursday', from: '09:00', to: '17:00', closed: false },
    { day: 'Friday', from: '09:00', to: '17:00', closed: false },
    { day: 'Saturday', from: '10:00', to: '15:00', closed: false },
    { day: 'Sunday', from: '', to: '', closed: true },
  ]);

  const [specialHours, setSpecialHours] = useState([]);

  // Business Information State
  const [businessInfo, setBusinessInfo] = useState({
    contactPhone: '+250 788 123 456',
    physicalAddress: { lat: -1.9441, lng: 30.0619, address: 'Kigali, Rwanda' },
  });

  const [addressSearch, setAddressSearch] = useState('');

  // Certificates State
  const [certificates, setCertificates] = useState([
    { id: 1, name: 'Business License', file: 'business_license.pdf', uploadDate: '2025-12-15' },
    { id: 2, name: 'Health Certificate', file: 'health_cert.pdf', uploadDate: '2026-01-10' },
    { id: 3, name: 'Tax Registration', file: 'tax_registration.pdf', uploadDate: '2025-11-20' },
  ]);

  // Form state for Shop Admin
  const [shopFormData, setShopFormData] = useState({
    businessName: '',
    businessLogo: null,
    businessTagline: '',
    businessEmail: '',
    contactPerson: '',
    contactEmail: '',
    phoneNumber: '',
  });

  // Form state for Website Admin
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    profilePicture: null,
    email: '',
    phoneNumber: '',
  });

  // Platform Settings State (Website Admin only)
  const [platformSettings, setPlatformSettings] = useState({
    // General Settings
    platformName: 'ChopNow',
    platformTagline: 'Save Food, Save Money, Save the Planet',
    supportEmail: 'chopnow.app@gmail.com',
    supportPhone: '+250 788 000 000',
    // Commission Settings
    platformFeePercent: 10,
    minimumWithdrawal: 5000,
    payoutHoldDays: 7,
    payoutIntervalDays: 7,
    // Checkout pricing
    cashPaymentsEnabled: false,
    deliveryFee: 1000,
    deliveryCommissionPercent: 10,
    taxPercent: 0,
    taxLabel: 'VAT',
    // Features Toggles
    allowNewRegistrations: true,
    requireEmailVerification: true,
    allowGuestCheckout: false,
    enableReviews: true,
    enableNotifications: true,
    maintenanceMode: false,
    // Notification Settings
    sendOrderConfirmation: true,
    sendPayoutNotification: true,
    sendNewVendorAlert: true,
    sendWeeklyReport: true,
  });
  const [platformSettingsLoading, setPlatformSettingsLoading] = useState(false);

  // Load platform settings from API (admin only)
  useEffect(() => {
    let isMounted = true;
    const loadPlatformSettings = async () => {
      const isAdmin =
        user?.activeRole === 'admin' || user?.role === 'admin' || user?.roles?.includes('admin');
      if (adminMode === 'website' && isAdmin) {
        try {
          setPlatformSettingsLoading(true);
          const settings = await settingsService.getAllSettings();
          if (!isMounted) return;
          setPlatformSettings({
            platformName: settings.platformName || 'ChopNow',
            platformTagline: settings.platformTagline || 'Save Food, Save Money, Save the Planet',
            supportEmail: settings.supportEmail || 'chopnow.app@gmail.com',
            supportPhone: settings.supportPhone || '+250 788 000 000',
            platformFeePercent: settings.platformFeePercent ?? 10,
            minimumWithdrawal: settings.minimumWithdrawal ?? 5000,
            payoutHoldDays: settings.payoutHoldDays ?? 7,
            payoutIntervalDays: settings.payoutIntervalDays ?? 7,
            cashPaymentsEnabled: settings.cashPaymentsEnabled ?? false,
            deliveryFee: settings.deliveryFee ?? 1000,
            deliveryCommissionPercent: settings.deliveryCommissionPercent ?? 10,
            taxPercent: settings.taxPercent ?? 0,
            taxLabel: settings.taxLabel || 'VAT',
            allowNewRegistrations: settings.allowNewRegistrations ?? true,
            requireEmailVerification: settings.requireEmailVerification ?? true,
            allowGuestCheckout: settings.allowGuestCheckout ?? false,
            enableReviews: settings.enableReviews ?? true,
            enableNotifications: settings.enableNotifications ?? true,
            maintenanceMode: settings.maintenanceMode ?? false,
            sendOrderConfirmation: settings.sendOrderConfirmation ?? true,
            sendPayoutNotification: settings.sendPayoutNotification ?? true,
            sendNewVendorAlert: settings.sendNewVendorAlert ?? true,
            sendWeeklyReport: settings.sendWeeklyReport ?? true,
          });
        } catch (error) {
          if (!isMounted) return;
          console.error('Error loading platform settings:', error);
        } finally {
          if (isMounted) setPlatformSettingsLoading(false);
        }
      }
    };
    loadPlatformSettings();
    return () => {
      isMounted = false;
    };
  }, [adminMode, user]);

  // Load user data into forms when user changes
  useEffect(() => {
    if (user) {
      // Set admin form data from user
      setAdminFormData({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        profilePicture: user.avatar || null,
        email: user.email || '',
        phoneNumber: user.phone || '',
      });

      // For shop admin, also set contact person info
      setShopFormData((prev) => ({
        ...prev,
        contactPerson: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        contactEmail: user.email || '',
        phoneNumber: user.phone || '',
      }));
    }
  }, [user]);

  // Load business data for shop admin
  useEffect(() => {
    let isMounted = true;
    const loadBusinessData = async () => {
      if (adminMode === 'shop') {
        try {
          const response = await businessService.getMyBusinesses();
          if (!isMounted) return;
          const businesses = response.businesses || response || [];
          if (businesses.length > 0) {
            const business = businesses[0];
            setShopFormData((prev) => ({
              ...prev,
              businessName: business.businessName || '',
              businessLogo: business.logo || null,
              businessTagline: business.tagline || '',
              businessEmail: business.email || '',
              contactPerson: business.contactPerson || prev.contactPerson,
              contactEmail: business.contactEmail || prev.contactEmail,
              phoneNumber: business.phone || prev.phoneNumber,
            }));
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('Error loading business data:', error);
        }
      }
    };
    loadBusinessData();
    return () => {
      isMounted = false;
    };
  }, [adminMode]);

  const handleShopInputChange = (e) => {
    const { name, value } = e.target;
    setShopFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (adminMode === 'shop') {
          setShopFormData((prev) => ({
            ...prev,
            businessLogo: reader.result,
          }));
        } else {
          setAdminFormData((prev) => ({
            ...prev,
            profilePicture: reader.result,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      if (adminMode === 'shop') {
        // Update business profile
        const response = await businessService.getMyBusinesses();
        const businesses = response.businesses || response || [];
        if (businesses.length > 0) {
          await businessService.updateBusiness(businesses[0]._id, {
            name: shopFormData.businessName,
            tagline: shopFormData.businessTagline,
            email: shopFormData.businessEmail,
            contactPerson: shopFormData.contactPerson,
            contactEmail: shopFormData.contactEmail,
            phone: shopFormData.phoneNumber,
          });
        }
        toast.success('Business profile updated successfully!');
      } else {
        // Update user profile - parse name into first and last
        const nameParts = adminFormData.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await authService.updateProfile({
          firstName,
          lastName,
          phone: adminFormData.phoneNumber,
        });
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogoutAllDevices = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setLogoutAllLoading(true);
    try {
      await authService.logoutAllDevices();
      toast.success('Logged out from all devices successfully');
      // Redirect to login page after logging out from all devices
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out from all devices:', error);
      toast.error(
        error.response?.data?.message || error.message || 'Failed to logout from all devices'
      );
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    setDeleteLoading(true);
    try {
      await authService.deleteAccount();
      toast.success('Account deleted successfully. Redirecting...');
      localStorage.removeItem('user');
      clearAccessToken();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // The backend verifies the current password and emails a one-time code
  // before accepting a new password (protects against a hijacked logged-in
  // session silently changing it) - this is a two-step request-OTP-then-
  // confirm flow, not a single call.
  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match!');
      return;
    }
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.requestPasswordChangeOTP(passwordData.currentPassword);
      setPasswordOtpSent(true);
      toast.success('Code sent - check your email');
    } catch (error) {
      console.error('Error requesting password change code:', error);
      toast.error(
        error.response?.data?.message || error.message || 'Failed to send verification code'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!passwordOtp) {
      toast.error('Enter the code sent to your email');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePasswordWithOTP(passwordOtp, passwordData.newPassword);
      toast.success('Password updated successfully!');
      setShowPasswordFields(false);
      setPasswordOtpSent(false);
      setPasswordOtp('');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Business Hours Handlers
  const handleBusinessHourChange = (index, field, value) => {
    const updatedHours = [...businessHours];
    updatedHours[index][field] = value;
    setBusinessHours(updatedHours);
  };

  const handleAddSpecialHour = () => {
    setSpecialHours([
      ...specialHours,
      { date: '', description: '', from: '09:00', to: '17:00', closed: false },
    ]);
  };

  const handleRemoveSpecialHour = (index) => {
    setSpecialHours(specialHours.filter((_, i) => i !== index));
  };

  const handleSpecialHourChange = (index, field, value) => {
    const updatedSpecialHours = [...specialHours];
    updatedSpecialHours[index][field] = value;
    setSpecialHours(updatedSpecialHours);
  };

  const handleBusinessInfoChange = (field, value) => {
    setBusinessInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationSelect = (location) => {
    setBusinessInfo((prev) => ({
      ...prev,
      physicalAddress: location,
    }));
  };

  const handleSearchAddress = async () => {
    if (!addressSearch.trim()) return;

    try {
      // Using shared geocoding helper (LocationIQ / Nominatim)
      const data = await searchAddress(addressSearch);

      if (data && data.length > 0) {
        const result = data[0];
        const location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name,
        };
        handleLocationSelect(location);
        setAddressSearch(result.display_name);
      } else {
        alert('Address not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      alert('Failed to search address. Please try again.');
    }
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Using shared reverse geocoding helper (LocationIQ / Nominatim)
            const data = await reverseGeocode(latitude, longitude);

            const location = {
              lat: latitude,
              lng: longitude,
              address: data.display_name || `${latitude}, ${longitude}`,
            };
            handleLocationSelect(location);
            setAddressSearch(location.address);
          } catch (error) {
            console.error('Error getting address:', error);
            const location = {
              lat: latitude,
              lng: longitude,
              address: `${latitude}, ${longitude}`,
            };
            handleLocationSelect(location);
            setAddressSearch(location.address);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleCertificateUpload = async (certificateId, file) => {
    if (!file) return;
    try {
      const response = await businessService.getMyBusinesses();
      const businesses = response.businesses || response || [];
      if (businesses.length > 0) {
        const formData = new FormData();
        formData.append('documents', file);
        await businessService.uploadKYC(businesses[0]._id, formData);
        // Update local state
        setCertificates((prev) =>
          prev.map((cert) =>
            cert.id === certificateId
              ? { ...cert, file: file.name, uploadDate: new Date().toISOString().split('T')[0] }
              : cert
          )
        );
        toast.success('Certificate uploaded successfully!');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upload certificate');
    }
  };

  const handleSaveBusinessDetails = async () => {
    setBusinessDetailsLoading(true);
    try {
      const response = await businessService.getMyBusinesses();
      const businesses = response.businesses || response || [];
      if (businesses.length > 0) {
        await businessService.updateBusiness(businesses[0]._id, {
          businessHours,
          specialHours,
          phone: businessInfo.contactPhone,
          address: {
            street: businessInfo.physicalAddress.address,
            location: {
              type: 'Point',
              coordinates: [businessInfo.physicalAddress.lng, businessInfo.physicalAddress.lat],
            },
          },
        });
        toast.success('Business details saved successfully!');
      } else {
        toast.error('No business found to update');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || 'Failed to save business details'
      );
    } finally {
      setBusinessDetailsLoading(false);
    }
  };

  const handleCancelBusinessDetails = () => {
    toast('Changes discarded');
    setActiveTab('profile');
  };

  const handleLogoutSession = async (sessionId) => {
    try {
      await authService.logoutSession(sessionId);
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session logged out successfully');
    } catch (error) {
      console.error('Error logging out session:', error);
      toast.error(error.message || 'Failed to logout session');
    }
  };

  const handleSaveSecurityChanges = async () => {
    try {
      if (showPasswordFields && passwordData.newPassword) {
        await handleUpdatePassword();
      }
      toast.success('Security settings saved successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to save security settings');
    }
  };

  const handleCancelSecurityChanges = () => {
    setShowPasswordFields(false);
    setPasswordOtpSent(false);
    setPasswordOtp('');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // Platform Settings Handlers
  const handlePlatformSettingChange = (field, value) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePlatformSettings = async () => {
    try {
      setPlatformSettingsLoading(true);
      await settingsService.updateSettings(platformSettings);
      toast.success('Platform settings saved successfully! Changes will take effect immediately.');
    } catch (error) {
      console.error('Error saving platform settings:', error);
      toast.error(error.message || 'Failed to save platform settings');
    } finally {
      setPlatformSettingsLoading(false);
    }
  };

  // State for active sessions and login activity
  const [activeSessions, setActiveSessions] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch active sessions and login activity
  useEffect(() => {
    let isMounted = true;
    const fetchSessionsAndActivity = async () => {
      // Fetch active sessions
      try {
        setSessionsLoading(true);
        const sessionsData = await authService.getActiveSessions();
        if (!isMounted) return;
        const formattedSessions = (sessionsData.sessions || []).map((session) => ({
          id: session.id || session._id,
          device: session.device || 'Unknown Device',
          location: session.location || 'Unknown Location',
          icon:
            session.device?.toLowerCase().includes('mobile') ||
            session.device?.toLowerCase().includes('iphone') ||
            session.device?.toLowerCase().includes('android')
              ? Smartphone
              : Monitor,
          lastActive: session.isCurrent ? 'Current session' : session.lastActive || 'Unknown',
        }));
        setActiveSessions(formattedSessions);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching sessions:', error);
        setActiveSessions([
          {
            id: 'current',
            device: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
            location: 'Current Location',
            icon: navigator.userAgent.includes('Mobile') ? Smartphone : Monitor,
            lastActive: 'Current session',
          },
        ]);
      } finally {
        if (isMounted) setSessionsLoading(false);
      }

      // Fetch login activity
      try {
        if (!isMounted) return;
        setActivityLoading(true);
        const activityData = await authService.getLoginActivity(10);
        if (!isMounted) return;
        setLoginActivity(activityData.loginActivity || []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching login activity:', error);
        setLoginActivity([]);
      } finally {
        if (isMounted) setActivityLoading(false);
      }
    };

    if (activeTab === 'security') {
      fetchSessionsAndActivity();
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const sidebarItems = [
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: CircleUserRound,
    },
    ...(adminMode === 'shop'
      ? [
          {
            id: 'business',
            label: 'Business Details',
            icon: ReceiptText,
          },
        ]
      : [
          {
            id: 'platform',
            label: 'Platform Settings',
            icon: SettingsIcon,
          },
        ]),
    {
      id: 'security',
      label: 'Security Settings',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-sm">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-3">
            <nav className="space-y-1.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg transition-all text-sm cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Form */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Profile Information
                </h2>

                {adminMode === 'shop' ? (
                  <div className="space-y-4">
                    {/* Business Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={shopFormData.businessName}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Business Logo */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Logo
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 h-20 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                          {shopFormData.businessLogo ? (
                            <img
                              src={shopFormData.businessLogo}
                              alt="Business Logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="inline-flex items-center space-x-2 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="font-medium">Upload New Picture</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'logo')}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            JPG, PNG or GIF. Max size 2MB.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Business Tagline */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Tagline
                      </label>
                      <input
                        type="text"
                        name="businessTagline"
                        value={shopFormData.businessTagline}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Business Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Email
                      </label>
                      <input
                        type="email"
                        name="businessEmail"
                        value={shopFormData.businessEmail}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={shopFormData.contactPerson}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Contact Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={shopFormData.contactEmail}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={shopFormData.phoneNumber}
                        onChange={handleShopInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={adminFormData.name}
                        onChange={handleAdminInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Profile Picture */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Profile Picture
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                          {adminFormData.profilePicture ? (
                            <img
                              src={adminFormData.profilePicture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CircleUserRound className="w-10 h-10 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="inline-flex items-center space-x-2 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="font-medium">Upload New Picture</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'profile')}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            JPG, PNG or GIF. Max size 2MB.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={adminFormData.email}
                        onChange={handleAdminInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={adminFormData.phoneNumber}
                        onChange={handleAdminInputChange}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Update Profile Button */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={profileLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-linear-to-r from-solid to-tertiary text-white rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {profileLoading ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Account Actions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Logout from All Devices */}
                  <div className="flex flex-col justify-between p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div className="flex items-start space-x-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <Power className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          Logout From All Devices
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Sign out from all active sessions
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogoutAllDevices}
                      disabled={logoutAllLoading}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {logoutAllLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {logoutAllLoading ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div className="flex flex-col justify-between p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div className="flex items-start space-x-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          Delete Account
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Permanently delete your account and all data
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deleteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-4">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Business Details
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Manage your store's hours, location, contact info, and legal documents.
                </p>
              </div>

              {/* Business Hours Section */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Business Hours
                </h2>
                <div className="space-y-3">
                  {businessHours.map((hour, index) => (
                    <div key={hour.day} className="flex items-center space-x-3">
                      <div className="w-24">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {hour.day}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="time"
                          value={hour.from}
                          onChange={(e) => handleBusinessHourChange(index, 'from', e.target.value)}
                          disabled={hour.closed}
                          className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">to</span>
                        <input
                          type="time"
                          value={hour.to}
                          onChange={(e) => handleBusinessHourChange(index, 'to', e.target.value)}
                          disabled={hour.closed}
                          className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label className="flex items-center space-x-2 ml-4">
                          <input
                            type="checkbox"
                            checked={hour.closed}
                            onChange={(e) =>
                              handleBusinessHourChange(index, 'closed', e.target.checked)
                            }
                            className="w-4 h-4 text-solid bg-slate-100 border-slate-300 rounded focus:ring-solid dark:focus:ring-solid dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                          />
                          <span className="text-xs text-slate-600 dark:text-slate-400">Closed</span>
                        </label>
                      </div>
                    </div>
                  ))}

                  {/* Horizontal Line */}
                  <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

                  {/* Special Hours */}
                  {specialHours.map((special, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30"
                    >
                      <input
                        type="date"
                        value={special.date}
                        onChange={(e) => handleSpecialHourChange(index, 'date', e.target.value)}
                        className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Holiday name"
                        value={special.description}
                        onChange={(e) =>
                          handleSpecialHourChange(index, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                      <input
                        type="time"
                        value={special.from}
                        onChange={(e) => handleSpecialHourChange(index, 'from', e.target.value)}
                        disabled={special.closed}
                        className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all disabled:opacity-50"
                      />
                      <span className="text-xs text-slate-500">to</span>
                      <input
                        type="time"
                        value={special.to}
                        onChange={(e) => handleSpecialHourChange(index, 'to', e.target.value)}
                        disabled={special.closed}
                        className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all disabled:opacity-50"
                      />
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={special.closed}
                          onChange={(e) =>
                            handleSpecialHourChange(index, 'closed', e.target.checked)
                          }
                          className="w-4 h-4 text-solid bg-slate-100 border-slate-300 rounded focus:ring-solid"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Closed</span>
                      </label>
                      <button
                        onClick={() => handleRemoveSpecialHour(index)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAddSpecialHour}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-solid border border-solid rounded-lg hover:bg-solid hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Special Hours</span>
                  </button>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Business Information
                </h2>
                <div className="space-y-4">
                  {/* Contact Phone Number */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={businessInfo.contactPhone}
                      onChange={(e) => handleBusinessInfoChange('contactPhone', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Physical Address with Map */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Physical Address
                    </label>

                    {/* Search and Current Location */}
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Search for an address..."
                          value={addressSearch}
                          onChange={(e) => setAddressSearch(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
                          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                        />
                        <button
                          onClick={handleSearchAddress}
                          className="px-4 py-2 text-sm bg-solid text-white rounded-lg hover:bg-solid/90 transition-all font-medium cursor-pointer"
                        >
                          Search
                        </button>
                      </div>
                      <button
                        onClick={handleUseCurrentLocation}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium whitespace-nowrap cursor-pointer"
                      >
                        <MapPin className="w-4 h-4" />
                        Use Current Location
                      </button>
                    </div>

                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      selectedLocation={businessInfo.physicalAddress}
                    />
                  </div>
                </div>
              </div>

              {/* Certificates Section */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Certificates & Documents
                </h2>
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {cert.name}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {cert.file} • Uploaded: {cert.uploadDate}
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Update</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleCertificateUpload(cert.id, e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={handleCancelBusinessDetails}
                  className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBusinessDetails}
                  disabled={businessDetailsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-linear-to-r from-solid to-tertiary text-white rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {businessDetailsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {businessDetailsLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'platform' && adminMode !== 'shop' && (
            <div className="space-y-4">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Platform Settings
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configure platform-wide settings and preferences
                </p>
              </div>

              {/* General Settings */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      General Settings
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Basic platform information
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={platformSettings.platformName}
                        onChange={(e) =>
                          handlePlatformSettingChange('platformName', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Platform Tagline
                      </label>
                      <input
                        type="text"
                        value={platformSettings.platformTagline}
                        onChange={(e) =>
                          handlePlatformSettingChange('platformTagline', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={platformSettings.supportEmail}
                        onChange={(e) =>
                          handlePlatformSettingChange('supportEmail', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Support Phone
                      </label>
                      <input
                        type="tel"
                        value={platformSettings.supportPhone}
                        onChange={(e) =>
                          handlePlatformSettingChange('supportPhone', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission & Payout Settings */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Commission & Payouts
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Configure fees and payout schedules
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Platform Fee (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={platformSettings.platformFeePercent}
                          onChange={(e) =>
                            handlePlatformSettingChange(
                              'platformFeePercent',
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Minimum Withdrawal (RWF)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={platformSettings.minimumWithdrawal}
                        onChange={(e) =>
                          handlePlatformSettingChange('minimumWithdrawal', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Earnings Holding Period (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={platformSettings.payoutHoldDays}
                        onChange={(e) =>
                          handlePlatformSettingChange(
                            'payoutHoldDays',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        A vendor's earnings from a completed order become withdrawable this many
                        days later. Keeps money on hand to cover refunds/disputes on that order.
                        Rider delivery earnings are never held.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Minimum Days Between Payout Requests
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={platformSettings.payoutIntervalDays}
                        onChange={(e) =>
                          handlePlatformSettingChange(
                            'payoutIntervalDays',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        A vendor or rider can request at most one payout every this many days. A
                        failed or cancelled payout doesn't count against them.
                      </p>
                    </div>
                  </div>

                  {/* Checkout pricing: platform-controlled delivery fee, rider commission, tax */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    {[
                      {
                        key: 'deliveryFee',
                        label: 'Delivery Fee per Vendor (RWF)',
                        min: 0,
                        parse: (v) => parseInt(v, 10),
                      },
                      {
                        key: 'deliveryCommissionPercent',
                        label: 'Commission on Delivery Fee (%)',
                        min: 0,
                        max: 100,
                        parse: parseFloat,
                      },
                      {
                        key: 'taxPercent',
                        label: 'Tax (%) — 0 = no tax line',
                        min: 0,
                        max: 100,
                        parse: parseFloat,
                      },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          {field.label}
                        </label>
                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          value={platformSettings[field.key]}
                          onChange={(e) =>
                            handlePlatformSettingChange(
                              field.key,
                              Number.isNaN(field.parse(e.target.value))
                                ? 0
                                : field.parse(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Tax Label
                      </label>
                      <input
                        type="text"
                        maxLength={30}
                        value={platformSettings.taxLabel}
                        onChange={(e) => handlePlatformSettingChange('taxLabel', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!platformSettings.cashPaymentsEnabled}
                      onChange={(e) =>
                        handlePlatformSettingChange('cashPaymentsEnabled', e.target.checked)
                      }
                      className="mt-0.5 w-4 h-4"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                        Allow cash payments
                      </span>
                      <span className="block text-xs text-slate-600 dark:text-slate-400">
                        Off by default: with cash the vendor keeps the money, so ChopNow can't
                        collect its commission and riders aren't paid through the app.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <ToggleLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Feature Toggles
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Enable or disable platform features
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: 'allowNewRegistrations',
                      label: 'Allow New Registrations',
                      desc: 'Allow new users to sign up',
                    },
                    {
                      key: 'requireEmailVerification',
                      label: 'Require Email Verification',
                      desc: 'Users must verify email before accessing',
                    },
                    {
                      key: 'allowGuestCheckout',
                      label: 'Allow Guest Checkout',
                      desc: 'Allow orders without an account',
                    },
                    {
                      key: 'enableReviews',
                      label: 'Enable Reviews',
                      desc: 'Allow customers to leave reviews',
                    },
                    {
                      key: 'enableNotifications',
                      label: 'Enable Notifications',
                      desc: 'Send push and email notifications',
                    },
                    {
                      key: 'maintenanceMode',
                      label: 'Maintenance Mode',
                      desc: 'Temporarily disable the platform',
                    },
                  ].map((feature) => (
                    <div
                      key={feature.key}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        feature.key === 'maintenanceMode' && platformSettings.maintenanceMode
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {feature.label}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={platformSettings[feature.key]}
                          onChange={(e) =>
                            handlePlatformSettingChange(feature.key, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div
                          className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-2 rounded-full peer after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                            feature.key === 'maintenanceMode'
                              ? 'bg-slate-200 dark:bg-slate-700 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 peer-checked:after:translate-x-full peer-checked:bg-red-600'
                              : 'bg-slate-200 dark:bg-slate-700 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 peer-checked:after:translate-x-full peer-checked:bg-green-600'
                          }`}
                        ></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Admin Notifications
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Configure which notifications you receive
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      key: 'sendOrderConfirmation',
                      label: 'Order Confirmations',
                      desc: 'Receive notification for each new order',
                    },
                    {
                      key: 'sendPayoutNotification',
                      label: 'Payout Requests',
                      desc: 'Receive notification when vendors request payouts',
                    },
                    {
                      key: 'sendNewVendorAlert',
                      label: 'New Vendor Registrations',
                      desc: 'Receive notification when new vendors register',
                    },
                    {
                      key: 'sendWeeklyReport',
                      label: 'Weekly Reports',
                      desc: 'Receive weekly platform performance summary',
                    },
                  ].map((notification) => (
                    <div
                      key={notification.key}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {notification.label}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {notification.desc}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={platformSettings[notification.key]}
                          onChange={(e) =>
                            handlePlatformSettingChange(notification.key, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleSavePlatformSettings}
                  disabled={platformSettingsLoading}
                  className="px-6 py-2.5 text-sm bg-linear-to-r from-solid to-tertiary text-white rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {platformSettingsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Platform Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Change Password Section */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Change Password
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Update your password regularly to keep your account secure
                    </p>
                  </div>
                  {!showPasswordFields && (
                    <button
                      onClick={() => setShowPasswordFields(true)}
                      className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-medium cursor-pointer"
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordFields && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {passwordOtpSent && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          placeholder="Enter the code sent to your email"
                          value={passwordOtp}
                          onChange={(e) => setPasswordOtp(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                        />
                      </div>
                    )}

                    {/* Update Password Button */}
                    <button
                      onClick={passwordOtpSent ? handleConfirmPasswordChange : handleUpdatePassword}
                      disabled={passwordLoading || (passwordOtpSent && !passwordOtp)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-linear-to-r from-solid to-tertiary text-white rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {passwordLoading
                        ? 'Please wait...'
                        : passwordOtpSent
                          ? 'Confirm Change'
                          : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>

              {/* Active Sessions */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Active Sessions
                </h2>
                <div className="space-y-3">
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-solid animate-spin" />
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      No active sessions found
                    </p>
                  ) : (
                    activeSessions.map((session) => {
                      const Icon = session.icon;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {session.device}
                              </h3>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {session.location}
                                </p>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  •
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {session.lastActive}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleLogoutSession(session.id)}
                            className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-medium cursor-pointer"
                          >
                            Logout
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Login Activity */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Recent Login Activity
                </h2>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-solid animate-spin" />
                  </div>
                ) : loginActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No login activity found
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 pb-3">
                            Date & Time
                          </th>
                          <th className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 pb-3">
                            Device
                          </th>
                          <th className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 pb-3">
                            Location
                          </th>
                          <th className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 pb-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginActivity.map((activity) => (
                          <tr
                            key={activity.id}
                            className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                          >
                            <td className="py-3 text-xs text-slate-700 dark:text-slate-300">
                              {activity.dateTime}
                            </td>
                            <td className="py-3 text-xs text-slate-700 dark:text-slate-300">
                              {activity.device}
                            </td>
                            <td className="py-3 text-xs text-slate-600 dark:text-slate-400">
                              {activity.location}
                            </td>
                            <td className="py-3">
                              {activity.status === 'Successful' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Successful</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                                  <XCircle className="w-3 h-3" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={handleCancelSecurityChanges}
                  className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSecurityChanges}
                  className="px-4 py-2 text-sm bg-linear-to-r from-solid to-tertiary text-white rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        type="logout"
        title="Logout All Devices?"
        message="Do you really want to logout from all devices? You will need to sign in again on all devices."
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        type="delete"
        title="Delete Account?"
        message="Do you really want to delete your account? This action cannot be undone and all your data will be permanently removed."
      />
    </div>
  );
};

export default Settings;
