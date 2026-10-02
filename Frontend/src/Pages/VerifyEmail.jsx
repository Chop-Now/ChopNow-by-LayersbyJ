import { Logo } from '../Components/brand/Kit';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'This verification link is missing its token.'
  );
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  // The token is single-use: React StrictMode runs effects twice in dev, and a
  // second call would consume nothing and flip the page to "invalid".
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMessage(err.message || 'This verification link is invalid or has expired.');
        setStatus('error');
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter the email you signed up with');
      return;
    }
    setResending(true);
    try {
      const res = await authService.resendVerificationEmail(email);
      toast.success(res.message || 'Verification email sent');
    } catch (err) {
      toast.error(err.message || 'Could not resend the email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-fufu">
      <div className="mb-8">
        <Logo tone="light" size="lg" />
      </div>
      <div className="w-full max-w-md bg-white border-t-4 border-moringa p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2
              className="mx-auto mb-4 h-10 w-10 animate-spin"
              style={{ color: 'var(--color-solid)' }}
            />
            <p style={{ color: 'var(--color-textColor)' }}>Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--color-textColor)' }}>
              Email verified
            </h1>
            <p className="mb-6 text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
              Your account is ready. You can log in now.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-lg px-6 py-3 font-medium text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--color-solid)' }}
            >
              Go to login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--color-textColor)' }}>
              We couldn't verify your email
            </h1>
            <p className="mb-6 text-sm" style={{ color: 'var(--color-moringa-muted)' }}>
              {errorMessage} Links expire after 24 hours — request a new one below.
            </p>
            <form onSubmit={handleResend} className="flex flex-col gap-3 text-left">
              <label htmlFor="resend-email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="resend-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <button
                type="submit"
                disabled={resending}
                className="h-11 rounded-lg font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-solid)' }}
              >
                {resending ? 'Sending…' : 'Send a new verification link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
