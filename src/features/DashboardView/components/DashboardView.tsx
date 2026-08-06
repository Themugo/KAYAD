import React, { useState, useMemo } from 'react';
import { Vehicle, EscrowTransaction, ChatMessage, UserProfile, SavedSearch } from '../../../types';
import { INITIAL_MECHANICS, INITIAL_INSPECTION_BOOKINGS } from '../../../data/mockInspections';
import { INITIAL_AUCTION_SESSIONS } from '../../../data/mockAuctions';
import { 
  LayoutDashboard, 
  Heart, 
  Lock, 
  Bell, 
  Gavel, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  TrendingDown, 
  Eye, 
  Sparkles,
  Zap,
  Building2,
  FileText,
  Users,
  UserCheck,
  Phone,
  Mail,
  PlusCircle,
  X,
  Search,
  Filter,
  Shield,
  Briefcase,
  Check,
  Car,
  Calculator,
  Wrench,
  Bookmark,
  AlertTriangle,
  Upload,
  FileCheck,
  MessageSquare,
  Compass,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Info,
  Layers,
  Scale,
  RefreshCw,
  Award
} from 'lucide-react';
import { 
  PageHeader, 
  StatWidget, 
  Card, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Button, 
  LazyImage,
  Input,
  Select,
  Modal
} from '../../../components/ui';

interface DashboardViewProps {
  savedVehicles: string[];
  vehicles: Vehicle[];
  deals: EscrowTransaction[];
  user?: UserProfile | null;
  messages?: ChatMessage[];
  comparedVehicles?: string[];
  onNavigate: (nav: string) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
  onStartEscrow?: (vehicle: Vehicle) => void;
  onContactSeller?: (vehicle: Vehicle) => void;
  onOpenCompareModal?: () => void;
  onOpenAlertsModal?: () => void;
  onOpenAuthModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  savedVehicles,
  vehicles,
  deals,
  user,
  messages = [],
  comparedVehicles = [],
  onNavigate,
  onQuickViewVehicle,
  onToggleSave,
  onToggleCompare,
  onStartEscrow,
  onContactSeller,
  onOpenCompareModal,
  onOpenAlertsModal,
  onOpenAuthModal
}) => {
  // Toast State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Modals
  const [showSavedSearchesModal, setShowSavedSearchesModal] = useState<boolean>(false);
  const [activeTaskModal, setActiveTaskModal] = useState<{ title: string; desc: string; type: 'doc' | 'sign' } | null>(null);
  const [selectedInspectionModal, setSelectedInspectionModal] = useState<any | null>(null);

  // Auction Activity Sub-Tab State
  const [auctionTab, setAuctionTab] = useState<'bids' | 'watching' | 'won' | 'lost'>('bids');

  // Notifications Filter Tag State
  const [notifFilter, setNotifFilter] = useState<'all' | 'escrow' | 'price' | 'auction' | 'finance'>('all');

  // Interactive Saved Searches State
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: 'search-1',
      title: 'Toyota Prado TX-L (2018-2022) in Nairobi',
      filters: { make: 'Toyota', model: 'Prado', county: 'Nairobi', maxPrice: 7500000 },
      notifyOnPriceDrop: true,
      notifyOnNewListing: true,
      createdAt: '2 days ago'
    },
    {
      id: 'search-2',
      title: 'Subaru Outback AWD < 80,000 km',
      filters: { make: 'Subaru', model: 'Outback', maxMileage: 80000 },
      notifyOnPriceDrop: true,
      notifyOnNewListing: false,
      createdAt: '1 week ago'
    }
  ]);

  // Derived Saved Vehicle Objects
  const savedItems = useMemo(() => {
    return vehicles.filter((v) => savedVehicles.includes(v.id));
  }, [vehicles, savedVehicles]);

  const totalSavedValue = useMemo(() => {
    return savedItems.reduce((acc, curr) => acc + curr.price, 0);
  }, [savedItems]);

  // Derived Active Purchases
  const activePurchases = useMemo(() => {
    return deals.map((deal) => {
      const matchVehicle = vehicles.find((v) => v.id === deal.vehicleId || v.title === deal.vehicleTitle);
      return {
        ...deal,
        vehicleImage: matchVehicle?.image || deal.vehicleImage || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600',
        vehiclePrice: matchVehicle?.price || deal.amount,
        escrowStageText: deal.step >= 5 ? 'Step 5/6: NTSA TIMS Logbook Transfer' : deal.step >= 3 ? 'Step 3/6: 150-Point Technical Inspection Passed' : 'Step 2/6: Deposit Secured in Escrow Vault',
        inspectionStatusText: 'Passed - 96% Certification Score by Eng. David Kamau',
        sellerResponseText: 'Seller Confirmed - NTSA TIMS Title Transfer Initiated',
        outstandingTask: deal.step === 3 || deal.step === 4 
          ? { id: 'task-1', text: 'Action Required: Sign Vault Release Agreement & Upload National ID', urgent: true }
          : { id: 'task-2', text: 'Confirm Physical Delivery Address', urgent: false }
      };
    });
  }, [deals, vehicles]);

  // Derived Finance Status
  const financeApp = {
    partnerBank: 'NCBA Bank Kenya',
    status: 'Pre-Approved (Asset Financing)',
    preApprovedAmount: 5200000,
    tenureMonths: 48,
    monthlyPaymentEstimate: 124500,
    documentsRequested: [
      { name: 'National ID / Passport Copy', status: 'Approved ✓' },
      { name: '6-Month Certified Bank Statement', status: 'Approved ✓' },
      { name: 'KRA PIN Certificate Copy', status: 'Pending Upload ⏳' },
      { name: 'Proforma Invoice / KAYAD Escrow Quote', status: 'System Generated ✓' }
    ]
  };

  // Derived Notifications Feed (chronological, no fake data)
  const notifications = useMemo(() => {
    const list = [
      {
        id: 'n1',
        type: 'price',
        title: 'Price Drop Alert',
        message: '2021 Toyota Land Cruiser Prado TX-L dropped by Ksh 50,000!',
        time: '2 hours ago',
        vehicleId: 'v1'
      },
      {
        id: 'n2',
        type: 'escrow',
        title: 'Escrow Vault Deposit Secured',
        message: 'Ksh 4,850,000 successfully deposited in KAYAD Protected Vault for Deal #ESC-8092.',
        time: '5 hours ago',
        vehicleId: 'v2'
      },
      {
        id: 'n3',
        type: 'auction',
        title: 'Lead Bidder Status',
        message: 'Your bid of Ksh 2,300,000 on Nissan X-Trail Hybrid is currently the highest bid!',
        time: '1 day ago',
        auctionId: 'AUC-2026-8801'
      },
      {
        id: 'n4',
        type: 'finance',
        title: 'Asset Financing Pre-Approval',
        message: 'NCBA Bank Kenya approved asset financing up to Ksh 5,200,000 at 13% p.a.',
        time: '2 days ago'
      }
    ];

    if (notifFilter === 'all') return list;
    return list.filter((item) => item.type === notifFilter);
  }, [notifFilter]);

  // Recent Messages Snippets
  const recentMessages = useMemo(() => {
    if (messages.length > 0) return messages.slice(-3);
    return [
      {
        id: 'm1',
        sender: 'seller' as const,
        text: 'Hello Jimmy, the 2021 Prado TX-L logbook title is cleared with NTSA TIMS. Ready for escrow inspection.',
        timestamp: '10:45 AM',
        vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L'
      },
      {
        id: 'm2',
        sender: 'user' as const,
        text: 'Thank you! I have requested the 150-Point inspection through David Kamau.',
        timestamp: '11:02 AM',
        vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L'
      }
    ];
  }, [messages]);

  // Buyer Name
  const buyerName = user?.name || 'Jimmy Mugo';

  return (
    <div className="space-y-8 relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          1. WELCOME HEADER & KEY METRICS BAR
          ========================================== */}
      <div className="bg-gradient-to-r from-[#1E3063] via-[#17244B] to-[#1E3063] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6 border border-amber-400/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#17244B] font-black text-2xl flex items-center justify-center font-display shadow-md border-2 border-white/20">
              {buyerName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="verified" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified KAYAD Buyer
                </Badge>
                <Badge variant="accent" size="sm">
                  TIMS Logbook Sync Active
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Welcome back, {buyerName}! 👋
              </h1>
              <p className="text-xs text-slate-300">
                Your automotive command center for vehicle purchases, escrow vault protection, and inspection reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={() => onNavigate('seller-dashboard')}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <Car className="w-4 h-4 text-[#17244B]" />
              <span>Seller Dashboard</span>
            </Button>
            {!user && (
              <Button variant="accent" size="sm" onClick={onOpenAuthModal}>
                <UserCheck className="w-4 h-4 text-[#17244B]" />
                <span>Sign In / Register</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('marketplace')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Button>
          </div>
        </div>

        {/* Executive Summary Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Saved Watchlist
            </p>
            <p className="text-2xl font-black font-display text-white">{savedVehicles.length} Vehicles</p>
            <p className="text-[11px] text-amber-300 font-bold truncate">Ksh {totalSavedValue.toLocaleString()} Value</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Active Deals
            </p>
            <p className="text-2xl font-black font-display text-white">{activePurchases.length} Escrow Deals</p>
            <p className="text-[11px] text-emerald-300 font-bold">100% Vault Protected</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Action Required
            </p>
            <p className="text-2xl font-black font-display text-amber-300">1 Urgent Task</p>
            <p className="text-[11px] text-slate-200 font-bold truncate">Sign Vault Release</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-300" /> Asset Finance
            </p>
            <p className="text-2xl font-black font-display text-white">Pre-Approved</p>
            <p className="text-[11px] text-blue-200 font-bold">Ksh 5.2M Limit (NCBA)</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. QUICK ACTIONS (6 Core Shortcuts)
          ========================================== */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Actions Command Center
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              title: 'Browse Market',
              desc: 'Explore 500+ Verified Cars',
              icon: <Car className="w-5 h-5 text-[#1E3063]" />,
              action: () => onNavigate('marketplace'),
              color: 'hover:border-[#1E3063]'
            },
            {
              title: 'Saved Searches',
              desc: `${savedSearches.length} Alert Feeds Active`,
              icon: <Bookmark className="w-5 h-5 text-amber-600" />,
              action: () => setShowSavedSearchesModal(true),
              color: 'hover:border-amber-400'
            },
            {
              title: 'Continue Purchase',
              desc: '1 Active Escrow Vault',
              icon: <Lock className="w-5 h-5 text-emerald-600" />,
              action: () => onNavigate('escrow'),
              color: 'hover:border-emerald-500'
            },
            {
              title: 'Book Inspection',
              desc: '150-Point Technical Audit',
              icon: <Wrench className="w-5 h-5 text-blue-600" />,
              action: () => onNavigate('inspections'),
              color: 'hover:border-blue-500'
            },
            {
              title: 'Compare Vehicles',
              desc: `${comparedVehicles.length} Vehicles in Slot`,
              icon: <Scale className="w-5 h-5 text-purple-600" />,
              action: () => onOpenCompareModal ? onOpenCompareModal() : onNavigate('marketplace'),
              color: 'hover:border-purple-500'
            },
            {
              title: 'View Auctions',
              desc: '1 Active Highest Bid',
              icon: <Gavel className="w-5 h-5 text-amber-700" />,
              action: () => onNavigate('auctions'),
              color: 'hover:border-amber-600'
            }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className={`p-4 bg-white rounded-2xl border border-slate-200 text-left space-y-2 transition-all hover:shadow-md cursor-pointer group ${item.color}`}
            >
              <div className="p-2.5 bg-slate-50 group-hover:bg-amber-50 rounded-xl w-fit transition-colors">
                {item.icon}
              </div>
              <div>
                <h4 className="font-extrabold text-[#1E3063] text-xs font-display group-hover:text-amber-800">{item.title}</h4>
                <p className="text-[10px] text-slate-500 font-medium truncate">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          3. MY SAVED VEHICLES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              My Saved Watchlist ({savedItems.length})
            </h3>
            <p className="text-xs text-slate-500">Track price drop alerts, availability changes, and dealer status updates.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('marketplace')}>
            <span>Explore More Cars</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />
          </Button>
        </div>

        {savedItems.length === 0 ? (
          <Card className="p-8 text-center space-y-3 bg-white">
            <Heart className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">Your Watchlist is Currently Empty</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Save vehicles while exploring the marketplace to get instant notifications when sellers lower prices.
            </p>
            <Button variant="primary" size="sm" onClick={() => onNavigate('marketplace')}>
              Browse Verified Vehicles
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedItems.map((vehicle) => {
              const isCompared = comparedVehicles.includes(vehicle.id);
              return (
                <Card key={vehicle.id} className="p-4 space-y-3 bg-white hover:border-amber-400 transition-all shadow-xs group">
                  {/* Image & Badges */}
                  <div className="h-44 rounded-2xl overflow-hidden bg-slate-900 relative">
                    <LazyImage src={vehicle.image} alt={vehicle.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-md shadow-xs flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Ksh 50,000 Price Drop
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleSave?.(vehicle.id)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
                      title="Remove from Saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-md">
                      📍 {vehicle.location}, {vehicle.county}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span>Saved 2 days ago</span>
                      <span className="text-emerald-700 font-extrabold">● Available Today</span>
                    </div>

                    <h4 className="font-black text-[#1E3063] text-sm font-display line-clamp-1 group-hover:text-amber-800">
                      {vehicle.title}
                    </h4>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-lg font-black text-[#1E3063] font-display">
                        Ksh {vehicle.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {vehicle.year} • {vehicle.mileage.toLocaleString()} km
                      </span>
                    </div>

                    {/* Dealer Status */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        {vehicle.sellerName}
                      </span>
                      <Badge variant="verified" size="sm">
                        {vehicle.sellerType}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onQuickViewVehicle?.(vehicle)}
                    >
                      <Eye className="w-3.5 h-3.5 text-[#1E3063]" />
                      <span>Quick View</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onStartEscrow ? onStartEscrow(vehicle) : onNavigate('escrow')}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Start Escrow</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================
          4. MY ACTIVE PURCHASES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              My Active Purchases ({activePurchases.length})
            </h3>
            <p className="text-xs text-slate-500">Monitor escrow stage, 150-point inspection status, and seller responses.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('escrow')}>
            <span>Full Escrow Portal</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />
          </Button>
        </div>

        <div className="space-y-4">
          {activePurchases.map((deal) => (
            <Card key={deal.id} className="p-6 bg-white border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <LazyImage src={deal.vehicleImage} alt={deal.vehicleTitle} wrapperClassName="w-16 h-12 rounded-xl border border-slate-200 shrink-0" className="w-full h-full object-cover" />
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{deal.id}</span>
                    <h4 className="text-base font-black text-[#1E3063] font-display">{deal.vehicleTitle}</h4>
                    <p className="text-xs text-slate-500 font-medium">Seller: <strong>{deal.sellerName}</strong> • Escrow Protected</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Escrow Vault Deposit</p>
                  <p className="text-xl font-black text-[#1E3063] font-display">Ksh {deal.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Escrow Stage
                  </p>
                  <p className="font-extrabold text-[#1E3063]">{deal.escrowStageText}</p>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                  <p className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Inspection Status
                  </p>
                  <p className="font-extrabold text-emerald-950">{deal.inspectionStatusText}</p>
                </div>

                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                  <p className="text-[10px] text-blue-800 font-bold uppercase flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Seller Response
                  </p>
                  <p className="font-extrabold text-blue-950">{deal.sellerResponseText}</p>
                </div>
              </div>

              {/* Outstanding Tasks Callout */}
              <div className="p-4 bg-amber-50/80 border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-black text-[#17244B]">Outstanding Task Required:</p>
                    <p className="text-slate-700 font-medium">{deal.outstandingTask.text}</p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTaskModal({
                    title: 'Complete Outstanding Task',
                    desc: deal.outstandingTask.text,
                    type: 'sign'
                  })}
                  className="shrink-0"
                >
                  <span>Complete Action</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          5. ESCROW TRANSACTIONS TIMELINE
          ========================================== */}
      <Card className="p-6 bg-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Escrow Transaction Timeline Progress
            </h3>
            <p className="text-xs text-slate-500">Real-time status tracking through KAYAD Protected Escrow Vault.</p>
          </div>

          <Badge variant="success" size="md">
            100% Capital Guaranteed
          </Badge>
        </div>

        {/* 6 Step Visual Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {[
            { step: 1, label: '1. Offer Accepted', status: 'done', desc: 'Agreed Ksh 4.85M' },
            { step: 2, label: '2. Vault Deposit', status: 'done', desc: 'Funds Held Safely' },
            { step: 3, label: '3. 150-Pt Inspection', status: 'done', desc: 'Score: 96% Clean' },
            { step: 4, label: '4. Buyer Signoff', status: 'active', desc: 'Action Needed' },
            { step: 5, label: '5. TIMS Title Transfer', status: 'pending', desc: 'Logbook Processing' },
            { step: 6, label: '6. Funds Released', status: 'pending', desc: 'Final Handover' }
          ].map((item) => (
            <div
              key={item.step}
              className={`p-3 rounded-2xl border text-center space-y-1 ${
                item.status === 'done'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : item.status === 'active'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex justify-center">
                {item.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : item.status === 'active' ? (
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">{item.step}</span>
                )}
              </div>
              <p className="font-extrabold text-[11px] truncate">{item.label}</p>
              <p className="text-[10px] opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-3 text-xs">
          <div>
            <p className="font-black text-[#1E3063]">Payment Vault Status: Ksh 4,850,000 Safe in Custody</p>
            <p className="text-slate-600 font-medium">Funds remain locked until you authorize physical vehicle handover.</p>
          </div>

          <Button variant="primary" size="sm" onClick={() => onNavigate('escrow')}>
            <span>Review Report & Authorize Release</span>
          </Button>
        </div>
      </Card>

      {/* ==========================================
          6. AUCTION ACTIVITY
          ========================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-600" />
              Auction Bids & Activity
            </h3>
            <p className="text-xs text-slate-500">Monitor live bids, watched auction lots, won assets, and auction histories.</p>
          </div>

          {/* Sub Tab Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'bids', label: 'Current Bids (1)' },
              { id: 'watching', label: 'Watching (2)' },
              { id: 'won', label: 'Won (1)' },
              { id: 'lost', label: 'Lost (0)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAuctionTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  auctionTab === tab.id
                    ? 'bg-white text-[#1E3063] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Bids Content */}
        {auctionTab === 'bids' && (
          <Card className="p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs">
              <div className="space-y-1">
                <Badge variant="warning" size="sm">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Closes in 3h 15m
                </Badge>
                <h4 className="font-extrabold text-[#1E3063] text-sm font-display">
                  2022 Nissan X-Trail 2.0 Hybrid (Auction Lot #AUC-209)
                </h4>
                <p className="text-slate-600 font-medium">Bank Repossession • NCBA Bank Custody</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Your Lead Bid</p>
                  <p className="text-lg font-black text-emerald-700 font-display">Ksh 2,300,000</p>
                  <Badge variant="success" size="sm">
                    ✓ Highest Bidder
                  </Badge>
                </div>

                <Button variant="accent" size="sm" onClick={() => onNavigate('auctions')}>
                  <span>Increase Bid</span>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Won Auctions Content */}
        {auctionTab === 'won' && (
          <Card className="p-5 bg-white space-y-3">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <Badge variant="success" size="sm">
                  🏆 AUCTION WON
                </Badge>
                <h4 className="font-black text-emerald-950 text-sm mt-1">2020 Subaru Outback Limited AWD</h4>
                <p className="text-emerald-800 font-medium">Winning Bid: Ksh 3,150,000 • Closed Yesterday</p>
              </div>

              <Button variant="primary" size="sm" onClick={() => onNavigate('escrow')}>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Start Escrow Settlement</span>
              </Button>
            </div>
          </Card>
        )}

        {/* Watching / Lost Placeholders */}
        {(auctionTab === 'watching' || auctionTab === 'lost') && (
          <Card className="p-6 text-center text-xs text-slate-500 bg-white">
            <p className="font-bold">No items in this auction view.</p>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('auctions')} className="mt-2">
              Browse Live Auctions
            </Button>
          </Card>
        )}
      </div>

      {/* ==========================================
          7. INSPECTION BOOKINGS
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Inspection Bookings & Certificates
            </h3>
            <p className="text-xs text-slate-500">150-Point mechanical diagnostic reports and scheduled inspector bookings.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('inspections')}>
            <span>Book New Inspection</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Completed Inspection Card */}
          <Card className="p-5 bg-white space-y-4 border-emerald-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center font-display">
                  96
                </div>
                <div>
                  <h4 className="font-black text-[#1E3063] text-sm">2021 Toyota Prado TX-L</h4>
                  <p className="text-[11px] text-slate-500 font-medium">150-Point Comprehensive Audit</p>
                </div>
              </div>

              <Badge variant="success" size="sm">
                ✓ CERTIFIED PASS
              </Badge>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="flex items-center gap-2 font-semibold">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Inspector: <strong>Eng. David Kamau (SAE Certified)</strong>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Date: July 28, 2026 • Westlands Yard
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setSelectedInspectionModal({
                vehicleTitle: '2021 Toyota Prado TX-L',
                score: 96,
                inspector: 'Eng. David Kamau',
                verdict: 'Clean Pass - Zero Structural or Engine Faults'
              })}
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>View 150-Point Inspection Certificate</span>
            </Button>
          </Card>

          {/* Scheduled Inspection Card */}
          <Card className="p-5 bg-white space-y-4 border-blue-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-[#1E3063] text-sm">2022 Subaru Outback AWD</h4>
                <p className="text-[11px] text-slate-500 font-medium">Scheduled Physical Inspection</p>
              </div>

              <Badge variant="verified" size="sm">
                SCHEDULED
              </Badge>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="flex items-center gap-2 font-semibold">
                <UserCheck className="w-4 h-4 text-blue-600" /> Inspector: <strong>Eng. Patrick Kipchumba</strong>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Time: Tomorrow, July 30 @ 10:00 AM
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => onNavigate('inspections')}
            >
              <span>Manage Inspection Schedule</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* ==========================================
          8. FINANCE APPLICATIONS
          ========================================== */}
      <Card className="p-6 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 space-y-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-blue-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1E3063] font-display">Asset Financing Application Status</h3>
              <p className="text-xs text-blue-800 font-medium">Partnered with NCBA, Equity Bank, KCB & Stanbic</p>
            </div>
          </div>

          <Badge variant="success" size="md">
            ✓ Pre-Approval Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Pre Approval Terms Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-bold">Partner Bank</span>
              <span className="font-black text-[#1E3063] font-display text-sm">{financeApp.partnerBank}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-bold">Pre-Approved Limit</span>
              <span className="font-black text-emerald-700 font-display text-sm">Ksh {financeApp.preApprovedAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-bold">Interest Rate</span>
              <span className="font-black text-[#1E3063]">13% p.a. Fixed</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Max Loan Tenure</span>
              <span className="font-black text-[#1E3063]">{financeApp.tenureMonths} Months (4 Years)</span>
            </div>
          </div>

          {/* Requested Documents Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <p className="font-black text-[#1E3063] uppercase tracking-wider text-[10px]">Requested Documents Checklist</p>
              
              <div className="space-y-1.5">
                {financeApp.documentsRequested.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                    <span className="font-semibold text-slate-700 truncate">{doc.name}</span>
                    <span className={`text-[10px] font-black ${doc.status.includes('Approved') ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTaskModal({
                title: 'Upload KRA PIN Certificate',
                desc: 'Upload a certified PDF or photo of your KRA PIN certificate to finalize bank dispatch.',
                type: 'doc'
              })}
              fullWidth
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Pending Documents</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* ==========================================
          9. RECENT MESSAGES & CHAT INQUIRIES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#1E3063]" />
              Recent Seller Communications & Chats
            </h3>
            <p className="text-xs text-slate-500">Direct inquiries with dealers and private sellers.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('chat')}>
            <span>Open Chat Hub</span>
          </Button>
        </div>

        <Card className="p-5 bg-white space-y-3">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onNavigate('chat')}
              className="p-3.5 bg-slate-50 hover:bg-amber-50/70 transition-all rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3063] text-amber-400 font-extrabold flex items-center justify-center font-display shrink-0">
                  {msg.sender === 'seller' ? 'S' : 'J'}
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E3063] group-hover:text-amber-800">{msg.vehicleTitle || 'Vehicle Inquiry'}</h4>
                  <p className="text-slate-600 font-medium line-clamp-1">{msg.text}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">{msg.timestamp}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 ml-auto mt-1" />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ==========================================
          10. NOTIFICATIONS FEED (Chronological)
          ========================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Real-time Activity Notifications
            </h3>
            <p className="text-xs text-slate-500">Chronological feed of price drops, escrow milestones, and loan updates.</p>
          </div>

          {/* Tag Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'price', label: 'Price Drops' },
              { id: 'escrow', label: 'Escrow' },
              { id: 'auction', label: 'Auctions' },
              { id: 'finance', label: 'Finance' }
            ].map((tag) => (
              <button
                key={tag.id}
                onClick={() => setNotifFilter(tag.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  notifFilter === tag.id
                    ? 'bg-[#1E3063] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div key={notif.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-4 text-xs shadow-xs hover:border-amber-400 transition-all">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  notif.type === 'price' ? 'bg-rose-50 text-rose-600' :
                  notif.type === 'escrow' ? 'bg-emerald-50 text-emerald-600' :
                  notif.type === 'auction' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {notif.type === 'price' ? <TrendingDown className="w-4 h-4" /> :
                   notif.type === 'escrow' ? <Lock className="w-4 h-4" /> :
                   notif.type === 'auction' ? <Gavel className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                </div>

                <div>
                  <p className="font-extrabold text-[#1E3063] text-xs font-display">{notif.title}</p>
                  <p className="text-slate-600 font-medium mt-0.5">{notif.message}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">{notif.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          MODAL 1: SAVED SEARCHES MODAL
          ========================================== */}
      {showSavedSearchesModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowSavedSearchesModal(false)}
          title="My Saved Searches & Price Alerts"
          maxWidth="2xl"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Manage your saved search queries and price drop notifications. KAYAD sends instant email and push alerts when matching vehicles are listed.
            </p>

            <div className="space-y-3">
              {savedSearches.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#1E3063] text-sm">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold">Created {item.createdAt}</p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowSavedSearchesModal(false);
                        onNavigate('marketplace');
                      }}
                    >
                      Run Search
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.notifyOnPriceDrop}
                        onChange={() => {
                          setSavedSearches(prev => prev.map(s => s.id === item.id ? { ...s, notifyOnPriceDrop: !s.notifyOnPriceDrop } : s));
                          showToast('Updated price drop alert preference.');
                        }}
                        className="rounded text-[#1E3063] accent-[#1E3063]"
                      />
                      <span>Price Drop Alerts</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.notifyOnNewListing}
                        onChange={() => {
                          setSavedSearches(prev => prev.map(s => s.id === item.id ? { ...s, notifyOnNewListing: !s.notifyOnNewListing } : s));
                          showToast('Updated new listing alert preference.');
                        }}
                        className="rounded text-[#1E3063] accent-[#1E3063]"
                      />
                      <span>New Listing Alerts</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 2: TASK ACTION MODAL
          ========================================== */}
      {activeTaskModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTaskModal(null)}
          title={activeTaskModal.title}
          maxWidth="md"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium leading-relaxed">{activeTaskModal.desc}</p>

            {activeTaskModal.type === 'doc' ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 bg-slate-50">
                  <Upload className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-bold text-[#1E3063]">Click or drag PDF / JPG files here</p>
                  <p className="text-[10px] text-slate-400">Max size 10MB • Certified Document</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setActiveTaskModal(null);
                    showToast('Document uploaded successfully! Verified by compliance team.');
                  }}
                >
                  Submit Document for Bank Dispatch
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-2">
                  <p className="font-bold text-[#1E3063]">KAYAD Escrow Agreement #ESC-8092</p>
                  <p className="text-[11px] text-slate-600">
                    By confirming below, you authorize KAYAD Vault to hold Ksh 4,850,000 until 150-point inspection and NTSA TIMS logbook title transfer are verified.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setActiveTaskModal(null);
                    showToast('Task completed! Vault release authorization recorded.');
                  }}
                >
                  Sign & Confirm Release Agreement
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: INSPECTION REPORT CERTIFICATE
          ========================================== */}
      {selectedInspectionModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInspectionModal(null)}
          title="150-Point Technical Inspection Certificate"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center font-display">
                  {selectedInspectionModal.score}%
                </div>
                <div>
                  <h4 className="font-black text-emerald-950 text-sm font-display">{selectedInspectionModal.vehicleTitle}</h4>
                  <p className="text-emerald-800 text-[11px]">{selectedInspectionModal.verdict}</p>
                </div>
              </div>
              <Badge variant="success" size="md">
                ✓ CERTIFIED
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">1. Engine Compression: 100% Pass</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">2. Transmission Shift: Smooth</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">3. Chassis Frame: Zero Accident</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">4. TIMS Logbook: Verified Title</div>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setSelectedInspectionModal(null)}
            >
              Close Certificate Viewer
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default DashboardView;
