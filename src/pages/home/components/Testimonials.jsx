import { ShieldCheck, X } from 'lucide-react';

const COMPARISONS = [
  { aspect: 'Payment Protection', traditional: 'No guarantee', kayad: 'Mandatory escrow on every transaction' },
  { aspect: 'Vehicle Verification', traditional: 'Trust the seller', kayad: '150-point forensic inspection' },
  { aspect: 'Dealer Vetting', traditional: 'Anyone can list', kayad: 'KRA-verified, phone-verified dealers only' },
  { aspect: 'Dispute Resolution', traditional: 'No support', kayad: 'Dedicated mediation team' },
  { aspect: 'Fraud Prevention', traditional: 'Buyer beware', kayad: 'Multi-layer fraud detection + KYC' },
  { aspect: 'Transaction Transparency', traditional: 'Limited visibility', kayad: 'Real-time tracking from offer to delivery' },
];

export default function WhyKayad() {
  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 0', background: 'var(--surface)' }}>
      <div className="max-w-[1000px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="text-center" style={{ marginBottom: 'clamp(32px, 4vw, 48px)' }}>
          <h2 className="font-display font-bold italic" style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: '#fff',
            marginBottom: '10px', letterSpacing: '-0.01em',
          }}>
            Why <span style={{ color: 'var(--gold)' }}>KAYAD</span>
          </h2>
          <p className="font-body" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '520px', margin: '0 auto' }}>
            Traditional marketplaces leave you exposed. KAYAD protects every step of the transaction.
          </p>
        </div>

        <div style={{
          border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden',
          background: 'var(--card)',
        }}>
          <div className="grid font-body" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '14px 24px', borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}></span>
            <span style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Traditional</span>
            <span style={{ color: 'var(--gold)', textAlign: 'center' }}>KAYAD</span>
          </div>
          {COMPARISONS.map((row, i) => (
            <div key={row.aspect} className="font-body" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '16px 24px', alignItems: 'center',
              borderBottom: i < COMPARISONS.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{row.aspect}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <X size={12} style={{ color: 'rgba(239,68,68,0.5)' }} /> {row.traditional}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ShieldCheck size={12} style={{ color: 'var(--gold)' }} /> {row.kayad}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          section > div { padding: 0 24px !important; }
          .grid { grid-template-columns: 1fr 1fr !important; }
          .grid > span:first-child { display: none; }
        }
        @media (max-width: 480px) { section > div { padding: 0 16px !important; } }
      `}</style>
    </section>
  );
}
