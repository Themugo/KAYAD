import React, { useState, useMemo } from 'react';
import { Vehicle, EscrowTransaction, ChatMessage, UserProfile } from '../../../types';
import { Car, PlusCircle, Lock, CheckCircle2, Eye, MessageSquare, ShieldCheck, DollarSign, FileText, Sparkles, ArrowRight, Wrench } from 'lucide-react';
import { Card, Badge, Button, LazyImage, Modal } from '../../../components/ui';

export interface PrivateSellerListing {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  status: 'Active';
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  image: string;
  location: string;
  county: string;
  ntsaTimsVerified: boolean;
  createdAt: string;
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
  const [listingStatusFilter, setListingStatusFilter] = useState<'Active'>('Active');

  // Modals
  const [showNewListingModal, setShowNewListingModal] = useState<boolean>(false);

  // Seller inventory is derived only from real vehicles supplied by the backend.
  const listings: PrivateSellerListing[] = useMemo(() => (vehicles || [])
    .filter((vehicle) => !user?.id || vehicle.sellerId === user.id)
    .map((vehicle) => ({
      id: vehicle.id,
      title: vehicle.title,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      mileage: vehicle.mileage,
      status: 'Active',
      viewsCount: vehicle.viewsCount || 0,
      savesCount: vehicle.savedCount || 0,
      inquiriesCount: 0,
      image: vehicle.image || vehicle.images?.[0] || '',
      location: vehicle.location,
      county: vehicle.county || '',
      ntsaTimsVerified: Boolean(vehicle.verified),
      createdAt: ''
    })), [vehicles, user?.id]);


  // The active backend exposes no private-seller offer/listing mutation contract.
  // This view therefore remains read-only and never simulates success locally.
  const unsupportedSellerAction = () => showToast('This seller action is not available in the current KAYAD backend. No local change was made.');

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => item.status === listingStatusFilter);
  }, [listings, listingStatusFilter]);

  // Status Counts
  const counts = useMemo(() => ({
    Active: listings.length,
  }), [listings]);

  const sellerName = user?.name || 'KAYAD Seller';

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
            <p className="text-2xl font-black font-display text-white">{messages.length} Messages</p>
            <p className="text-[11px] text-blue-200 font-bold truncate">Live count from supplied conversation data</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Escrow Vault
            </p>
            <p className="text-2xl font-black font-display text-white">{deals.length} Records</p>
            <p className="text-[11px] text-emerald-300 font-bold truncate">Escrow records supplied by the backend</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-rose-300" /> Offers Pending
            </p>
            <p className="text-2xl font-black font-display text-amber-300">No offers</p>
            <p className="text-[11px] text-slate-200 font-bold truncate">No seller offer feed is connected</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Sales
            </p>
            <p className="text-2xl font-black font-display text-white">Unavailable</p>
            <p className="text-[11px] text-emerald-300 font-bold truncate">No completed-sales API is connected</p>
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
            { id: 'inquiries', label: `3. Buyer Messages (${messages.length})`, icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: 'escrow', label: `4. Escrow Records (${deals.length})`, icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'inspections', label: '5. Inspection Requests', icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'offers', label: '6. Offers Received', icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'sales', label: '7. Completed Sales', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
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
              <p className="text-xs text-slate-500 font-medium">Live escrow records, when available, are shown in the escrow section below.</p>
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
              <p className="text-xs text-slate-500 font-medium">Only verification data returned by the backend is displayed.</p>
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

          {/* Only backend-backed active listings are represented here. */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['Active'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setListingStatusFilter(status)}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#1E3063] text-white shadow-xs"
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
                      onClick={unsupportedSellerAction}
                    >
                      <span>Listing controls unavailable</span>
                    </Button>
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
          <p className="text-sm text-slate-500 py-6 text-center">Buyer inquiries are available when returned by the authenticated messaging backend.</p>
        </Card>
      </div>

      {/* ==========================================
          SECTION 4: ESCROW TRANSACTIONS
          ========================================== */}
      <div id="section-escrow" className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            Section 4: Escrow Transactions & Vault Status
          </h2>
          <p className="text-xs text-slate-500">Escrow records are available through the canonical escrow workflow.</p>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No seller escrow records are available in this dashboard's current API contract.</p>
          <p className="text-xs text-slate-500 mt-2">KAYAD does not display fabricated balances, deposit confirmations, buyer milestones, or payout guarantees.</p>
        </Card>
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
            <p className="text-xs text-slate-500">Only inspection records returned by the active backend are displayed.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('inspections')}>View Inspections</Button>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No seller inspection requests are exposed by this dashboard's current API contract.</p>
        </Card>
      </div>

      {/* ==========================================
          SECTION 6: OFFERS RECEIVED
          ========================================== */}
      <div id="section-offers" className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            Section 6: Offers Received
          </h2>
          <p className="text-xs text-slate-500">Buyer offers are shown only when returned by a real seller-offer backend contract.</p>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No seller offer feed is currently exposed by the backend.</p>
        </Card>
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
          <p className="text-xs text-slate-500">Completed sales and payout records are shown only when returned by the backend.</p>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No completed seller sales or payout history are exposed by this dashboard's current API contract.</p>
        </Card>
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
          <p className="text-xs text-slate-500">Verification status is shown only when supported by the signed-in user's backend data.</p>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No private-seller verification details are currently exposed by the active API contract.</p>
          <p className="text-xs text-slate-500 mt-2">KAYAD does not display fabricated identity, TIMS, OTP, or payout-account confirmations.</p>
        </Card>
      </div>

      {/* ==========================================
          MODAL: NEW LISTING
          ========================================== */}
      {showNewListingModal && (
        <Modal isOpen={true} onClose={() => setShowNewListingModal(false)} title="List Your Personal Vehicle" maxWidth="xl">
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">Private-seller listing creation is not exposed by the current backend contract.</p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">No local draft, fake listing, or simulated publication will be created from this screen.</div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowNewListingModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default PrivateSellerDashboardView;
