// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import { getPostAuthPath, safeRedirectPath } from '../utils/authRoutes';
import { authAPI, enableDemoMode } from '../api/api';

// Demo accounts — password is in demoData.js (bundled, not a real secret).
const DEMO_ACCOUNTS = [
  { label: 'Buyer',  email: 'buyer@kayad.space',  password: 'Kayad@Demo2026!', tint: '#3b82f6' },
  { label: 'Dealer', email: 'dealer@kayad.space', password: 'Kayad@Demo2026!', tint: 'var(--gold)' },
  { label: 'Broker', email: 'seller@kayad.space', password: 'Kayad@Demo2026!', tint: '#a855f7' },
];

function LoginPage() {
  usePageMeta('Sign In', 'Sign in to your Kayad account to buy, sell, and bid on premium cars in Kenya.');
  const { login, user, isAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeRedirectPath(location.state?.from?.pathname, '/');
  const hasRedirected = useRef(false);

  const params = new URLSearchParams(location.search);
  const verifyRequired = params.get('verify') === 'required';

  // Redirect if already authenticated (e.g. user navigated to /login manually)
  useEffect(() => {
    if (isAuth && user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate(getPostAuthPath(user, from), { replace: true });
    }
  }, [isAuth, user, navigate, from]);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form);
      toast('Welcome back!', 'success');
      navigate(getPostAuthPath(data.user, from), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      if (msg.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(form.email);
      }
      toast(msg, 'error');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail && !form.email) return;
    setResending(true);
    try {
      await authAPI.resendVerification({ email: unverifiedEmail || form.email });
      toast('Verification email sent! Check your inbox.', 'success');
    } catch {
      toast('Failed to resend. Try again later.', 'error');
    } finally {
      setResending(false);
    }
  };

  // One-click demo sign-in. Forces demo mode so the @demo.com accounts
  // resolve against the in-app dataset regardless of live-backend state.
  const handleDemoLogin = async (acct) => {
    setForm({ email: acct.email, password: acct.password });
    setLoading(true);
    try {
      enableDemoMode();
      const data = await login({ email: acct.email, password: acct.password });
      toast(`Signed in as ${acct.label} (demo)`, 'success');
      navigate(getPostAuthPath(data.user, from), { replace: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Demo sign-in failed', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
          <h2 style={{ marginBottom: 6 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your Kayad account</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          {verifyRequired && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
                Please verify your email before accessing that page. Check your inbox or request a new link below.
              </p>
              <button className="btn btn-sm" onClick={handleResend} disabled={resending} style={{ marginTop: 8 }}>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          {unverifiedEmail && !verifyRequired && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
                This email is not yet verified. Check your inbox or request a new verification link.
              </p>
              <button className="btn btn-sm" onClick={handleResend} disabled={resending} style={{ marginTop: 8 }}>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

            <div style={{ margin: '20px 0 12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '0 0 12px',
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
                  whiteSpace: 'nowrap',
                }}>
                  Or explore with a demo account
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div className="rgrid rgrid-3" style={{ gap: 8 }}>
                {DEMO_ACCOUNTS.map(acct => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => handleDemoLogin(acct)}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 12.5, fontWeight: 700,
                      cursor: loading ? 'wait' : 'pointer',
                      transition: 'all 0.18s ease',
                      fontFamily: 'var(--font-body, sans-serif)',
                    }}
                    onMouseEnter={e => {
                      if (loading) return;
                      e.currentTarget.style.borderColor = acct.tint;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: acct.tint, flexShrink: 0 }} />
                    {acct.label}
                  </button>
                ))}
              </div>
              <p style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.3)',
                textAlign: 'center', margin: '10px 0 0',
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                Demo data only — no real transactions occur.
              </p>
            </div>

            <div className="gold-line" />

            <div style={{ textAlign:'center', marginBottom:12 }}>
              <Link to="/forgot-password" style={{ color:'var(--text-muted)', fontSize:13 }}>
                Forgot your password?
              </Link>
            </div>

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Join Free</Link>
            </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
