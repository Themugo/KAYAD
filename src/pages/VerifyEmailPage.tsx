import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck, RefreshCw, XCircle } from 'lucide-react';
import { getMe, resendVerification, verifyEmail } from '../services/authApi';
import PremiumAuthShell from '../components/auth/PremiumAuthShell';
import { TextField } from '../components/onboarding/fields';
import { buildAuthPath, readAuthContext } from '../utils/authIntent';

/**
 * Email verification does NOT sign the person in (that is the backend contract).
 * On success we send them to the sign-in page, which picks up the intent that
 * was remembered at registration so they land where they were headed.
 */
export default function VerifyEmailPage() {
  const location = useLocation();
  const ctx = readAuthContext(location, { useStored: true });
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'missing'>('loading');
  const [message, setMessage] = useState('Verifying your KAYAD email…');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // a verification token is single-use: never submit it twice
    ran.current = true;
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      // Bootstrap the CSRF cookie so the resend action can still be submitted safely.
      void getMe().catch(() => {});
      setState('missing');
      setMessage('This verification link is missing its token.');
      return;
    }
    verifyEmail(token)
      .then((result) => {
        setState('success');
        setMessage(result.message || 'Your email has been verified. Sign in to continue.');
      })
      .catch((error) => {
        setState('error');
        setMessage(error?.message || 'This verification link is invalid or has expired.');
      });
  }, [location.search]);

  const handleResend = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setResent(false);
    try { await resendVerification({ email: email.trim() }); } catch { /* generic by design: no account enumeration */ }
    setResent(true);
    setResending(false);
  };

  const icon = state === 'loading' ? <Loader2 className="animate-spin text-[#176B87]" size={30} aria-hidden="true" />
    : state === 'success' ? <CheckCircle2 className="text-emerald-600" size={30} aria-hidden="true" />
    : <XCircle className="text-rose-600" size={30} aria-hidden="true" />;

  return (
    <PremiumAuthShell
      mode="signin"
      eyebrow="Email verification"
      title={state === 'loading' ? 'Verifying your email' : state === 'success' ? 'Email verified' : 'Verification link problem'}
      description={undefined}
    >
      <div className="kayad-auth-form" aria-live="polite">
        <div className="flex items-start gap-3">{icon}<p className="m-0 text-sm leading-6 text-slate-600">{message}</p></div>
        {state === 'success' && (
          <Link to={`${buildAuthPath('login', ctx)}${buildAuthPath('login', ctx).includes('?') ? '&' : '?'}verified=1`} className="kayad-auth-submit text-center">Continue to sign in</Link>
        )}
        {(state === 'error' || state === 'missing') && (
          <>
            <div className="flex items-center gap-2 text-sm font-black text-[#0A3340]"><MailCheck size={17} aria-hidden="true" /> Request a new verification email</div>
            <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="button" className="kayad-auth-submit" disabled={resending || !email.trim()} onClick={handleResend}>
              {resending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />} {resending ? 'Sending…' : 'Resend verification email'}
            </button>
            {resent && <div className="kayad-auth-notice" role="status">If the account exists and is unverified, a new verification link has been sent.</div>}
            <Link to="/" className="kayad-auth-secondary-action">Return to KAYAD</Link>
          </>
        )}
      </div>
    </PremiumAuthShell>
  );
}
