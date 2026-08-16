import { Link } from 'react-router-dom';

const PILLARS = [
  {
    title: 'Live Auctions',
    desc: 'Real-time bidding with automatic time extensions and snipe protection. Every bid, every second counts.',
    cta: 'Bid Now',
    href: '/auctions/calendar',
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
    href: '/escrow-vault',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'Verified Dealers',
    desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers. Transparency you can trust.',
    cta: 'Explore',
    href: '/showroom',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" /><path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" />
      </svg>
    ),
  },
];

export default function HomeFeaturePillars() {
  return (
    <section className="border-t border-white/4 py-12 md:py-16">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="grid gap-px rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))' }}>
          {PILLARS.map((p, i) => (
            <div key={i} className="p-8 md:p-9 relative overflow-hidden bg-[#080808]">
              <div className="absolute inset-0 pointer-events-none" style={{ background: i === 0 ? 'rgba(212,196,168,0.04)' : 'transparent' }} />
              <div className="relative z-[1]">
                <div className="mb-3">{p.icon}</div>
                <div className="font-display font-black italic text-[1rem] text-white mb-1.5">{p.title}</div>
                <p className="text-[12px] text-white/35 leading-relaxed mb-4 m-0">{p.desc}</p>
                <Link to={p.href} className="text-[10px] text-gold font-bold no-underline tracking-[0.06em] uppercase"
                >{p.cta} →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
