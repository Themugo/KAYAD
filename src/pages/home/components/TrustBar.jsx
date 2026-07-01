import { ShieldCheck, FileCheck, Search, Ban } from 'lucide-react';

const TRUST_CARDS = [
  { icon: FileCheck, title: 'Escrow Protected', desc: 'Funds held securely until delivery confirmed.' },
  { icon: Search, title: 'Pre-Inspected', desc: 'Professional inspection on every vehicle.' },
  { icon: ShieldCheck, title: 'Verified Dealers', desc: 'KRA-verified and phone-verified dealers only.' },
  { icon: Ban, title: 'Live Auction', desc: 'Real-time bidding on premium vehicles.' },
];

export default function TrustSection() {
  return (
    <section style={{ padding: 'clamp(32px, 4vw, 48px) 0' }}>
      <div className="max-w-[1200px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="text-center" style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
          <h2 className="font-display font-bold italic" style={{
            fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
            color: '#fff',
            marginBottom: '8px',
            letterSpacing: '-0.01em',
          }}>
            Buy with <span style={{ color: 'var(--gold)' }}>Confidence</span>
          </h2>
        </div>
        <div className="grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'clamp(12px, 1.5vw, 20px)',
        }}>
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="trust-card" style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px 20px',
                transition: 'border-color 0.3s, transform 0.3s',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(212,196,168,0.08)',
                  border: '1px solid rgba(212,196,168,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Icon size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic',
                  fontSize: '14px', color: '#fff', marginBottom: '6px', lineHeight: 1.3,
                }}>
                  {card.title}
                </h3>
                <p className="font-body" style={{
                  fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0,
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
        @media (max-width: 1024px) {
          .grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) { 
          section > div { padding: 0 24px !important; }
          .grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) { 
          section > div { padding: 0 16px !important; }
          .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
