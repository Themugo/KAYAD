import { Link } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { Shield, Car, Gavel, Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const { branding } = useBranding();

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="section-container py-12 lg:py-16">
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 32, marginBottom: 32 }} className="footer-grid">
          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, textDecoration: 'none' }}>
              {branding?.logoType === 'image' && branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.logoText || 'KAYAD'} style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover' }} decoding="async" />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #A89878 0%, #E8DAC4 40%, #C4B498 70%, #8A7A5E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(212,196,168,0.25)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>{(branding?.logoText || 'KAYAD')[0]}</span>
                </div>
              )}
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: '#fff' }}>{branding?.logoText || 'KAYAD'}</span>
            </Link>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7, maxWidth: 260, margin: '0 0 16px' }}>Kenya's premium automotive marketplace. Buy, sell, and bid with confidence.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="#" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><Facebook size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></a>
              <a href="#" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><Twitter size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></a>
              <a href="#" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><Instagram size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></a>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Browse</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/showroom', label: 'All Vehicles' },
                { to: '/auctions/calendar', label: 'Live Auctions' },
                { to: '/showroom?category=suv', label: 'SUVs' },
                { to: '/showroom?category=sedan', label: 'Sedans' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Services</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/escrow-vault', label: 'Escrow Vault' },
                { to: '/pre-inspection', label: 'Pre-Inspection' },
                { to: '/compare', label: 'Compare Vehicles' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
                { to: '/seller/support', label: 'Help Center' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>&copy; {new Date().getFullYear()} Kayad Ltd. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> support@kayad.co.ke
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> +254 700 000 000
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
