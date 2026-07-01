import { Link } from 'react-router-dom';
import { Shield, MapPin, Star, ArrowRight } from 'lucide-react';

export default function FeaturedDealers({ dealers = [] }) {
  if (dealers.length === 0) return null;

  const top = dealers.slice(0, 3);

  return (
    <section className="py-14 md:py-18">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display font-black italic text-[clamp(1.4rem,2.5vw,2rem)] text-white leading-none m-0">
              Trusted <span className="text-gold">Dealers</span>
            </h2>
          </div>
          <Link to="/showroom" className="section-link">View All <ArrowRight size={12} /></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {top.map((d) => (
            <Link key={d._id} to={`/dealer/${d._id}`} className="group no-underline">
              <div className="rounded-xl overflow-hidden border h-full transition-all duration-300 hover:border-gold/30 group-hover:-translate-y-1"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="p-6" style={{ background: 'linear-gradient(135deg, rgba(212,196,168,0.06) 0%, transparent 100%)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-gold border"
                      style={{ background: 'rgba(212,196,168,0.08)', borderColor: 'rgba(212,196,168,0.15)' }}>
                      {d.logo ? <img src={d.logo} alt={d.name} className="w-full h-full rounded-xl object-cover" /> : (d.name || 'D')[0]}
                    </div>
                    <div>
                      <div className="font-display font-bold text-white text-base mb-0.5">{d.name}</div>
                      {d.location && <div className="flex items-center gap-1 text-xs text-white/40"><MapPin size={10} /> {d.location}</div>}
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-gold" />
                      <span className="text-xs text-white/60">Trust Score <strong className="text-white">{d.trustScore || '—'}%</strong></span>
                    </div>
                    {d.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star size={11} className="text-gold" fill="var(--gold)" />
                        <span className="text-white/60">{d.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <span className="text-xs text-white/40">{d.completedSales || 0} sales</span>
                    <span className="text-xs text-gold font-semibold flex items-center gap-1">View Profile <ArrowRight size={11} /></span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
