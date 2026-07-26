import { useState, useEffect } from 'react';
import { Gavel, Clock, ShieldCheck, Flame, User, ArrowUpRight, Check, Lock, AlertCircle, X, Sparkles, Building2, Phone, CreditCard, ChevronRight, CheckCircle2, Eye, TrendingUp, Zap, Award, BarChart2 } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NavigationBar } from '../common/NavigationBar';
import { SearchBar } from '../ui/SearchBar';

interface AuctionLot {
  id: string;
  vehicleId: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  featured?: boolean;
  startingBid: number;
  currentBid: number;
  bidsCount: number;
  endsInSeconds: number;
  startsInSeconds?: number;
  status?: 'live' | 'upcoming' | 'ended' | 'canceled' | 'suspended';
  imageUrl: string;
  vin: string;
  location: string;
  inspectionScore: number;
  reserveStatus?: 'met' | 'near' | 'no_reserve';
  watchers?: number;
  estMarketValue?: number;
  bidsLastHour?: number;
  dutyCleared?: boolean;
  logbookVerified?: boolean;
}

const INITIAL_AUCTION_LOTS: AuctionLot[] = [
  {
    id: 'lot_1',
    vehicleId: 'veh_3',
    title: 'TOYOTA Land Cruiser 300',
    brand: 'TOYOTA',
    model: 'Land Cruiser 300',
    year: 2022,
    featured: true,
    startingBid: 14800000,
    currentBid: 16835000,
    bidsCount: 7,
    endsInSeconds: 3570, // 00:59:30
    status: 'live',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    vin: 'JT3AA2E88RB008291',
    location: 'Nairobi Vault (Karen)',
    inspectionScore: 100,
    reserveStatus: 'met',
    watchers: 68,
    estMarketValue: 19500000,
    bidsLastHour: 4,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_2',
    vehicleId: 'veh_1',
    title: 'PORSCHE Cayenne S',
    brand: 'PORSCHE',
    model: 'Cayenne S',
    year: 2020,
    featured: false,
    startingBid: 10560000,
    currentBid: 12212000,
    bidsCount: 10,
    endsInSeconds: 8370, // 02:19:30
    status: 'live',
    imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
    vin: 'WP0AF2A97PS289102',
    location: 'Nairobi Vault (Westlands)',
    inspectionScore: 99,
    reserveStatus: 'met',
    watchers: 42,
    estMarketValue: 14200000,
    bidsLastHour: 3,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_3',
    vehicleId: 'veh_2',
    title: 'MERCEDES-BENZ GLE 450',
    brand: 'MERCEDES-BENZ',
    model: 'GLE 450',
    year: 2021,
    featured: false,
    startingBid: 10240000,
    currentBid: 12048000,
    bidsCount: 13,
    endsInSeconds: 13170, // 03:39:30
    status: 'live',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    vin: 'WDD1903791A082914',
    location: 'Mombasa Vault',
    inspectionScore: 98,
    reserveStatus: 'near',
    watchers: 51,
    estMarketValue: 13800000,
    bidsLastHour: 5,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_4',
    vehicleId: 'veh_4',
    title: 'FORD Ranger Raptor',
    brand: 'FORD',
    model: 'Ranger Raptor',
    year: 2022,
    featured: false,
    startingBid: 4480000,
    currentBid: 5696000,
    bidsCount: 16,
    endsInSeconds: 17970, // 04:59:30
    status: 'live',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    vin: '1FTFW1E84MK102941',
    location: 'Nakuru Hub',
    inspectionScore: 100,
    reserveStatus: 'no_reserve',
    watchers: 89,
    estMarketValue: 6500000,
    bidsLastHour: 8,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_5',
    vehicleId: 'veh_5',
    title: 'RANGE ROVER Autobiography P530',
    brand: 'LAND ROVER',
    model: 'Range Rover Autobiography',
    year: 2023,
    featured: true,
    startingBid: 24500000,
    currentBid: 24500000,
    bidsCount: 0,
    endsInSeconds: 86400,
    startsInSeconds: 7200, // Starts in 2 hours
    status: 'upcoming',
    imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80',
    vin: 'SALWR2SE4NA109284',
    location: 'Nairobi Vault (Karen)',
    inspectionScore: 100,
    reserveStatus: 'met',
    watchers: 112,
    estMarketValue: 28000000,
    bidsLastHour: 0,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_6',
    vehicleId: 'veh_6',
    title: 'BMW X7 M50i xDrive',
    brand: 'BMW',
    model: 'X7 M50i',
    year: 2021,
    featured: false,
    startingBid: 13200000,
    currentBid: 13200000,
    bidsCount: 0,
    endsInSeconds: 100000,
    startsInSeconds: 21600, // Starts in 6 hours
    status: 'upcoming',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
    vin: '5UXCW2C00M9B19284',
    location: 'Nairobi Vault (Westlands)',
    inspectionScore: 97,
    reserveStatus: 'near',
    watchers: 37,
    estMarketValue: 15500000,
    bidsLastHour: 0,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_7',
    vehicleId: 'veh_7',
    title: 'AUDI RS Q8 Quattro',
    brand: 'AUDI',
    model: 'RS Q8',
    year: 2021,
    featured: false,
    startingBid: 14000000,
    currentBid: 15850000,
    bidsCount: 18,
    endsInSeconds: 0,
    status: 'ended',
    imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80',
    vin: 'WAUZZZF20MD019283',
    location: 'Mombasa Vault',
    inspectionScore: 99,
    reserveStatus: 'met',
    watchers: 95,
    estMarketValue: 17200000,
    bidsLastHour: 0,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_8',
    vehicleId: 'veh_8',
    title: 'LEXUS LX570 Black Edition',
    brand: 'LEXUS',
    model: 'LX570',
    year: 2019,
    featured: false,
    startingBid: 12500000,
    currentBid: 12500000,
    bidsCount: 0,
    endsInSeconds: 0,
    status: 'canceled',
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
    vin: 'JTJHY7AX6K4019284',
    location: 'Nairobi Vault (Karen)',
    inspectionScore: 95,
    reserveStatus: 'near',
    watchers: 19,
    estMarketValue: 14000000,
    bidsLastHour: 0,
    dutyCleared: true,
    logbookVerified: true,
  },
  {
    id: 'lot_9',
    vehicleId: 'veh_9',
    title: 'NISSAN Patrol Nismo V8',
    brand: 'NISSAN',
    model: 'Patrol Nismo',
    year: 2020,
    featured: false,
    startingBid: 11000000,
    currentBid: 11000000,
    bidsCount: 0,
    endsInSeconds: 0,
    status: 'suspended',
    imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    vin: 'JN8AY2NC0L0918234',
    location: 'Nakuru Hub',
    inspectionScore: 94,
    reserveStatus: 'near',
    watchers: 14,
    estMarketValue: 12800000,
    bidsLastHour: 0,
    dutyCleared: true,
    logbookVerified: true,
  }
];

export const AuctionsPage: React.FC = () => {
  const { placeBid, navigateTo } = useMarketplace();
  const { user, openAuthModal } = useAuth();

  const [lots, setLots] = useState<AuctionLot[]>(INITIAL_AUCTION_LOTS);
  const [userDepositTier, setUserDepositTier] = useState<'none' | 'standard' | 'premium'>('none');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('ending_soon');
  
  // Modals & Notifications state
  const [activeBidLot, setActiveBidLot] = useState<AuctionLot | null>(null);
  const [bidAmountInput, setBidAmountInput] = useState<number>(0);
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string>('');
  const [bidErrorMessage, setBidErrorMessage] = useState<string>('');
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const [depositModalTier, setDepositModalTier] = useState<'standard' | 'premium' | null>(null);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'mpesa' | 'rtgs'>('mpesa');
  const [depositPhone, setDepositPhone] = useState<string>('+254 712 345 678');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState<boolean>(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string>('');

  // Filtered and Sorted Auction Lots
  const filteredLots = lots
    .filter(lot => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = lot.title.toLowerCase().includes(q);
        const matchesBrand = lot.brand.toLowerCase().includes(q);
        const matchesModel = lot.model.toLowerCase().includes(q);
        const matchesVin = lot.vin.toLowerCase().includes(q);
        const matchesLocation = lot.location.toLowerCase().includes(q);
        const matchesYear = lot.year.toString().includes(q);
        if (!matchesTitle && !matchesBrand && !matchesModel && !matchesVin && !matchesLocation && !matchesYear) return false;
      }
      if (filterCategory === 'live' && lot.status !== 'live') return false;
      if (filterCategory === 'upcoming' && lot.status !== 'upcoming') return false;
      if (filterCategory === 'ended' && lot.status !== 'ended') return false;
      if (filterCategory === 'canceled' && lot.status !== 'canceled') return false;
      if (filterCategory === 'suspended' && lot.status !== 'suspended') return false;
      if (filterCategory === 'featured' && !lot.featured) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ending_soon') return a.endsInSeconds - b.endsInSeconds;
      if (sortBy === 'bid_high') return b.currentBid - a.currentBid;
      if (sortBy === 'bid_low') return a.currentBid - b.currentBid;
      if (sortBy === 'most_bids') return b.bidsCount - a.bidsCount;
      return 0;
    });

  // Ticking Countdown Timers Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setLots(prevLots =>
        prevLots.map(lot => ({
          ...lot,
          endsInSeconds: Math.max(0, lot.endsInSeconds - 1)
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      hh: pad(hours),
      mm: pad(minutes),
      ss: pad(seconds)
    };
  };

  const handleOpenBidModal = (lot: AuctionLot) => {
    setActiveBidLot(lot);
    setBidAmountInput(lot.currentBid + 50000);
    setBidSuccessMessage('');
    setBidErrorMessage('');
  };

  const handlePlaceBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBidLot) return;

    const minAllowed = activeBidLot.currentBid + 50000;
    if (bidAmountInput < minAllowed) {
      setBidErrorMessage(`Minimum bid increment is KES 50,000. Your bid must be at least KES ${minAllowed.toLocaleString()}`);
      return;
    }

    if (userDepositTier === 'none') {
      setBidErrorMessage('Security deposit required to place binding bids. Please complete Trust Gate deposit below.');
      return;
    }

    // Update lot state
    setLots(prev =>
      prev.map(l =>
        l.id === activeBidLot.id
          ? {
              ...l,
              currentBid: bidAmountInput,
              bidsCount: l.bidsCount + 1
            }
          : l
      )
    );

    // Call context
    placeBid(activeBidLot.vehicleId, bidAmountInput, user?.name || 'Verified Bidder', user?.id || 'usr_guest');

    setBidSuccessMessage(`Bid of KES ${bidAmountInput.toLocaleString()} placed successfully! You are now highest bidder.`);
    setTimeout(() => {
      setActiveBidLot(null);
      setBidSuccessMessage('');
    }, 2200);
  };

  const handleProcessDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingDeposit(true);

    setTimeout(() => {
      setIsProcessingDeposit(false);
      if (depositModalTier) {
        setUserDepositTier(depositModalTier);
        setDepositSuccessMsg(`Security Deposit of KES ${depositModalTier === 'standard' ? '500,000' : '1,000,000'} Verified! Bidding privileges unlocked.`);
        setTimeout(() => {
          setDepositModalTier(null);
          setDepositSuccessMsg('');
        }, 2200);
      }
    }, 1500);
  };

  const TICKER_ITEMS = [
    "⚡ LIVE BID: KES 16,835,000 placed on Lot #1 Toyota Land Cruiser 300 by Verified Bidder #8821 (Karen Hub)",
    "🔥 BID MOMENTUM: Lot #4 Ford Ranger Raptor received 8 bids in the past hour • NO RESERVE ACTIVE",
    "🛡️ ESCROW GUARANTEE: KES 184.2M total volume settled with 98.4% clearance rate & 0% buyer fees",
    "⭐ HAMMER SETTLED: Audi RS Q8 finalized at KES 15,850,000 (Mombasa Vault)",
    "🔒 VERIFIED LOTS: All active listings passed KAYAD 150-Point Certified Quality Audit"
  ];

  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % TICKER_ITEMS.length);
    }, 4200);
    return () => clearInterval(tickerInterval);
  }, []);

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#1E3063] font-sans">
      {/* Top Hero / Header */}
      <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-[#1E3063] text-white border border-white/10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00C9CE]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] text-[10px] font-mono font-black uppercase tracking-[0.2em] border border-[#00C9CE]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse" />
            <span>LIVE COMPETITIVE BIDDING</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight uppercase leading-snug">
            KAYAD Auction House
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 font-sans font-medium max-w-xl">
            Bid on verified luxury vehicles in real time. Pre-inspected & 100% verified auction inventory.
          </p>
        </div>

        {/* Live Stats Chips */}
        <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 shrink-0 w-full md:w-auto">
          <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs text-white">
            <Gavel className="w-4 h-4 text-[#00C9CE] shrink-0" />
            <div>
              <p className="font-mono font-black text-[9px] uppercase text-[#00C9CE] leading-none">Active Lots</p>
              <p className="text-[11px] font-medium text-slate-200">{lots.filter(l => l.status === 'live').length} Live ({lots.length} Total)</p>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs text-white">
            <User className="w-4 h-4 text-[#2ECC71] shrink-0" />
            <div>
              <p className="font-mono font-black text-[9px] uppercase text-[#2ECC71] leading-none">Bidders</p>
              <p className="text-[11px] font-medium text-slate-200">340+ Verified</p>
            </div>
          </div>

          <button
            onClick={() => setDepositModalTier(userDepositTier === 'none' ? 'standard' : null)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs text-white cursor-pointer transition-all text-left"
          >
            <ShieldCheck className={`w-4 h-4 ${userDepositTier !== 'none' ? 'text-[#2ECC71]' : 'text-[#00C9CE]'} shrink-0`} />
            <div>
              <p className={`font-mono font-black text-[9px] uppercase ${userDepositTier !== 'none' ? 'text-[#2ECC71]' : 'text-[#00C9CE]'} leading-none`}>
                {userDepositTier !== 'none' ? 'Deposit Active' : 'Trust Gate'}
              </p>
              <p className="text-[11px] font-medium text-slate-200">
                {userDepositTier === 'none' ? 'Unlock Bidding' : userDepositTier === 'standard' ? 'KES 500k Tier' : 'KES 1M Premium'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Live Auction Activity Ticker & Market Summary Strip */}
      <div className="bg-[#1E3063] text-white rounded-2xl p-3 sm:p-4 border border-[#E2D8C7]/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-hidden">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ECC71] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2ECC71]"></span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#00C9CE]/20 text-[#00C9CE] text-[10px] font-mono font-black uppercase tracking-wider shrink-0 border border-[#00C9CE]/30">
            LIVE TICKER
          </span>
          <p className="text-xs text-slate-200 font-medium truncate animate-fade-in">
            {TICKER_ITEMS[tickerIndex]}
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono shrink-0 text-slate-300 border-l border-white/15 pl-4">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>CLEARANCE: <strong className="text-white">98.4%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#2ECC71]" />
            <span>SETTLED: <strong className="text-white">KES 184M+</strong></span>
          </div>
        </div>
      </div>

      {reminderNotice && (
        <div className="p-3.5 rounded-2xl bg-[#00C9CE]/15 border border-[#00C9CE]/40 text-[#1E3063] text-xs font-bold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00C9CE] shrink-0" />
            <span>{reminderNotice}</span>
          </div>
          <button onClick={() => setReminderNotice(null)} className="p-1 hover:bg-[#00C9CE]/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Active Lots Directory */}
      <div className="space-y-6">
        {/* Standardized KAYAD Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search lot by make, model, VIN, or hub..."
          resultCount={filteredLots.length}
          badgeLabel="LIVE AUCTION DIRECTORY"
          filterOptions={[
            { id: 'all', label: 'All Auctions' },
            { id: 'live', label: 'Live Bidding' },
            { id: 'upcoming', label: 'Coming Up' },
            { id: 'ended', label: 'Ended / Closed' },
            { id: 'canceled', label: 'Canceled' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'featured', label: 'Featured Only' },
          ]}
          activeFilter={filterCategory}
          onFilterChange={setFilterCategory}
          sortOptions={[
            { id: 'ending_soon', label: 'Ends Soonest' },
            { id: 'bid_high', label: 'Highest Bid' },
            { id: 'bid_low', label: 'Lowest Bid' },
            { id: 'most_bids', label: 'Most Active' },
          ]}
          activeSort={sortBy}
          onSortChange={setSortBy}
        />

        {filteredLots.length === 0 ? (
          <div className="p-10 sm:p-14 text-center bg-white border border-[#E2D8C7] rounded-3xl space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7] flex items-center justify-center mx-auto text-[#00C9CE]">
              <Gavel className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-[#1E3063] font-serif">
              No Auction Lots Match Your Search
            </h3>
            <p className="text-xs text-[#6B7A99] font-medium max-w-md mx-auto leading-relaxed">
              We couldn't find any listings matching "{searchQuery}". Try searching for popular models like "Land Cruiser", "Porsche", "Mombasa", or reset your category filter.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
              }}
              className="border-[#E2D8C7] text-[#1E3063] font-bold text-xs hover:bg-[#F6F1E8]"
            >
              Reset Search & Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {filteredLots.map(lot => {
              const timer = formatTimer(lot.endsInSeconds);
              const startTimer = lot.startsInSeconds ? formatTimer(lot.startsInSeconds) : null;
              const status = lot.status || 'live';
              const isClosingSoon = status === 'live' && lot.endsInSeconds > 0 && lot.endsInSeconds <= 3600;

              // Calculate bid increase %
              const bidIncrease = lot.currentBid > lot.startingBid
                ? Math.round(((lot.currentBid - lot.startingBid) / lot.startingBid) * 100)
                : 0;

              return (
                <div
                  key={lot.id}
                  className={`p-5 sm:p-6 rounded-3xl bg-white border shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between ${
                    isClosingSoon ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-[#E2D8C7]'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Image Box */}
                    <div 
                      onClick={() => navigateTo('vehicle_detail', lot.vehicleId)}
                      className="relative h-60 rounded-2xl overflow-hidden border border-[#E2D8C7] group cursor-pointer"
                    >
                      <img
                        src={lot.imageUrl}
                        alt={lot.title}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover transition-transform duration-500 ${status === 'ended' || status === 'canceled' || status === 'suspended' ? 'grayscale brightness-90' : 'group-hover:scale-105'}`}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 max-w-[80%]">
                        {lot.featured && (
                          <span className="px-3 py-1 rounded-full bg-[#1E3063] text-[#00C9CE] text-[10px] font-black uppercase tracking-wider shadow-md">
                            FEATURED LOT
                          </span>
                        )}
                        
                        {status === 'live' && (
                          <span className="px-3 py-1 rounded-full bg-[#2ECC71] text-[#1E3063] text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3063] animate-pulse" />
                            LIVE AUCTION
                          </span>
                        )}

                        {/* Reserve Status Badge */}
                        {lot.reserveStatus === 'met' && (
                          <span className="px-2.5 py-1 rounded-full bg-[#2ECC71] text-[#1E3063] text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#1E3063]" />
                            RESERVE MET
                          </span>
                        )}

                        {lot.reserveStatus === 'near' && status === 'live' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-[#1E3063] text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                            <Flame className="w-3 h-3 text-[#1E3063]" />
                            RESERVE NEAR
                          </span>
                        )}

                        {lot.reserveStatus === 'no_reserve' && status === 'live' && (
                          <span className="px-2.5 py-1 rounded-full bg-[#00C9CE] text-[#1E3063] text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#1E3063]" />
                            NO RESERVE
                          </span>
                        )}

                        {status === 'upcoming' && (
                          <span className="px-3 py-1 rounded-full bg-[#00C9CE] text-[#1E3063] text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1E3063]" />
                            COMING UP
                          </span>
                        )}

                        {status === 'ended' && (
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-[10px] font-black uppercase tracking-wider shadow-md">
                            ENDED / CLOSED
                          </span>
                        )}

                        {status === 'canceled' && (
                          <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                            CANCELED
                          </span>
                        )}

                        {status === 'suspended' && (
                          <span className="px-3 py-1 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                            SUSPENDED
                          </span>
                        )}
                      </div>

                      {/* Countdown Overlay Box */}
                      <div className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg ${
                        isClosingSoon ? 'bg-rose-700/95 text-white border-rose-400 animate-pulse' : 'bg-[#1E3063]/90 text-white border-white/20'
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-[#00C9CE]" />
                        {status === 'live' && (
                          <>
                            <span>{isClosingSoon ? 'CLOSING IN' : 'Ends in'}</span>
                            <span className="text-[#00C9CE] font-black tabular-nums">
                              {timer.hh} : {timer.mm} : {timer.ss}
                            </span>
                          </>
                        )}
                        {status === 'upcoming' && startTimer && (
                          <>
                            <span>Starts in</span>
                            <span className="text-[#00C9CE] font-black tabular-nums">
                              {startTimer.hh} : {startTimer.mm} : {startTimer.ss}
                            </span>
                          </>
                        )}
                        {status === 'ended' && <span className="text-slate-300 font-black">Auction Closed</span>}
                        {status === 'canceled' && <span className="text-rose-300 font-black">Lot Withdrawn</span>}
                        {status === 'suspended' && <span className="text-amber-300 font-black">Audit Pending</span>}
                      </div>
                    </div>

                    {/* Brand & Title Info */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#00C9CE] block">
                          {lot.brand}
                        </span>
                        {lot.estMarketValue && (
                          <span className="text-[10px] font-bold text-[#6B7A99] bg-[#F6F1E8] px-2 py-0.5 rounded border border-[#E2D8C7]">
                            Est. Retail: KES {(lot.estMarketValue / 1000000).toFixed(1)}M
                          </span>
                        )}
                      </div>

                      <h3 
                        onClick={() => navigateTo('vehicle_detail', lot.vehicleId)}
                        className="text-xl font-extrabold text-[#1E3063] font-serif hover:text-[#00C9CE] cursor-pointer transition-colors"
                      >
                        {lot.title} {lot.year}
                      </h3>
                      
                      <p className="text-xs text-[#6B7A99] font-medium mt-0.5">
                        VIN: {lot.vin} · {lot.location}
                      </p>

                      {/* Watcher & Bid Momentum Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-semibold text-[#6B7A99]">
                        <span className="inline-flex items-center gap-1 bg-[#F6F1E8] px-2.5 py-1 rounded-lg border border-[#E2D8C7] text-[#1E3063] text-[10px] font-bold">
                          <Eye className="w-3 h-3 text-[#00C9CE]" />
                          {lot.watchers || 28} Watching
                        </span>

                        {lot.bidsLastHour && lot.bidsLastHour > 0 && status === 'live' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900 text-[10px] font-bold">
                            <Flame className="w-3 h-3 text-amber-500" />
                            {lot.bidsLastHour} bids past hr
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1 text-[10px] text-[#1E3063] font-bold bg-[#2ECC71]/10 px-2.5 py-1 rounded-lg border border-[#2ECC71]/30">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
                          Audit {lot.inspectionScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Pricing Comparison Bar */}
                    <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7] grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-wider block">
                          Starting Bid
                        </span>
                        <span className="text-sm font-extrabold text-[#1E3063] font-serif">
                          KES {lot.startingBid.toLocaleString()}
                        </span>
                        {bidIncrease > 0 && (
                          <span className="text-[10px] font-bold text-[#2ECC71] block mt-0.5">
                            +{bidIncrease}% growth
                          </span>
                        )}
                      </div>

                      <div className="border-l border-[#E2D8C7] pl-4">
                        <span className="text-[10px] font-bold text-[#00C9CE] uppercase tracking-wider block">
                          {status === 'ended' ? 'Winning Hammer Bid' : 'Current High Bid'}
                        </span>
                        <span className="text-lg font-black text-[#1E3063] font-serif block">
                          KES {lot.currentBid.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#6B7A99]">
                          {status === 'live' && <span className="text-[#2ECC71]">{lot.bidsCount} bids placed · Live</span>}
                          {status === 'upcoming' && <span>0 bids · Pre-bidding Opens Soon</span>}
                          {status === 'ended' && <span>{lot.bidsCount} total bids · Finalized</span>}
                          {status === 'canceled' && <span className="text-rose-600">Auction Canceled</span>}
                          {status === 'suspended' && <span className="text-amber-600">Listing Suspended</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                {/* Bottom Action Button */}
                <div className="pt-2 flex items-center gap-3">
                  {status === 'live' && (
                    <Button
                      variant="primary"
                      onClick={() => handleOpenBidModal(lot)}
                      className="flex-1 bg-[#1E3063] hover:bg-[#0B1628] text-white font-extrabold text-xs py-3 uppercase tracking-wider shadow-sm"
                      leftIcon={<Gavel className="w-4 h-4 text-[#00C9CE]" />}
                    >
                      Place Bid
                    </Button>
                  )}

                  {status === 'upcoming' && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setReminderNotice(`Opening reminder activated for ${lot.title}! You will be notified 15 minutes before live bidding starts.`);
                        setTimeout(() => setReminderNotice(null), 4500);
                      }}
                      className="flex-1 bg-[#00C9CE] hover:bg-[#00b8bc] text-[#1E3063] font-extrabold text-xs py-3 uppercase tracking-wider shadow-sm"
                      leftIcon={<Clock className="w-4 h-4 text-[#1E3063]" />}
                    >
                      Set Opening Reminder
                    </Button>
                  )}

                  {(status === 'ended' || status === 'canceled' || status === 'suspended') && (
                    <button
                      disabled
                      className="flex-1 py-3 px-4 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed"
                    >
                      {status === 'ended' ? 'Auction Closed' : status === 'canceled' ? 'Lot Canceled' : 'Auction Suspended'}
                    </button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigateTo('vehicle_detail', lot.vehicleId)}
                    className="px-4 py-3 border-[#E2D8C7] text-[#1E3063] font-bold text-xs hover:bg-[#F6F1E8]"
                  >
                    View Lot
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Auction Rules & Guidelines */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E8E1D5]">
          <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />
          <h3 className="text-lg font-extrabold text-[#1E3063] font-serif">
            Auction Rules & Guidelines
          </h3>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[#3D4F6F] font-medium">
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>Minimum bid increment is KES 50,000</span>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>All bids are binding and legally enforceable</span>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>Payment must be completed within 24 hours of winning</span>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>Guaranteed verified title transfer upon winning auction</span>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>All auction vehicles have been pre-inspected (150-Point Audit)</span>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F1E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9CE] mt-1.5 shrink-0" />
            <span>Seller pays 2.5% commission; buyer pays 0% fee</span>
          </li>
        </ul>
      </div>

      {/* Bidding HUD Modal */}
      {activeBidLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-[#E2D8C7] space-y-6">
            <button
              onClick={() => setActiveBidLot(null)}
              className="absolute top-4 right-4 p-2 text-[#6B7A99] hover:text-[#1E3063] rounded-full hover:bg-[#F6F1E8]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#00C9CE] tracking-wider">
                LIVE BID HUD · LOT #{activeBidLot.id}
              </span>
              <h3 className="text-xl font-extrabold text-[#1E3063] font-serif">
                {activeBidLot.title} {activeBidLot.year}
              </h3>
              <p className="text-xs text-[#6B7A99] font-medium">
                Current High Bid: <strong className="text-[#1E3063]">KES {activeBidLot.currentBid.toLocaleString()}</strong>
              </p>
            </div>

            {userDepositTier === 'none' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-[#1E3063]">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Bidding Security Deposit Required
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded uppercase">100% Refundable</span>
                </div>
                <p className="text-[11px] text-[#3D4F6F] leading-snug">
                  An escrow security deposit hold is required to place legally binding bids in KAYAD Vault auctions.
                </p>
                <Button
                  type="button"
                  onClick={() => setDepositModalTier('standard')}
                  className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-extrabold text-xs py-2.5 uppercase tracking-wider"
                  leftIcon={<ShieldCheck className="w-4 h-4 text-[#00C9CE]" />}
                >
                  Unlock Security Deposit (KES 500,000 Hold)
                </Button>
              </div>
            )}

            {bidSuccessMessage && (
              <div className="p-3 rounded-xl bg-[#2ECC71]/15 text-[#1E3063] border border-[#2ECC71]/40 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                <span>{bidSuccessMessage}</span>
              </div>
            )}

            {bidErrorMessage && (
              <div className="p-3 rounded-xl bg-[#DC3545]/12 text-[#DC3545] border border-[#DC3545]/25 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC3545] shrink-0" />
                <span>{bidErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePlaceBidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                  Enter Your Bid Amount (KES)
                </label>
                <input
                  type="number"
                  required
                  value={bidAmountInput}
                  onChange={e => setBidAmountInput(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-base font-black text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                />
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBidAmountInput(prev => prev + 50000)}
                  className="flex-1 py-2 bg-[#F6F1E8] hover:bg-[#E2D8C7] text-[#1E3063] text-xs font-extrabold rounded-xl border border-[#E2D8C7]"
                >
                  + KES 50k
                </button>
                <button
                  type="button"
                  onClick={() => setBidAmountInput(prev => prev + 100000)}
                  className="flex-1 py-2 bg-[#F6F1E8] hover:bg-[#E2D8C7] text-[#1E3063] text-xs font-extrabold rounded-xl border border-[#E2D8C7]"
                >
                  + KES 100k
                </button>
                <button
                  type="button"
                  onClick={() => setBidAmountInput(prev => prev + 250000)}
                  className="flex-1 py-2 bg-[#F6F1E8] hover:bg-[#E2D8C7] text-[#1E3063] text-xs font-extrabold rounded-xl border border-[#E2D8C7]"
                >
                  + KES 250k
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#FCF9F4] border border-[#E2D8C7] text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-[#1E3063]">
                  Bidder Guarantee:
                </p>
                <p>
                  If you win this lot, payment settlement will be completed upon winning confirmation and vehicle handover.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-black text-xs py-3.5 uppercase tracking-wider"
              >
                Confirm Binding Bid of KES {bidAmountInput.toLocaleString()}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Security Deposit Unlock Modal */}
      {depositModalTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-[#E2D8C7] space-y-6">
            <button
              onClick={() => setDepositModalTier(null)}
              className="absolute top-4 right-4 p-2 text-[#6B7A99] hover:text-[#1E3063] rounded-full hover:bg-[#F6F1E8]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#00C9CE] tracking-wider">
                TRUST GATE DEPOSIT UNLOCK
              </span>
              <h3 className="text-xl font-extrabold text-[#1E3063] font-serif">
                {depositModalTier === 'standard' ? 'Standard Tier (KES 500,000)' : 'Premium Tier (KES 1,000,000)'}
              </h3>
              <p className="text-xs text-[#6B7A99] font-medium">
                100% Refundable Security Deposit held safely in KAYAD bank account.
              </p>
            </div>

            {depositSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-[#2ECC71]/15 text-[#1E3063] border border-[#2ECC71]/40 text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#2ECC71] mx-auto" />
                <p>{depositSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleProcessDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-2">
                    Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDepositPaymentMethod('mpesa')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        depositPaymentMethod === 'mpesa'
                          ? 'border-[#2ECC71] bg-[#2ECC71]/15 text-[#1E3063]'
                          : 'border-[#E2D8C7] text-[#6B7A99]'
                      }`}
                    >
                      <Phone className="w-4 h-4 text-[#2ECC71]" />
                      M-Pesa Express
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositPaymentMethod('rtgs')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        depositPaymentMethod === 'rtgs'
                          ? 'border-[#00C9CE] bg-[#00C9CE]/15 text-[#1E3063]'
                          : 'border-[#E2D8C7] text-[#6B7A99]'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-[#00C9CE]" />
                      RTGS Bank Wire
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1">
                    {depositPaymentMethod === 'mpesa' ? 'M-Pesa Mobile Number' : 'Sender Bank Account'}
                  </label>
                  <input
                    type="text"
                    required
                    value={depositPhone}
                    onChange={e => setDepositPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-xs font-semibold text-[#1E3063]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isProcessingDeposit}
                  variant="primary"
                  className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-extrabold text-xs py-3.5 uppercase tracking-wider"
                >
                  {isProcessingDeposit ? 'Processing Deposit Hold...' : `Confirm Deposit of KES ${depositModalTier === 'standard' ? '500,000' : '1,000,000'}`}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
