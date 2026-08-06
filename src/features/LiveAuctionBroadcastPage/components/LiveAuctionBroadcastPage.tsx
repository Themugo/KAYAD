import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gavel, Clock, Shield, ShieldCheck, Building2, CheckCircle2, AlertCircle, ChevronRight, MapPin, Calendar, Eye, Users, FileText, ClipboardCheck, Car, Info, AlertTriangle, Wifi, WifiOff, Radio, Trophy, CreditCard, BookOpen, TrendingUp, Star, MessageSquare, HelpCircle, UserPlus, CalendarPlus, Bookmark, ArrowRight, ArrowLeft, Check, RefreshCw, Zap, EyeOff, Award, Truck, Scale, ArrowUpRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

// Types
type AuctionStage =
  | 'pre_auction'
  | 'viewing_open'
  | 'registration_closing'
  | 'auction_starts_soon'
  | 'auction_live'
  | 'final_minutes'
  | 'auction_closed'
  | 'winner_confirmed'
  | 'payment_pending'
  | 'vehicle_collected'
  | 'completed';

interface CommentaryItem {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'milestone' | 'alert' | 'celebration' | 'warning';
}

interface BidMoment {
  time: string;
  amount: number;
  bidderAlias: string;
}

interface LiveAuction {
  id: string;
  reference: string;
  stage: AuctionStage;
  vehicle: {
    title: string;
    images: string[];
    year: number;
    mileage: string;
    fuel: string;
    transmission: string;
    location: string;
    engine: string;
    drive: string;
    body: string;
    color: string;
    inspectionNotes?: string;
  };
  auction: {
    currentBid: number;
    startingBid: number;
    reservePrice?: number;
    bidsCount: number;
    endsAt: string;
    startsAt: string;
    extensionCount: number;
    auctioneerName: string;
  };
  organizer: {
    name: string;
    verified: boolean;
    type: string;
    completedAuctions: number;
    rating: number;
    address: string;
    phone: string;
    email: string;
    licenseNumber: string;
  };
  inspection: {
    status: 'available' | 'pending' | 'none';
    score?: number;
    inspectorName?: string;
    inspectionDate?: string;
    reportUrl?: string;
  };
  metrics: {
    viewers: number;
    registeredBidders: number;
    peakViewers: number;
  };
  timeline: {
    publishedAt: string;
    viewingStart: string;
    viewingEnd: string;
    registrationDeadline: string;
    auctionStart: string;
    auctionEnd: string;
  };
}

// Mock Data
const MOCK_AUCTION: LiveAuction = {
  id: 'auc-1',
  reference: 'AUC-2026-047',
  stage: 'auction_live',
  vehicle: {
    title: 'TOYOTA Land Cruiser 300 GX-R Premium',
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    ],
    year: 2023,
    mileage: '12,450 km',
    fuel: 'Petrol Hybrid',
    transmission: 'Automatic',
    location: 'Nairobi Premium Vault (Karen)',
    engine: '3.5L Twin-Turbo V6 Hybrid',
    drive: '4WD',
    body: 'SUV',
    color: 'Pearl White',
    inspectionNotes: 'Full service history, all documents verified, accident-free',
  },
  auction: {
    currentBid: 18750000,
    startingBid: 16500000,
    reservePrice: 18000000,
    bidsCount: 14,
    endsAt: new Date(Date.now() + 45 * 60000).toISOString(),
    startsAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    extensionCount: 1,
    auctioneerName: 'James Mwangi',
  },
  organizer: {
    name: 'NCBA Bank Kenya',
    verified: true,
    type: 'Verified Financial Institution',
    completedAuctions: 156,
    rating: 4.8,
    address: 'NCBA Tower, Upper Hill Road, Nairobi',
    phone: '+254 20 288 8000',
    email: 'auctions@ ncbagroup.co.ke',
    licenseNumber: 'RD/2024/09876',
  },
  inspection: {
    status: 'available',
    score: 98,
    inspectorName: 'AutoCheck Inspections Ltd',
    inspectionDate: '2026-01-10',
    reportUrl: '#',
  },
  metrics: {
    viewers: 312,
    registeredBidders: 8,
    peakViewers: 487,
  },
  timeline: {
    publishedAt: '2026-01-08T09:00:00',
    viewingStart: '2026-01-08T10:00:00',
    viewingEnd: '2026-01-14T18:00:00',
    registrationDeadline: '2026-01-14T17:00:00',
    auctionStart: '2026-01-15T09:00:00',
    auctionEnd: new Date(Date.now() + 45 * 60000).toISOString(),
  },
};

const MOCK_COMMENTARY: CommentaryItem[] = [
  { id: '1', timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), message: 'Auction has opened. Registered bidders may now place bids.', type: 'info' },
  { id: '2', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), message: 'Reserve price has been reached.', type: 'milestone' },
  { id: '3', timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), message: 'Bidder A-104 has taken the lead with Ksh 17,200,000.', type: 'info' },
  { id: '4', timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), message: 'Bidder B-227 has entered the competition.', type: 'info' },
  { id: '5', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), message: 'High activity period - 3 bids in the last 5 minutes.', type: 'alert' },
  { id: '6', timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), message: 'Bidder B-227 has taken the lead with Ksh 18,500,000.', type: 'milestone' },
  { id: '7', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), message: 'Auction extended by 5 minutes due to a late bid.', type: 'warning' },
  { id: '8', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), message: 'Final minutes approaching. Current leader: Bidder B-227', type: 'alert' },
];

// Helper Functions
const formatCurrency = (amount: number) => `Ksh ${amount.toLocaleString()}`;
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
};
const formatTimeRemaining = (endTime: string): string => {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Stage Configuration
const stageConfig: Record<AuctionStage, { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }> = {
  pre_auction: { label: 'Pre-Auction', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <Calendar className="w-4 h-4" />, description: 'This auction is being prepared for launch.' },
  viewing_open: { label: 'Viewing Open', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Eye className="w-4 h-4" />, description: 'Vehicle viewing is currently available to registered attendees.' },
  registration_closing: { label: 'Registration Closing', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: <Users className="w-4 h-4" />, description: 'Last chance to register as a bidder.' },
  auction_starts_soon: { label: 'Auction Starts Soon', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <Clock className="w-4 h-4" />, description: 'The auction will begin momentarily.' },
  auction_live: { label: 'Auction Live', color: 'text-red-700', bgColor: 'bg-red-100', icon: <Gavel className="w-4 h-4" />, description: 'Bids are being accepted from registered bidders.' },
  final_minutes: { label: 'Final Minutes', color: 'text-red-700', bgColor: 'bg-red-200', icon: <AlertTriangle className="w-4 h-4" />, description: 'Auction is approaching its end. No more extensions possible.' },
  auction_closed: { label: 'Auction Closed', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <CheckCircle2 className="w-4 h-4" />, description: 'Bidding has concluded. Winner confirmation in progress.' },
  winner_confirmed: { label: 'Winner Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Trophy className="w-4 h-4" />, description: 'A winning bidder has been confirmed.' },
  payment_pending: { label: 'Payment Pending', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: <CreditCard className="w-4 h-4" />, description: 'Winner is completing payment arrangements.' },
  vehicle_collected: { label: 'Vehicle Collected', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Truck className="w-4 h-4" />, description: 'Vehicle has been collected by the buyer.' },
  completed: { label: 'Completed', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <CheckCircle2 className="w-4 h-4" />, description: 'This auction has been successfully completed.' },
};

// Components

const StageBadge: React.FC<{ stage: AuctionStage }> = ({ stage }) => {
  const config = stageConfig[stage];
  const isLive = stage === 'auction_live' || stage === 'final_minutes';

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor}`}>
      {isLive && (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
      <span className={`font-bold text-sm ${config.color} flex items-center gap-2`}>
        {config.icon}
        {config.label}
      </span>
    </div>
  );
};

const ConnectionStatus: React.FC<{ connected: boolean }> = ({ connected }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
    connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
  }`}>
    {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    {connected ? 'Live' : 'Reconnecting...'}
  </div>
);

const CommentaryPanel: React.FC<{ commentary: CommentaryItem[] }> = ({ commentary }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commentary]);

  const getTypeStyles = (type: CommentaryItem['type']) => {
    switch (type) {
      case 'celebration':
        return 'bg-gradient-to-r from-emerald-50 to-emerald-50 border border-emerald-200';
      case 'milestone':
        return 'bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200';
      case 'alert':
        return 'bg-gradient-to-r from-amber-50 to-amber-50 border border-amber-200';
      case 'warning':
        return 'bg-gradient-to-r from-orange-50 to-orange-50 border border-orange-200';
      default:
        return 'bg-slate-50 border border-slate-200';
    }
  };

  const getTextColor = (type: CommentaryItem['type']) => {
    switch (type) {
      case 'celebration':
        return 'text-emerald-800';
      case 'milestone':
        return 'text-blue-800';
      case 'alert':
        return 'text-amber-800';
      case 'warning':
        return 'text-orange-800';
      default:
        return 'text-slate-700';
    }
  };

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#1E3063]" />
          <h3 className="font-bold text-[#1E3063]">Live Commentary</h3>
        </div>
        <Badge className="bg-slate-100 text-slate-600">{commentary.length} updates</Badge>
      </div>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-2">
        {commentary.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg ${getTypeStyles(item.type)}`}
          >
            <p className={`text-sm font-medium ${getTextColor(item.type)}`}>
              {item.message}
            </p>
            <p className="text-xs text-slate-400 mt-1">{formatTime(item.timestamp)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const BidMomentum: React.FC<{ bidsCount: number; currentBid: number }> = ({ bidsCount, currentBid }) => {
  const bars = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      height: Math.random() * 70 + 30,
      active: i >= 12 - Math.min(bidsCount, 12),
    }));
  }, [bidsCount]);

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1E3063]" />
          <h3 className="font-bold text-[#1E3063]">Bid Momentum</h3>
        </div>
        <span className="text-xs text-slate-500">{bidsCount} total bids</span>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between h-20 gap-1">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all duration-300 ${
                bar.active ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-slate-200'
              }`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-slate-500">
          <span>Earlier</span>
          <span>Most Recent</span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Current Bidding Pace</span>
            <div className="flex items-center gap-1 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const VehicleSpotlight: React.FC<{ auction: LiveAuction; onImageClick: (index: number) => void }> = ({ auction, onImageClick }) => (
  <Card>
    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Car className="w-5 h-5 text-[#1E3063]" />
        <h3 className="font-bold text-[#1E3063]">Vehicle Spotlight</h3>
      </div>
      {auction.inspection.status === 'available' && (
        <Badge className="bg-emerald-100 text-emerald-700">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Inspected
        </Badge>
      )}
    </div>
    <div className="p-4 space-y-4">
      <div
        className="aspect-[16/10] rounded-lg overflow-hidden cursor-pointer group"
        onClick={() => onImageClick(0)}
      >
        <img
          src={auction.vehicle.images[0]}
          alt={auction.vehicle.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {auction.vehicle.images.slice(1, 5).map((img, i) => (
          <button
            key={i}
            onClick={() => onImageClick(i + 1)}
            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#1E3063] transition-colors"
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <div>
        <h4 className="font-bold text-[#1E3063] text-lg">{auction.vehicle.title}</h4>
        <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage} • {auction.vehicle.color}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Fuel', value: auction.vehicle.fuel, icon: <Zap className="w-4 h-4" /> },
          { label: 'Transmission', value: auction.vehicle.transmission, icon: <Gauge className="w-4 h-4" /> },
          { label: 'Engine', value: auction.vehicle.engine, icon: <Cog className="w-4 h-4" /> },
          { label: 'Drive', value: auction.vehicle.drive, icon: <Car className="w-4 h-4" /> },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </div>
            <p className="font-medium text-slate-800 text-sm">{item.value}</p>
          </div>
        ))}
      </div>
      {auction.vehicle.inspectionNotes && (
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-emerald-800 text-sm">Inspection Summary</span>
          </div>
          <p className="text-xs text-emerald-700">{auction.vehicle.inspectionNotes}</p>
        </div>
      )}
      <div className="flex gap-2">
        {auction.inspection.reportUrl && (
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            View Report
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1">
          <CalendarPlus className="w-4 h-4 mr-2" />
          Book Inspection
        </Button>
      </div>
    </div>
  </Card>
);

// Simple icon replacements
const Gauge: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v2M12 16v2M6 12h2M16 12h2" />
  </svg>
);
const Cog: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);

const AuctionExplainer: React.FC<{ stage: AuctionStage }> = ({ stage }) => {
  const explanations: Record<AuctionStage, { now: string; next: string; who: string; privacy: string }> = {
    pre_auction: {
      now: 'This auction is being prepared and will open soon.',
      next: 'Vehicle viewing and bidder registration will become available.',
      who: 'Only verified dealers and licensed auctioneers can list vehicles on KAYAD.',
      privacy: 'All bidders are verified with paid security deposits.',
    },
    viewing_open: {
      now: 'Registered attendees can view the vehicle in person at the vault.',
      next: 'Bidder registration will close before the auction begins.',
      who: 'Any registered user can attend viewings. Only verified bidders can bid.',
      privacy: 'Bidder identities are protected by anonymous aliases throughout.',
    },
    registration_closing: {
      now: 'The registration window for bidders is closing.',
      next: 'The live auction will begin shortly.',
      who: 'Only registered bidders with verified security deposits can participate.',
      privacy: 'Your identity remains private. Only your bidder alias is shown.',
    },
    auction_starts_soon: {
      now: 'The auction is about to begin.',
      next: 'Registered bidders can start placing bids.',
      who: 'Only registered bidders can bid. Bidders must have a verified security deposit.',
      privacy: 'Bidder aliases are used throughout to protect privacy.',
    },
    auction_live: {
      now: 'The auction is live and bids are being accepted.',
      next: 'The highest bidder when time expires wins the vehicle.',
      who: 'Only registered and verified bidders can place bids.',
      privacy: 'Bidder identities are protected. Only aliases are visible to spectators.',
    },
    final_minutes: {
      now: 'Final minutes of the auction!',
      next: 'The auction will close at the scheduled time.',
      who: 'All registered bidders can still place bids.',
      privacy: 'Bid activity is shown but identities remain hidden.',
    },
    auction_closed: {
      now: 'The auction has closed to new bids.',
      next: 'The winner will be confirmed and announced.',
      who: 'No more bids can be placed.',
      privacy: 'The winner will be identified only by their alias initially.',
    },
    winner_confirmed: {
      now: 'A winning bidder has been confirmed.',
      next: 'The winner will arrange payment with the auction organizer.',
      who: 'Only the winning bidder proceeds to payment.',
      privacy: 'Winner contact details are shared only with the organizer.',
    },
    payment_pending: {
      now: 'Payment is being processed.',
      next: 'Once paid, ownership transfer will be arranged.',
      who: 'The winning bidder is completing payment.',
      privacy: 'Payment details are handled securely between buyer and organizer.',
    },
    vehicle_collected: {
      now: 'The vehicle has been collected by the buyer.',
      next: 'This auction is complete.',
      who: 'Ownership has been transferred.',
      privacy: 'Auction records are maintained for transparency.',
    },
    completed: {
      now: 'This auction has been successfully completed.',
      next: 'View other upcoming auctions on KAYAD.',
      who: 'All parties have fulfilled their obligations.',
      privacy: 'Final auction details are archived for record.',
    },
  };

  const exp = explanations[stage];

  return (
    <Card className="bg-gradient-to-br from-[#1E3063]/5 to-[#1E3063]/10 border-[#1E3063]/20">
      <div className="p-5">
        <h4 className="font-bold text-[#1E3063] mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Understanding This Auction
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1E3063] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">1</span>
            </div>
            <div>
              <p className="font-semibold text-[#1E3063] text-sm">What's Happening Now</p>
              <p className="text-slate-600 text-sm">{exp.now}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1E3063]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-[#1E3063]">2</span>
            </div>
            <div>
              <p className="font-semibold text-[#1E3063] text-sm">What Happens Next</p>
              <p className="text-slate-600 text-sm">{exp.next}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1E3063] text-sm">Who Can Participate</p>
              <p className="text-slate-600 text-sm">{exp.who}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <EyeOff className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1E3063] text-sm">Privacy & Transparency</p>
              <p className="text-slate-600 text-sm">{exp.privacy}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const EventSidebar: React.FC<{ auction: LiveAuction; currentStage: AuctionStage }> = ({ auction, currentStage }) => {
  const stageOrder: AuctionStage[] = [
    'pre_auction',
    'viewing_open',
    'registration_closing',
    'auction_starts_soon',
    'auction_live',
    'final_minutes',
    'auction_closed',
    'winner_confirmed',
    'payment_pending',
    'vehicle_collected',
    'completed',
  ];
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div className="space-y-4">
      {/* Auction Timeline */}
      <Card>
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Auction Timeline
          </h3>
        </div>
        <div className="p-4">
          {stageOrder.slice(0, 7).map((item, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            const labels: Record<AuctionStage, string> = {
              pre_auction: 'Published',
              viewing_open: 'Viewing',
              registration_closing: 'Registration',
              auction_starts_soon: 'Starts Soon',
              auction_live: 'Live',
              final_minutes: 'Final',
              auction_closed: 'Closed',
              winner_confirmed: 'Winner',
              payment_pending: 'Payment',
              vehicle_collected: 'Collection',
              completed: 'Complete',
            };
            return (
              <div key={item} className="flex items-center gap-3 py-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent ? 'bg-red-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone && !isCurrent ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm ${
                  isCurrent ? 'font-bold text-red-600' : isDone ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {labels[item]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Organizer */}
      <Card>
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Auction Organizer
          </h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold text-lg">
              {auction.organizer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-[#1E3063] truncate">{auction.organizer.name}</p>
                {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-500">{auction.organizer.type}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xl font-black text-[#1E3063]">{auction.organizer.completedAuctions}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xl font-black text-amber-600 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-500" />
                {auction.organizer.rating}
              </p>
              <p className="text-xs text-slate-500">Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Award className="w-4 h-4" />
            <span>Licensed: {auction.organizer.licenseNumber}</span>
          </div>
        </div>
      </Card>

      {/* Reserve Status */}
      <Card>
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Reserve Status
          </h3>
        </div>
        <div className="p-4 text-center">
          {auction.auction.currentBid >= (auction.auction.reservePrice || 0) ? (
            <div className="p-4 bg-emerald-50 rounded-xl">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-800">Reserve Met</p>
              <p className="text-sm text-emerald-600 mt-1">The reserve price has been achieved.</p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-amber-800">Reserve Not Met</p>
              <p className="text-sm text-amber-600 mt-1">
                Reserve: {formatCurrency(auction.auction.reservePrice || 0)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Inspection Status */}
      {auction.inspection.status !== 'none' && (
        <Card>
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Inspection Status
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${auction.inspection.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-medium text-slate-700">
                {auction.inspection.status === 'available' ? 'Inspection Available' : 'Inspection Pending'}
              </span>
            </div>
            {auction.inspection.score && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Condition Score</span>
                  <span className="font-bold text-emerald-600">{auction.inspection.score}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${auction.inspection.score}%` }}
                  />
                </div>
              </div>
            )}
            {auction.inspection.inspectorName && (
              <p className="text-xs text-slate-500">
                By: {auction.inspection.inspectorName}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

const SpectatorCTA: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <Card className="bg-gradient-to-br from-[#C85A32] to-[#a84a28] text-white overflow-hidden">
    <div className="p-5 space-y-4">
      <h3 className="font-bold text-lg">Ready to Participate?</h3>
      <p className="text-sm text-white/80">
        Register as a verified bidder to place your own bids in this and future auctions.
      </p>
      <Button
        variant="primary"
        className="w-full bg-white text-[#C85A32] hover:bg-white/90"
        onClick={onRegister}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Register to Bid
      </Button>
      <div className="pt-4 border-t border-white/20 space-y-3">
        {[
          { icon: <Bookmark className="w-4 h-4" />, label: 'Save this Auction', action: 'Save' },
          { icon: <CalendarPlus className="w-4 h-4" />, label: 'View Upcoming Auctions', action: 'Browse' },
          { icon: <Calendar className="w-4 h-4" />, label: 'Book Vehicle Inspection', action: 'Book' },
          { icon: <BookOpen className="w-4 h-4" />, label: 'View Auction Guide', action: 'Learn' },
        ].map((item, i) => (
          <button
            key={i}
            className="flex items-center justify-between w-full text-sm text-white/80 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">{item.icon} {item.label}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  </Card>
);

const AuctionClosedSummary: React.FC<{ auction: LiveAuction; winningAlias: string; onBrowse: () => void }> = ({ auction, winningAlias, onBrowse }) => {
  const bidProgression = useMemo(() => {
    const points = [];
    let amount = auction.auction.startingBid;
    const increment = Math.floor((auction.auction.currentBid - auction.auction.startingBid) / Math.max(auction.auction.bidsCount - 1, 1));
    for (let i = 0; i < auction.auction.bidsCount; i++) {
      amount = Math.min(amount + increment, auction.auction.currentBid);
      points.push({ bid: i + 1, amount });
    }
    return points;
  }, [auction.auction.bidsCount, auction.auction.startingBid, auction.auction.currentBid]);

  const maxBid = Math.max(...bidProgression.map(p => p.amount));
  const reserveMet = !auction.auction.reservePrice || auction.auction.currentBid >= auction.auction.reservePrice;

  const auctionDuration = useMemo(() => {
    const start = new Date(auction.timeline.auctionStart).getTime();
    const end = new Date(auction.timeline.auctionEnd).getTime();
    const hours = Math.floor((end - start) / 3600000);
    const minutes = Math.floor(((end - start) % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }, [auction.timeline]);

  return (
    <div className="space-y-6 pb-24">
      {/* Trophy Header */}
      <Card className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-2">Auction Completed</h2>
          <p className="text-slate-300">Congratulations to the winning bidder</p>
        </div>
      </Card>

      {/* Winner & Vehicle */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <img
              src={auction.vehicle.images[0]}
              alt={auction.vehicle.title}
              className="w-full aspect-[16/10] object-cover rounded-xl mb-4"
            />
            <h3 className="font-bold text-[#1E3063] text-xl">{auction.vehicle.title}</h3>
            <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage}</p>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Location</p>
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {auction.vehicle.location}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-50 border-2 border-emerald-200">
            <div className="p-6 text-center">
              <p className="text-sm text-emerald-600 mb-1">Winning Bid</p>
              <p className="text-4xl font-black text-emerald-700">{formatCurrency(auction.auction.currentBid)}</p>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Winning Alias</p>
              <p className="text-xl font-bold text-[#1E3063]">{winningAlias}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Bids</p>
              <p className="text-xl font-bold text-[#1E3063]">{auction.auction.bidsCount}</p>
            </Card>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{auction.organizer.name}</span>
              {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs text-slate-500">Organized by verified auctioneer</p>
          </Card>
        </div>
      </div>

      {/* Bid Progression Chart */}
      <Card>
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063]">Bid Progression</h3>
        </div>
        <div className="p-5">
          <div className="relative h-32">
            <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
              {bidProgression.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-[#1E3063] to-[#1E3063]/70 rounded-t"
                    style={{ height: `${(point.amount / maxBid) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Start: {formatCurrency(auction.auction.startingBid)}</span>
            <span>End: {formatCurrency(auction.auction.currentBid)}</span>
          </div>
        </div>
      </Card>

      {/* Auction Insights */}
      <Card>
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063]">Auction Insights</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Registered Bidders', value: auction.metrics.registeredBidders, icon: <Users className="w-5 h-5" /> },
              { label: 'Peak Spectators', value: auction.metrics.peakViewers, icon: <Eye className="w-5 h-5" /> },
              { label: 'Duration', value: auctionDuration, icon: <Clock className="w-5 h-5" /> },
              { label: 'Reserve', value: reserveMet ? 'Achieved' : 'Not Met', icon: reserveMet ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />, highlight: reserveMet },
            ].map((item, i) => (
              <div key={i} className={`text-center p-4 rounded-xl ${item.highlight ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                  item.highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.icon}
                </div>
                <p className="text-lg font-black text-[#1E3063]">{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Next Steps */}
      <Card className="bg-gradient-to-br from-amber-50 to-amber-50 border-amber-200">
        <div className="p-5">
          <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            What Happens Next
          </h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-800">1</span>
              </div>
              <div>
                <p className="font-medium text-amber-800">Contact the Organizer</p>
                <p className="text-sm text-amber-700">
                  The winner will contact <strong>{auction.organizer.name}</strong> directly to arrange payment.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-800">2</span>
              </div>
              <div>
                <p className="font-medium text-amber-800">Direct Payment</p>
                <p className="text-sm text-amber-700">
                  Payment is made to the Auction Organizer—not to KAYAD. KAYAD does not collect auction payments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-800">3</span>
              </div>
              <div>
                <p className="font-medium text-amber-800">Ownership Transfer</p>
                <p className="text-sm text-amber-700">
                  Upon payment confirmation, ownership transfer and vehicle collection will be arranged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Related Auctions */}
      <Card>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-[#1E3063]">Upcoming Auctions</h3>
          <Button variant="outline" size="sm" onClick={onBrowse}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="p-4 space-y-3">
          {[
            { title: 'BMW X7 M50i xDrive', organizer: 'Premium Auto Auctions', date: 'Jan 18, 2026', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80', price: 14500000 },
            { title: 'MERCEDES-AMG GT 63', organizer: 'NCBA Bank Kenya', date: 'Jan 20, 2026', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=80', price: 16800000 },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
              <img src={item.image} alt={item.title} className="w-20 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.title}</p>
                <p className="text-xs text-slate-500">{item.organizer} • {item.date}</p>
                <p className="text-sm font-semibold text-[#1E3063] mt-1">{formatCurrency(item.price)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </Card>

      {/* KAYAD Role */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-blue-800 mb-2">About KAYAD's Role</p>
              <div className="space-y-2 text-sm text-blue-700">
                <p>
                  <strong>KAYAD</strong> provided the technology platform for this auction, including the broadcast experience, bidder verification tools, and secure transaction infrastructure.
                </p>
                <p>
                  <strong>All payments</strong> are handled directly between the winning bidder and the Auction Organizer. KAYAD does not collect auction payments or hold auction funds.
                </p>
                <p className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>For disputes or concerns, contact KAYAD Support.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Main Component
const LiveAuctionBroadcastPage: React.FC<{ onNavigate?: (nav: string) => void; onOpenAuth?: () => void }> = ({ onNavigate, onOpenAuth }) => {
  const [auction] = useState<LiveAuction>(MOCK_AUCTION);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [commentary, setCommentary] = useState<CommentaryItem[]>(MOCK_COMMENTARY);

  useEffect(() => {
    const interval = setInterval(() => setIsConnected(Math.random() > 0.02), 10000);
    return () => clearInterval(interval);
  }, []);

  const isEnded = ['auction_closed', 'winner_confirmed', 'payment_pending', 'vehicle_collected', 'completed'].includes(auction.stage);

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Sticky Event Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => onNavigate?.('marketplace')} className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="font-bold text-[#1E3063]">Live Auction</h1>
                  <p className="text-xs text-slate-500 font-mono">{auction.reference}</p>
                </div>
              </div>
              <StageBadge stage={auction.stage} />
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-[#1E3063] text-lg">{formatCurrency(auction.auction.currentBid)}</p>
                  <p className="text-xs text-slate-500">Current Bid</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.auction.bidsCount}</p>
                  <p className="text-xs text-slate-500">Bids</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.metrics.viewers}</p>
                  <p className="text-xs text-slate-500">Viewers</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.metrics.registeredBidders}</p>
                  <p className="text-xs text-slate-500">Bidders</p>
                </div>
              </div>
              <ConnectionStatus connected={isConnected} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isEnded ? (
          <AuctionClosedSummary auction={auction} winningAlias="B-227" onBrowse={() => onNavigate?.('auctions')} />
        ) : (
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
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Badge className="bg-red-600 text-white">
                      <Radio className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                    <Badge className="bg-white/90 text-slate-700">
                      {selectedImage + 1}/{auction.vehicle.images.length}
                    </Badge>
                  </div>
                </div>
                {auction.vehicle.images.length > 1 && (
                  <div className="p-3 flex gap-2 overflow-x-auto">
                    {auction.vehicle.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                          selectedImage === i ? 'border-[#1E3063]' : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Current Bid Panel */}
              <Card className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-300">Current Highest Bid</p>
                      <p className="text-4xl font-black">{formatCurrency(auction.auction.currentBid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300">Auction Ends In</p>
                      <p className="text-2xl font-mono font-bold">{formatTimeRemaining(auction.auction.endsAt)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-xs text-slate-300">Total Bids</p>
                      <p className="text-xl font-bold">{auction.auction.bidsCount}</p>
                    </div>
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-xs text-slate-300">Active Bidders</p>
                      <p className="text-xl font-bold">{auction.metrics.registeredBidders}</p>
                    </div>
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-xs text-slate-300">Viewers</p>
                      <p className="text-xl font-bold">{auction.metrics.viewers}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Commentary */}
              <CommentaryPanel commentary={commentary} />

              {/* Bid Momentum */}
              <BidMomentum bidsCount={auction.auction.bidsCount} currentBid={auction.auction.currentBid} />

              {/* Explainer */}
              <AuctionExplainer stage={auction.stage} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <EventSidebar auction={auction} currentStage={auction.stage} />
              <VehicleSpotlight auction={auction} onImageClick={setSelectedImage} />
              <SpectatorCTA onRegister={() => onOpenAuth?.()} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Previous Live</span>
              <span className="sm:hidden">Prev</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.('auctions')}>
                <Calendar className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Upcoming Auctions</span>
                <span className="md:hidden">Upcoming</span>
              </Button>
              <div className="w-px h-6 bg-slate-200 hidden sm:block" />
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Replay Archive</span>
                <span className="md:hidden">Replays</span>
              </Button>
              <div className="w-px h-6 bg-slate-200 hidden sm:block" />
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.('auctions')}>
                <Eye className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">All Live Auctions</span>
                <span className="md:hidden">Live</span>
              </Button>
            </div>

            <Button variant="outline" size="sm" className="flex-shrink-0">
              <span className="hidden sm:inline">Next Live</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAuctionBroadcastPage;
