import { useState, useEffect } from 'react';
import { partnersAPI } from '../../../api/api';

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnersAPI.list()
      .then(data => setPartners(Array.isArray(data) ? data.filter(p => p.published !== false) : []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || partners.length === 0) return null;

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
          {[...partners, ...partners].map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex items-center gap-3 px-5 py-3 rounded-lg border whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {p.logo ? (
                <img src={p.logo} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                  {p.name[0]}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-white/80">{p.name}</div>
                {p.category && <div className="text-[10px] text-white/30">{p.category}</div>}
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
