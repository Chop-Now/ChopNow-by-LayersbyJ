import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';
import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // Refs for 6-digit OTP input focusing
  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Password criteria validator
  const getPasswordCriteria = () => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
    };
  };

  const isPasswordValid = () => {
    const criteria = getPasswordCriteria();
    return Object.values(criteria).every(Boolean);
  };

  // Step 1: Send Reset Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      toast.success(response.message || 'Verification code sent to your email.');
      setStep(2);
      startCooldown();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      toast.success(response.message || 'Verification code resent successfully.');
      startCooldown();
      // Clear OTP input
      setOtp(['', '', '', '', '', '']);
      if (otpRefs[0].current) otpRefs[0].current.focus();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyResetOTP(email, otpCode);
      toast.success('Code verified successfully.');
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid()) {
      toast.error('Password does not meet all criteria');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const otpCode = otp.join('');
      await authService.resetPassword(email, otpCode, password);
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle digit inputs inside separate blocks
  const handleOtpChange = (index, value) => {
    if (/[^0-9]/.test(value)) return; // Only numbers allowed

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next box
    if (value !== '' && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace back-focus
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('Text').trim();
    if (pastedData.length === 6 && /^[0-9]+$/.test(pastedData)) {
      const pasteArray = pastedData.split('');
      setOtp(pasteArray);
      otpRefs[5].current.focus();
    }
  };

  const criteria = getPasswordCriteria();

  return (
    <div className="min-h-screen w-full flex bg-moringa">
      <div className="flex w-full">
        {/* Left Side - Brand panel (hidden on mobile) */}
        <div className="w-1/2 hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
          <AuthArt eyebrow="Account security" title={['Back in', 'a minute.']} />
        </div>

        {/* Right Side - Form Container */}
        <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col items-center justify-center px-4 py-8">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <Logo tone="dark" size="md" />
          </div>

          <div className="bg-moringa-2 border border-fufu/10 p-6 sm:p-8 md:p-10 w-full max-w-lg">
            {/* Step 1: Email Request */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="flex flex-col">
                <h2 className="display text-[48px] text-fufu mb-3">Reset Password</h2>
                <p className="text-sm text-moringa-muted/70 mb-8">
                  Enter your email address below. We'll send you a 6-digit verification code to
                  reset your password.
                </p>

                <div className="flex items-center w-full bg-slate-800/50 border border-slate-700 h-14 rounded-xl overflow-hidden px-4 gap-3 mb-6 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                  <Mail className="w-5 h-5 text-moringa-muted" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent outline-none text-sm w-full h-full text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-yellow hover:bg-yellow-dark text-char font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-solid/20"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending code...</span>
                    </div>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>

                <div className="mt-8 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-moringa-muted/70 hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}

            {/* Step 2: Verification Code Entry */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col">
                <h2 className="display text-[48px] text-fufu mb-3">Verify OTP</h2>
                <p className="text-sm text-moringa-muted/70 mb-8">
                  We've sent a 6-digit verification code to{' '}
                  <span className="text-white font-medium">{email}</span>.
                </p>

                <div className="flex justify-between gap-2 mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold text-white bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-yellow hover:bg-yellow-dark text-char font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-solid/20"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify Code'
                  )}
                </button>

                {/* Cooldown Timer */}
                <div className="mt-6 text-center">
                  {cooldown > 0 ? (
                    <p className="text-sm text-moringa-muted">
                      Resend code in <span className="text-white font-medium">{cooldown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm text-solid hover:text-tertiary font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend Code
                    </button>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm text-moringa-muted/70 hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="flex flex-col">
                <h2 className="display text-[48px] text-fufu mb-3">New Password</h2>
                <p className="text-sm text-moringa-muted/70 mb-8">
                  Choose a strong, unique password to secure your account.
                </p>

                {/* New Password Field */}
                <div className="relative mb-4 flex items-center w-full bg-slate-800/50 border border-slate-700 h-14 rounded-xl overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                  <Lock className="w-5 h-5 text-moringa-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent outline-none text-sm w-full h-full text-white placeholder:text-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-moringa-muted hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password Field */}
                <div className="relative mb-6 flex items-center w-full bg-slate-800/50 border border-slate-700 h-14 rounded-xl overflow-hidden px-4 gap-3 focus-within:ring-2 focus-within:ring-solid focus-within:border-transparent transition-all">
                  <Lock className="w-5 h-5 text-moringa-muted" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-transparent outline-none text-sm w-full h-full text-white placeholder:text-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-moringa-muted hover:text-slate-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                <div className="mb-6 p-4 bg-slate-800/30 border border-slate-800 rounded-xl space-y-2.5">
                  <p className="text-xs font-semibold text-moringa-muted/70 uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    {criteria.minLength ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-moringa-muted" />
                    )}
                    <span
                      className={criteria.minLength ? 'text-green-400' : 'text-moringa-muted/70'}
                    >
                      At least 8 characters long
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {criteria.hasUpper ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-moringa-muted" />
                    )}
                    <span
                      className={criteria.hasUpper ? 'text-green-400' : 'text-moringa-muted/70'}
                    >
                      Contains an uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {criteria.hasLower ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-moringa-muted" />
                    )}
                    <span
                      className={criteria.hasLower ? 'text-green-400' : 'text-moringa-muted/70'}
                    >
                      Contains a lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {criteria.hasNumber ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-moringa-muted" />
                    )}
                    <span
                      className={criteria.hasNumber ? 'text-green-400' : 'text-moringa-muted/70'}
                    >
                      Contains a number (0-9)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid() || password !== confirmPassword}
                  className="w-full h-14 bg-yellow hover:bg-yellow-dark text-char font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-solid/25"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating password...</span>
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {/* Step 4: Success Screen */}
            {step === 4 && (
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 text-green-500 animate-bounce">
                  <KeyRound className="w-10 h-10" />
                </div>

                <h2 className="display text-[48px] text-fufu mb-3">Password Reset!</h2>
                <p className="text-sm text-moringa-muted/70 mb-8">
                  Your password has been successfully updated. You can now log in using your new
                  credentials.
                </p>

                <Link
                  to="/login"
                  className="w-full h-14 flex items-center justify-center bg-yellow hover:bg-yellow-dark text-char font-bold rounded-xl transition-all duration-300 shadow-lg shadow-solid/20"
                >
                  Back to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
