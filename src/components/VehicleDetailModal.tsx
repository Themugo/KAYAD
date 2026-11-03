import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable, getEscrowBadgeLabel, isEscrowLive } from '../utils/escrow';
import {
  CheckCircle2,
  MapPin,
  Lock,
  MessageSquare,
  Heart,
  FileCheck,
  ShieldCheck,
  Landmark,
  Calculator,
  Gauge,
  Fuel,
  Sliders,
  Sparkles,
  Phone,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Shield,
  Star,
  Award,
  Clock,
  ArrowRight,
  SearchX,
  AlertCircle,
  Gavel,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  UserCheck,
  Car,
  Wrench,
  Share2,
  ExternalLink,
  Eye,
  Calendar,
  Layers,
  ShieldAlert,
  PlayCircle,
  RotateCw,
  Compass,
  CheckSquare,
  Sparkle
} from 'lucide-react';
import { Modal, Badge, Button, Card, LazyImage } from './ui';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  notFoundId?: string | null;
  allVehicles?: Vehicle[];
  onClose: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onContactSeller: (vehicle: Vehicle) => void;
  onRequestInspection?: (vehicle: Vehicle) => void;
  onViewAuctionLot?: (vehicle: Vehicle) => void;
  onNavigateToFinancing?: (vehicle: Vehicle) => void;
  onViewShowroom?: (sellerName: string) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  /** Who is looking: shapes the navigation strip (visitor/customer, owning dealer or seller, admin/owner). */
  viewer?: { id?: string; role?: string; isStaff?: boolean } | null;
  /** Admin / owner: open this listing in Listing Management. */
  onManageListing?: (vehicle: Vehicle) => void;
  /** The listing's own dealer or seller: open the editor / their inventory. */
  onEditListing?: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  notFoundId,
  allVehicles = [],
  onClose,
  onStartEscrow,
  onContactSeller,
  onRequestInspection,
  onViewAuctionLot,
  onNavigateToFinancing,
  onViewShowroom,
  isSaved,
  onToggleSave,
  onSelectVehicle,
  viewer,
  onManageListing,
  onEditListing
}) => {
  // Related / Similar vehicles (matching make or bodyStyle)
  const relatedVehicles = useMemo(() => {
    if (!vehicle) return [];
    return allVehicles
      .filter((v) => v.id !== vehicle.id && (v.make === vehicle.make || v.bodyStyle === vehicle.bodyStyle))
      .slice(0, 3);
  }, [allVehicles, vehicle]);

  // Previous / next vehicle in the list the visitor came from.
  const siblingNav = useMemo(() => {
    if (!vehicle || allVehicles.length < 2) return null;
    const idx = allVehicles.findIndex((v) => v.id === vehicle.id);
    if (idx < 0) return null;
    return { index: idx, total: allVehicles.length, prev: idx > 0 ? allVehicles[idx - 1] : null, next: idx < allVehicles.length - 1 ? allVehicles[idx + 1] : null };
  }, [allVehicles, vehicle]);
  const isOwnListing = Boolean(vehicle && viewer?.id && vehicle.sellerId && String(vehicle.sellerId) === String(viewer.id));
  const touchStartX = useRef<number | null>(null);

  // Gallery State
  const allImages = useMemo(() => {
    if (!vehicle) return [];
    // The API delivers every photo in `images`; older shapes use additionalImages.
    const set = new Set([vehicle.image, ...(vehicle.additionalImages || []), ...(Array.isArray(vehicle.images) ? vehicle.images : [])].filter(Boolean) as string[]);
    return Array.from(set);
  }, [vehicle]);

  const [activeImage, setActiveImage] = useState<string>(vehicle?.image || '');
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [testDriveBooked, setTestDriveBooked] = useState<boolean>(false);

  // Categorized Collapsible Features State
  const [openFeatureCategories, setOpenFeatureCategories] = useState<Record<string, boolean>>({
    safety: true,
    comfort: true,
    technology: true,
    utility: false
  });

  // Expandable Spec Sections State
  const [openSpecSections, setOpenSpecSections] = useState<Record<string, boolean>>({
    powertrain: true,
    chassis: false,
    registration: false
  });

  // Financing Calculator State
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [loanTermMonths, setLoanTermMonths] = useState<number>(36);

  // Sync active image when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setActiveImage(vehicle.image);
      setTestDriveBooked(false);
      setShareSuccess(false);
    }
  }, [vehicle]);

  // Grouped Features Categorization.
  // MUST stay above the early returns below: React hooks may not be
  // called conditionally — with this useMemo after `if (!vehicle)
  // return null`, re-rendering the same mounted instance from closed
  // (vehicle=null) to open ran more hooks than the previous render and
  // crashed with React error #310 on the real click path.
  const featureGroups = useMemo(() => {
    if (!vehicle) {
      return { safety: [], comfort: [], technology: [], utility: [] } as Record<string, string[]>;
    }

    const rawFeatures = Array.isArray(vehicle.features) ? vehicle.features : [];

    const safety: string[] = [];
    const comfort: string[] = [];
    const technology: string[] = [];
    const utility: string[] = [];

    rawFeatures.forEach(feat => {
      const lower = feat.toLowerCase();
      if (lower.includes('eyesight') || lower.includes('lane') || lower.includes('abs') || lower.includes('airbag') || lower.includes('safety') || lower.includes('brake') || lower.includes('blind')) {
        safety.push(feat);
      } else if (lower.includes('heat') || lower.includes('climate') || lower.includes('leather') || lower.includes('seat') || lower.includes('sunroof') || lower.includes('keyless')) {
        comfort.push(feat);
      } else if (lower.includes('play') || lower.includes('bluetooth') || lower.includes('audio') || lower.includes('camera') || lower.includes('nav') || lower.includes('screen') || lower.includes('tech')) {
        technology.push(feat);
      } else {
        utility.push(feat);
      }
    });

    // Only what the seller actually entered. No invented fallback equipment.
    return { safety, comfort, technology, utility };
  }, [vehicle]);

  if (!vehicle && !notFoundId) return null;

  // 404 Vehicle Not Found State
  if (!vehicle && notFoundId) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Listing Unavailable" maxWidth="2xl">
        <div className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
            <SearchX className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="danger" size="md">
              <AlertCircle className="w-3.5 h-3.5" /> 404 Listing Not Found
            </Badge>
            <h3 className="text-2xl font-black text-[#176B87] font-display">
              Vehicle #{notFoundId} Not Available
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              This vehicle may have been sold, unlisted, or completed through the KAYAD Escrow Vault.
            </p>
          </div>

          <div className="bg-[#F6FAF9] p-4 rounded-xl border border-[#D7E7E4] text-left text-xs text-[#12576D] space-y-2 max-w-md mx-auto">
            <p className="font-bold text-[#176B87]">Recommended Next Steps:</p>
            <ul className="list-disc list-inside space-y-1 text-[#64748B]">
              <li>Explore verified inventory in the active marketplace</li>
              <li>Filter by make, model, county, or budget</li>
              <li>Contact support if you hold an active escrow deposit for this listing</li>
            </ul>
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="primary" size="md" onClick={onClose}>
              <Sparkles className="w-4 h-4 text-[#13B8A6]" />
              <span>Return to Marketplace</span>
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!vehicle) return null;

  // Key Calculations
  const price = vehicle.price;
  const depositAmount = (price * depositPercent) / 100;
  const loanPrincipal = Math.max(0, price - depositAmount);
  const annualInterestRate = 0.13; // 13% p.a. asset financing estimate
  const monthlyInterestRate = annualInterestRate / 12;
  const monthlyPayment = loanPrincipal > 0
    ? (loanPrincipal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) / (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1)
    : 0;

  const isPrivateSeller = vehicle.sellerType === 'Private Seller';
  const isAuction = Boolean(vehicle.isAuction);
  const isEscrowActive = isEscrowApplicable(vehicle);
  const isInspectionActive = Boolean(vehicle.inspectionPassed);
  const isFinanceActive = Boolean(vehicle.financeAvailable);

  // Fixed (Final Integration Phase 3): displayPrice previously looked
  // up the live auction session by vehicle ID for the
  // live current bid. vehicle.currentBid is already the real, current
  // value - mapped directly from the real backend by
  // mapBackendCarToVehicle (this project's own earlier Phase 3
  // hardening work already wired vehicles to fetch real data) - the
  // mock lookup was both wrong (a real vehicle's ID would never match
  // a mock session's ID) and unnecessary.
  const displayPrice = isAuction ? (vehicle.currentBid ?? vehicle.price) : vehicle.price;

  // Market Deal Analysis
  const getMarketDiff = () => {
    if (!vehicle.marketPriceAvg) return null;
    const diff = vehicle.marketPriceAvg - vehicle.price;
    return {
      amount: Math.abs(diff),
      isBelow: diff > 0,
      percentage: Math.round((Math.abs(diff) / vehicle.marketPriceAvg) * 100)
    };
  };
  const marketDiff = getMarketDiff();

  // Status Chip Generation
  const getStatusChip = () => {
    if (isAuction) return { label: vehicle.auctionEndsAt ? 'Auction Listing' : 'Auction', variant: 'live' as const };
    const rawStatus = String((vehicle as { status?: string }).status || '');
    if (rawStatus === 'sold') return { label: 'Sold', variant: 'neutral' as const };
    if (rawStatus === 'reserved') return { label: 'Reserved', variant: 'neutral' as const };
    if (isPrivateSeller) return { label: 'Private sale', variant: 'neutral' as const };
    return { label: 'Available', variant: 'verified' as const };
  };
  const statusChip = getStatusChip();

  // Share handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  const toggleFeatureCategory = (key: string) => {
    setOpenFeatureCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSpecSection = (key: string) => {
    setOpenSpecSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Header Title Component
  const modalTitle = (
    <div className="flex items-center justify-between gap-2 w-full pr-8 min-w-0">
      <div className="flex items-center gap-x-2 flex-wrap min-w-0">
        <span className="text-[#176B87] font-black text-lg font-display tracking-tight">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
        <span className="text-[#94A3B8] font-medium text-xs" title={`Reference ${vehicle.id}`}>Ref {String(vehicle.id).slice(0, 8)}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleShare}
          className="shrink-0 grid place-items-center w-10 h-10 rounded-full border border-[#D7E7E4] text-[#64748B] hover:text-[#0A3340] hover:bg-[#EEF7F5] transition-colors cursor-pointer"
          title="Share Listing"
        >
          {shareSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onToggleSave(vehicle.id)}
          className={`shrink-0 grid place-items-center w-10 h-10 rounded-full border transition-all cursor-pointer ${
            isSaved ? 'bg-rose-50 text-rose-600 border-rose-200' : 'text-[#64748B] border-[#D7E7E4] hover:bg-[#EEF7F5]'
          }`}
          title={isSaved ? 'Saved in Watchlist' : 'Save to Watchlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={!!vehicle} onClose={onClose} title={modalTitle} maxWidth="5xl">
        <div className="space-y-8 sm:space-y-10 pb-28 lg:pb-8 relative bg-white">

          {/* ==========================================
              0. NAVIGATION STRIP (everyone) + ROLE TOOLS (owner dealer / admin / owner)
              ========================================== */}
          <nav aria-label="Vehicle navigation" className="flex flex-wrap items-center justify-between gap-2" data-testid="vehicle-nav">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-[#D7E7E4] text-xs font-bold text-[#12576D] hover:bg-[#EEF7F5]">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to results
            </button>
            {siblingNav && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
                <button type="button" disabled={!siblingNav.prev} onClick={() => siblingNav.prev && onSelectVehicle?.(siblingNav.prev)} aria-label="Previous vehicle" className="grid place-items-center w-10 h-10 rounded-xl border border-[#D7E7E4] text-[#12576D] disabled:opacity-35 hover:bg-[#EEF7F5]"><ChevronLeft className="w-4 h-4" /></button>
                <span aria-live="polite">{siblingNav.index + 1} of {siblingNav.total}</span>
                <button type="button" disabled={!siblingNav.next} onClick={() => siblingNav.next && onSelectVehicle?.(siblingNav.next)} aria-label="Next vehicle" className="grid place-items-center w-10 h-10 rounded-xl border border-[#D7E7E4] text-[#12576D] disabled:opacity-35 hover:bg-[#EEF7F5]"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </nav>
          {(viewer?.isStaff && onManageListing) || (isOwnListing && onEditListing) ? (
            <div role="region" aria-label="Listing tools" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#BDE5DE] bg-[#F3FAF9] px-4 py-3" data-testid="role-tools">
              <p className="text-xs font-bold text-[#12576D]">{viewer?.isStaff ? 'Administrator view' : 'This is your listing'}{vehicle.status ? ` · ${String(vehicle.status).replace(/_/g, ' ')}` : ''}</p>
              <div className="flex gap-2">
                {viewer?.isStaff && onManageListing && <Button variant="secondary" size="sm" onClick={() => onManageListing(vehicle)}>Manage in Listing Management</Button>}
                {isOwnListing && onEditListing && <Button variant="secondary" size="sm" onClick={() => onEditListing(vehicle)}>Edit listing</Button>}
              </div>
            </div>
          ) : null}

          {/* ==========================================
              1. HERO AREA (Near-Full First Screen Showroom)
              ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Gallery Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Primary Large Image Viewer */}
              <div
                onClick={() => setIsLightboxOpen(true)}
                onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
                onTouchEnd={(e) => {
                  const start = touchStartX.current; touchStartX.current = null;
                  const end = e.changedTouches[0]?.clientX;
                  if (start == null || end == null || allImages.length < 2 || Math.abs(end - start) < 45) return;
                  const i = allImages.indexOf(activeImage);
                  setActiveImage(allImages[(i + (end < start ? 1 : -1) + allImages.length) % allImages.length]);
                }}
                className="h-72 sm:h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0A3340] border border-[#D7E7E4] relative group shadow-lg cursor-zoom-in"
              >
                <LazyImage
                  src={activeImage}
                  alt={vehicle.title}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Overlays: Condition & Interactive Media Chips */}
                <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap z-10">
                  {vehicle.condition ? (
                  <Badge variant="verified" size="sm" className="shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#13B8A6]" />
                    {vehicle.condition}
                  </Badge>
                  ) : null}

                </div>

                {/* Floating Location Overlay */}
                <div className="absolute bottom-4 left-4 bg-[#176B87]/90 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-md shadow-md z-10">
                  <MapPin className="w-3.5 h-3.5 text-[#13B8A6] shrink-0" />
                  <span>{[vehicle.location, vehicle.county].filter(Boolean).join(', ')}</span>
                </div>

                {/* Counter & Fullscreen Controls */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                  <span className="bg-[#0A3340]/75 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                    📷 {allImages.indexOf(activeImage) + 1} / {allImages.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="p-2 bg-[#0A3340]/75 hover:bg-[#0A3340] text-white rounded-xl backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Touch Previous / Next Controls */}
                {allImages.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIdx = allImages.indexOf(activeImage);
                        const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
                        setActiveImage(allImages[prevIdx]);
                      }}
                      className="pointer-events-auto w-10 h-10 rounded-full bg-[#0A3340]/60 hover:bg-[#0A3340]/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIdx = allImages.indexOf(activeImage);
                        const nextIdx = (currentIdx + 1) % allImages.length;
                        setActiveImage(allImages[nextIdx]);
                      }}
                      className="pointer-events-auto w-10 h-10 rounded-full bg-[#0A3340]/60 hover:bg-[#0A3340]/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Smooth Thumbnail Carousel */}
              {allImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`h-20 w-28 shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImage === img ? 'border-[#176B87] ring-2 ring-[#176B87]/20 scale-95 shadow-xs' : 'border-[#D7E7E4] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <LazyImage src={img} alt={`Thumb ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: Title, Price Block, Dealer Preview & Primary Actions (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:sticky lg:top-2">

              <div className="space-y-4">

                {/* Vehicle Title & Condition */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={statusChip.variant} size="sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {statusChip.label}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#176B87] font-display tracking-tight leading-snug">
                    {vehicle.title}
                  </h1>
                </div>

                {/* ==========================================
                    2. PREMIUM PRICE PANEL
                    ========================================== */}
                <Card className="p-5 bg-gradient-to-br from-[#F6FAF9] via-[#F3FAF9]/30 to-[#F6FAF9] border-[#BDE5DE]/80 shadow-xs space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
                        {isAuction ? 'Current Highest Bid' : 'Listed Price'}
                      </p>
                      <span className="text-3xl font-black text-[#176B87] font-display tracking-tight">
                        Ksh {displayPrice.toLocaleString()}
                      </span>
                    </div>

                    {marketDiff && (
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${
                        marketDiff.isBelow
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#EEF7F5] text-[#12576D] border-[#D7E7E4]'
                      }`}>
                        {marketDiff.isBelow ? `Ksh ${marketDiff.amount.toLocaleString()} Below Market` : 'Fair Market Price'}
                      </span>
                    )}
                  </div>

                  {/* Monthly Finance Estimate Indicator */}
                  {isFinanceActive && (
                    <div className="pt-3 border-t border-[#D7E7E4]/80 flex items-center justify-between text-xs">
                      <span className="text-[#64748B] font-bold flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-[#176B87]" /> Estimated Monthly Finance:
                      </span>
                      <span className="font-black text-[#176B87] text-sm font-display">
                        Ksh {Math.round(monthlyPayment).toLocaleString()} / mo
                      </span>
                    </div>
                  )}
                </Card>

                {/* ==========================================
                    3. SELLER SUMMARY CARD
                    ========================================== */}
                <div className="p-4 bg-white rounded-2xl border border-[#D7E7E4] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#176B87] text-[#13B8A6] font-black flex items-center justify-center font-display text-base shadow-xs">
                        {vehicle.sellerName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-[#176B87] text-sm font-display">{vehicle.sellerName}</h4>
                          <ShieldCheck className="w-4 h-4 text-[#176B87]" />
                        </div>
                        <p className="text-[11px] text-[#64748B] font-medium">
                          {vehicle.sellerRating ? `★ ${vehicle.sellerRating} Rating • ` : ''}{vehicle.sellerType || 'Seller'}{vehicle.responseTime ? ` • Response: ${vehicle.responseTime}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dealer Primary & Secondary CTAs */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#D7E7E4]">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => (onViewShowroom ? onViewShowroom(vehicle.sellerName) : onContactSeller(vehicle))}
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#13B8A6]" />
                      <span>View Showroom</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onContactSeller(vehicle)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#176B87]" />
                      <span>Contact Dealer</span>
                    </Button>
                  </div>
                </div>

              </div>

              {/* PRIMARY PURCHASE ACTIONS */}
              <div className="space-y-2.5">
                {isAuction ? (
                  <Button
                    variant="accent"
                    size="lg"
                    fullWidth
                    onClick={() => (onViewAuctionLot ? onViewAuctionLot(vehicle) : onContactSeller(vehicle))}
                    className="shadow-md font-black text-sm"
                  >
                    <Gavel className="w-5 h-5 text-[#0A3340]" />
                    <span>Place Bid / Submit Auction Offer</span>
                  </Button>
                ) : isPrivateSeller || isEscrowActive ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => onStartEscrow(vehicle)}
                    className="shadow-md font-black text-sm"
                  >
                    <Lock className="w-5 h-5 text-[#13B8A6]" />
                    <span>{isEscrowLive() ? 'Start Secure Escrow Purchase' : 'Review Escrow Workflow'}</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => (onRequestInspection ? onRequestInspection(vehicle) : onContactSeller(vehicle))}
                    className="shadow-md font-black text-sm"
                  >
                    <MessageSquare className="w-5 h-5 text-white" />
                    <span>Request an Inspection</span>
                  </Button>
                )}
                {/* The primary action above is the inspection itself only in the fallback case. Every other
                    vehicle still needs a way to reach the pre-purchase inspection. */}
                {onRequestInspection && (isAuction || isPrivateSeller || isEscrowActive) && (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => onRequestInspection(vehicle)}
                    className="font-bold text-sm"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#176B87]" />
                    <span>Request an Inspection</span>
                  </Button>
                )}
              </div>

            </div>
          </div>

          {/* ==========================================
              4. VEHICLE HIGHLIGHTS (Elegant Specification Chips)
              ========================================== */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold text-[#176B87] uppercase tracking-wider font-display">
              Vehicle Highlights
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              {[
                { label: 'Year', val: vehicle.year, icon: <Calendar className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Mileage', val: Number.isFinite(Number(vehicle.mileage)) && Number(vehicle.mileage) > 0 ? `${Number(vehicle.mileage).toLocaleString()} km` : '', icon: <Gauge className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Fuel', val: vehicle.fuelType, icon: <Fuel className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Trans', val: (vehicle.transmission || '').replace('Automatic', 'Auto'), icon: <Sliders className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Drive', val: vehicle.driveType, icon: <Car className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Engine', val: vehicle.engineSize, icon: <Zap className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Condition', val: vehicle.condition, icon: <Award className="w-4 h-4 text-[#176B87]" /> },
                { label: 'Verification', val: vehicle.verified ? 'Verified' : 'Pending', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> }
              ].filter((chip) => chip.val !== undefined && chip.val !== null && String(chip.val).trim() !== '').map((chip, idx) => (
                <div key={idx} className="p-3.5 bg-[#F6FAF9] hover:bg-[#EEF7F5]/80 rounded-2xl border border-[#D7E7E4]/80 text-center space-y-1 transition-colors">
                  <div className="flex justify-center">{chip.icon}</div>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">{chip.label}</p>
                  <p className="font-black text-[#0A3340] text-xs truncate">{chip.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ==========================================
              5. BUYER ASSURANCE (KAYAD Transaction Safeguards)
              ========================================== */}
          <div className="p-6 bg-gradient-to-r from-[#0A3340] via-[#176B87] to-[#0A3340] text-white rounded-3xl shadow-md space-y-4 border border-[#91CEC5]/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-black text-[#13B8A6] uppercase tracking-wider font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#13B8A6]" /> KAYAD Transaction Safeguards
              </span>
              <span className="text-xs text-[#BDE5DE] font-semibold">Only recorded safeguards are shown</span>
            </div>

            {/* Exactly 6 Concise Trust Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { enabled: Boolean(vehicle.verified), title: '✓ Listing Verified', desc: 'KAYAD verification is recorded' },
                { enabled: Boolean(vehicle.isDealerCertified), title: '✓ Dealer Certified', desc: 'Seller has a dealer certification record' },
                { enabled: Boolean(vehicle.inspectionPassed || vehicle.inspection), title: '✓ Inspection Report', desc: 'Inspection data is available' },
                { enabled: Boolean(vehicle.financeAvailable), title: '✓ Finance Available', desc: 'Financing is offered for this listing' },
                { enabled: Boolean(vehicle.escrowEligible || isEscrowActive), title: `✓ ${getEscrowBadgeLabel(vehicle)}`, desc: 'Escrow workflow is available for this listing' },
                ...(vehicle.vin ? [{ enabled: true, title: '✓ Vehicle Identity', desc: 'VIN is recorded on the listing' }] : []) // Phase 13K: the public API no longer carries the VIN, so the badge is shown only when the VIN is actually available (owner/staff)
              ].filter((item) => item.enabled).map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl backdrop-blur-md border space-y-0.5 bg-white/10 border-white/15">
                  <p className="font-extrabold text-white text-xs">{item.title}</p>
                  <p className="text-[10px] text-[#BDE5DE] font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ==========================================
              6. VEHICLE STORY (Cards instead of raw paragraphs)
              ========================================== */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#176B87] uppercase tracking-wider font-display flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#176B87]" />
              The Vehicle Story & Detailed Assessment
            </h3>

            <div className="grid grid-cols-1 gap-4 text-xs">
              {vehicle.description && vehicle.description.trim() ? (
                <Card className="p-5 space-y-2 bg-white border-[#D7E7E4]">
                  <div className="flex items-center gap-2 text-[#176B87] font-black text-sm font-display">
                    <Car className="w-4 h-4 text-[#176B87]" />
                    <span>Seller's Description</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-xs whitespace-pre-line">{vehicle.description}</p>
                </Card>
              ) : (
                <p className="text-xs text-[#64748B]" data-testid="no-description">The seller has not added a description yet. Ask the seller for details or arrange an inspection.</p>
              )}
            </div>
          </div>

          {/* ==========================================
              7. CATEGORIZED FEATURE GROUPS (Collapsible)
              ========================================== */}
          {(featureGroups.safety.length + featureGroups.comfort.length + featureGroups.technology.length + featureGroups.utility.length) > 0 && (
          <div className="space-y-4" data-testid="vehicle-features">
            <h3 className="text-sm font-black text-[#176B87] uppercase tracking-wider font-display">
              Features & Equipment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

              {/* Safety Category */}
              {featureGroups.safety.length > 0 && (
              <div className="border border-[#D7E7E4] rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('safety')}
                  className="w-full p-4 bg-[#F6FAF9] flex items-center justify-between font-black text-xs text-[#176B87] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600" /> Safety Systems ({featureGroups.safety.length})
                  </span>
                  {openFeatureCategories.safety ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.safety && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#D7E7E4]">
                    {featureGroups.safety.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-[#12576D]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Comfort Category */}
              {featureGroups.comfort.length > 0 && (
              <div className="border border-[#D7E7E4] rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('comfort')}
                  className="w-full p-4 bg-[#F6FAF9] flex items-center justify-between font-black text-xs text-[#176B87] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#176B87]" /> Comfort & Interior ({featureGroups.comfort.length})
                  </span>
                  {openFeatureCategories.comfort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.comfort && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#D7E7E4]">
                    {featureGroups.comfort.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-[#12576D]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Technology Category */}
              {featureGroups.technology.length > 0 && (
              <div className="border border-[#D7E7E4] rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('technology')}
                  className="w-full p-4 bg-[#F6FAF9] flex items-center justify-between font-black text-xs text-[#176B87] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#176B87]" /> Technology & Infotainment ({featureGroups.technology.length})
                  </span>
                  {openFeatureCategories.technology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.technology && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#D7E7E4]">
                    {featureGroups.technology.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-[#12576D]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Utility Category */}
              {featureGroups.utility.length > 0 && (
              <div className="border border-[#D7E7E4] rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('utility')}
                  className="w-full p-4 bg-[#F6FAF9] flex items-center justify-between font-black text-xs text-[#176B87] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" /> Utility & Exterior ({featureGroups.utility.length})
                  </span>
                  {openFeatureCategories.utility ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.utility && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#D7E7E4]">
                    {featureGroups.utility.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-[#12576D]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

            </div>
          </div>
          )}

          {/* ==========================================
              8. PRE-PURCHASE INSPECTION
              Previously a hard-coded fixed-depth "PASSED & CERTIFIED" certificate (compression pass, accident-free
              structure, zero encumbrances) was rendered for EVERY vehicle. That was an invented report. This panel states
              only what is known: whether the listing carries an inspection-passed flag, and how to get an independent one.
              ========================================== */}
          <section aria-labelledby="vd-inspection-title" className="bg-[#F6FAF9] border border-[#D7E7E4] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#176B87] text-white rounded-2xl shadow-xs"><FileCheck className="w-6 h-6" aria-hidden="true" /></div>
              <div>
                <h3 id="vd-inspection-title" className="font-extrabold text-[#12576d] text-base font-display">Pre-purchase inspection</h3>
                <p className="text-xs text-[#64748B]">Carried out by an independent, verified inspection provider, not by KAYAD.</p>
              </div>
            </div>
            <p className="text-sm text-[#12576D]">
              {vehicle.inspectionPassed
                ? 'This listing is marked as having passed an inspection. Findings are only shown in the report of the customer who requested it, so you should still arrange your own inspection before you commit.'
                : 'No inspection report is attached to this listing. Ask an independent provider to inspect the vehicle before you commit.'}
            </p>
            {onRequestInspection && (
              <Button variant="secondary" size="md" onClick={() => onRequestInspection(vehicle)} className="font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#176B87]" aria-hidden="true" />
                <span>Arrange an inspection of this vehicle</span>
              </Button>
            )}
          </section>

          {/* ==========================================
              9. ASSET FINANCING ESTIMATOR MODULE
              ========================================== */}
          <div className="bg-[#F3FAF9]/60 border border-[#D7E7E4] rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#D7E7E4] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#176B87] text-white rounded-2xl shadow-xs">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0A3340] text-base font-display">Financing Marketplace Estimator</h3>
                  <p className="text-xs text-[#0E4655]">Compare pre-approval offers from multiple lenders</p>
                </div>
              </div>
              <Badge variant="success" size="md">
                Estimate only
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-[#D7E7E4] shadow-xs">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-[#12576D]">
                    <span>Down Payment Deposit</span>
                    <span className="text-[#0A3340] font-extrabold">{depositPercent}% (Ksh {depositAmount.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    className="w-full accent-[#13B8A6] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-[#12576D]">
                    <span>Loan Repayment Period</span>
                    <span className="text-[#0A3340] font-extrabold">{loanTermMonths} Months ({(loanTermMonths / 12).toFixed(1)} Yrs)</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    step={6}
                    value={loanTermMonths}
                    onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                    className="w-full accent-[#13B8A6] cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#176B87] to-[#0A3340] text-white p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-[#13B8A6] font-extrabold uppercase tracking-wider">Estimated Monthly Payment</p>
                  <p className="text-3xl font-black text-white font-display mt-1">
                    Ksh {Math.round(monthlyPayment).toLocaleString()} <span className="text-xs font-normal text-[#BDE5DE]">/ mo</span>
                  </p>
                  <p className="text-[11px] text-[#BDE5DE] mt-2">
                    Financed Principal: Ksh {loanPrincipal.toLocaleString()}
                  </p>
                </div>

                <Button
                  variant="accent"
                  size="md"
                  onClick={() => (onNavigateToFinancing ? onNavigateToFinancing(vehicle) : onContactSeller(vehicle))}
                  fullWidth
                >
                  <span>Compare Bank Rates for this Vehicle</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ==========================================
              10. TECHNICAL SPECIFICATIONS (Moved Further Down)
              ========================================== */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-[#176B87] uppercase tracking-wider font-display">
              Technical Specifications & Chassis Data
            </h3>

            <div className="border border-[#D7E7E4] rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                onClick={() => toggleSpecSection('powertrain')}
                className="w-full p-4 bg-[#F6FAF9] flex items-center justify-between font-black text-xs text-[#176B87] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#176B87]" /> Powertrain & Engine Specifications
                </span>
                {openSpecSections.powertrain ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openSpecSections.powertrain && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-[#D7E7E4]">
                  <div>
                    <p className="text-[#94A3B8] font-bold uppercase text-[10px]">Engine Capacity</p>
                    <p className="font-extrabold text-[#0A3340] mt-0.5">{vehicle.engineSize || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] font-bold uppercase text-[10px]">Transmission</p>
                    <p className="font-extrabold text-[#0A3340] mt-0.5">{vehicle.transmission}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] font-bold uppercase text-[10px]">Drive System</p>
                    <p className="font-extrabold text-[#0A3340] mt-0.5">{vehicle.driveType || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] font-bold uppercase text-[10px]">Fuel Type</p>
                    <p className="font-extrabold text-[#0A3340] mt-0.5">{vehicle.fuelType}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==========================================
              11. SIMILAR VEHICLES SHOWROOM
              ========================================== */}
          {relatedVehicles.length > 0 && (
            <div className="pt-6 border-t border-[#D7E7E4] space-y-4">
              <h4 className="text-sm font-black text-[#176B87] uppercase tracking-wider font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#176B87]" />
                Similar Verified Showroom Vehicles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedVehicles.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectVehicle ? onSelectVehicle(rel) : null}
                    className="p-3.5 bg-[#F6FAF9] hover:bg-[#F3FAF9]/80 transition-all cursor-pointer rounded-2xl border border-[#D7E7E4] text-xs flex gap-3.5 items-center group shadow-xs"
                  >
                    <LazyImage src={rel.image} alt={rel.title} wrapperClassName="w-20 h-16 rounded-xl shrink-0 overflow-hidden" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-extrabold text-[#176B87] truncate group-hover:text-[#0A3340]">{rel.title}</p>
                      <p className="text-xs font-black text-[#0A3340]">Ksh {rel.price.toLocaleString()}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">{rel.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phone-only sticky action bar: price + the primary action stay reachable while scrolling. */}
          <div className="lg:hidden sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-[#D7E7E4] flex items-center gap-3 z-20" data-testid="mobile-action-bar">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{isAuction ? 'Current bid' : 'Price'}</p>
              <p className="text-lg font-black text-[#176B87] font-display leading-tight truncate">Ksh {displayPrice.toLocaleString()}</p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="ml-auto font-black text-sm shrink-0"
              onClick={() => (
                isAuction ? (onViewAuctionLot ? onViewAuctionLot(vehicle) : onContactSeller(vehicle))
                : isPrivateSeller || isEscrowActive ? onStartEscrow(vehicle)
                : onContactSeller(vehicle)
              )}
            >
              {isAuction ? <Gavel className="w-4 h-4" /> : isPrivateSeller || isEscrowActive ? <Lock className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              <span>{isAuction ? 'Place bid' : isPrivateSeller || isEscrowActive ? 'Buy securely' : 'Contact seller'}</span>
            </Button>
          </div>

        </div>
      </Modal>

      {/* ==========================================
          MOBILE STICKY BOTTOM PURCHASE BAR
          ========================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D7E7E4] p-3 lg:hidden shadow-lg flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">{isAuction ? 'Current Highest Bid' : 'Listed Price'}</p>
          <p className="text-base font-black text-[#176B87] font-display">
            Ksh {displayPrice.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onContactSeller(vehicle)}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#176B87]" />
            <span>Chat</span>
          </Button>

          {isEscrowActive ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartEscrow(vehicle)}
            >
              <Lock className="w-3.5 h-3.5 text-[#13B8A6]" />
              <span>{isEscrowLive() ? 'Start Escrow' : 'Review Escrow'}</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onContactSeller(vehicle)}
            >
              <span>Contact Dealer</span>
            </Button>
          )}
        </div>
      </div>

      {/* ==========================================
          FULLSCREEN LIGHTBOX MODAL
          ========================================== */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A3340]/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex justify-between items-center text-white px-2 pt-2">
            <span className="font-bold text-xs">
              {vehicle.title} (Photo {allImages.indexOf(activeImage) + 1} of {allImages.length})
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 text-white hover:text-[#13B8A6] rounded-full transition-colors cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-4">
            <LazyImage
              src={activeImage}
              alt={vehicle.title}
              wrapperClassName="max-h-full max-w-full"
              className="max-h-[80vh] max-w-full object-contain rounded-xl"
            />

            {allImages.length > 1 && (
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(activeImage);
                    const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
                    setActiveImage(allImages[prevIdx]);
                  }}
                  className="pointer-events-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(activeImage);
                    const nextIdx = (currentIdx + 1) % allImages.length;
                    setActiveImage(allImages[nextIdx]);
                  }}
                  className="pointer-events-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto justify-center pb-2">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImage === img ? 'border-[#91CEC5] scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <LazyImage src={img} alt={`Thumb ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleDetailModal;
