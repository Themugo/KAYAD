import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import CartyGrid from '../../../components/CartyGrid';

function LiveCountdown({ endTime }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const tick = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) { setTimeStr('Ending soon'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeStr(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endTime]);

  return <>{timeStr}</>;
}

export default function HomeLiveAuctions({ cars, isMobile }) {
  if (!cars || cars.length === 0) return null;

  return (
    <section className="py-14 md:py-18" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display font-black italic text-[clamp(1.4rem,2.5vw,2rem)] text-white leading-none m-0">
              Featured <span className="text-gold">Auctions</span>
            </h2>
          </div>
          <Link to="/auctions/calendar" className="section-link">View All <ArrowRight size={12} /></Link>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {cars.map(car => {
            const endTime = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
            return (
              <div key={car._id} className="relative">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(4px)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] text-white font-bold tracking-[0.06em]">{LiveCountdown ? <LiveCountdown endTime={endTime} /> : 'Live'}</span>
                </div>
                <CartyGrid car={car} isMobile={isMobile} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
