import { Search, FileCheck, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const BUY_STEPS = [
  { icon: Search, label: 'Search', desc: 'Browse our curated marketplace of verified vehicles.' },
  { icon: FileCheck, label: 'Inspect', desc: '150-point forensic inspection before you commit.' },
  { icon: ShieldCheck, label: 'Escrow', desc: 'Funds held securely until delivery is confirmed.' },
  { icon: Truck, label: 'Deliver', desc: 'Receive your vehicle with complete peace of mind.' },
];

const SELL_STEPS = [
  { icon: Search, label: 'List', desc: 'Create your listing in minutes with our simple form.' },
  { icon: FileCheck, label: 'Verify', desc: 'Pass our verification process to build buyer trust.' },
  { icon: ShieldCheck, label: 'Sell', desc: 'Receive offers with escrow-protected payments.' },
  { icon: Truck, label: 'Transfer', desc: 'Complete the transfer. Funds released instantly.' },
];

export default function BuyingJourney() {
  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
      <div className="max-w-[1200px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="text-center" style={{ marginBottom: 'clamp(36px, 4vw, 56px)' }}>
          <h2 className="font-display font-bold italic" style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: '#fff',
            marginBottom: '10px', letterSpacing: '-0.01em',
          }}>
            Simple <span style={{ color: 'var(--gold)' }}>Process</span>
          </h2>
          <p className="font-body" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '480px', margin: '0 auto' }}>
            Whether you're buying or selling, we keep it straightforward.
          </p>
        </div>

        <div className="grid md:grid-cols-2" style={{ gap: 'clamp(32px, 4vw, 56px)' }}>
          {/* Buy Path */}
          <div>
            <h3 className="font-body" style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', marginBottom: '24px',
            }}>
              For Buyers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {BUY_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-start" style={{ gap: '16px', padding: '16px 0', position: 'relative' }}>
                  {i < BUY_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '18px', top: '48px', bottom: '-8px',
                      width: '1px', background: 'rgba(212,196,168,0.15)',
                    }} />
                  )}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}>
                    <step.icon size={16} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: '14px', color: '#fff', marginBottom: '3px' }}>{step.label}</div>
                    <div className="font-body" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sell Path */}
          <div>
            <h3 className="font-body" style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', marginBottom: '24px',
            }}>
              For Sellers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {SELL_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-start" style={{ gap: '16px', padding: '16px 0', position: 'relative' }}>
                  {i < SELL_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '18px', top: '48px', bottom: '-8px',
                      width: '1px', background: 'rgba(212,196,168,0.15)',
                    }} />
                  )}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}>
                    <step.icon size={16} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: '14px', color: '#fff', marginBottom: '3px' }}>{step.label}</div>
                    <div className="font-body" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center" style={{ marginTop: 'clamp(32px, 4vw, 48px)' }}>
          <Link to="/showroom" className="font-body" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 32px', borderRadius: '100px', fontSize: '13px',
            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid rgba(212,196,168,0.2)',
            color: 'var(--gold)', textDecoration: 'none', transition: 'all 0.2s',
          }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.06)'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            Get Started
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
