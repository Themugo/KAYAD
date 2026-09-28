import { useState, useEffect } from 'react';
import { Gavel, Clock, Flame, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { LiveAuctionsSkeleton } from '../ui/Skeleton';
import type { FC } from 'react';

interface LiveAuctionsSectionProps {
  isLoading?: boolean;
}

export const LiveAuctionsSection: FC<LiveAuctionsSectionProps> = ({ isLoading: propsIsLoading }) => {
  const { vehicles, navigateTo, isLoading: contextIsLoading } = useMarketplace();
  const isLoading = propsIsLoading ?? contextIsLoading;

  if (isLoading) {
    return <LiveAuctionsSkeleton />;
  }

  // Filter for auction or both
  const auctionVehicles = vehicles.filter(v => v.listingType === 'auction' || v.listingType === 'both');

  const featuredAuction = auctionVehicles[0] || vehicles[0];
  const additionalAuctions = auctionVehicles.slice(1, 4).length === 3
    ? auctionVehicles.slice(1, 4)
    : vehicles.slice(1, 4);

  // Timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-14 sm:py-20 bg-[#F6FAF9] text-[#176B87] border-b border-[#D7E7E4] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-[#D7E7E4]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176B87]/10 border border-[#176B87]/20 text-[#176B87] font-mono font-bold text-xs uppercase tracking-wider">
              <Gavel className="w-3.5 h-3.5 text-[#13B8A6]" />
              <span>LIVE MARKETPLACE AUCTIONS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#176B87] font-serif tracking-tight">
              Live Auctions
            </h2>
            <p className="text-xs sm:text-sm text-[#66808A] font-sans font-medium">
              Real-time competitive bidding backed by verified escrow protection.
            </p>
          </div>

          <button
            onClick={() => navigateTo('auctions')}
            className="px-6 py-3 bg-[#176B87] hover:bg-[#0A3340] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl border border-[#176B87] shadow-md inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>View All Auctions</span>
            <ArrowRight className="w-4 h-4 text-[#13B8A6]" />
          </button>
        </div>

        {/* Featured + 3 Additional Auctions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Highlighted Featured Auction (Left - 5 Cols) */}
          {featuredAuction && (
            <div
              onClick={() => navigateTo('vehicle_detail', featuredAuction.id)}
              className="lg:col-span-5 bg-white border border-[#D7E7E4] rounded-3xl overflow-hidden hover:border-[#176B87] hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between group shadow-xs"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-900">
                <img
                  src={featuredAuction.images[0]}
                  alt={featuredAuction.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                  <span className="px-3 py-1 rounded-xl bg-[#176B87]/90 backdrop-blur-md text-[#13B8A6] font-mono font-black text-[11px] shadow-md border border-[#13B8A6]/30 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#13B8A6]" />
                    FEATURED AUCTION
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-white font-mono font-bold text-xs border border-white/20 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#13B8A6]" />
                    {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#66808A]">
                    <span className="uppercase">{featuredAuction.make} • {featuredAuction.year}</span>
                    <span className="flex items-center gap-1 text-[#13B8A6]">
                      <MapPin className="w-3 h-3" />
                      {featuredAuction.location.split(' ')[0]}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-black text-[#176B87] group-hover:text-[#13B8A6] transition-colors line-clamp-1">
                    {featuredAuction.title}
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-[#EEF7F5] border border-[#D7E7E4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#66808A] block">Current High Bid</span>
                    <span className="text-xl font-mono font-black text-[#176B87]">
                      KES {(featuredAuction.currentBid || featuredAuction.price).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {featuredAuction.bidsCount || 12} Bids
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('vehicle_detail', featuredAuction.id);
                    }}
                    className="py-3 px-4 rounded-2xl bg-[#176B87] hover:bg-[#0A3340] text-white text-xs font-mono font-black uppercase transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>Place Bid</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('vehicle_detail', featuredAuction.id);
                    }}
                    className="py-3 px-4 rounded-2xl border-2 border-[#176B87] text-[#176B87] hover:bg-[#176B87] hover:text-white text-xs font-mono font-black uppercase transition-all text-center cursor-pointer"
                  >
                    View Auction
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3 Additional Live Auctions (Right - 7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 gap-4">
            {additionalAuctions.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => navigateTo('vehicle_detail', vehicle.id)}
                className="group bg-white border border-[#D7E7E4] rounded-3xl p-3.5 sm:p-4 hover:border-[#176B87] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center gap-4 shadow-xs"
              >
                <div className="relative w-full sm:w-48 h-36 rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={vehicle.images[0]}
                    alt={vehicle.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 z-10">
                    <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-white font-mono font-bold text-[10px] border border-white/20 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#13B8A6]" />
                      Live
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2 w-full">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#66808A]">
                    <span>{vehicle.year} • {vehicle.transmission}</span>
                    <span className="flex items-center gap-1 text-[#13B8A6]">
                      <MapPin className="w-3 h-3" />
                      {vehicle.location.split(' ')[0]}
                    </span>
                  </div>

                  <h4 className="text-base font-serif font-black text-[#176B87] group-hover:text-[#13B8A6] transition-colors truncate">
                    {vehicle.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-[#66808A] block">High Bid</span>
                      <span className="text-base font-mono font-black text-[#176B87]">
                        KES {(vehicle.currentBid || vehicle.price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo('vehicle_detail', vehicle.id);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#176B87] hover:bg-[#0A3340] text-white text-xs font-mono font-black uppercase transition-all shadow-sm cursor-pointer"
                      >
                        Place Bid
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo('vehicle_detail', vehicle.id);
                        }}
                        className="px-3 py-2 rounded-xl border border-[#176B87] text-[#176B87] text-xs font-mono font-black uppercase transition-all cursor-pointer hover:bg-[#176B87] hover:text-white"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
