import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { Gavel, Clock, Lock, CheckCircle2, TrendingUp, Sparkles, AlertCircle, ShieldCheck, Eye } from 'lucide-react';
import { PageHeader, Card, Badge, Button, LazyImage } from '../components/ui';
import TrustBadgeMatrix from '../components/TrustBadgeMatrix';

interface AuctionsViewProps {
  vehicles: Vehicle[];
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({ vehicles, onStartEscrow, onQuickViewVehicle }) => {
  const auctionCars = vehicles.filter((v) => v.isAuction);
  const [bids, setBids] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Countdown timer simulation (decrements seconds every second)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 3,
    minutes: 42,
    seconds: 18
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBid = (vehicle: Vehicle, increment: number) => {
    const current = bids[vehicle.id] || vehicle.currentBid || vehicle.price;
    const newBid = current + increment;
    setBids((prev) => ({ ...prev, [vehicle.id]: newBid }));
    
    // Show toast message
    setToastMessage(`Your bid of Ksh ${newBid.toLocaleString()} was placed for ${vehicle.title}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <PageHeader
        variant="navy"
        badgeIcon={<Gavel className="w-4 h-4 text-amber-400" />}
        badgeText="Live East Africa Vehicle Auctions"
        title="Verified Bank Repossessions & Direct Imports"
        description="Bid with complete security. Every auction vehicle comes with a verified 150-point inspection report and NTSA logbook clearance."
        rightElement={
          <Badge variant="escrow" size="md">
            <Lock className="w-4 h-4" /> 100% Escrow Bid Protection
          </Badge>
        }
      />

      {/* Auction Listings */}
      {auctionCars.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Gavel className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">No active live auctions at this moment</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Check back daily for new bank repossession listings and direct import auctions across Kenya, Uganda and Tanzania.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {auctionCars.map((v) => {
            const activeBid = bids[v.id] || v.currentBid || v.price;

            return (
              <Card key={v.id} className="flex flex-col justify-between overflow-hidden hover:border-amber-400 transition-all">
                <div>
                  <div className="relative h-60 cursor-pointer" onClick={() => onQuickViewVehicle?.(v)}>
                    <LazyImage src={v.image} alt={v.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    
                    {/* Live Status Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                      <Badge variant="live" size="sm">
                        <Clock className="w-3.5 h-3.5" /> LIVE AUCTION
                      </Badge>
                      {v.inspectionPassed && (
                        <Badge variant="inspected" size="sm">
                          150-Pt Certified
                        </Badge>
                      )}
                    </div>

                    {/* Countdown Ticker Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 bg-[#17244B]/90 backdrop-blur-md px-3.5 py-2 rounded-xl text-white flex items-center justify-between text-xs pointer-events-none">
                      <span className="font-medium text-slate-300">Time Remaining:</span>
                      <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
                        0{timeLeft.hours}h : {timeLeft.minutes < 10 ? `0${timeLeft.minutes}` : timeLeft.minutes}m : {timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds}s
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-amber-700">{v.location} • {v.sellerType}</p>
                      <h3 
                        className="text-lg font-extrabold text-[#1E3063] font-display mt-0.5 hover:text-amber-600 cursor-pointer transition-colors"
                        onClick={() => onQuickViewVehicle?.(v)}
                      >
                        {v.title}
                      </h3>
                    </div>

                    {/* Trust Badges Matrix Strip */}
                    <TrustBadgeMatrix vehicle={v} variant="pills" />

                    {/* Bidding Summary Box */}
                    <div className="grid grid-cols-2 gap-3 p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Current Highest Bid</p>
                        <p className="text-2xl font-black text-[#1E3063] font-display mt-0.5">
                          Ksh {activeBid.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold mt-1">
                          ✓ Highest bidder reserves vehicle
                        </p>
                      </div>

                      <div className="border-l border-amber-200/80 pl-3">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Instant Buy Now Price</p>
                        <p className="text-xl font-bold text-slate-700 font-display mt-0.5">
                          Ksh {v.price.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">
                          Bypasses auction via Escrow
                        </p>
                      </div>
                    </div>

                    {/* Bid Increments Selector */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Bid Increments:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[25000, 50000, 100000].map((inc) => (
                          <button
                            key={inc}
                            onClick={() => handlePlaceBid(v, inc)}
                            className="py-2 px-2 bg-slate-100 hover:bg-amber-400 hover:text-[#17244B] font-extrabold text-xs rounded-xl border border-slate-200 transition-all text-slate-800 min-h-[44px] active:scale-95 flex items-center justify-center"
                          >
                            +Ksh {(inc / 1000).toFixed(0)}k
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onQuickViewVehicle?.(v)}
                    title="View vehicle details and full 150-point report"
                  >
                    <Eye className="w-4 h-4 text-[#1E3063]" /> Details
                  </Button>

                  <Button
                    variant="accent"
                    size="md"
                    className="flex-1"
                    onClick={() => handlePlaceBid(v, 50000)}
                  >
                    <TrendingUp className="w-4 h-4" /> Place Bid (+50k)
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onStartEscrow(v)}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Buy Now
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuctionsView;
