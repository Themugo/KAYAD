import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  Calendar,
  User,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Mail,
  FileText,
  Download,
  Image,
  ClipboardCheck,
  Car,
  Info,
  AlertTriangle,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  ExternalLink,
  Info as InfoIcon,
  Bell,
  Trophy,
  CreditCard,
  BookOpen,
  Eye,
  Heart,
  Share2
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { FC } from 'react';

// ============================================================
// Types
// ============================================================

type AuctionStatus = 
  | 'registration_open'
  | 'waiting_to_start'
  | 'auction_live'
  | 'paused'
  | 'closing_soon'
  | 'auction_closed'
  | 'winner_confirmed'
  | 'completed'
  | 'cancelled';

interface BidEntry {
  id: string;
  timestamp: string;
  bidderAlias: string;
  amount: number;
  status: 'highest' | 'outbid' | 'winning' | 'accepted';
  isMe?: boolean;
}

interface OrganizerAnnouncement {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
}

interface LiveAuctionRoomProps {
  auctionId: string;
  vehicle: {
    title: string;
    images: string[];
    year: number;
    mileage: string;
    location: string;
  };
  organizer: {
    name: string;
    verified: boolean;
    phone?: string;
    email?: string;
  };
  auction: {
    reference: string;
    status: AuctionStatus;
    currentBid: number;
    startingBid: number;
    reservePrice?: number;
    bidIncrement: number;
    bidsCount: number;
    endsAt: string;
    activeBidders: number;
    antiSnipingEnabled: boolean;
    antiSnipingMinutes: number;
    extensions: number;
  };
  inspection: {
    status: 'available' | 'pending' | 'none';
    reportUrl?: string;
  };
  myBid: {
    alias: string;
    highestBid: number;
    position: number;
    isHighest: boolean;
    isWinning: boolean;
  };
  onPlaceBid: (amount: number) => void;
  onClose: () => void;
}

// ============================================================
// Helper Functions
// ============================================================

const formatCurrency = (amount: number) => {
  return `Ksh ${amount.toLocaleString()}`;
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

// ============================================================
// Components
// ============================================================

// Status Banner
const StatusBanner: FC<{ status: AuctionStatus; endsAt: string; antiSniping: boolean; extensions: number }> = ({ 
  status, 
  endsAt,
  antiSniping,
  extensions 
}) => {
  const statusConfig: Record<AuctionStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    registration_open: { label: 'Registration Open', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <User className="w-4 h-4" /> },
    waiting_to_start: { label: 'Waiting to Start', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4" /> },
    auction_live: { label: 'Auction Live', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <Gavel className="w-4 h-4" /> },
    paused: { label: 'Paused', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: <AlertCircle className="w-4 h-4" /> },
    closing_soon: { label: 'Closing Soon', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: <AlertTriangle className="w-4 h-4" /> },
    auction_closed: { label: 'Auction Closed', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: <Gavel className="w-4 h-4" /> },
    winner_confirmed: { label: 'Winner Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <Trophy className="w-4 h-4" /> },
    completed: { label: 'Completed', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: <CheckCircle2 className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <X className="w-4 h-4" /> },
  };

  const config = statusConfig[status];
  const timeRemaining = formatTimeRemaining(endsAt);
  const isLive = status === 'auction_live' || status === 'closing_soon';

  return (
    <div className={`flex flex-col md:flex-row items-center justify-between gap-3 py-3 px-4 border-2 rounded-xl ${config.bgColor}`}>
      <div className="flex items-center gap-3">
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
      
      {isLive && (
        <div className="flex items-center gap-4">
          {antiSniping && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              Anti-Sniping Active
            </Badge>
          )}
          {extensions > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              {extensions} Extension{extensions > 1 ? 's' : ''}
            </Badge>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
            <Clock className="w-4 h-4 text-slate-600" />
            <span className="font-mono font-bold text-slate-800">{timeRemaining}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Vehicle Hero
const VehicleHero: FC<{ 
  vehicle: LiveAuctionRoomProps['vehicle'];
  reference: string;
  organizer: LiveAuctionRoomProps['organizer'];
  inspectionStatus: string;
}> = ({ vehicle, reference, organizer, inspectionStatus }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
            <img 
              src={vehicle.images[selectedImage]} 
              alt={vehicle.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 flex gap-2">
              <Badge className="bg-white/90 text-slate-700 backdrop-blur">
                <Image className="w-3 h-3 mr-1" />
                {selectedImage + 1}/{vehicle.images.length}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {vehicle.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                  selectedImage === i ? 'border-[#1E3063]' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1">{reference}</p>
            <h1 className="text-xl font-black text-[#1E3063]">{vehicle.title}</h1>
            <p className="text-sm text-slate-500">{vehicle.year} • {vehicle.mileage}</p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-[#1E3063] flex items-center justify-center text-white font-bold">
              {organizer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1E3063]">{organizer.name}</span>
                {organizer.verified && (
                  <Badge size="sm" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {vehicle.location}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Watch
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Current Auction Panel
const CurrentAuctionPanel: FC<{
  currentBid: number;
  startingBid: number;
  reservePrice?: number;
  bidIncrement: number;
  bidsCount: number;
  activeBidders: number;
  reserveMet: boolean;
}> = ({ 
  currentBid, 
  startingBid, 
  reservePrice, 
  bidIncrement, 
  bidsCount, 
  activeBidders,
  reserveMet 
}) => {
  const minNextBid = currentBid + bidIncrement;

  return (
    <Card className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white">
      <div className="p-5 space-y-4">
        <div className="text-center">
          <p className="text-sm text-slate-300 mb-1">Current Highest Bid</p>
          <p className="text-4xl font-black">{formatCurrency(currentBid)}</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {reservePrice && (
            <Badge className={`${reserveMet ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
              {reserveMet ? (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Reserve Met
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Reserve Not Met
                </>
              )}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-xs text-slate-300">Next Min Bid</p>
            <p className="text-lg font-bold">{formatCurrency(minNextBid)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-300">Increment</p>
            <p className="text-lg font-bold">{formatCurrency(bidIncrement)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-300">Total Bids</p>
            <p className="text-lg font-bold">{bidsCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-300">Active Bidders</p>
            <p className="text-lg font-bold">{activeBidders}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Bid Stream
const BidStream: FC<{ bids: BidEntry[] }> = ({ bids }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bids]);

  return (
    <Card className="p-0">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Live Bid Stream
        </h3>
      </div>
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 space-y-2"
      >
        {bids.length === 0 ? (
          <div className="text-center py-8">
            <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No bids yet. Be the first!</p>
          </div>
        ) : (
          bids.slice().reverse().map((bid) => (
            <div 
              key={bid.id}
              className={`flex items-center justify-between p-3 rounded-xl ${
                bid.isMe 
                  ? 'bg-blue-50 border border-blue-200' 
                  : bid.status === 'highest'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  bid.isMe 
                    ? 'bg-blue-500 text-white' 
                    : bid.status === 'highest'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}>
                  {bid.bidderAlias}
                </div>
                <div>
                  <p className="font-bold text-[#1E3063]">{formatCurrency(bid.amount)}</p>
                  <p className="text-xs text-slate-500">{formatTime(bid.timestamp)}</p>
                </div>
              </div>
              <div>
                {bid.status === 'highest' && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    <Trophy className="w-3 h-3 mr-1" />
                    Highest
                  </Badge>
                )}
                {bid.status === 'outbid' && (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    Outbid
                  </Badge>
                )}
                {bid.isMe && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    You
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

// My Participation Panel
const MyParticipationPanel: FC<{
  alias: string;
  highestBid: number;
  position: number;
  isHighest: boolean;
  isWinning: boolean;
  currentBid: number;
  bidIncrement: number;
  onRebid: () => void;
}> = ({ 
  alias, 
  highestBid, 
  position, 
  isHighest, 
  isWinning,
  currentBid,
  bidIncrement,
  onRebid 
}) => {
  const difference = currentBid - highestBid;

  return (
    <Card className={`border-2 ${isHighest ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1E3063]">My Participation</h3>
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
            {alias}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-xs text-slate-500">My Highest Bid</p>
            <p className="text-lg font-black text-[#1E3063]">{formatCurrency(highestBid)}</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-xs text-slate-500">Position</p>
            <p className="text-lg font-black text-[#1E3063]">#{position}</p>
          </div>
        </div>

        {!isHighest && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800">You have been outbid</p>
                <p className="text-xs text-amber-600">Need {formatCurrency(difference)} more to lead</p>
              </div>
            </div>
          </div>
        )}

        {isHighest && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-800">You are the highest bidder!</p>
                <p className="text-xs text-emerald-600">Keep your position</p>
              </div>
            </div>
          </div>
        )}

        <Button 
          variant="primary" 
          className="w-full bg-[#C85A32] hover:bg-[#a84a28]"
          onClick={onRebid}
        >
          <Gavel className="w-4 h-4 mr-2" />
          Place Next Bid ({formatCurrency(highestBid + bidIncrement)})
        </Button>
      </div>
    </Card>
  );
};

// Bid Controls
const BidControls: FC<{
  currentBid: number;
  bidIncrement: number;
  minimumBid: number;
  onPlaceBid: (amount: number) => void;
  disabled: boolean;
}> = ({ currentBid, bidIncrement, minimumBid, onPlaceBid, disabled }) => {
  const [bidAmount, setBidAmount] = useState(minimumBid);
  const [isConfirming, setIsConfirming] = useState(false);

  const quickAmounts = [
    minimumBid,
    minimumBid + bidIncrement * 2,
    minimumBid + bidIncrement * 5,
    minimumBid + bidIncrement * 10,
  ];

  const handlePlaceBid = () => {
    if (bidAmount >= minimumBid) {
      setIsConfirming(true);
    }
  };

  const confirmBid = () => {
    onPlaceBid(bidAmount);
    setIsConfirming(false);
  };

  return (
    <Card className="bg-slate-50">
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-[#1E3063]">Place Your Bid</h3>
        
        <div>
          <label className="block text-xs text-slate-500 mb-2">
            Minimum Bid: {formatCurrency(minimumBid)}
          </label>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xl font-bold text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            disabled={disabled}
          />
        </div>

        <div className="flex gap-2">
          {quickAmounts.map((amount, i) => (
            <button
              key={i}
              onClick={() => setBidAmount(amount)}
              className="flex-1 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              disabled={disabled}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        {isConfirming ? (
          <div className="space-y-2">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 text-center">
                Confirm bid of <strong>{formatCurrency(bidAmount)}</strong>?
              </p>
              <p className="text-xs text-blue-600 text-center mt-1">
                This bid is binding and cannot be withdrawn.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsConfirming(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={confirmBid}
              >
                Confirm Bid
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="primary" 
            className="w-full bg-[#C85A32] hover:bg-[#a84a28]"
            onClick={handlePlaceBid}
            disabled={disabled || bidAmount < minimumBid}
          >
            <Gavel className="w-4 h-4 mr-2" />
            Place Bid ({formatCurrency(bidAmount)})
          </Button>
        )}

        <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-slate-200">
          <InfoIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600">
            All bids are binding. Payment is made directly to the Auction Organizer, not to KAYAD.
          </p>
        </div>
      </div>
    </Card>
  );
};

// Notifications Toast
const NotificationsToast: FC<{ notifications: string[] }> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notif, i) => (
        <div 
          key={i}
          className="p-4 bg-blue-600 text-white rounded-xl shadow-lg animate-pulse"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{notif}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Organizer Announcements
const OrganizerAnnouncements: FC<{ announcements: OrganizerAnnouncement[] }> = ({ announcements }) => {
  if (announcements.length === 0) return null;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <div className="p-4">
        <h3 className="font-bold text-[#1E3063] mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Organizer Announcements
        </h3>
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div 
              key={ann.id}
              className={`p-3 rounded-xl ${
                ann.type === 'urgent' ? 'bg-red-50 border border-red-200' :
                ann.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                'bg-white border border-slate-200'
              }`}
            >
              <p className="text-sm text-slate-700">{ann.message}</p>
              <p className="text-xs text-slate-400 mt-1">{formatTime(ann.timestamp)}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Auction Timeline
const AuctionTimeline: FC<{ currentStage: number }> = ({ currentStage }) => {
  const stages = [
    { label: 'Published', num: 0 },
    { label: 'Registration', num: 1 },
    { label: 'Viewing', num: 2 },
    { label: 'Live', num: 3 },
    { label: 'Winner', num: 4 },
    { label: 'Payment', num: 5 },
    { label: 'Collection', num: 6 },
  ];

  return (
    <Card>
      <div className="p-4">
        <h3 className="font-bold text-[#1E3063] mb-4">Auction Progress</h3>
        <div className="flex items-center justify-between">
          {stages.map((stage, i) => {
            const isComplete = stage.num < currentStage;
            const isCurrent = stage.num === currentStage;

            return (
              <React.Fragment key={stage.num}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent 
                        ? 'bg-red-500 text-white ring-4 ring-red-200' 
                        : isComplete 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      stage.num + 1
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 text-center ${
                    isCurrent ? 'text-red-600 font-bold' : isComplete ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </p>
                </div>
                {i < stages.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    stages[i + 1].num <= currentStage ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// Auction Rules
const AuctionRules: FC = () => (
  <Card>
    <div className="p-4">
      <h3 className="font-bold text-[#1E3063] mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        Auction Rules
      </h3>
      <div className="space-y-3">
        {[
          { icon: <Shield className="w-4 h-4" />, text: 'Bid Security is required to participate' },
          { icon: <AlertTriangle className="w-4 h-4" />, text: 'Bids cannot be withdrawn once accepted' },
          { icon: <Trophy className="w-4 h-4" />, text: 'Highest valid bid at closing wins' },
          { icon: <CreditCard className="w-4 h-4" />, text: 'Winner pays the Auction Organizer directly' },
          { icon: <Building2 className="w-4 h-4" />, text: 'KAYAD is not the payment recipient' },
          { icon: <FileText className="w-4 h-4" />, text: 'Digital Winning Certificate issued automatically' },
        ].map((rule, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
              {rule.icon}
            </div>
            <p className="text-sm text-slate-700">{rule.text}</p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// Support
const SupportSection: FC<{ organizer: LiveAuctionRoomProps['organizer'] }> = ({ organizer }) => (
  <Card>
    <div className="p-4">
      <h3 className="font-bold text-[#1E3063] mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5" />
        Support
      </h3>
      <div className="space-y-3">
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500 mb-1">Auction Organizer</p>
          <p className="font-bold text-[#1E3063]">{organizer.name}</p>
          {organizer.phone && (
            <a href={`tel:${organizer.phone}`} className="text-sm text-blue-600 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {organizer.phone}
            </a>
          )}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500 mb-1">KAYAD Support</p>
          <a href="tel:+254700000000" className="text-sm text-blue-600 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            +254 700 000 000
          </a>
          <a href="mailto:support@kayad.co.ke" className="text-sm text-blue-600 flex items-center gap-1 mt-1">
            <Mail className="w-3 h-3" />
            support@kayad.co.ke
          </a>
        </div>
      </div>
    </div>
  </Card>
);

// Auction Closed State
const AuctionClosedState: FC<{
  currentBid: number;
  winningAlias: string;
  organizer: LiveAuctionRoomProps['organizer'];
  endsAt: string;
}> = ({ currentBid, winningAlias, organizer, endsAt }) => (
  <Card className="bg-emerald-50 border-2 border-emerald-200">
    <div className="p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Trophy className="w-8 h-8 text-emerald-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-black text-emerald-800 mb-2">Auction Closed</h3>
        <p className="text-sm text-emerald-700">
          Winner: <strong>{winningAlias}</strong> at {formatCurrency(currentBid)}
        </p>
      </div>

      <div className="p-4 bg-white rounded-xl space-y-2 text-left">
        <h4 className="font-bold text-[#1E3063]">Next Steps</h4>
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <CreditCard className="w-4 h-4 mt-0.5 text-slate-400" />
          <span>Contact <strong>{organizer.name}</strong> for payment instructions</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <FileText className="w-4 h-4 mt-0.5 text-slate-400" />
          <span>Digital Winning Certificate will be issued</span>
        </div>
      </div>

      <Button variant="outline" className="w-full">
        <Phone className="w-4 h-4 mr-2" />
        Contact {organizer.name}
      </Button>
    </div>
  </Card>
);

// Connection Status
const ConnectionStatus: FC<{ connected: boolean }> = ({ connected }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
    connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
  }`}>
    {connected ? (
      <>
        <Wifi className="w-3 h-3" />
        Live
      </>
    ) : (
      <>
        <WifiOff className="w-3 h-3" />
        Reconnecting...
      </>
    )}
  </div>
);

// ============================================================
// Main Component
// ============================================================

export const LiveAuctionRoom: FC<LiveAuctionRoomProps> = ({
  auctionId,
  vehicle,
  organizer,
  auction,
  inspection,
  myBid,
  onPlaceBid,
  onClose,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [bids, setBids] = useState<BidEntry[]>([
    { id: '1', timestamp: new Date().toISOString(), bidderAlias: 'C-042', amount: auction.startingBid, status: 'outbid' },
    { id: '2', timestamp: new Date().toISOString(), bidderAlias: 'A-104', amount: auction.startingBid + auction.bidIncrement, status: 'highest', isMe: true },
    { id: '3', timestamp: new Date().toISOString(), bidderAlias: 'B-227', amount: auction.startingBid + auction.bidIncrement * 2, status: 'outbid' },
    { id: '4', timestamp: new Date().toISOString(), bidderAlias: 'A-104', amount: auction.currentBid, status: 'highest', isMe: true },
  ]);
  const [announcements] = useState<OrganizerAnnouncement[]>([
    { id: '1', timestamp: new Date().toISOString(), message: 'Welcome to this auction! Anti-sniping is enabled - late bids will extend by 2 minutes.', type: 'info' },
  ]);

  const isClosed = auction.status === 'auction_closed' || auction.status === 'winner_confirmed' || auction.status === 'completed';
  const reserveMet = !auction.reservePrice || auction.currentBid >= auction.reservePrice;

  // Simulate real-time connection
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.05);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Add notification helper
  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev.slice(-2), message]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 5000);
  }, []);

  // Place bid handler
  const handlePlaceBid = (amount: number) => {
    const newBid: BidEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      bidderAlias: myBid.alias,
      amount,
      status: 'highest',
      isMe: true,
    };
    
    setBids(prev => [...prev.map(b => ({ ...b, status: b.isMe ? 'outbid' : b.status })), newBid]);
    addNotification(`Your bid of ${formatCurrency(amount)} has been placed!`);
    onPlaceBid(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Notifications Toast */}
      <NotificationsToast notifications={notifications} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 rotate-180" />
            </button>
            <div>
              <h1 className="font-bold text-[#1E3063]">Live Auction</h1>
              <p className="text-xs text-slate-500">{auction.reference}</p>
            </div>
          </div>
          <ConnectionStatus connected={isConnected} />
        </div>
      </div>

      {/* Status Banner */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <StatusBanner 
          status={auction.status} 
          endsAt={auction.endsAt}
          antiSniping={auction.antiSnipingEnabled}
          extensions={auction.extensions}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-24 lg:pb-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Hero */}
            <VehicleHero 
              vehicle={vehicle}
              reference={auction.reference}
              organizer={organizer}
              inspectionStatus={inspection.status}
            />

            {/* Organizer Announcements */}
            <OrganizerAnnouncements announcements={announcements} />

            {/* Bid Stream */}
            <BidStream bids={bids} />

            {/* Auction Timeline */}
            <AuctionTimeline currentStage={3} />

            {/* Auction Rules */}
            <AuctionRules />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Current Auction Panel */}
            <CurrentAuctionPanel
              currentBid={auction.currentBid}
              startingBid={auction.startingBid}
              reservePrice={auction.reservePrice}
              bidIncrement={auction.bidIncrement}
              bidsCount={auction.bidsCount}
              activeBidders={auction.activeBidders}
              reserveMet={reserveMet}
            />

            {/* My Participation */}
            {!isClosed && (
              <MyParticipationPanel
                alias={myBid.alias}
                highestBid={myBid.highestBid}
                position={myBid.position}
                isHighest={myBid.isHighest}
                isWinning={myBid.isWinning}
                currentBid={auction.currentBid}
                bidIncrement={auction.bidIncrement}
                onRebid={() => handlePlaceBid(auction.currentBid + auction.bidIncrement)}
              />
            )}

            {/* Auction Closed State */}
            {isClosed && (
              <AuctionClosedState
                currentBid={auction.currentBid}
                winningAlias={myBid.isHighest ? myBid.alias : 'C-042'}
                organizer={organizer}
                endsAt={auction.endsAt}
              />
            )}

            {/* Bid Controls */}
            {!isClosed && (
              <BidControls
                currentBid={auction.currentBid}
                bidIncrement={auction.bidIncrement}
                minimumBid={auction.currentBid + auction.bidIncrement}
                onPlaceBid={handlePlaceBid}
                disabled={!isConnected}
              />
            )}

            {/* Support */}
            <SupportSection organizer={organizer} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAuctionRoom;
