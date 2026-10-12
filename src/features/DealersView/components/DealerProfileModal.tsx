import React, { useState, useMemo } from 'react';
import { Dealer, Vehicle, BodyStyle } from '../../../types';
import { Building2, ShieldCheck, MapPin, Star, Phone, Mail, CheckCircle2, Clock, UserCheck, Lock, Award, MessageSquare, FileCheck, Share2, Heart, Navigation, Calendar, Search, X, ArrowRight, Sparkles, ChevronRight, CreditCard, Globe, Landmark, Eye, Compass, Car } from 'lucide-react';
import { Modal, Badge, Button, LazyImage } from '../../../components/ui';
import VehicleCard from '../../../components/VehicleCard';

interface DealerProfileModalProps {
  dealer: Dealer | null;
  allDealers?: Dealer[];
  vehicles: Vehicle[];
  onClose: () => void;
  onQuickViewVehicle: (v: Vehicle) => void;
  onStartEscrow: (v: Vehicle) => void;
  onContactSeller?: (v: Vehicle) => void;
}

export const DealerProfileModal: React.FC<DealerProfileModalProps> = ({
  dealer,
  allDealers = [],
  vehicles,
  onClose,
  onQuickViewVehicle,
  onStartEscrow,
  onContactSeller
}) => {
  const isPrivateSeller = dealer?.type === 'Private Seller';

  // State
  const [activeTab, setActiveTab] = useState<'inventory' | 'about' | 'trust' | 'reviews' | 'gallery' | 'location'>('inventory');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modal States
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showTestDriveModal, setShowTestDriveModal] = useState<boolean>(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState<boolean>(false);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);

  // Test Drive Form State

  // Reviews Sorting State
  const [reviewsSortBy, setReviewsSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  // Inventory Filtering State
  const [invSearch, setInvSearch] = useState<string>('');
  const [invMake, setInvMake] = useState<string>('All');
  const [invBodyStyle, setInvBodyStyle] = useState<string>('All');
  const [invFuel, setInvFuel] = useState<string>('All');
  const [invTransmission, setInvTransmission] = useState<string>('All');
  const [invMaxPrice, setInvMaxPrice] = useState<number>(25000000);
  const [invOnlyInspected, setInvOnlyInspected] = useState<boolean>(false);
  const [invOnlyEscrow, setInvOnlyEscrow] = useState<boolean>(false);
  const [invOnlyFinance, setInvOnlyFinance] = useState<boolean>(false);

  // Show Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dealer Vehicles Filter
  const dealerVehicles = useMemo(() => {
    if (!dealer) return [];
    return vehicles.filter((v) =>
      v.sellerName.toLowerCase().includes(dealer.name.toLowerCase()) ||
      dealer.name.toLowerCase().includes(v.sellerName.toLowerCase())
    );
  }, [vehicles, dealer?.name]);

  // Filtered Inventory
  const filteredDealerVehicles = useMemo(() => {
    return dealerVehicles.filter((v) => {
      if (invSearch) {
        const q = invSearch.toLowerCase().trim();
        const match = v.title.toLowerCase().includes(q) ||
                      v.make.toLowerCase().includes(q) ||
                      v.model.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (invMake !== 'All' && v.make.toLowerCase() !== invMake.toLowerCase()) return false;
      if (invBodyStyle !== 'All' && v.bodyStyle !== invBodyStyle) return false;
      if (invFuel !== 'All' && v.fuelType !== invFuel) return false;
      if (invTransmission !== 'All' && !v.transmission.toLowerCase().includes(invTransmission.toLowerCase())) return false;
      if (v.price > invMaxPrice) return false;
      if (invOnlyInspected && !v.inspectionPassed) return false;
      if (invOnlyEscrow && !v.escrowEligible) return false;
      if (invOnlyFinance && !v.financeAvailable) return false;
      return true;
    });
  }, [dealerVehicles, invSearch, invMake, invBodyStyle, invFuel, invTransmission, invMaxPrice, invOnlyInspected, invOnlyEscrow, invOnlyFinance]);

  // Unique Makes in this Dealer's Stock
  const dealerMakes = useMemo(() => {
    const set = Array.from(new Set(dealerVehicles.map((v) => v.make))).sort();
    return ['All', ...set];
  }, [dealerVehicles]);

  // Unique Body Styles in this Dealer's Stock
  const dealerBodyStyles = useMemo(() => {
    const set = Array.from(new Set(dealerVehicles.map((v) => v.bodyStyle).filter((b): b is BodyStyle => Boolean(b)))).sort();
    return ['All', ...set];
  }, [dealerVehicles]);

  // Years on KAYAD calculation
  const yearsOnKayad = useMemo(() => {
    if (!dealer) return '';
    const startYear = Number.parseInt(dealer.verifiedSince, 10);
    if (!Number.isFinite(startYear) || startYear < 2000 || startYear > new Date().getFullYear()) return '';
    const diff = new Date().getFullYear() - startYear;
    return `${diff} ${diff === 1 ? 'Year' : 'Years'} on KAYAD`;
  }, [dealer?.verifiedSince]);

  // Related Verified Dealers (Same county or Enterprise dealers)
  const relatedDealers = useMemo(() => {
    if (!dealer) return [];
    return allDealers
      .filter((d) => d.id !== dealer.id && d.type !== 'Private Seller')
      .slice(0, 3);
  }, [allDealers, dealer?.id]);

  // Reviews Data
  const reviewsList = useMemo(() => {
    if (!dealer) return [];
    // Only real reviews are shown. Two invented "verified purchase" reviews used to be substituted when a dealer had none.
    const base = dealer.reviews || [];

    return [...base].sort((a, b) => {
      if (reviewsSortBy === 'highest') return b.rating - a.rating;
      if (reviewsSortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [dealer?.reviews, reviewsSortBy]);

  // Rules of Hooks: every hook above this line must run unconditionally
  // on every render (this modal is always mounted by DealersView.tsx -
  // open/closed is controlled via the `dealer` prop being null or not,
  // not by conditionally rendering the whole component). The guard used
  // to sit at the very top of the component, before any hook, which
  // meant going from closed (dealer=null, 0 hooks reached) to open
  // (dealer set, 30 hooks reached) was a hooks-count mismatch between
  // renders of the same instance - exactly the same bug, and exact same
  // crash ("Minified React error #310"), found and fixed in
  // VehicleDetailModal.tsx. Moved here, after every hook, and made each
  // hook above null-safe so they're harmless no-ops when dealer is null.
  if (!dealer) return null;

  // Handlers
  const handleShareDealer = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      triggerToast(`Digital Showroom link for ${dealer.name} copied to clipboard!`);
    } else {
      triggerToast(`Digital Showroom: ${dealer.name}`);
    }
  };

  return (
    <Modal isOpen={!!dealer} onClose={onClose} maxWidth="5xl">
      <div className="space-y-6 relative pb-20 md:pb-0 text-[#0A3340]">

        {/* TOAST FLOATING BANNER */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-[#176B87] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. DIGITAL SHOWROOM / PRIVATE SELLER HEADER BANNER */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl overflow-hidden border border-[#D7E7E4]/80 shadow-md bg-[#176B87]">

          {/* Background Cover Image with Sophisticated Navy Gradient */}
          <div className="h-44 sm:h-56 w-full relative">
            <LazyImage
              src={dealer.coverBanner || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200'}
              alt={dealer.name}
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#176B87] via-[#176B87]/85 to-transparent" />
          </div>

          {/* Header Content Overlay */}
          <div className="p-5 sm:p-6 -mt-16 sm:-mt-20 relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">

              {/* Logo & Identity */}
              <div className="flex items-start sm:items-end gap-4">
                <div className="relative shrink-0">
                  <LazyImage
                    src={dealer.logo}
                    alt={dealer.name}
                    wrapperClassName="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-xl bg-white overflow-hidden"
                    className="w-full h-full object-cover"
                  />
                  {dealer.badges?.some((badge) => badge.toLowerCase().includes('verified')) ? (
                    <span className="absolute -top-2 -right-2 bg-[#176B87] text-white p-1 rounded-full shadow-md" title="Verification badge displayed on this profile">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5 text-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isPrivateSeller ? "success" : "verified"} size="sm">
                      {isPrivateSeller ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-[#5AAFA4] shrink-0" />
                      )}
                      {isPrivateSeller ? 'Private Seller' : (dealer.type || 'Dealership')}
                    </Badge>

                    <span className="bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#5AAFA4] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#5AAFA4] text-[#5AAFA4]" />
                      {dealer.reviewsCount > 0 ? `${dealer.rating} (${dealer.reviewsCount} ratings)` : 'No public ratings yet'}
                    </span>

                    <span className="bg-emerald-900/70 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {dealer.badges?.length ? dealer.badges.join(' · ') : 'No verification details provided'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                    {dealer.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#DDF4F0] font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#5AAFA4] shrink-0" />
                      {isPrivateSeller ? `Approx. ${dealer.location} (Privacy Protected)` : (dealer.address || `${dealer.location} (${dealer.county})`)}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {dealer.responseTime ? <>Response time: <strong className="text-white">{dealer.responseTime}</strong></> : 'Response time not provided'}
                    </span>

                    <span className="flex items-center gap-1 text-[#5AAFA4] font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      {dealer.verifiedSince ? `Member since ${dealer.verifiedSince}` : 'Membership date not provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Header Strip */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareDealer}
                  className="text-xs font-bold"
                  title="Share Seller Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                {isPrivateSeller ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (dealerVehicles.length > 0) {
                        onStartEscrow(dealerVehicles[0]);
                      } else {
                        setShowContactModal(true);
                      }
                    }}
                    className="bg-[#176B87] hover:bg-[#12576d] text-white text-xs font-bold shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#5AAFA4]" />
                    <span>Review purchase options</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowContactModal(true)}
                    className="bg-[#176B87] hover:bg-[#12576d] text-white text-xs font-bold shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contact Dealer</span>
                  </Button>
                )}
              </div>

            </div>

            {/* Private Seller Privacy Protection Banner */}
            {isPrivateSeller && (
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-between text-xs text-white gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#5AAFA4] shrink-0" />
                  <span className="text-[11px] sm:text-xs">
                    <strong>KAYAD Private Seller Security:</strong> Use the available contact options and confirm the transaction terms. Escrow applies only when the programme and the specific listing explicitly allow it.
                  </span>
                </div>
                <Badge variant="escrow" size="sm" className="shrink-0 font-bold">
                  Check escrow eligibility
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PRIMARY ACTION CTA BAR */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-3 border border-[#D7E7E4] shadow-xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
          <div className="flex items-center gap-2">
            {isPrivateSeller ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (dealerVehicles.length > 0) {
                      onStartEscrow(dealerVehicles[0]);
                    } else {
                      setToastMessage('No vehicle is attached to this profile. Open an eligible listing to review escrow options.');
                    }
                  }}
                  className="bg-[#176B87] hover:bg-[#12576d] text-white font-bold shrink-0 shadow-sm"
                >
                  <Lock className="w-4 h-4 text-[#5AAFA4]" />
                  <span>Review escrow options</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                      onQuickViewVehicle(dealerVehicles[0]);
                    } else {
                      setShowContactModal(true);
                    }
                  }}
                  className="bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-200 font-extrabold shrink-0"
                >
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Book Independent Pre-Purchase Inspection</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowContactModal(true)}
                  className="text-[#12576D] hover:bg-[#F6FAF9] font-bold shrink-0"
                >
                  <MessageSquare className="w-4 h-4 text-[#176B87]" />
                  <span>Message seller</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setActiveTab('inventory');
                    const el = document.getElementById('showroom-inventory-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#176B87] text-white font-bold shrink-0"
                >
                  <Car className="w-4 h-4 text-[#5AAFA4]" />
                  <span>Browse Stock ({dealerVehicles.length} Vehicles)</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowTestDriveModal(true)}
                  className="bg-[#F3FAF9] text-[#176B87] hover:bg-[#DDF4F0] border border-[#BDE5DE] font-extrabold shrink-0"
                >
                  <Calendar className="w-4 h-4 text-[#176B87]" />
                  <span>Book Test Drive</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowDirectionsModal(true)}
                  className="text-[#12576D] hover:bg-[#F6FAF9] font-bold shrink-0"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Get Showroom Directions</span>
                </Button>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[#64748B] font-semibold px-2">
            <span className="flex items-center gap-1 text-emerald-700">
              <Lock className="w-3.5 h-3.5" /> Escrow availability varies by listing
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TRUST PANEL / STATISTICS METRICS GRID */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
              Recorded escrow deals
            </p>
            <p className="text-2xl font-black text-[#176B87] font-display">
              {dealer.completedEscrowDeals ?? '—'} <span className="text-xs text-[#64748B] font-bold">recorded</span>
            </p>
            <p className="text-[10px] text-[#64748B] font-medium">Review listing and deal status</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Published seller rating</p>
            <p className="text-2xl font-black text-[#176B87] font-display flex items-center gap-1">
              <Star className="w-5 h-5 fill-[#13B8A6] text-[#13B8A6]" />
              {dealer.reviewsCount > 0 ? dealer.rating : '—'} <span className="text-xs text-[#94A3B8] font-normal">{dealer.reviewsCount > 0 ? '/ 5.0' : 'No ratings'}</span>
            </p>
            <p className="text-[10px] text-[#64748B] font-medium">{dealer.reviewsCount} Buyer Reviews</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Profile verification details</p>
            <p className="text-2xl font-black text-emerald-700 font-display flex items-center gap-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              {dealer.badges?.length ? 'See profile badges' : 'Not provided'}
            </p>
            <p className="text-[10px] text-[#64748B] font-medium">Check ownership details independently</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Buyer guidance</p>
            <p className="text-2xl font-black text-[#176B87] font-display">
              {typeof dealer.buyerSatisfaction === 'number' ? `${dealer.buyerSatisfaction}%` : '—'}
            </p>
            <p className="text-[10px] text-[#64748B] font-medium">Published score if available; not a guarantee</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DIGITAL SHOWROOM TABBED NAVIGATION */}
        {/* ========================================================================= */}
        <div className="border-b border-[#D7E7E4] flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
          {[
            { id: 'inventory', label: `Inventory Stock (${dealerVehicles.length})`, icon: <Car className="w-4 h-4" /> },
            { id: 'about', label: 'About & Services', icon: <Building2 className="w-4 h-4" /> },
            { id: 'trust', label: 'Trust & Verification Matrix', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> },
            { id: 'reviews', label: `Buyer Reviews (${reviewsList.length})`, icon: <Star className="w-4 h-4 text-[#176B87]" /> },
            { id: 'gallery', label: 'Showroom Gallery', icon: <Eye className="w-4 h-4 text-[#176B87]" /> },
            { id: 'location', label: 'Yard Location & Directions', icon: <MapPin className="w-4 h-4 text-[#176B87]" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#176B87] text-[#176B87] bg-[#F3FAF9]/60 rounded-t-xl'
                  : 'border-transparent text-[#64748B] hover:text-[#0A3340] hover:bg-[#F6FAF9]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* 5. TAB CONTENT PANELS */}
        {/* ========================================================================= */}

        {/* TAB 1: INVENTORY SHOWCASE (PRIMARY CONTENT) */}
        {activeTab === 'inventory' && (
          <div id="showroom-inventory-anchor" className="space-y-5 animate-fade-in">

            {/* Showroom Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder={`Search within ${dealer.name}'s inventory...`}
                    className="w-full pl-9 pr-8 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#176B87] focus:bg-white"
                  />
                  {invSearch && (
                    <button onClick={() => setInvSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
                  {/* Make Filter */}
                  <select
                    value={invMake}
                    onChange={(e) => setInvMake(e.target.value)}
                    className="px-3 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl font-bold text-[#176B87] focus:outline-none cursor-pointer"
                  >
                    {dealerMakes.map((m) => (
                      <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>
                    ))}
                  </select>

                  {/* Body Style */}
                  <select
                    value={invBodyStyle}
                    onChange={(e) => setInvBodyStyle(e.target.value)}
                    className="px-3 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl font-bold text-[#176B87] focus:outline-none cursor-pointer"
                  >
                    {dealerBodyStyles.map((b) => (
                      <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>
                    ))}
                  </select>

                  {/* Fuel */}
                  <select
                    value={invFuel}
                    onChange={(e) => setInvFuel(e.target.value)}
                    className="px-3 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl font-bold text-[#176B87] focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Fuels</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              {/* Boolean Badging Quick Toggles */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-[#D7E7E4] font-semibold text-[#12576D]">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#176B87]">
                  <input
                    type="checkbox"
                    checked={invOnlyInspected}
                    onChange={(e) => setInvOnlyInspected(e.target.checked)}
                    className="rounded accent-[#176B87]"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Inspected</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#176B87]">
                  <input
                    type="checkbox"
                    checked={invOnlyEscrow}
                    onChange={(e) => setInvOnlyEscrow(e.target.checked)}
                    className="rounded accent-[#176B87]"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#176B87]" />
                  <span>Escrow Eligible</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#176B87]">
                  <input
                    type="checkbox"
                    checked={invOnlyFinance}
                    onChange={(e) => setInvOnlyFinance(e.target.checked)}
                    className="rounded accent-[#176B87]"
                  />
                  <Landmark className="w-3.5 h-3.5 text-[#176B87]" />
                  <span>Asset Finance Available</span>
                </label>
              </div>
            </div>

            {/* Inventory Results Grid */}
            {filteredDealerVehicles.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-[#D7E7E4] space-y-3">
                <Car className="w-10 h-10 text-[#BDE5DE] mx-auto" />
                <p className="font-bold text-[#12576D]">No vehicles match your active search filters in this digital showroom.</p>
                <p className="text-xs text-[#64748B]">Try resetting filters or expanding price and fuel parameters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInvSearch('');
                    setInvMake('All');
                    setInvBodyStyle('All');
                    setInvFuel('All');
                    setInvOnlyInspected(false);
                    setInvOnlyEscrow(false);
                    setInvOnlyFinance(false);
                  }}
                >
                  Reset Showroom Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDealerVehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isSaved={false}
                    isCompared={false}
                    onToggleSave={() => {}}
                    onToggleCompare={() => {}}
                    onQuickView={onQuickViewVehicle}
                    onStartEscrow={onStartEscrow}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ABOUT & SERVICES */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-fade-in text-xs">
            {/* Description */}
            <div className="bg-white p-5 rounded-2xl border border-[#D7E7E4] space-y-3 shadow-xs">
              <h3 className="text-sm font-extrabold text-[#176B87] font-display uppercase tracking-wider">
                Dealership Overview & Business Identity
              </h3>
              <p className="text-[#12576D] leading-relaxed text-sm">
                {dealer.description || 'No business description has been provided for this profile.'}
              </p>
            </div>

            {/* Specializations & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2">
                <h4 className="font-extrabold text-[#176B87] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#176B87]" /> Business Specializations
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.specializations?.length ? dealer.specializations : ['No specializations listed']).map((spec, i) => (
                    <span key={i} className="bg-[#EEF7F5] text-[#176B87] font-bold px-3 py-1 rounded-xl border border-[#D7E7E4]">
                      • {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2">
                <h4 className="font-extrabold text-[#176B87] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#176B87]" /> Languages Spoken by Sales Team
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.languages?.length ? dealer.languages : ['Languages not provided']).map((lang, i) => (
                    <span key={i} className="bg-[#F3FAF9] text-[#0A3340] font-bold px-3 py-1 rounded-xl border border-[#D7E7E4]">
                      🗣️ {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Operating Hours & Payment Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2">
                <h4 className="font-extrabold text-[#176B87] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Showroom Operating Hours
                </h4>
                <p className="text-[#12576D] font-bold text-sm bg-[#F6FAF9] p-3 rounded-xl border border-[#D7E7E4]">
                  {dealer.operatingHours || 'Operating hours not provided'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2">
                <h4 className="font-extrabold text-[#176B87] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#176B87]" /> Accepted Payment Channels
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.paymentMethods?.length ? dealer.paymentMethods : ['Confirm payment methods with the seller']).map((pm, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1 rounded-xl border border-emerald-200">
                      ✓ {pm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Offered Grid */}
            <div className="bg-white p-5 rounded-2xl border border-[#D7E7E4] space-y-3">
              <h3 className="text-xs font-extrabold text-[#176B87] uppercase tracking-wider font-display">
                Services Offered by {dealer.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(dealer.servicesOffered || [
                  'Trade-in Evaluations',
                  'Pre-Approved Asset Financing',
                  'Extended Warranty Plans',
                  'Service & Maintenance Plans',
                  'Custom Vehicle Sourcing',
                  'Port Direct Clearance'
                ]).map((srv, idx) => (
                  <div key={idx} className="p-3 bg-[#F6FAF9] rounded-xl border border-[#D7E7E4] space-y-1">
                    <p className="font-extrabold text-[#176B87] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {srv}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRUST & VERIFICATION MATRIX */}
        {activeTab === 'trust' && (
          <div className="space-y-6 animate-fade-in text-xs">

            {/* Top Verification Header */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              isPrivateSeller
                ? 'bg-[#176B87] text-white border-[#12576D]'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl shadow-xs ${isPrivateSeller ? 'bg-[#176B87] text-white' : 'bg-emerald-600 text-white'}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold font-display">
                      {isPrivateSeller ? 'Private Seller Profile & Transaction Checks' : 'Dealership Profile & Transaction Checks'}
                    </h3>
                    <p className={`text-xs ${isPrivateSeller ? 'text-[#DDF4F0]' : 'text-emerald-800'}`}>
                      Review the details shown for this profile and confirm any verification or transaction status before proceeding.
                    </p>
                  </div>
                </div>

                <Badge variant={isPrivateSeller ? 'escrow' : 'success'} size="md">
                  <Lock className="w-3.5 h-3.5 text-[#5AAFA4]" />
                  {isPrivateSeller ? 'Check listing-level escrow status' : 'Review available profile status'}
                </Badge>
              </div>

              {/* Concise Escrow Notice */}
              {isPrivateSeller && (
                <div className="p-3.5 bg-[#13B8A6]/10 border border-[#91CEC5]/30 rounded-xl text-[#5AAFA4] font-medium leading-relaxed">
                  <strong className="text-white font-extrabold flex items-center gap-1 mb-0.5">
                    <Lock className="w-4 h-4 text-[#13B8A6]" /> Concise KAYAD Escrow Notice:
                  </strong>
                  Escrow applies only when the current programme and this specific listing explicitly allow it. Check the current status and deal terms before paying.
                </div>
              )}
            </div>

            {/* 5-Pillar Trust Indicators */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#176B87] uppercase tracking-wider font-display flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {isPrivateSeller ? 'Before-you-buy checks' : 'Profile and transaction checks'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#176B87]">
                    <UserCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span>1. Review seller identity</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[11px]">
                    Review the identity or verification status explicitly shown on this profile. Do not treat a listing badge as a substitute for your own checks.
                  </p>
                  <Badge variant="neutral" size="sm">Check displayed status</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#176B87]">
                    <Lock className="w-4.5 h-4.5 text-[#176B87] shrink-0" />
                    <span>2. Confirm escrow eligibility</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[11px]">
                    Use escrow only when the current programme and this listing are explicitly eligible. Review the terms for the specific deal.
                  </p>
                  <Badge variant="neutral" size="sm">Check programme status</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#176B87]">
                    <FileCheck className="w-4.5 h-4.5 text-[#176B87] shrink-0" />
                    <span>3. Independent Inspection</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[11px]">
                    Consider an independent inspection and review the provider credentials, scope and price before booking.
                  </p>
                  <Badge variant="neutral" size="sm">Review provider options</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#176B87]">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span>4. Check ownership documents</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[11px]">
                    Verify the logbook and ownership details through the applicable official process before payment.
                  </p>
                  <Badge variant="neutral" size="sm">Verify before payment</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-xs sm:col-span-2 md:col-span-2">
                  <div className="flex items-center gap-2 font-extrabold text-[#176B87]">
                    <Sparkles className="w-4.5 h-4.5 text-[#176B87] shrink-0" />
                    <span>5. Ownership transfer considerations</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[11px]">
                    Before releasing funds, review the terms and documented milestones for this specific deal. Verify the ownership-transfer process through the applicable NTSA TIMS workflow.
                  </p>
                  <Badge variant="success" size="sm">Review transfer requirements</Badge>
                </div>
              </div>
            </div>

            {/* VISUAL PURCHASE PROCESS TIMELINE */}
            <div className="bg-white p-5 rounded-2xl border border-[#D7E7E4] space-y-4">
              <h4 className="text-xs font-extrabold text-[#176B87] uppercase tracking-wider font-display flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-[#176B87]" />
                  Purchase and handover considerations
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                  Step-by-Step Security
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { step: '1', title: 'Contact Seller', desc: 'Use KAYAD messages where available and agree the next steps with the seller.', icon: <MessageSquare className="w-4 h-4 text-[#176B87]" /> },
                  { step: '2', title: 'Book Pre-Purchase Inspection', desc: 'Arrange an independent inspection and confirm the provider scope and credentials.', icon: <FileCheck className="w-4 h-4 text-emerald-600" /> },
                  { step: '3', title: 'Escrow Deposit', desc: 'Only fund escrow if the current programme and listing are eligible and the deal terms are clear.', icon: <Lock className="w-4 h-4 text-[#176B87]" /> },
                  { step: '4', title: 'Physical Inspection & Test Drive', desc: 'Arrange a safe viewing or test drive and independently check the vehicle identifiers.', icon: <Car className="w-4 h-4 text-[#176B87]" /> },
                  { step: '5', title: 'Logbook Transfer', desc: 'Complete ownership transfer through the applicable NTSA TIMS process.', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
                  { step: '6', title: 'Seller Paid', desc: 'Payout follows the authorized deal-release process and applicable settlement timing.', icon: <Sparkles className="w-4 h-4 text-[#176B87]" /> }
                ].map((s) => (
                  <div key={s.step} className="p-3.5 bg-[#F6FAF9] rounded-xl border border-[#D7E7E4] space-y-1 relative group hover:border-[#176B87] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-[#176B87] text-white font-extrabold text-xs flex items-center justify-center font-display">
                        {s.step}
                      </span>
                      {s.icon}
                    </div>
                    <p className="font-extrabold text-[#176B87] text-xs pt-1">{s.title}</p>
                    <p className="text-[11px] text-[#64748B] leading-normal">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BUYER PROTECTION HIGHLIGHTS GRID */}
            <div className="bg-[#F3FAF9]/70 border border-[#BDE5DE] p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-[#0A3340] uppercase tracking-wider font-display flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#176B87]" />
                Before-you-buy reminders
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-[#BDE5DE] space-y-1">
                  <p className="font-extrabold text-[#176B87] text-xs">Ownership checks</p>
                  <p className="text-[10px] text-[#64748B]">Verify through the applicable official process</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#BDE5DE] space-y-1">
                  <p className="font-extrabold text-[#176B87] text-xs">Inspection Marketplace</p>
                  <p className="text-[10px] text-[#64748B]">Review provider credentials and scope</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#BDE5DE] space-y-1">
                  <p className="font-extrabold text-[#176B87] text-xs">Escrow Protection</p>
                  <p className="text-[10px] text-[#64748B]">Escrow where approved</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#BDE5DE] space-y-1">
                  <p className="font-extrabold text-[#176B87] text-xs">Fraud Prevention</p>
                  <p className="text-[10px] text-[#64748B]">Review the identity status shown on the profile</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#BDE5DE] space-y-1">
                  <p className="font-extrabold text-[#176B87] text-xs">Secure Payment</p>
                  <p className="text-[10px] text-[#64748B]">Confirm payment methods with the seller</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: BUYER REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-5 animate-fade-in text-xs">
            {/* Reviews Header & Sorting */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D7E7E4]">
              <div>
                <h3 className="text-base font-extrabold text-[#176B87] font-display flex items-center gap-2">
                  <Star className="w-5 h-5 fill-[#13B8A6] text-[#13B8A6]" />
                  Buyer Reviews ({reviewsList.length})
                </h3>
                <p className="text-[#64748B] text-xs">Published rating: <strong className="text-[#176B87]">{dealer.reviewsCount > 0 ? `${dealer.rating} / 5.0` : 'not available'}</strong> from {dealer.reviewsCount} reviews</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#64748B] font-bold">Sort Reviews:</span>
                <select
                  value={reviewsSortBy}
                  onChange={(e: any) => setReviewsSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl font-bold text-[#176B87] focus:outline-none cursor-pointer"
                >
                  <option value="recent">Most Recent</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>

            {/* Reviews Cards */}
            <div className="space-y-3">
              {reviewsList.length === 0 && <p className="bg-white p-6 rounded-2xl border border-[#D7E7E4] text-center text-sm text-[#64748B]">No reviews yet.</p>}
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-white p-4 rounded-2xl border border-[#D7E7E4] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#176B87] text-[#5AAFA4] font-extrabold flex items-center justify-center text-xs font-display">
                        {rev.buyerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-[#176B87]">{rev.buyerName}</p>
                        <p className="text-[10px] text-[#94A3B8]">{rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rev.verifiedPurchase && (
                        <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Verified Purchase
                        </span>
                      )}
                      <div className="flex items-center text-[#13B8A6]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? 'fill-[#13B8A6] text-[#13B8A6]' : 'text-[#DDF4F0]'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {rev.vehicleTitle && (
                    <p className="text-[11px] text-[#0A3340] font-bold bg-[#F3FAF9] px-2.5 py-1 rounded-lg inline-block border border-[#BDE5DE]">
                      Purchased: {rev.vehicleTitle}
                    </p>
                  )}

                  <p className="text-[#12576D] leading-relaxed text-xs italic">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SHOWROOM GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <h3 className="text-base font-extrabold text-[#176B87] font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#176B87]" />
              Showroom & Yard Photo Gallery
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dealer.galleryImages || [
                'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800'
              ]).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveGalleryImage(img)}
                  className="h-48 rounded-2xl overflow-hidden border border-[#D7E7E4] shadow-sm cursor-pointer group relative"
                >
                  <LazyImage src={img} alt={`Showroom Photo ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-[#0A3340]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-1 text-xs">
                    <Eye className="w-4 h-4" /> View Fullscreen
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: LOCATION & MAP */}
        {activeTab === 'location' && (
          <div className="space-y-5 animate-fade-in text-xs">
            <div className="bg-white p-5 rounded-2xl border border-[#D7E7E4] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D7E7E4] pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#176B87] font-display flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#176B87]" />
                    Showroom Physical Address & Yard Location
                  </h3>
                  <p className="text-[#64748B] text-xs mt-1">{dealer.address || `${dealer.location} (${dealer.county})`}</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowDirectionsModal(true)}
                  className="bg-[#176B87] text-white font-bold"
                >
                  <Navigation className="w-4 h-4 text-[#5AAFA4]" /> Open map directions
                </Button>
              </div>

              {/* Styled Visual Map Card */}
              <div className="h-64 rounded-2xl bg-[#0A3340] overflow-hidden relative border border-[#D7E7E4] flex items-center justify-center">
                <LazyImage
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000"
                  alt="Map Location"
                  wrapperClassName="w-full h-full opacity-60"
                  className="w-full h-full object-cover"
                />

                <div className="absolute z-10 bg-[#176B87] text-white p-4 rounded-2xl shadow-2xl border border-[#91CEC5]/50 text-center space-y-2 max-w-xs">
                  <MapPin className="w-8 h-8 text-[#13B8A6] mx-auto animate-bounce" />
                  <p className="font-extrabold text-sm">{dealer.name}</p>
                  <p className="text-[11px] text-[#DDF4F0]">{dealer.landmark || dealer.address}</p>
                  <span className="inline-block bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    Location information
                  </span>
                </div>
              </div>

              {dealer.landmark && (
                <div className="bg-[#F3FAF9] p-3.5 rounded-xl border border-[#BDE5DE] text-[#0A3340]">
                  <p className="font-bold flex items-center gap-1.5 text-xs text-[#176B87]">
                    <Compass className="w-4 h-4 text-[#176B87]" /> Nearby Landmarks & Directions:
                  </p>
                  <p className="text-xs text-[#12576D] mt-1">{dealer.landmark}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. RELATED VERIFIED DEALERS */}
        {/* ========================================================================= */}
        {relatedDealers.length > 0 && (
          <div className="pt-6 border-t border-[#D7E7E4] space-y-3">
            <h4 className="text-xs font-extrabold text-[#176B87] uppercase tracking-wider font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Related dealership profiles
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedDealers.map((rel) => (
                <div
                  key={rel.id}
                  className="p-3 bg-white rounded-xl border border-[#D7E7E4] text-xs space-y-2 shadow-2xs hover:border-[#91CEC5] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <LazyImage src={rel.logo} alt={rel.name} wrapperClassName="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#D7E7E4]" className="w-full h-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-[#176B87] truncate">{rel.name}</p>
                      <p className="text-[10px] text-[#64748B] truncate">{rel.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#12576D] font-bold border-t border-[#D7E7E4] pt-1.5">
                    <span>★ {rel.rating} ({rel.reviewsCount})</span>
                    <span className="text-[#64748B] font-normal">{rel.activeListingsCount} Stock</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MOBILE STICKY CONTACT ACTION BAR */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#D7E7E4] p-3 z-40 flex items-center justify-between gap-2 shadow-2xl">
        {isPrivateSeller ? (
          <>
            <button
              onClick={() => {
                if (dealerVehicles.length > 0) {
                  onStartEscrow(dealerVehicles[0]);
                } else {
                  setShowContactModal(true);
                }
              }}
              className="flex-1 py-2.5 bg-[#176B87] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-[#5AAFA4]" /> Review escrow options
            </button>

            <button
              onClick={() => {
                if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                  onQuickViewVehicle(dealerVehicles[0]);
                } else {
                  setShowContactModal(true);
                }
              }}
              className="flex-1 py-2.5 bg-emerald-100 text-emerald-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-300"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" /> Inspection
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 py-2.5 bg-[#176B87] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5AAFA4]" /> Message seller
            </button>
          </>
        ) : (
          <>
            <a
              href={`tel:${dealer.phone}`}
              className="flex-1 py-2.5 bg-[#EEF7F5] text-[#176B87] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-[#D7E7E4]"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call
            </a>

            <button
              onClick={() => setShowTestDriveModal(true)}
              className="flex-1 py-2.5 bg-[#DDF4F0] text-[#176B87] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-[#BDE5DE]"
            >
              <Calendar className="w-3.5 h-3.5 text-[#176B87]" /> Test Drive
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 py-2.5 bg-[#176B87] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5AAFA4]" /> Chat
            </button>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: CONTACT OPTIONS */}
      {/* ========================================================================= */}
      {showContactModal && (
        <Modal isOpen={true} onClose={() => setShowContactModal(false)} title={`Contact ${dealer.name}`} maxWidth="md">
          <div className="space-y-4 p-2 text-xs">
            {isPrivateSeller ? (
              <>
                <div className="p-3 bg-[#F3FAF9] border border-[#BDE5DE] rounded-xl space-y-1 text-[#12576D]">
                  <div className="flex items-center gap-1.5 font-bold text-[#176B87]">
                    <Lock className="w-4 h-4 text-[#176B87] shrink-0" />
                    <span>Private Seller Privacy & Protection Policy</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-normal">
                    Use the available contact options and confirm the seller and transaction terms before proceeding. Do not send money until the payment method and deal terms are clear.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0 && onContactSeller) {
                        onContactSeller(dealerVehicles[0]);
                      } else {
                        setToastMessage('Open the existing KAYAD messaging workflow to contact the seller.');
                      }
                    }}
                    className="w-full p-3.5 bg-[#176B87] hover:bg-[#0A3340] text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-[#5AAFA4]" />
                      <div>
                        <p className="font-extrabold">Message seller through KAYAD</p>
                        <p className="text-[11px] text-[#BDE5DE]">Response times and message security depend on the available service and account settings.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5AAFA4]" />
                  </button>

                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0) {
                        onStartEscrow(dealerVehicles[0]);
                      } else {
                        setToastMessage('Escrow is arranged when you buy a listing that shows the Escrow badge.');
                      }
                    }}
                    className="w-full p-3.5 bg-[#176B87] hover:bg-[#12576d] text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-[#5AAFA4]" />
                      <div>
                        <p className="font-extrabold">Review escrow options</p>
                        <p className="text-[11px] text-[#91CEC5]">Check the current programme status and the terms for the specific eligible listing.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5AAFA4]" />
                  </button>

                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                        onQuickViewVehicle(dealerVehicles[0]);
                      }
                    }}
                    className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 rounded-xl font-bold flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-extrabold">Book an independent inspection</p>
                        <p className="text-[11px] text-emerald-800">Confirm provider status, scope and pricing before booking</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[#64748B]">Contact the sales team at {dealer.name}:</p>

                <div className="space-y-2.5">
                  <a
                    href={`tel:${dealer.phone}`}
                    className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-emerald-950 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-extrabold">Official Telephone</p>
                        <p className="text-[11px] text-emerald-800">{dealer.phone}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </a>

                  <a
                    href={`https://wa.me/${dealer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      <div>
                        <p className="font-extrabold">WhatsApp inquiry</p>
                        <p className="text-[11px] text-emerald-100">Response time depends on the seller.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </a>

                  <a
                    href={`mailto:${dealer.email}`}
                    className="p-3.5 bg-[#F6FAF9] hover:bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl font-bold text-[#176B87] flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-[#64748B]" />
                      <div>
                        <p className="font-extrabold">Official Email Inquiry</p>
                        <p className="text-[11px] text-[#64748B]">{dealer.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                  </a>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: BOOK TEST DRIVE FORM */}
      {/* ========================================================================= */}
      {showTestDriveModal && (
        <Modal isOpen={true} onClose={() => setShowTestDriveModal(false)} title={`Book Test Drive with ${dealer.name}`} maxWidth="md">
          <div className="space-y-4 p-4 text-sm text-[#12576D]">
            <p className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4 leading-relaxed">
              Test-drive scheduling is not connected to a booking service here. No request has been sent and no appointment is reserved. Contact the seller to agree availability, location and terms directly.
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={() => { setShowTestDriveModal(false); setShowContactModal(true); }} className="bg-[#176B87] text-white">
              Contact seller to arrange a test drive
            </Button>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: DIRECTIONS / MAP */}
      {/* ========================================================================= */}
      {showDirectionsModal && (
        <Modal isOpen={true} onClose={() => setShowDirectionsModal(false)} title={`Directions to ${dealer.name}`} maxWidth="md">
          <div className="space-y-4 p-2 text-xs">
            <div className="p-4 bg-[#176B87] text-white rounded-2xl space-y-2">
              <p className="font-extrabold text-sm flex items-center gap-1.5 text-[#5AAFA4]">
                <MapPin className="w-4 h-4" /> Yard Address:
              </p>
              <p className="text-[#EEF7F5] text-xs">{dealer.address || `${dealer.location} (${dealer.county})`}</p>
              {dealer.landmark && (
                <p className="text-[11px] text-[#5AAFA4] font-bold border-t border-white/20 pt-2">
                  Landmark: {dealer.landmark}
                </p>
              )}
            </div>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(dealer.address || dealer.location)}`}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 bg-emerald-600 text-white rounded-xl font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <Navigation className="w-4 h-4" /> Open in Google Maps
            </a>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 4: FULLSCREEN GALLERY LIGHTBOX */}
      {/* ========================================================================= */}
      {activeGalleryImage && (
        <div className="fixed inset-0 z-50 bg-[#0A3340]/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setActiveGalleryImage(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={activeGalleryImage} alt="Showroom Lightbox" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

    </Modal>
  );
};

export default DealerProfileModal;
