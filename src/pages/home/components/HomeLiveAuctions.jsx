import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
    <section className="py-8 md:py-10">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 text-[8px] text-red-500 font-bold tracking-[0.12em] uppercase">
                <span className="w-1 h-1 rounded-full bg-red-500 block animate-pulse" />
                Live Now
              </span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
              Live <span className="text-gold">Auctions</span>
            </h2>
          </div>
          <Link to="/auctions/calendar" className="text-[11px] text-red-500/70 font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-red-500"
          >View All Auctions →</Link>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {cars.map(car => {
            const endTime = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
            return (
              <div key={car._id} className="relative">
                <div className="absolute top-2 left-2 z-[2] flex items-center gap-1.5 rounded-md px-2.5 py-1" style={{ background: 'rgba(212,196,168,0.9)' }}>
                  <span className="w-1 h-1 rounded-full bg-red-500 block animate-pulse" />
                  <span className="text-[8px] text-black font-extrabold tracking-[0.06em]">LIVE</span>
                  <span className="text-[8px] text-black/70 font-semibold ml-0.5">
                    <LiveCountdown endTime={endTime} />
                  </span>
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
