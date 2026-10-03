import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ShieldCheck, Mail, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

/**
 * Reusable Email OTP Verification Component
 * Can be plugged below or alongside any email input field.
 */
export function EmailOtpVerification({
  email,
  name = '',
  purpose = 'CUSTOMER_VERIFICATION',
  isVerified = false,
  onVerificationChange,
}) {
  const { success, error } = useNotification();
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState(isVerified ? email : '');

  // If email changes after verification, invalidate verification
  useEffect(() => {
    if (isVerified && email && email.toLowerCase() !== lastVerifiedEmail.toLowerCase()) {
      onVerificationChange(false);
      setOtpSent(false);
      setOtp('');
    }
  }, [email, isVerified, lastVerifiedEmail, onVerificationChange]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!email || !email.trim()) {
      error('Please enter an email address first.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error('Please enter a valid email address.');
      return;
    }

    try {
      setIsSending(true);
      const res = await api.post('/auth/send-verification-otp', {
        email: email.trim().toLowerCase(),
        name,
        purpose,
      });

      if (res.success) {
        success(res.message || '6-digit OTP sent to your email! Please check inbox.');
        setOtpSent(true);
        setCooldown(45);
      }
    } catch (err) {
      error(err.message || 'Failed to send OTP to email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      error('Please enter the 6-digit OTP code.');
      return;
    }

    if (cleanOtp.length !== 6) {
      error('OTP must be exactly 6 digits.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await api.post('/auth/verify-email-otp', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        purpose,
      });

      if (res.success) {
        success(res.message || 'Email verified successfully!');
        setLastVerifiedEmail(email.trim().toLowerCase());
        onVerificationChange(true);
        setOtpSent(false);
        setOtp('');
      }
    } catch (err) {
      error(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="mt-1.5 flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Email Verified with OTP
        </span>
        <span className="text-[11px] text-emerald-600 font-mono font-semibold">✓ Confirmed</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      {!otpSent ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-600 text-[11px] flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Verification required
          </span>
          <button
            type="button"
            disabled={isSending || !email}
            onClick={handleSendOtp}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs disabled:opacity-50 transition shadow-xs"
          >
            <Send className="w-3 h-3" />
            {isSending ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-brand-50/50 border border-brand-200 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="flex items-center gap-1 font-semibold text-brand-700">
              <Mail className="w-3.5 h-3.5" /> Enter 6-Digit OTP
            </span>
            {cooldown > 0 ? (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Resend in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending}
                className="text-[11px] text-brand-600 hover:underline font-semibold"
              >
                Resend OTP
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-sm text-center font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="button"
              disabled={isVerifying || otp.trim().length !== 6}
              onClick={handleVerifyOtp}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition shadow-xs"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            A 6-digit verification code has been dispatched to {email}.
          </p>
        </div>
      )}
    </div>
  );
}
