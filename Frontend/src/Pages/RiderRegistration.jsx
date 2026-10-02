import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bike,
  Car,
  Loader2,
  Info,
  CheckCircle2,
  Upload,
  FileText,
  Clock,
  RefreshCw,
  X,
  File,
  AlertCircle,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAppContext } from '../context/AppContext';
import userService from '../services/userService';
import toast from 'react-hot-toast';
import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';

const LABEL = 'block eyebrow text-[11px] text-moringa-muted mb-2';
const INPUT =
  'w-full h-12 px-3 bg-white border-2 border-moringa text-sm font-medium text-moringa placeholder:text-moringa-muted/70 focus:outline-none focus:bg-fufu';

const VEHICLES = [
  { key: 'bicycle', label: 'Bicycle', icon: Bike, description: 'Best for short urban trips' },
  {
    key: 'motorcycle',
    label: 'Motorcycle',
    icon: Bike,
    description: 'Fastest for standard delivery',
  },
  { key: 'car', label: 'Car', icon: Car, description: 'Ideal for bulk orders/weather' },
  { key: 'walking', label: 'Walking', icon: Bike, description: 'Eco-friendly hyper-local' },
];

const RiderRegistration = () => {
  const navigate = useNavigate();
  const { user, refreshUser, switchRole } = useAppContext();

  const [phone, setPhone] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('bicycle');
  const [nationalId, setNationalId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      toast.error('Please login to register as a rider.');
      navigate('/login');
      return;
    }
    if (user.phone) {
      setPhone(user.phone);
    }
    if (user.riderDetails) {
      setPhone(user.riderDetails.phone || user.phone || '');
      setSelectedVehicle(user.riderDetails.vehicleType || 'bicycle');
      setNationalId(user.riderDetails.nationalId || '');
      setLicensePlate(user.riderDetails.licensePlate || '');
    }
  }, [user, navigate]);

  // Handle Switch to Rider Mode directly if already approved
  const handleSwitchToRider = async () => {
    try {
      await switchRole('rider');
      toast.success('Switched to Rider Mode');
      navigate('/rider-dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to switch to Rider Mode.');
    }
  };

  const handleFileChange = (e, setFile, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(file);
    setErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    const newErrors = {};
    if (!phone || phone.length < 10) newErrors.phone = 'Valid phone number is required';
    if (!nationalId.trim()) newErrors.nationalId = 'National ID is required for verification';
    if (['motorcycle', 'car'].includes(selectedVehicle) && !licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required for motor vehicles';
    }
    if (!vehiclePhoto) newErrors.vehiclePhoto = 'Vehicle photo or proof is required';
    if (!nationalIdPhoto) newErrors.nationalIdPhoto = 'National ID or Passport photo is required';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('vehicleType', selectedVehicle);
      formData.append('nationalId', nationalId);
      if (['motorcycle', 'car'].includes(selectedVehicle)) {
        formData.append('licensePlate', licensePlate);
      }
      formData.append('vehiclePhoto', vehiclePhoto);
      formData.append('nationalIdPhoto', nationalIdPhoto);

      await userService.applyRider(formData);
      await refreshUser();
      toast.success('Rider application submitted successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit application. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFilePreview = (file, setFile, label) => {
    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    return (
      <div className="mt-2 p-3 bg-white border border-char/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isImage ? (
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              className="w-10 h-10 object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-lime text-moringa flex items-center justify-center shrink-0">
              {file.name.endsWith('.pdf') ? (
                <FileText className="w-5 h-5" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-moringa truncate">{file.name}</p>
            <p className="font-mono text-[11px] text-moringa-muted">{fileSizeMB} MB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFile(null)}
          className="h-9 w-9 flex items-center justify-center text-moringa-muted hover:text-clay hover:bg-peach transition-colors cursor-pointer shrink-0"
          aria-label={`Remove ${label}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderUploadBox = (hasError, onChange) => (
    <div
      className={`border-2 border-dashed ${hasError ? 'border-clay bg-peach/40' : 'border-moringa bg-fufu'} p-6 text-center hover:bg-mint transition-colors relative overflow-hidden`}
    >
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.txt"
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-11 h-11 bg-moringa text-yellow flex items-center justify-center">
          <Upload className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-moringa">Click to upload document</p>
        <p className="text-[11px] text-moringa-muted">PNG, JPG, PDF, DOCX or TXT (Max 5MB)</p>
      </div>
    </div>
  );

  const showPlateField = ['motorcycle', 'car'].includes(selectedVehicle);

  const shell = (children, art) => (
    <div className="min-h-screen w-full flex bg-fufu">
      {/* Left Side - Brand panel (hidden on mobile) */}
      <div className="w-1/2 hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">{art}</div>
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col items-center px-4 py-8">
        <div className="mb-8">
          <Link to="/" aria-label="ChopNow home">
            <Logo tone="light" size="lg" />
          </Link>
        </div>
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );

  // Status screens mapping
  if (user?.riderStatus === 'approved') {
    return shell(
      <div className="bg-lime text-moringa p-6 sm:p-8">
        <div className="w-14 h-14 bg-moringa text-lime flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
        </div>
        <p className="eyebrow mt-6">Approved</p>
        <h2 className="display text-[44px] sm:text-[56px] mt-2 leading-[0.92]">
          Application approved
        </h2>
        <p className="mt-3 font-medium">
          Your rider application has been approved by the admin. You are now ready to start
          delivering!
        </p>
        <button
          onClick={handleSwitchToRider}
          className="mt-6 w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Bike className="w-5 h-5" aria-hidden="true" />
          Go to rider dashboard
        </button>
      </div>,
      <AuthArt eyebrow="Rider" title={['Ready', 'to', 'ride.']} />
    );
  }

  if (user?.riderStatus === 'pending') {
    return shell(
      <>
        <div className="bg-yellow text-moringa p-6 sm:p-8">
          <div className="w-14 h-14 bg-moringa text-yellow flex items-center justify-center">
            <Clock className="w-7 h-7 animate-pulse" aria-hidden="true" />
          </div>
          <p className="eyebrow mt-6">We are verifying your credentials</p>
          <h2 className="display text-[44px] sm:text-[56px] mt-2 leading-[0.92]">
            Application pending review
          </h2>
          <p className="mt-3 font-medium">
            Thank you for applying to become a ChopNow Rider! Our admin team is currently reviewing
            your documents and vehicle details.
          </p>
        </div>
        <div className="bg-white border border-char/10 p-5 sm:p-6">
          <p className="eyebrow text-moringa mb-3">What happens next?</p>
          <ul className="space-y-2 text-sm text-moringa">
            {[
              'We verify your National ID and Vehicle Photo.',
              'Approval usually takes between 12 to 24 hours.',
              "Once approved, you'll be able to switch to Rider mode and accept orders!",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="w-1.5 h-1.5 bg-moringa shrink-0 mt-2"></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={async () => {
            const toastId = toast.loading('Refreshing application status...');
            try {
              await refreshUser();
              toast.success('Status updated!', { id: toastId });
            } catch {
              toast.error('Failed to update status.', { id: toastId });
            }
          }}
          className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Refresh status
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-4 eyebrow text-[11px] text-moringa underline underline-offset-4 block mx-auto cursor-pointer"
        >
          Back to home
        </button>
      </>,
      <AuthArt eyebrow="Rider application" title={['Hang', 'tight,', "we're on it."]} />
    );
  }

  return shell(
    <>
      {/* Steps */}
      <ol className="grid grid-cols-3 border-2 border-moringa mb-6">
        {['Account', 'Rider signup', 'Verification'].map((step, i) => (
          <li
            key={step}
            className={`h-11 flex items-center justify-center gap-1.5 px-2 text-center eyebrow text-[10px] border-r-2 border-moringa last:border-r-0 ${
              i === 0
                ? 'bg-lime text-moringa cursor-pointer'
                : i === 1
                  ? 'bg-moringa text-yellow'
                  : 'bg-white text-moringa-muted'
            }`}
            onClick={i === 0 ? () => navigate('/') : undefined}
          >
            {i === 0 && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            {step}
          </li>
        ))}
      </ol>

      {/* Header Section */}
      <p className="eyebrow text-moringa-muted">Delivery partner signup</p>
      <h1 className="display text-[48px] sm:text-[64px] text-moringa mt-2 leading-[0.92]">
        Become a ChopNow rider
      </h1>
      <p className="mt-3 text-moringa-muted">
        Earn on your own terms by delivering delicious, rescued food from local vendors to buyers.
      </p>

      {/* Upper Hero Banner */}
      <div className="mt-6 bg-moringa text-fufu p-6">
        <p className="eyebrow text-yellow">Flexible work, solid payouts</p>
        <p className="text-sm mt-2 leading-relaxed opacity-90">
          As a ChopNow Rider, you help reduce food waste in your community while earning competitive
          fees. Use your bike, motorcycle, car, or simply walk to complete local deliveries.
        </p>
      </div>

      <div className="bg-white border border-char/10 p-5 sm:p-8">
        {/* Rejection Alert Box */}
        {user?.riderStatus === 'rejected' && (
          <div className="mb-6 p-4 bg-peach text-clay flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="eyebrow text-[11px]">Application rejected</h3>
              <p className="text-sm mt-1 leading-relaxed">
                Reason:{' '}
                <span className="font-bold">
                  {user.riderDetails?.rejectedReason || 'No reason provided.'}
                </span>
              </p>
              <p className="text-sm mt-1">
                Please correct the information or upload clearer documents and re-apply.
              </p>
            </div>
          </div>
        )}

        {/* Info Alert Box */}
        <div className="mb-8 p-4 bg-mint text-moringa flex gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="eyebrow text-[11px]">Verification process</h3>
            <p className="text-sm mt-1 leading-relaxed">
              We verify all rider credentials to ensure safety. Submit your details along with
              verification photos below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Vehicle Type Selection */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="display text-[28px] text-moringa leading-none">1</span>
              <h2 className="eyebrow text-moringa">How will you deliver?</h2>
            </div>
            <div className="grid grid-cols-2 border-2 border-moringa">
              {VEHICLES.map((vehicle, i) => {
                const isSelected = selectedVehicle === vehicle.key;
                const IconComponent = vehicle.icon;
                return (
                  <button
                    key={vehicle.key}
                    type="button"
                    onClick={() => setSelectedVehicle(vehicle.key)}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-start gap-2 p-4 text-left transition-colors cursor-pointer border-moringa ${
                      i % 2 === 0 ? 'border-r-2' : ''
                    } ${i < 2 ? 'border-b-2' : ''} ${
                      isSelected ? 'bg-moringa text-fufu' : 'bg-white text-moringa hover:bg-mint'
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${isSelected ? 'text-yellow' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm font-bold">{vehicle.label}</span>
                      <span
                        className={`block text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-moringa-muted'}`}
                      >
                        {vehicle.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Form Fields */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="display text-[28px] text-moringa leading-none">2</span>
              <h2 className="eyebrow text-moringa">Your details</h2>
            </div>
            <div>
              <label className={LABEL}>Mobile phone number</label>
              <PhoneInput
                country={'rw'}
                disableCountryGuess={true}
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  if (val.length >= 10) {
                    setErrors((prev) => ({ ...prev, phone: null }));
                  }
                }}
                containerClass="w-full"
                inputClass={`!w-full !h-12 !border-2 !rounded-none !text-sm !font-medium !bg-white ${errors.phone ? '!border-clay' : '!border-moringa'}`}
                buttonClass={`!border-2 !rounded-none !bg-white hover:!bg-mint ${errors.phone ? '!border-clay' : '!border-moringa'}`}
                inputStyle={{ color: 'var(--color-moringa)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>National ID or passport no.</label>
                <input
                  type="text"
                  placeholder="e.g. 11990800..."
                  value={nationalId}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    setErrors((prev) => ({ ...prev, nationalId: null }));
                  }}
                  className={`${INPUT} ${errors.nationalId ? '!border-clay' : ''}`}
                />
              </div>

              {showPlateField && (
                <div>
                  <label className={LABEL}>Vehicle license plate</label>
                  <input
                    type="text"
                    placeholder="e.g. RA 123 A"
                    value={licensePlate}
                    onChange={(e) => {
                      setLicensePlate(e.target.value);
                      setErrors((prev) => ({ ...prev, licensePlate: null }));
                    }}
                    className={`${INPUT} ${errors.licensePlate ? '!border-clay' : ''}`}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Upload Section */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="display text-[28px] text-moringa leading-none">3</span>
              <h2 className="eyebrow text-moringa">Documents</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* National ID Photo */}
              <div>
                <label className={`${LABEL} sm:min-h-[34px]`}>National ID or passport copy</label>
                {renderUploadBox(errors.nationalIdPhoto, (e) =>
                  handleFileChange(e, setNationalIdPhoto, 'nationalIdPhoto')
                )}
                {renderFilePreview(nationalIdPhoto, setNationalIdPhoto, 'National ID')}
              </div>

              {/* Vehicle Photo */}
              <div>
                <label className={`${LABEL} sm:min-h-[34px]`}>
                  Vehicle photo or ownership proof
                </label>
                {renderUploadBox(errors.vehiclePhoto, (e) =>
                  handleFileChange(e, setVehiclePhoto, 'vehiclePhoto')
                )}
                {renderFilePreview(vehiclePhoto, setVehiclePhoto, 'Vehicle Photo')}
              </div>
            </div>
          </section>

          {/* Agreement */}
          <div className={`flex items-start gap-3 p-4 ${errors.terms ? 'bg-peach' : 'bg-fufu'}`}>
            <input
              id="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 mt-0.5 accent-[#0F3D2E] cursor-pointer shrink-0"
            />
            <div className="text-sm">
              <label htmlFor="terms" className="font-bold text-moringa cursor-pointer">
                I agree to the ChopNow Rider Terms of Service and Code of Conduct.
              </label>
              <p className="text-moringa-muted mt-1 leading-relaxed text-xs">
                I certify that I am legally authorized to work, have any necessary licenses, and
                will comply with food safety standards.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading documents and submitting...
                </>
              ) : (
                'Submit application'
              )}
            </button>
            <p className="text-xs text-center text-moringa-muted mt-3">
              Applications are manually reviewed by admins. We will notify you once review is
              complete.
            </p>
          </div>
        </form>
      </div>
    </>,
    <AuthArt eyebrow="Deliver and earn" title={['Ride', 'with', 'ChopNow.']} />
  );
};

export default RiderRegistration;
