import React, { useState } from 'react';
import { AuctionSession, Vehicle } from '../../../types';
import { VerifiedBidderProfile } from './BidderRegistrationModal';
import { 
  Building2, 
  Gavel, 
  Users, 
  Activity, 
  Award, 
  Download, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Edit3, 
  Eye, 
  ShieldCheck, 
  Sparkles, 
  Tag, 
  Zap, 
  FileSpreadsheet, 
  FileText, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronRight, 
  BarChart2, 
  Radio, 
  Sliders, 
  ShieldAlert,
  Car,
  Search,
  ArrowUpRight
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../../components/ui';

export interface OrganizerUpgradeConfig {
  listingFeePaid: boolean;
  featuredUpgrade: boolean;
  homepagePromo: boolean;
  sponsoredPlacement: boolean;
  premiumAnalytics: boolean;
}

interface OrganizerManagementConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: AuctionSession[];
  verifiedBiddersMap: Record<string, VerifiedBidderProfile>;
  onApproveBidder?: (sessionId: string, profile: VerifiedBidderProfile) => void;
  onRejectBidder?: (sessionId: string, bidderId: string) => void;
  onUpdateSession?: (updatedSession: AuctionSession) => void;
  onCreateNewAuction?: () => void;
  onOpenLiveRoom?: (session: AuctionSession) => void;
  onPublishResults?: (session: AuctionSession) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export const OrganizerManagementConsole: React.FC<OrganizerManagementConsoleProps> = ({
  isOpen,
  onClose,
  sessions,
  verifiedBiddersMap,
  onApproveBidder,
  onRejectBidder,
  onUpdateSession,
  onCreateNewAuction,
  onOpenLiveRoom,
  onPublishResults,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'vehicles' | 'bidders' | 'monitor' | 'publish' | 'revenue' | 'reports'
  >('overview');

  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  // Pending bidder requests state
  const [pendingBidders, setPendingBidders] = useState<Array<{
    id: string;
    sessionId: string;
    sessionTitle: string;
    fullName: string;
    phone: string;
    idNumber: string;
    depositAmount: number;
    paymentRef: string;
    timestamp: string;
    status: 'pending' | 'approved' | 'rejected';
  }>>([
    {
      id: 'REQ-901',
      sessionId: 'AUC-2026-8801',
      sessionTitle: '2023 Toyota Land Cruiser Prado TX-L',
      fullName: 'Dr. Kennedy Omondi',
      phone: '+254 722 445 190',
      idNumber: '29801452',
      depositAmount: 50000,
      paymentRef: 'MP-QGH88219A',
      timestamp: '12 mins ago',
      status: 'pending'
    },
    {
      id: 'REQ-902',
      sessionId: 'AUC-2026-8801',
      sessionTitle: '2023 Toyota Land Cruiser Prado TX-L',
      fullName: 'Beatrice Wanjiku',
      phone: '+254 733 881 002',
      idNumber: '31092874',
      depositAmount: 50000,
      paymentRef: 'MP-QGH91022B',
      timestamp: '25 mins ago',
      status: 'pending'
    },
    {
      id: 'REQ-903',
      sessionId: 'AUC-2026-8802',
      sessionTitle: '2022 Subaru Forester 2.0i EyeSight',
      fullName: 'Hassan Mohamed',
      phone: '+254 710 334 991',
      idNumber: '27651094',
      depositAmount: 30000,
      paymentRef: 'MP-QGH77390C',
      timestamp: '1 hour ago',
      status: 'pending'
    }
  ]);

  // KAYAD Revenue Upgrades State for Active Sessions
  const [activeUpgrades, setActiveUpgrades] = useState<Record<string, OrganizerUpgradeConfig>>({
    'AUC-2026-8801': {
      listingFeePaid: true,
      featuredUpgrade: true,
      homepagePromo: true,
      sponsoredPlacement: false,
      premiumAnalytics: true
    },
    'AUC-2026-8802': {
      listingFeePaid: true,
      featuredUpgrade: false,
      homepagePromo: false,
      sponsoredPlacement: false,
      premiumAnalytics: false
    }
  });

  // Monitor Live Control State
  const [isPaused, setIsPaused] = useState(false);
  const [customAnnouncement, setCustomAnnouncement] = useState('');

  if (!isOpen) return null;

  // Revenue calculation totals
  const upgradeList: OrganizerUpgradeConfig[] = Object.values(activeUpgrades);
  const totalListingFees = upgradeList.filter((u) => u.listingFeePaid).length * 15000;
  const totalUpgradeFees = upgradeList.reduce((acc: number, curr: OrganizerUpgradeConfig) => {
    let sum = 0;
    if (curr.featuredUpgrade) sum += 25000;
    if (curr.homepagePromo) sum += 10000;
    if (curr.sponsoredPlacement) sum += 18000;
    if (curr.premiumAnalytics) sum += 12000;
    return acc + sum;
  }, 0);

  const estimatedCommissions = sessions.reduce((acc, sess) => {
    return acc + Math.round((sess.currentBid || sess.startingPrice) * 0.025);
  }, 0);

  const totalKayadRevenue = totalListingFees + totalUpgradeFees + estimatedCommissions;

  // Handlers
  const handleApproveRequest = (reqId: string) => {
    const req = pendingBidders.find(p => p.id === reqId);
    if (!req) return;

    setPendingBidders(prev => prev.map(p => p.id === reqId ? { ...p, status: 'approved' } : p));
    
    // Pass to parent verified map
    const newProfile: VerifiedBidderProfile = {
      sessionId: req.sessionId,
      bidderNumber: `Bidder A-${Math.floor(100 + Math.random() * 900)}`,
      anonymousAlias: `Bidder A-${Math.floor(100 + Math.random() * 900)}`,
      idNumber: req.idNumber,
      fullName: req.fullName,
      phone: req.phone,
      paymentReference: req.paymentRef,
      verifiedAt: 'Just now',
      depositAmount: req.depositAmount
    };

    if (onApproveBidder) {
      onApproveBidder(req.sessionId, newProfile);
    }
    if (showToast) {
      showToast(`✅ Approved bidder ${req.fullName} for session ${req.sessionId}`);
    }
  };

  const handleRejectRequest = (reqId: string) => {
    setPendingBidders(prev => prev.map(p => p.id === reqId ? { ...p, status: 'rejected' } : p));
    if (showToast) {
      showToast(`❌ Rejected bidder registration request #${reqId}`, 'info');
    }
  };

  const handleToggleUpgrade = (sessionId: string, key: 'featuredUpgrade' | 'homepagePromo' | 'sponsoredPlacement' | 'premiumAnalytics', price: number, label: string) => {
    const current = activeUpgrades[sessionId] || {
      listingFeePaid: true,
      featuredUpgrade: false,
      homepagePromo: false,
      sponsoredPlacement: false,
      premiumAnalytics: false
    };

    const nextState = !current[key];
    setActiveUpgrades(prev => ({
      ...prev,
      [sessionId]: {
        ...current,
        [key]: nextState
      }
    }));

    if (showToast) {
      showToast(
        nextState 
          ? `🚀 KAYAD Upgrade Activated: ${label} for Ksh ${price.toLocaleString()}` 
          : `Removed ${label} from Session ${sessionId}`,
        nextState ? 'success' : 'info'
      );
    }
  };

  const handleExtendTime = () => {
    if (!selectedSession || !onUpdateSession) return;
    const currentEnd = new Date(selectedSession.endsAt).getTime();
    const newEnd = new Date(currentEnd + 5 * 60 * 1000).toISOString();
    
    onUpdateSession({
      ...selectedSession,
      endsAt: newEnd
    });

    if (showToast) showToast(`⏱️ Extended live bidding timer by +5 minutes!`);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    if (showToast) showToast(isPaused ? `▶️ Resumed live bidding room` : `⏸️ Paused live bidding room`, 'info');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAnnouncement.trim()) return;
    if (showToast) showToast(`📢 Broadcast sent to bidders: "${customAnnouncement}"`);
    setCustomAnnouncement('');
  };

  const handleDownloadReport = (type: string) => {
    if (showToast) showToast(`📄 Downloading ${type} Report (PDF/CSV)...`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-sans">
      <Card className="max-w-6xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* CONSOLE HEADER */}
        <div className="bg-[#101935] text-white p-5 sm:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C85A32]/20 border border-[#C85A32]/40 text-[#C85A32] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="sm" className="bg-[#C85A32] text-white font-extrabold text-[10px]">
                  ORGANIZER PORTAL
                </Badge>
                <span className="text-[11px] font-mono text-amber-300 font-bold">KAYAD Enterprise B2B Engine</span>
              </div>
              <h2 className="text-xl font-black font-display text-white mt-0.5">
                Auction Organizer & Revenue Command Center
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => {
                onClose();
                if (onCreateNewAuction) onCreateNewAuction();
              }}
              className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-1 text-white" />
              <span>Create New Auction Event</span>
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KAYAD B2B REVENUE TRANSPARENCY BANNER */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-emerald-500/10 border-b border-amber-300/40 px-6 py-2.5 flex items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <p className="text-slate-800 text-[11px]">
              <strong className="text-[#1E3063]">KAYAD Revenue Assurance:</strong> Platform revenue is generated <strong>exclusively from organizers</strong> via fixed listing fees, commissions & promotional upgrades. <strong>Zero fees taken from bidder deposits or vehicle purchase funds.</strong>
            </p>
          </div>
          <Badge variant="outline" size="sm" className="hidden lg:flex border-emerald-600 text-emerald-800 font-mono font-bold shrink-0">
            100% Transparent B2B Architecture
          </Badge>
        </div>

        {/* MANAGEMENT NAVIGATION TABS */}
        <div className="bg-[#F5F2EB] px-6 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-amber-300" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vehicles' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 text-blue-400" />
            <span>Manage Vehicles ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bidders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bidders' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Approve Bidders ({pendingBidders.filter(p => p.status === 'pending').length} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'monitor' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Monitor Live Room</span>
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'publish' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Publish Results & Certificate</span>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'revenue' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-300" />
            <span>KAYAD Revenue & Upgrades</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-300" />
            <span>Reports & Settlement</span>
          </button>
        </div>

        {/* TAB BODY AREA */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP METRICS SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Auction Events</span>
                    <h3 className="text-2xl font-black text-[#1E3063] font-display">{sessions.length} Active Events</h3>
                    <span className="text-[10px] text-emerald-700 font-semibold">100% Gate Verified</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3063] flex items-center justify-center">
                    <Gavel className="w-5 h-5" />
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Registered Bidders</span>
                    <h3 className="text-2xl font-black text-emerald-700 font-display">
                      {Object.keys(verifiedBiddersMap).length + 18} Verified Bidders
                    </h3>
                    <span className="text-[10px] text-amber-700 font-semibold">{pendingBidders.filter(p => p.status === 'pending').length} Pending Approvals</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Hammer Gross Value</span>
                    <h3 className="text-2xl font-black text-[#1E3063] font-mono">
                      Ksh {(sessions.reduce((a, b) => a + (b.currentBid || 0), 0)).toLocaleString()}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">Direct Settlement to Organizer</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </Card>

                <Card className="p-4 bg-[#101935] text-white border-none flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-300">KAYAD Platform Revenue</span>
                    <h3 className="text-2xl font-black text-amber-400 font-mono">
                      Ksh {totalKayadRevenue.toLocaleString()}
                    </h3>
                    <span className="text-[10px] text-slate-300 font-medium">Listing + Commission + Upgrades</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </Card>
              </div>

              {/* QUICK ACTIONS GRID & ACTIVE AUCTIONS STATUS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ACTIVE SESSIONS TABLE */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-[#C85A32]" />
                      <span>Organizer Auction Portfolio</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">Click session to manage</span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F5F2EB] text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Event / Vehicle Title</th>
                          <th className="p-3">Current Bid</th>
                          <th className="p-3">Bids</th>
                          <th className="p-3">Upgrades</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sessions.map((session) => {
                          const upg = activeUpgrades[session.id] || { listingFeePaid: true, featuredUpgrade: false, homepagePromo: false, sponsoredPlacement: false, premiumAnalytics: false };
                          return (
                            <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <span className="font-mono text-[10px] text-amber-700 font-bold block">{session.id}</span>
                                <span className="font-bold text-[#1E3063]">{session.vehicleTitle}</span>
                              </td>
                              <td className="p-3 font-mono font-bold text-emerald-700">
                                Ksh {(session.currentBid || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-slate-600 font-bold">{session.totalBidsCount || 0} bids</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  {upg.featuredUpgrade && <Badge variant="accent" size="sm" className="bg-amber-400 text-slate-900 text-[9px]">Featured</Badge>}
                                  {upg.homepagePromo && <Badge variant="neutral" size="sm" className="bg-purple-100 text-purple-800 text-[9px]">Promo</Badge>}
                                </div>
                              </td>
                              <td className="p-3 text-right space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSessionId(session.id);
                                    setActiveTab('monitor');
                                  }}
                                  className="text-[10px] font-bold text-[#1E3063] px-2 py-1 h-auto"
                                >
                                  Monitor
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* QUICK ORGANIZER ACTIONS */}
                <div className="space-y-4">
                  <Card className="p-5 bg-gradient-to-br from-[#101935] to-[#1E3063] text-white border-none rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                      <Sparkles className="w-4.5 h-4.5" />
                      <span>Organizer Toolkit Shortcuts</span>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('bidders')}
                        className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-between text-xs font-bold transition-all text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400" />
                          Review Pending Bidders ({pendingBidders.filter(p => p.status === 'pending').length})
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('monitor')}
                        className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-between text-xs font-bold transition-all text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-red-400" />
                          Launch Live Bidding Room Console
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('revenue')}
                        className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-between text-xs font-bold transition-all text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          Boost Listing with KAYAD Promotional Upgrades
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('reports')}
                        className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-between text-xs font-bold transition-all text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-blue-300" />
                          Download Financial Settlement Statements
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </Card>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MANAGE VEHICLES & AUCTION PARAMETERS */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display">Vehicle Catalog & Reserve Pricing</h3>
                  <p className="text-slate-500 text-[11px]">Adjust opening prices, reserve caps, minimum increments, and lot ordering.</p>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    onClose();
                    if (onCreateNewAuction) onCreateNewAuction();
                  }}
                  className="bg-[#C85A32] text-white font-extrabold text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Add New Vehicle Lot</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="p-5 bg-white border-slate-200 space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-700">{session.id}</span>
                        <h4 className="font-extrabold text-[#1E3063] text-sm">{session.vehicleTitle}</h4>
                        <span className="text-[11px] text-slate-500">{session.sellerName}</span>
                      </div>
                      <Badge variant="accent" size="sm" className="bg-[#1E3063] text-white font-mono font-bold">
                        {session.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Opening Price</span>
                        <span className="font-mono font-bold text-slate-900">Ksh {(session.startingPrice || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Reserve Price</span>
                        <span className="font-mono font-bold text-slate-900">Ksh {(session.reservePrice || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Current Highest Bid</span>
                        <span className="font-mono font-black text-emerald-700">Ksh {(session.currentBid || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Bid Security Required</span>
                        <span className="font-mono font-bold text-[#1E3063]">Ksh {(session.bidSecurityAmount || 50000).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 font-medium">Viewing Yard: {session.viewingLocation}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          setActiveTab('monitor');
                        }}
                        className="text-xs font-bold text-[#1E3063]"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        <span>Manage Session</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BIDDER APPROVALS & REGISTRATION AUDIT */}
          {activeTab === 'bidders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-emerald-600" />
                    <span>Bidder Registration & Security Deposit Verification</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Verify custodian bank references and issue official bidder entry passes.</p>
                </div>
                <Badge variant="accent" size="sm" className="bg-emerald-600 text-white font-extrabold">
                  {pendingBidders.filter(p => p.status === 'pending').length} Pending Review
                </Badge>
              </div>

              {/* PENDING APPROVALS LIST */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Incoming Deposit Approvals</span>

                {pendingBidders.map((req) => (
                  <Card 
                    key={req.id} 
                    className={`p-4 border transition-all ${
                      req.status === 'approved' 
                        ? 'bg-emerald-50/50 border-emerald-300' 
                        : req.status === 'rejected'
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E3063] text-sm">{req.fullName}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                            ID: {req.idNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">{req.timestamp}</span>
                        </div>

                        <p className="text-slate-600 font-medium">Target Event: <strong className="text-slate-900">{req.sessionTitle}</strong></p>

                        <div className="flex items-center gap-4 text-[11px] pt-1">
                          <span className="text-slate-600">Phone: <strong className="text-slate-900 font-mono">{req.phone}</strong></span>
                          <span className="text-slate-600">M-Pesa / Bank Ref: <strong className="text-emerald-800 font-mono font-black">{req.paymentRef}</strong></span>
                          <span className="text-slate-600">Deposit Paid: <strong className="text-[#1E3063] font-mono font-bold">Ksh {req.depositAmount.toLocaleString()}</strong></span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'pending' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectRequest(req.id)}
                              className="border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              <span>Decline Pass</span>
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveRequest(req.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              <span>Approve & Issue Pass</span>
                            </Button>
                          </>
                        ) : req.status === 'approved' ? (
                          <Badge variant="success" size="md" className="bg-emerald-600 text-white font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified Bidder Pass Issued</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="md" className="bg-red-100 text-red-800 font-bold">
                            Declined
                          </Badge>
                        )}
                      </div>

                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MONITOR LIVE AUCTION ROOM */}
          {activeTab === 'monitor' && selectedSession && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-[#101935] text-white rounded-2xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="font-mono text-amber-300 font-bold">LIVE AUCTION ROOM COMMAND CENTER</span>
                  </div>
                  <h3 className="text-lg font-black font-display text-white mt-0.5">{selectedSession.vehicleTitle}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePause}
                    className="border-white/20 text-white hover:bg-white/10 font-bold"
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-1 text-emerald-400" /> : <Pause className="w-4 h-4 mr-1 text-amber-400" />}
                    <span>{isPaused ? 'Resume Bidding' : 'Pause Bidding'}</span>
                  </Button>

                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleExtendTime}
                    className="bg-[#C85A32] text-white font-extrabold"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Extend +5 Mins</span>
                  </Button>

                  {onOpenLiveRoom && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenLiveRoom(selectedSession)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
                    >
                      <Radio className="w-4 h-4 mr-1" />
                      <span>Join Live Room Preview</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* LIVE BID STREAM & BROADCASTER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* BROADCAST MESSAGING */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#C85A32]" />
                    <span>Broadcast Organizer Announcement</span>
                  </h4>

                  <form onSubmit={handleSendBroadcast} className="space-y-3">
                    <textarea
                      rows={3}
                      value={customAnnouncement}
                      onChange={(e) => setCustomAnnouncement(e.target.value)}
                      placeholder="Type official message to display across all active bidder screens (e.g., 'Final 2 minutes remaining! Reserve price has been met!')..."
                      className="w-full p-3 rounded-xl border border-slate-300 font-medium text-xs focus:ring-2 focus:ring-[#1E3063]"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!customAnnouncement.trim()}
                      className="w-full bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs"
                    >
                      <span>Broadcast Announcement to Bidders</span>
                    </Button>
                  </form>
                </Card>

                {/* CURRENT LIVE BID STATS */}
                <Card className="p-5 bg-slate-900 text-white border-none space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Bid Stream Summary</span>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Current Highest Bid:</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        Ksh {(selectedSession.currentBid || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-white/10 pt-2">
                      <span className="text-slate-400">Reserve Price Status:</span>
                      <span className={selectedSession.reserveMet ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {selectedSession.reserveMet ? '✓ Reserve Met' : `Pending (Ksh ${(selectedSession.reservePrice || 0).toLocaleString()})`}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-white/10 pt-2">
                      <span className="text-slate-400">Total Bids Logged:</span>
                      <span className="text-white font-mono font-bold">{selectedSession.totalBidsCount || 0} bids</span>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* TAB 5: PUBLISH RESULTS & WINNER CERTIFICATE */}
          {activeTab === 'publish' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <Award className="w-4.5 h-4.5 text-amber-500" />
                    <span>Publish Results & Finalize Auction Award</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Declare winning bidders and issue official digital certificates for settlement.</p>
                </div>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card key={session.id} className="p-4 bg-white border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-700 font-bold">{session.id}</span>
                        <h4 className="font-extrabold text-[#1E3063] text-sm">{session.vehicleTitle}</h4>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Winning Bidder: <strong className="text-slate-900">Bidder A-104 (James K. Mugo)</strong> • Amount: <strong className="text-emerald-700 font-mono">Ksh {(session.currentBid || 0).toLocaleString()}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => {
                          if (onPublishResults) onPublishResults(session);
                          if (showToast) showToast(`🎉 Published official winning certificate for ${session.vehicleTitle}`);
                        }}
                        className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs"
                      >
                        <Award className="w-4 h-4 mr-1 text-amber-400" />
                        <span>Issue Official Winning Certificate</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: KAYAD REVENUE & PROMOTIONAL UPGRADES */}
          {activeTab === 'revenue' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* REVENUE MODEL AUDIT CARD */}
              <Card className="p-5 bg-gradient-to-br from-[#101935] via-[#1E3063] to-[#101935] text-white border-none rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">KAYAD MONETIZATION ARCHITECTURE</span>
                    <h3 className="text-lg font-black font-display text-white mt-0.5">B2B Organizer Revenue & Upgrade Suite</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Platform Earnings</span>
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      Ksh {totalKayadRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">1. Fixed Listing Fees</span>
                    <p className="text-lg font-mono font-black text-white">Ksh {totalListingFees.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Ksh 15,000 per auction event listing</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">2. Success Commission (2.5%)</span>
                    <p className="text-lg font-mono font-black text-emerald-400">Ksh {estimatedCommissions.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Calculated upon vehicle settlement</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">3. Promotional Upgrades</span>
                    <p className="text-lg font-mono font-black text-amber-300">Ksh {totalUpgradeFees.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Featured, Banner, Analytics Suite</p>
                  </div>
                </div>
              </Card>

              {/* ACTIVE SESSION PROMOTIONAL UPGRADES TOGGLES */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-[#1E3063] text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#C85A32]" />
                  <span>Activate Promotional Upgrades for Active Auctions</span>
                </h4>

                {sessions.map((session) => {
                  const upg = activeUpgrades[session.id] || {
                    listingFeePaid: true,
                    featuredUpgrade: false,
                    homepagePromo: false,
                    sponsoredPlacement: false,
                    premiumAnalytics: false
                  };

                  return (
                    <Card key={session.id} className="p-5 bg-white border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-mono text-[10px] text-amber-700 font-bold">{session.id}</span>
                          <h4 className="font-extrabold text-[#1E3063] text-sm">{session.vehicleTitle}</h4>
                        </div>
                        <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 font-bold">
                          Fixed Listing Fee Paid (Ksh 15,000)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* FEATURED AUCTION UPGRADE */}
                        <button
                          onClick={() => handleToggleUpgrade(session.id, 'featuredUpgrade', 25000, 'Featured Auction Badge & Top Placement')}
                          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            upg.featuredUpgrade
                              ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Sparkles className={`w-4 h-4 ${upg.featuredUpgrade ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="font-mono font-bold text-[10px]">Ksh 25,000</span>
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <span className="font-bold text-xs block text-[#1E3063]">Featured Upgrade</span>
                            <span className="text-[10px] text-slate-500 block">Top carousel badge & priority indexing</span>
                          </div>
                          <div className="mt-3 flex items-center gap-1 font-bold text-[10px]">
                            {upg.featuredUpgrade ? <span className="text-emerald-700">✓ Active Upgrade</span> : <span className="text-slate-500">+ Click to Upgrade</span>}
                          </div>
                        </button>

                        {/* HOMEPAGE PROMOTION */}
                        <button
                          onClick={() => handleToggleUpgrade(session.id, 'homepagePromo', 10000, 'Homepage Promotion Banner')}
                          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            upg.homepagePromo
                              ? 'bg-purple-50 border-purple-400 text-slate-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Tag className={`w-4 h-4 ${upg.homepagePromo ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span className="font-mono font-bold text-[10px]">Ksh 10,000</span>
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <span className="font-bold text-xs block text-[#1E3063]">Homepage Promo</span>
                            <span className="text-[10px] text-slate-500 block">Pinned hero showcase banner</span>
                          </div>
                          <div className="mt-3 flex items-center gap-1 font-bold text-[10px]">
                            {upg.homepagePromo ? <span className="text-emerald-700">✓ Active Upgrade</span> : <span className="text-slate-500">+ Click to Upgrade</span>}
                          </div>
                        </button>

                        {/* SPONSORED PLACEMENT */}
                        <button
                          onClick={() => handleToggleUpgrade(session.id, 'sponsoredPlacement', 18000, 'Sponsored Notification Alert')}
                          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            upg.sponsoredPlacement
                              ? 'bg-blue-50 border-blue-400 text-slate-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Radio className={`w-4 h-4 ${upg.sponsoredPlacement ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="font-mono font-bold text-[10px]">Ksh 18,000</span>
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <span className="font-bold text-xs block text-[#1E3063]">Sponsored Broadcast</span>
                            <span className="text-[10px] text-slate-500 block">Push alert to 15,000+ buyers</span>
                          </div>
                          <div className="mt-3 flex items-center gap-1 font-bold text-[10px]">
                            {upg.sponsoredPlacement ? <span className="text-emerald-700">✓ Active Upgrade</span> : <span className="text-slate-500">+ Click to Upgrade</span>}
                          </div>
                        </button>

                        {/* PREMIUM ANALYTICS */}
                        <button
                          onClick={() => handleToggleUpgrade(session.id, 'premiumAnalytics', 12000, 'Premium Analytics & Bidder Insights')}
                          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            upg.premiumAnalytics
                              ? 'bg-emerald-50 border-emerald-400 text-slate-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <BarChart2 className={`w-4 h-4 ${upg.premiumAnalytics ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className="font-mono font-bold text-[10px]">Ksh 12,000</span>
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <span className="font-bold text-xs block text-[#1E3063]">Premium Analytics</span>
                            <span className="text-[10px] text-slate-500 block">Real-time valuation & bidder heatmaps</span>
                          </div>
                          <div className="mt-3 flex items-center gap-1 font-bold text-[10px]">
                            {upg.premiumAnalytics ? <span className="text-emerald-700">✓ Active Upgrade</span> : <span className="text-slate-500">+ Click to Upgrade</span>}
                          </div>
                        </button>

                      </div>
                    </Card>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 7: REPORTS & SETTLEMENT STATEMENT DOWNLOADS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-purple-600" />
                    <span>Financial Reports & Organizer Audit Statements</span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">Download certified PDF/CSV reports for accounting and tax reconciliation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 bg-white border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#1E3063] text-xs">Full Settlement Statement</h4>
                      <p className="text-[10px] text-slate-500">Includes itemized hammer prices, custodian deposit logs, and net organizer payout.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport('Settlement Statement')}
                    className="w-full text-xs font-bold border-slate-300 text-[#1E3063]"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download PDF Statement</span>
                  </Button>
                </Card>

                <Card className="p-5 bg-white border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#1E3063] text-xs">Bidder Activity & Verification Log</h4>
                      <p className="text-[10px] text-slate-500">Complete timestamped audit trail of all bidder passes, payment refs, and live bids.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport('Bidder Audit Log')}
                    className="w-full text-xs font-bold border-slate-300 text-[#1E3063]"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download CSV Audit Sheet</span>
                  </Button>
                </Card>
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
};
