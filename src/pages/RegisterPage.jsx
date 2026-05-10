// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep]       = useState(1); // 1=role, 2=details
  const [role, setRole]       = useState('user');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm]       = useState({
    name: '', email: '', password: '', phone: '',
    businessName: '', location: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      await register({ ...form, role });
      toast('Account created! Welcome to Gari Motors 🚗', 'success');
      navigate(role === 'dealer' ? '/dealer' : '/');
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
          <h2 style={{ marginBottom: 6 }}>Create Your Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Join Kenya's premium car marketplace</p>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="card" style={{ padding: 32 }}>
            <h3 style={{ marginBottom: 20, textAlign: 'center' }}>I am a...</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { val: 'user',   icon: '👤', title: 'Car Buyer',   desc: 'Browse listings, bid on auctions, and buy cars.' },
                { val: 'dealer', icon: '🏪', title: 'Car Dealer',  desc: 'List inventory, run live auctions, and grow your business.' },
              ].map(r => (
                <div
                  key={r.val}
                  onClick={() => setRole(r.val)}
                  style={{
                    background: role === r.val ? 'var(--gold-glow)' : 'var(--surface)',
                    border: `2px solid ${role === r.val ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: '18px 20px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.desc}</div>
                  </div>
                  {role === r.val && (
                    <div style={{ marginLeft: 'auto', color: 'var(--gold)', fontWeight: 700, fontSize: 18 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
            <button className="btn btn-gold btn-full btn-lg" onClick={() => setStep(2)}>
              Continue →
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign In</Link>
            </p>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setStep(1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                ← Back
              </button>
              <span className={`badge ${role === 'dealer' ? 'badge-gold' : 'badge-blue'}`}>
                {role === 'dealer' ? '🏪 Dealer' : '👤 Buyer'}
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input" placeholder="John Kamau" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>

              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>

              <div className="input-group">
                <label className="input-label">Phone (M-Pesa Number)</label>
                <div className="mpesa-wrap">
                  <span className="mpesa-prefix">🇰🇪</span>
                  <input className="input" placeholder="0712 345 678" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {role === 'dealer' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Business Name</label>
                    <input className="input" placeholder="ABC Motors Ltd" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location / City</label>
                    <input className="input" placeholder="Nairobi, Westlands" value={form.location} onChange={e => set('location', e.target.value)} />
                  </div>
                </>
              )}

              {role === 'dealer' && (
                <div style={{ background: 'rgba(200,150,42,0.08)', border: '1px solid rgba(200,150,42,0.15)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  ⚠ Dealer accounts require admin approval. You can still log in and prepare listings while awaiting approval.
                </div>
              )}

              <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating...</> : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
