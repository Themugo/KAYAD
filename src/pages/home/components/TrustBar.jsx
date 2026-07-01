import { useState, useEffect } from 'react';
import { platformStatsAPI } from '../../../api/api';

export default function MarketStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    platformStatsAPI.get().then(setStats).catch(() => {});
  }, []);

  const items = stats ? [
    { value: (stats.totalCars || 0).toLocaleString(), label: 'Vehicles Listed' },
    { value: (stats.verifiedDealers || 0).toLocaleString(), label: 'Verified Dealers' },
    { value: (stats.escrowCount || 0).toLocaleString(), label: 'Escrow Transactions' },
    { value: (stats.liveAuctions || 0).toLocaleString() || '—', label: 'Live Auctions' },
  ] : [];

  if (items.length === 0) return null;

  return (
    <section className="border-y border-white/[0.04]">
      <div className="max-w-[1200px] mx-auto px-8 py-12 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8">
          {items.map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="font-display font-black italic text-3xl md:text-4xl text-white leading-none mb-1.5">{s.value}</div>
              <div className="text-xs text-white/40 font-medium tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
