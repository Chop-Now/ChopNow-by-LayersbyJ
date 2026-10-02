import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  MapPin,
  LocateFixed,
  PersonStanding,
  Handshake,
  ChevronDown,
  Tractor,
  Store,
  UtensilsCrossed,
  Croissant,
} from 'lucide-react';
import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useGeolocation } from '../Components/maps/useGeolocation';
import { reverseGeocode, searchAddress } from '../services/geocoding';
import { businessService } from '../services';
import PasswordStrengthMeter from '../Components/ui/PasswordStrengthMeter';
import toast from 'react-hot-toast';

import { GoogleLogin } from '@react-oauth/google';
import { useAppContext } from '../context/AppContext';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

// Deferred: LocationPicker pulls in Leaflet (~190KB) and only ever renders
// for buyers who reach the location step, so it shouldn't block the
// initial SignUp page load/switch from Login.
const LocationPicker = lazy(() => import('../Components/maps/LocationPicker'));

// Business categories with their verification requirements
// ALL categories require document verification for platform safety
const BUSINESS_CATEGORIES = [
  {
    value: 'farmer',
    label: 'Farmer',
    icon: Tractor,
    requiresVerification: true,
    description: 'Sell fresh produce directly',
    requiredDocs: 'Farm registration or land ownership document',
  },
  {
    value: 'supermarket',
    label: 'Supermarket',
    icon: Store,
    requiresVerification: true,
    description: 'Retail grocery store',
    requiredDocs: 'Business license and tax registration',
  },
  {
    value: 'bakery',
    label: 'Bakery',
    icon: Croissant,
    requiresVerification: true,
    description: 'Baked goods and pastries',
    requiredDocs: 'Food handling permit and business license',
  },
  {
    value: 'restaurant',
    label: 'Restaurant',
    icon: UtensilsCrossed,
    requiresVerification: true,
    description: 'Prepared meals and food service',
    requiredDocs: 'Health certificate and food handling permit',
  },
];

const SignUp = () => {
  // ALL hooks must be called at the top, before any conditional returns
  const { googleAuth, register } = useAppContext();
  const { settings, isFeatureEnabled } = usePlatformSettings();
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null); // null, 'buyer', or 'business'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  // H16: handleSubmit had no in-flight guard - a double-click or slow
  // network could fire two concurrent registration attempts.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getCurrentLocation } = useGeolocation();

  // H5 fix: see Login.jsx - ID-token credential flow, required by the backend's
  // audience verification.
  // Stable references (useCallback), not inline arrows: @react-oauth/google's
  // GoogleLogin re-invokes Google's renderButton whenever onSuccess/onError
  // change identity, and Google's script appends a fresh button into the
  // container each time rather than replacing it - an inline arrow recreated
  // every render was rendering two stacked "Sign up with Google" buttons in
  // production (found during the 2026-09-26 E2E pass).
  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      try {
        await googleAuth(credentialResponse.credential);
        navigate('/shop');
      } catch (err) {
        console.error(err);
      }
    },
    [googleAuth, navigate]
  );
  const handleGoogleError = useCallback(() => toast.error('Google Signup Failed'), []);

  // Check if registrations are allowed - AFTER all hooks
  if (!isFeatureEnabled('registration')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-white to-tertiary/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-moringa mb-2">Registration Closed</h2>
          <p className="text-moringa-muted mb-6">
            New user registrations are currently disabled. Please check back later or contact
            support at{' '}
            <a href={`mailto:${settings.supportEmail}`} className="text-primary hover:underline">
              {settings.supportEmail}
            </a>
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Check for uppercase, lowercase, and number
    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    setIsSubmitting(true);
    if (userType === 'business') {
      // Handle business signup - create account AND business profile
      try {
        // Validate business category
        if (!businessCategory) {
          toast.error('Please select a business category');
          return;
        }

        // Validate phone number for business
        if (!phone || phone.length < 10) {
          toast.error('Please enter a valid business phone number');
          return;
        }

        // Format phone number with + prefix if not present
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Parse contact person name - split into first and last name
        const nameParts = contactPerson
          .trim()
          .split(' ')
          .filter((part) => part.length > 0);
        const parsedFirstName = nameParts[0] || contactPerson;
        // Get last name from remaining parts, or use first name if not provided
        let parsedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        // Backend requires min 2 chars for lastName - use firstName if lastName is too short
        if (parsedLastName.length < 2) {
          parsedLastName = parsedFirstName;
        }

        // Validate name lengths
        if (parsedFirstName.length < 2) {
          toast.error('Contact person name must be at least 2 characters');
          return;
        }

        // Check if this category requires verification
        const selectedCategory = BUSINESS_CATEGORIES.find((c) => c.value === businessCategory);
        const requiresVerification = selectedCategory?.requiresVerification || false;

        // Step 1: Register user as business_owner (with consumer role too for dual-role)
        const userData = {
          firstName: parsedFirstName,
          lastName: parsedLastName,
          email,
          password,
          roles: ['consumer', 'business_owner'], // Dual-role: can shop and manage business
        };

        await register(userData);

        // Step 2: Create business profile with selected category
        const businessData = {
          name: businessName,
          type: businessCategory,
          description: requiresVerification
            ? `${businessName} - Pending verification`
            : `${businessName} - ${selectedCategory?.label}`,
          contact: {
            email: email,
            phone: formattedPhone,
          },
          address: {
            street: 'To be updated',
            city: 'To be updated',
            location: {
              type: 'Point',
              coordinates: [30.0619, -1.9403], // Default Kigali coordinates
            },
          },
        };

        // Create the business
        await businessService.createBusiness(businessData);

        // Step 3: Redirect based on verification requirements
        if (requiresVerification) {
          toast.success('Account created! Please complete your business verification.');
          navigate('/business-verification');
        } else {
          toast.success('Account created successfully! You can start listing your products.');
          // Redirect directly to dashboard for non-verification businesses
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Business signup error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error message:', error.response?.data?.message || error.message);

        const errorMessage =
          error.response?.data?.message || error.message || 'Business signup failed';
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Handle buyer signup
      try {
        const userData = {
          firstName,
          lastName,
          email,
          password,
          roles: ['consumer'], // Consumer-only role
          phone: phone || undefined,
          address: address || undefined,
        };

        await register(userData);
        toast.success(
          'Account created! Check your inbox for a verification link - you will need it to log in next time.',
          { duration: 6000 }
        );

        // Redirect buyers directly to shop
        navigate('/shop');
      } catch (error) {
        console.error('Buyer signup error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error message:', error.response?.data?.message || error.message);

        const errorMessage = error.response?.data?.message || error.message || 'Signup failed';
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-fufu">
      <div className="flex w-full">
        {/* Left Side - Brand panel (hidden on mobile) */}
        <div className="w-1/2 hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
          <AuthArt title={['Join', 'the food', 'rescue.']} />
        </div>

        {/* Right Side - Form Container */}
        <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col items-center justify-center px-4 py-8">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/" aria-label="ChopNow home">
              <Logo tone="light" size="lg" />
            </Link>
          </div>

          <div className="bg-white border border-char/10 p-6 sm:p-8 md:p-10 w-full max-w-lg">
            {/* User Type Selection */}
            {!userType ? (
              <div className="flex flex-col">
                <h2
                  className="display text-[56px] text-center text-moringa"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Sign up
                </h2>
                <p
                  className="text-sm mt-3 text-center"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  Choose how you want to sign up
                </p>

                {/* Sign up as Buyer Button */}
                <button
                  type="button"
                  onClick={() => setUserType('buyer')}
                  className="w-full mt-4 bg-fufu border border-solid border-moringa/25 flex items-center justify-center h-14 rounded-lg hover:bg-mint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-moringa/25 flex items-center justify-center mr-3">
                    <PersonStanding className="w-5 h-5" style={{ color: 'var(--color-solid)' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-textColor)' }}>
                    Sign up as Buyer
                  </span>
                </button>

                {/* Sign up as Business Button */}
                <button
                  type="button"
                  onClick={() => setUserType('business')}
                  className="w-full mt-4 bg-fufu border border-solid border-moringa/25 flex items-center justify-center h-14 rounded-lg hover:bg-mint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-moringa/25 flex items-center justify-center mr-3">
                    <Handshake className="w-5 h-5" style={{ color: 'var(--color-solid)' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-textColor)' }}>
                    Sign up as Business
                  </span>
                </button>

                {/* Sign in link */}
                <p
                  className="text-sm mt-8 text-center"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="hover:underline font-medium"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            ) : (
              <form className="flex flex-col" onSubmit={handleSubmit}>
                <div className="relative mb-4">
                  <h2
                    className="display text-[44px] text-center text-moringa"
                    style={{ color: 'var(--color-textColor)' }}
                  >
                    {userType === 'buyer' ? 'Sign up as Buyer' : 'Sign up as Business'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setUserType(null)}
                    className="absolute right-0 top-0 text-sm hover:underline focus-visible:outline-none focus-visible:underline rounded cursor-pointer"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    Back
                  </button>
                </div>
                <p
                  className="text-sm mb-6 text-center"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  {userType === 'buyer'
                    ? 'Create your buyer account'
                    : 'Create your business account'}
                </p>

                {userType === 'buyer' ? (
                  // Buyer Form
                  <>
                    {/* Google Button */}
                    <div className="w-full flex justify-center [&>div]:w-full">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        text="signup_with"
                        shape="rectangular"
                        width="384"
                      />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 w-full my-6">
                      <div className="w-full h-px bg-moringa/20"></div>
                      <p
                        className="text-nowrap text-sm"
                        style={{ color: 'var(--color-moringa-muted)' }}
                      >
                        or sign up with email
                      </p>
                      <div className="w-full h-px bg-moringa/20"></div>
                    </div>

                    {/* First Name & Last Name */}
                    <div className="flex gap-3">
                      <div className="flex items-center flex-1 bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                        <User className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                        <input
                          type="text"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-transparent outline-none text-sm w-full h-full"
                          style={{ color: 'var(--color-textColor)' }}
                          required
                        />
                      </div>
                      <div className="flex items-center flex-1 bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                        <User className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-transparent outline-none text-sm w-full h-full"
                          style={{ color: 'var(--color-textColor)' }}
                          required
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="flex items-center w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 mt-4 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Mail className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="mt-4">
                      <PhoneInput
                        country={'rw'}
                        disableCountryGuess={true}
                        value={phone}
                        onChange={setPhone}
                        enableSearch={true}
                        searchPlaceholder="Search country"
                        placeholder="Choose your country"
                        containerClass="w-full"
                        inputClass="!w-full !h-12 !border-moringa/25 !rounded-lg !text-sm !bg-transparent focus:!ring-2 focus:!ring-solid focus:!border-solid"
                        buttonClass="!border-moringa/25 !rounded-l-lg !bg-transparent !h-12 !hover:bg-fufu"
                        dropdownClass="!text-sm !bg-white !border !border-moringa/25 !rounded-lg !shadow-lg"
                        searchClass="!text-sm !p-2 !border-moringa/25 !m-2 !rounded-md"
                        inputStyle={{ color: 'var(--color-textColor)' }}
                      />
                    </div>

                    {/* Password Input */}
                    <div className="flex items-center mt-4 w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Lock className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="shrink-0 rounded hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all"
                      >
                        {showPassword ? (
                          <EyeOff
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        ) : (
                          <Eye
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />

                    {/* Confirm Password Input */}
                    <div className="flex items-center mt-4 w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Lock className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="shrink-0 rounded hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all"
                      >
                        {showConfirmPassword ? (
                          <EyeOff
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        ) : (
                          <Eye
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        )}
                      </button>
                    </div>

                    {/* Location Section */}
                    <div className="mt-6">
                      <h3
                        className="text-sm font-medium mb-3"
                        style={{ color: 'var(--color-textColor)' }}
                      >
                        Your Location
                      </h3>

                      {/* Use Current Location Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          setIsLoadingLocation(true);
                          getCurrentLocation(
                            async (coords) => {
                              setLocation(coords);
                              try {
                                const result = await reverseGeocode(coords.lat, coords.lng);
                                setAddress(result.display_name || 'Location detected');
                                toast.success('Location detected successfully!');
                              } catch {
                                toast.error('Could not fetch address');
                              }
                              setIsLoadingLocation(false);
                            },
                            (error) => {
                              toast.error(error);
                              setIsLoadingLocation(false);
                            }
                          );
                        }}
                        disabled={isLoadingLocation}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-moringa/25 hover:bg-fufu active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all disabled:opacity-50 disabled:active:scale-100"
                      >
                        <LocateFixed className="w-5 h-5" style={{ color: 'var(--color-solid)' }} />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-textColor)' }}
                        >
                          {isLoadingLocation ? 'Detecting location...' : 'Use my current location'}
                        </span>
                      </button>

                      {/* Manual Address Input */}
                      <div className="mt-3 relative">
                        <div className="flex items-center w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                          <MapPin
                            className="w-5 h-5"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                          <input
                            type="text"
                            placeholder="Or enter address manually"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (manualAddress.trim()) {
                                  try {
                                    const results = await searchAddress(manualAddress);
                                    if (results && results.length > 0) {
                                      const result = results[0];
                                      setLocation({
                                        lat: parseFloat(result.lat),
                                        lng: parseFloat(result.lon),
                                      });
                                      setAddress(result.display_name);
                                      toast.success('Address found!');
                                    } else {
                                      toast.error('Address not found');
                                    }
                                  } catch {
                                    toast.error('Could not search address');
                                  }
                                }
                              }
                            }}
                            className="bg-transparent outline-none text-sm w-full h-full"
                            style={{ color: 'var(--color-textColor)' }}
                          />
                        </div>
                        {manualAddress && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (manualAddress.trim()) {
                                try {
                                  const results = await searchAddress(manualAddress);
                                  if (results && results.length > 0) {
                                    const result = results[0];
                                    setLocation({
                                      lat: parseFloat(result.lat),
                                      lng: parseFloat(result.lon),
                                    });
                                    setAddress(result.display_name);
                                    toast.success('Address found!');
                                  } else {
                                    toast.error('Address not found');
                                  }
                                } catch {
                                  toast.error('Could not search address');
                                }
                              }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs rounded-md text-white hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all"
                            style={{ backgroundColor: 'var(--color-solid)' }}
                          >
                            Search
                          </button>
                        )}
                      </div>

                      {/* Selected Address Display */}
                      {address && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                          Selected: {address}
                        </p>
                      )}

                      {/* Map */}
                      <div className="mt-4">
                        <Suspense
                          fallback={
                            <div className="h-64 w-full rounded-lg bg-fufu animate-pulse" />
                          }
                        >
                          <LocationPicker
                            selectedLocation={location}
                            onLocationSelect={async (latlng) => {
                              setLocation({ lat: latlng.lat, lng: latlng.lng });
                              try {
                                const result = await reverseGeocode(latlng.lat, latlng.lng);
                                setAddress(result.display_name || 'Location selected');
                              } catch {
                                setAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
                              }
                            }}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </>
                ) : (
                  // Business Form
                  <>
                    {/* Business Name */}
                    <div className="flex items-center w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Handshake
                        className="w-5 h-5"
                        style={{ color: 'var(--color-moringa-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Business name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                    </div>

                    {/* Business Category Dropdown */}
                    <div className="mt-4 relative">
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: 'var(--color-moringa-muted)' }}
                      >
                        Business Category
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="flex items-center justify-between w-full bg-transparent border border-moringa/25 h-12 rounded-lg px-4 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-solid transition-all"
                      >
                        {businessCategory ? (
                          <div className="flex items-center gap-3">
                            {(() => {
                              const category = BUSINESS_CATEGORIES.find(
                                (c) => c.value === businessCategory
                              );
                              const IconComponent = category?.icon;
                              return (
                                <>
                                  {IconComponent && (
                                    <IconComponent
                                      className="w-5 h-5"
                                      style={{ color: 'var(--color-solid)' }}
                                    />
                                  )}
                                  <span
                                    className="text-sm"
                                    style={{ color: 'var(--color-textColor)' }}
                                  >
                                    {category?.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
                            Select your business type
                          </span>
                        )}
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--color-moringa-muted)' }}
                        />
                      </button>

                      {showCategoryDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-moringa/25 rounded-lg shadow-lg overflow-hidden">
                          {BUSINESS_CATEGORIES.map((category) => {
                            const IconComponent = category.icon;
                            return (
                              <button
                                key={category.value}
                                type="button"
                                onClick={() => {
                                  setBusinessCategory(category.value);
                                  setShowCategoryDropdown(false);
                                }}
                                className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-fufu focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-solid transition-colors cursor-pointer ${businessCategory === category.value ? 'bg-fufu-dim' : ''}`}
                              >
                                <IconComponent
                                  className="w-5 h-5"
                                  style={{ color: 'var(--color-solid)' }}
                                />
                                <div className="flex-1 text-left">
                                  <p
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--color-textColor)' }}
                                  >
                                    {category.label}
                                  </p>
                                  <p
                                    className="text-xs"
                                    style={{ color: 'var(--color-moringa-muted)' }}
                                  >
                                    {category.description}
                                  </p>
                                </div>
                                {category.requiresVerification && (
                                  <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                                    Verification Required
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Show verification note with required documents for selected category */}
                      {businessCategory && (
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-xs text-orange-700 font-medium mb-1">
                            Document Verification Required
                          </p>
                          <p className="text-xs text-orange-600">
                            {BUSINESS_CATEGORIES.find((c) => c.value === businessCategory)
                              ?.requiredDocs || 'Valid business documents'}
                          </p>
                          <p className="text-xs text-moringa-muted mt-1">
                            You'll need to upload verification documents after registration before
                            you can start selling.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contact Person */}
                    <div className="flex items-center w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 mt-4 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <User className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type="text"
                        placeholder="Contact person"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                    </div>

                    {/* Email Input */}
                    <div className="flex items-center w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 mt-4 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Mail className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                    </div>

                    {/* Business Phone Number */}
                    <div className="mt-4">
                      <PhoneInput
                        country={'rw'}
                        disableCountryGuess={true}
                        value={phone}
                        onChange={setPhone}
                        enableSearch={true}
                        searchPlaceholder="Search country"
                        placeholder="Business phone number"
                        containerClass="w-full"
                        inputClass="!w-full !h-12 !border-moringa/25 !rounded-lg !text-sm !bg-transparent focus:!ring-2 focus:!ring-solid focus:!border-solid"
                        buttonClass="!border-moringa/25 !rounded-l-lg !bg-transparent !h-12 !hover:bg-fufu"
                        dropdownClass="!text-sm !bg-white !border !border-moringa/25 !rounded-lg !shadow-lg"
                        searchClass="!text-sm !p-2 !border-moringa/25 !m-2 !rounded-md"
                        inputStyle={{ color: 'var(--color-textColor)' }}
                      />
                    </div>

                    {/* Password Input */}
                    <div className="flex items-center mt-4 w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Lock className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="shrink-0 rounded hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all"
                      >
                        {showPassword ? (
                          <EyeOff
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        ) : (
                          <Eye
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />

                    {/* Confirm Password Input */}
                    <div className="flex items-center mt-4 w-full bg-transparent border border-moringa/25 h-12 rounded-lg overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                      <Lock className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full h-full"
                        style={{ color: 'var(--color-textColor)' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="shrink-0 rounded hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid transition-all"
                      >
                        {showConfirmPassword ? (
                          <EyeOff
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        ) : (
                          <Eye
                            className="w-5 h-5 cursor-pointer"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          />
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-8 w-full h-11 rounded-lg text-white font-medium hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid focus-visible:ring-offset-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-solid)' }}
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>

                {/* Terms and Privacy */}
                <p
                  className="text-xs mt-4 text-center"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  By creating an account, you agree to our{' '}
                  <Link
                    to="/terms-of-service"
                    className="hover:underline font-medium"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy-policy"
                    className="hover:underline font-medium"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    Privacy Policy
                  </Link>
                </p>

                {/* Sign in link */}
                <p
                  className="text-sm mt-4 text-center"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="hover:underline font-medium"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
