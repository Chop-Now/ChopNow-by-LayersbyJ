import React, { useState, useEffect } from 'react';
import { User, Upload, Trash2, MoveLeft, Eye, EyeOff, Loader2, Bike, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { authService } from '../services';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { clearAccessToken } from '../services/api';

const MyProfile = () => {
  const { addBusinessRole, availableRoles } = useAppContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: null,
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch profile on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (!isMounted) return;
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar: data.avatar || null,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle profile save
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updatedData = await authService.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      // Update local storage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          phone: updatedData.phone,
          avatar: updatedData.avatar,
        })
      );
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change. The backend verifies the current password and
  // emails a one-time code before accepting a new password (so a hijacked
  // logged-in session can't silently change the password) - this is a
  // two-step request-OTP-then-confirm flow, not a single-call change.
  const handleRequestPasswordOtp = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.requestPasswordChangeOTP(passwords.currentPassword);
      setPasswordOtpSent(true);
      toast.success('Code sent - check your email');
    } catch (error) {
      console.error('Error requesting password change code:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!passwordOtp) {
      toast.error('Enter the code sent to your email');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePasswordWithOTP(passwordOtp, passwords.newPassword);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordOtp('');
      setPasswordOtpSent(false);
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const response = await authService.uploadAvatar(formData);
      setProfile((prev) => ({ ...prev, avatar: response.avatar }));
      // Update local storage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          avatar: response.avatar,
        })
      );
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      await authService.deleteAccount();
      clearAccessToken();
      localStorage.removeItem('user');
      localStorage.removeItem('cartItems');
      toast.success('Account deleted successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    }
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-80 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-80 min-h-screen">
      <div className="flex w-full">
        {/* Settings Menu - Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-gray-200 p-6 h-screen fixed left-0 top-0 shrink-0 overflow-y-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-textColor transition mb-6 cursor-pointer"
            style={{ color: 'var(--color-textColor)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1B5E20')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-textColor)')}
          >
            <MoveLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Profile Info */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#1B5E20' }}
              >
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-textColor truncate">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-xs text-moringa-muted truncate">{profile.email}</p>
            </div>
          </div>

          {/* Settings Menu */}
          <h2 className="text-xl font-bold text-textColor mb-4">Settings</h2>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-moringa-muted uppercase tracking-wider">
                Personal
              </span>
              <div className="flex flex-col gap-1">
                <button
                  className="text-left px-3 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: '#1B5E20' }}
                >
                  Account
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="w-full lg:w-[calc(100%-18rem)] lg:ml-72 flex flex-col items-center py-12 px-4 lg:px-12">
          <div className="flex w-full max-w-3xl flex-col items-start gap-12">
            {/* Mobile Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="lg:hidden flex items-center gap-2 text-textColor transition cursor-pointer"
              style={{ color: 'var(--color-textColor)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1B5E20')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-textColor)')}
            >
              <MoveLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Header */}
            <div className="flex w-full flex-col items-start gap-1">
              <h1 className="text-3xl font-bold text-textColor">Account</h1>
              <p className="text-sm text-moringa-muted">
                Update your profile and personal details here
              </p>
            </div>

            {/* Account Upgrades Section */}
            {!availableRoles.includes(
              'rider'
            ) /* || !availableRoles.includes('business_owner') */ && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {!availableRoles.includes('rider') && (
                  <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 font-bold">
                        <Bike className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-wider">Deliver & Earn</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">
                        Become a Delivery Partner
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Join the ChopNow delivery fleet. Pick up food on your bicycle, motorcycle,
                        or car and make extra cash on your own schedule.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/rider-verification')}
                      className="w-full mt-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                    >
                      Register as Rider
                    </button>
                  </div>
                )}

                {/* 
                {!availableRoles.includes('business_owner') && (
                  <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <Store className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-wider">Sell Surplus</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">Register as a Vendor</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        List your bakery, cafe, or restaurant surplus meals on ChopNow. Reduce food
                        waste and earn extra revenue on food you would have thrown away.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await addBusinessRole(true);
                          navigate('/dashboard');
                        } catch (error) {
                          console.error('Error adding business role:', error);
                        }
                      }}
                      className="w-full mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                    >
                      Register Business
                    </button>
                  </div>
                )}
                */}
              </div>
            )}

            {/* Profile Section */}
            <div className="flex w-full flex-col items-start gap-6">
              <h3 className="text-xl font-semibold text-textColor">Profile</h3>

              {/* Avatar */}
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-sm font-semibold text-textColor">Avatar</span>
                <div className="flex items-center gap-4">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#1B5E20' }}
                    >
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-textColor hover:bg-gray-200 transition cursor-pointer">
                      {uploadingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingAvatar ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                    <span className="text-xs text-moringa-muted">
                      For best results, upload an image 512x512 or larger.
                    </span>
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="flex w-full items-center gap-4 flex-col sm:flex-row">
                <div className="w-full flex-1">
                  <label className="block text-sm font-medium text-textColor mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={profile.firstName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                    onFocus={(e) => (e.target.style.borderColor = '#1B5E20')}
                    onBlur={(e) => (e.target.style.borderColor = '')}
                  />
                </div>
                <div className="w-full flex-1">
                  <label className="block text-sm font-medium text-textColor mb-2">Last name</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={profile.lastName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                    onFocus={(e) => (e.target.style.borderColor = '#1B5E20')}
                    onBlur={(e) => (e.target.style.borderColor = '')}
                  />
                </div>
              </div>

              {/* Email and Phone Fields */}
              <div className="flex w-full items-start gap-4 flex-col sm:flex-row">
                <div className="w-full flex-1">
                  <label className="block text-sm font-medium text-textColor mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm focus:outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <div className="w-full flex-1">
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Phone number
                  </label>
                  <PhoneInput
                    country={'rw'}
                    disableCountryGuess={true}
                    value={profile.phone}
                    onChange={(phone) => setProfile((prev) => ({ ...prev, phone }))}
                    enableSearch={true}
                    searchPlaceholder="Search country"
                    placeholder="Choose your country"
                    containerClass="w-full"
                    inputClass="!w-full !h-10 !border-gray-300 !rounded-lg !text-sm !bg-white"
                    buttonClass="!border-gray-300 !rounded-l-lg !bg-white !h-10 !hover:bg-gray-100"
                    dropdownClass="!text-sm !bg-white !border !border-gray-300 !rounded-lg !shadow-lg"
                    searchClass="!text-sm !p-2 !border-gray-300 !m-2 !rounded-md"
                    inputStyle={{ color: 'var(--color-textColor)' }}
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: '#1B5E20' }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#0D4A14')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#1B5E20')}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gray-200" />

            {/* Password Section */}
            <div className="flex w-full flex-col items-start gap-6">
              <h3 className="text-xl font-semibold text-textColor">Password</h3>

              <div className="w-full">
                <label className="block text-sm font-medium text-textColor mb-2">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-solid"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    ) : (
                      <Eye className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-textColor mb-2">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-solid"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    ) : (
                      <Eye className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-moringa-muted mt-2">
                  Your password must have at least 8 characters, include one uppercase letter, and
                  one number.
                </p>
              </div>

              <div className="w-full">
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-type new password"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-solid"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    ) : (
                      <Eye className="w-5 h-5 text-moringa-muted cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              {passwordOtpSent && (
                <div className="w-full">
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the code sent to your email"
                    value={passwordOtp}
                    onChange={(e) => setPasswordOtp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-solid"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={passwordOtpSent ? handleConfirmPasswordChange : handleRequestPasswordOtp}
                  disabled={
                    changingPassword ||
                    !passwords.currentPassword ||
                    !passwords.newPassword ||
                    !passwords.confirmPassword ||
                    (passwordOtpSent && !passwordOtp)
                  }
                  className="px-6 py-2 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#1B5E20' }}
                  onMouseEnter={(e) =>
                    !changingPassword && (e.currentTarget.style.backgroundColor = '#0D4A14')
                  }
                  onMouseLeave={(e) =>
                    !changingPassword && (e.currentTarget.style.backgroundColor = '#1B5E20')
                  }
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {changingPassword
                    ? 'Please wait...'
                    : passwordOtpSent
                      ? 'Confirm change'
                      : 'Change password'}
                </button>
                {passwordOtpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOtpSent(false);
                      setPasswordOtp('');
                    }}
                    className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-textColor cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gray-200" />

            {/* Danger Zone */}
            <div className="flex w-full flex-col items-start gap-6">
              <h3 className="text-xl font-semibold text-textColor">Danger zone</h3>

              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 mb-1">Delete account</h4>
                    <p className="text-xs text-red-700">
                      Permanently remove your account. This action is not reversible.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition whitespace-nowrap"
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="flex flex-col items-center bg-white shadow-md rounded-xl py-6 px-5 md:w-[460px] w-[370px] border border-gray-200">
            <div className="flex items-center justify-center p-4 bg-red-100 rounded-full">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.875 5.75h1.917m0 0h15.333m-15.333 0v13.417a1.917 1.917 0 0 0 1.916 1.916h9.584a1.917 1.917 0 0 0 1.916-1.916V5.75m-10.541 0V3.833a1.917 1.917 0 0 1 1.916-1.916h3.834a1.917 1.917 0 0 1 1.916 1.916V5.75m-5.75 4.792v5.75m3.834-5.75v5.75"
                  stroke="#DC2626"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-gray-900 font-semibold mt-4 text-xl">Are you sure?</h2>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Do you really want to continue? This action
              <br />
              cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-4 mt-5 w-full">
              <button
                onClick={() => setShowDeleteModal(false)}
                type="button"
                className="w-full md:w-36 h-10 rounded-md border border-gray-300 bg-white text-gray-600 font-medium text-sm hover:bg-gray-100 active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full md:w-36 h-10 rounded-md text-white bg-red-600 font-medium text-sm hover:bg-red-700 active:scale-95 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
