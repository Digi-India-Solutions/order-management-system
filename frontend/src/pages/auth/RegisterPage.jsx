import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck, RefreshCw, KeyRound, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify_otp' | 'pending_approval'
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const { register, verifyOtp, resendOtp } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digits }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateEmailFormatClient = (email) => {
    if (!email || email.includes('..')) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain || !domain.includes('.')) return false;
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return false;
    return true;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      error('Please fill in all mandatory fields.');
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      error('Phone number must be exactly 10 digits (numbers only).');
      return;
    }

    if (!validateEmailFormatClient(formData.email.trim())) {
      error('Invalid email address. Please enter a valid address like user@company.com.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      error('Password and confirmation do not match.');
      return;
    }

    if (formData.password.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register(formData);
      success(res.message || 'Verification OTP sent! Please check your email inbox.');
      setStep('verify_otp');
      setOtp('');
      setCooldown(45);
    } catch (err) {
      error(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      error('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    if (cleanOtp.length !== 6) {
      error('OTP must be exactly 6 digits.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await verifyOtp(formData.email.trim().toLowerCase(), cleanOtp);
      success(res.message || 'Email verified successfully! Welcome to OMS.');
      navigate('/orders');
    } catch (err) {
      error(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      const res = await resendOtp(formData.email.trim().toLowerCase(), 'REGISTRATION');
      success(res.message || 'A fresh 6-digit OTP has been sent to your email.');
      setCooldown(45);
    } catch (err) {
      error(err.message || 'Failed to resend verification OTP.');
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
          {step === 'pending_approval' ? (
            <>
              Registration <span className="text-brand-600">Under Review</span>
            </>
          ) : step === 'verify_otp' ? (
            <>
              Verify <span className="text-brand-600">Email OTP</span>
            </>
          ) : (
            <>
              Create <span className="text-brand-600">OMS Account</span>
            </>
          )}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          {step === 'pending_approval'
            ? 'Email verified. Account is awaiting Super Admin verification & approval'
            : step === 'verify_otp'
            ? 'Enter the 6-digit verification code sent to your email'
            : 'Secure enterprise account setup with email OTP verification'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50">
          {step === 'pending_approval' ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Email Verified: {formData.email}
                </div>
                <h3 className="text-lg font-bold text-slate-900">Super Admin Approval Required</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your registration has been submitted! For organization security, a <strong>Super Admin</strong> must verify and approve your account from their dashboard before you can access the <strong>Sales Person Dashboard</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Name:</span>
                  <span className="font-semibold text-slate-900">{formData.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Requested Role:</span>
                  <span className="font-semibold text-brand-700 font-mono">Sales Person</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Verification Status:</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    PENDING APPROVAL
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition shadow-xs"
                >
                  Go to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : step === 'verify_otp' ? (
            /* STEP 2: 6-DIGIT OTP VERIFICATION FORM */
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto shadow-xs">
                  <KeyRound className="w-7 h-7" />
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  We sent a 6-digit OTP code to:
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg inline-block border border-brand-200">
                  {formData.email}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Please check your inbox (and spam folder). Code is valid for 10 minutes.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 text-center mb-2">
                  Enter 6-Digit OTP *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full py-3 px-4 bg-slate-50 border-2 border-brand-300 focus:border-brand-600 rounded-xl text-center text-slate-900 font-mono text-3xl font-extrabold tracking-[0.5em] placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.trim().length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Activate Account</span>
                  </>
                )}
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
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : isResending ? 'Sending...' : 'Resend OTP'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700 transition">
                  Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            /* STEP 1: REGISTRATION FORM */
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  A 6-digit OTP will be dispatched to this email address to verify your account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number (10 Digits)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210 (10 digits)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                  />
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {formData.phone ? `${formData.phone.length}/10 digits` : 'Optional, exactly 10 digits if provided'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 transition shadow-xs"
              >
                {isSubmitting ? 'Sending OTP to Email...' : 'Send Verification OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition">
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
