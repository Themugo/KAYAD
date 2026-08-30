import React, { useState, useMemo } from 'react';
import { Vehicle, EscrowTransaction, ChatMessage, UserProfile } from '../types';
import { createCar, VehicleApiError } from '../services/vehicleApi';
import { 
  Car, 
  PlusCircle, 
  Lock, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Sparkles, 
  Edit3, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Check, 
  X, 
  User, 
  Phone, 
  Mail, 
  ArrowRight, 
  ExternalLink, 
  Upload, 
  FileCheck, 
  Wrench, 
  Building2, 
  CreditCard, 
  RefreshCw, 
  HelpCircle,
  Search,
  Filter,
  CheckSquare,
  Award,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Button, 
  LazyImage,
  Input,
  Select,
  Modal
} from '../components/ui';

export interface SellerOffer {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  askingPrice: number;
  offeredAmount: number;
  buyerName: string;
  buyerAvatar?: string;
  buyerPhone: string;
  paymentType: 'Escrow Vault (Cash)' | 'KAYAD Asset Financing';
  status: 'Pending' | 'Accepted' | 'Countered' | 'Declined';
  expiresInHours: number;
  timestamp: string;
}

export interface PrivateSellerListing {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  status: 'Draft' | 'Active' | 'Sold' | 'Paused' | 'Expired';
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  image: string;
  location: string;
  county: string;
  ntsaTimsVerified: boolean;
  createdAt: string;
}

export interface SellerInspectionRequest {
  id: string;
  vehicleTitle: string;
  buyerName: string;
  inspectorName: string;
  scheduledTime: string;
  location: string;
  status: 'Requested' | 'Confirmed' | 'Completed';
  overallScore?: number;
  reportSummary?: string;
}

export interface CompletedSale {
  id: string;
  vehicleTitle: string;
  buyerName: string;
  agreedPrice: number;
  payoutAmount: number;
  payoutMethod: string;
  timsTransferRef: string;
  completedDate: string;
  receiptUrl?: string;
}

interface PrivateSellerDashboardViewProps {
  vehicles?: Vehicle[];
  user?: UserProfile | null;
  deals?: EscrowTransaction[];
  messages?: ChatMessage[];
  onNavigate: (nav: string) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onOpenAuthModal?: () => void;
}

export const PrivateSellerDashboardView: React.FC<PrivateSellerDashboardViewProps> = ({
  vehicles = [],
  user,
  deals = [],
  messages = [],
  onNavigate,
  onQuickViewVehicle,
  onOpenAuthModal
}) => {
  // Toast Alert State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Section Active View State (for deep anchor tabs)
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'inquiries' | 'escrow' | 'inspections' | 'offers' | 'sales' | 'verification'>('overview');

  // Listing Status Filter Tab: Draft, Active, Sold, Paused, Expired
  const [listingStatusFilter, setListingStatusFilter] = useState<'Active' | 'Draft' | 'Sold' | 'Paused' | 'Expired'>('Active');

  // Modals
  const [showNewListingModal, setShowNewListingModal] = useState<boolean>(false);
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState<SellerOffer | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<string>('');

  // Fixed: this modal previously used <Input defaultValue="Toyota">
  // style uncontrolled fields with hardcoded sample values, and its
  // own "Publish Private Listing" button just closed the modal and
  // showed a fake success toast - nothing was ever actually
  // submitted anywhere, so a real seller's vehicle was never actually
  // listed. Real, controlled form state below, wired to the real,
  // already-working POST /api/cars endpoint (confirmed directly,
  // end-to-end, against the real database as part of this fix).
  const [newListingForm, setNewListingForm] = useState({
    make: '', model: '', year: '', price: '', mileage: '', registrationNumber: '',
  });
  const [newListingImages, setNewListingImages] = useState<File[]>([]);
  const [newListingSubmitting, setNewListingSubmitting] = useState(false);
  const [newListingError, setNewListingError] = useState<string | null>(null);
  const [selectedTaskModal, setSelectedTaskModal] = useState<string | null>(null);

  // Mock Private Listings (Clean, user-centric)
  const [listings, setListings] = useState<PrivateSellerListing[]>([
    {
      id: 'v1',
      title: '2021 Toyota Land Cruiser Prado TX-L',
      make: 'Toyota',
      model: 'Prado',
      year: 2021,
      price: 7450000,
      mileage: 42000,
      status: 'Active',
      viewsCount: 342,
      savesCount: 28,
      inquiriesCount: 9,
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      location: 'Kilimani',
      county: 'Nairobi',
      ntsaTimsVerified: true,
      createdAt: '3 days ago'
    },
    {
      id: 'v-draft-1',
      title: '2019 Subaru Outback 2.5i Limited',
      make: 'Subaru',
      model: 'Outback',
      year: 2019,
      price: 3250000,
      mileage: 68000,
      status: 'Draft',
      viewsCount: 0,
      savesCount: 0,
      inquiriesCount: 0,
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800',
      location: 'Westlands',
      county: 'Nairobi',
      ntsaTimsVerified: true,
      createdAt: 'Yesterday'
    },
    {
      id: 'v-sold-1',
      title: '2018 Mazda CX-5 2.2 XD L-Package',
      make: 'Mazda',
      model: 'CX-5',
      year: 2018,
      price: 2650000,
      mileage: 75000,
      status: 'Sold',
      viewsCount: 512,
      savesCount: 41,
      inquiriesCount: 14,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800',
      location: 'Lavington',
      county: 'Nairobi',
      ntsaTimsVerified: true,
      createdAt: '1 month ago'
    },
    {
      id: 'v-paused-1',
      title: '2020 Nissan X-Trail Hybrid 2.0',
      make: 'Nissan',
      model: 'X-Trail',
      year: 2020,
      price: 2850000,
      mileage: 52000,
      status: 'Paused',
      viewsCount: 180,
      savesCount: 12,
      inquiriesCount: 4,
      image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
      location: 'Karen',
      county: 'Nairobi',
      ntsaTimsVerified: false,
      createdAt: '2 weeks ago'
    },
    {
      id: 'v-exp-1',
      title: '2015 Mercedes-Benz C200 AMG Line',
      make: 'Mercedes-Benz',
      model: 'C200',
      year: 2015,
      price: 2400000,
      mileage: 94000,
      status: 'Expired',
      viewsCount: 220,
      savesCount: 15,
      inquiriesCount: 3,
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
      location: 'Runda',
      county: 'Nairobi',
      ntsaTimsVerified: true,
      createdAt: '60 days ago'
    }
  ]);

  // Mock Offers Received
  const [offers, setOffers] = useState<SellerOffer[]>([
    {
      id: 'OFF-701',
      vehicleId: 'v1',
      vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
      vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      askingPrice: 7450000,
      offeredAmount: 7300000,
      buyerName: 'Dr. Samuel Omondi',
      buyerPhone: '+254 722 *** 902',
      paymentType: 'Escrow Vault (Cash)',
      status: 'Pending',
      expiresInHours: 18,
      timestamp: 'Today at 09:15 AM'
    },
    {
      id: 'OFF-702',
      vehicleId: 'v1',
      vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
      vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      askingPrice: 7450000,
      offeredAmount: 7450000,
      buyerName: 'Eng. Beatrice Mwangi',
      buyerPhone: '+254 711 *** 441',
      paymentType: 'KAYAD Asset Financing',
      status: 'Pending',
      expiresInHours: 36,
      timestamp: 'Yesterday at 04:30 PM'
    }
  ]);

  // Mock Active Escrow Transactions
  const activeEscrowDeals = useMemo(() => {
    return [
      {
        id: 'ESC-9081',
        vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
        buyerName: 'Dr. Samuel Omondi',
        agreedPrice: 7300000,
        fundsStatus: 'Ksh 7,300,000 Secured in KAYAD Vault',
        buyerProgress: [
          { step: 1, label: 'Offer Accepted', done: true },
          { step: 2, label: 'Vault Deposit', done: true },
          { step: 3, label: '150-Point Inspection', done: true },
          { step: 4, label: 'TIMS Logbook Transfer', done: false, active: true },
          { step: 5, label: 'Physical Handover', done: false },
          { step: 6, label: 'Payout Release', done: false }
        ],
        requiredAction: 'Action Required: Upload Signed NTSA TIMS Transfer Form 9',
        buyerPhone: '+254 722 104 902'
      }
    ];
  }, []);

  // Mock Inspection Requests
  const inspectionRequests: SellerInspectionRequest[] = [
    {
      id: 'INS-201',
      vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
      buyerName: 'Dr. Samuel Omondi',
      inspectorName: 'Eng. David Kamau (SAE Certified)',
      scheduledTime: 'Yesterday @ 11:00 AM',
      location: 'Kilimani, Nairobi (Seller Residence)',
      status: 'Completed',
      overallScore: 96,
      reportSummary: 'Pass - Clean engine compressions, pristine chassis, 96% overall rating.'
    },
    {
      id: 'INS-202',
      vehicleTitle: '2019 Subaru Outback 2.5i Limited',
      buyerName: 'Kevin Mutua',
      inspectorName: 'Eng. Patrick Kipchumba',
      scheduledTime: 'Tomorrow @ 02:30 PM',
      location: 'Westlands Auto Yard',
      status: 'Requested'
    }
  ];

  // Mock Completed Sales
  const completedSales: CompletedSale[] = [
    {
      id: 'SALE-101',
      vehicleTitle: '2018 Mazda CX-5 2.2 XD L-Package',
      buyerName: 'Grace Wanjiku',
      agreedPrice: 2650000,
      payoutAmount: 2636750, // net after 0.5% escrow fee
      payoutMethod: 'our escrow custodian (A/C ****8891)',
      timsTransferRef: 'TIMS-KE-9920148',
      completedDate: 'June 14, 2026'
    }
  ];

  // Handle Offer Actions
  const handleAcceptOffer = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'Accepted' } : o))
    );
    showToast('Offer Accepted! KAYAD Escrow Vault initiated for buyer.');
  };

  const handleDeclineOffer = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'Declined' } : o))
    );
    showToast('Offer declined.');
  };

  const handleCounterOfferSubmit = () => {
    if (!selectedOfferForCounter) return;
    const price = parseInt(counterPriceInput);
    if (!price || isNaN(price)) return;

    setOffers((prev) =>
      prev.map((o) =>
        o.id === selectedOfferForCounter.id
          ? { ...o, status: 'Countered', offeredAmount: price }
          : o
      )
    );
    setSelectedOfferForCounter(null);
    setCounterPriceInput('');
    showToast(`Counter offer of Ksh ${price.toLocaleString()} sent to buyer!`);
  };

  // Handle Listing Toggle Status (Pause / Resume)
  const handleToggleListingStatus = (id: string) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'Active' ? 'Paused' : 'Active';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
    showToast('Listing status updated successfully.');
  };

  const handleDeleteListing = (id: string) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    showToast('Listing removed.');
  };

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => item.status === listingStatusFilter);
  }, [listings, listingStatusFilter]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      Active: listings.filter((l) => l.status === 'Active').length,
      Draft: listings.filter((l) => l.status === 'Draft').length,
      Sold: listings.filter((l) => l.status === 'Sold').length,
      Paused: listings.filter((l) => l.status === 'Paused').length,
      Expired: listings.filter((l) => l.status === 'Expired').length
    };
  }, [listings]);

  const sellerName = user?.name || 'Jimmy Mugo';

  return (
    <div className="space-y-8 relative pb-16">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          HEADER & SELLER PROFILE OVERVIEW
          ========================================== */}
      <div className="bg-gradient-to-r from-[#1E3063] via-[#17244B] to-[#1E3063] rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-amber-400/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#17244B] font-black text-2xl flex items-center justify-center font-display shadow-md border-2 border-white/20">
              {sellerName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="verified" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Private Seller
                </Badge>
                <Badge variant="accent" size="sm" className="bg-amber-400 text-[#17244B] font-black">
                  TIMS Logbook Sync Active
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Private Seller Dashboard
              </h1>
              <p className="text-xs text-slate-300">
                Simple, secure management for selling your personal vehicle in Kenya with KAYAD Escrow Protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowNewListingModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-[#17244B]" />
              <span>List Personal Vehicle</span>
            </Button>
          </div>
        </div>

        {/* 5 Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-400" /> Active Listings
            </p>
            <p className="text-2xl font-black font-display text-white">{counts.Active}</p>
            <p className="text-[11px] text-amber-300 font-bold truncate">342 Views This Week</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-300" /> Buyer Inquiries
            </p>
            <p className="text-2xl font-black font-display text-white">9 Direct Chats</p>
            <p className="text-[11px] text-blue-200 font-bold truncate">Avg Response: &lt;15 mins</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Escrow Vault
            </p>
            <p className="text-2xl font-black font-display text-white">Ksh 7.3M</p>
            <p className="text-[11px] text-emerald-300 font-bold truncate">1 Active Deal Secured</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-rose-300" /> Offers Pending
            </p>
            <p className="text-2xl font-black font-display text-amber-300">{offers.filter(o => o.status === 'Pending').length} Offers</p>
            <p className="text-[11px] text-slate-200 font-bold truncate">Highest: Ksh 7.45M</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Sales
            </p>
            <p className="text-2xl font-black font-display text-white">1 Vehicle</p>
            <p className="text-[11px] text-emerald-300 font-bold truncate">Payout Cleared ✓</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          SECTION NAVIGATION ANCHOR BAR
          ========================================== */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-2 px-2 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'overview', label: '1. Overview', icon: <Car className="w-3.5 h-3.5" /> },
            { id: 'listings', label: `2. My Listings (${listings.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'inquiries', label: '3. Buyer Inquiries (9)', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: 'escrow', label: '4. Escrow Transactions (1)', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'inspections', label: `5. Inspection Requests (${inspectionRequests.length})`, icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'offers', label: `6. Offers Received (${offers.filter(o => o.status === 'Pending').length})`, icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'sales', label: `7. Completed Sales (${completedSales.length})`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { id: 'verification', label: '8. Verification Status', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                const el = document.getElementById(`section-${tab.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          SECTION 1: OVERVIEW & QUICK ACTIONS
          ========================================== */}
      <div id="section-overview" className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-500" />
              Section 1: Seller Command Center Overview
            </h2>
            <p className="text-xs text-slate-500">Key metrics and quick actions for your personal vehicle sale.</p>
          </div>
          <Badge variant="verified" size="sm">
            Clean Private Seller Mode
          </Badge>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-white border-slate-200 hover:border-amber-400 transition-all space-y-3 cursor-pointer group" onClick={() => setShowNewListingModal(true)}>
            <div className="p-3 bg-amber-50 rounded-2xl w-fit text-amber-600 group-hover:bg-amber-100 transition-colors">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1E3063] text-sm font-display group-hover:text-amber-800">List Another Personal Car</h4>
              <p className="text-xs text-slate-500 font-medium">Free private listing with NTSA TIMS logbook check.</p>
            </div>
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
              Start Listing <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Card>

          <Card className="p-5 bg-white border-slate-200 hover:border-emerald-500 transition-all space-y-3 cursor-pointer group" onClick={() => {
            setActiveTab('escrow');
            document.getElementById('section-escrow')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <div className="p-3 bg-emerald-50 rounded-2xl w-fit text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1E3063] text-sm font-display group-hover:text-emerald-800">Monitor Escrow Payouts</h4>
              <p className="text-xs text-slate-500 font-medium">Ksh 7,300,000 currently protected in vault custody.</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              Check Vault Status <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Card>

          <Card className="p-5 bg-white border-slate-200 hover:border-blue-500 transition-all space-y-3 cursor-pointer group" onClick={() => {
            setActiveTab('verification');
            document.getElementById('section-verification')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <div className="p-3 bg-blue-50 rounded-2xl w-fit text-blue-600 group-hover:bg-blue-100 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1E3063] text-sm font-display group-hover:text-blue-800">Verify Seller Identity</h4>
              <p className="text-xs text-slate-500 font-medium">National ID and TIMS Ownership Badge Active.</p>
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              View Verification <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Card>
        </div>
      </div>

      {/* ==========================================
          SECTION 2: MY LISTINGS
          ========================================== */}
      <div id="section-listings" className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Section 2: My Personal Vehicle Listings
            </h2>
            <p className="text-xs text-slate-500">Manage status, prices, and view counts for your listed vehicles.</p>
          </div>

          {/* 5 Listing Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['Active', 'Draft', 'Sold', 'Paused', 'Expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setListingStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  listingStatusFilter === status
                    ? 'bg-[#1E3063] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status} ({counts[status]})
              </button>
            ))}
          </div>
        </div>

        {/* Listings Display Grid */}
        {filteredListings.length === 0 ? (
          <Card className="p-8 text-center space-y-3 bg-white">
            <Car className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No vehicles in "{listingStatusFilter}" state</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You currently don't have any vehicles under this status tab.
            </p>
            <Button variant="accent" size="sm" onClick={() => setShowNewListingModal(true)}>
              List a Vehicle Now
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredListings.map((vehicle) => (
              <Card key={vehicle.id} className="p-5 bg-white space-y-4 border-slate-200 shadow-xs hover:border-amber-400 transition-all">
                <div className="flex items-start gap-4">
                  <LazyImage
                    src={vehicle.image}
                    alt={vehicle.title}
                    wrapperClassName="w-28 h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200"
                    className="w-full h-full object-cover"
                  />

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          vehicle.status === 'Active' ? 'success' :
                          vehicle.status === 'Sold' ? 'secondary' :
                          vehicle.status === 'Draft' ? 'warning' : 'neutral'
                        }
                        size="sm"
                      >
                        {vehicle.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-bold">{vehicle.createdAt}</span>
                    </div>

                    <h3 className="font-black text-[#1E3063] text-sm font-display truncate">{vehicle.title}</h3>

                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-base font-black text-[#1E3063] font-display">
                        Ksh {vehicle.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {vehicle.year} • {vehicle.mileage.toLocaleString()} km
                      </span>
                    </div>

                    {vehicle.ntsaTimsVerified && (
                      <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> TIMS Logbook Verified
                      </p>
                    )}
                  </div>
                </div>

                {/* Listing Stats Row */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-extrabold uppercase">Views</span>
                    <span className="font-black text-[#1E3063]">{vehicle.viewsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-extrabold uppercase">Saves</span>
                    <span className="font-black text-rose-600">{vehicle.savesCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-extrabold uppercase">Inquiries</span>
                    <span className="font-black text-blue-600">{vehicle.inquiriesCount}</span>
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleListingStatus(vehicle.id)}
                    >
                      {vehicle.status === 'Active' ? <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> : <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{vehicle.status === 'Active' ? 'Pause Listing' : 'Activate Listing'}</span>
                    </Button>

                    <button
                      onClick={() => handleDeleteListing(vehicle.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const match = vehicles.find((v) => v.id === vehicle.id) || vehicles[0];
                      if (match && onQuickViewVehicle) onQuickViewVehicle(match);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1E3063]" />
                    <span>View Public Page</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          SECTION 3: BUYER INQUIRIES
          ========================================== */}
      <div id="section-inquiries" className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Section 3: Buyer Inquiries & Direct Messages
            </h2>
            <p className="text-xs text-slate-500">Track and respond to buyer inquiries regarding your personal vehicle.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('chat')}>
            <span>Open Direct Chat Hub</span>
          </Button>
        </div>

        <Card className="p-5 bg-white space-y-3">
          {[
            {
              id: 'inq-1',
              buyerName: 'Dr. Samuel Omondi',
              vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
              lastMsg: 'Good morning Jimmy, is the Prado available for inspection at Westlands tomorrow?',
              time: '10:12 AM',
              unread: true
            },
            {
              id: 'inq-2',
              buyerName: 'Eng. Beatrice Mwangi',
              vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
              lastMsg: 'I have submitted an KAYAD asset financing pre-approval offer of Ksh 7,450,000.',
              time: 'Yesterday',
              unread: false
            },
            {
              id: 'inq-3',
              buyerName: 'Kevin Mutua',
              vehicleTitle: '2019 Subaru Outback 2.5i Limited',
              lastMsg: 'Are you open to Ksh 3.1M for cash settlement in KAYAD escrow?',
              time: '2 days ago',
              unread: false
            }
          ].map((inq) => (
            <div
              key={inq.id}
              onClick={() => onNavigate('chat')}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs cursor-pointer ${
                inq.unread
                  ? 'bg-amber-50/70 border-amber-300 font-semibold'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold flex items-center justify-center font-display shrink-0">
                  {inq.buyerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-[#1E3063] text-sm">{inq.buyerName}</h4>
                    {inq.unread && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[9px] rounded-full uppercase">
                        NEW MSG
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Re: {inq.vehicleTitle}</p>
                  <p className="text-slate-700 font-medium mt-1 line-clamp-1">{inq.lastMsg}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-[10px] text-slate-400 font-bold">{inq.time}</span>
                <Button variant="secondary" size="sm">
                  <span>Reply</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#1E3063]" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ==========================================
          SECTION 4: ESCROW TRANSACTIONS
          ========================================== */}
      <div id="section-escrow" className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Section 4: Escrow Transactions & Vault Status
            </h2>
            <p className="text-xs text-slate-500">4-Way protected escrow vault monitoring, funds status, and required seller actions.</p>
          </div>

          <Badge variant="success" size="md">
            100% Capital Protection Guaranteed
          </Badge>
        </div>

        {activeEscrowDeals.map((deal) => (
          <Card key={deal.id} className="p-6 bg-white border-amber-300 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-extrabold uppercase">{deal.id}</span>
                <h3 className="text-lg font-black text-[#1E3063] font-display">{deal.vehicleTitle}</h3>
                <p className="text-xs text-slate-500 font-medium">Buyer: <strong>{deal.buyerName}</strong> ({deal.buyerPhone})</p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Agreed Sale Amount</p>
                <p className="text-2xl font-black text-[#1E3063] font-display">Ksh {deal.agreedPrice.toLocaleString()}</p>
                <Badge variant="success" size="sm">
                  ✓ Funds Deposited in KAYAD Vault
                </Badge>
              </div>
            </div>

            {/* Buyer Progress Tracker Bar */}
            <div className="space-y-2">
              <p className="text-xs font-black text-[#1E3063] uppercase tracking-wider font-display">
                Buyer & Handover Milestone Progress
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {deal.buyerProgress.map((item) => (
                  <div
                    key={item.step}
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      item.done
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : item.active
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-center">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : item.active ? (
                        <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">{item.step}</span>
                      )}
                    </div>
                    <p className="font-extrabold text-[11px] truncate">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Action Callout */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-black text-[#17244B]">Action Required From Seller:</p>
                  <p className="text-slate-700 font-medium">{deal.requiredAction}</p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedTaskModal('Upload NTSA TIMS Logbook Transfer Form 9')}
                className="shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Form 9</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* ==========================================
          SECTION 5: INSPECTION REQUESTS
          ========================================== */}
      <div id="section-inspections" className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Section 5: Inspection Requests
            </h2>
            <p className="text-xs text-slate-500">150-Point mechanical diagnostic requests scheduled by interested buyers.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('inspections')}>
            <span>View All Inspectors</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inspectionRequests.map((req) => (
            <Card key={req.id} className="p-5 bg-white border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <Badge variant={req.status === 'Completed' ? 'success' : 'warning'} size="sm">
                  {req.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-400 font-semibold">{req.scheduledTime}</span>
              </div>

              <h4 className="font-black text-[#1E3063] text-sm">{req.vehicleTitle}</h4>

              <div className="space-y-1.5 text-xs text-slate-600">
                <p><strong>Buyer:</strong> {req.buyerName}</p>
                <p><strong>Certified Inspector:</strong> {req.inspectorName}</p>
                <p><strong>Location:</strong> {req.location}</p>
                {req.overallScore && (
                  <p className="font-bold text-emerald-700"><strong>Inspection Rating:</strong> {req.overallScore}% Pass Rating</p>
                )}
              </div>

              {req.reportSummary && (
                <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-950 font-medium border border-emerald-200">
                  {req.reportSummary}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          SECTION 6: OFFERS RECEIVED
          ========================================== */}
      <div id="section-offers" className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Section 6: Offers Received
            </h2>
            <p className="text-xs text-slate-500">Review cash and financing offers submitted by verified buyers.</p>
          </div>
        </div>

        <div className="space-y-3">
          {offers.map((offer) => (
            <Card key={offer.id} className="p-5 bg-white border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <LazyImage src={offer.vehicleImage} alt={offer.vehicleTitle} wrapperClassName="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-900" className="w-full h-full object-cover" />
                  <div>
                    <h4 className="font-black text-[#1E3063] text-sm">{offer.vehicleTitle}</h4>
                    <p className="text-xs text-slate-500">Buyer: <strong>{offer.buyerName}</strong> • {offer.paymentType}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Offered Price</span>
                  <span className="text-xl font-black text-emerald-700 font-display">Ksh {offer.offeredAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block">Asking: Ksh {offer.askingPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Expires in {offer.expiresInHours} hours</span>
                  <span>• Status: <strong className="text-[#1E3063]">{offer.status}</strong></span>
                </div>

                {offer.status === 'Pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptOffer(offer.id)}
                    >
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                      <span>Accept Offer</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedOfferForCounter(offer);
                        setCounterPriceInput(offer.offeredAmount.toString());
                      }}
                    >
                      <span>Counter Offer</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineOffer(offer.id)}
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      <span>Decline</span>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          SECTION 7: COMPLETED SALES
          ========================================== */}
      <div id="section-sales" className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Section 7: Completed Sales & Payout History
          </h2>
          <p className="text-xs text-slate-500">Historical records of finished private sales and cleared bank payouts.</p>
        </div>

        <div className="space-y-3">
          {completedSales.map((sale) => (
            <Card key={sale.id} className="p-5 bg-white border-emerald-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <Badge variant="success" size="sm">
                    ✓ PAYOUT CLEARED
                  </Badge>
                  <h4 className="font-black text-[#1E3063] text-sm mt-1">{sale.vehicleTitle}</h4>
                  <p className="text-xs text-slate-500">Buyer: {sale.buyerName} • TIMS Ref: {sale.timsTransferRef}</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Payout Received</span>
                  <span className="text-xl font-black text-emerald-700 font-display">Ksh {sale.payoutAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">{sale.payoutMethod}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Completed on {sale.completedDate}</span>
                <Button variant="outline" size="sm" onClick={() => showToast('Downloading Official Sales Receipt PDF...')}>
                  <FileText className="w-3.5 h-3.5 text-[#1E3063]" />
                  <span>Download Receipt</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          SECTION 8: VERIFICATION STATUS
          ========================================== */}
      <div id="section-verification" className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Section 8: Private Seller Verification Status
          </h2>
          <p className="text-xs text-slate-500">Your trust metrics, identity validation, and logbook sync status.</p>
        </div>

        <Card className="p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border-slate-200 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">National ID / Passport</span>
                <Badge variant="success" size="sm">VERIFIED ✓</Badge>
              </div>
              <p className="text-slate-500 text-[11px]">Identity matched with Kenyan Registrar of Persons.</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">NTSA TIMS Logbook</span>
                <Badge variant="success" size="sm">SYNCED ✓</Badge>
              </div>
              <p className="text-slate-500 text-[11px]">Vehicle title ownership verified directly with NTSA.</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Phone & Email OTP</span>
                <Badge variant="success" size="sm">VERIFIED ✓</Badge>
              </div>
              <p className="text-slate-500 text-[11px]">+254 7** *** **2 authenticated via Safaricom OTP.</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Payout Account</span>
                <Badge variant="success" size="sm">CONFIGURED ✓</Badge>
              </div>
              <p className="text-slate-500 text-[11px]">our escrow custodian (A/C ending ****8891).</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ==========================================
          MODAL: COUNTER OFFER
          ========================================== */}
      {selectedOfferForCounter && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOfferForCounter(null)}
          title="Submit Counter Offer to Buyer"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Propose a counter price to <strong>{selectedOfferForCounter.buyerName}</strong> for <strong>{selectedOfferForCounter.vehicleTitle}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E3063] block">Asking Price:</label>
              <Input value={`Ksh ${selectedOfferForCounter.askingPrice.toLocaleString()}`} readOnly className="bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E3063] block">Buyer's Current Offer:</label>
              <Input value={`Ksh ${selectedOfferForCounter.offeredAmount.toLocaleString()}`} readOnly className="bg-slate-50 text-emerald-700 font-bold" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E3063] block">Your Counter Offer Amount (Ksh):</label>
              <Input
                type="number"
                value={counterPriceInput}
                onChange={(e) => setCounterPriceInput(e.target.value)}
                placeholder="e.g. 7400000"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelectedOfferForCounter(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleCounterOfferSubmit}>Send Counter Offer</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL: NEW LISTING DRAFT
          ========================================== */}
      {showNewListingModal && (
        <Modal
          isOpen={true}
          onClose={() => { setShowNewListingModal(false); setNewListingError(null); }}
          title="List Your Personal Vehicle for Sale"
          maxWidth="xl"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              List your car as a verified private seller.
            </p>

            {newListingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold">
                {newListingError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">Car Make:</label>
                <Input placeholder="e.g. Toyota" value={newListingForm.make} onChange={(e) => setNewListingForm((f) => ({ ...f, make: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">Car Model:</label>
                <Input placeholder="e.g. Prado" value={newListingForm.model} onChange={(e) => setNewListingForm((f) => ({ ...f, model: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">Year of Manufacture:</label>
                <Input placeholder="e.g. 2021" value={newListingForm.year} onChange={(e) => setNewListingForm((f) => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">Asking Price (Ksh):</label>
                <Input placeholder="e.g. 7450000" value={newListingForm.price} onChange={(e) => setNewListingForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">Mileage (km):</label>
                <Input placeholder="e.g. 45000" value={newListingForm.mileage} onChange={(e) => setNewListingForm((f) => ({ ...f, mileage: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E3063] block">NTSA Registration / Logbook Number:</label>
                <Input placeholder="e.g. KDG 492A" value={newListingForm.registrationNumber} onChange={(e) => setNewListingForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#1E3063] block">Photos (at least 1 required):</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setNewListingImages(Array.from(e.target.files || []))}
                className="w-full text-xs"
              />
              {newListingImages.length > 0 && (
                <p className="text-emerald-700 font-semibold">{newListingImages.length} photo(s) selected</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => { setShowNewListingModal(false); setNewListingError(null); }}>Cancel</Button>
              <Button
                variant="primary"
                disabled={newListingSubmitting}
                onClick={async () => {
                  setNewListingError(null);
                  if (!newListingForm.make.trim() || !newListingForm.model.trim() || !newListingForm.year || !newListingForm.price) {
                    setNewListingError('Make, model, year, and price are required.');
                    return;
                  }
                  if (newListingImages.length === 0) {
                    setNewListingError('At least one photo is required.');
                    return;
                  }
                  setNewListingSubmitting(true);
                  try {
                    await createCar({
                      title: `${newListingForm.year} ${newListingForm.make} ${newListingForm.model}`.trim(),
                      brand: newListingForm.make,
                      model: newListingForm.model,
                      year: Number(newListingForm.year),
                      price: Number(newListingForm.price),
                      mileage: newListingForm.mileage ? Number(newListingForm.mileage) : undefined,
                      registrationNumber: newListingForm.registrationNumber || undefined,
                      images: newListingImages,
                    });
                    setShowNewListingModal(false);
                    setNewListingForm({ make: '', model: '', year: '', price: '', mileage: '', registrationNumber: '' });
                    setNewListingImages([]);
                    showToast('Your vehicle has been listed.');
                  } catch (err) {
                    setNewListingError(err instanceof VehicleApiError ? err.message : 'Could not publish your listing. Please try again.');
                  } finally {
                    setNewListingSubmitting(false);
                  }
                }}
              >
                {newListingSubmitting ? 'Publishing…' : 'Publish Private Listing'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL: UPLOAD TIMS FORM TASK
          ========================================== */}
      {selectedTaskModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTaskModal(null)}
          title={selectedTaskModal}
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Upload a scanned copy or clear photo of signed NTSA TIMS Logbook Transfer Form 9. Once uploaded, funds will be queued for payout upon buyer inspection signoff.
            </p>

            <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2 bg-slate-50 cursor-pointer hover:border-amber-400 transition-colors">
              <Upload className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-slate-700">Click to upload NTSA Form 9 PDF or Image</p>
              <p className="text-[10px] text-slate-400">Supported formats: PDF, PNG, JPG (Max 10MB)</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelectedTaskModal(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedTaskModal(null);
                  showToast('Form 9 successfully uploaded to KAYAD Escrow Vault!');
                }}
              >
                Confirm Upload
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PrivateSellerDashboardView;
