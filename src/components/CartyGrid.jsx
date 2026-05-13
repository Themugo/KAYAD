import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Gauge, ChevronRight } from 'lucide-react';
import AuctionTimer from './AuctionTimer';

export default function CartyGrid({ car }) {
  if (!car) return null;

  const isElite = car.auctionStatus === 'live' || car.allowBid || car.isAuction;
  const isLive = car.auctionStatus === 'live';
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx] || car.image;
  const city = car.location?.city || car.location || 'Nairobi';

  return (
    <Link to={linkTo} className="block no-underline group">
      <div className="relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:border-gold/40 hover:shadow-[0_0_80px_rgba(212,175,55,0.1)]">
        {/* 4K Image Stage */}
        <div className="relative h-72 overflow-hidden">
          <img 
            src={img || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop'} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
            alt={car.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

          {/* Elite Badge */}
          {isElite && (
            <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-xl border border-gold/20 px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck size={14} className="text-gold" />
              <span className="text-white text-[9px] font-black uppercase tracking-widest">
                {isLive ? 'Live Auction' : 'Elite Listing'}
              </span>
            </div>
          )}

          {isLive && car.auctionEnd && (
            <div className="absolute bottom-6 left-6 z-10">
              <AuctionTimer auctionId={car._id} initialEndTime={car.auctionEnd} size="sm" />
            </div>
          )}
        </div>

        {/* Content Engine */}
        <div className="p-10 -mt-16 relative z-10">
          <div className="mb-6">
            <h3 className="text-white text-2xl font-black italic uppercase tracking-tighter leading-none group-hover:text-gold transition-colors duration-500">
              {car.title}
            </h3>
            <div className="flex items-center gap-4 mt-3">
              {car.mileage && (
                <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] uppercase">
                  <Gauge size={12} className="text-gold" /> {car.mileage} KM
                </div>
              )}
              <div className="w-1 h-1 rounded-full bg-zinc-800" />
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] uppercase">
                <MapPin size={12} className="text-gold" /> {city}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between pt-8 border-t border-white/5">
            <div>
              <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em] mb-2">
                {isElite ? 'Current Bid' : 'Acquisition Price'}
              </p>
              <p className="text-3xl font-black italic text-white tracking-tighter">
                <span className="text-gold text-lg mr-1 italic">KES</span> {Number(car.price || car.currentBid || 0).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-white text-black rounded-2xl group-hover:bg-gold transition-all duration-500 hover:rotate-12">
              <ChevronRight size={24} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
