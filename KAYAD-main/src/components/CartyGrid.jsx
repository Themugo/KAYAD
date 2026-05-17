import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Gauge, ChevronRight } from 'lucide-react';

function firstImage(car) {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    if (typeof img === 'string' && img) return img;
    if (img?.url) return img.url;
  }
  return null;
}

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=2070&auto=format&fit=crop';

const TIER_CONFIG = {
  standard:  { label: 'Standard',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)',  icon: '▫' },
  verified:  { label: 'Verified',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '✓' },
  premium:   { label: 'Premium',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  icon: '✦' },
  enterprise:{ label: 'Enterprise',color: '#d4a837', bg: 'rgba(212,168,55,0.2)',  icon: '◆' },
};

function TrustBadge({ dealer, compact }) {
  if (!dealer) return null;
  const tier = TIER_CONFIG[dealer.tier] || TIER_CONFIG.standard;
  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        color: tier.color, fontSize: 7, fontWeight: 700, letterSpacing: '0.02em',
      }}>
        {tier.icon} {tier.label}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: tier.bg, color: tier.color,
      borderRadius: 4, padding: '2px 6px',
      fontSize: 8, fontWeight: 700, letterSpacing: '0.03em',
    }}>
      {tier.icon} {tier.label}
    </span>
  );
}

export default function CartyGrid({ car, listView }) {
  if (!car) return null;

  const isElite = car.auctionStatus === 'live' || car.allowBid || car.isAuction;
  const isLive = car.auctionStatus === 'live';
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const img = firstImage(car) || FALLBACK;
  const city = car.location?.city || car.location || 'Nairobi';
  const d = car.dealer || {};
  const escrowProtected = d.escrowMandatory || car.allowBuy;
  const tierInfo = TIER_CONFIG[d.tier] || TIER_CONFIG.standard;

  if (listView) {
    return (
      <Link to={linkTo} className="block no-underline group">
        <div className="flex items-stretch bg-[#0A0A0A] border-b border-white/[0.06] group-last:border-b-0 transition-all duration-300 hover:bg-white/[0.015]">
          <div className="relative w-44 shrink-0 overflow-hidden">
            <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {d.verified && (
                <div style={{ background: 'rgba(59,130,246,0.85)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: '#fff', fontSize: 6, fontWeight: 700 }}>✓ Verified</span>
                </div>
              )}
              {escrowProtected && (
                <div style={{ background: 'rgba(212,168,55,0.85)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: '#000', fontSize: 6, fontWeight: 700 }}>🔒 Escrow</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-2.5 min-w-0">
            <div className="min-w-0 mr-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
                <h3 className="text-white text-[9px] font-bold uppercase tracking-tight leading-tight group-hover:text-gold transition-colors duration-300 truncate">
                  {car.title}
                </h3>
                <TrustBadge dealer={d} compact />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {car.mileage && (
                  <div className="flex items-center gap-1 text-zinc-500 font-bold text-[6px] uppercase whitespace-nowrap">
                    <Gauge size={7} className="text-gold" /> {car.mileage} KM
                  </div>
                )}
                <div className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                <div className="flex items-center gap-1 text-zinc-500 font-bold text-[6px] uppercase whitespace-nowrap">
                  <MapPin size={7} className="text-gold" /> {city}
                </div>
                {car.year && (
                  <>
                    <div className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                    <span className="text-zinc-500 font-bold text-[6px] uppercase whitespace-nowrap">{car.year}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-zinc-600 text-[5px] font-black uppercase tracking-[0.2em]">{isElite ? 'Current Bid' : 'Price'}</p>
              <p className="text-[9px] font-black italic text-white tracking-tighter whitespace-nowrap">
                <span className="text-gold text-[7px] mr-0.5 italic">KES</span> {Number(car.price || car.currentBid || 0).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-center w-5 h-5 bg-white/5 text-white rounded group-hover:bg-gold group-hover:text-black transition-all duration-300 ml-1.5 shrink-0">
              <ChevronRight size={9} />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={linkTo} className="block no-underline group">
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-300 hover:border-gold/30 hover:shadow-[0_0_40px_rgba(212,175,55,0.06)]">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={img}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            alt=""
          />
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {d.verified && (
              <div style={{ background: 'rgba(59,130,246,0.85)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ color: '#fff', fontSize: 6, fontWeight: 700 }}>✓ Verified</span>
              </div>
            )}
            {escrowProtected && (
              <div style={{ background: 'rgba(212,168,55,0.85)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ color: '#000', fontSize: 6, fontWeight: 700 }}>🔒 Escrow</span>
              </div>
            )}
            {isElite && (
              <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(212,168,55,0.2)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ShieldCheck size={7} style={{ color: 'var(--gold)' }} />
                <span style={{ color: '#fff', fontSize: 6, fontWeight: 700 }}>{isLive ? 'Live' : 'Elite'}</span>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2">
            <TrustBadge dealer={d} compact />
          </div>
        </div>

        <div className="px-2.5 pb-2.5 pt-1.5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <h3 className="text-white text-[8px] font-black uppercase tracking-tight leading-tight group-hover:text-gold transition-colors duration-300 truncate">
              {car.title}
            </h3>
            {d.trustScore && (
              <span style={{
                fontSize: 6, fontWeight: 700, color: d.trustScore >= 80 ? '#22c55e' : d.trustScore >= 60 ? '#eab308' : '#ef4444',
                whiteSpace: 'nowrap',
              }}>
                {d.trustScore}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {car.mileage && (
              <div className="flex items-center gap-1 text-zinc-500 font-bold text-[5px] uppercase whitespace-nowrap">
                <Gauge size={6} className="text-gold" /> {car.mileage} KM
              </div>
            )}
            <div className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
            <div className="flex items-center gap-1 text-zinc-500 font-bold text-[5px] uppercase whitespace-nowrap">
              <MapPin size={6} className="text-gold" /> {city}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/[0.06]">
            <p className="text-[8px] font-black italic text-white tracking-tighter">
              <span className="text-gold text-[6px] mr-0.5 italic">KES</span> {Number(car.price || car.currentBid || 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-center w-4 h-4 bg-white text-black rounded group-hover:bg-gold transition-all duration-300 shrink-0">
              <ChevronRight size={8} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
