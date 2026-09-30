import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, RefreshCw, XCircle } from 'lucide-react';
import { getMe, resendVerification, verifyEmail } from '../services/authApi';

export default function VerifyEmailPage() {
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'missing'>('loading');
  const [message, setMessage] = useState('Verifying your KAYAD email…');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      // Bootstrap the browser CSRF cookie even when the user lands on this page
      // without a token, so the resend action can still be submitted safely.
      void getMe().catch(() => {});
      setState('missing');
      setMessage('This verification link is missing its token.');
      return;
    }
    verifyEmail(token)
      .then((result) => {
        setState('success');
        setMessage(result.message || 'Your email has been verified successfully. You can now sign in.');
      })
      .catch((error) => {
        setState('error');
        setMessage(error?.message || 'This verification link is invalid or has expired.');
      });
  }, []);

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    setResent(false);
    try {
      await resendVerification({ email: email.trim() });
      setResent(true);
    } catch {
      // Keep the response generic; the API intentionally prevents account enumeration.
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
          {state === 'loading' ? <Loader2 className="animate-spin text-[#176B87]" size={32} /> : state === 'success' ? <CheckCircle2 className="text-emerald-600" size={32} /> : <XCircle className="text-rose-600" size={32} />}
        </div>
        <h1 className="mt-6 text-center text-2xl font-black text-[#0A3340]">
          {state === 'loading' ? 'Verifying your email' : state === 'success' ? 'Email verified' : 'Verification link problem'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-slate-500">{message}</p>

        {state === 'success' && (
          <button onClick={() => { window.location.href = '/login'; }} className="mt-7 w-full rounded-xl bg-[#0A3340] px-5 py-3 text-sm font-bold text-white">Continue to sign in</button>
        )}

        {(state === 'error' || state === 'missing') && (
          <div className="mt-7 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#0A3340]"><MailCheck size={17} /> Request a new verification email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.co.ke" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#176B87]" />
              <button disabled={resending || !email.trim()} onClick={handleResend} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A3340] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                {resending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} {resending ? 'Sending…' : 'Resend verification email'}
              </button>
              {resent && <p className="mt-3 text-xs font-semibold text-emerald-700">If the account exists and is unverified, a new verification link has been sent.</p>}
            </div>
            <button onClick={() => { window.location.href = '/'; }} className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Return to KAYAD</button>
          </div>
        )}
      </section>
    </main>
  );
}
