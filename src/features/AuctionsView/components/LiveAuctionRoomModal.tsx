import React, { useState, useEffect } from 'react';
import { AuctionSession } from '../../../types';
import { VerifiedBidderProfile } from './BidderRegistrationModal';
import { OrganizerProfile } from '../../../components/organizer';
import { 
  Gavel, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Lock, 
  TrendingUp, 
  UserPlus, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Bookmark, 
  BookmarkCheck, 
  Bot, 
  Zap, 
  Info, 
  FileText, 
  X, 
  Activity, 
  Award,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../../components/ui';

// Helper to get organizer type display name
const getOrganizerTypeDisplay = (type?: string): string => {
  const typeMap: Record<string, string> = {
    verified_dealer: 'Verified Dealer',
    licensed_auctioneer: 'Licensed Auctioneer',
    commercial_bank: 'Commercial Bank',
    microfinance_institution: 'Microfinance Institution',
    fleet_disposal_company: 'Fleet Disposal Company',
    government_disposal_agency: 'Government Agency',
    insurance_salvage_company: 'Insurance Salvage',
    corporate_fleet_owner: 'Corporate Fleet',
  };
  return type ? typeMap[type] || type : 'Auction Organizer';
};

interface LiveAuctionRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuctionSession;
  verifiedPass?: VerifiedBidderProfile;
  onOpenRegistration: () => void;
  onPlaceBid: (session: AuctionSession, amount: number, bidderName: string, location: string) => void;
  onStartEscrow: (vehicle: any) => void;
  onOpenCompletion?: (session: AuctionSession, winnerAlias?: string, winningAmount?: number) => void;
  showToast?: (msg: string) => void;
}

export const LiveAuctionRoomModal: React.FC<LiveAuctionRoomModalProps> = ({
  isOpen,
  onClose,
  session,
  verifiedPass,
  onOpenRegistration,
  onPlaceBid,
  onStartEscrow,
  onOpenCompletion,
  showToast
}) => {
  // Vehicle Gallery Image State
  const vehicle = session.vehicle;
  const galleryImages = [
    vehicle.image,
    ...(vehicle.additionalImages || [])
  ].filter(Boolean);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Watch / Bookmark State
  const [isWatching, setIsWatching] = useState(false);

  // Synchronized Auction Clock Countdown State
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const [isClosed, setIsClosed] = useState(false);

  // Custom & Auto Bid State
  const currentBidVal = session.currentBid ?? 0;
  const minIncrement = session.minimumIncrement || 10000;
  const minNextBid = currentBidVal + minIncrement;
  const [customBid, setCustomBid] = useState<string>(minNextBid.toString());
  
  // Auto-Bid (Proxy Bidding) State
  const [autoBidEnabled, setAutoBidEnabled] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState<string>((currentBidVal + minIncrement * 5).toString());

  // Tabs for Mobile / Context view: Bidding Room vs Vehicle Specifications vs Rules
  const [roomViewTab, setRoomViewTab] = useState<'bidding' | 'specs' | 'rules'>('bidding');

  // Countdown clock effect
  useEffect(() => {
    if (!isOpen) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const endTimeStr = session.endsAt || (session as any).endTime || new Date().toISOString();
      const end = new Date(endTimeStr).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        setIsClosed(true);
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, totalMs: difference });
        setIsClosed(false);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [isOpen, session.endsAt, (session as any).endTime]);

  // Keep custom bid default updated when current bid rises
  useEffect(() => {
    const nextMin = (session.currentBid ?? 0) + minIncrement;
    if (Number(customBid) < nextMin) {
      setCustomBid(nextMin.toString());
    }
  }, [session.currentBid, minIncrement]);

  if (!isOpen) return null;

  const handleToggleWatch = () => {
    setIsWatching(!isWatching);
    if (showToast) {
      showToast(isWatching ? 'Removed auction from watchlist' : '⭐ Added auction to your live watchlist!');
    }
  };

  const handleQuickBid = (increment: number) => {
    if (!verifiedPass) {
      onOpenRegistration();
      return;
    }
    const targetAmount = session.currentBid + increment;
    onPlaceBid(session, targetAmount, verifiedPass.anonymousAlias, 'Nairobi');
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPass) {
      onOpenRegistration();
      return;
    }
    const amount = Number(customBid);
    if (amount < minNextBid) {
      if (showToast) showToast(`❌ Minimum bid required is Ksh ${minNextBid.toLocaleString()}`);
      return;
    }
    onPlaceBid(session, amount, verifiedPass.anonymousAlias, 'Nairobi');
  };

  const handleSetAutoBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPass) {
      onOpenRegistration();
      return;
    }
    const maxVal = Number(maxAutoBid);
    if (maxVal <= session.currentBid) {
      if (showToast) showToast(`❌ Maximum auto-bid limit must exceed current bid (Ksh ${session.currentBid.toLocaleString()})`);
      return;
    }
    setAutoBidEnabled(true);
    if (showToast) {
      showToast(`🤖 Auto-Bid Proxy Activated up to Ksh ${maxVal.toLocaleString()} for ${verifiedPass.anonymousAlias}!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <Card className="max-w-6xl w-full p-0 bg-[#101935] text-white rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* TOP STATUS BAR: ORGANIZER & LIVE INDICATOR */}
        <div className="bg-[#0B1120] px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-black text-emerald-400 tracking-wider uppercase text-[11px]">LIVE AUCTION ROOM</span>
            </div>

            <Badge variant="neutral" size="sm" className="bg-white/10 text-slate-200 text-[10px] font-mono">
              SESSION: #{session.id}
            </Badge>

            {/* ORGANIZER DISPLAY - Prominently shows auction organizer */}
            <div className="hidden md:flex items-center gap-2 text-slate-300 border-l border-white/15 pl-3">
              <div className="w-6 h-6 rounded-full bg-[#1E3063] flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                {session.organizer?.logo ? (
                  <img src={session.organizer.logo} alt={session.organizer.name} className="w-full h-full object-cover" />
                ) : (
                  session.organizer?.name?.charAt(0) || 'A'
                )}
              </div>
              <span>Auction conducted by: <strong className="text-white">{session.organizer?.name || session.sellerName}</strong></span>
              <span className="text-[10px] text-slate-400">({getOrganizerTypeDisplay(session.organizer?.type)})</span>
              {session.organizer?.isVerified && (
                <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Verified
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WATCH AUCTION BUTTON */}
            <button
              onClick={handleToggleWatch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isWatching 
                  ? 'bg-amber-400 text-[#101935]' 
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {isWatching ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{isWatching ? 'Watching' : 'Watch Auction'}</span>
            </button>

            {/* CLOSE MODAL */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN DISPLAY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* LEFT 7 COLUMNS: GALLERY, SYNCHRONIZED CLOCK & SPECS */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto">
            
            {/* VEHICLE GALLERY COMPONENT */}
            <div className="space-y-3">
              <div className="relative aspect-16/9 bg-black rounded-xl overflow-hidden border border-white/10 shadow-lg group">
                <img
                  src={galleryImages[selectedImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />

                {/* Gallery Nav Arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image Overlay Counter */}
                <div className="absolute bottom-3 right-3 bg-black/70 px-2.5 py-1 rounded-md text-[10px] font-mono text-white font-bold backdrop-blur-xs">
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
              </div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        selectedImageIndex === idx ? 'border-amber-400 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VEHICLE TITLE & KEY HIGHLIGHTS */}
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1">
                <span>{vehicle.year}</span> • <span>{(vehicle.mileage ?? 0).toLocaleString()} km</span> • <span>{vehicle.fuelType}</span> • <span>{vehicle.transmission}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-display text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                {vehicle.title} — Auction organized by {session.organizer?.name || session.sellerName}.
              </p>
            </div>

            {/* SYNCHRONIZED AUCTION COUNTDOWN CLOCK */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#1A264D] rounded-xl border border-white/10 flex items-center justify-between flex-wrap gap-3 shadow-inner">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Live Auction Clock
                </span>
                <p className="text-xs text-slate-300">Synchronized server time</p>
              </div>

              {isClosed ? (
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="md" className="bg-red-500/20 text-red-300 font-black text-sm px-3 py-1.5 border border-red-500/40">
                    AUCTION CLOSED
                  </Badge>
                  {onOpenCompletion && (
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={() => onOpenCompletion(session, verifiedPass?.anonymousAlias, session.currentBid)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-9 font-black text-xs px-3 py-1.5"
                    >
                      <Award className="w-4 h-4 mr-1 text-slate-900" />
                      <span>Winning Certificate</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-center">
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-xl font-black text-amber-300 block">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-sans">Hrs</span>
                  </div>
                  <span className="text-lg font-black text-amber-400">:</span>
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-xl font-black text-amber-300 block">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-sans">Min</span>
                  </div>
                  <span className="text-lg font-black text-amber-400">:</span>
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-xl font-black text-emerald-400 block">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-sans">Sec</span>
                  </div>
                </div>
              )}
            </div>

            {/* COLLAPSIBLE ACCORDION FOR SPECS & AUCTION RULES */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex border-b border-white/10 gap-4">
                <button
                  onClick={() => setRoomViewTab('bidding')}
                  className={`pb-2 font-extrabold cursor-pointer transition-colors ${
                    roomViewTab === 'bidding' ? 'text-amber-300 border-b-2 border-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bidding Details
                </button>
                <button
                  onClick={() => setRoomViewTab('specs')}
                  className={`pb-2 font-extrabold cursor-pointer transition-colors ${
                    roomViewTab === 'specs' ? 'text-amber-300 border-b-2 border-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vehicle Spec Sheet
                </button>
                <button
                  onClick={() => setRoomViewTab('rules')}
                  className={`pb-2 font-extrabold cursor-pointer transition-colors ${
                    roomViewTab === 'rules' ? 'text-amber-300 border-b-2 border-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auction Conduct Rules
                </button>
              </div>

              {roomViewTab === 'bidding' && (
                <div className="grid grid-cols-2 gap-3 text-slate-300 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div><span className="text-slate-400">Opening Bid:</span> <strong className="text-white font-mono">Ksh {(session.startingPrice ?? (session as any).startingBid ?? 0).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400">Min Increment:</span> <strong className="text-white font-mono">Ksh {(minIncrement ?? 0).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400">Total Bids Placed:</span> <strong className="text-emerald-400">{session.totalBidsCount ?? (session as any).totalBids ?? 0} bids</strong></div>
                  <div><span className="text-slate-400">Reserve Status:</span> <strong className={session.reserveMet ? 'text-emerald-400 font-bold' : 'text-amber-300'}>{session.reserveMet ? '✓ Met' : 'Pending'}</strong></div>
                </div>
              )}

              {roomViewTab === 'specs' && (
                <div className="grid grid-cols-2 gap-3 text-slate-300 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div><span className="text-slate-400">Engine:</span> {vehicle.engineSize || '2.0L Turbo'}</div>
                  <div><span className="text-slate-400">Color:</span> {vehicle.color || 'White'}</div>
                  <div><span className="text-slate-400">Duty Status:</span> <strong className="text-emerald-400">Fully Paid</strong></div>
                  <div><span className="text-slate-400">Location Yard:</span> {vehicle.location || 'Nairobi Yard'}</div>
                </div>
              )}

              {roomViewTab === 'rules' && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 text-slate-300">
                  <p>1. <strong>Anonymous Bidding:</strong> Real names are encrypted. Only system aliases (e.g. <em>Bidder A-104</em>) are shown.</p>
                  <p>2. <strong>Binding Offer:</strong> Highest bid when time expires wins the vehicle.</p>
                  <p>3. <strong>Deposit Settlement:</strong> Winning bidder deposit is applied to final vehicle price.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT 5 COLUMNS: ANONYMOUS BID FEED & BIDDING CONTROLS */}
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-5 bg-[#0D142B] flex flex-col justify-between">
            
            {/* CURRENT BID & RESERVE DISPLAY HEADER */}
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-[#1E3063] to-[#101935] rounded-2xl border border-white/15 shadow-md">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">CURRENT HIGHEST BID</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-display font-mono">
                    Ksh {(session.currentBid ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    {session.reserveMet ? (
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Reserve Met
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Reserve Price: Ksh {(session.reservePrice ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <span className="text-slate-400">
                    Min Next: <strong className="text-white font-mono">Ksh {(minNextBid ?? 0).toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* MANDATORY PLATFORM DISCLAIMER */}
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-300 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>KAYAD provides the digital auction platform but does not receive bid security deposits or vehicle purchase payments.</span>
              </div>

              {/* VERIFIED BIDDER PASS ACCESS BANNER OR REGISTRATION PROMPT */}
              {verifiedPass ? (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-mono font-black text-emerald-400">{verifiedPass.bidderNumber}</span>
                      <span className="text-[10px] text-slate-300 block">Identities remain 100% anonymous</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                    Deposit Active
                  </Badge>
                </div>
              ) : (
                <div className="p-3.5 bg-[#C85A32]/15 border border-[#C85A32]/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                    <div>
                      <span className="font-extrabold text-white block">Bidder Registration Required</span>
                      <span className="text-[11px] text-slate-300">Pay security deposit to {session.organizer?.name || session.sellerName}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={onOpenRegistration}
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-black text-xs shrink-0"
                  >
                    Register Pass
                  </Button>
                </div>
              )}
            </div>

            {/* LIVE ANONYMOUS BID HISTORY LOG (ONLY ANONYMOUS ALIASES SHOWN) */}
            <div className="space-y-2 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="font-black text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Anonymous Bid Log
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ANONYMOUS FEED</span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {session.bidHistory && session.bidHistory.length > 0 ? (
                  session.bidHistory.map((bid, index) => {
                    // Ensure alias format (e.g. Bidder A-104)
                    const anonymousDisplay = bid.bidderName.startsWith('Bidder ') 
                      ? bid.bidderName 
                      : `Bidder ${bid.bidderName.charAt(0).toUpperCase()}-${100 + index * 12}`;

                    return (
                      <div
                        key={bid.id || index}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          index === 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                            : 'bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-bold text-amber-300">{anonymousDisplay}</span>
                          {index === 0 && (
                            <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0">
                              HIGHEST
                            </Badge>
                          )}
                        </div>

                        <div className="text-right font-mono">
                          <span className="font-extrabold text-white">Ksh {(bid.amount ?? 0).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block font-sans">{bid.timestamp || (bid as any).time || 'Just now'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">No bids placed yet. Be the first to bid!</div>
                )}
              </div>
            </div>

            {/* BIDDING CONTROLS SECTION */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              
              {/* QUICK BID BUTTONS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Quick Bid Increments</span>
                <div className="grid grid-cols-3 gap-2">
                  {[minIncrement, minIncrement * 2, minIncrement * 5].map((inc) => (
                    <button
                      key={inc}
                      disabled={isClosed}
                      onClick={() => handleQuickBid(inc)}
                      className={`p-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                        verifiedPass
                          ? 'bg-[#1E3063] hover:bg-[#17244B] text-white border-white/20 hover:border-amber-400 shadow-xs'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      +Ksh {(inc / 1000).toFixed(0)}k
                      <span className="block text-[9px] text-amber-300 font-mono">
                        {( (session.currentBid + inc) / 1000000 ).toFixed(2)}M
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM BID INPUT FORM */}
              <form onSubmit={handleCustomBidSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={customBid}
                    onChange={(e) => setCustomBid(e.target.value)}
                    placeholder={`Min Ksh ${minNextBid.toLocaleString()}`}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400 font-mono font-bold text-xs"
                    disabled={isClosed}
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={isClosed}
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-black text-xs px-5 shrink-0"
                  >
                    <TrendingUp className="w-4 h-4 mr-1 text-amber-300" />
                    <span>Place Bid</span>
                  </Button>
                </div>
              </form>

              {/* AUTO-BID PROXY TOGGLE */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    Auto-Bid Proxy Engine
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoBidEnabled(!autoBidEnabled)}
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      autoBidEnabled ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {autoBidEnabled ? 'ACTIVE' : 'SETUP PROXY'}
                  </button>
                </div>

                {autoBidEnabled && (
                  <form onSubmit={handleSetAutoBid} className="space-y-2 pt-1">
                    <p className="text-[10px] text-slate-300">Set your maximum budget. The system will auto-bid on your behalf up to this limit.</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={maxAutoBid}
                        onChange={(e) => setMaxAutoBid(e.target.value)}
                        placeholder="Max Auto-Bid Limit"
                        className="bg-white/10 border-white/20 text-white font-mono text-xs"
                      />
                      <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 text-white font-bold text-xs">
                        Save
                      </Button>
                    </div>
                  </form>
                )}
              </div>

            </div>

          </div>

        </div>
      </Card>
    </div>
  );
};
