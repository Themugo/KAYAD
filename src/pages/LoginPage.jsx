// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import { getPostAuthPath, safeRedirectPath } from '../utils/authRoutes';
import { authAPI } from '../api/api';

const DEMO_ACCOUNTS = [
  { role: 'admin',  label: 'Admin',   color: '#ef4444' },
  { role: 'dealer', label: 'Dealer',  color: '#f59e0b' },
  { role: 'seller', label: 'Seller',  color: '#3b82f6' },
  { role: 'buyer',  label: 'Buyer',   color: '#22c55e' },
];

function LoginPage() {
  usePageMeta('Sign In', 'Sign in to your Kayad account to buy, sell, and bid on premium cars in Kenya.');
  const { login, demoLogin, user, isAuth } = useAuth();
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
      const targetPath = getPostAuthPath(user, from);
      // Prevent redirect loop: don't redirect if already on the target path
      if (targetPath !== location.pathname) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [isAuth, user, navigate, from, location.pathname]);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');
  const [resending, setResending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form);
      toast('Welcome back!', 'success');
      const targetPath = getPostAuthPath(data.user, from);
      if (targetPath !== location.pathname) {
        navigate(targetPath, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      if (msg.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(form.email);
      }
      toast(msg, 'error');
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setDemoLoading(role);
    try {
      const data = await demoLogin(role);
      const targetPath = getPostAuthPath(data.user, from);
      navigate(targetPath, { replace: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Demo login failed. Was the server seeded?', 'error');
      setDemoLoading('');
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail && !form.email) return;
    setResending(true);
    try {
      await authAPI.resendVerification({ email: unverifiedEmail || form.email });
      toast('Verification email sent! Check your inbox.', 'success');
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      toast('Failed to resend. Try again later.', 'error');
    } finally {
      setResending(false);
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
                <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
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


            <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                Quick Demo Access
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {DEMO_ACCOUNTS.map(a => (
                  <button key={a.role} type="button" onClick={() => handleDemoLogin(a.role)} disabled={!!demoLoading}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
                      background: demoLoading === a.role ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: a.color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: demoLoading && demoLoading !== a.role ? 0.4 : 1,
                    }}>
                    {demoLoading === a.role ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Loading...</> : `Demo ${a.label}`}
                  </button>
                ))}
              </div>
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
