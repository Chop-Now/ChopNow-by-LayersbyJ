import {
  MapPin,
  LocateFixed,
  CloudUpload,
  X,
  BadgeAlert,
  CircleCheck,
  Loader2,
  Tractor,
  Store,
  Croissant,
  UtensilsCrossed,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import LocationPicker from '../Components/maps/LocationPicker';
import { useGeolocation } from '../Components/maps/useGeolocation';
import { reverseGeocode, searchAddress } from '../services/geocoding';
import { businessService } from '../services';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';

const REQUIRED = 'eyebrow text-[10px] bg-peach text-clay px-1.5 py-0.5';

// Document requirements by business category
const CATEGORY_REQUIREMENTS = {
  farmer: {
    label: 'Farmer',
    icon: Tractor,
    requiredDocs: 'Farm registration or land ownership document',
    examples: ['Farm registration certificate', 'Land ownership document', 'Agricultural permit'],
  },
  supermarket: {
    label: 'Supermarket',
    icon: Store,
    requiredDocs: 'Business license and tax registration',
    examples: ['Business license', 'Tax registration certificate', 'Trading license'],
  },
  bakery: {
    label: 'Bakery',
    icon: Croissant,
    requiredDocs: 'Food handling permit and business license',
    examples: ['Food handling permit', 'Business license', 'Health department approval'],
  },
  restaurant: {
    label: 'Restaurant',
    icon: UtensilsCrossed,
    requiredDocs: 'Health certificate and food handling permit',
    examples: ['Health certificate', 'Food handler permit', 'Restaurant operating license'],
  },
};

const BusinessVerification = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState({
    phone: false,
    location: false,
    files: false,
  });
  const { getCurrentLocation } = useGeolocation();

  const [businessId, setBusinessId] = useState(null);
  const [businessType, setBusinessType] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBusiness = async () => {
      // Check if user is authenticated
      if (!user) {
        toast.error('Please log in to access business verification.');
        navigate('/login');
        return;
      }

      try {
        if (user?.business?._id) {
          if (!isMounted) return;
          setBusinessId(user.business._id);
          setBusinessType(user.business.type);
          return;
        }

        const response = await businessService.getMyBusinesses();
        if (!isMounted) return;
        const businesses = response?.businesses || response;

        if (businesses && businesses.length > 0) {
          setBusinessId(businesses[0]._id);
          setBusinessType(businesses[0].type);
        } else {
          // User has no business - show helpful message
          toast.error('Please create a business profile first before verification.');
          setTimeout(() => {
            if (isMounted) navigate('/dashboard');
          }, 2000);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch business', err);

        // Check if it's an authentication error
        if (
          err?.message?.includes('401') ||
          err?.message?.includes('authorized') ||
          err?.message?.includes('token')
        ) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
        } else {
          toast.error('Unable to load business information. Please try again.');
        }
      }
    };

    fetchBusiness();
    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {
      phone: !phone || phone.length < 10,
      location: !location || !address,
      files: uploadedFiles.length === 0,
    };

    setErrors(newErrors);

    // Check if there are any errors
    if (Object.values(newErrors).some((error) => error)) {
      if (newErrors.phone) toast.error('Please enter a valid business phone number');
      if (newErrors.location) toast.error('Please select your business location');
      if (newErrors.files) toast.error('Please upload at least one certificate document');
      return;
    }

    if (!businessId) {
      toast.error('Business profile not found. Please ensure you have created a business.');
      return;
    }

    // Handle form submission
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('location', JSON.stringify(location));

      uploadedFiles.forEach((file) => {
        formData.append('documents', file);
      });

      await businessService.submitVerification(businessId, formData);

      toast.success('Verification submitted! Our team will review your submission.');
      navigate('/pending-review');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
      setErrors((prev) => ({ ...prev, files: false }));
    }
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const requirement = businessType ? CATEGORY_REQUIREMENTS[businessType] : null;
  const RequirementIcon = requirement?.icon;

  const runAddressSearch = async () => {
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
          setErrors((prev) => ({ ...prev, location: false }));
          toast.success('Address found!');
        } else {
          toast.error('Address not found');
        }
      } catch {
        toast.error('Could not search address');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-fufu">
      {/* Left Side - Brand panel (hidden on mobile) */}
      <div className="w-1/2 hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
        <AuthArt eyebrow="Sell your surplus" title={['Get', 'your shop', 'verified.']} />
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col items-center px-4 py-8">
        <div className="mb-8">
          <Link to="/" aria-label="ChopNow home">
            <Logo tone="light" size="lg" />
          </Link>
        </div>

        <div className="w-full max-w-lg">
          {/* Steps */}
          <ol className="grid grid-cols-3 border-2 border-moringa mb-6">
            {['Account', 'Business details', 'Dashboard'].map((step, i) => (
              <li
                key={step}
                className={`h-11 flex items-center justify-center gap-1.5 px-2 text-center eyebrow text-[10px] border-r-2 border-moringa last:border-r-0 ${
                  i === 0
                    ? 'bg-lime text-moringa'
                    : i === 1
                      ? 'bg-moringa text-yellow'
                      : 'bg-white text-moringa-muted'
                }`}
              >
                {i === 0 && <CircleCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                {step}
              </li>
            ))}
          </ol>

          {/* Header */}
          <p className="eyebrow text-moringa-muted">Step 2 of 3</p>
          <h1 className="display text-[48px] sm:text-[64px] text-moringa mt-2">
            Business verification
          </h1>
          <p className="mt-3 text-moringa-muted">
            Just a few more details to get your business live on ChopNow and start selling surplus
            food.
          </p>

          <div className="mt-6 bg-white border border-char/10 p-5 sm:p-8">
            {/* Information Notice */}
            <div className="mb-8 p-4 bg-mint text-moringa rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BadgeAlert className="w-4 h-4" aria-hidden="true" />
                <h3 className="eyebrow text-[11px]">Why we need this information</h3>
              </div>
              <p className="text-sm">
                To ensure the safety of our customers and maintain a trustworthy marketplace we need
                to verify your business's identity and confirm you're authorized to handle food.
                This helps prevent fraud and ensures compliance with local health regulations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <section>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="display text-[28px] text-moringa leading-none">1</span>
                  <h2 className="eyebrow text-moringa">Contact information</h2>
                </div>
                <label className="flex items-center gap-2 eyebrow text-[11px] text-moringa-muted mb-2">
                  Business phone number
                  {errors.phone && <span className={REQUIRED}>Required</span>}
                </label>
                <PhoneInput
                  country={'rw'}
                  disableCountryGuess={true}
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    if (value && value.length >= 10) {
                      setErrors((prev) => ({ ...prev, phone: false }));
                    }
                  }}
                  enableSearch={true}
                  searchPlaceholder="Search country"
                  placeholder="Enter phone number"
                  containerClass="w-full"
                  inputClass={`!w-full !h-12 !border-2 !rounded-none !text-sm !font-medium !bg-white ${errors.phone ? '!border-clay' : '!border-moringa'}`}
                  buttonClass={`!border-2 !rounded-none !bg-white !h-12 hover:!bg-mint ${errors.phone ? '!border-clay' : '!border-moringa'}`}
                  dropdownClass="!text-sm !bg-white !border !border-moringa !rounded-none !shadow-none"
                  searchClass="!text-sm !p-2 !border-moringa !m-2 !rounded-none"
                  inputStyle={{ color: 'var(--color-moringa)' }}
                />
              </section>

              {/* Business Location */}
              <section>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="display text-[28px] text-moringa leading-none">2</span>
                  <h2 className="eyebrow text-moringa">Business location</h2>
                  {errors.location && <span className={REQUIRED}>Required</span>}
                </div>

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
                          setErrors((prev) => ({ ...prev, location: false }));
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
                  className={`w-full flex items-center justify-center gap-2 h-12 border-2 text-sm font-bold text-moringa hover:bg-mint transition-colors disabled:opacity-50 cursor-pointer mb-3 ${errors.location ? 'border-clay' : 'border-moringa'}`}
                >
                  <LocateFixed className="w-5 h-5" aria-hidden="true" />
                  {isLoadingLocation ? 'Detecting location...' : 'Use my current location'}
                </button>

                {/* Manual Address Input */}
                <div
                  className={`flex items-center w-full bg-white border-2 h-12 mb-3 ${errors.location ? 'border-clay' : 'border-moringa'}`}
                >
                  <MapPin className="w-5 h-5 text-moringa mx-3 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Or enter address manually"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        await runAddressSearch();
                      }
                    }}
                    className="bg-transparent outline-none text-sm font-medium text-moringa placeholder:text-moringa-muted/70 w-full h-full min-w-0"
                  />
                  {manualAddress && (
                    <button
                      type="button"
                      onClick={runAddressSearch}
                      className="h-full px-4 bg-moringa text-fufu text-xs font-bold hover:bg-moringa-dark transition-colors cursor-pointer shrink-0"
                    >
                      Search
                    </button>
                  )}
                </div>

                {/* Selected Address Display */}
                {address && (
                  <p className="mb-3 text-xs text-moringa">
                    <span className="eyebrow text-[10px] text-moringa-muted mr-1">Selected</span>
                    {address}
                  </p>
                )}

                {/* Map */}
                <div className="border-2 border-moringa">
                  <LocationPicker
                    selectedLocation={location}
                    onLocationSelect={async (latlng) => {
                      setLocation({ lat: latlng.lat, lng: latlng.lng });
                      setErrors((prev) => ({ ...prev, location: false }));
                      try {
                        const result = await reverseGeocode(latlng.lat, latlng.lng);
                        setAddress(result.display_name || 'Location selected');
                      } catch {
                        setAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
                      }
                    }}
                  />
                </div>
              </section>

              {/* Certification */}
              <section>
                <div className="flex flex-wrap items-baseline gap-3 mb-4">
                  <span className="display text-[28px] text-moringa leading-none">3</span>
                  <h2 className="eyebrow text-moringa">Certification</h2>
                  {errors.files && (
                    <span className={REQUIRED}>Upload at least one certificate</span>
                  )}
                </div>

                {/* Category-specific requirements */}
                {requirement && (
                  <div className="mb-4 p-4 bg-yellow text-moringa rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {RequirementIcon && (
                        <RequirementIcon className="w-5 h-5" aria-hidden="true" />
                      )}
                      <h4 className="font-bold text-sm">Required for {requirement.label}</h4>
                    </div>
                    <p className="text-sm mb-2">{requirement.requiredDocs}</p>
                    <p className="eyebrow text-[10px] mb-1">Accepted documents</p>
                    <ul className="text-sm space-y-0.5">
                      {requirement.examples.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-moringa shrink-0"></span>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-moringa-muted mb-4">
                  {requirement
                    ? `Please upload ${requirement.requiredDocs.toLowerCase()}. This document is required for verification.`
                    : 'Please upload a valid business document or certificate. This document is required for verification.'}
                </p>

                {/* File Upload Area */}
                <label
                  htmlFor="fileInput"
                  className={`border-2 border-dashed bg-fufu p-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-mint transition-colors ${errors.files ? 'border-clay' : 'border-moringa'}`}
                >
                  <CloudUpload className="w-10 h-10 text-moringa" aria-hidden="true" />
                  <p className="text-sm font-bold text-moringa">Drag and drop your files here</p>
                  <p className="text-xs text-moringa-muted">
                    Or <span className="underline underline-offset-2 text-moringa">click</span> to
                    upload
                  </p>
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                </label>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <ul className="mt-3 border border-char/10">
                    {uploadedFiles.map((file, index) => (
                      <li
                        key={index}
                        className="p-3 flex items-center justify-between gap-3 border-b border-hairline last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-lime flex items-center justify-center shrink-0">
                            <CloudUpload className="w-4 h-4 text-moringa" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-moringa truncate">{file.name}</p>
                            <p className="font-mono text-[11px] text-moringa-muted">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="h-9 w-9 flex items-center justify-center text-moringa-muted hover:text-clay hover:bg-peach transition-colors cursor-pointer shrink-0"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* File Upload Notice */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-moringa-muted">
                  <p className="flex items-center gap-1">
                    <CircleCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Accepted formats: PDF, JPG, PNG
                  </p>
                  <p className="flex items-center gap-1">
                    <CircleCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Maximum file size: 10 MB
                  </p>
                </div>
              </section>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for verification'
                  )}
                </button>
                <p className="text-xs text-center mt-3 text-moringa-muted">
                  Our team will review your submission within 1 to 3 business days.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessVerification;
