import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTab(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    onLogin({ name: form.name || form.email.split('@')[0], email: form.email });
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/favicon.svg" alt="Gari Motors" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gari Motors</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Kenya's Premium Car Marketplace</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>Join Free</button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem', color: 'var(--red-400)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. James Mwangi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {tab === 'signup' && (
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+254 7XX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>
              Password
              {tab === 'signin' && (
                <a href="#" style={{ float: 'right', fontSize: '0.78rem', color: 'var(--gold-500)', fontWeight: 500 }}>
                  Forgot password?
                </a>
              )}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={tab === 'signup' ? 'Min 8 characters' : 'Your password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin-slow 0.6s linear infinite', display: 'inline-block' }} />
                {tab === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              tab === 'signup' ? 'Create Free Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="form-divider">or continue with</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="social-btn" style={{ flex: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button className="social-btn" style={{ flex: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.42.07 2.4.83 3.22.84.9.02 2.54-.96 4.09-.8 1.7.18 2.97.93 3.71 2.36-3.16 1.92-2.42 6.3.98 7.48-.66 1.78-1.55 3.43-4 3zm-4.99-14.9c-.12-2.3 1.78-4.17 3.95-4.38.3 2.49-2.1 4.43-3.95 4.38z"/></svg>
            Apple
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          By continuing, you agree to our{' '}
          <a href="#" style={{ color: 'var(--gold-500)' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: 'var(--gold-500)' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
