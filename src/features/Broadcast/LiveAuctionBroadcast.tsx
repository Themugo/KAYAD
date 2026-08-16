import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  Eye,
  Users,
  FileText,
  Download,
  Phone,
  Heart,
  Share2,
  Image,
  ClipboardCheck,
  Car,
  Info,
  AlertTriangle,
  Play,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  ExternalLink,
  Bell,
  Trophy,
  CreditCard,
  BookOpen,
  TrendingUp,
  Star,
  MessageCircle,
  HelpCircle,
  UserPlus,
  CalendarPlus,
  Bookmark,
  Radio,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { FC } from 'react';

// Types
type BroadcastStatus = 'upcoming' | 'live' | 'ended';

interface BidEvent {
  id: string;
  timestamp: string;
  bidderAlias: string;
  amount: number;
  status: 'accepted' | 'outbid';
}

interface LiveAuction {
  id: string;
  reference: string;
  status: BroadcastStatus;
  vehicle: {
    title: string;
    images: string[];
    year: number;
    mileage: string;
    fuel: string;
    transmission: string;
    location: string;
  };
  auction: {
    currentBid: number;
    startingBid: number;
    reservePrice?: number;
    bidsCount: number;
    endsAt: string;
    startsAt: string;
  };
  organizer: {
    name: string;
    verified: boolean;
    type: string;
    completedAuctions: number;
    rating: number;
  };
  inspection: {
    status: 'available' | 'pending' | 'none';
    score?: number;
  };
  metrics: {
    viewers: number;
    activeBidders: number;
  };
}

// Mock Data
const MOCK_LIVE_AUCTIONS: LiveAuction[] = [
  {
    id: 'auc-1',
    reference: 'AUC-2026-001',
    status: 'live',
    vehicle: {
      title: 'TOYOTA Land Cruiser 300 GX-R',
      images: [
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1594502894834-6091d-DD7B-1234?auto=format&fit=crop&w=600&q=80',
      ],
      year: 2022,
      mileage: '15,200 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Nairobi Vault (Karen)',
    },
    auction: {
      currentBid: 16835000,
      startingBid: 14800000,
      reservePrice: 16500000,
      bidsCount: 7,
      endsAt: '2026-01-15T17:00:00',
      startsAt: '2026-01-15T09:00:00',
    },
    organizer: {
      name: 'NCBA Bank Kenya',
      verified: true,
      type: 'Verified Dealer',
      completedAuctions: 156,
      rating: 4.8,
    },
    inspection: {
      status: 'available',
      score: 100,
    },
    metrics: {
      viewers: 247,
      activeBidders: 3,
    },
  },
  {
    id: 'auc-2',
    reference: 'AUC-2026-002',
    status: 'live',
    vehicle: {
      title: 'PORSCHE Cayenne S',
      images: [
        'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      ],
      year: 2020,
      mileage: '35,000 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Nairobi Vault (Westlands)',
    },
    auction: {
      currentBid: 12212000,
      startingBid: 10560000,
      bidsCount: 10,
      endsAt: '2026-01-15T17:30:00',
      startsAt: '2026-01-15T09:30:00',
    },
    organizer: {
      name: 'Crown Motors Kenya',
      verified: true,
      type: 'Licensed Auctioneer',
      completedAuctions: 89,
      rating: 4.6,
    },
    inspection: {
      status: 'available',
      score: 99,
    },
    metrics: {
      viewers: 183,
      activeBidders: 2,
    },
  },
];

const MOCK_BID_EVENTS: BidEvent[] = [
  { id: '1', timestamp: '2026-01-15T10:45:00', bidderAlias: 'A-104', amount: 16835000, status: 'accepted' },
  { id: '2', timestamp: '2026-01-15T10:44:00', bidderAlias: 'B-227', amount: 16800000, status: 'outbid' },
  { id: '3', timestamp: '2026-01-15T10:43:00', bidderAlias: 'A-104', amount: 16800000, status: 'accepted' },
  { id: '4', timestamp: '2026-01-15T10:42:00', bidderAlias: 'C-042', amount: 16750000, status: 'outbid' },
  { id: '5', timestamp: '2026-01-15T10:41:00', bidderAlias: 'C-042', amount: 16700000, status: 'outbid' },
];

// Helper Functions
const formatCurrency = (amount: number) => {
  return `Ksh ${amount.toLocaleString()}`;
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeRemaining = (endTime: string): string => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;
  if (diff <= 0) return '00:00:00';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Live Badge
const LiveBadge: FC<{ viewers?: number }> = ({ viewers }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <span className="text-xs font-bold uppercase tracking-wider">Live</span>
    </div>
    {viewers !== undefined && (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-slate-700 rounded-full">
        <Eye className="w-3 h-3" />
        <span className="text-xs font-medium">{viewers.toLocaleString()} watching</span>
      </div>
    )}
  </div>
);

// Broadcast Card
const BroadcastCard: FC<{ auction: LiveAuction; onWatch: () => void }> = ({ auction, onWatch }) => (
  <Card className="overflow-hidden hover:shadow-xl transition-all group">
    <div className="relative">
      <img 
        src={auction.vehicle.images[0]} 
        alt={auction.vehicle.title}
        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute top-3 left-3">
        <LiveBadge viewers={auction.metrics.viewers} />
      </div>
      {auction.inspection.status === 'available' && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-emerald-500 text-white">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Inspected
          </Badge>
        </div>
      )}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-mono mb-1">{auction.reference}</p>
          <h3 className="font-bold text-[#1E3063] text-lg truncate">{auction.vehicle.title}</h3>
          <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage}</p>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-br from-[#1E3063] to-[#2a4080] rounded-xl text-white mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Current Bid</span>
          <span className="text-sm text-slate-300">Bids</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black">{formatCurrency(auction.auction.currentBid)}</span>
          <span className="text-lg font-bold">{auction.auction.bidsCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Ends {formatTime(auction.auction.endsAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
          <span className="text-sm text-slate-600">{auction.organizer.name}</span>
        </div>
      </div>

      <Button variant="primary" className="w-full bg-[#C85A32] hover:bg-[#a84a28]" onClick={onWatch}>
        <Play className="w-4 h-4 mr-2" />
        Watch Live
      </Button>
    </div>
  </Card>
);

// Live Broadcast Page
const LiveBroadcastPage: FC<{ auction: LiveAuction; onClose: () => void }> = ({ auction, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidEvents] = useState<BidEvent[]>(MOCK_BID_EVENTS);
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.02);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const reserveMet = !auction.auction.reservePrice || auction.auction.currentBid >= auction.auction.reservePrice;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-[#1E3063]">Live Auction Broadcast</h1>
                <LiveBadge viewers={auction.metrics.viewers} />
              </div>
              <p className="text-xs text-slate-500">{auction.reference} • {auction.vehicle.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${soundEnabled ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Gallery */}
            <Card className="overflow-hidden">
              <div className="relative">
                <img 
                  src={auction.vehicle.images[selectedImage]} 
                  alt={auction.vehicle.title}
                  className="w-full aspect-[16/9] object-cover"
                />
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-red-600 text-white">
                    <Radio className="w-3 h-3 mr-1" />
                    LIVE
                  </Badge>
                </div>
              </div>
              {auction.vehicle.images.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {auction.vehicle.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                        selectedImage === i ? 'border-[#1E3063]' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Vehicle Info */}
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-1">{auction.reference}</p>
                  <h2 className="text-xl font-black text-[#1E3063]">{auction.vehicle.title}</h2>
                  <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage} • {auction.vehicle.fuel} • {auction.vehicle.transmission}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Heart className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm"><Share2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">{auction.vehicle.location}</span>
              </div>
            </Card>

            {/* Live Bid Activity */}
            <Card>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Live Bid Activity
                </h3>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  {auction.metrics.activeBidders} Active Bidders
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {bidEvents.map((event) => (
                  <div 
                    key={event.id}
                    className={`p-4 flex items-center justify-between border-b border-slate-100 last:border-0 ${
                      event.status === 'accepted' ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        event.status === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {event.bidderAlias}
                      </div>
                      <div>
                        <p className="font-bold text-[#1E3063]">{formatCurrency(event.amount)}</p>
                        <p className="text-xs text-slate-500">{formatTime(event.timestamp)}</p>
                      </div>
                    </div>
                    <Badge className={event.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                      {event.status === 'accepted' ? 'Winning' : 'Outbid'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bid Security Info */}
            <Card className="p-5 bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-800 mb-1">How Bidding Works</h4>
                  <p className="text-sm text-blue-700">
                    All registered bidders have paid a refundable Bid Security deposit. 
                    Only verified bidders with approved security can participate in this auction.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Bid Panel */}
            <Card className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white overflow-hidden">
              <div className="p-6">
                <p className="text-sm text-slate-300 mb-2">Current Highest Bid</p>
                <p className="text-4xl font-black mb-4">{formatCurrency(auction.auction.currentBid)}</p>
                <div className="flex items-center gap-2 mb-4">
                  {reserveMet ? (
                    <Badge className="bg-emerald-500 text-white"><ShieldCheck className="w-3 h-3 mr-1" />Reserve Met</Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Reserve Not Met</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-300">Total Bids</p>
                    <p className="text-2xl font-bold">{auction.auction.bidsCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-300">Active Bidders</p>
                    <p className="text-2xl font-bold">{auction.metrics.activeBidders}</p>
                  </div>
                </div>
                <div className="p-4 bg-white/10 rounded-xl text-center">
                  <p className="text-xs text-slate-300 mb-1">Auction Ends In</p>
                  <p className="text-2xl font-mono font-bold">{formatTimeRemaining(auction.auction.endsAt)}</p>
                </div>
              </div>
            </Card>

            {/* Organizer */}
            <Card className="p-5">
              <h3 className="font-bold text-[#1E3063] mb-4">Auction Organizer</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[#1E3063] flex items-center justify-center text-white text-xl font-black">
                  {auction.organizer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#1E3063]">{auction.organizer.name}</p>
                    {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className="text-sm text-slate-500">{auction.organizer.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-lg font-black text-[#1E3063]">{auction.organizer.completedAuctions}</p>
                  <p className="text-xs text-slate-500">Auctions</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {auction.organizer.rating}
                  </p>
                  <p className="text-xs text-slate-500">Rating</p>
                </div>
              </div>
            </Card>

            {/* Inspection Status */}
            {auction.inspection.status === 'available' && (
              <Card className="p-5 border-2 border-emerald-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">Inspection Complete</p>
                    <p className="text-sm text-emerald-600">Score: {auction.inspection.score}/100</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Report
                </Button>
              </Card>
            )}

            {/* Register CTA */}
            <Card className="p-5 bg-gradient-to-br from-[#C85A32] to-[#a84a28] text-white">
              <h3 className="font-bold text-lg mb-2">Want to Bid?</h3>
              <p className="text-sm text-white/80 mb-4">
                Register as a bidder to participate in this and future auctions.
              </p>
              <Button variant="primary" className="w-full bg-white text-[#C85A32] hover:bg-white/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Register to Bid
              </Button>
            </Card>

            {/* Educational Note */}
            <Card className="p-5">
              <h3 className="font-bold text-[#1E3063] mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-400" />
                How Auctions Work
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>1. Bidders register and pay a refundable security deposit.</p>
                <p>2. Only verified bidders can place binding bids.</p>
                <p>3. The highest bid at closing wins.</p>
                <p>4. Winners pay the organizer directly.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Live Auctions Now Section
const LiveAuctionsNowSection: FC<{ auctions?: LiveAuction[]; onWatchAuction: (auction: LiveAuction) => void }> = ({ 
  auctions = MOCK_LIVE_AUCTIONS.filter(a => a.status === 'live'),
  onWatchAuction 
}) => {
  if (auctions.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center animate-pulse">
              <Gavel className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1E3063]">Live Auctions Now</h2>
              <p className="text-sm text-slate-500">Watch professional vehicle auctions in real time</p>
            </div>
          </div>
          <Button variant="outline">
            View All
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.slice(0, 3).map((auction) => (
            <BroadcastCard 
              key={auction.id} 
              auction={auction} 
              onWatch={() => onWatchAuction(auction)}
            />
          ))}
        </div>

        <div className="mt-8 p-4 bg-[#1E3063] rounded-2xl text-center">
          <p className="text-white text-lg font-medium mb-2">Ready to participate?</p>
          <p className="text-slate-300 text-sm mb-4">
            Register as a bidder to place your own bids in live auctions.
          </p>
          <Button className="bg-[#C85A32] hover:bg-[#a84a28] text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account
          </Button>
        </div>
      </div>
    </section>
  );
};

// Main Export Component
export const LiveAuctionBroadcast: FC = () => {
  const [activeAuction, setActiveAuction] = useState<LiveAuction | null>(null);

  if (activeAuction) {
    return <LiveBroadcastPage auction={activeAuction} onClose={() => setActiveAuction(null)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <Radio className="w-4 h-4 text-red-400" />
            <span className="text-white text-sm font-medium">Live Auction Broadcast</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Watch Professional Auctions Live
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Experience real-time vehicle auctions from verified dealers and auctioneers. 
            No registration required to watch.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-[#C85A32] hover:bg-[#a84a28]"
              onClick={() => setActiveAuction(MOCK_LIVE_AUCTIONS[0])}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Live Auction
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Calendar className="w-5 h-5 mr-2" />
              View Schedule
            </Button>
          </div>
        </div>
      </section>

      {/* Live Auctions */}
      <LiveAuctionsNowSection 
        auctions={MOCK_LIVE_AUCTIONS.filter(a => a.status === 'live')}
        onWatchAuction={setActiveAuction}
      />

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-[#1E3063] mb-3">How the Broadcast Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our live broadcast network brings professional vehicle auctions to anyone with an internet connection. 
              Watch, learn, and decide if auction bidding is right for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Eye className="w-8 h-8" />,
                title: 'Watch Live',
                description: 'View real-time auctions from verified dealers and auctioneers. See current bids, bid activity, and vehicle details.',
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Trust & Transparency',
                description: 'All bidders are verified with paid security deposits. Bidding is fair, transparent, and professional.',
              },
              {
                icon: <UserPlus className="w-8 h-8" />,
                title: 'Join When Ready',
                description: 'Register as a bidder when you\'re comfortable. Place your own bids in future auctions.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="w-16 h-16 rounded-xl bg-[#1E3063]/10 flex items-center justify-center mx-auto mb-4 text-[#1E3063]">
                  {item.icon}
                </div>
                <h3 className="font-bold text-[#1E3063] mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Educational CTA */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Card className="p-8">
            <Trophy className="w-12 h-12 text-[#C85A32] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#1E3063] mb-3">Start Your Auction Journey</h2>
            <p className="text-slate-600 mb-6">
              Create a free account to save auctions, book inspections, and register to bid.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-[#1E3063]">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Upcoming Auctions
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default LiveAuctionBroadcast;
