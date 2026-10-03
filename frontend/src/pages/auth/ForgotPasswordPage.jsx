import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Mail, Lock, ArrowRight, ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const { success, error } = useNotification();
  const navigate = useNavigate();

  // Cooldown countdown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      error('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      success(res.message || 'Password reset OTP sent to your email.');
      setStep('reset');
      setOtp('');
      setCooldown(45);
    } catch (err) {
      error(err.message || 'Failed to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      return error('Please enter the 6-digit OTP code received in your email.');
    }

    if (!newPassword || !confirmPassword) {
      return error('Please enter and confirm your new password.');
    }

    if (newPassword !== confirmPassword) {
      return error('Passwords do not match.');
    }

    if (newPassword.length < 6) {
      return error('Password must be at least 6 characters.');
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        newPassword,
        confirmPassword,
      });
      success(res.message || 'Password reset successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      error(err.message || 'Failed to reset password. Please verify the OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      const res = await api.post('/auth/resend-otp', {
        email: email.trim().toLowerCase(),
        purpose: 'PASSWORD_RESET',
      });
      success(res.message || 'A fresh 6-digit reset code has been sent to your email.');
      setCooldown(45);
    } catch (err) {
      error(err.message || 'Failed to resend reset code.');
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
          {step === 'reset' ? 'Set New ' : 'Reset '}
          <span className="text-brand-600">Password</span>
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          {step === 'reset'
            ? 'Enter the 6-digit OTP code and choose your new password'
            : 'Enter your email to receive a 6-digit verification code'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50">
          {step === 'reset' ? (
            /* STEP 2: ENTER OTP & NEW PASSWORD */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-200 text-xs text-slate-700 flex items-center justify-between">
                <span>
                  Code sent to: <span className="font-mono text-brand-700 font-semibold">{email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-[11px] text-brand-600 hover:underline font-medium"
                >
                  Edit Email
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 text-center mb-1">
                  6-Digit Reset OTP *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full py-2.5 px-4 bg-slate-50 border-2 border-brand-300 focus:border-brand-600 rounded-xl text-center text-slate-900 font-mono text-2xl font-extrabold tracking-[0.4em] placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Verify OTP & Reset Password'}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isResending}
                  className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 disabled:opacity-50 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : isResending ? 'Sending...' : 'Resend Code'}
                  </span>
                </button>

                <Link to="/login" className="text-slate-500 hover:text-slate-700 transition">
                  Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            /* STEP 1: REQUEST OTP */
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  We will send a 6-digit verification code to this email to reset your password.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
