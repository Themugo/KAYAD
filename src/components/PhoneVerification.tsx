import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Phone } from 'lucide-react';
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  getPhoneVerificationStatus,
  PhoneVerificationError,
} from '../services/phoneVerificationApi';

/**
 * Real, working phone verification screen - connects to the real
 * backend fixed in an earlier pass (which was previously completely
 * broken at every layer: missing database columns, a field-mapping
 * bug, a type-handling crash, and a silent "success" lie when no real
 * SMS provider is configured - all fixed and verified end-to-end
 * before this screen was built). Nothing here fakes success: a
 * failed send or a wrong/expired code is shown honestly, using the
 * real backend's own message.
 */
export const PhoneVerification: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'verified' | 'no_phone' | 'unverified'>('loading');
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadStatus = () => {
    setStatus('loading');
    setError(null);
    getPhoneVerificationStatus()
      .then((s) => {
        setPhone(s.phone);
        setStatus(s.verified ? 'verified' : s.phone ? 'unverified' : 'no_phone');
      })
      .catch((err) => {
        setError(err instanceof PhoneVerificationError ? err.message : 'Could not load your verification status.');
        setStatus('unverified');
      });
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSendCode = async () => {
    setSending(true);
    setError(null);
    try {
      await sendPhoneOTP();
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof PhoneVerificationError ? err.message : 'Could not send a verification code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(otpInput)) {
      setError('Enter the 4-digit code.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyPhoneOTP(otpInput);
      setStatus('verified');
      setCodeSent(false);
      setOtpInput('');
    } catch (err) {
      setError(err instanceof PhoneVerificationError ? err.message : 'Could not verify your code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-900">Phone Verified</p>
          <p className="text-xs text-emerald-700">{phone} is confirmed. Buyers see this as a real trust signal on your listings.</p>
        </div>
      </div>
    );
  }

  if (status === 'no_phone') {
    return (
      <div className="p-5 bg-white border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-sm font-bold text-[#1E3063]">Phone Verification</h3>
        </div>
        <p className="text-xs text-slate-500">Add a phone number to your account in Account Settings before you can verify it.</p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-[#C85A32]" />
        <h3 className="text-sm font-bold text-[#1E3063]">Phone Verification</h3>
      </div>
      <p className="text-xs text-slate-500">
        Verify <span className="font-semibold text-slate-700">{phone}</span> to add a real trust badge to your listings.
      </p>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {!codeSent ? (
        <button
          onClick={handleSendCode}
          disabled={sending}
          className="bg-[#1E3063] hover:bg-[#17244B] text-white text-xs font-bold rounded-lg px-4 py-2.5 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send Verification Code'}
        </button>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Enter the 4-digit code sent to {phone}</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className="w-32 border border-slate-200 rounded-lg px-3 py-2.5 text-lg font-mono tracking-widest text-center"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={verifying}
              className="bg-[#1E3063] hover:bg-[#17244B] text-white text-xs font-bold rounded-lg px-4 py-2.5 disabled:opacity-50"
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="text-xs font-bold text-[#C85A32] hover:underline disabled:opacity-50"
            >
              {sending ? 'Resending…' : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PhoneVerification;
