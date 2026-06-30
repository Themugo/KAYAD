const PARTNERS = [
  { name: 'Equity Bank', category: 'Bank' },
  { name: 'KCB Bank', category: 'Bank' },
  { name: 'Co-op Bank', category: 'Bank' },
  { name: 'Absa Kenya', category: 'Bank' },
  { name: 'Jubilee Insurance', category: 'Insurance' },
  { name: 'GA Insurance', category: 'Insurance' },
  { name: 'Toyota Kenya', category: 'Dealer Group' },
  { name: 'CFAO Motors', category: 'Dealer Group' },
  { name: 'AutoXpress', category: 'Logistics' },
  { name: 'NTSA', category: 'Inspection' },
];

export default function Partners() {
  return (
    <section className="py-8 md:py-10 border-t border-white/[0.04] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-7 mb-5">
        <div className="text-center">
          <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">Trusted By</div>
          <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
            Our Partner <span className="text-gold">Network</span>
          </h2>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-8 animate-marquee" style={{ width: 'max-content' }}>
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-lg border whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                {p.name[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-white/80">{p.name}</div>
                <div className="text-[10px] text-white/30">{p.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
