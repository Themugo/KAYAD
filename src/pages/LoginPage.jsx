import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthApiError, resendVerification } from '../services/authApi';
import { getPostAuthPath } from '../utils/authRoutes';
import PremiumAuthShell from '../components/auth/PremiumAuthShell';
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const destination = getPostAuthPath(user, from);
    if (destination !== '/login' && !destination.startsWith('/login?')) {
      navigate(destination, { replace: true });
    }
  }, [authLoading, user, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setVerificationRequired(false);
      const data = await login(form);
      toast('Welcome back! 🚗', 'success');
      const u = data.user || user;
      const dest = getPostAuthPath(u, from);
      navigate(dest, { replace: true });
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : err?.response?.data?.message || 'Unable to sign in. Please try again.';
      const requiresVerification = err instanceof AuthApiError && (err.kind === 'email_verification_required' || (err.status === 403 && /verify your email/i.test(err.message)));
      setVerificationRequired(requiresVerification);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumAuthShell
      mode="signin"
      eyebrow="Secure marketplace access"
      title="Welcome back."
      description="Sign in to your KAYAD account and continue buying, selling, comparing and transacting with confidence."
      adTitle="Put your next vehicle in front of ready buyers"
      adDescription="KAYAD Ads is designed for premium dealer campaigns, featured inventory, auctions and automotive brands."
    >
      {verificationRequired && (
        <div className="kayad-auth-alert" role="alert">
          <div className="kayad-auth-alert-title">Email verification required</div>
          <p>Verify your KAYAD email before signing in. If you did not receive the message, request another verification email.</p>
          <button
            type="button"
            disabled={resendingVerification}
            onClick={async () => {
              setResendingVerification(true);
              try {
                await resendVerification({ email: form.email.trim() });
                toast('If the account exists and is unverified, a new verification link has been sent.', 'success');
              } catch {
                toast('Please try again shortly.', 'error');
              } finally {
                setResendingVerification(false);
              }
            }}
            className="kayad-auth-alert-button"
          >
            {resendingVerification ? 'Sending…' : 'Resend verification email'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="kayad-auth-form">
        <div className="kayad-auth-field">
          <label htmlFor="kayad-login-email">Email address</label>
          <input
            id="kayad-login-email"
            className="kayad-auth-input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            autoComplete="email"
          />
        </div>

        <div className="kayad-auth-field">
          <div className="kayad-auth-field-row">
            <label htmlFor="kayad-login-password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="kayad-auth-password-wrap">
            <input
              id="kayad-login-password"
              className="kayad-auth-input"
              type={showPwd ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              className="kayad-auth-password-toggle"
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button className="kayad-auth-submit" type="submit" disabled={loading}>
          {loading ? <><span className="kayad-auth-spinner" /> Signing in…</> : <>Continue to KAYAD <ArrowRight size={16} /></>}
        </button>
      </form>

      <div className="kayad-auth-divider"><span>New to KAYAD?</span></div>
      <Link to="/register" className="kayad-auth-secondary-action">Create your KAYAD account</Link>

      <div className="kayad-auth-trust-row">
        <span><ShieldCheck size={14} /> Secure sessions</span>
        <span><BadgeCheck size={14} /> Verified marketplace</span>
      </div>
    </PremiumAuthShell>
  );
}

export default LoginPage;
