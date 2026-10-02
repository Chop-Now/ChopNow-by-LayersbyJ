import {
  MapPin,
  LocateFixed,
  CloudUpload,
  X,
  ChevronRight,
  BadgeAlert,
  CircleCheck,
  Loader2,
  Tractor,
  Store,
  Croissant,
  UtensilsCrossed,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import LocationPicker from '../Components/maps/LocationPicker';
import { useGeolocation } from '../Components/maps/useGeolocation';
import { reverseGeocode, searchAddress } from '../services/geocoding';
import { businessService } from '../services';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

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

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div
          className="flex items-center justify-center space-x-4 text-xs mb-8"
          style={{ color: 'var(--color-moringa-muted)' }}
        >
          <p className="text-green-600 font-medium">Account creation</p>
          <ChevronRight className="w-3 h-3" />
          <p style={{ color: 'var(--color-textColor)' }} className="font-medium">
            Business details
          </p>
          <ChevronRight className="w-3 h-3" />
          <p>Dashboard</p>
        </div>

        {/* Header - Outside container */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-textColor)' }}>
            Business Verification
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
            Just a few more details to get your business live on ChopNow and start selling surplus
            food.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
          {/* Information Notice */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BadgeAlert className="w-4 h-4" style={{ color: 'var(--color-textColor)' }} />
              <h3 className="font-semibold text-xs" style={{ color: 'var(--color-textColor)' }}>
                Why we need this information
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
              To ensure the safety of our customers and maintain a trustworthy marketplace we need
              to verify your business's identity and confirm you're authorized to handle food. This
              helps prevent fraud and ensures compliance with local health regulations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3
                className="text-base font-medium mb-3"
                style={{ color: 'var(--color-textColor)' }}
              >
                Contact Information
              </h3>
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Business Phone Number{' '}
                  {errors.phone && <span className="text-red-500 text-[10px]">*Required</span>}
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
                  inputClass={`!w-full !h-12 !rounded-lg !text-sm !bg-transparent ${errors.phone ? '!border-red-500' : '!border-gray-300'}`}
                  buttonClass={`!rounded-l-lg !bg-transparent !h-12 !hover:bg-gray-100 ${errors.phone ? '!border-red-500' : '!border-gray-300'}`}
                  dropdownClass="!text-sm !bg-white !border !border-gray-300 !rounded-lg !shadow-lg"
                  searchClass="!text-sm !p-2 !border-gray-300 !m-2 !rounded-md"
                  inputStyle={{ color: 'var(--color-textColor)' }}
                />
              </div>
            </div>

            {/* Business Location */}
            <div>
              <h3
                className="text-base font-medium mb-3"
                style={{ color: 'var(--color-textColor)' }}
              >
                Business Location{' '}
                {errors.location && <span className="text-red-500 text-[10px]">*Required</span>}
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
                className={`w-full flex items-center justify-center gap-2 h-12 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50 mb-3 ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
              >
                <LocateFixed className="w-5 h-5" style={{ color: 'var(--color-solid)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-textColor)' }}>
                  {isLoadingLocation ? 'Detecting location...' : 'Use my current location'}
                </span>
              </button>

              {/* Manual Address Input */}
              <div className="relative mb-3">
                <div
                  className={`flex items-center w-full bg-transparent border h-12 rounded-lg overflow-hidden px-4 gap-3 ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <MapPin className="w-5 h-5" style={{ color: 'var(--color-moringa-muted)' }} />
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
                              setErrors((prev) => ({ ...prev, location: false }));
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
                            setErrors((prev) => ({ ...prev, location: false }));
                            toast.success('Address found!');
                          } else {
                            toast.error('Address not found');
                          }
                        } catch {
                          toast.error('Could not search address');
                        }
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs rounded-md text-white"
                    style={{ backgroundColor: 'var(--color-solid)' }}
                  >
                    Search
                  </button>
                )}
              </div>

              {/* Selected Address Display */}
              {address && (
                <p className="mb-3 text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                  Selected: {address}
                </p>
              )}

              {/* Map */}
              <div>
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
            </div>

            {/* Certification */}
            <div>
              <h3
                className="text-base font-medium mb-3"
                style={{ color: 'var(--color-textColor)' }}
              >
                Certification{' '}
                {errors.files && (
                  <span className="text-red-500 text-[10px]">
                    *Required - Upload at least one certificate
                  </span>
                )}
              </h3>

              {/* Category-specific requirements */}
              {businessType && CATEGORY_REQUIREMENTS[businessType] && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const IconComponent = CATEGORY_REQUIREMENTS[businessType]?.icon;
                      return IconComponent ? (
                        <IconComponent className="w-5 h-5 text-orange-600" />
                      ) : null;
                    })()}
                    <h4 className="text-sm font-semibold text-orange-700">
                      Required for {CATEGORY_REQUIREMENTS[businessType].label}
                    </h4>
                  </div>
                  <p className="text-xs text-orange-600 mb-2">
                    {CATEGORY_REQUIREMENTS[businessType].requiredDocs}
                  </p>
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Accepted documents:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {CATEGORY_REQUIREMENTS[businessType].examples.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-textColor)' }}>
                Upload Verification Documents
              </h4>
              <p className="text-xs mb-4" style={{ color: 'var(--color-moringa-muted)' }}>
                {businessType && CATEGORY_REQUIREMENTS[businessType]
                  ? `Please upload ${CATEGORY_REQUIREMENTS[businessType].requiredDocs.toLowerCase()}. This document is required for verification.`
                  : 'Please upload a valid business document or certificate. This document is required for verification.'}
              </p>

              {/* File Upload Area */}
              <label
                htmlFor="fileInput"
                className={`border-2 border-dashed bg-white rounded-lg text-xs p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-500 transition-colors ${errors.files ? 'border-red-500' : 'border-indigo-600/60'}`}
              >
                <CloudUpload className="w-10 h-10" style={{ color: 'var(--color-solid)' }} />
                <p style={{ color: 'var(--color-moringa-muted)' }}>Drag & drop your files here</p>
                <p className="text-gray-400 text-xs">
                  Or{' '}
                  <span className="underline" style={{ color: 'var(--color-solid)' }}>
                    click
                  </span>{' '}
                  to upload
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
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="border border-gray-300 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                          <CloudUpload
                            className="w-4 h-4"
                            style={{ color: 'var(--color-solid)' }}
                          />
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--color-textColor)' }}
                          >
                            {file.name}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: 'var(--color-moringa-muted)' }}
                          >
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File Upload Notice */}
              <div
                className="mt-3 text-[10px] space-y-1"
                style={{ color: 'var(--color-moringa-muted)' }}
              >
                <div className="flex items-center gap-1">
                  <CircleCheck className="w-3 h-3" />
                  <p>Accepted formats: PDF, JPG, PNG</p>
                </div>
                <div className="flex items-center gap-1">
                  <CircleCheck className="w-3 h-3" />
                  <p>Maximum file size: 10 MB</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-solid)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Verification'
                )}
              </button>
              <p
                className="text-[10px] text-center mt-3"
                style={{ color: 'var(--color-moringa-muted)' }}
              >
                Our team will review your submission within 1-3 business days.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessVerification;
