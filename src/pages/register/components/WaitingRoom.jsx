import { Link } from 'react-router-dom';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
import { isDemoMode } from '../../../api/api';

export default function WaitingRoom({ user, onLogout }) {
  const isSellerPending = user?.role === 'dealer' || user?.role === 'broker' || user?.role === 'individual_seller';
  const statusSteps = isSellerPending
    ? [
      { icon: '✅', label: 'Account created', done: true },
      { icon: '📋', label: 'Application submitted', done: true },
      { icon: '🔍', label: 'Under admin review', done: false, active: true },
      { icon: '🚀', label: 'Approved — go live', done: false },
    ]
    : [
      { icon: '✅', label: 'Account created', done: true },
      { icon: '📧', label: 'Verify your email', done: false, active: true },
      { icon: '🚀', label: 'Start browsing', done: false },
    ];

  return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
        {isSellerPending ? (
          <>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '2px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse 2s infinite' }}>
              <Clock size={32} style={{ color: '#f97316' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#fff', marginBottom: 8 }}>
              Application <span style={{ color: '#f97316' }}>Under Review</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.8, maxWidth: 400, margin: '0 auto 36px' }}>
              Hi <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{user?.name?.split(' ')[0]}</strong>, your{' '}
              {user?.role === 'dealer' ? 'dealer' : 'seller'} application has been received.
              Our team will review it and notify you by email — usually within 24 hours.
            </p>
            <div style={{ background: 'rgba(212,196,168,0.05)', border: '1px solid rgba(212,196,168,0.12)', borderRadius: 12, padding: '18px 22px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: 10 }}>What happens next?</div>
              {[
                'Our HR team will verify your business details',
                'You\'ll receive an approval email at ' + (user?.email || 'your email'),
                'Once approved, you can list cars and access the Dealer Hub',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0 }}>→</span>{item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Mail size={36} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#fff', marginBottom: 8 }}>
              {isDemoMode() ? <>Demo <span style={{ color: '#f97316' }}>Mode</span></> : <>Verify Your <span style={{ color: '#3b82f6' }}>Email</span></>}
            </div>
            {isDemoMode() ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.8, maxWidth: 420, margin: '0 auto 36px' }}>
                You're in <strong style={{ color: '#f97316' }}>demo mode</strong> — email sending is simulated.
                Your account is ready to use. You can log in with your credentials or use the demo quick-login buttons on the login page.
              </p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.8, maxWidth: 400, margin: '0 auto 36px' }}>
                Hi <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{user?.name?.split(' ')[0]}</strong>, we sent a verification link to{' '}
                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.email}</strong>.
                Please check your inbox (and spam) and click the link to activate your account.
              </p>
            )}
          </>
        )}

        <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 28, textAlign: 'left' }}>
          {statusSteps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < statusSteps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                background: s.done ? 'rgba(34,197,94,0.12)' : s.active ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: s.done ? '1px solid rgba(34,197,94,0.25)' : s.active ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
                {s.active ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'block', animation: 'pulse 1.5s infinite' }} /> : s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: s.done || s.active ? 700 : 500, color: s.done ? '#22c55e' : s.active ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
                  {s.label}
                </div>
              </div>
              {s.done && <ShieldCheck size={14} style={{ color: '#22c55e', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/" style={{ padding: '11px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Browse Gallery
          </Link>
          {!isSellerPending && (
            <Link to="/login" style={{ padding: '11px 24px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#3b82f6', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Go to Login
            </Link>
          )}
          <button onClick={onLogout} style={{ padding: '11px 24px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
