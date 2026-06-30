import { Link } from 'react-router-dom';
import { Star, Shield, CheckCircle, TrendingUp, MapPin, Award } from 'lucide-react';

function TrustBadge({ score }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
      style={{
        background: score >= 90 ? 'rgba(34,197,94,0.12)' : score >= 70 ? 'rgba(212,196,168,0.12)' : 'rgba(239,68,68,0.12)',
        color: score >= 90 ? 'var(--success)' : score >= 70 ? 'var(--gold)' : 'var(--danger)',
      }}
    >
      <Shield size={9} />
      {score}% Trust
    </div>
  );
}

export default function FeaturedDealers({ dealers = [] }) {
  if (dealers.length === 0) return null;
  const top = dealers.slice(0, 3);

  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Trusted Network</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Top-Rated <span className="text-gold">Dealers</span>
            </h2>
          </div>
          <Link to="/showroom" className="section-link">View All →</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {top.map((d, i) => (
            <Link key={d._id} to={`/dealer/${d._id}`} className="block no-underline group">
              <div className="rounded-xl overflow-hidden border transition-all duration-300 h-full"
                style={{
                  background: 'var(--card)',
                  borderColor: i === 0 ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-lg font-bold text-gold border border-gold/20">
                        {(d.name || 'D')[0]}
                      </div>
                      <div>
                        <div className="font-display font-bold text-white text-sm">{d.name}</div>
                        {d.location && (
                          <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                            <MapPin size={10} /> {d.location}
                          </div>
                        )}
                      </div>
                    </div>
                    {i === 0 && <Award size={16} className="text-gold" />}
                  </div>

                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {d.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star size={11} className="text-gold" fill="var(--gold)" />
                        <span className="text-white font-semibold">{d.rating}</span>
                      </div>
                    )}
                    {d.trustScore && <TrustBadge score={d.trustScore} />}
                    {d.yearsActive && (
                      <span className="text-xs text-white/40">{d.yearsActive} yrs active</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {d.completedSales > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle size={10} className="text-success" /> {d.completedSales} sold
                      </span>
                    )}
                    {d.carCount > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp size={10} /> {d.carCount} listed
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold tracking-wide"
                    style={{ background: 'rgba(212,196,168,0.08)', color: 'var(--gold)' }}
                  >
                    <Shield size={11} /> Verified Dealer
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
