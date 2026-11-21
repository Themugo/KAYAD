import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { changePassword, AuthApiError } from '../../services/authApi';

/** Mirrors the server rules in authController.changePassword (the server stays the authority). */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'New password must be at least 8 characters.';
  if (!/[a-z]/.test(pw)) return 'New password needs a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'New password needs an uppercase letter.';
  if (!/\d/.test(pw)) return 'New password needs a number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'New password needs a special character.';
  return null;
}

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setDone(false);
    if (!current) return setError('Enter your current password.');
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('New password and confirmation do not match.');
    if (next === current) return setError('New password must be different from the current one.');
    setError(null);
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent(''); setNext(''); setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err instanceof AuthApiError && err.message ? err.message : 'Could not change your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full font-sans text-sm text-[#0A3340] border border-[#BDE5DE] rounded px-3 py-2';
  return (
    <form onSubmit={submit} className="p-4 bg-[#F6FAF9] rounded-xl space-y-3" aria-label="Change password">
      <h3 className="font-sans text-sm font-semibold text-[#0A3340]">Change password</h3>
      <label className="block text-xs font-semibold text-[#0A3340]">Current password
        <input type="password" autoComplete="current-password" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="block text-xs font-semibold text-[#0A3340]">New password
        <input type="password" autoComplete="new-password" className={input} value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="block text-xs font-semibold text-[#0A3340]">Confirm new password
        <input type="password" autoComplete="new-password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <p className="text-xs text-warm-400">At least 8 characters with upper and lower case, a number and a special character. Other devices are signed out when you change it.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {done && <p role="status" className="text-sm text-green-700">Password changed. Other sessions were signed out.</p>}
      <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#13B8A6] text-[#0A3340] text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}
