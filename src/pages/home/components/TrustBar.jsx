import { ShieldCheck, Search, FileCheck, Ban } from 'lucide-react';

const TRUST_CARDS = [
  { icon: ShieldCheck, title: 'Verified Listings', desc: 'Every vehicle is vetted for authenticity. No fake listings, no scams, no wasted time.' },
  { icon: FileCheck, title: 'Escrow Protection', desc: 'Funds held securely by KAYAD until you confirm delivery. Your money stays safe.' },
  { icon: Search, title: 'Professional Inspection', desc: '150-point forensic inspection on every vehicle. Know exactly what you\'re buying.' },
  { icon: Ban, title: 'Fraud Prevention', desc: 'Multi-layer verification, KYC checks, and fraud detection protect every transaction.' },
];

export default function TrustSection() {
  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
      <div className="max-w-[1200px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="text-center" style={{ marginBottom: 'clamp(32px, 4vw, 56px)' }}>
          <h2 className="font-display font-bold italic" style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
            color: '#fff',
            marginBottom: '10px',
            letterSpacing: '-0.01em',
          }}>
            Buy with <span style={{ color: 'var(--gold)' }}>Confidence</span>
          </h2>
          <p className="font-body" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '480px', margin: '0 auto' }}>
            Every feature is designed to protect buyers and sellers.
          </p>
        </div>
        <div className="grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'clamp(16px, 2vw, 24px)',
        }}>
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="trust-card" style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '32px 28px',
                transition: 'border-color 0.3s, transform 0.3s',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(212,196,168,0.08)',
                  border: '1px solid rgba(212,196,168,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px',
                }}>
                  <Icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic',
                  fontSize: '16px', color: '#fff', marginBottom: '8px', lineHeight: 1.3,
                }}>
                  {card.title}
                </h3>
                <p className="font-body" style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0,
                }}>
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .trust-card:hover { border-color: rgba(212,196,168,0.25) !important; transform: translateY(-2px); }
        @media (max-width: 768px) { section > div { padding: 0 24px !important; } }
        @media (max-width: 480px) { section > div { padding: 0 16px !important; } }
      `}</style>
    </section>
  );
}
