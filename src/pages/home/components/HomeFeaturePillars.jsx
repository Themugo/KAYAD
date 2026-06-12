import { Link } from 'react-router-dom';

const PILLARS = [
  {
    title: 'Live Auctions',
    desc: 'Real-time bidding with automatic time extensions and snipe protection. Every bid, every second counts.',
    cta: 'Bid Now',
    href: '/auctions/calendar',
    accent: 'rgba(212,196,168,0.06)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'Escrow Protection',
    desc: 'M-Pesa secured transactions held safely until delivery is confirmed. Your money stays protected.',
    cta: 'Learn More',
    href: '/escrow',
    accent: 'rgba(34,197,94,0.05)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'Verified Dealers',
    desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers. Transparency you can trust.',
    cta: 'Explore',
    href: '/showroom',
    accent: 'rgba(59,130,246,0.05)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" /><path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" />
      </svg>
    ),
  },
];

export default function HomeFeaturePillars() {
  return (
    <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '48px 0' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ background: '#080808', padding: '32px 28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: p.accent, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: 12 }}>{p.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1rem', color: '#fff', marginBottom: 6 }}>{p.title}</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>{p.desc}</p>
                <Link to={p.href} style={{
                  fontSize: 10, color: 'var(--gold)', fontWeight: 700, textDecoration: 'none',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {p.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
