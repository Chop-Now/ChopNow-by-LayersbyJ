import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  Car,
  Loader2,
  Info,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
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
      toast.success('Switched to Rider Mode 🚴');
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
      toast.success('Rider application submitted successfully! 🚴');
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
      <div className="mt-3 p-3 bg-fufu border border-hairline rounded-xl flex items-center justify-between gap-4 transition-all animate-fadeIn">
        <div className="flex items-center gap-3 min-w-0">
          {isImage ? (
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              className="w-10 h-10 object-cover rounded-lg border border-hairline shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center shrink-0">
              {file.name.endsWith('.pdf') ? (
                <FileText className="w-5 h-5" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-moringa truncate">{file.name}</p>
            <p className="text-[10px] text-moringa-muted/70 font-medium">{fileSizeMB} MB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFile(null)}
          className="p-1 hover:bg-mint rounded-lg text-moringa-muted/70 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const showPlateField = ['motorcycle', 'car'].includes(selectedVehicle);

  // Status screens mapping
  if (user?.riderStatus === 'approved') {
    return (
      <div className="min-h-screen bg-fufu py-12 px-4 sm:px-6 lg:px-8 mt-16 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-hairline shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-moringa mb-2">Application Approved!</h2>
          <p className="text-sm text-moringa-muted mb-6">
            Your rider application has been approved by the admin. You are now ready to start
            delivering!
          </p>
          <button
            onClick={handleSwitchToRider}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Rider Dashboard 🚴
          </button>
        </div>
      </div>
    );
  }

  if (user?.riderStatus === 'pending') {
    return (
      <div className="min-h-screen bg-fufu py-12 px-4 sm:px-6 lg:px-8 mt-16 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-hairline shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-white text-center">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold">Application Pending Review</h2>
            <p className="text-xs text-amber-100 mt-1">
              We are currently verifying your credentials
            </p>
          </div>
          <div className="p-8 text-center space-y-6">
            <p className="text-sm text-moringa-muted leading-relaxed">
              Thank you for applying to become a ChopNow Rider! Our admin team is currently
              reviewing your documents and vehicle details.
            </p>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800 space-y-2">
              <p className="font-semibold">What happens next?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>We verify your National ID and Vehicle Photo.</li>
                <li>Approval usually takes between 12 to 24 hours.</li>
                <li>Once approved, you'll be able to switch to Rider mode and accept orders!</li>
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
              className="w-full py-2.5 px-4 bg-fufu-dim hover:bg-mint text-moringa rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border border-hairline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-moringa-muted/70 hover:text-slate-600 underline font-medium block mx-auto"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fufu py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-center space-x-2 text-xs text-moringa-muted/70 mb-6">
          <span className="text-green-600 font-medium cursor-pointer" onClick={() => navigate('/')}>
            ChopNow Account
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-moringa font-medium">Delivery Partner Signup</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Verification</span>
        </div>

        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-moringa tracking-tight">
            Become a ChopNow Rider
          </h1>
          <p className="mt-2 text-sm text-moringa-muted max-w-md mx-auto">
            Earn on your own terms by delivering delicious, rescued food from local vendors to
            buyers.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-hairline shadow-xl overflow-hidden">
          {/* Upper Hero Banner Card */}
          <div className="bg-gradient-to-br from-green-700 via-green-800 to-emerald-950 p-8 text-white">
            <h2 className="text-xl font-bold mb-2">Flexible Work, Solid Payouts 💸</h2>
            <p className="text-xs text-green-100 leading-relaxed max-w-xl">
              As a ChopNow Rider, you help reduce food waste in your community while earning
              competitive fees. Use your bike, motorcycle, car, or simply walk to complete local
              deliveries.
            </p>
          </div>

          <div className="p-8 sm:p-10">
            {/* Rejection Alert Box */}
            {user?.riderStatus === 'rejected' && (
              <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-xs text-rose-800">Application Rejected</h3>
                  <p className="text-xs text-rose-600/90 mt-1 leading-relaxed">
                    Reason:{' '}
                    <span className="font-medium text-rose-900">
                      {user.riderDetails?.rejectedReason || 'No reason provided.'}
                    </span>
                  </p>
                  <p className="text-xs text-rose-600/70 mt-1">
                    Please correct the information or upload clearer documents and re-apply.
                  </p>
                </div>
              </div>
            )}

            {/* Info Alert Box */}
            <div className="mb-8 p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-xs text-blue-800">Verification Process</h3>
                <p className="text-xs text-blue-600/90 mt-1 leading-relaxed">
                  We verify all rider credentials to ensure safety. Submit your details along with
                  verification photos below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Vehicle Type Selection */}
              <div>
                <label className="block text-sm font-bold text-moringa mb-3">
                  How will you deliver?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {VEHICLES.map((vehicle) => {
                    const isSelected = selectedVehicle === vehicle.key;
                    const IconComponent = vehicle.icon;
                    return (
                      <button
                        key={vehicle.key}
                        type="button"
                        onClick={() => setSelectedVehicle(vehicle.key)}
                        className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-green-50/50 border-green-600 ring-2 ring-green-600/20'
                            : 'bg-white border-hairline hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`p-2.5 rounded-lg ${isSelected ? 'bg-green-100 text-green-700' : 'bg-fufu text-moringa-muted'}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-bold ${isSelected ? 'text-green-900' : 'text-moringa'}`}
                          >
                            {vehicle.label}
                          </p>
                          <p className="text-[11px] text-moringa-muted/70 mt-0.5">
                            {vehicle.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-moringa mb-2">
                    Mobile Phone Number
                  </label>
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
                    inputClass="!w-full !h-11 !rounded-xl !border-hairline !text-sm focus:!ring-2 focus:!ring-green-500/20 focus:!border-green-600"
                    buttonClass="!bg-fufu !border-hairline !rounded-l-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-moringa mb-2">
                      National ID or Passport No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 11990800..."
                      value={nationalId}
                      onChange={(e) => {
                        setNationalId(e.target.value);
                        setErrors((prev) => ({ ...prev, nationalId: null }));
                      }}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-hairline rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
                    />
                  </div>

                  {showPlateField && (
                    <div>
                      <label className="block text-xs font-bold text-moringa mb-2">
                        Vehicle License Plate
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RA 123 A"
                        value={licensePlate}
                        onChange={(e) => {
                          setLicensePlate(e.target.value);
                          setErrors((prev) => ({ ...prev, licensePlate: null }));
                        }}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-hairline rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* National ID Photo */}
                  <div>
                    <label className="block text-xs font-bold text-moringa mb-2">
                      National ID or Passport Copy
                    </label>
                    <div
                      className={`border-2 border-dashed ${errors.nationalIdPhoto ? 'border-rose-300 bg-rose-50/20' : 'border-hairline bg-slate-50/50'} rounded-xl p-6 text-center hover:border-green-500 hover:bg-green-50/10 transition-all relative overflow-hidden group`}
                    >
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.txt"
                        onChange={(e) => handleFileChange(e, setNationalIdPhoto, 'nationalIdPhoto')}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-white border border-hairline rounded-xl text-moringa-muted/70 group-hover:text-green-600 transition-colors shadow-sm">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-moringa">
                          Click to upload document
                        </p>
                        <p className="text-[10px] text-moringa-muted/70 font-medium">
                          PNG, JPG, PDF, DOCX or TXT (Max 5MB)
                        </p>
                      </div>
                    </div>
                    {renderFilePreview(nationalIdPhoto, setNationalIdPhoto, 'National ID')}
                  </div>

                  {/* Vehicle Photo */}
                  <div>
                    <label className="block text-xs font-bold text-moringa mb-2">
                      Vehicle Photo or Ownership Proof
                    </label>
                    <div
                      className={`border-2 border-dashed ${errors.vehiclePhoto ? 'border-rose-300 bg-rose-50/20' : 'border-hairline bg-slate-50/50'} rounded-xl p-6 text-center hover:border-green-500 hover:bg-green-50/10 transition-all relative overflow-hidden group`}
                    >
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.txt"
                        onChange={(e) => handleFileChange(e, setVehiclePhoto, 'vehiclePhoto')}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-white border border-hairline rounded-xl text-moringa-muted/70 group-hover:text-green-600 transition-colors shadow-sm">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-moringa">
                          Click to upload document
                        </p>
                        <p className="text-[10px] text-moringa-muted/70 font-medium">
                          PNG, JPG, PDF, DOCX or TXT (Max 5MB)
                        </p>
                      </div>
                    </div>
                    {renderFilePreview(vehiclePhoto, setVehiclePhoto, 'Vehicle Photo')}
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="relative flex items-start gap-3 mt-4">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-4 w-4 text-green-600 border-moringa/25 rounded focus:ring-green-500"
                  />
                </div>
                <div className="text-xs">
                  <label htmlFor="terms" className="font-medium text-moringa">
                    I agree to the ChopNow Rider Terms of Service and Code of Conduct.
                  </label>
                  <p className="text-moringa-muted/70 mt-1 leading-relaxed">
                    I certify that I am legally authorized to work, have any necessary licenses, and
                    will comply with food safety standards.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading documents & submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
                <p className="text-[10px] text-center text-moringa-muted/70 mt-3">
                  Applications are manually reviewed by admins. We will notify you once review is
                  complete.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderRegistration;
