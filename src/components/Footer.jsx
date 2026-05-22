import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');

  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.04)',
      background: '#030303',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '56px 28px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
          gap: 40,
          marginBottom: 40,
        }} className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #A89878 0%, var(--gold) 40%, #C4B498 70%, #8A7A5E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(212,196,168,0.25)',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>K</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>KAYAD</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8, maxWidth: 300, margin: '0 0 20px' }}>
              Kenya's premium automotive marketplace. Live auctions, verified dealers, and secure M-Pesa escrow.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: '𝕏', href: '#', label: 'X / Twitter' },
                { icon: '📷', href: '#', label: 'Instagram' },
                { icon: '▶', href: '#', label: 'YouTube' },
                { icon: '💼', href: '#', label: 'LinkedIn' },
              ].map(s => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, textDecoration: 'none', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >{s.icon}</a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>Browse</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/showroom', label: 'The Gallery' },
                { to: '/auctions/calendar', label: 'Auctions' },
                { to: '/showroom', label: 'Recent Arrivals' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* For Sellers */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>For Dealers</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/register?role=dealer', label: 'List a Vehicle' },
                { to: '/dealer', label: 'Dealer Dashboard' },
                { to: '/register?role=dealer', label: 'Pricing & Plans' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Newsletter + Support */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>Stay Updated</h4>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '0 0 14px', lineHeight: 1.6 }}>
              New listings, auction alerts, and market insights.
            </p>
            <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="Your email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 13, outline: 'none',
                }} />
              <button type="submit" style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'var(--gold)', color: '#000', border: 'none',
                fontWeight: 800, fontSize: 12, cursor: 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0b84f'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'none'; }}
              >Subscribe</button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '20px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
            © {new Date().getFullYear()} Kayad Ltd. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
