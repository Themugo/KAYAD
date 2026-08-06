import React, { useState } from 'react';
import { Vehicle, AuctionSession } from '../../../types';
import { createPlaceholderVehicle } from '../../../utils/vehicleDefaults';
import { Card, Badge, Button, Input } from '../../../components/ui';
import { Gavel, Users, TrendingUp, ShieldCheck, Settings, Clock, DollarSign, Eye, CheckCircle2, Play, Pause, BarChart2, Radio, Zap, Search, X, Sparkles, Sliders, Building2, Lock, Award, FileText, Download, UserCheck, XCircle, Crown, Star, Megaphone, Plus } from 'lucide-react';

export interface AuctionOrganizerDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  sessions: AuctionSession[];
  onUpdateSession?: (updatedSession: AuctionSession) => void;
  onOpenLiveRoom?: (session: AuctionSession) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

interface PendingBidder {
  id: string;
  name: string;
  idNumber: string;
  kraPin: string;
  depositAmount: number;
  depositStatus: 'verified' | 'pending';
  approved: boolean;
  registeredAt: string;
}

export const AuctionOrganizerDashboard: React.FC<AuctionOrganizerDashboardProps> = ({
  isOpen = true,
  onClose,
  sessions,
  onUpdateSession,
  onOpenLiveRoom,
  showToast
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  const [activeTab, setActiveTab] = useState<
    'monitor' | 'create' | 'vehicles' | 'bidders' | 'publish' | 'reports' | 'revenue' | 'engagement' | 'broadcaster' | 'settings'
  >('monitor');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  // Form states for settings modification
  const [editingReserve, setEditingReserve] = useState<number>(selectedSession?.reservePrice || 0);
  const [editingIncrement, setEditingIncrement] = useState<number>(selectedSession?.minimumIncrement || 10000);
  const [editingStartingPrice, setEditingStartingPrice] = useState<number>(selectedSession?.startingPrice || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Bulk selection state
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  // Bidders management state
  const [bidders, setBidders] = useState<PendingBidder[]>([
    { id: 'BD-8801', name: 'James K. Mugo', idNumber: 'ID-28491029', kraPin: 'A019283910K', depositAmount: 50000, depositStatus: 'verified', approved: true, registeredAt: '10 mins ago' },
    { id: 'BD-8802', name: 'Grace W. Njeri', idNumber: 'ID-30192841', kraPin: 'A082910492M', depositAmount: 50000, depositStatus: 'verified', approved: true, registeredAt: '25 mins ago' },
    { id: 'BD-8803', name: 'Dr. Kennedy Omondi', idNumber: 'ID-19204928', kraPin: 'A091827491P', depositAmount: 50000, depositStatus: 'verified', approved: true, registeredAt: '1 hour ago' },
    { id: 'BD-8804', name: 'Hassan Mohamed', idNumber: 'ID-24910293', kraPin: 'A071625341L', depositAmount: 50000, depositStatus: 'pending', approved: false, registeredAt: '2 hours ago' },
    { id: 'BD-8805', name: 'Sarah Chebet', idNumber: 'ID-31029481', kraPin: 'A048192039N', depositAmount: 50000, depositStatus: 'pending', approved: false, registeredAt: '3 hours ago' },
  ]);

  // Create auction form state
  const [newAuctionTitle, setNewAuctionTitle] = useState('');
  const [newAuctionOrganizer, setNewAuctionOrganizer] = useState('');
  const [newStartingPrice, setNewStartingPrice] = useState('1500000');
  const [newReservePrice, setNewReservePrice] = useState('2000000');
  const [newMinIncrement, setNewMinIncrement] = useState('10000');

  // Published results state
  const [publishedLotIds, setPublishedLotIds] = useState<string[]>(['SESSION-102']);

  // KAYAD Revenue Services active upgrades state per session
  const [upgrades, setUpgrades] = useState<{ [lotId: string]: { featured: boolean; homepage: boolean; sponsored: boolean; analytics: boolean } }>({
    'SESSION-101': { featured: true, homepage: false, sponsored: true, analytics: true },
    'SESSION-102': { featured: false, homepage: true, sponsored: false, analytics: false },
    'SESSION-103': { featured: true, homepage: true, sponsored: true, analytics: true }
  });

  // Update form fields when selected session changes
  React.useEffect(() => {
    if (selectedSession) {
      setEditingReserve(selectedSession.reservePrice || 0);
      setEditingIncrement(selectedSession.minimumIncrement || 10000);
      setEditingStartingPrice(selectedSession.startingPrice || 0);
    }
  }, [selectedSessionId, selectedSession]);

  if (!isOpen) return null;

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.vehicleTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBulkIds(filteredSessions.map(s => s.id));
    } else {
      setSelectedBulkIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedBulkIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdateStatus = (newStatus: 'live' | 'upcoming' | 'ended' | 'paused') => {
    if (selectedBulkIds.length === 0 || !onUpdateSession) return;
    selectedBulkIds.forEach(id => {
      const sessionToUpdate = sessions.find(s => s.id === id);
      if (sessionToUpdate) {
        onUpdateSession({
          ...sessionToUpdate,
          status: newStatus as any
        });
      }
    });
    if (showToast) {
      showToast(`⚡ Updated status to '${newStatus.toUpperCase()}' for ${selectedBulkIds.length} selected lots!`, 'success');
    }
  };

  const handleBulkExtendDuration = (minsToAdd: number) => {
    if (selectedBulkIds.length === 0 || !onUpdateSession) return;
    selectedBulkIds.forEach(id => {
      const sessionToUpdate = sessions.find(s => s.id === id);
      if (sessionToUpdate) {
        const currentEnd = new Date(sessionToUpdate.endsAt).getTime();
        const newEnd = new Date(currentEnd + minsToAdd * 60 * 1000).toISOString();
        onUpdateSession({
          ...sessionToUpdate,
          endsAt: newEnd
        });
      }
    });
    if (showToast) {
      showToast(`⏱️ Extended duration by +${minsToAdd} minutes for ${selectedBulkIds.length} selected lots!`, 'success');
    }
  };

  const handleBulkTogglePause = (pause: boolean) => {
    if (selectedBulkIds.length === 0 || !onUpdateSession) return;
    selectedBulkIds.forEach(id => {
      const sessionToUpdate = sessions.find(s => s.id === id);
      if (sessionToUpdate) {
        onUpdateSession({
          ...sessionToUpdate,
          status: pause ? ('paused' as any) : 'live'
        });
      }
    });
    if (showToast) {
      showToast(
        pause 
          ? `⏸️ Paused bidding for ${selectedBulkIds.length} selected lots!` 
          : `▶️ Resumed live bidding for ${selectedBulkIds.length} selected lots!`, 
        'info'
      );
    }
  };

  // Bidder approval handlers
  const handleApproveBidder = (id: string) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, approved: true, depositStatus: 'verified' } : b));
    if (showToast) {
      const bidder = bidders.find(b => b.id === id);
      showToast(`✅ Approved bidder ${bidder?.name || id} - Security deposit verified (Ksh 50,000 in escrow)`);
    }
  };

  const handleRevokeBidder = (id: string) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, approved: false } : b));
    if (showToast) {
      const bidder = bidders.find(b => b.id === id);
      showToast(`❌ Suspended bidding rights for ${bidder?.name || id}`, 'info');
    }
  };

  // Create auction handler
  const handleCreateAuctionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuctionTitle.trim()) return;

    const newId = `SESSION-${Math.floor(100 + Math.random() * 900)}`;
    const organizerName = newAuctionOrganizer || 'Auction Organizer';
    const dummyVehicle: Vehicle = createPlaceholderVehicle({
      id: `V-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newAuctionTitle,
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2023,
      price: Number(newStartingPrice) || 1000000,
      mileage: 15000,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      location: 'Nairobi',
      county: 'Nairobi',
      sellerType: 'Verified Dealer',
      sellerName: organizerName,
      sellerRating: 4.9,
      verified: true,
      inspectionPassed: true,
      escrowEligible: true,
      financeAvailable: true,
      isAuction: true,
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      listingFreshness: 'Just Added'
    });

    const newSession: AuctionSession = {
      id: newId,
      vehicleId: dummyVehicle.id,
      vehicleTitle: newAuctionTitle,
      vehicle: dummyVehicle,
      sellerId: 'SELL-001',
      sellerName: organizerName,
      sellerType: 'Verified Dealer',
      organizer: {
        id: `org-${Date.now()}`,
        name: organizerName,
        type: 'verified_dealer',
        isVerified: true,
        verificationBadge: 'verified',
      },
      category: 'Bank Repossession',
      startingPrice: Number(newStartingPrice) || 1000000,
      reservePrice: Number(newReservePrice) || 1500000,
      minimumIncrement: Number(newMinIncrement) || 10000,
      currentBid: Number(newStartingPrice) || 1000000,
      reserveMet: false,
      status: 'Upcoming',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      totalBidsCount: 0,
      uniqueBiddersCount: 0,
      bidHistory: [],
      termsAndConditions: ['Standard KAYAD Auction Terms']
    };

    if (onUpdateSession) {
      onUpdateSession(newSession);
    }
    if (showToast) {
      showToast(`🎉 Created new auction lot ${newId}: "${newAuctionTitle}"`);
    }

    setNewAuctionTitle('');
    setActiveTab('monitor');
  };

  // Publish results handler
  const handleTogglePublishResult = (lotId: string) => {
    if (publishedLotIds.includes(lotId)) {
      setPublishedLotIds(prev => prev.filter(id => id !== lotId));
      if (showToast) showToast(`Unpublished official result for ${lotId}`);
    } else {
      setPublishedLotIds(prev => [...prev, lotId]);
      if (showToast) showToast(`📢 Published official auction result for ${lotId} to public portal & winner!`);
    }
  };

  // Download reports handler
  const handleDownloadReport = (reportType: string) => {
    if (showToast) {
      showToast(`📥 Generated & downloaded ${reportType}_${new Date().toISOString().slice(0, 10)}.csv`, 'success');
    }
  };

  // Toggle upgrade handler
  const handleToggleUpgrade = (lotId: string, upgradeKey: 'featured' | 'homepage' | 'sponsored' | 'analytics') => {
    setUpgrades(prev => {
      const current = prev[lotId] || { featured: false, homepage: false, sponsored: false, analytics: false };
      const updated = { ...current, [upgradeKey]: !current[upgradeKey] };
      return { ...prev, [lotId]: updated };
    });
    if (showToast) {
      showToast(`✨ Updated KAYAD Revenue service upgrade for Lot ${lotId}`);
    }
  };

  // Aggregate stats
  const totalBids = sessions.reduce((acc, s) => acc + (s.totalBidsCount || 0), 0);
  const totalGrossValue = sessions.reduce((acc, s) => acc + (s.currentBid || s.startingPrice), 0);
  const activeViewersTotal = sessions.length * 42 + 18; // Simulated real-time engagement
  const reserveMetCount = sessions.filter(s => s.reserveMet).length;

  // KAYAD Revenue Calculation (Charged strictly to Organizers)
  const totalListingFees = sessions.length * 5000;
  const totalCommissions = sessions.reduce((acc, s) => acc + ((s.currentBid || 0) * 0.025), 0);
  let totalUpgradesRevenue = 0;
  Object.values(upgrades).forEach((u: { featured?: boolean; homepage?: boolean; sponsored?: boolean; analytics?: boolean }) => {
    if (u.featured) totalUpgradesRevenue += 15000;
    if (u.homepage) totalUpgradesRevenue += 25000;
    if (u.sponsored) totalUpgradesRevenue += 35000;
    if (u.analytics) totalUpgradesRevenue += 10000;
  });
  const totalKayadRevenue = totalListingFees + totalCommissions + totalUpgradesRevenue;

  // Handlers
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !onUpdateSession) return;

    const reserveMet = (selectedSession.currentBid || 0) >= editingReserve;

    const updated: AuctionSession = {
      ...selectedSession,
      reservePrice: editingReserve,
      minimumIncrement: editingIncrement,
      startingPrice: editingStartingPrice,
      reserveMet
    };

    onUpdateSession(updated);
    if (showToast) {
      showToast(`✅ Auction parameters updated for Lot ${selectedSession.id}: Reserve Ksh ${editingReserve.toLocaleString()}, Min Increment Ksh ${editingIncrement.toLocaleString()}`);
    }
  };

  const handleExtendTime = (minutes: number) => {
    if (!selectedSession || !onUpdateSession) return;
    const currentEnd = new Date(selectedSession.endsAt).getTime();
    const newEnd = new Date(currentEnd + minutes * 60 * 1000).toISOString();

    const updated: AuctionSession = {
      ...selectedSession,
      endsAt: newEnd
    };

    onUpdateSession(updated);
    if (showToast) {
      showToast(`⏱️ Extended bidding timer for ${selectedSession.vehicleTitle} by +${minutes} mins`);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    if (showToast) {
      showToast(isPaused ? `▶️ Resumed live bidding room` : `⏸️ Bidding room temporarily paused`, 'info');
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    if (showToast) {
      showToast(`📢 Announcement sent to room bidders: "${broadcastMessage}"`);
    }
    setBroadcastMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-sans">
      <Card className="max-w-6xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* TOP HEADER */}
        <div className="bg-[#101935] text-white p-5 sm:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C85A32]/20 border border-[#C85A32]/40 text-[#C85A32] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="sm" className="bg-[#C85A32] text-white font-extrabold text-[10px]">
                  ORGANIZER COMMAND CENTER
                </Badge>
                <span className="text-[11px] font-mono text-amber-300 font-bold">Auction Management Dashboard</span>
              </div>
              <h2 className="text-xl font-black font-display text-white mt-0.5">
                Active Auction Monitor & Parameter Control
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* METRICS SUMMARY BAR */}
        <div className="bg-[#F5F2EB] px-6 py-3 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1E3063] flex items-center justify-center shrink-0 font-bold">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Events</span>
              <span className="font-extrabold text-[#1E3063] text-sm">{sessions.length} Live Lots</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Room Engagement</span>
              <span className="font-extrabold text-emerald-700 text-sm">{activeViewersTotal} Concurrent Viewers</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Gross Bidding Value</span>
              <span className="font-extrabold text-slate-900 font-mono text-sm">Ksh {totalGrossValue.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Reserve Met Ratio</span>
              <span className="font-extrabold text-purple-900 text-sm">{reserveMetCount} of {sessions.length} Reserve Met</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'monitor' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span>1. Monitor Auction</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'create' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>2. Create Auction</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vehicles' || activeTab === 'settings' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>3. Manage Vehicles & Reserves</span>
          </button>

          <button
            onClick={() => setActiveTab('bidders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bidders' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>4. Approve Bidders</span>
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'publish' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>5. Publish Results</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>6. Download Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'revenue' ? 'bg-[#C85A32] text-white shadow-xs ring-2 ring-[#C85A32]/30' : 'text-[#C85A32] hover:bg-amber-50 font-black'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>💎 KAYAD Revenue & Services</span>
          </button>

          <button
            onClick={() => setActiveTab('engagement')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'engagement' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Analytics & Broadcast</span>
          </button>
        </div>

        {/* MAIN BODY AREA */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">

          {/* TAB 1: ACTIVE AUCTIONS MONITOR */}
          {activeTab === 'monitor' && (
            <div className="space-y-6 animate-fade-in">
              {/* FILTERS AND SEARCH */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lot title or ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-xs focus:ring-2 focus:ring-[#1E3063]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-500">Filter Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="p-2 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                  >
                    <option value="all">All Lots ({sessions.length})</option>
                    <option value="live">Live Only</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
              </div>

              {/* BULK ACTION TOOLBAR */}
              {selectedBulkIds.length > 0 && (
                <div className="bg-[#101935] text-white p-3.5 rounded-xl border border-amber-400/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold font-mono text-xs border border-amber-400/30">
                      {selectedBulkIds.length}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-white block">
                        {selectedBulkIds.length} Lot{selectedBulkIds.length > 1 ? 's' : ''} Selected for Batch Actions
                      </span>
                      <span className="text-[10px] text-slate-300">Update status, extend auction duration, or pause/resume bidding across lots</span>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    {/* BATCH ACTION 1: UPDATE STATUS */}
                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-amber-300 font-bold uppercase">Status:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkUpdateStatus('live')}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        Set Live
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkUpdateStatus('paused')}
                        className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        Set Paused
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkUpdateStatus('ended')}
                        className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        Set Ended
                      </button>
                    </div>

                    {/* BATCH ACTION 2: EXTEND DURATION */}
                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[10px] text-amber-300 font-bold uppercase">Extend:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkExtendDuration(5)}
                        className="px-2 py-0.5 rounded bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        +5m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkExtendDuration(15)}
                        className="px-2 py-0.5 rounded bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        +15m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkExtendDuration(60)}
                        className="px-2 py-0.5 rounded bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-[10px] transition-colors cursor-pointer"
                      >
                        +1h
                      </button>
                    </div>

                    {/* BATCH ACTION 3: PAUSE / RESUME */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleBulkTogglePause(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-colors cursor-pointer"
                      >
                        <Pause className="w-3 h-3" />
                        <span>Pause Bidding</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkTogglePause(false)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Resume Bidding</span>
                      </button>
                    </div>

                    {/* DESELECT ALL */}
                    <button
                      type="button"
                      onClick={() => setSelectedBulkIds([])}
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs transition-colors ml-1 cursor-pointer"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SESSIONS TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101935] text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredSessions.length > 0 && selectedBulkIds.length === filteredSessions.length}
                          onChange={handleSelectAll}
                          className="rounded border-slate-400 text-[#1E3063] focus:ring-[#1E3063] cursor-pointer"
                          title="Select / Deselect All Lots"
                        />
                      </th>
                      <th className="p-3">Lot ID / Vehicle Title</th>
                      <th className="p-3">Opening Price</th>
                      <th className="p-3">Current Bid</th>
                      <th className="p-3">Reserve Price</th>
                      <th className="p-3">Min Increment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSessions.map((session) => {
                      const isSelected = session.id === selectedSessionId;
                      const isBulkChecked = selectedBulkIds.includes(session.id);
                      return (
                        <tr 
                          key={session.id} 
                          className={`transition-colors ${isBulkChecked ? 'bg-amber-100/60' : isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isBulkChecked}
                              onChange={() => handleToggleSelectOne(session.id)}
                              className="rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063] cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] text-amber-700 font-bold block">{session.id}</span>
                            <span className="font-extrabold text-[#1E3063]">{session.vehicleTitle}</span>
                            <span className="text-[10px] text-slate-400 block">{session.sellerName}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700">
                            Ksh {(session.startingPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-700">
                            Ksh {(session.currentBid || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            Ksh {(session.reservePrice || 0).toLocaleString()}
                            <span className={`block text-[9px] font-sans font-extrabold ${session.reserveMet ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {session.reserveMet ? '✓ Met' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#1E3063]">
                            +Ksh {(session.minimumIncrement || 10000).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant={session.status === 'Live' ? 'live' : 'neutral'} 
                              size="sm"
                              className={session.status === 'Live' ? 'bg-[#C85A32] text-white font-bold' : 'bg-slate-200 text-slate-700'}
                            >
                              {session.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSessionId(session.id);
                                setActiveTab('settings');
                              }}
                              className="text-[10px] font-bold text-[#1E3063] px-2.5 py-1 h-auto"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              <span>Settings</span>
                            </Button>

                            {onOpenLiveRoom && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onOpenLiveRoom(session)}
                                className="bg-[#1E3063] text-white text-[10px] font-bold px-2.5 py-1 h-auto"
                              >
                                <Radio className="w-3 h-3 mr-1 text-red-400" />
                                <span>Preview Room</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* QUICK CONTROL PANEL FOR SELECTED SESSION */}
              {selectedSession && (
                <Card className="p-5 bg-gradient-to-br from-[#101935] to-[#1E3063] text-white border-none rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
                    <div>
                      <span className="font-mono text-amber-300 font-bold text-[10px]">SELECTED LOT: {selectedSession.id}</span>
                      <h3 className="text-base font-black text-white">{selectedSession.vehicleTitle}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTogglePause}
                        className="border-white/20 text-white hover:bg-white/10 text-xs font-bold"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" />}
                        <span>{isPaused ? 'Resume Room' : 'Pause Room'}</span>
                      </Button>

                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleExtendTime(5)}
                        className="bg-[#C85A32] hover:bg-[#B34E28] text-white text-xs font-extrabold"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>Extend +5 Mins</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Current Highest Bid</span>
                      <span className="text-xl font-black font-mono text-emerald-400">Ksh {(selectedSession.currentBid || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Configured Reserve Price</span>
                      <span className="text-xl font-black font-mono text-amber-300">Ksh {(selectedSession.reservePrice || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Configured Min Increment</span>
                      <span className="text-xl font-black font-mono text-white">+Ksh {(selectedSession.minimumIncrement || 10000).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              )}

            </div>
          )}

          {/* TAB 2: RESERVE PRICE & BID INCREMENTS SETTINGS */}
          {activeTab === 'settings' && selectedSession && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Manage Auction Settings & Financial Boundaries</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Adjust reserve prices, minimum bid increments, and starting thresholds for selected lots.</p>
                </div>
              </div>

              {/* LOT SELECTION DROPDOWN */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                <span className="font-bold text-slate-700 text-xs">Target Auction Lot:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-[#1E3063] flex-1"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.vehicleTitle} - Current Bid: Ksh {(s.currentBid || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* SETTINGS EDIT FORM */}
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RESERVE PRICE CONTROL */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Reserve Price Setting</span>
                    </h4>
                    <Badge variant={selectedSession.reserveMet ? 'success' : 'neutral'} size="sm">
                      {selectedSession.reserveMet ? 'Reserve Met' : 'Reserve Pending'}
                    </Badge>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    The minimum confidential threshold required to authorize vehicle sale upon auction conclusion.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Reserve Price Amount (Ksh)</label>
                    <Input
                      type="number"
                      value={editingReserve}
                      onChange={(e) => setEditingReserve(Number(e.target.value))}
                      className="font-mono font-bold text-sm text-[#1E3063]"
                    />
                  </div>

                  {/* QUICK ADJUSTMENT PRESETS */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Quick Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      {[100000, 500000, 1000000, 2500000, 5000000].map(amt => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setEditingReserve(amt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-[10px]"
                        >
                          Ksh {(amt / 1000).toLocaleString()}k
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* MINIMUM BID INCREMENT CONTROL */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Minimum Bid Increment</span>
                    </h4>
                    <span className="font-mono text-emerald-700 font-extrabold text-xs">
                      +Ksh {editingIncrement.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    The mandatory step increase required for every subsequent bidder submission.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Increment Amount (Ksh)</label>
                    <select
                      value={editingIncrement}
                      onChange={(e) => setEditingIncrement(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs text-slate-900"
                    >
                      <option value={5000}>+ Ksh 5,000 (Micro Vehicles)</option>
                      <option value={10000}>+ Ksh 10,000 (Standard Vehicles - Recommended)</option>
                      <option value={20000}>+ Ksh 20,000 (Mid-tier SUVs)</option>
                      <option value={25000}>+ Ksh 25,000 (Commercial Trucks)</option>
                      <option value={50000}>+ Ksh 50,000 (Executive / Luxury Lots)</option>
                      <option value={100000}>+ Ksh 100,000 (High-Value Fleet)</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Opening Price / Starting Bid (Ksh)</label>
                    <Input
                      type="number"
                      value={editingStartingPrice}
                      onChange={(e) => setEditingStartingPrice(Number(e.target.value))}
                      className="font-mono font-bold text-xs"
                    />
                  </div>
                </Card>

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>Apply & Save Updated Auction Parameters</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CREATE AUCTION */}
          {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    <span>Create & Launch New Auction Lot</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Set up starting prices, confidential reserves, bid increments, and vehicle details.</p>
                </div>
              </div>

              <form onSubmit={handleCreateAuctionSubmit} className="space-y-6">
                <Card className="p-6 bg-white border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Vehicle Title / Catalog Name</label>
                      <Input
                        type="text"
                        required
                        value={newAuctionTitle}
                        onChange={(e) => setNewAuctionTitle(e.target.value)}
                        placeholder="e.g., 2023 Toyota Land Cruiser Prado V8 VX"
                        className="text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Auction Organizer Name</label>
                      <Input
                        type="text"
                        value={newAuctionOrganizer}
                        onChange={(e) => setNewAuctionOrganizer(e.target.value)}
                        placeholder="e.g., ABC Motors Kenya"
                        className="text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Opening Price / Starting Bid (Ksh)</label>
                      <Input
                        type="number"
                        value={newStartingPrice}
                        onChange={(e) => setNewStartingPrice(e.target.value)}
                        className="font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Confidential Reserve Price (Ksh)</label>
                      <Input
                        type="number"
                        value={newReservePrice}
                        onChange={(e) => setNewReservePrice(e.target.value)}
                        className="font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Minimum Bid Increment (Ksh)</label>
                      <select
                        value={newMinIncrement}
                        onChange={(e) => setNewMinIncrement(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                      >
                        <option value="5000">Ksh 5,000</option>
                        <option value="10000">Ksh 10,000 (Recommended)</option>
                        <option value="20000">Ksh 20,000</option>
                        <option value="50000">Ksh 50,000</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">KAYAD Standard Listing Fee</label>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-between">
                        <span>Fixed Listing Fee</span>
                        <span className="font-mono font-extrabold text-sm">Ksh 5,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      variant="primary"
                      className="bg-[#1E3063] hover:bg-[#152347] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2 text-emerald-400" />
                      <span>Publish & Launch Auction Lot</span>
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          )}

          {/* TAB 3: MANAGE VEHICLES & RESERVES */}
          {(activeTab === 'vehicles' || activeTab === 'settings') && selectedSession && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Manage Vehicle Parameters, Reserves & Bid Increments</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Adjust reserve prices, minimum bid increments, and starting thresholds for selected lots.</p>
                </div>
              </div>

              {/* LOT SELECTION DROPDOWN */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                <span className="font-bold text-slate-700 text-xs">Target Auction Lot:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-[#1E3063] flex-1"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.vehicleTitle} - Current Bid: Ksh {(s.currentBid || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* SETTINGS EDIT FORM */}
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RESERVE PRICE CONTROL */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Reserve Price Setting</span>
                    </h4>
                    <Badge variant={selectedSession.reserveMet ? 'success' : 'neutral'} size="sm">
                      {selectedSession.reserveMet ? 'Reserve Met' : 'Reserve Pending'}
                    </Badge>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    The minimum confidential threshold required to authorize vehicle sale upon auction conclusion.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Reserve Price Amount (Ksh)</label>
                    <Input
                      type="number"
                      value={editingReserve}
                      onChange={(e) => setEditingReserve(Number(e.target.value))}
                      className="font-mono font-bold text-sm text-[#1E3063]"
                    />
                  </div>

                  {/* QUICK ADJUSTMENT PRESETS */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Quick Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      {[100000, 500000, 1000000, 2500000, 5000000].map(amt => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setEditingReserve(amt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-[10px]"
                        >
                          Ksh {(amt / 1000).toLocaleString()}k
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* MINIMUM BID INCREMENT CONTROL */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Minimum Bid Increment</span>
                    </h4>
                    <span className="font-mono text-emerald-700 font-extrabold text-xs">
                      +Ksh {editingIncrement.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    The mandatory step increase required for every subsequent bidder submission.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Increment Amount (Ksh)</label>
                    <select
                      value={editingIncrement}
                      onChange={(e) => setEditingIncrement(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs text-slate-900"
                    >
                      <option value={5000}>+ Ksh 5,000 (Micro Vehicles)</option>
                      <option value={10000}>+ Ksh 10,000 (Standard Vehicles - Recommended)</option>
                      <option value={20000}>+ Ksh 20,000 (Mid-tier SUVs)</option>
                      <option value={25000}>+ Ksh 25,000 (Commercial Trucks)</option>
                      <option value={50000}>+ Ksh 50,000 (Executive / Luxury Lots)</option>
                      <option value={100000}>+ Ksh 100,000 (High-Value Fleet)</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Opening Price / Starting Bid (Ksh)</label>
                    <Input
                      type="number"
                      value={editingStartingPrice}
                      onChange={(e) => setEditingStartingPrice(Number(e.target.value))}
                      className="font-mono font-bold text-xs"
                    />
                  </div>
                </Card>

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>Apply & Save Updated Auction Parameters</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: APPROVE BIDDERS */}
          {activeTab === 'bidders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Approve Bidders & Verify Security Deposits</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Authorize registered buyers after verifying National ID, KRA PIN, and Ksh 50,000 security deposit.</p>
                </div>

                <Badge variant="neutral" size="sm" className="bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                  {bidders.filter(b => b.approved).length} Approved / {bidders.length} Total Registered
                </Badge>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101935] text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Bidder ID & Full Name</th>
                      <th className="p-3">National ID & KRA PIN</th>
                      <th className="p-3">Security Deposit (Escrow)</th>
                      <th className="p-3">Registration Time</th>
                      <th className="p-3">Approval Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {bidders.map(bidder => (
                      <tr key={bidder.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-amber-700 font-bold block">{bidder.id}</span>
                          <span className="font-extrabold text-[#1E3063]">{bidder.name}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          <div>{bidder.idNumber}</div>
                          <div className="text-[10px] text-slate-400 font-bold">PIN: {bidder.kraPin}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-emerald-700 block">
                            Ksh {bidder.depositAmount.toLocaleString()}
                          </span>
                          <span className={`text-[9px] font-extrabold ${bidder.depositStatus === 'verified' ? 'text-emerald-700' : 'text-amber-600'}`}>
                            {bidder.depositStatus === 'verified' ? '✓ Deposit Verified' : '⏱️ Pending Verification'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{bidder.registeredAt}</td>
                        <td className="p-3">
                          <Badge 
                            variant={bidder.approved ? 'success' : 'neutral'}
                            size="sm"
                            className={bidder.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}
                          >
                            {bidder.approved ? 'APPROVED TO BID' : 'PENDING APPROVAL'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {bidder.approved ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeBidder(bidder.id)}
                              className="text-[10px] text-red-600 hover:bg-red-50 border-red-200 font-bold px-3 py-1"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              <span>Suspend</span>
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveBidder(bidder.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              <span>Approve Bidder</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PUBLISH RESULTS */}
          {activeTab === 'publish' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span>Publish Official Auction Results & Award Certificates</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Finalize hammer prices, issue Bill of Sale documents, and publish winning bids.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map(s => {
                  const isPublished = publishedLotIds.includes(s.id);
                  return (
                    <Card key={s.id} className="p-5 bg-white border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-bold text-amber-700">{s.id}</span>
                        <Badge variant={isPublished ? 'success' : 'neutral'} size="sm">
                          {isPublished ? 'RESULTS PUBLISHED' : 'DRAFT / UNPUBLISHED'}
                        </Badge>
                      </div>

                      <h4 className="font-extrabold text-[#1E3063] text-sm">{s.vehicleTitle}</h4>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Final Hammer Bid:</span>
                          <span className="font-extrabold text-emerald-700">Ksh {(s.currentBid || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Reserve Met Status:</span>
                          <span className={`font-bold ${s.reserveMet ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {s.reserveMet ? '✓ Reserve Met' : 'Unmet'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(`Bill_of_Sale_${s.id}`)}
                          className="text-[10px] font-bold text-[#1E3063]"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          <span>Download Bill of Sale</span>
                        </Button>

                        <Button
                          variant={isPublished ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleTogglePublishResult(s.id)}
                          className={isPublished ? 'border-slate-300 text-slate-700 font-bold text-[10px]' : 'bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[10px]'}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          <span>{isPublished ? 'Unpublish' : 'Publish Official Result'}</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: DOWNLOAD REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Download className="w-5 h-5 text-teal-600" />
                    <span>Download Audit & Performance Reports</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Export complete CSV summaries for bidding logs, revenue reconciliation, and bidder compliance.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 bg-white border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-[#1E3063] text-sm">Full Auction Bidding Log</h4>
                  <p className="text-slate-500 text-[11px]">Complete timestamped log of every bid placed across all live and past lots.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadReport('Auction_Bidding_Log')}
                    className="w-full bg-[#1E3063] hover:bg-[#152347] text-white font-extrabold text-xs py-2"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Export Bidding Log CSV</span>
                  </Button>
                </Card>

                <Card className="p-5 bg-white border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-[#1E3063] text-sm">Revenue & Settlement Report</h4>
                  <p className="text-slate-500 text-[11px]">Breakdown of listing fees, 2.5% commissions, and seller payout net statements.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadReport('Revenue_Settlement_Summary')}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-2"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Export Revenue CSV</span>
                  </Button>
                </Card>

                <Card className="p-5 bg-white border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-[#1E3063] text-sm">Bidder Escrow & Compliance Report</h4>
                  <p className="text-slate-500 text-[11px]">Security deposit audit log showing Ksh 50,000 escrow balances and approval records.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadReport('Bidder_Escrow_Audit')}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs py-2"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Export Escrow CSV</span>
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 7: KAYAD REVENUE & SERVICES */}
          {activeTab === 'revenue' && (
            <div className="space-y-6 animate-fade-in">
              {/* CLEAR SEPARATION GUARANTEE CALLOUT */}
              <div className="bg-gradient-to-br from-[#101935] to-[#1E3063] text-white p-6 rounded-2xl shadow-xl space-y-3 border border-amber-400/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-amber-300">KAYAD Platform Revenue Engine & Service Upgrades</h3>
                    <span className="text-xs text-slate-300 font-medium">Transparent, Organizer-funded platform revenue model</span>
                  </div>
                </div>

                <div className="p-4 bg-white/10 rounded-xl border border-white/10 text-xs text-slate-200 leading-relaxed">
                  <span className="font-extrabold text-amber-300 block mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>STRICT REVENUE SEPARATION POLICY</span>
                  </span>
                  KAYAD platform revenue is generated strictly from Organizer operational fees (Fixed Listing Fees, 2.5% Success Commission, and Promotional Upgrades). Bidder security deposits (Ksh 50,000) and vehicle purchase funds remain 100% untouched in dedicated client escrow.
                </div>
              </div>

              {/* REVENUE SUMMARY METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fixed Listing Fees</span>
                  <div className="text-xl font-black font-mono text-[#1E3063]">
                    Ksh {totalListingFees.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Ksh 5,000 × {sessions.length} lots</span>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Success Commission (2.5%)</span>
                  <div className="text-xl font-black font-mono text-emerald-700">
                    Ksh {totalCommissions.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 block">2.5% of gross hammer value</span>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Promotional Upgrades</span>
                  <div className="text-xl font-black font-mono text-amber-600">
                    Ksh {totalUpgradesRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Featured & Homepage Boosts</span>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-amber-500 to-[#C85A32] text-white border-none space-y-1">
                  <span className="text-[10px] font-bold text-amber-100 uppercase">Total KAYAD Revenue</span>
                  <div className="text-2xl font-black font-mono text-white">
                    Ksh {totalKayadRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-100 font-bold block">100% Organizer Funded</span>
                </Card>
              </div>

              {/* ORGANIZER PROMOTIONAL UPGRADES CATALOG */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Manage Optional Promotional Upgrades Per Lot</span>
                </h4>

                <div className="space-y-4">
                  {sessions.map(s => {
                    const sessionUpgrades = upgrades[s.id] || { featured: false, homepage: false, sponsored: false, analytics: false };
                    return (
                      <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-amber-700">Lot {s.id}</span>
                            <h5 className="font-extrabold text-[#1E3063] text-xs">{s.vehicleTitle}</h5>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            Listing Fee: Ksh 5,000 | Comm: 2.5%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {/* UPGRADE 1: FEATURED */}
                          <button
                            type="button"
                            onClick={() => handleToggleUpgrade(s.id, 'featured')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              sessionUpgrades.featured ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[11px] flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span>Featured Upgrade</span>
                              </span>
                              {sessionUpgrades.featured && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                            </div>
                            <span className="font-mono font-extrabold text-xs block text-slate-900">Ksh 15,000</span>
                            <span className="text-[9px] text-slate-500 block">Gold badge & priority search</span>
                          </button>

                          {/* UPGRADE 2: HOMEPAGE PROMO */}
                          <button
                            type="button"
                            onClick={() => handleToggleUpgrade(s.id, 'homepage')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              sessionUpgrades.homepage ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[11px] flex items-center gap-1">
                                <Megaphone className="w-3.5 h-3.5 text-blue-500" />
                                <span>Homepage Promo</span>
                              </span>
                              {sessionUpgrades.homepage && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                            </div>
                            <span className="font-mono font-extrabold text-xs block text-slate-900">Ksh 25,000</span>
                            <span className="text-[9px] text-slate-500 block">Main banner placement</span>
                          </button>

                          {/* UPGRADE 3: SPONSORED PLACEMENT */}
                          <button
                            type="button"
                            onClick={() => handleToggleUpgrade(s.id, 'sponsored')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              sessionUpgrades.sponsored ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[11px] flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5 text-purple-500" />
                                <span>Sponsored Placement</span>
                              </span>
                              {sessionUpgrades.sponsored && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                            </div>
                            <span className="font-mono font-extrabold text-xs block text-slate-900">Ksh 35,000</span>
                            <span className="text-[9px] text-slate-500 block">Top-of-catalog lock</span>
                          </button>

                          {/* UPGRADE 4: PREMIUM ANALYTICS */}
                          <button
                            type="button"
                            onClick={() => handleToggleUpgrade(s.id, 'analytics')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              sessionUpgrades.analytics ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[11px] flex items-center gap-1">
                                <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Premium Analytics</span>
                              </span>
                              {sessionUpgrades.analytics && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                            </div>
                            <span className="font-mono font-extrabold text-xs block text-slate-900">Ksh 10,000/mo</span>
                            <span className="text-[9px] text-slate-500 block">Bidder AI heatmaps</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 8: BIDDER ENGAGEMENT ANALYTICS */}
          {activeTab === 'engagement' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-emerald-600" />
                    <span>Real-Time Bidder Engagement & Velocity Metrics</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Track active room viewers, bid submission rates, and lead retention.</p>
                </div>
              </div>

              {/* STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 bg-white border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Average Bid Velocity</span>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-black text-[#1E3063]">4.2 Bids / Min</h4>
                    <span className="text-[10px] text-emerald-700 font-bold">+18% high activity</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#1E3063] h-full w-[72%] rounded-full"></div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Bidders in Room</span>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-black text-emerald-700">14 Verified Bidders</h4>
                    <span className="text-[10px] text-slate-500 font-bold">100% Security Deposit Paid</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-600 h-full w-[88%] rounded-full"></div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lead Bidder Retention</span>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-black text-purple-900">85% Retained</h4>
                    <span className="text-[10px] text-purple-700 font-bold">Low churn rate</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-700 h-full w-[85%] rounded-full"></div>
                  </div>
                </Card>
              </div>

              {/* TOP ENGAGED BIDDERS LEADERBOARD */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Top Bidding Participants Leaderboard</span>
                </h4>

                <div className="space-y-2">
                  {[
                    { alias: 'Bidder A-104 (James K. Mugo)', bids: 8, maxBid: 3450000, status: 'Leading Highest Bidder', time: '2 mins ago' },
                    { alias: 'Bidder A-209 (Grace W. Njeri)', bids: 6, maxBid: 3400000, status: 'Active Contender', time: '5 mins ago' },
                    { alias: 'Bidder A-301 (Dr. Kennedy Omondi)', bids: 4, maxBid: 3350000, status: 'Active Contender', time: '12 mins ago' },
                    { alias: 'Bidder A-112 (Hassan Mohamed)', bids: 3, maxBid: 3200000, status: 'Outbid', time: '25 mins ago' }
                  ].map((bidder, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1E3063] text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          #{i + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#1E3063]">{bidder.alias}</span>
                          <span className="text-[10px] text-slate-500 block">{bidder.bids} bids placed • Last active {bidder.time}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-700 block">Ksh {bidder.maxBid.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-600">{bidder.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: BROADCASTER */}
          {activeTab === 'broadcaster' && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6 bg-gradient-to-br from-[#101935] to-[#1E3063] text-white border-none rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-base">
                  <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                  <span>Send Broadcaster Alert to Active Bidders</span>
                </div>

                <p className="text-slate-300 text-xs">
                  Broadcast instant banner announcements across all connected bidder preview screens (e.g., 'Reserve Price HAS BEEN MET!', 'Final 60 Seconds Remaining!').
                </p>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <textarea
                    rows={4}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type official auctioneer announcement text here..."
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="accent"
                      disabled={!broadcastMessage.trim()}
                      className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs px-6 py-2.5"
                    >
                      <Zap className="w-4 h-4 mr-1 text-amber-300" />
                      <span>Transmit Room Broadcast</span>
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

        </div>

      </Card>
    </div>
  );
};
