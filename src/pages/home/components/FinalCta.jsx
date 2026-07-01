import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FinalCta() {
  return (
    <section style={{
      padding: 'clamp(56px, 6vw, 88px) 0',
      background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
    }}>
      <div className="max-w-[600px] mx-auto text-center" style={{ padding: '0 48px' }}>
        <h2 className="font-display font-bold italic" style={{
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#fff',
          marginBottom: '14px', letterSpacing: '-0.01em', lineHeight: 1.1,
        }}>
          Ready to<br />
          <span style={{ color: 'var(--gold)' }}>Get Started</span>?
        </h2>
        <p className="font-body" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px', lineHeight: 1.6 }}>
          Browse hundreds of verified vehicles. Every transaction secured by escrow.
        </p>
        <div className="flex flex-wrap justify-center" style={{ gap: '12px' }}>
          <Link to="/showroom" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '15px 40px', borderRadius: '100px', fontSize: '13px',
            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: 'var(--gold)', color: '#000', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
             onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Browse Marketplace <ArrowRight size={14} />
          </Link>
          <Link to="/sell" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '15px 40px', borderRadius: '100px', fontSize: '13px',
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)',
            textDecoration: 'none', transition: 'all 0.2s',
          }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.06)'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            Sell Your Vehicle
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) { section > div { padding: 0 24px !important; } }
        @media (max-width: 480px) { section > div { padding: 0 16px !important; } }
      `}</style>
    </section>
  );
}
