import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resetPassword } from '../services/authApi';
import PremiumAuthShell from '../components/auth/PremiumAuthShell';
import { PasswordField } from '../components/onboarding/fields';
import { passwordProblems } from '../components/onboarding/validation';
import { buildAuthPath, readAuthContext } from '../utils/authIntent';

export default function ResetPasswordPage() {
  const location = useLocation();
  const ctx = readAuthContext(location, { useStored: true });
  const loginPath = buildAuthPath('login', ctx);
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>(token ? {} : { form: 'This password-reset link is missing its token. Request a new one.' });
  const inFlight = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || inFlight.current) return;
    const next: typeof errors = {};
    const problems = passwordProblems(password);
    if (problems.length) next.password = `Password needs: ${problems.join(', ').toLowerCase()}.`;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (next.password || next.confirm) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'This reset link is invalid or expired. Request a new one.' });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <PremiumAuthShell mode="signin" eyebrow="Account recovery" title="Choose a new password" description="Pick a strong password you do not use anywhere else.">
      {done ? (
        <div className="kayad-auth-form">
          <div className="kayad-auth-notice" role="status">Your password has been reset. Sign in with the new password.</div>
          <Link to={loginPath} className="kayad-auth-submit text-center">Continue to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="kayad-auth-form" noValidate>
          {errors.form && (
            <div className="kayad-auth-error" role="alert">
              {errors.form} <Link to="/forgot-password" className="font-bold underline">Request a new link</Link>
            </div>
          )}
          <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} showRules required />
          <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
          <button className="kayad-auth-submit" type="submit" disabled={loading || !token}>{loading ? 'Updating…' : 'Update password'}</button>
        </form>
      )}
    </PremiumAuthShell>
  );
}
