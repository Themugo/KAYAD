import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, AuctionSession, BidRecord, UserProfile } from '../types';
import { INITIAL_AUCTION_SESSIONS } from '../data/mockAuctions';
import { 
  Gavel, 
  Clock, 
  Lock, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  History, 
  PlusCircle, 
  Users, 
  X, 
  Building2, 
  Landmark, 
  Bell,
  Calendar,
  MapPin,
  FileText,
  Check,
  ChevronRight,
  Info,
  ShieldAlert,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { PageHeader, Card, Badge, Button, LazyImage, StatWidget, Input } from '../components/ui';

interface AuctionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicleAuctionStatus?: (vehicleId: string, isAuction: boolean) => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({ 
  vehicles, 
  user,
  onOpenAuth,
  onStartEscrow, 
  onQuickViewVehicle,
  onUpdateVehicleAuctionStatus
}) => {
  // Determine if logged in as an institutional partner (dealer or admin)
  const isInstitutionalSeller = Boolean(user && (user.role === 'dealer' || user.role === 'admin'));
  // Auction sessions state initialized from mock service
  const [sessions, setSessions] = useState<AuctionSession[]>(INITIAL_AUCTION_SESSIONS);
  
  // Navigation & Category Filters
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'ended' | 'register'>('live');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Comprehensive Detail & Bid Modal
  const [selectedSession, setSelectedSession] = useState<AuctionSession | null>(null);
  const [modalTab, setModalTab] = useState<'bid' | 'history' | 'inspection' | 'terms'>('bid');
  
  // Bid Form state inside modal
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [bidderName, setBidderName] = useState<string>('');
  const [bidderLocation, setBidderLocation] = useState<string>('Nairobi');

  // Notify Me Alert state for No Live Auctions
  const [notifyContact, setNotifyContact] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  // Seller Auction Registration Form State
  const [regVehicleId, setRegVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [regCategory, setRegCategory] = useState<AuctionSession['category']>('Bank Repossession');
  const [regStartingPrice, setRegStartingPrice] = useState<string>('');
  const [regReservePrice, setRegReservePrice] = useState<string>('');
  const [regBuyoutPrice, setRegBuyoutPrice] = useState<string>('');
  const [regIncrement, setRegIncrement] = useState<string>('25000');
  const [regDurationDays, setRegDurationDays] = useState<string>('3');
  const [regTerms, setRegTerms] = useState<string>('Bank Repossession Clearance. Sold as-is with 150-point technical audit report.');

  // Toast notification feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Live Timer Simulation
  const [, setSecondsTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter sessions based on tab & category
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Tab matching
      if (activeTab === 'live' && s.status !== 'Live') return false;
      if (activeTab === 'upcoming' && s.status !== 'Upcoming') return false;
      if (activeTab === 'ended' && s.status !== 'Ended' && s.status !== 'Awaiting Settlement') return false;

      // Category matching
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;

      return true;
    });
  }, [sessions, activeTab, selectedCategory]);

  // Compute Session Metrics
  const liveSessions = useMemo(() => sessions.filter((s) => s.status === 'Live'), [sessions]);
  const upcomingSessions = useMemo(() => sessions.filter((s) => s.status === 'Upcoming'), [sessions]);
  const endedSessions = useMemo(() => sessions.filter((s) => s.status === 'Ended' || s.status === 'Awaiting Settlement'), [sessions]);

  const liveCount = liveSessions.length;
  const upcomingCount = upcomingSessions.length;
  const endedCount = endedSessions.length;
  const totalBidsInSystem = sessions.reduce((sum, s) => sum + s.totalBidsCount, 0);
  const totalVolumeInBids = sessions.reduce((sum, s) => sum + s.currentBid, 0);

  // Function to execute a bid
  const executeBid = (session: AuctionSession, amount: number, bidder: string = 'Verified Bidder', location: string = 'Nairobi') => {
    if (amount <= session.currentBid) {
      showToast(`Bid must be higher than current bid of Ksh ${session.currentBid.toLocaleString()}`, 'info');
      return;
    }

    const minRequired = session.currentBid + session.minimumIncrement;
    if (amount < minRequired) {
      showToast(`Minimum bid increment requirement is Ksh ${minRequired.toLocaleString()}`, 'info');
      return;
    }

    const isReserveMet = amount >= session.reservePrice;

    const newBidRecord: BidRecord = {
      id: `bid-${Date.now()}`,
      bidderName: bidder,
      bidderLocation: location,
      amount,
      timestamp: 'Just now',
      status: 'Highest Bid'
    };

    const updatedSessions = sessions.map((s) => {
      if (s.id === session.id) {
        const updatedHistory = [
          newBidRecord,
          ...s.bidHistory.map((b) => ({ ...b, status: 'Outbid' as const }))
        ];
        const updatedSession = {
          ...s,
          currentBid: amount,
          totalBidsCount: s.totalBidsCount + 1,
          reserveMet: isReserveMet || s.reserveMet,
          bidHistory: updatedHistory,
          vehicle: { ...s.vehicle, currentBid: amount, isAuction: true }
        };
        // Also update selected modal session
        if (selectedSession?.id === s.id) {
          setSelectedSession(updatedSession);
        }
        return updatedSession;
      }
      return s;
    });

    setSessions(updatedSessions);
    showToast(`Bid of Ksh ${amount.toLocaleString()} placed successfully on ${session.vehicleTitle}!`);
    setCustomBidAmount('');
  };

  // Seller Registration Handler
  const handleRegisterAuction = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVehicle = vehicles.find((v) => v.id === regVehicleId);
    if (!targetVehicle) {
      showToast('Please select a valid vehicle from your inventory', 'info');
      return;
    }

    const startPriceNum = Number(regStartingPrice) || Math.round(targetVehicle.price * 0.75);
    const reservePriceNum = Number(regReservePrice) || Math.round(targetVehicle.price * 0.9);
    const buyoutPriceNum = Number(regBuyoutPrice) || targetVehicle.price;
    const incrementNum = Number(regIncrement) || 25000;

    if (onUpdateVehicleAuctionStatus) {
      onUpdateVehicleAuctionStatus(targetVehicle.id, true);
    }
    targetVehicle.isAuction = true;
    targetVehicle.currentBid = startPriceNum;

    const newSession: AuctionSession = {
      id: `AUC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleId: targetVehicle.id,
      vehicleTitle: targetVehicle.title,
      vehicle: { ...targetVehicle, isAuction: true, currentBid: startPriceNum },
      sellerId: 'dealer-custom',
      sellerName: targetVehicle.sellerName,
      sellerType: targetVehicle.sellerType,
      category: regCategory,
      status: 'Live',
      startingPrice: startPriceNum,
      reservePrice: reservePriceNum,
      currentBid: startPriceNum,
      buyoutPrice: buyoutPriceNum,
      minimumIncrement: incrementNum,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + Number(regDurationDays) * 86400000).toISOString(),
      totalBidsCount: 1,
      uniqueBiddersCount: 1,
      reserveMet: startPriceNum >= reservePriceNum,
      termsAndConditions: [regTerms, 'Settlement protected by Escrow Vault.'],
      bidHistory: [
        {
          id: `bid-init-${Date.now()}`,
          bidderName: 'Opening Bid',
          bidderLocation: targetVehicle.county,
          amount: startPriceNum,
          timestamp: 'Just now',
          status: 'Highest Bid'
        }
      ]
    };

    setSessions([newSession, ...sessions]);
    showToast(`Vehicle "${targetVehicle.title}" is now listed for Live Auction!`);
    setActiveTab('live');
  };

  // Handle Subscribe Alert
  const handleNotifySubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    setIsSubscribed(true);
    showToast(`Subscribed! We will alert ${notifyContact} as soon as new live auctions start.`);
  };

  return (
    <div className="space-y-6 relative bg-[#F5F2EB]/40 min-h-screen pb-12">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-400/30 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Buyer-Focused Clean Page Header */}
      <PageHeader
        variant="navy"
        badgeIcon={<Gavel className="w-4 h-4 text-[#C85A32]" />}
        badgeText="Verified Auction Events"
        title="KAYAD Vehicle Auctions"
        description="Bid directly on verified bank repossessions, direct port imports, and dealer clearance sales. All listings feature verified 150-point technical inspection reports and 100% Escrow Vault protection."
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'live' ? 'accent' : 'outline'}
              size="md"
              onClick={() => setActiveTab('live')}
              className={activeTab === 'live' ? 'bg-[#C85A32] hover:bg-[#B34E28] text-white border-none' : ''}
            >
              <Gavel className="w-4 h-4" />
              <span>Live Auctions ({liveCount})</span>
            </Button>
            <Button
              variant={activeTab === 'register' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('register')}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Dealers & Banks Portal</span>
            </Button>
          </div>
        }
      />

      {/* Key Marketplace Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Active Bidding Sessions"
          value={`${liveCount} Sessions`}
          trend={liveCount > 0 ? "Bidding Open Now" : "Next Event Soon"}
          trendType={liveCount > 0 ? "positive" : "neutral"}
          icon={<Gavel className="w-4 h-4 text-[#C85A32]" />}
        />

        <StatWidget
          label="Total Bidding Volume"
          value={`Ksh ${totalVolumeInBids.toLocaleString()}`}
          trend={`${totalBidsInSystem} Verified Bids`}
          trendType="positive"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Featured Channels"
          value="Bank & Direct Imports"
          trend="NCBA & KRA Cleared"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-[#1E3063]" />}
        />

        <StatWidget
          label="Buyer Protection"
          value="Escrow Protected"
          trend="Funds Held Until Logbook Transfer"
          trendType="positive"
          icon={<Lock className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Category & Channel Filter Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          {[
            { id: 'live', label: 'Live Auctions', count: liveCount, icon: <Gavel className="w-4 h-4 text-[#C85A32]" /> },
            { id: 'upcoming', label: 'Upcoming Auctions', count: upcomingCount, icon: <Clock className="w-4 h-4 text-slate-600" /> },
            { id: 'ended', label: 'Recently Sold', count: endedCount, icon: <History className="w-4 h-4 text-slate-500" /> },
            { id: 'register', label: 'Dealers & Banks Portal', count: null, icon: <Building2 className="w-4 h-4 text-emerald-600" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1E3063] text-white shadow-2xs'
                    : 'bg-[#F5F2EB]/60 text-slate-700 hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[#C85A32] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category Pills */}
        {activeTab !== 'register' && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
            <span className="text-[10px] font-bold text-[#1E3063] uppercase tracking-wider px-1">Channel:</span>
            {['All', 'Bank Repossession', 'Direct Import', 'Fleet Clearance', 'Dealer Clearance'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#1E3063] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* STATE 1: LIVE AUCTIONS TAB */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {liveCount > 0 ? (
            <>
              {/* Event Progress Banner */}
              <div className="bg-[#1E3063] text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C85A32] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#C85A32]"></span>
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2 text-white">
                      Live Auction Event In Progress
                    </h2>
                    <p className="text-xs text-slate-300">
                      {liveCount} {liveCount === 1 ? 'vehicle' : 'vehicles'} accepting real-time bids. Escrow Vault protected settlement.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-300 font-medium shrink-0 flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{totalBidsInSystem} Total Bids Active</span>
                </div>
              </div>

              {/* SIMPLIFIED VEHICLE CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSessions.map((session) => {
                  const vehicle = session.vehicle;

                  return (
                    <Card 
                      key={session.id} 
                      className="flex flex-col justify-between overflow-hidden hover:border-[#1E3063]/30 transition-all shadow-2xs hover:shadow-md bg-white rounded-2xl"
                    >
                      <div>
                        {/* Vehicle Image */}
                        <div 
                          className="relative h-56 cursor-pointer overflow-hidden bg-slate-100"
                          onClick={() => setSelectedSession(session)}
                        >
                          <LazyImage 
                            src={vehicle.image} 
                            alt={session.vehicleTitle} 
                            wrapperClassName="w-full h-full" 
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500" 
                          />

                          {/* Maximum Three Badges */}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none z-10">
                            {/* Badge 1: Live Status in Coral Red */}
                            <Badge variant="live" size="sm" className="bg-[#C85A32] text-white border-none font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span>LIVE AUCTION</span>
                            </Badge>

                            {/* Badge 2: Channel / Category */}
                            <Badge variant="neutral" size="sm" className="bg-white/90 text-[#1E3063] font-semibold">
                              {session.category}
                            </Badge>

                            {/* Badge 3: Reserve Status */}
                            {session.reserveMet ? (
                              <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-bold border-none">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Reserve Met</span>
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm" className="bg-slate-900/80 text-white font-medium backdrop-blur-xs">
                                <span>Reserve Unmet</span>
                              </Badge>
                            )}
                          </div>

                          {/* Time Remaining Bar */}
                          <div className="absolute bottom-3 left-3 right-3 bg-[#101935]/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-white flex items-center justify-between text-xs pointer-events-none z-10">
                            <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Time Remaining:
                            </span>
                            <span className="font-mono font-bold text-white text-xs">
                              2d 14h 32m
                            </span>
                          </div>
                        </div>

                        {/* Card Details Body */}
                        <div className="p-5 space-y-3">
                          {/* Title & Seller Type */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                              <span>{session.sellerType}</span>
                              <span className="text-slate-600 font-bold">{session.totalBidsCount} Bids</span>
                            </div>
                            <h3 
                              className="text-lg font-black text-[#1E3063] font-display mt-1 hover:text-[#C85A32] cursor-pointer transition-colors line-clamp-1"
                              onClick={() => setSelectedSession(session)}
                            >
                              {session.vehicleTitle}
                            </h3>
                          </div>

                          {/* Primary Focal Point: Current Bid */}
                          <div className="p-3.5 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/70 flex items-baseline justify-between">
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Bid</p>
                              <p className="text-2xl font-black text-[#1E3063] font-display mt-0.5">
                                Ksh {session.currentBid.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reserve Status</p>
                              <p className={`text-xs font-bold mt-1 ${session.reserveMet ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {session.reserveMet ? 'Reserve Met' : `Reserve: Ksh ${session.reservePrice.toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="p-5 pt-0 flex items-center justify-between gap-2">
                        {session.buyoutPrice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onStartEscrow(vehicle)}
                            className="text-xs font-bold border-slate-300 text-[#1E3063] hover:bg-[#F5F2EB]"
                          >
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            Buy Now: Ksh {(session.buyoutPrice / 1000000).toFixed(2)}M
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedSession(session);
                            setModalTab('bid');
                          }}
                          className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs px-4 py-2 rounded-xl flex-1 justify-center"
                        >
                          <span>Bid & View Details</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            /* NO LIVE AUCTION DYNAMIC STATE */
            <div className="space-y-6">
              {/* Friendly Message Banner */}
              <Card className="p-8 text-center bg-white space-y-4 border border-slate-200/80 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F5F2EB] text-[#1E3063] flex items-center justify-center mx-auto">
                  <Gavel className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-[#1E3063]">No live auctions are currently running.</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Our verified auction events run on scheduled dates. Explore upcoming sessions below or request an instant notification when the next bidding window opens.
                  </p>
                </div>

                {/* Notify Me Interactive Form */}
                <form onSubmit={handleNotifySubscribe} className="max-w-md mx-auto pt-2 flex items-center gap-2">
                  <Input
                    placeholder="Enter email or phone number"
                    value={notifyContact}
                    onChange={(e) => setNotifyContact(e.target.value)}
                    required
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-bold text-xs shrink-0"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notify Me</span>
                  </Button>
                </form>
                {isSubscribed && (
                  <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 pt-1">
                    <Check className="w-4 h-4" /> You're subscribed for live auction alerts!
                  </p>
                )}
              </Card>

              {/* Upcoming Scheduled Auctions Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Upcoming Auction Calendar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map((session) => (
                    <Card key={session.id} className="p-4 flex gap-4 bg-white hover:border-slate-300 transition-all">
                      <LazyImage
                        src={session.vehicle.image}
                        alt={session.vehicleTitle}
                        wrapperClassName="w-28 h-24 rounded-xl overflow-hidden shrink-0"
                        className="w-full h-full object-cover"
                      />
                      <div className="flex-1 flex flex-col justify-between space-y-1">
                        <div>
                          <span className="text-[10px] font-bold text-[#1E3063] uppercase tracking-wider">
                            Starts: {new Date(session.startsAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                          </span>
                          <h4 className="text-sm font-bold text-[#1E3063] line-clamp-1">{session.vehicleTitle}</h4>
                          <p className="text-xs text-slate-500 font-medium">Starting Bid: Ksh {session.startingPrice.toLocaleString()}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSession(session);
                            setModalTab('bid');
                          }}
                          className="text-xs font-bold text-[#1E3063] border-slate-200 self-start py-1 px-3 h-auto"
                        >
                          View Schedule & Terms
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recently Sold Vehicles Section */}
              <div className="space-y-3 pt-4">
                <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  Recently Settled Auction Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {endedSessions.map((session) => (
                    <Card key={session.id} className="p-4 flex gap-4 bg-white opacity-90">
                      <LazyImage
                        src={session.vehicle.image}
                        alt={session.vehicleTitle}
                        wrapperClassName="w-28 h-24 rounded-xl overflow-hidden shrink-0 grayscale"
                        className="w-full h-full object-cover"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <Badge variant="neutral" size="sm" className="bg-slate-200 text-slate-700 text-[10px]">
                            SETTLED
                          </Badge>
                          <h4 className="text-sm font-bold text-[#1E3063] line-clamp-1 mt-1">{session.vehicleTitle}</h4>
                          <p className="text-xs font-extrabold text-emerald-800">Final Price: Ksh {session.currentBid.toLocaleString()}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Transferred via Escrow Vault</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 2: UPCOMING AUCTIONS TAB */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Scheduled Upcoming Auctions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="p-5 bg-white space-y-4">
                <div className="flex gap-4">
                  <LazyImage
                    src={session.vehicle.image}
                    alt={session.vehicleTitle}
                    wrapperClassName="w-32 h-28 rounded-xl overflow-hidden shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div className="space-y-1">
                    <Badge variant="neutral" size="sm" className="bg-[#F5F2EB] text-[#1E3063] font-bold">
                      {session.category}
                    </Badge>
                    <h4 className="text-base font-bold text-[#1E3063]">{session.vehicleTitle}</h4>
                    <p className="text-xs text-slate-600 font-medium">Opening Bid: Ksh {session.startingPrice.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">
                      Scheduled Date: <strong className="text-[#1E3063]">{new Date(session.startsAt).toLocaleDateString()}</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{session.sellerType}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedSession(session);
                      setModalTab('bid');
                    }}
                    className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs"
                  >
                    Set Reminder & Terms
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STATE 3: RECENTLY SOLD TAB */}
      {activeTab === 'ended' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Completed Auctions & Escrow Settlement Records
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {endedSessions.map((session) => (
              <Card key={session.id} className="p-5 bg-white space-y-3">
                <div className="flex gap-4">
                  <LazyImage
                    src={session.vehicle.image}
                    alt={session.vehicleTitle}
                    wrapperClassName="w-28 h-24 rounded-xl overflow-hidden shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ AUCTION SETTLED
                    </span>
                    <h4 className="text-base font-bold text-[#1E3063] mt-1">{session.vehicleTitle}</h4>
                    <p className="text-sm font-black text-slate-900 mt-0.5">Winning Bid: Ksh {session.currentBid.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{session.totalBidsCount} Total Bids</span>
                  <span className="font-semibold text-emerald-800">Escrow Transfer Complete</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB: SELLER LISTING FOR AUCTION */}
      {activeTab === 'register' && (
        <Card className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-slate-200/80 shadow-xs rounded-2xl">
          {isInstitutionalSeller ? (
            /* VERIFIED INSTITUTIONAL SELLER AUCTION FORM */
            <>
              <div>
                <Badge variant="neutral" size="md" className="bg-[#1E3063] text-white font-bold">
                  <Building2 className="w-4 h-4 text-emerald-400" /> Institutional Auction Listing Portal
                </Badge>
                <h3 className="text-2xl font-black text-[#1E3063] font-display mt-2">
                  Register Inventory for Live Auction Session
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  As a verified commercial partner ({user?.name}), select vehicles from your inventory to launch competitive live bidding events with custom starting prices, reserves, and Escrow Vault protected settlement.
                </p>
              </div>

              <form onSubmit={handleRegisterAuction} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Select Vehicle from Your Inventory</label>
                  <select
                    value={regVehicleId}
                    onChange={(e) => {
                      setRegVehicleId(e.target.value);
                      const sel = vehicles.find((v) => v.id === e.target.value);
                      if (sel) {
                        setRegStartingPrice(String(Math.round(sel.price * 0.75)));
                        setRegReservePrice(String(Math.round(sel.price * 0.9)));
                        setRegBuyoutPrice(String(sel.price));
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} ({v.sellerType} - Ksh {v.price.toLocaleString()}) {v.isAuction ? '[Currently Auction]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Auction Channel</label>
                    <select
                      value={regCategory}
                      onChange={(e) => setRegCategory(e.target.value as any)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                    >
                      <option value="Bank Repossession">Bank Repossession</option>
                      <option value="Direct Import">Direct Port Import</option>
                      <option value="Fleet Clearance">Corporate Fleet Clearance</option>
                      <option value="Dealer Clearance">Dealer Inventory Clearance</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Duration</label>
                    <select
                      value={regDurationDays}
                      onChange={(e) => setRegDurationDays(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                    >
                      <option value="1">24 Hours Flash Auction</option>
                      <option value="3">3 Days Standard Event</option>
                      <option value="7">7 Days Clearance Event</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Starting Bid (Ksh)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 1800000"
                      value={regStartingPrice}
                      onChange={(e) => setRegStartingPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Reserve Price (Ksh)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 2200000"
                      value={regReservePrice}
                      onChange={(e) => setRegReservePrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Instant Buyout Price (Ksh)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 2450000"
                      value={regBuyoutPrice}
                      onChange={(e) => setRegBuyoutPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Auction Terms & Condition Notes</label>
                  <textarea
                    value={regTerms}
                    onChange={(e) => setRegTerms(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  fullWidth
                  className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-bold"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Launch Live Vehicle Auction</span>
                </Button>
              </form>
            </>
          ) : (
            /* NON-INSTITUTIONAL (BUYER / GUEST) ONBOARDING HUB */
            <div className="space-y-6 text-xs">
              <div className="text-center space-y-2">
                <Badge variant="neutral" size="md" className="bg-[#1E3063] text-white font-bold inline-flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span>Institutional Partner Portal</span>
                </Badge>
                <h3 className="text-2xl font-black text-[#1E3063] font-display">
                  Auctions are Reserved Exclusively for Verified Partners
                </h3>
                <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                  To ensure 100% buyer trust, clean logbook titles, and verified 150-point technical audits, KAYAD Auctions are strictly operated by registered Commercial Banks, Asset Finance Agencies, Direct Port Importers, and Franchised Dealerships.
                </p>
              </div>

              {/* Institutional Channel Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3063] text-white flex items-center justify-center font-bold">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[#1E3063] text-sm">Commercial Banks & Lenders</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    NCBA, KCB, Co-op Bank & Microfinance institutions listing repossessions and loan collateral liquidations.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3063] text-white flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-bold text-[#1E3063] text-sm">Franchise Dealers & Fleets</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Certified enterprise dealers and corporate fleet managers running scheduled stock clearance events.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3063] text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-[#1E3063] text-sm">Direct Port Importers</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Mombasa Port customs cleared Japanese & UK import shipments with verified NTSA clearance certificates.
                  </p>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="p-4 bg-[#1E3063] text-white rounded-xl space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Partner Verification Requirements
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Valid KRA PIN & Business Registration Certificate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Mandatory 150-Point Technical Audit Certification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Escrow Vault Settlement Agreement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clear Title Guarantee & Logbook Ownership Verification</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 text-center space-y-3">
                {user ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
                    <p className="font-semibold flex items-center justify-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-700" />
                      Currently signed in as: <strong>{user.name}</strong> ({user.role === 'buyer' ? 'Private Buyer Account' : user.role})
                    </p>
                    <p className="text-[11px] text-amber-800">
                      If you represent a bank, dealership, or fleet agency, click below to submit an institutional seller verification request.
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => showToast("Institutional Partner Application received! Our team will contact you within 24 hours.")}
                      className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs mt-2"
                    >
                      Submit Institutional Partner Verification Application
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => onOpenAuth?.()}
                      className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs px-6 py-2.5 rounded-xl"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Sign In as Dealer / Bank Partner</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => onOpenAuth?.()}
                      className="border-slate-300 text-[#1E3063] font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-[#F5F2EB]"
                    >
                      <span>Register Partner Seller Account</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* COMPREHENSIVE AUCTION DETAILS & BID MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-[#101935]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <Card className="max-w-3xl w-full p-6 space-y-5 bg-white relative max-h-[92vh] overflow-y-auto rounded-2xl border-none shadow-2xl">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="live" size="sm" className="bg-[#C85A32] text-white border-none font-bold">
                  {selectedSession.status === 'Live' ? 'LIVE AUCTION' : selectedSession.status.toUpperCase()}
                </Badge>
                <Badge variant="neutral" size="sm" className="bg-[#F5F2EB] text-[#1E3063] font-semibold">
                  {selectedSession.category}
                </Badge>
              </div>
              <h3 className="text-2xl font-black text-[#1E3063] font-display mt-1">
                {selectedSession.vehicleTitle}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Session ID: {selectedSession.id} • {selectedSession.sellerType}</p>
            </div>

            {/* Modal Tabs: Bid, History, Inspection, Terms */}
            <div className="flex border-b border-slate-200 text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
              {[
                { id: 'bid', label: 'Bidding & Buyout', icon: Gavel },
                { id: 'history', label: `Bid Log (${selectedSession.totalBidsCount})`, icon: History },
                { id: 'inspection', label: '150-Point Inspection', icon: ShieldCheck },
                { id: 'terms', label: 'Escrow & Documents', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`px-4 py-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'border-[#1E3063] text-[#1E3063] bg-[#F5F2EB]/50' 
                        : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: BIDDING & BUYOUT CONTROLS */}
            {modalTab === 'bid' && (
              <div className="space-y-5 text-xs">
                {/* Price Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#F5F2EB]/70 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Highest Bid</p>
                    <p className="text-3xl font-black text-[#1E3063] font-display mt-0.5">
                      Ksh {selectedSession.currentBid.toLocaleString()}
                    </p>
                    <p className={`text-xs font-bold mt-1 ${selectedSession.reserveMet ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {selectedSession.reserveMet ? '✓ Reserve Met (Highest Bid Wins)' : `Reserve Price: Ksh ${selectedSession.reservePrice.toLocaleString()}`}
                    </p>
                  </div>

                  {selectedSession.buyoutPrice && (
                    <div className="border-t sm:border-t-0 sm:border-l border-slate-300 pt-3 sm:pt-0 sm:pl-4">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Instant Buyout Price</p>
                      <p className="text-2xl font-bold text-slate-800 font-display mt-0.5">
                        Ksh {selectedSession.buyoutPrice.toLocaleString()}
                      </p>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(null);
                          onStartEscrow(selectedSession.vehicle);
                        }}
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 w-full"
                      >
                        <Lock className="w-3.5 h-3.5" /> Buy Instantly via Escrow
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quick Bid Increments */}
                {selectedSession.status === 'Live' && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700">Quick Bid Increment Buttons:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        selectedSession.minimumIncrement,
                        selectedSession.minimumIncrement * 2,
                        selectedSession.minimumIncrement * 4
                      ].map((inc) => {
                        const targetVal = selectedSession.currentBid + inc;
                        return (
                          <button
                            key={inc}
                            onClick={() => executeBid(selectedSession, targetVal, bidderName || 'Verified Bidder', bidderLocation)}
                            className="p-3 bg-white hover:bg-[#1E3063] hover:text-white border border-slate-200 rounded-xl font-bold text-xs text-[#1E3063] transition-all cursor-pointer shadow-2xs"
                          >
                            +Ksh {(inc / 1000).toFixed(0)}k
                            <span className="block text-[10px] opacity-75 font-normal">Ksh {targetVal.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Bid Input Form */}
                {selectedSession.status === 'Live' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeBid(selectedSession, Number(customBidAmount), bidderName || 'Verified Bidder', bidderLocation);
                    }}
                    className="p-4 bg-white rounded-xl border border-slate-200 space-y-3"
                  >
                    <p className="font-bold text-[#1E3063]">Place Custom Bid Amount:</p>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        value={customBidAmount}
                        onChange={(e) => setCustomBidAmount(e.target.value)}
                        placeholder={`Minimum bid Ksh ${(selectedSession.currentBid + selectedSession.minimumIncrement).toLocaleString()}`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Your Name (e.g. Francis M.)"
                        value={bidderName}
                        onChange={(e) => setBidderName(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Location (e.g. Nairobi)"
                        value={bidderLocation}
                        onChange={(e) => setBidderLocation(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      fullWidth
                      className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Confirm & Place Bid</span>
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: CHRONOLOGICAL BID HISTORY LOG */}
            {modalTab === 'history' && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  Chronological Bid Audit Trail:
                </p>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedSession.bidHistory.length === 0 ? (
                    <p className="p-4 text-slate-400 text-center">No bids recorded yet for this session.</p>
                  ) : (
                    selectedSession.bidHistory.map((bid, idx) => (
                      <div key={bid.id || idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-[#1E3063]">{bid.bidderName} <span className="text-slate-400 font-normal">({bid.bidderLocation})</span></p>
                          <p className="text-[10px] text-slate-400">{bid.timestamp}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">Ksh {bid.amount.toLocaleString()}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            idx === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx === 0 ? 'Highest Bidder' : 'Outbid'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: 150-POINT INSPECTION REPORT */}
            {modalTab === 'inspection' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-emerald-900">150-Point Certified Mechanic Inspection Passed</p>
                    <p className="text-emerald-800 text-[11px]">
                      This vehicle underwent a complete physical diagnostic evaluation covering engine compression, transmission fluid analysis, chassis integrity, and digital OBD-II scanning.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Engine Health</p>
                    <p className="font-bold text-[#1E3063] text-sm mt-0.5">Grade A (96%)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Chassis & Frame</p>
                    <p className="font-bold text-[#1E3063] text-sm mt-0.5">Zero Accident Structural</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">OBD-II Scan</p>
                    <p className="font-bold text-emerald-700 text-sm mt-0.5">No Error Codes</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ESCROW WORKFLOW & TERMS */}
            {modalTab === 'terms' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#F5F2EB] rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-[#1E3063] flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" /> Escrow Vault Protection Terms:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {selectedSession.termsAndConditions.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Footer Close Button */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedSession(null)}
                className="text-xs font-bold"
              >
                Close Details
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AuctionsView;
