import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';

  const [status, setStatus] = useState(token ? 'verifying' : 'no_token');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { verifyEmail, resendVerificationLink, isAuthenticated } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function executeVerification() {
      try {
        setStatus('verifying');
        const res = await verifyEmail({ token, email: initialEmail });
        if (isMounted) {
          setStatus('success');
          setMessage(res.message || 'Your email address has been verified successfully!');
          success(res.message || 'Email verified successfully!');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(err.message || 'Verification link is invalid or has expired.');
          error(err.message || 'Verification failed.');
        }
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, initialEmail]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      error('Please provide your email address.');
      return;
    }

    try {
      setIsResending(true);
      const res = await resendVerificationLink(resendEmail.trim().toLowerCase());
      success(res.message || 'A fresh verification link has been sent to your email.');
      setResendCooldown(45);
    } catch (err) {
      error(err.message || 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25 text-white font-bold text-xl">
            P
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900 tracking-tight">
          Email <span className="text-brand-600">Verification</span>
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Secure token verification for your enterprise OMS account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50">
          {/* 1. VERIFYING STATE */}
          {status === 'verifying' && (
            <div className="text-center py-6 space-y-4">
              <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Validating Verification Link...</h3>
                <p className="text-xs text-slate-500 mt-1">Please wait while we activate your account token.</p>
              </div>
            </div>
          )}

          {/* 2. SUCCESS STATE */}
          {status === 'success' && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Email Verified Successfully!</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {message || 'Your email address has been authenticated. You can now access your OMS dashboard.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <span>{isAuthenticated ? 'Go to Dashboard' : 'Proceed to Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 3. ERROR OR EXPIRED STATE */}
          {status === 'error' && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Verification Failed</h3>
                <p className="text-xs text-rose-600 mt-2 leading-relaxed">
                  {message || 'The verification link is invalid, expired, or has already been used.'}
                </p>
              </div>

              {/* Resend section */}
              <div className="pt-3 border-t border-slate-200 text-left">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  Request a New Verification Link
                </h4>
                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResending || resendCooldown > 0}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : isResending ? 'Sending...' : 'Send New Verification Link'}
                    </span>
                  </button>
                </form>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  Return to Login
                </Link>
              </div>
            </div>
          )}

          {/* 4. NO TOKEN STATE */}
          {status === 'no_token' && (
            <div className="text-center py-4 space-y-4">
              <Mail className="w-12 h-12 text-brand-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Missing Verification Token</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please click the link directly from your activation email or request a new link below.
                </p>
              </div>

              <form onSubmit={handleResend} className="space-y-3 pt-3 text-left">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResending || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Wait ${resendCooldown}s` : isResending ? 'Sending...' : 'Send Verification Link'}
                  </span>
                </button>
              </form>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  Return to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
