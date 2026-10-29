import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthApiError, resendVerification } from '../services/authApi';
import { getPostAuthPath } from '../utils/authRoutes';
import { buildAuthPath, clearStoredAuthIntent, readAuthContext } from '../utils/authIntent';
import PremiumAuthShell from '../components/auth/PremiumAuthShell';
import { PasswordField, TextField } from '../components/onboarding/fields';
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react';

/**
 * Canonical sign-in page. Reads `next`/`intent` (URL, route-guard state, or the
 * value remembered across the email-verification round trip), never trusts them
 * for authorization, and only navigates to a validated in-app path.
 */
export function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = readAuthContext(location, { useStored: true });
  const next = ctx.next || '/';
  const params = new URLSearchParams(location.search);
  const verifyRequired = params.get('verify') === 'required';
  const verifiedNow = params.get('verified') === '1';

  const [form, setForm] = useState({ email: location.state?.email || '', password: '', mfaCode: '' });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(verifyRequired);
  const [resending, setResending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const destination = getPostAuthPath(user, next);
    if (destination !== '/login' && !destination.startsWith('/login?')) {
      clearStoredAuthIntent();
      navigate(destination, { replace: true });
    }
  }, [authLoading, user, next, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      setVerificationRequired(false);
      const data = await login({ email: form.email.trim(), password: form.password, ...(form.mfaCode.trim() ? { mfaCode: form.mfaCode.trim() } : {}) });
      toast('Welcome back!', 'success');
      clearStoredAuthIntent();
      navigate(getPostAuthPath(data?.user || user, next), { replace: true });
    } catch (err) {
      // PHASE 16: an owner with an authenticator gets a second step in the same form (the server issues no session until the code is right).
      if (err instanceof AuthApiError && err.kind === 'mfa_required') { setMfaRequired(true); setError(err.message); return; }
      if (mfaRequired) setForm((p) => ({ ...p, mfaCode: '' }));
      const message = err instanceof AuthApiError ? err.message : err?.response?.data?.message || 'Unable to sign in. Please try again.';
      const needsVerification = err instanceof AuthApiError && (err.kind === 'email_verification_required' || (err.status === 403 && /verify your email/i.test(err.message)));
      // STAGE 5E: the owner-identity gate tells the owner to "Resend verification email"; show that action AND keep the owner-specific
      // explanation visible (the generic panel alone would hide why a correct password was refused).
      const ownerUnverified = err instanceof AuthApiError && err.kind === 'owner_identity_unverified';
      setVerificationRequired(needsVerification || ownerUnverified);
      setError(needsVerification ? '' : message);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendVerification({ email: form.email.trim() });
      toast('If the account exists and is unverified, a new verification link has been sent.', 'success');
    } catch {
      toast('Please try again shortly.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <PremiumAuthShell
      mode="signin"
      eyebrow="Secure marketplace access"
      title="Welcome back."
      description="Sign in to your KAYAD account and continue buying, selling, comparing and transacting with confidence."
    >
      {verifiedNow && !verificationRequired && (
        <div className="kayad-auth-notice" role="status">Email verified. Sign in to continue.</div>
      )}
      {verificationRequired && (
        <div className="kayad-auth-alert" role="alert">
          <div className="kayad-auth-alert-title">Email verification required</div>
          <p>Verify your KAYAD email before signing in. If you did not receive the message, request another verification email.</p>
          <button type="button" disabled={resending || !form.email.trim()} onClick={resend} className="kayad-auth-alert-button">
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
          {!form.email.trim() && <p className="m-0 text-[11px]">Enter your email below to resend.</p>}
        </div>
      )}
      {error && <div className="kayad-auth-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="kayad-auth-form" noValidate={false}>
        <TextField
          label="Email address" type="email" placeholder="you@example.com" required autoComplete="email"
          value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <div className="kayad-login-password-group">
          <PasswordField
            label="Password" placeholder="Enter your password" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <div className="kayad-login-forgot-row"><Link to="/forgot-password">Forgot password?</Link></div>
        </div>
        {mfaRequired && (
          <TextField
            label="Authenticator code" placeholder="6-digit code or recovery code" required autoComplete="one-time-code" inputMode="text" name="mfaCode"
            value={form.mfaCode} onChange={(e) => setForm((p) => ({ ...p, mfaCode: e.target.value }))}
          />
        )}
        <button className="kayad-auth-submit" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="kayad-auth-spinner" /> Signing in…</> : <>Continue to KAYAD <ArrowRight size={16} /></>}
        </button>
      </form>

      <div className="kayad-auth-divider"><span>New to KAYAD?</span></div>
      <Link to={buildAuthPath('register', ctx)} className="kayad-auth-secondary-action">Create your KAYAD account</Link>

      <div className="kayad-auth-trust-row">
        <span><ShieldCheck size={14} /> Secure sessions</span>
        <span><BadgeCheck size={14} /> Verified marketplace</span>
      </div>
    </PremiumAuthShell>
  );
}

export default LoginPage;
