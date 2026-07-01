import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const TRUST_INDICATORS = [
  'Escrow Protected',
  '150-Point Inspection',
  'Verified Dealers',
];

export default function HomeHero({ liveCount, isAuth, user }) {

  return (
    <section className="home-hero-section" style={{
      height: '70vh', minHeight: '480px', position: 'relative', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div className="max-w-[1400px] mx-auto h-full" style={{ padding: '0 48px' }}>
        <div className="flex h-full items-center">
          {/* ─── Content ─── */}
          <div className="hero-content" style={{ maxWidth: '800px', zIndex: 2, position: 'relative' }}>
            <div>
              <h1 className="font-display font-black italic" style={{
                fontSize: 'clamp(2rem, 4vw, 3.6rem)',
                lineHeight: 1.05,
                color: '#fff',
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}>
                Buy and Sell Vehicles<br />
                <span style={{ color: 'var(--gold)' }}>With Complete Confidence</span>
              </h1>
              <p className="font-body" style={{
                fontSize: 'clamp(0.9rem, 1.1vw, 1.05rem)',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                marginBottom: '32px',
                maxWidth: '580px',
              }}>
                Every transaction secured by mandatory escrow. East Africa's most trusted way to buy and sell premium vehicles.
              </p>
            </div>

            <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
              <Link to="/showroom" className="btn-gold" style={{
                padding: '14px 36px', borderRadius: '100px', fontSize: '13px',
                fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                Browse Vehicles
              </Link>
              <Link to="/sell" className="btn-outline-gold" style={{
                padding: '14px 36px', borderRadius: '100px', fontSize: '13px',
                fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                border: '1px solid rgba(212,196,168,0.25)', color: 'var(--gold)',
                transition: 'all 0.2s',
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.08)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                Sell Your Vehicle
              </Link>
            </div>

            <div className="flex items-center gap-5 flex-wrap">
              {TRUST_INDICATORS.map(text => (
                <div key={text} className="flex items-center gap-1.5">
                  <ShieldCheck size={14} style={{ color: 'rgba(212,196,168,0.5)' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-hero-section { height: 60vh !important; min-height: 420px !important; }
          .home-hero-section > div { padding: 0 24px !important; }
        }
        @media (max-width: 768px) {
          .home-hero-section { height: auto !important; min-height: 0 !important; padding: 48px 0 32px; }
          .hero-content { max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .home-hero-section { padding: 36px 0 24px; }
          .home-hero-section > div { padding: 0 16px !important; }
        }
        .btn-outline-gold:hover { background: rgba(212,196,168,0.08) !important; }
      `}</style>
    </section>
  );
}
