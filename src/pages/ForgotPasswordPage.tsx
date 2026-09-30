import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process the request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A3340] text-xl font-black text-amber-300">K</div>
        <h1 className="mt-5 text-center text-2xl font-black text-[#0A3340]">Reset your password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500">Enter your KAYAD email and we’ll send a secure password-reset link if the account exists.</p>
        {submitted ? (
          <div className="mt-7 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">If that account exists, a password-reset email is being sent. Check your inbox and follow the link.</div>
            <Link to="/login" className="block w-full rounded-xl bg-[#0A3340] px-5 py-3 text-center text-sm font-bold text-white">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="text-xs font-bold text-slate-600">Email
              <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#176B87]" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
            <button disabled={loading} className="w-full rounded-xl bg-[#0A3340] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Sending…' : 'Send reset link'}</button>
            <Link to="/login" className="block text-center text-xs font-bold text-[#176B87]">Back to sign in</Link>
          </form>
        )}
      </section>
    </main>
  );
}
