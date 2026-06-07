import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.04)',
      background: '#030303',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
          gap: 40,
          marginBottom: 32,
        }} className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #A89878 0%, #E8DAC4 40%, #C4B498 70%, #8A7A5E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(212,196,168,0.25)',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>K</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#fff' }}>KAYAD</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7, maxWidth: 280, margin: 0 }}>
              Kenya's premium automotive marketplace.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Browse</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/showroom', label: 'Gallery' },
                { to: '/auctions/calendar', label: 'Auctions' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Services</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/ghost-checker', label: 'Ghost Check' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Sell */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Sell</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/register?role=dealer', label: 'List a Vehicle' },
                { to: '/dealer', label: 'Dealer Dashboard' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '16px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} Kayad Ltd.
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
