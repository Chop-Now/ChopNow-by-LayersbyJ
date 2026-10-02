import AuthArt from '../Components/brand/AuthArt';
import { Logo } from '../Components/brand/Kit';
import { assets } from '../assets/assets';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { userService } from '../services';
import { clearAccessToken } from '../services/api';

const AdminLogin = () => {
  const { login, googleAuth, user, isAuthenticated } = useAppContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    if (isAuthenticated && user) {
      const userRoles = user.roles || [user.role];
      if (userRoles.includes('admin')) {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Google Login for Admin - H5 fix: see Login.jsx, ID-token credential flow.
  // Stable references (useCallback), not plain functions recreated every
  // render: @react-oauth/google's GoogleLogin re-invokes Google's
  // renderButton whenever onSuccess/onError change identity, and Google's
  // script appends a fresh button into the container each time rather than
  // replacing it - this was rendering duplicate stacked buttons in production
  // on the same-shaped Login/SignUp pages (found during the 2026-09-26 E2E
  // pass; fixed here too for consistency).
  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      setIsGoogleLoading(true);
      try {
        const result = await googleAuth(credentialResponse.credential);
        const loggedInUser = result.user;

        // Get roles from response
        const userRoles = loggedInUser.roles || [loggedInUser.role];

        // Check if user has admin role
        if (!userRoles.includes('admin')) {
          toast.error('Access denied. This Google account does not have admin privileges.');
          // Clear the session since they're not an admin
          clearAccessToken();
          localStorage.removeItem('user');
          setIsGoogleLoading(false);
          return;
        }

        // Switch to admin role if not already active
        if (loggedInUser.activeRole !== 'admin') {
          try {
            await userService.switchRole('admin');
          } catch (switchError) {
            console.warn('Could not switch to admin role:', switchError);
          }
        }

        toast.success('Admin login successful!');
        navigate('/admin');
      } catch (err) {
        console.error('Google Login error:', err);
        toast.error(err.message || 'Google login failed');
        setIsGoogleLoading(false);
      }
    },
    [googleAuth, navigate]
  );

  const handleGoogleError = useCallback((error) => {
    console.error('Google Login Failed:', error);
    toast.error('Google login failed. Please try again.');
    setIsGoogleLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password, 'admin');
      const loggedInUser = result.user;

      // Get roles from response
      const userRoles = loggedInUser.roles || [loggedInUser.role];

      // Check if user has admin role
      if (!userRoles.includes('admin')) {
        toast.error('Access denied. This account does not have admin privileges.');
        // Clear the session since they're not an admin
        clearAccessToken();
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }

      toast.success('Admin login successful!');
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-moringa">
      {/* Left Side - Brand panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="sticky top-0 h-screen">
          <AuthArt eyebrow="Admin" title={['Control', 'room.']} />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <img src={assets.logomarkgreen} alt="ChopNow" className="w-10 h-10" />
            <span className="text-2xl font-bold text-white">ChopNow</span>
          </div>

          {/* Admin Badge */}
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-solid/20 rounded-full border border-solid/30">
              <ShieldCheck className="w-4 h-4 text-solid" />
              <span className="text-sm font-semibold text-solid">Admin Portal</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-moringa-muted/70">Sign in to access the admin dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Google Login Button */}
            <div className="relative w-full h-14 flex justify-center [&>div]:w-full [&_iframe]:!w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="384"
              />
              {(isGoogleLoading || isLoading) && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white rounded-xl">
                  <div className="w-5 h-5 border-2 border-moringa/25 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-moringa font-medium">Signing in...</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-700"></div>
              <span className="text-sm text-moringa-muted">or sign in with email</span>
              <div className="flex-1 h-px bg-slate-700"></div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-moringa/40 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moringa-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                  placeholder="admin@chopnow.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-moringa/40">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-solid hover:text-tertiary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moringa-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-moringa-muted hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-solid focus:ring-solid focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-moringa-muted/70 cursor-pointer">
                Keep me signed in on this device
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-14 bg-yellow hover:bg-yellow-dark text-char font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-solid/25 hover:shadow-xl hover:shadow-solid/30"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Admin Portal'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">Restricted Access</p>
                <p className="text-xs text-amber-500/80 mt-1">
                  This portal is for authorized administrators only. All login attempts are
                  monitored and logged for security purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <a
              href="/login"
              className="text-sm text-moringa-muted hover:text-slate-300 transition-colors"
            >
              ← Back to main site
            </a>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-moringa-muted">
              © {new Date().getFullYear()} ChopNow. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
