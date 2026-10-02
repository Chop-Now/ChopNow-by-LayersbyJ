import React, { useState, useEffect } from 'react';
import { User, Upload, Trash2, MoveLeft, Eye, EyeOff, Loader2, Bike, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { authService } from '../services';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { clearAccessToken } from '../services/api';
import PageNavbar from '../Components/PageNavbar';
import Footer from '../Components/Footer';
import { PageHero, BrandLoader } from '../Components/brand/Kit';

const LABEL = 'block eyebrow text-[11px] text-moringa-muted mb-2';
const INPUT =
  'w-full h-12 px-3 bg-white border-2 border-moringa text-sm font-medium text-moringa placeholder:text-moringa-muted/70 focus:outline-none focus:bg-fufu';

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
      <div className="bg-fufu min-h-screen flex flex-col items-center justify-center gap-4">
        <BrandLoader className="w-10 text-moringa" />
        <p className="eyebrow text-moringa-muted">Loading your profile</p>
      </div>
    );
  }

  const avatar = (size) =>
    profile.avatar ? (
      <img src={profile.avatar} alt="Avatar" className={`${size} object-cover shrink-0`} />
    ) : (
      <div className={`${size} bg-yellow flex items-center justify-center shrink-0`}>
        <User className="w-1/2 h-1/2 text-moringa" aria-hidden="true" />
      </div>
    );

  return (
    <div className="bg-fufu min-h-screen pt-[72px]">
      <PageNavbar />
      <PageHero
        eyebrow="Your account / Settings"
        title="My profile"
        art="spoon"
        intro="Update your profile and personal details here."
        aside={
          <div className="flex items-center gap-4 bg-moringa-dark p-4 max-w-[340px] rounded-lg">
            {avatar('h-14 w-14')}
            <div className="min-w-0">
              <p className="font-bold truncate">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-sm opacity-80 truncate">{profile.email}</p>
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Settings Menu */}
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-[88px]">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 eyebrow text-moringa hover:underline underline-offset-4 cursor-pointer mb-4"
            >
              <MoveLeft
                className="w-4 h-4 group-hover:-translate-x-1 transition"
                aria-hidden="true"
              />
              Back
            </button>
            <nav className="hidden lg:block bg-white border border-char/10">
              <p className="eyebrow text-[11px] text-moringa-muted px-4 pt-4 pb-2">Personal</p>
              <a
                href="#profile"
                className="block px-4 h-11 leading-[44px] text-sm font-bold bg-moringa text-yellow"
              >
                Account
              </a>
              <a
                href="#password"
                className="block px-4 h-11 leading-[44px] text-sm font-bold text-moringa hover:bg-mint border-t border-hairline"
              >
                Password
              </a>
              <a
                href="#danger"
                className="block px-4 h-11 leading-[44px] text-sm font-bold text-moringa hover:bg-mint border-t border-hairline"
              >
                Danger zone
              </a>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            {/* Account Upgrades Section */}
            {!availableRoles.includes(
              'rider'
            ) /* || !availableRoles.includes('business_owner') */ && (
              <div className="grid grid-cols-1 md:grid-cols-2">
                {!availableRoles.includes('rider') && (
                  <div className="relative overflow-hidden bg-yellow text-moringa p-6 flex flex-col justify-between gap-4 md:col-span-2 rounded-lg">
                    <div className="space-y-2 max-w-xl">
                      <p className="eyebrow text-[11px] flex items-center gap-2">
                        <Bike className="w-4 h-4" aria-hidden="true" />
                        Deliver and earn
                      </p>
                      <h3 className="display text-[36px] md:text-[48px] leading-[0.95]">
                        Become a delivery partner
                      </h3>
                      <p className="text-sm font-medium leading-relaxed">
                        Join the ChopNow delivery fleet. Pick up food on your bicycle, motorcycle,
                        or car and make extra cash on your own schedule.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/rider-verification')}
                      className="self-start h-12 px-6 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer"
                    >
                      Register as rider
                    </button>
                  </div>
                )}

                {/* 
                {!availableRoles.includes('business_owner') && (
                  <div className="bg-lime text-moringa p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <p className="eyebrow text-[11px] flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Sell surplus
                      </p>
                      <h3 className="display text-[36px]">Register as a vendor</h3>
                      <p className="text-sm font-medium leading-relaxed">
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
                      className="self-start h-12 px-6 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark cursor-pointer"
                    >
                      Register business
                    </button>
                  </div>
                )}
                */}
              </div>
            )}

            {/* Profile Section */}
            <section
              id="profile"
              className="bg-white border border-char/10 p-5 sm:p-6 scroll-mt-24"
            >
              <div className="flex items-baseline gap-3 mb-6">
                <span className="display text-[32px] text-moringa leading-none">1</span>
                <h2 className="eyebrow text-moringa">Profile</h2>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                {avatar('h-20 w-20')}
                <div className="flex flex-col items-start gap-2">
                  <label className="flex items-center gap-2 h-10 px-4 border-2 border-moringa text-sm font-bold text-moringa hover:bg-mint transition-colors cursor-pointer">
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

              {/* Name Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>First name</label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={profile.firstName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Last name</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={profile.lastName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                    className={INPUT}
                  />
                </div>

                {/* Email and Phone Fields */}
                <div>
                  <label className={LABEL}>Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className={`${INPUT} !bg-fufu-dim !border-hairline cursor-not-allowed`}
                  />
                  <p className="text-xs text-moringa-muted mt-1.5">Email cannot be changed</p>
                </div>
                <div>
                  <label className={LABEL}>Phone number</label>
                  <PhoneInput
                    country={'rw'}
                    disableCountryGuess={true}
                    value={profile.phone}
                    onChange={(phone) => setProfile((prev) => ({ ...prev, phone }))}
                    enableSearch={true}
                    searchPlaceholder="Search country"
                    placeholder="Choose your country"
                    containerClass="w-full"
                    inputClass="!w-full !h-12 !border-2 !border-moringa !rounded-none !text-sm !font-medium !bg-white"
                    buttonClass="!border-2 !border-moringa !rounded-none !bg-white !h-12 hover:!bg-mint"
                    dropdownClass="!text-sm !bg-white !border !border-moringa !rounded-none !shadow-none"
                    searchClass="!text-sm !p-2 !border-moringa !m-2 !rounded-none"
                    inputStyle={{ color: 'var(--color-moringa)' }}
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="mt-6 h-12 px-6 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </section>

            {/* Password Section */}
            <section
              id="password"
              className="bg-white border border-char/10 p-5 sm:p-6 scroll-mt-24"
            >
              <div className="flex items-baseline gap-3 mb-6">
                <span className="display text-[32px] text-moringa leading-none">2</span>
                <h2 className="eyebrow text-moringa">Password</h2>
              </div>

              <div className="flex flex-col gap-4 max-w-xl">
                <div>
                  <label className={LABEL}>Current password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className={`${INPUT} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5 text-moringa cursor-pointer" />
                      ) : (
                        <Eye className="w-5 h-5 text-moringa cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>New password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className={`${INPUT} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-moringa cursor-pointer" />
                      ) : (
                        <Eye className="w-5 h-5 text-moringa cursor-pointer" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-moringa-muted mt-1.5">
                    Your password must have at least 8 characters, include one uppercase letter, and
                    one number.
                  </p>
                </div>

                <div>
                  <label className={LABEL}>Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-type new password"
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className={`${INPUT} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-moringa cursor-pointer" />
                      ) : (
                        <Eye className="w-5 h-5 text-moringa cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>

                {passwordOtpSent && (
                  <div>
                    <label className={LABEL}>Verification code</label>
                    <input
                      type="text"
                      placeholder="Enter the code sent to your email"
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-2">
                  <button
                    onClick={
                      passwordOtpSent ? handleConfirmPasswordChange : handleRequestPasswordOtp
                    }
                    disabled={
                      changingPassword ||
                      !passwords.currentPassword ||
                      !passwords.newPassword ||
                      !passwords.confirmPassword ||
                      (passwordOtpSent && !passwordOtp)
                    }
                    className="h-12 px-6 bg-moringa text-fufu text-sm font-bold hover:bg-moringa-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      className="h-12 px-6 border-2 border-moringa text-sm font-bold text-moringa hover:bg-mint transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section id="danger" className="bg-peach text-clay p-5 sm:p-6 scroll-mt-24 rounded-lg">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="display text-[32px] leading-none">3</span>
                <h2 className="eyebrow">Danger zone</h2>
              </div>
              <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                <div className="flex-1">
                  <h3 className="font-bold mb-1">Delete account</h3>
                  <p className="text-sm font-medium">
                    Permanently remove your account. This action is not reversible.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="h-12 px-6 border-2 border-clay text-clay text-sm font-bold hover:bg-clay hover:text-fufu transition-colors whitespace-nowrap cursor-pointer"
                >
                  Delete account
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-char/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-[460px] bg-fufu rounded-lg overflow-hidden">
            <div className="bg-peach text-clay p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-clay text-peach flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="display text-[40px]">Are you sure?</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-moringa">
                Do you really want to continue? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 mt-6 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  type="button"
                  className="flex-1 h-12 border-2 border-moringa text-moringa font-bold text-sm hover:bg-mint transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex-1 h-12 bg-clay text-fufu font-bold text-sm hover:bg-char transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
