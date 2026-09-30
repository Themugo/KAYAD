import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthApiError, resendVerification } from '../services/authApi';

export function LoginPage() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setVerificationRequired(false);
      const data = await login(form);
      toast('Welcome back! 🚗', 'success');
      const u = data.user || user;
      const role = u?.role;
      if (u?.mustChangePassword) {
        navigate('/force-password-change', { replace: true }); return;
      }
      const dest = role === 'dealer' ? '/dealer' : role === 'admin' || role === 'superadmin' ? '/admin' : from;
      navigate(dest, { replace: true });
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : err?.response?.data?.message || 'Unable to sign in. Please try again.';
      const requiresVerification = err instanceof AuthApiError && err.status === 403 && /verify your email/i.test(err.message);
      setVerificationRequired(requiresVerification);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <div style={{ fontSize: 40, marginBottom: 'var(--space-3)' }}>🚗</div>
          <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Sign in to your KAYAD account</p>
        </div>

        <div className="card" style={{ padding: 'var(--space-8)' }}>
          {verificationRequired && (
            <div style={{ marginBottom: 'var(--space-5)', padding: '14px 16px', border: '1px solid #f5d48a', borderRadius: 14, background: '#fffbeb' }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: 6 }}>Email verification required</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.5, marginBottom: 10 }}>Verify your KAYAD email before signing in. If you did not receive the message, request another verification email.</p>
              <button type="button" disabled={resendingVerification} onClick={async () => { setResendingVerification(true); try { await resendVerification({ email: form.email.trim() }); toast('If the account exists and is unverified, a new verification link has been sent.', 'success'); } catch { toast('Please try again shortly.', 'error'); } finally { setResendingVerification(false); } }} className="btn btn-full" style={{ border: '1px solid #e6c56b', background: '#fff', color: '#7a5a00' }}>
                {resendingVerification ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack">
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="input-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--gold)', fontWeight: 600 }}>Forgot password?</Link>
              </div>
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
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="gold-line" style={{ margin: 'var(--space-6) 0' }} />

          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Join Free</Link>
          </p>
        </div>

        {/* Trust messaging */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', label: 'Secure login' },
            { icon: '🛡️', label: 'Escrow protected' },
            { icon: '✓', label: '500+ verified dealers' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
