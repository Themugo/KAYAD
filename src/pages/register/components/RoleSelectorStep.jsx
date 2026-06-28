import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROLES = [
  { val: 'user', icon: '👤', title: 'Car Buyer', desc: 'Browse listings, bid on auctions, buy securely.' },
  { val: 'dealer', icon: '🏪', title: 'Car Dealer', desc: 'Showroom business. List your inventory at scale, sell on behalf of owners, run live auctions.', badge: 'Business' },
  { val: 'individual_seller', icon: '🚗', title: 'Private Seller', desc: 'Selling your own car? List it properly — first listing free, no business account needed.', badge: 'Free' },
];

export default function RoleSelectorStep({ onSelectRole }) {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', fontStyle: 'italic', color: '#fff', textDecoration: 'none', letterSpacing: '0.04em' }}>KAYAD</Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.6rem', color: '#fff', margin: '16px 0 6px' }}>Join Kayad</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Kenya's premium automotive marketplace</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {ROLES.map(r => (
            <button key={r.val}
              onClick={() => onSelectRole(r.val)}
              style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px', borderRadius: 16, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.35)'; e.currentTarget.style.background = 'rgba(212,196,168,0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#0C0C0C'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(212,196,168,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{r.title}</span>
                  {r.badge && <span style={{ background: 'rgba(212,196,168,0.12)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 9, fontWeight: 800, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{r.badge}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{r.desc}</div>
              </div>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
