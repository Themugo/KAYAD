import { useState, useEffect } from 'react';
import { Gavel, Clock, TrendingUp, Users, Shield, ChevronRight, Zap, Loader2 } from 'lucide-react';
import type { Car } from '../types';
import { carsAPI } from '../api/client';

interface AuctionItem {
  id: string;
  make: string;
  model: string;
  year: number;
  image: string;
  startingBid: number;
  currentBid: number;
  bids: number;
  endsIn: number;
  featured: boolean;
}

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5">
      {[h, m, s].map((unit, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="bg-charcoal-800 text-white font-sans font-bold text-sm px-2.5 py-1.5 rounded-lg min-w-[2.5rem] text-center tabular-nums">
            {pad(unit)}
          </span>
          {i < 2 && <span className="text-white/40 font-bold">:</span>}
        </span>
      ))}
    </div>
  );
}

export default function Auction() {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const response = await carsAPI.list({ page: 1, limit: 20 });
        const cars = response?.cars || response?.data || response || [];
        
        const auctionItems: AuctionItem[] = (Array.isArray(cars) ? cars : [])
          .filter((car: Car) => car.auction?.isActive || car.badges?.includes('auction'))
          .map((car: Car, i: number) => ({
            id: car._id || car.id || `auction-${i}`,
            make: car.make,
            model: car.model,
            year: car.year,
            image: car.images?.[0] || car.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
            startingBid: car.auction?.startingPrice || Math.round(car.price * 0.8),
            currentBid: car.auction?.currentBid || Math.round(car.price * 0.9),
            bids: 5 + Math.floor(Math.random() * 10),
            endsIn: 3600 * (i + 1) + 1200 * i,
            featured: i === 0,
          }));
        
        setAuctions(auctionItems);
      } catch (err) {
        console.error('Failed to fetch auctions:', err);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      <div className="bg-charcoal-900 pt-16 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-3">Live Competitive Bidding</p>
          <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mb-4">Auction House</h1>
          <p className="font-sans text-white/50 text-base max-w-xl">
            Bid on verified vehicles in real time. All lots are pre-inspected and escrow-protected.
          </p>
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              { icon: Zap, label: 'Live Right Now', value: `${auctions.length} Active Lots` },
              { icon: Users, label: 'Registered Bidders', value: '340+' },
              { icon: Shield, label: 'Escrow Protected', value: '100% of Lots' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                  <Icon size={18} className="text-gold-400" />
                </div>
                <div>
                  <p className="font-sans text-xs text-white/40">{label}</p>
                  <p className="font-sans text-sm font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={48} className="animate-spin text-gold-600 mb-4" />
            <p className="font-sans text-warm-400">Loading auctions...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-warm-400 mb-2">No auctions available</p>
            <p className="font-sans text-sm text-warm-400">Check back later for new listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {auctions.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  item.featured ? 'border-gold-500/50 ring-1 ring-gold-500/20' : 'border-cream-200'
                }`}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={item.image} alt={`${item.make} ${item.model}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-dark-gradient" />
                  {item.featured && (
                    <div className="absolute top-3 left-3 bg-gold-600 text-white font-sans text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1">
                      <Zap size={10} /> FEATURED LOT
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-charcoal-900/90 text-white font-sans text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                    <Gavel size={10} /> AUCTION
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-charcoal-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Clock size={12} className="text-gold-400" />
                      <span className="font-sans text-xs text-white/70">Ends in</span>
                    </div>
                    <Countdown seconds={item.endsIn} />
                  </div>
                </div>

                <div className="p-5">
                  <p className="section-label mb-1">{item.make}</p>
                  <h3 className="font-serif text-xl text-charcoal-900 font-semibold mb-4">{item.model} {item.year}</h3>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-cream-100 rounded-xl p-3">
                      <p className="font-sans text-[10px] text-warm-400 tracking-wider uppercase mb-1">Starting Bid</p>
                      <p className="font-sans text-sm font-semibold text-charcoal-800">
                        KES {item.startingBid.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gold-500/10 rounded-xl p-3">
                      <p className="font-sans text-[10px] text-gold-600 tracking-wider uppercase mb-1 flex items-center gap-1">
                        <TrendingUp size={9} /> Current Bid
                      </p>
                      <p className="font-sans text-sm font-bold text-gold-600">
                        KES {item.currentBid.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="font-sans text-xs text-warm-400">{item.bids} bids placed</span>
                    <span className="font-sans text-xs text-green-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <button
                    onClick={() => setBidding(bidding === item.id ? null : item.id)}
                    className={`w-full font-sans text-sm font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      bidding === item.id
                        ? 'bg-charcoal-800 text-white'
                        : 'bg-gold-600 text-white hover:bg-gold-700'
                    }`}
                  >
                    <Gavel size={15} />
                    {bidding === item.id ? 'Cancel Bid' : 'Place Bid'}
                  </button>

                  {bidding === item.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        placeholder={`Min: ${(item.currentBid + 50000).toLocaleString()}`}
                        className="flex-1 px-3 py-2 bg-cream-100 border border-cream-300 rounded-lg font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500"
                      />
                      <button className="btn-gold px-4 py-2 text-sm rounded-lg">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 bg-charcoal-900 rounded-2xl p-8">
          <h3 className="font-serif text-2xl text-white font-bold mb-6">Auction Rules &amp; Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Minimum bid increment is KES 50,000',
              'All bids are binding and legally enforceable',
              'Payment must be completed within 24 hours of winning',
              'Escrow holds your funds securely until vehicle transfer',
              'All auction vehicles have been pre-inspected',
              'Seller pays 2.5% commission; buyer pays 0% fee',
            ].map(rule => (
              <div key={rule} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-sans text-sm text-white/60">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
