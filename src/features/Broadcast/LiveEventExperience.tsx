import React, { useState, useEffect, useMemo } from 'react';
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
  Radio,
  Trophy,
  CreditCard,
  BookOpen,
  TrendingUp,
  Star,
  MessageSquare,
  HelpCircle,
  UserPlus,
  CalendarPlus,
  Bookmark,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Download,
  Phone,
  Mail,
  X,
  Check,
  Pause,
  RefreshCw,
  Zap,
  Car as CarIcon,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { FC } from 'react';

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

interface Commentary {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'milestone' | 'alert' | 'celebration';
}

interface BidMoment {
  timestamp: string;
  amount: number;
  frequency: number;
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
    address: string;
    phone: string;
  };
  inspection: {
    status: 'available' | 'pending' | 'none';
    score?: number;
  };
  metrics: {
    viewers: number;
    registeredBidders: number;
  };
}

// Mock Data
const MOCK_AUCTION: LiveAuction = {
  id: 'auc-1',
  reference: 'AUC-2026-001',
  stage: 'auction_live',
  vehicle: {
    title: 'TOYOTA Land Cruiser 300 GX-R',
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    ],
    year: 2022,
    mileage: '15,200 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    location: 'Nairobi Vault (Karen)',
    engine: '3.5L Twin-Turbo V6',
    drive: '4WD',
    body: 'SUV',
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
    address: 'NCBA Tower, Upper Hill, Nairobi',
    phone: '+254 20 288 8000',
  },
  inspection: {
    status: 'available',
    score: 100,
  },
  metrics: {
    viewers: 247,
    registeredBidders: 12,
  },
};

const MOCK_COMMENTARY: Commentary[] = [
  { id: '1', timestamp: '2026-01-15T10:45:00', message: 'Registration has now closed.', type: 'info' },
  { id: '2', timestamp: '2026-01-15T10:46:00', message: 'Reserve price has been reached!', type: 'milestone' },
  { id: '3', timestamp: '2026-01-15T10:47:00', message: 'Bidder A-104 has taken the lead.', type: 'info' },
  { id: '4', timestamp: '2026-01-15T10:48:00', message: 'Bidder B-227 has been outbid.', type: 'info' },
  { id: '5', timestamp: '2026-01-15T10:49:00', message: 'Five minutes remaining in this auction.', type: 'alert' },
  { id: '6', timestamp: '2026-01-15T10:50:00', message: 'Congratulations to the winning bidder!', type: 'celebration' },
];

// Helper Functions
const formatCurrency = (amount: number) => `Ksh ${amount.toLocaleString()}`;
const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
const formatTimeRemaining = (endTime: string): string => {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Stage Configuration
const stageConfig: Record<AuctionStage, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pre_auction: { label: 'Pre-Auction', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <Calendar className="w-4 h-4" /> },
  viewing_open: { label: 'Viewing Open', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Eye className="w-4 h-4" /> },
  registration_closing: { label: 'Registration Closing', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: <Users className="w-4 h-4" /> },
  auction_starts_soon: { label: 'Auction Starts Soon', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <Clock className="w-4 h-4" /> },
  auction_live: { label: 'Auction Live', color: 'text-red-700', bgColor: 'bg-red-100', icon: <Gavel className="w-4 h-4" /> },
  final_minutes: { label: 'Final Minutes', color: 'text-red-700', bgColor: 'bg-red-200', icon: <AlertTriangle className="w-4 h-4" /> },
  auction_closed: { label: 'Auction Closed', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <CheckCircle2 className="w-4 h-4" /> },
  winner_confirmed: { label: 'Winner Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Trophy className="w-4 h-4" /> },
  payment_pending: { label: 'Payment Pending', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: <CreditCard className="w-4 h-4" /> },
  vehicle_collected: { label: 'Vehicle Collected', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <CarIcon className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: <CheckCircle2 className="w-4 h-4" /> },
};

// Components
const StageBadge: FC<{ stage: AuctionStage }> = ({ stage }) => {
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
      <span className={`font-bold text-sm ${config.color}`}>
        {config.icon}
        <span className="ml-2">{config.label}</span>
      </span>
    </div>
  );
};

const CommentaryPanel: FC<{ commentary: Commentary[] }> = ({ commentary }) => (
  <Card>
    <div className="p-4 border-b border-slate-200 flex items-center gap-2">
      <MessageSquare className="w-5 h-5 text-[#1E3063]" />
      <h3 className="font-bold text-[#1E3063]">Live Commentary</h3>
    </div>
    <div className="max-h-64 overflow-y-auto p-2">
      {commentary.map((item) => (
        <div 
          key={item.id}
          className={`p-3 rounded-lg mb-2 ${
            item.type === 'celebration' ? 'bg-emerald-50 border border-emerald-200' :
            item.type === 'milestone' ? 'bg-blue-50 border border-blue-200' :
            item.type === 'alert' ? 'bg-amber-50 border border-amber-200' :
            'bg-slate-50'
          }`}
        >
          <p className={`text-sm font-medium ${
            item.type === 'celebration' ? 'text-emerald-800' :
            item.type === 'milestone' ? 'text-blue-800' :
            item.type === 'alert' ? 'text-amber-800' :
            'text-slate-700'
          }`}>
            {item.message}
          </p>
          <p className="text-xs text-slate-400 mt-1">{formatTime(item.timestamp)}</p>
        </div>
      ))}
    </div>
  </Card>
);

const BidMomentum: FC<{ bidsCount: number }> = ({ bidsCount }) => {
  const bars = Array.from({ length: 12 }, (_, i) => ({
    height: Math.random() * 80 + 20,
    active: i >= 12 - Math.min(bidsCount, 12),
  }));

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-[#1E3063]" />
        <h3 className="font-bold text-[#1E3063]">Bid Momentum</h3>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between h-20 gap-1">
          {bars.map((bar, i) => (
            <div 
              key={i}
              className={`flex-1 rounded-t transition-all ${
                bar.active ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">Recent bid activity</p>
      </div>
    </Card>
  );
};

const VehicleSpotlight: FC<{ auction: LiveAuction }> = ({ auction }) => (
  <Card>
    <div className="p-4 border-b border-slate-200 flex items-center gap-2">
      <CarIcon className="w-5 h-5 text-[#1E3063]" />
      <h3 className="font-bold text-[#1E3063]">Vehicle Spotlight</h3>
    </div>
    <div className="p-4 space-y-4">
      <div className="aspect-[16/10] rounded-lg overflow-hidden">
        <img 
          src={auction.vehicle.images[0]} 
          alt={auction.vehicle.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h4 className="font-bold text-[#1E3063]">{auction.vehicle.title}</h4>
        <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'Fuel', value: auction.vehicle.fuel },
          { label: 'Transmission', value: auction.vehicle.transmission },
          { label: 'Engine', value: auction.vehicle.engine },
          { label: 'Drive', value: auction.vehicle.drive },
        ].map((item) => (
          <div key={item.label} className="p-2 bg-slate-50 rounded">
            <p className="text-slate-500">{item.label}</p>
            <p className="font-medium text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>
      {auction.inspection.status === 'available' && (
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="w-4 h-4 mr-2" />
          View Inspection Report
        </Button>
      )}
    </div>
  </Card>
);

const AuctionExplainer: FC<{ stage: AuctionStage }> = ({ stage }) => {
  const explanations: Record<AuctionStage, { now: string; next: string }> = {
    pre_auction: { now: 'This auction is being prepared.', next: 'Viewing will open soon.' },
    viewing_open: { now: 'Vehicle viewing is currently open.', next: 'Registration will close before the auction starts.' },
    registration_closing: { now: 'Bidder registration is closing.', next: 'The auction will begin shortly.' },
    auction_starts_soon: { now: 'The auction is about to begin.', next: 'Registered bidders can start placing bids.' },
    auction_live: { now: 'The auction is live and bids are being accepted.', next: 'The highest bidder when time ends wins.' },
    final_minutes: { now: 'Final minutes of the auction!', next: 'The auction will close soon.' },
    auction_closed: { now: 'The auction has closed.', next: 'The winner will be confirmed shortly.' },
    winner_confirmed: { now: 'A winner has been confirmed.', next: 'The winner will arrange payment with the organizer.' },
    payment_pending: { now: 'Payment is being processed.', next: 'Once paid, ownership will be transferred.' },
    vehicle_collected: { now: 'The vehicle has been collected.', next: 'The auction is complete.' },
    completed: { now: 'This auction has been completed.', next: 'View other upcoming auctions.' },
  };

  const exp = explanations[stage];

  return (
    <Card className="bg-blue-50 border-blue-200">
      <div className="p-4">
        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          What's Happening?
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-800">1</span>
            </div>
            <div>
              <p className="font-medium text-blue-800">Now</p>
              <p className="text-blue-700">{exp.now}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-800">2</span>
            </div>
            <div>
              <p className="font-medium text-blue-800">Next</p>
              <p className="text-blue-700">{exp.next}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-blue-600">
            <strong>Privacy:</strong> Bidder identities are protected by anonymous aliases. 
            Only registered bidders with verified security deposits can participate.
          </p>
        </div>
      </div>
    </Card>
  );
};

const EventSidebar: FC<{ auction: LiveAuction }> = ({ auction }) => (
  <div className="space-y-4">
    {/* Timeline */}
    <Card>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063]">Auction Timeline</h3>
      </div>
      <div className="p-4">
        {[
          { label: 'Published', done: true },
          { label: 'Viewing', done: true },
          { label: 'Registration', done: true },
          { label: 'Live Auction', done: true, current: true },
          { label: 'Winner', done: false },
          { label: 'Payment', done: false },
          { label: 'Collection', done: false },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              item.current ? 'bg-red-500 text-white' : item.done ? 'bg-emerald-500 text-white' : 'bg-slate-200'
            }`}>
              {item.done && !item.current ? <Check className="w-3 h-3" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </div>
            <span className={`text-sm ${item.current ? 'font-bold text-red-600' : item.done ? 'text-slate-700' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </Card>

    {/* Organizer */}
    <Card>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063]">Auction Organizer</h3>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold">
            {auction.organizer.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-bold text-[#1E3063]">{auction.organizer.name}</p>
              {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs text-slate-500">{auction.organizer.type}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-slate-50 rounded">
            <p className="font-bold text-[#1E3063]">{auction.organizer.completedAuctions}</p>
            <p className="text-[10px] text-slate-500">Auctions</p>
          </div>
          <div className="p-2 bg-slate-50 rounded">
            <p className="font-bold text-amber-600 flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-amber-500" />
              {auction.organizer.rating}
            </p>
            <p className="text-[10px] text-slate-500">Rating</p>
          </div>
        </div>
      </div>
    </Card>

    {/* Reserve Status */}
    <Card>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063]">Reserve Status</h3>
      </div>
      <div className="p-4 text-center">
        {auction.auction.currentBid >= (auction.auction.reservePrice || 0) ? (
          <div className="p-4 bg-emerald-50 rounded-xl">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-emerald-800">Reserve Met</p>
            <p className="text-sm text-emerald-600">The reserve price has been reached.</p>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="font-bold text-amber-800">Reserve Not Met</p>
            <p className="text-sm text-amber-600">Reserve: {formatCurrency(auction.auction.reservePrice || 0)}</p>
          </div>
        )}
      </div>
    </Card>
  </div>
);

const SpectatorCTA: FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <Card className="bg-gradient-to-br from-[#C85A32] to-[#a84a28] text-white">
    <div className="p-5 space-y-4">
      <h3 className="font-bold text-lg">Ready to Bid?</h3>
      <p className="text-sm text-white/80">
        Register as a bidder to participate in this and future auctions.
      </p>
      <Button 
        variant="primary" 
        className="w-full bg-white text-[#C85A32] hover:bg-white/90"
        onClick={onRegister}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Register to Bid
      </Button>
      <div className="pt-4 border-t border-white/20 space-y-2">
        <button className="flex items-center justify-between w-full text-sm text-white/80 hover:text-white">
          <span className="flex items-center gap-2"><Bookmark className="w-4 h-4" /> Save this Auction</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="flex items-center justify-between w-full text-sm text-white/80 hover:text-white">
          <span className="flex items-center gap-2"><CalendarPlus className="w-4 h-4" /> View Upcoming Auctions</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="flex items-center justify-between w-full text-sm text-white/80 hover:text-white">
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Book Inspection</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </Card>
);

const AuctionClosedSummary: FC<{ auction: LiveAuction; winningAlias: string }> = ({ auction, winningAlias }) => {
  const reserveMet = !auction.auction.reservePrice || auction.auction.currentBid >= auction.auction.reservePrice;

  // Bid progression data
  const bidProgression = useMemo(() => {
    const points = [];
    let amount = auction.auction.startingBid;
    for (let i = 0; i < auction.auction.bidsCount; i++) {
      amount += Math.floor(Math.random() * 500000) + 100000;
      points.push({ bid: i + 1, amount: Math.min(amount, auction.auction.currentBid) });
    }
    return points;
  }, [auction.auction.bidsCount, auction.auction.startingBid, auction.auction.currentBid]);

  const maxBid = Math.max(...bidProgression.map(p => p.amount));

  return (
    <div className="space-y-6">
      {/* Trophy Header */}
      <Card className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
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
            <h3 className="font-bold text-[#1E3063]">{auction.vehicle.title}</h3>
            <p className="text-sm text-slate-500">{auction.vehicle.year} • {auction.vehicle.mileage}</p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="bg-emerald-50 border-2 border-emerald-200">
            <div className="p-6 text-center">
              <p className="text-sm text-emerald-600 mb-1">Winning Bid</p>
              <p className="text-4xl font-black text-emerald-700">{formatCurrency(auction.auction.currentBid)}</p>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Winner</p>
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
            <div className="absolute inset-0 flex items-end justify-between gap-2 px-2">
              {bidProgression.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t"
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
              { label: 'Peak Spectators', value: auction.metrics.viewers, icon: <Eye className="w-5 h-5" /> },
              { label: 'Duration', value: '8h 15m', icon: <Clock className="w-5 h-5" /> },
              { label: 'Reserve', value: reserveMet ? 'Achieved' : 'Not Met', icon: reserveMet ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" /> },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-slate-50 rounded-xl">
                <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                  item.label === 'Reserve' && reserveMet ? 'bg-emerald-100 text-emerald-600' :
                  item.label === 'Reserve' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-600'
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
      <Card className="bg-amber-50 border-amber-200">
        <div className="p-5">
          <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            What Happens Next
          </h4>
          <div className="space-y-3 text-sm text-amber-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-amber-800">1</span>
              </div>
              <p>The winner will contact <strong>{auction.organizer.name}</strong> directly to arrange payment.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-amber-800">2</span>
              </div>
              <p>Payment is made to the Auction Organizer—not to KAYAD.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-amber-800">3</span>
              </div>
              <p>Upon payment confirmation, ownership transfer and vehicle collection will be arranged.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Related Auctions */}
      <Card>
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063]">Upcoming Auctions</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { title: 'BMW X7 M50i xDrive', organizer: 'Premium Auto Auctions', date: 'Jan 18, 2026', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80' },
            { title: 'MERCEDES-AMG GT', organizer: 'NCBA Bank Kenya', date: 'Jan 20, 2026', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=80' },
          ].map((auction, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
              <img src={auction.image} alt={auction.title} className="w-16 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{auction.title}</p>
                <p className="text-xs text-slate-500">{auction.organizer} • {auction.date}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </Card>

      {/* KAYAD Role */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-blue-800 mb-1">About This Auction</p>
              <p className="text-sm text-blue-700">
                KAYAD facilitated this auction as a technology platform. 
                All payments are handled directly between the winning bidder and the Auction Organizer. 
                KAYAD does not collect auction payments.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Main Component
export const LiveEventExperience: FC<{ auctionId?: string }> = ({ auctionId }) => {
  const [auction] = useState<LiveAuction>(MOCK_AUCTION);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setIsConnected(Math.random() > 0.02), 10000);
    return () => clearInterval(interval);
  }, []);

  const isEnded = ['auction_closed', 'winner_confirmed', 'payment_pending', 'vehicle_collected', 'completed'].includes(auction.stage);
  const reserveMet = !auction.auction.reservePrice || auction.auction.currentBid >= auction.auction.reservePrice;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sticky Event Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-[#1E3063]">Live Auction</h1>
                  <p className="text-xs text-slate-500">{auction.reference}</p>
                </div>
              </div>
              <StageBadge stage={auction.stage} />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{formatCurrency(auction.auction.currentBid)}</p>
                  <p className="text-xs text-slate-500">Current Bid</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.auction.bidsCount}</p>
                  <p className="text-xs text-slate-500">Bids</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.metrics.viewers}</p>
                  <p className="text-xs text-slate-500">Viewers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1E3063]">{auction.metrics.registeredBidders}</p>
                  <p className="text-xs text-slate-500">Bidders</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'Live' : 'Reconnecting...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isEnded ? (
          <div className="max-w-2xl mx-auto">
            <AuctionClosedSummary auction={auction} winningAlias="A-104" />
          </div>
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
              <CommentaryPanel commentary={MOCK_COMMENTARY} />

              {/* Bid Momentum */}
              <BidMomentum bidsCount={auction.auction.bidsCount} />

              {/* Explainer */}
              <AuctionExplainer stage={auction.stage} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <EventSidebar auction={auction} />
              <VehicleSpotlight auction={auction} />
              <SpectatorCTA onRegister={() => {}} />
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
              <Button variant="ghost" size="sm">
                <Calendar className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Upcoming Auctions</span>
                <span className="md:hidden">Upcoming</span>
              </Button>
              <div className="w-px h-6 bg-slate-200" />
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Replay Archive</span>
                <span className="md:hidden">Replays</span>
              </Button>
              <div className="w-px h-6 bg-slate-200" />
              <Button variant="ghost" size="sm">
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

export default LiveEventExperience;
