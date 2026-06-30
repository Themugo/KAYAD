import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Star, Shield, CheckCircle, TrendingUp, MapPin, Award, Crown } from 'lucide-react';
import { adminAPI } from '../../../api/api';

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
  const [featuredIds, setFeaturedIds] = useState([]);

  useEffect(() => {
    adminAPI.getConfig()
      .then(cfg => setFeaturedIds(cfg.featuredDealerIds || []))
      .catch(() => {});
  }, []);

  if (dealers.length === 0) return null;

  let ordered = [...dealers];
  if (featuredIds.length > 0) {
    const featured = [];
    const rest = [];
    ordered.forEach(d => {
      if (featuredIds.includes(d._id)) featured.push(d);
      else rest.push(d);
    });
    ordered = [...featured, ...rest];
  }
  // Show fewer dealers with higher quality presentation
  const top = ordered.slice(0, 3);

  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Trusted Network</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Verified <span className="text-gold">Dealers</span>
            </h2>
          </div>
          <Link to="/showroom" className="section-link">View All →</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {top.map((d, i) => (
            <Link key={d._id} to={`/dealer/${d._id}`} className="block no-underline group">
              <div className="rounded-2xl overflow-hidden border transition-all duration-300 h-full"
                style={{
                  background: 'var(--card)',
                  borderColor: i === 0 ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = i === 0 ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header with logo and badge */}
                <div className="relative p-6 pb-4" style={{ background: 'linear-gradient(135deg, rgba(212,196,168,0.08) 0%, transparent 100%)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-2xl font-bold text-gold border border-gold/20 shadow-lg">
                        {d.logo ? (
                          <img src={d.logo} alt={d.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          (d.name || 'D')[0]
                        )}
                      </div>
                      <div>
                        <div className="font-display font-bold text-white text-base mb-1">{d.name}</div>
                        {d.location && (
                          <div className="flex items-center gap-1.5 text-white/50 text-xs">
                            <MapPin size={11} /> {d.location}
                          </div>
                        )}
                      </div>
                    </div>
                    {d.isSponsored && (
                      <span className="text-[9px] font-bold tracking-widest text-gold uppercase bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">Sponsored</span>
                    )}
                  </div>
                </div>

                {/* Trust metrics */}
                <div className="p-6 pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-2xl font-black text-gold mb-1">{d.trustScore || '--'}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Trust Score</div>
                    </div>
                    <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-2xl font-black text-white mb-1">{d.completedSales || 0}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Sales</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={11} /> {d.carCount || 0} vehicles
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award size={11} /> {d.yearsActive || 0} years
                    </span>
                  </div>

                  {/* Rating and verification */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    {d.rating && (
                      <div className="flex items-center gap-1.5">
                        <Star size={13} className="text-gold" fill="var(--gold)" />
                        <span className="text-white font-semibold text-sm">{d.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wide"
                      style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)' }}
                    >
                      <Shield size={11} /> Verified
                    </div>
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
