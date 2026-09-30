import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../services/authApi';

const strong = (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export default function ResetPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(token ? '' : 'This password-reset link is missing its token.');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!strong(password)) {
      setError('Password must be 8+ characters and include uppercase, lowercase, number and special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A3340] text-xl font-black text-amber-300">K</div>
        <h1 className="mt-5 text-center text-2xl font-black text-[#0A3340]">Choose a new password</h1>
        {done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">Your password has been reset successfully. You can now sign in with the new password.</div>
            <Link to="/login" className="block w-full rounded-xl bg-[#0A3340] px-5 py-3 text-center text-sm font-bold text-white">Continue to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="text-xs font-bold text-slate-600">New password
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#176B87]" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </label>
            <label className="text-xs font-bold text-slate-600">Confirm password
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#176B87]" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </label>
            <p className="text-[11px] leading-5 text-slate-500">Use at least 8 characters with uppercase, lowercase, a number and a special character.</p>
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
            <button disabled={loading || !token} className="w-full rounded-xl bg-[#0A3340] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
