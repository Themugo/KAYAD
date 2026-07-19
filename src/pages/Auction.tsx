import { useState, useEffect } from 'react';
import { Gavel, Clock, TrendingUp, Users, Shield, ChevronRight, Zap, RefreshCw, Loader } from 'lucide-react';
import { carsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

interface AuctionItem {
  _id: string;
  id?: number;
  make: string;
  model: string;
  year: number;
  image: string;
  startingBid: number;
  currentBid: number;
  bids: number;
  endsIn: number; // seconds
  featured: boolean;
  auctionEnd?: string;
  auctionStartTime?: string;
}

// Demo auction data fallback
const DEMO_AUCTIONS: AuctionItem[] = [
  { _id: 'demo-1', make: 'Toyota', model: 'Land Cruiser GX-R', year: 2024, image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=600&h=400&fit=crop', startingBid: 15000000, currentBid: 16500000, bids: 12, endsIn: 7200, featured: true, auctionEnd: new Date(Date.now() + 7200000).toISOString() },
  { _id: 'demo-2', make: 'Mercedes-Benz', model: 'GLE 450 AMG', year: 2023, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&h=400&fit=crop', startingBid: 12000000, currentBid: 12800000, bids: 8, endsIn: 14400, featured: false, auctionEnd: new Date(Date.now() + 14400000).toISOString() },
  { _id: 'demo-3', make: 'Range Rover', model: 'Sport HSE', year: 2023, image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600&h=400&fit=crop', startingBid: 14000000, currentBid: 15200000, bids: 6, endsIn: 10800, featured: false, auctionEnd: new Date(Date.now() + 10800000).toISOString() },
];

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
  const [bidding, setBidding] = useState<number | null>(null);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch cars from API
        const data = await carsAPI.list({ page: 1, limit: 50, status: 'active' });
        const carList = data?.cars || data?.data || [];
        
        // Filter for auction items and transform
        const auctionItems: AuctionItem[] = carList
          .filter((car: any) => car.auctionStatus === 'live' || car.auctionEnd || car.auctionStartTime)
          .map((car: any, idx: number) => {
            const now = Date.now();
            const endTime = car.auctionEnd ? new Date(car.auctionEnd).getTime() : now + 7200000;
            const startTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : now;
            const endsIn = Math.max(0, Math.floor((endTime - now) / 1000));
            
            return {
              _id: car._id,
              id: car._id ? parseInt(car._id.replace(/\D/g, '') || '1') : idx + 1,
              make: car.brand || car.make || '',
              model: car.model || car.title || '',
              year: car.year || 2024,
              image: typeof car.images?.[0] === 'string' ? car.images[0] : car.images?.[0]?.url || car.image || '',
              startingBid: car.startingBid || Math.round((car.price || car.currentBid || 10000000) * 0.8),
              currentBid: car.currentBid || car.price || 0,
              bids: car.bidsCount || 0,
              endsIn,
              featured: idx === 0,
              auctionEnd: car.auctionEnd,
              auctionStartTime: car.auctionStartTime,
            };
          });
        
        setAuctions(auctionItems.length > 0 ? auctionItems : DEMO_AUCTIONS);
      } catch (err) {
        console.error('Failed to fetch auctions:', err);
        setError('Failed to load auctions');
        setAuctions(DEMO_AUCTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 pt-16 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-3">Live Competitive Bidding</p>
          <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mb-4">Auction House</h1>
          <p className="font-sans text-white/50 text-base max-w-xl">
            Bid on verified vehicles in real time. All lots are pre-inspected and escrow-protected.
          </p>
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              { icon: Zap, label: 'Live Right Now', value: `${loading ? '...' : auctions.length} Active Lots` },
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={() => window.location.reload()} className="text-red-600 hover:text-red-800">
              <RefreshCw size={18} />
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-cream-200" />
                <div className="p-5">
                  <div className="h-4 bg-cream-200 rounded w-1/2 mb-3" />
                  <div className="h-6 bg-cream-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-cream-200 rounded w-1/3" />
                </div>
              </div>
            ))}
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
              {/* Image */}
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
                {/* Countdown */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-charcoal-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Clock size={12} className="text-gold-400" />
                    <span className="font-sans text-xs text-white/70">Ends in</span>
                  </div>
                  <Countdown seconds={item.endsIn} />
                </div>
              </div>

              {/* Details */}
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

        {/* Auction rules */}
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
