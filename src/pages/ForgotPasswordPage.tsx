import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { forgotPassword } from '../services/authApi';
import PremiumAuthShell from '../components/auth/PremiumAuthShell';
import { TextField } from '../components/onboarding/fields';
import { buildAuthPath, readAuthContext } from '../utils/authIntent';
import { isEmail } from '../components/onboarding/validation';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const ctx = readAuthContext(location);
  const loginPath = buildAuthPath('login', ctx);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!isEmail(email)) { setError('Enter the email address you registered with.'); return; }
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      await forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process the request. Please try again.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <PremiumAuthShell
      mode="signin"
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your KAYAD email and we’ll send a secure reset link if the account exists."
    >
      {submitted ? (
        <div className="kayad-auth-form">
          <div className="kayad-auth-notice" role="status">If that account exists, a password-reset email is on its way. Check your inbox and follow the link. It expires, so use it soon.</div>
          <Link to={loginPath} className="kayad-auth-submit text-center">Return to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="kayad-auth-form" noValidate>
          <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
          <button className="kayad-auth-submit" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
          <Link to={loginPath} className="kayad-auth-secondary-action">Back to sign in</Link>
        </form>
      )}
    </PremiumAuthShell>
  );
}
