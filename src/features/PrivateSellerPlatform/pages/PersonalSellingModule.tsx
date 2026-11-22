// ============================================================
// KAYAD PERSONAL SELLING MODULE
// Listing creation and management rendered inside the canonical DashboardHub
// ============================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { countByLifecycle, getListingLifecycle, type ListingLifecycleState } from '../../../utils/listingLifecycle';
import { ListingStatusBadge, ListingThumb, ListingFacts, ListingScoreRing } from '../../../components/listing/ListingPresentation';
import { createCar, updateCar, deleteCar, addCarImages, reorderCarImages, deleteCarImage, setCoverImage, LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES, LISTING_IMAGE_MAX_PER_REQUEST, transitionMyListing, VehicleApiError, BackendCar } from '../../../services/vehicleApi';
import { calculateListingCompleteness, getListingCompletenessFactors } from '../../../utils/listingQualityScore';
import PhoneVerification from '../../../components/PhoneVerification';
import { AuctionVerificationSection } from '../components/AuctionVerificationSection';
import type { UserProfile } from '../../../types';
import {
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight,
  User, LogOut, Moon, Sun, Globe, Shield, BellRing, Search, Plus, Minus,
  Car, Camera, Image, Gauge, Wrench, Calendar, MapPin, Star, Trophy,
  CheckCircle, AlertCircle, XCircle, Clock3, Package, Truck, Key, ShieldCheck,
  Check, Circle, ArrowRight, ArrowLeft, PlusCircle, MinusCircle,
  File, FileCheck, Upload, Download, Eye, Trash2, Share2, Copy, FileUp,
  CreditCard, Building, Receipt, PiggyBank, Percent, Banknote, TrendingDown,
  BarChart3, Sparkles, ArrowUpRight, RefreshCw, DollarSign as DollarSignIcon,
  MessageCircle, Mail, Phone, Bell as BellIcon, CalendarCheck, Users,
  BadgeCheck, BadgeDollarSign, ShieldAlert, ShieldCheck as ShieldCheckVerified,
  Fingerprint, IdCard, MailCheck,
  PlusCircle as PlusCircleIcon, Settings2, ExternalLink, Filter, SortAsc, Grid, List,
  ClipboardList, ListChecks, ListOrdered, CheckSquare, Square,
  Eye as EyeIcon, Heart as HeartIcon, MessageSquare as MessageSquareIcon, Timer, TrendingUp as TrendingUpIcon,
  Lightbulb, Target, Zap,
  HelpCircle, BookOpen, AlertTriangle, Info, ExternalLink as ExternalLinkIcon,
  Phone as PhoneIcon, Mail as MailIcon,
  Calendar as CalendarIcon, MapPin as MapPinIcon, Clock as ClockIcon,
  UserCheck, CheckCircle2,
} from 'lucide-react';
import { usePrivateSellerCapability } from '../../../hooks/usePrivateSellerCapability';
import SellerCapabilityPanel from '../../../components/SellerCapabilityPanel';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  color: string;
  condition: 'excellent' | 'good' | 'fair';
  description: string;
  images: string[];
  status: 'draft' | 'active' | 'pending' | 'sold' | 'withdrawn';
  views: number;
  favorites: number;
  enquiries: number;
  createdAt: string;
  verified: boolean;
  inspected: boolean;
  listedForInspection: boolean;
  escrowEnabled: boolean;
}

interface Enquiry {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  vehicleId: string;
  vehicleTitle: string;
  type: 'message' | 'viewing_request' | 'inspection_request' | 'finance_interest' | 'escrow_request' | 'offer';
  subject: string;
  message: string;
  budget?: number;
  preferredDate?: string;
  status: 'new' | 'replied' | 'converted' | 'closed';
  date: string;
}

interface ViewingAppointment {
  id: string;
  buyerName: string;
  vehicleId: string;
  vehicleTitle: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  notes?: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
}


interface SellerStats {
  totalListings: number;
  activeListings: number;
  draftListings: number;
  soldVehicles: number;
  totalViews: number;
  totalEnquiries: number;
  avgResponseTime: number;
  trustScore: number;
}

interface VerificationStatus {
  nationalId: { verified: boolean; date?: string };
  phone: { verified: boolean; date?: string };
  email: { verified: boolean; date?: string };
  tims: { verified: boolean; date?: string };
  ghostCheck: { completed: boolean; date?: string; grade?: string };
  profileComplete: number;
}

interface ListingDraft {
  step: number;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    registration: string;
    vin: string;
    bodyType: string;
  };
  photos: File[];
  details: {
    mileage: number;
    fuelType: string;
    transmission: string;
    color: string;
    condition: string;
    description: string;
    city: string;
  };
  ownership: {
    ownerName: string;
    ownerId: string;
    purchaseDate: string;
    logbookAvailable: boolean;
    ownerConfirmed: boolean;
  };
  condition: {
    exterior: string;
    interior: string;
    engine: string;
    tyres: string;
    knownIssues: string;
    serviceHistory: string;
  };
  pricing: {
    askingPrice: number;
    negotiable: boolean;
    tradeIn: boolean;
  };
  delivery: {
    canDeliver: boolean;
    deliveryRadius: number;
  };
}

// ============================================================
// ============================================================
// THEME CONSTANTS
// ============================================================

const KAYAD_THEME = {
  navy: '#0A3340',
  navyLight: '#12576D',
  gold: '#176B87',
  goldLight: '#DDF4F0',
  emerald: '#13B8A6',
  amber: '#176b87',
  red: '#EF4444',
  orange: '#176b87',
  slate: {
    50: '#f6faf9',
    100: '#f6faf9',
    200: '#d7e7e4',
    300: '#d7e7e4',
    400: '#94a3b8',
    500: '#64748b',
    600: '#64748b',
    700: '#12576d',
    800: '#1e293b',
    900: '#0a3340',
  },
  warmBeige: '#F6FAF9',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

type PlatformSection =
  | 'listing-wizard'
  | 'auction-verification'
  | 'trust-center'
  | 'listing-quality'
  | 'help';

interface PersonalSellingModuleProps {
  user?: UserProfile | null;
  initialSection?: PlatformSection;
  isEmailVerified?: boolean;
  listings: BackendCar[];
  listingsLoading: boolean;
  listingsError?: string;
  onRefreshListings: () => void;
  onNavigate?: (nav: string) => void;
}

export default function PersonalSellingModule({ user, onNavigate, initialSection = 'listing-quality', isEmailVerified = false, listings, listingsLoading, listingsError, onRefreshListings }: PersonalSellingModuleProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>(initialSection);
  useEffect(() => { setActiveSection(initialSection); }, [initialSection]);
  // Phase 13E: seller eligibility comes from the real capability state of the SAME personal account.
  const normalizedRole = String(user?.role || '').toLowerCase();
  const personalRole = ['user', 'buyer', 'individual_seller'].includes(normalizedRole);
  const sellerCapabilityRole = ['user', 'individual_seller'].includes(normalizedRole);
  const legacyBuyerRole = normalizedRole === 'buyer';
  const { capability, loading: capLoading, error: capError, reload: reloadCap } = usePrivateSellerCapability(Boolean(user) && sellerCapabilityRole);
  // Listing drafts are private account data. Never share one browser-wide draft key
  // between different signed-in identities on a shared device.
  const personalAccountId = String(user?.id || '');
  const listingDraftStorageKey = personalAccountId ? `kayad.privateSeller.listingDraft.v1:${personalAccountId}` : null;
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(() => {
    if (!listingDraftStorageKey) return null;
    try {
      const saved = window.localStorage.getItem(listingDraftStorageKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as ListingDraft;
      return { ...parsed, photos: [], ownership: { ...parsed.ownership, ownerId: '' } }; // Photos and identity numbers are never restored from browser storage.
    } catch { return null; }
  });
  useEffect(() => {
    if (!listingDraftStorageKey) return;
    try {
      if (listingDraft) {
        const serializable = { ...listingDraft, photos: [], ownership: { ...listingDraft.ownership, ownerId: '' } };
        window.localStorage.setItem(listingDraftStorageKey, JSON.stringify(serializable));
      } else {
        window.localStorage.removeItem(listingDraftStorageKey);
      }
    } catch { /* Storage may be disabled; the in-session draft remains usable. */ }
  }, [listingDraft, listingDraftStorageKey]);

  // Listing data is owned by DashboardHub and shared with the unified overview.
  // The module does not issue a second listing request or create a second data cache.

  const handleSectionChange = useCallback((section: PlatformSection) => {
    setActiveSection(section);
    const dashboardSection: Record<PlatformSection, string> = {
      'listing-wizard': 'dashboard:create-listing',
      'listing-quality': 'dashboard:my-vehicles',
      'auction-verification': 'dashboard:auctions',
      'trust-center': 'dashboard:trust',
      help: 'dashboard:help',
    };
    onNavigate?.(dashboardSection[section]);
  }, [onNavigate]);

  // Free policy returns an effective approved state for all eligible personal accounts.
  // Once approval is enabled, only an approved capability enters the workspace.
  // Existing individual_seller users retain the workspace during initial load to avoid a navigation flash.
  const sellerWorkspaceAllowed = sellerCapabilityRole && (capability
    ? capability.status === 'approved' && (!capability.packageMode || capability.packageMode === 'free')
    : normalizedRole === 'individual_seller');


  // Personal identities only: staff and business roles never see (or can be offered) personal selling controls here.
  if (!user || !personalRole) return null;

  // Seller capability gates listing creation only. Existing owners must still be able to
  // inspect their own inventory, access trust/verification, auction eligibility and support.
  if (!sellerWorkspaceAllowed && activeSection === 'listing-wizard') {
    return (
      <section className="rounded-2xl border border-[#D7E7E4] bg-white p-5 shadow-sm" data-testid="kayad-seller-access-state" data-kayad-seller-access-state={capLoading ? 'loading' : capability?.status || 'unavailable'}>
        {/* Reuse the canonical capability panel: it shows the REAL state (pending, rejected + reason, suspended, revoked, paid-package mode) and, where the server allows it, the application form. */}
        <SellerCapabilityPanel capability={capability} loading={capLoading} error={capError ? 'We could not confirm your selling access. Your personal buying account remains available.' : ''} onReload={reloadCap} onOpenWorkspace={() => onNavigate?.('dashboard:my-vehicles')} />
        {legacyBuyerRole && <div role="status" className="rounded-xl border border-[#D7E7E4] bg-[#F5FBFA] p-4"><h2 className="font-black text-[#0A3340]">Update your personal account access</h2><p className="mt-1 text-sm leading-6 text-[#64748B]">This is a legacy buyer-role account. KAYARD KE private selling is enabled for the unified personal account role. Your existing buying access remains available; contact support to review migration before creating a private listing.</p></div>}
        {!legacyBuyerRole && !capLoading && !capError && (!capability || capability.status === 'not_applicable' || (capability.status === 'none' && !capability.canApply)) && <div className="flex items-start gap-3"><ShieldCheck size={22} className="mt-0.5 text-[#0D9488]"/><div className="min-w-0"><h2 className="font-black text-[#0A3340]">Selling access</h2><p className="mt-1 text-sm leading-6 text-[#64748B]">Selling is currently restricted for this personal account. No separate seller account is required.</p></div></div>}
        {!capLoading && <div className="mt-4 flex flex-wrap gap-2">{!legacyBuyerRole && <button type="button" onClick={reloadCap} className="rounded-lg border border-[#D7E7E4] px-4 py-2 text-sm font-bold text-[#12576D]">Recheck access</button>}<button type="button" onClick={() => onNavigate?.('support')} className="rounded-lg bg-[#0A3340] px-4 py-2 text-sm font-bold text-white">Contact support</button></div>}
      </section>
    );
  }

  return (
      <section className="min-w-0 space-y-4" data-kayad-personal-selling-module="true" aria-label="My vehicles and selling tools">

        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
            {activeSection === 'listing-wizard' && (isEmailVerified ? <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} draftStorageKey={listingDraftStorageKey} onNavigate={handleSectionChange} onPublished={onRefreshListings} /> : <section className="rounded-2xl border border-[#D7E7E4] bg-white p-5" role="status"><h3 className="font-black text-[#0A3340]">Verify your email to publish a vehicle</h3><p className="mt-2 text-sm leading-6 text-[#64748B]">Your personal account can browse and buy vehicles now. Confirm your email address to create and publish private vehicle listings. No separate seller account or package is required.</p><button type="button" onClick={() => onNavigate?.('profile')} className="mt-4 rounded-xl bg-[#0A3340] px-4 py-2.5 text-sm font-bold text-white">Open my account</button></section>)}
            {activeSection === 'auction-verification' && (listingsError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{listingsError}<button type="button" onClick={onRefreshListings} className="ml-3 rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Retry</button></div> : <AuctionVerificationSection listings={listings} />)}
            {activeSection === 'trust-center' && <TrustCenterSection user={user} />}
            {activeSection === 'listing-quality' && <ListingQualitySection listings={listings} loading={listingsLoading} error={listingsError} onRefresh={onRefreshListings} onNavigate={onNavigate} />}
            {activeSection === 'help' && <HelpCenterSection onNavigate={onNavigate} />}
          </motion.div>
        </AnimatePresence>
      </section>
    );
}

/** Whole vehicle visible (object-contain on a neutral ground). A failed load is shown explicitly as "Photo unavailable"
 *  and reported to the console with the failing URL: storage/permission faults are surfaced, not hidden. */
function ListingCard({ listing, delay }: { listing: BackendCar; delay: number }) {
  const image = listing.images?.[0]?.thumb || listing.images?.[0]?.url;
  const photoCount = Array.isArray(listing.images) ? listing.images.length : 0;
  const city = listing.city || listing.location_city || '';
  const title = `${listing.year} ${listing.brand} ${listing.model}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white shadow-[0_2px_10px_rgba(11,29,58,0.04)] transition hover:border-[#176B87]/40 hover:shadow-[0_8px_22px_rgba(11,29,58,0.08)]"
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
        <ListingThumb src={image} fallback={listing.images?.[0]?.url} alt={title} count={photoCount} className="h-36 w-full sm:h-28 sm:w-44" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold" style={{ color: KAYAD_THEME.navy }}>{title}</h3>
              <ListingFacts className="mt-1" items={[
                listing.mileage != null && `${listing.mileage.toLocaleString()} km`,
                city,
                <span key="views" className="inline-flex items-center gap-1"><EyeIcon size={13} aria-hidden="true" /> {listing.views || 0}</span>,
              ]} />
            </div>
            <ListingStatusBadge status={listing.status || 'draft'} label={listing.status || 'draft'} className="capitalize" />
          </div>
          <p className="mt-3 text-xl font-extrabold" style={{ color: KAYAD_THEME.navy }}>KES {Number(listing.price || 0).toLocaleString('en-KE')}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SECTION 2: LISTING WIZARD (Simplified)
// ============================================================

function ListingWizardSection({ draft, setDraft, draftStorageKey, onNavigate, onPublished }: {
  draft: ListingDraft | null;
  setDraft: (d: ListingDraft | null) => void;
  draftStorageKey: string | null;
  onNavigate: (s: PlatformSection) => void;
  onPublished: () => void;
}) {
  const emptyDraft = (): ListingDraft => ({
    step: 1,
    vehicleInfo: { make: '', model: '', year: new Date().getFullYear(), registration: '', vin: '', bodyType: '' },
    photos: [],
    details: { mileage: 0, fuelType: 'Petrol', transmission: 'Automatic', color: '', condition: 'Used', description: '', city: '' },
    ownership: { ownerName: '', ownerId: '', purchaseDate: '', logbookAvailable: false, ownerConfirmed: false },
    condition: { exterior: '', interior: '', engine: '', tyres: '', knownIssues: '', serviceHistory: '' },
    pricing: { askingPrice: 0, negotiable: false, tradeIn: false },
    delivery: { canDeliver: false, deliveryRadius: 0 },
  });
  const [currentStep, setCurrentStep] = useState(Math.min(12, Math.max(1, draft?.step || 1)));
  const [form, setForm] = useState<ListingDraft>(() => draft || emptyDraft());
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCarId, setPublishedCarId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const totalSteps = 12;
  const steps = [
    { id: 1, label: 'Start' }, { id: 2, label: 'Vehicle' }, { id: 3, label: 'Photos' },
    { id: 4, label: 'Details' }, { id: 5, label: 'Ownership' }, { id: 6, label: 'Condition' },
    { id: 7, label: 'Issues' }, { id: 8, label: 'Service' }, { id: 9, label: 'Inspection' },
    { id: 10, label: 'Pricing' }, { id: 11, label: 'Preview' }, { id: 12, label: 'Publish' },
  ];
  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    const next = { ...form, [key]: value, step: currentStep };
    setForm(next);
    setDraft(next);
    setValidationError(null);
  };
  const updateNested = (section: 'vehicleInfo' | 'details' | 'ownership' | 'condition' | 'pricing' | 'delivery', key: string, value: string | number | boolean) => {
    const next = { ...form, [section]: { ...form[section], [key]: value }, step: currentStep } as ListingDraft;
    setForm(next); setDraft(next); setValidationError(null);
  };
  const fieldClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
  const labelClass = 'block min-w-0 text-sm font-semibold text-slate-700';
  const goNext = () => {
    const v = form.vehicleInfo; const d = form.details;
    if (currentStep === 2 && (!v.make.trim() || !v.model.trim() || !v.year || v.year < 1900 || v.year > new Date().getFullYear() + 1)) return setValidationError('Enter a valid make, model and year before continuing.');
    if (currentStep === 3 && form.photos.length === 0) return setValidationError('Add at least one clear vehicle photo. At least one image is required to submit a listing.');
    if (currentStep === 4 && (!d.city.trim() || !d.description.trim())) return setValidationError('Enter the vehicle location and a description.');
    if (currentStep === 5 && !form.ownership.ownerConfirmed) return setValidationError('Confirm that you are the owner or are authorised to sell this vehicle.');
    if (currentStep === 10 && (!form.pricing.askingPrice || form.pricing.askingPrice <= 0)) return setValidationError('Enter an asking price greater than zero.');
    setValidationError(null); const nextStep = Math.min(totalSteps, currentStep + 1); setCurrentStep(nextStep); update('step', nextStep);
  };
  const handlePublish = async () => {
    setIsPublishing(true); setPublishError(null); setValidationError(null);
    try {
      const v = form.vehicleInfo; const d = form.details; const c = form.condition;
      const description = [d.description, c.exterior && `Exterior: ${c.exterior}`, c.interior && `Interior: ${c.interior}`, c.engine && `Engine: ${c.engine}`, c.tyres && `Tyres: ${c.tyres}`, c.knownIssues && `Known issues: ${c.knownIssues}`, c.serviceHistory && `Service history: ${c.serviceHistory}`].filter(Boolean).join('\n\n');
      const result = await createCar({
        title: `${v.year} ${v.make} ${v.model}`.trim(), brand: v.make.trim(), model: v.model.trim(), year: Number(v.year),
        vin: v.vin.trim() || undefined, registrationNumber: v.registration.trim() || undefined,
        bodyType: v.bodyType || undefined, mileage: Number(d.mileage) || 0, fuel: d.fuelType, transmission: d.transmission,
        color: d.color || undefined, condition: d.condition, description, city: d.city.trim(), price: Number(form.pricing.askingPrice), images: form.photos,
      });
      if (!result.success || !result.data?.id) throw new Error(result.message || 'The server did not confirm listing creation.');
      setPublishedCarId(result.data.id); setDraft(null); if (draftStorageKey) window.localStorage.removeItem(draftStorageKey); onPublished();
    } catch (err) {
      setPublishError(err instanceof VehicleApiError ? err.message : err instanceof Error ? err.message : 'Unable to submit your listing. Please try again.');
    } finally { setIsPublishing(false); }
  };
  const photoPreviews = useMemo(() => form.photos.map((file) => ({ file, url: URL.createObjectURL(file) })), [form.photos]);
  useEffect(() => () => photoPreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [photoPreviews]);
  const sectionTitle = steps[currentStep - 1]?.label || 'Create listing';

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-hidden pb-8" data-testid="personal-account-listing-wizard">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">My vehicles · New listing</p><h2 className="break-words text-xl font-bold text-[#0A3340]">Vehicle listing details</h2></div>
        <button type="button" onClick={() => { const saved = { ...form, step: currentStep }; setDraft(saved); try { const serializable = { ...saved, photos: [], ownership: { ...saved.ownership, ownerId: '' } }; if (draftStorageKey) localStorage.setItem(draftStorageKey, JSON.stringify(serializable)); } catch {} setValidationError('Draft saved on this device. Selected photos must be added again if you leave or reload this page.'); }} className="rounded-xl bg-[#DDF4F0] px-4 py-2.5 text-sm font-bold text-[#0A3340]">Save draft</button>
      </div>
      <section className="min-w-0 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#0A3340]">Step {currentStep} of {totalSteps}: {sectionTitle}</span><span className="text-sm text-slate-500">{Math.round(currentStep / totalSteps * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#13B8A6] transition-all" style={{ width: `${currentStep / totalSteps * 100}%` }} /></div>
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2" role="group" aria-label="Listing steps" tabIndex={0}>{steps.map(step => <button type="button" key={step.id} onClick={() => { if (step.id < currentStep) { setCurrentStep(step.id); update('step', step.id); } }} disabled={step.id >= currentStep} aria-current={step.id === currentStep ? 'step' : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${step.id === currentStep ? 'bg-[#0F766E] text-white' : step.id < currentStep ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{step.id < currentStep ? '✓ ' : ''}{step.label}</button>)}</div>
      </section>
      <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-6">
        {publishedCarId ? <div className="mx-auto max-w-xl py-8 text-center"><CheckCircle className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Listing submitted</h2><p className="mt-2 text-slate-600">KAYARD KE received your vehicle listing. Seller access is free and approval-free; listing visibility follows the separate moderation policy.</p><p className="mt-2 break-all text-xs text-slate-400">Reference: {publishedCarId}</p><button type="button" onClick={() => onNavigate('listing-quality')} className="mt-6 rounded-xl bg-[#0A3340] px-5 py-3 font-bold text-white">Return to my vehicles</button></div> : <>
          {currentStep === 1 && <div className="mx-auto max-w-2xl py-6 text-center"><Car className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Let's get your vehicle listed</h2><p className="mt-3 text-slate-600">Provide accurate details and clear photographs. Your listing is submitted for the existing KAYARD KE review process; submission does not guarantee immediate publication.</p><div className="mt-5 rounded-xl bg-[#F6FAF9] p-4 text-left text-sm text-slate-600">Have your vehicle details, at least one photo, asking price and accurate ownership information ready.</div></div>}
          {currentStep === 2 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Make *<input className={fieldClass} maxLength={80} value={form.vehicleInfo.make} onChange={e => updateNested('vehicleInfo','make',e.target.value)} placeholder="e.g. Toyota" /></label><label className={labelClass}>Model *<input className={fieldClass} maxLength={100} value={form.vehicleInfo.model} onChange={e => updateNested('vehicleInfo','model',e.target.value)} placeholder="e.g. Harrier" /></label><label className={labelClass}>Year *<input className={fieldClass} type="number" min="1900" max={new Date().getFullYear()+1} value={form.vehicleInfo.year || ''} onChange={e => updateNested('vehicleInfo','year',Number(e.target.value))}/></label><label className={labelClass}>Body type<select className={fieldClass} value={form.vehicleInfo.bodyType} onChange={e => updateNested('vehicleInfo','bodyType',e.target.value)}><option value="">Select body type</option>{['SUV','Sedan','Hatchback','Wagon','Coupe','Pickup','Van','Truck','Convertible','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Registration number<input className={fieldClass} value={form.vehicleInfo.registration} onChange={e => updateNested('vehicleInfo','registration',e.target.value)} placeholder="Optional" maxLength={50}/></label><label className={labelClass}>VIN / chassis number<input className={fieldClass} value={form.vehicleInfo.vin} onChange={e => updateNested('vehicleInfo','vin',e.target.value)} placeholder="Optional" maxLength={50}/></label></div>}
          {currentStep === 3 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-[#0A3340]">Add vehicle photographs *</h2><p className="mt-1 text-sm text-slate-500">JPEG, PNG or WebP; up to 10 photos in this submission, maximum 5 MB each. Show the full vehicle clearly.</p></div><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-5 text-center"><Camera className="mb-2 text-teal-700" size={32}/><span className="font-bold text-[#0A3340]">Choose vehicle photos</span><span className="mt-1 text-xs text-slate-500">Select up to 10 images</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const files = Array.from(e.currentTarget.files || []) as File[]; const valid = files.filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size <= 5*1024*1024); const hadInvalid = valid.length !== files.length; update('photos', [...form.photos, ...valid].slice(0,10)); if (hadInvalid) setValidationError('Some files were skipped. Use JPG, PNG or WebP images no larger than 5 MB each.'); e.currentTarget.value=''; }}/></label><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photoPreviews.map(({file,url},i)=><div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-xl border border-slate-200"><img src={url} alt={`Vehicle photo ${i+1}`} className="h-32 w-full object-contain bg-slate-50"/><button type="button" onClick={()=>update('photos',form.photos.filter((_,index)=>index!==i))} className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-rose-700">Remove</button></div>)}</div><p className="text-sm text-slate-600">{form.photos.length} of 10 photos selected</p></div>}
          {currentStep === 4 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Mileage (km)<input className={fieldClass} type="number" min="0" max="2000000" value={form.details.mileage || ''} onChange={e=>updateNested('details','mileage',Number(e.target.value))}/></label><label className={labelClass}>Fuel type<select className={fieldClass} value={form.details.fuelType} onChange={e=>updateNested('details','fuelType',e.target.value)}>{['Petrol','Diesel','Hybrid','Plug-in Hybrid','Electric'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Transmission<select className={fieldClass} value={form.details.transmission} onChange={e=>updateNested('details','transmission',e.target.value)}>{['Automatic','Manual','CVT','Dual-Clutch'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Exterior colour<input className={fieldClass} value={form.details.color} onChange={e=>updateNested('details','color',e.target.value)} maxLength={60}/></label><label className={`${labelClass} sm:col-span-2`}>Vehicle location / town *<input className={fieldClass} value={form.details.city} onChange={e=>updateNested('details','city',e.target.value)} placeholder="e.g. Nairobi" maxLength={100}/></label><label className={`${labelClass} sm:col-span-2`}>Description *<textarea className={fieldClass} rows={5} maxLength={5000} value={form.details.description} onChange={e=>updateNested('details','description',e.target.value)} placeholder="Describe the vehicle, key features and anything a buyer should know."/><span className="mt-1 block text-xs font-normal text-slate-400">{form.details.description.length}/5000 characters</span></label><label className={labelClass}>Condition<select className={fieldClass} value={form.details.condition} onChange={e=>updateNested('details','condition',e.target.value)}>{['New','Like New','Excellent','Good','Fair','Used','Locally Used','Ex-Japan'].map(x=><option key={x}>{x}</option>)}</select></label></div>}
          {currentStep === 5 && <div className="max-w-2xl space-y-4"><h2 className="text-lg font-bold text-[#0A3340]">Ownership declaration</h2><p className="text-sm text-slate-600">Only list a vehicle you own or are legally authorised to sell. KAYARD KE may request supporting documents during its verification process.</p><label className="flex items-start gap-3 rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.ownerConfirmed} onChange={e=>updateNested('ownership','ownerConfirmed',e.target.checked)}/><span>I confirm that I am the vehicle owner or have authority from the owner to advertise and sell it. *</span></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.logbookAvailable} onChange={e=>updateNested('ownership','logbookAvailable',e.target.checked)}/><span>I have access to the vehicle logbook / ownership documentation.</span></label><p className="text-xs text-teal-700">This checkbox is a submission prerequisite only. The current listing API does not retain the declaration or logbook-availability selection, and neither selection verifies ownership. KAYARD KE may request supporting documents separately during its verification process.</p></div>}
          {currentStep === 6 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">{(['exterior','interior','engine','tyres'] as const).map(key=><label key={key} className={labelClass}>{key[0].toUpperCase()+key.slice(1)} condition<textarea className={fieldClass} rows={3} maxLength={500} value={form.condition[key]} onChange={e=>updateNested('condition',key,e.target.value)} placeholder={`Describe ${key} condition`}/></label>)}</div>}
          {currentStep === 7 && <label className={labelClass}>Known issues / repairs<textarea className={fieldClass} rows={6} maxLength={2000} value={form.condition.knownIssues} onChange={e=>updateNested('condition','knownIssues',e.target.value)} placeholder="Disclose known faults, accident repairs or issues. Enter 'None known' if applicable."/></label>}
          {currentStep === 8 && <label className={labelClass}>Service history<textarea className={fieldClass} rows={6} maxLength={2000} value={form.condition.serviceHistory} onChange={e=>updateNested('condition','serviceHistory',e.target.value)} placeholder="Describe available service records, recent maintenance and major work."/></label>}
          {currentStep === 9 && <div className="max-w-2xl space-y-3"><h2 className="text-lg font-bold text-[#0A3340]">Inspection and verification</h2><p className="text-sm text-slate-600">You can request or arrange an inspection through the available KAYARD KE inspection services. Do not describe a vehicle as inspected or verified unless KAYARD KE has confirmed it.</p><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">Your listing submission does not itself book an inspection or certify vehicle condition. Follow the dashboard and Trust Center for available next steps.</div></div>}
          {currentStep === 10 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Asking price (KES) *<input className={fieldClass} type="number" min="1" max="100000000" step="1000" value={form.pricing.askingPrice || ''} onChange={e=>updateNested('pricing','askingPrice',Number(e.target.value))} placeholder="e.g. 1850000"/></label><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">Your asking price is submitted in Kenyan shillings. Any platform fees, moderation or seller eligibility checks are handled by KAYARD KE's existing backend rules.</div></div>}
          {currentStep === 11 && <div className="space-y-4"><h2 className="text-lg font-bold text-[#0A3340]">Review your listing</h2><div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">{photoPreviews[0] && <img src={photoPreviews[0].url} alt="Selected vehicle cover" className="h-36 w-full rounded-xl bg-slate-50 object-contain"/>}<div className="min-w-0"><h3 className="break-words text-xl font-bold text-[#0A3340]">{form.vehicleInfo.year} {form.vehicleInfo.make} {form.vehicleInfo.model}</h3><p className="mt-1 text-lg font-bold text-teal-700">KES {Number(form.pricing.askingPrice || 0).toLocaleString('en-KE')}</p><p className="mt-2 break-words text-sm text-slate-600">{form.details.city} · {form.details.mileage.toLocaleString()} km · {form.details.fuelType} · {form.details.transmission}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{form.details.description}</p></div></div><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">{form.photos.length} photos · {form.details.condition} · Ownership declaration {form.ownership.ownerConfirmed ? 'confirmed' : 'not confirmed'}</div></div>}
          {currentStep === 12 && <div className="max-w-2xl space-y-3"><h2 className="text-lg font-bold text-[#0A3340]">Submit your vehicle</h2><p className="text-sm text-slate-600">Your details and photos will be sent to KAYARD KE. The server decides the listing status based on your account capability and moderation policy. You will see confirmation only after the server creates the listing.</p><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-700">{form.vehicleInfo.year} {form.vehicleInfo.make} {form.vehicleInfo.model} · KES {Number(form.pricing.askingPrice || 0).toLocaleString('en-KE')} · {form.photos.length} photos</div></div>}
          {(validationError || publishError) && <div role="alert" className="mt-5 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{validationError || publishError}</div>}
          <div className="mt-7 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={currentStep===1 || isPublishing} onClick={()=>{const prev=currentStep-1;setCurrentStep(prev);update('step',prev);}} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 disabled:opacity-40">Back</button>{currentStep < totalSteps ? <button type="button" onClick={goNext} className="rounded-xl bg-[#0A3340] px-6 py-3 font-bold text-white">Continue <ArrowRight className="ml-2 inline" size={17}/></button> : <button type="button" onClick={handlePublish} disabled={isPublishing} className="rounded-xl bg-[#13B8A6] px-6 py-3 font-bold text-[#07343B] disabled:opacity-60">{isPublishing ? 'Submitting…' : 'Submit listing'} <ArrowRight className="ml-2 inline" size={17}/></button>}</div>
        </>}
      </section>
    </div>
  );
}

// ============================================================
// OTHER SECTIONS (Simplified for brevity)
// ============================================================

function TrustCenterSection({ user }: { user?: (UserProfile & { emailVerified?: boolean; phoneVerified?: boolean }) | null }) {
  const emailVerified = user?.emailVerified === true;
  const phoneVerified = user?.phoneVerified === true;
  const signals = [
    { label: 'Email address', state: emailVerified ? 'Verified' : 'Verification required', detail: emailVerified ? 'Your email is confirmed.' : 'Verify your email before publishing a private vehicle listing.' },
    { label: 'Phone number', state: phoneVerified ? 'Verified' : 'Not verified', detail: phoneVerified ? 'Your phone verification is confirmed.' : 'Phone verification is available from Personal Information.' },
    { label: 'National ID', state: 'Not connected', detail: 'No personal ID verification status is currently exposed to this screen.' },
    { label: 'NTSA TIMS logbook', state: 'Not connected', detail: 'Vehicle ownership evidence is collected during listing submission where required.' },
  ];
  return (
    <div className="space-y-4" data-kayad-personal-trust-center="true">
      <div><h2 className="text-xl font-black text-[#0A3340]">Your verification status</h2><p className="mt-1 text-sm text-[#64748B]">Personal account checks that support safe buying and private selling.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{signals.map((signal) => {
        const verified = signal.state === 'Verified';
        return <article key={signal.label} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold text-[#0A3340]">{signal.label}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{signal.state}</span></div><p className="mt-2 text-xs leading-5 text-[#64748B]">{signal.detail}</p></article>;
      })}</div>
      {!emailVerified && <div className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-3 text-sm text-[#0A3340]">Email verification is required before a personal listing can be published. It does not create a separate seller account or business identity.</div>}
    </div>
  );
}

function PersonalListingPhotoManager({ listing, onChanged }: { listing: BackendCar; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const images = Array.isArray(listing.images) ? listing.images : [];
  const idOf = (image: unknown) => String((image as { public_id?: string; publicId?: string } | null)?.public_id || (image as { publicId?: string } | null)?.publicId || '');
  const permissions = listing.ownerActionEligibility;
  const canManage = permissions?.permissionsAvailable === true && permissions.canManagePhotos === true;
  const maxImages = Number.isInteger(permissions?.maxListingImages) ? Number(permissions?.maxListingImages) : null;
  const maxPerRequest = Math.min(LISTING_IMAGE_MAX_PER_REQUEST, Number(permissions?.maxImagesPerRequest) || LISTING_IMAGE_MAX_PER_REQUEST);
  const remaining = maxImages == null ? null : Math.max(0, maxImages - images.length);

  const upload = async (files: File[]) => {
    setError(''); setMessage('');
    if (!canManage) { setError(permissions?.reason || 'Photo permissions could not be verified. Refresh before making changes.'); return; }
    if (files.length > maxPerRequest) { setError(`Select up to ${maxPerRequest} photos per upload.`); return; }
    const valid = files.filter((file) => LISTING_IMAGE_TYPES.includes(file.type) && file.size <= LISTING_IMAGE_MAX_BYTES);
    if (valid.length !== files.length) { setError('Some photos were skipped. Use JPG, PNG or WebP up to 5 MB each.'); return; }
    if (!valid.length) return;
    if (remaining !== null && valid.length > remaining) { setError(`You can add ${remaining} more photo(s) under the current platform limit.`); return; }
    setBusy(true); setProgress(0);
    try {
      const result = await addCarImages(listing.id, valid, setProgress);
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm the photo upload.');
      setMessage(`${valid.length} photo${valid.length === 1 ? '' : 's'} uploaded and saved to this listing.`); onChanged();
    } catch (e) { setError(e instanceof Error ? `Upload failed: ${e.message} Your existing photos are unchanged.` : 'Upload failed. Your existing photos are unchanged.'); }
    finally { setBusy(false); setProgress(null); }
  };
  const remove = async (index: number) => {
    if (!canManage) { setError(permissions?.reason || 'Photo permissions could not be verified.'); return; }
    const status = String(listing.status || '').toLowerCase();
    if (images.length <= 1 && status !== 'draft') { setError('A submitted listing must keep at least one photo. Add another photo before removing this one.'); return; }
    if (!window.confirm('Remove this vehicle photo?')) return;
    setBusy(true); setError(''); setMessage('');
    try { const result = await deleteCarImage(listing.id, index, idOf(images[index]) || undefined); if (!result?.success) throw new Error(result?.message || 'The server did not confirm photo removal.'); setMessage('Photo removed.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove this photo.'); } finally { setBusy(false); }
  };
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (!canManage) { setError(permissions?.reason || 'Photo permissions could not be verified.'); return; }
    if (target < 0 || target >= images.length) return;
    const order = images.map((_, i) => i); [order[index], order[target]] = [order[target], order[index]];
    setBusy(true); setError(''); setMessage('');
    try { const result = await reorderCarImages(listing.id, order, images.every((image) => idOf(image)) ? images.map(idOf) : undefined); if (!result?.success) throw new Error(result?.message || 'The server did not confirm the new photo order.'); setMessage(target === 0 ? 'Photo moved to the front and set as the cover photo.' : 'Photo order saved.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save the photo order.'); } finally { setBusy(false); }
  };
  const cover = async (index: number) => {
    if (!canManage) { setError(permissions?.reason || 'Photo permissions could not be verified.'); return; }
    setBusy(true); setError(''); setMessage('');
    try { const result = await setCoverImage(listing.id, index, idOf(images[index]) || undefined); if (!result?.success) throw new Error(result?.message || 'The server did not confirm the cover change.'); setMessage('Cover photo updated.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update cover photo.'); } finally { setBusy(false); }
  };
  return <section className="mt-4 border-t border-[#E5EFED] pt-4" aria-label="Manage vehicle photos">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-[#0A3340]">Vehicle photos</h4><p className="text-xs text-[#64748B]">{images.length} uploaded · Cover photo appears first{maxImages !== null ? ` · ${remaining} remaining of ${maxImages}` : ' · Current platform limit is checked by the server'}</p><p className="mt-0.5 text-[11px] text-[#64748B]">JPG, PNG or WebP · 5 MB maximum per photo · Up to {maxPerRequest} per upload</p></div>
      <label className={`inline-flex min-h-11 items-center rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white ${busy || !canManage || remaining === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>{busy ? (progress !== null ? `Uploading ${progress}%` : 'Please wait…') : 'Add photos'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || !canManage || remaining === 0} onChange={(event) => { const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = ''; void upload(files); }}/></label></div>
    {progress !== null && <div className="mb-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Photo upload progress"><div className="h-2 overflow-hidden rounded-full bg-[#E6F0EE]"><div className="h-full rounded-full bg-[#13B8A6] transition-all" style={{ width: `${progress}%` }} /></div></div>}
    {!canManage && <p className="mb-2 rounded-lg border border-[#D7E7E4] bg-[#F6FAF9] p-2 text-xs text-[#0A3340]">{permissions?.reason || 'Photo permissions could not be verified. Refresh before making changes.'}</p>}
    {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}{message && <p role="status" className="mb-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p>}
    {images.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{images.map((image, index) => <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-[#D7E7E4] bg-[#F6FAF9]"><img src={image.thumb || image.url} alt={`Vehicle photo ${index + 1}`} loading="lazy" decoding="async" className="h-28 w-full object-contain"/><div className="flex flex-wrap items-center justify-between gap-1 p-2"><span className="text-[10px] font-bold text-[#526875]">{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span><div className="flex flex-wrap gap-1"><button type="button" disabled={busy || !canManage || index === 0} onClick={() => void move(index, -1)} aria-label={`Move photo ${index + 1} earlier`} className="min-h-9 min-w-9 rounded border border-[#BDE5DE] px-2 py-1 text-[11px] font-bold text-[#12576D] disabled:opacity-40">←</button><button type="button" disabled={busy || !canManage || index === images.length - 1} onClick={() => void move(index, 1)} aria-label={`Move photo ${index + 1} later`} className="min-h-9 min-w-9 rounded border border-[#BDE5DE] px-2 py-1 text-[11px] font-bold text-[#12576D] disabled:opacity-40">→</button>{index !== 0 && <button type="button" disabled={busy || !canManage} onClick={() => void cover(index)} className="min-h-9 rounded border border-[#BDE5DE] px-2 py-1 text-[10px] font-bold text-[#12576D] disabled:opacity-50">Make cover</button>}<button type="button" disabled={busy || !canManage} onClick={() => void remove(index)} aria-label={`Remove photo ${index + 1}`} className="min-h-9 rounded border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 disabled:opacity-50">Remove</button></div></div></div>)}</div> : <p className="rounded-lg bg-[#F6FAF9] p-3 text-xs text-[#64748B]">No photos are attached to this listing yet.</p>}
  </section>;
}

function ListingQualitySection({ listings, loading, error, onRefresh, onNavigate }: { listings: BackendCar[]; loading: boolean; error?: string; onRefresh: () => void; onNavigate?: (nav: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ title: '', brand: '', model: '', year: '', price: '', mileage: '', fuel: '', transmission: '', bodyType: '', color: '', condition: '', city: '', description: '', features: '' });
  const [editSnapshot, setEditSnapshot] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [lifecycleBusyId, setLifecycleBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ListingLifecycleState>('all');
  const [photosOpen, setPhotosOpen] = useState<string[]>([]);

  const beginEdit = (listing: BackendCar) => {
    setActionError(''); setActionNotice(''); setEditingId(listing.id);
    const next = {
      title: String(listing.title || ''), brand: String(listing.brand || ''), model: String(listing.model || ''), year: String(listing.year ?? ''),
      price: String(listing.price ?? ''), mileage: String(listing.mileage ?? ''), fuel: String(listing.fuel || ''), transmission: String(listing.transmission || ''),
      bodyType: String(listing.bodyType || listing.body_type || ''), color: String(listing.color || ''), condition: String(listing.condition || ''),
      city: String(listing.city || listing.location_city || ''), description: String(listing.description || ''), features: Array.isArray(listing.features) ? listing.features.join(', ') : '',
    };
    setEditValues(next); setEditSnapshot(JSON.stringify(next));
  };

  const closeEditor = () => {
    if (editSnapshot && editSnapshot !== JSON.stringify(editValues) && !window.confirm('Discard your unsaved listing changes?')) return;
    setEditingId(null); setEditSnapshot('');
  };

  const toggleEditor = (listing: BackendCar) => {
    if (editingId === listing.id) { closeEditor(); return; }
    if (editingId && editSnapshot && editSnapshot !== JSON.stringify(editValues) && !window.confirm('Discard your unsaved changes and open another listing?')) return;
    beginEdit(listing);
  };

  const saveEdit = async (listing: BackendCar) => {
    const price = Number(editValues.price); const mileage = Number(editValues.mileage); const year = Number(editValues.year);
    if (editValues.title.trim().length < 2 || !editValues.brand.trim() || !editValues.model.trim()) { setActionError('Enter a listing title, vehicle make and model.'); return; }
    if (!Number.isInteger(year) || year < 1900 || year > 2030) { setActionError('Enter a valid vehicle year.'); return; }
    if (!Number.isFinite(price) || price <= 0 || price > 100000000) { setActionError('Enter a valid asking price greater than zero.'); return; }
    if (!Number.isFinite(mileage) || mileage < 0 || mileage > 2000000) { setActionError('Enter a valid mileage of zero or more.'); return; }
    if (!editValues.city.trim()) { setActionError('Enter the vehicle location.'); return; }
    if (editValues.features.split(',').filter((value) => value.trim()).length > 50) { setActionError('Enter no more than 50 vehicle features.'); return; }
    if (editValues.description.length > 5000) { setActionError('Keep the description within 5,000 characters.'); return; }
    setSavingId(listing.id); setActionError(''); setActionNotice('');
    try {
      const result = await updateCar(listing.id, {
        title: editValues.title.trim(), brand: editValues.brand.trim(), model: editValues.model.trim(), year,
        price, mileage, city: editValues.city.trim(), fuel: editValues.fuel.trim(), transmission: editValues.transmission.trim(),
        bodyType: editValues.bodyType.trim(), color: editValues.color.trim(), condition: editValues.condition.trim(),
        description: editValues.description.trim(), features: editValues.features.split(',').map((value) => value.trim()).filter(Boolean),
      });
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm the listing update.');
      setEditingId(null); setEditSnapshot(''); setActionNotice('Listing details updated successfully.'); onRefresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Unable to update this listing. Please try again.'); }
    finally { setSavingId(null); }
  };

  const changeLifecycle = async (listing: BackendCar, action: 'hide' | 'publish' | 'mark_sold') => {
    const label = action === 'hide' ? 'hide this listing' : action === 'publish' ? 'republish this listing' : 'mark this vehicle as sold';
    const explanation = action === 'mark_sold' ? '\n\nThis changes the listing status only. It does not confirm payment, escrow settlement or transfer of ownership.' : '';
    if (!window.confirm(`Are you sure you want to ${label}?${explanation}\n\nKAYARD KE will recheck auction, bid and transaction protections before applying the change.`)) return;
    setLifecycleBusyId(listing.id); setActionError(''); setActionNotice('');
    try {
      const result = await transitionMyListing(listing.id, action);
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm this listing status change.');
      setActionNotice(action === 'hide' ? 'Listing paused and hidden from the public marketplace.' : action === 'publish' ? 'Listing republished.' : 'Listing marked as sold and moved to your Sold tab. It is no longer in public inventory. No payment or ownership transfer was recorded by this action.');
      if (action === 'mark_sold') setFilter('sold');
      onRefresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Unable to change this listing status.'); }
    finally { setLifecycleBusyId(null); }
  };

  const removeListing = async (listing: BackendCar) => {
    const title = listing.title || `${listing.year} ${listing.brand} ${listing.model}`;
    if (!window.confirm(`Remove “${title}” from your listings? This action is recorded by KAYARD KE and may not be reversible from this screen.`)) return;
    setRemovingId(listing.id); setActionError(''); setActionNotice('');
    try {
      const result = await deleteCar(listing.id);
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm listing removal.');
      if (editingId === listing.id) { setEditingId(null); setEditSnapshot(''); }
      setActionNotice('Listing removed.'); onRefresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Unable to remove this listing. Please try again.'); }
    finally { setRemovingId(null); }
  };

  if (loading && listings.length === 0) return <div className="space-y-3" role="status" aria-label="Loading your listings">{[0, 1].map((item) => <div key={item} className="animate-pulse rounded-xl border border-[#DCE9E7] bg-white p-4"><div className="flex gap-3"><div className="h-24 w-28 rounded-lg bg-[#E6F0EE]"/><div className="flex-1 space-y-3 py-1"><div className="h-4 w-2/3 rounded bg-[#E6F0EE]"/><div className="h-3 w-1/2 rounded bg-[#EEF4F3]"/><div className="h-5 w-1/3 rounded bg-[#E6F0EE]"/></div></div></div>)}</div>;
  if (error && listings.length === 0) return <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]"><p>{error} We will not show a false empty state.</p><button type="button" onClick={onRefresh} className="mt-3 rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Retry</button></div>;

  // Filters and card status are projections of the existing canonical lifecycle mapping.
  const counts = countByLifecycle(listings);
  const filters: Array<{ id: 'all' | ListingLifecycleState; label: string; count: number }> = [
    { id: 'all', label: 'All', count: listings.length },
    { id: 'draft', label: 'Drafts', count: counts.draft },
    { id: 'under_review', label: 'Under review', count: counts.under_review },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'hidden', label: 'Paused / hidden', count: counts.hidden },
    { id: 'sold', label: 'Sold', count: counts.sold },
    ...(counts.reserved ? [{ id: 'reserved' as const, label: 'Reserved', count: counts.reserved }] : []),
    ...(counts.unknown ? [{ id: 'unknown' as const, label: 'Needs attention', count: counts.unknown }] : []),
  ];
  const visible = filter === 'all' ? listings : listings.filter((l) => getListingLifecycle(l.status, (l as any).sold).state === filter);
  const btn = 'inline-flex min-h-10 items-center justify-center rounded-lg border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <div className="space-y-4" data-kayad-my-vehicles-management="true">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-[#082B40]">Your listings</h2><p className="mt-1 text-sm text-[#475569]">Manage your personal listings from the same account you use to buy vehicles.</p></div></div>
      {error && listings.length > 0 && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">{error} Previously loaded listings remain visible. <button type="button" onClick={onRefresh} className="ml-1 font-bold underline">Retry</button></div>}
      {listings.length > 0 && <div role="group" aria-label="Filter listings by status" className="flex flex-wrap gap-2">{filters.map((f) => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${filter === f.id ? 'border-[#082B40] bg-[#082B40] text-white' : 'border-[#DCE9E7] bg-white text-[#0A4A5C] hover:border-[#11B8A6]'}`}>{f.label}<span className={`rounded-full px-1.5 text-[11px] ${filter === f.id ? 'bg-white/20' : 'bg-[#F4F9F8]'}`}>{f.count}</span></button>)}</div>}
      {actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{actionError}</div>}
      {actionNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionNotice}</div>}
      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center"><Car className="mx-auto mb-3 h-8 w-8 text-[#11B8A6]"/><h2 className="font-bold text-[#0A3340]">No personal listings yet</h2><p className="mt-1 text-sm text-[#64748B]">Create your first listing to sell a vehicle through your personal account.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => onNavigate?.('create-listing')} className="inline-flex min-h-10 items-center rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white">Create a listing</button><button type="button" onClick={() => onNavigate?.('marketplace')} className="inline-flex min-h-10 items-center rounded-lg border border-[#BDE5DE] px-4 text-xs font-bold text-[#0A4A5C]">Browse vehicles</button></div></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center" role="status"><h2 className="font-bold text-[#0A3340]">No {filters.find((f) => f.id === filter)?.label.toLowerCase()} listings</h2><button type="button" onClick={() => setFilter('all')} className="mt-3 text-xs font-bold text-[#0B6B63] underline">Show all listings</button></div>
      ) : visible.map((l) => {
        const completeness = calculateListingCompleteness(getListingCompletenessFactors(l));
        const isEditing = editingId === l.id;
        const info = getListingLifecycle(l.status, (l as any).sold);
        const permissions = l.ownerActionEligibility;
        const canEdit = permissions?.permissionsAvailable === true && permissions.canEdit === true;
        const canPhotos = permissions?.permissionsAvailable === true && permissions.canManagePhotos === true;
        const canHide = permissions?.permissionsAvailable === true && permissions.canHide === true;
        const canRepublish = permissions?.permissionsAvailable === true && permissions.canRepublish === true;
        const canMarkSold = permissions?.permissionsAvailable === true && permissions.canMarkSold === true;
        const canRemove = permissions?.permissionsAvailable === true && permissions.canRemove === true;
        const statusLabel = info.state === 'hidden' ? (permissions?.isSellerHidden ? 'Paused by you' : 'Needs attention') : info.state === 'unknown' ? 'Needs attention' : info.label;
        const place = l.city || l.location_city;
        const facts = [typeof l.mileage === 'number' ? `${l.mileage.toLocaleString('en-KE')} km` : null, l.fuel, l.transmission, place].filter(Boolean).join(' · ');
        const busy = lifecycleBusyId === l.id;
        return (
          <article key={l.id} data-kayad-listing-card={l.id} className="rounded-xl border border-[#DCE9E7] bg-white p-3 shadow-[0_1px_2px_rgba(8,43,64,.05)] transition-shadow hover:shadow-[0_6px_18px_rgba(8,43,64,.07)] sm:p-4">
            <div className="flex min-w-0 flex-row items-start gap-3 sm:gap-4">
              <ListingThumb src={l.images?.[0]?.thumb || l.images?.[0]?.url} fallback={l.images?.[0]?.url} alt={l.title || `${l.brand} ${l.model}`} count={l.images?.length || 0} className="h-24 w-28 sm:h-28 sm:w-40" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1">{typeof l.listingNumber === 'number' && <p data-testid="listing-number" className="mb-0.5 text-[11px] font-black uppercase tracking-wider text-[#176B87]" title="Your listing number: 1 is your first listing. It does not change when you filter or sort.">Listing #{l.listingNumber}</p>}<h3 className="break-words text-sm font-black leading-5 text-[#082B40] sm:text-base">{l.title || `${l.year} ${l.brand} ${l.model}`}</h3><p className="mt-1 text-[11px] leading-4 text-[#475569]">{facts || 'Vehicle details need completing'}</p></div><ListingStatusBadge status={l.status || 'unknown'} label={statusLabel}/></div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><span className="text-base font-black text-[#0B6B63]">{Number(l.price) > 0 ? `KES ${Number(l.price).toLocaleString('en-KE')}` : 'Price not set'}</span><span data-testid="photo-count" className="text-[11px] font-semibold text-[#5B7480]">{(l.images?.length || 0)} photo{(l.images?.length || 0) === 1 ? '' : 's'}</span>{typeof l.views === 'number' && <span className="text-[11px] font-semibold text-[#5B7480]">{l.views.toLocaleString('en-KE')} views</span>}</div><div className="flex items-center gap-2" title="Listing completeness"><ListingScoreRing score={completeness.score}/><span className="max-w-[86px] text-[10px] font-semibold uppercase leading-4 tracking-wide text-[#5B7480]">Listing completeness</span></div></div>
              </div>
            </div>
            <details className="mt-3 rounded-lg border border-[#E5EFED] bg-[#F8FBFA] px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-[#0A4A5C]">Improve listing completeness · {completeness.score}%</summary><div className="mt-2 space-y-2 text-xs text-[#526875]">{completeness.missing.length > 0 && <div><p className="font-bold text-[#0A3340]">Missing information</p><ul className="mt-1 list-disc space-y-1 pl-4">{completeness.missing.map((item) => <li key={item}>{item}</li>)}</ul></div>}{completeness.suggestions.length > 0 && <div><p className="font-bold text-[#0A3340]">Suggestions</p><ul className="mt-1 list-disc space-y-1 pl-4">{completeness.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></div>}<p className="text-[11px] text-[#64748B]">Completeness describes the information supplied. It is not vehicle verification, logbook validation or inspection approval.</p></div></details>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E5EFED] pt-3">
              {['active', 'sold'].includes(info.state) && <Link to={`/cars/${encodeURIComponent(l.id)}`} className={`${btn} border-[#DCE9E7] text-[#0A4A5C]`}>View listing</Link>}
              <button type="button" disabled={(!canEdit && !isEditing) || savingId === l.id} title={!canEdit && !isEditing ? permissions?.reason || 'Listing actions are unavailable right now.' : 'Edit vehicle details'} onClick={() => toggleEditor(l)} className={`${btn} border-[#BDE5DE] text-[#0A4A5C]`}>{isEditing ? 'Close editor' : 'Edit details'}</button>
              <button type="button" disabled={!canPhotos && !photosOpen.includes(l.id)} title={!canPhotos && !photosOpen.includes(l.id) ? permissions?.reason || 'Photo actions are unavailable right now.' : 'Manage vehicle photos'} aria-expanded={photosOpen.includes(l.id)} onClick={() => setPhotosOpen((cur) => cur.includes(l.id) ? cur.filter((x) => x !== l.id) : [...cur, l.id])} className={`${btn} border-[#DCE9E7] text-[#0A4A5C]`}>{photosOpen.includes(l.id) ? 'Close photos' : 'Manage photos'}</button>
              {canHide && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'hide')} className={`${btn} border-[#DCE9E7] text-[#0A4A5C]`}>{busy ? 'Please wait…' : 'Pause listing'}</button>}
              {canRepublish && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'publish')} className={`${btn} border-[#BDE5DE] text-[#0D766F]`}>Republish</button>}
              {canMarkSold && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'mark_sold')} className={`${btn} border-[#B8D9D6] text-[#082B40]`}>Mark as sold</button>}
              {canRemove && <button type="button" onClick={() => void removeListing(l)} disabled={removingId === l.id || savingId === l.id} className={`${btn} ml-auto border-rose-200 text-rose-700`}>{removingId === l.id ? 'Removing…' : 'Remove'}</button>}
            </div>
            {permissions?.permissionsAvailable === false && <div role="status" data-testid="permissions-unavailable" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#B8D9D6] bg-[#F5FBFA] p-2.5 text-xs text-[#0A3340]"><span className="min-w-0 flex-1">{permissions.reason || 'Listing tools are temporarily unavailable. Your listing is unchanged. Try again shortly or contact support.'}</span><button type="button" onClick={onRefresh} disabled={loading} className="min-h-9 rounded-lg border border-[#082B40] px-3 text-xs font-bold text-[#082B40] disabled:opacity-60">{loading ? 'Checking…' : 'Try again'}</button></div>}
            {permissions?.permissionsAvailable === true && permissions.reason && <p data-testid="action-reason" className="mt-2 rounded-lg bg-[#F6FAF9] px-2.5 py-2 text-xs text-[#0A3340]">{permissions.reason}</p>}
            {permissions?.lifecycleReason && <p data-testid="lifecycle-reason" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F6FAF9] px-2.5 py-2 text-xs text-[#0A3340]"><span className="min-w-0 flex-1">{permissions.lifecycleReason}</span>{permissions.lifecycleReasonCode === 'PERMISSION_CHECK_UNAVAILABLE' && <button type="button" onClick={onRefresh} disabled={loading} className="min-h-9 rounded-lg border border-[#082B40] px-3 text-xs font-bold text-[#082B40] disabled:opacity-60">{loading ? 'Checking…' : 'Try again'}</button>}</p>}
            {!permissions && <p className="mt-2 text-xs text-[#0A3340]">Listing actions are not available for this listing yet. Refresh the page; if this continues, contact support.</p>}
            {isEditing && <form className="mt-4 space-y-4 border-t border-[#E5EFED] pt-4" onSubmit={(event) => { event.preventDefault(); void saveEdit(l); }}>
              <section className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><h4 className="text-xs font-black uppercase tracking-wide text-[#176B87]">Vehicle identity</h4></div>
                <label className="text-xs font-bold text-[#526875] sm:col-span-2">Listing title<input required minLength={2} maxLength={200} value={editValues.title} onChange={(event) => setEditValues((current) => ({ ...current, title: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Make<input required minLength={1} value={editValues.brand} onChange={(event) => setEditValues((current) => ({ ...current, brand: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Model<input required minLength={1} maxLength={100} value={editValues.model} onChange={(event) => setEditValues((current) => ({ ...current, model: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Year<input required min="1900" max="2030" type="number" value={editValues.year} onChange={(event) => setEditValues((current) => ({ ...current, year: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Body type<input value={editValues.bodyType} onChange={(event) => setEditValues((current) => ({ ...current, bodyType: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              </section>
              <section className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><h4 className="text-xs font-black uppercase tracking-wide text-[#176B87]">Vehicle specifications</h4></div>
                <label className="text-xs font-bold text-[#526875]">Mileage (km)<input required min="0" max="2000000" type="number" inputMode="numeric" value={editValues.mileage} onChange={(event) => setEditValues((current) => ({ ...current, mileage: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Fuel type<input value={editValues.fuel} onChange={(event) => setEditValues((current) => ({ ...current, fuel: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Transmission<input value={editValues.transmission} onChange={(event) => setEditValues((current) => ({ ...current, transmission: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Colour<input value={editValues.color} onChange={(event) => setEditValues((current) => ({ ...current, color: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Condition<input value={editValues.condition} onChange={(event) => setEditValues((current) => ({ ...current, condition: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              </section>
              <section className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><h4 className="text-xs font-black uppercase tracking-wide text-[#176B87]">Pricing and location</h4></div>
                <label className="text-xs font-bold text-[#526875]">Asking price (KES)<input required min="1" max="100000000" type="number" inputMode="numeric" value={editValues.price} onChange={(event) => setEditValues((current) => ({ ...current, price: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">City / location<input required value={editValues.city} onChange={(event) => setEditValues((current) => ({ ...current, city: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              </section>
              <section className="grid gap-3"><h4 className="text-xs font-black uppercase tracking-wide text-[#176B87]">Description and features</h4>
                <label className="text-xs font-bold text-[#526875]">Vehicle features <span className="font-normal">(separate with commas)</span><input value={editValues.features} onChange={(event) => setEditValues((current) => ({ ...current, features: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
                <label className="text-xs font-bold text-[#526875]">Description<textarea rows={4} maxLength={5000} value={editValues.description} onChange={(event) => setEditValues((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#DCE9E7] px-3 py-2 text-sm text-[#0A3340]"/></label>
              </section>
              <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={closeEditor} className={`${btn} border-[#DCE9E7] text-[#526875]`}>Cancel</button><button type="submit" disabled={savingId === l.id} className={`${btn} border-[#082B40] bg-[#082B40] px-5 text-white`}>{savingId === l.id ? 'Saving…' : 'Save changes'}</button></div>
            </form>}
            {photosOpen.includes(l.id) && <PersonalListingPhotoManager listing={l} onChanged={onRefresh}/>}
          </article>
        );
      })}
    </div>
  );
}

function HelpCenterSection({ onNavigate }: { onNavigate?: (nav: string) => void }) {
  const topics = [
    { title: 'Selling safely', detail: 'Keep vehicle information accurate, meet buyers safely and use the published KAYARD KE transaction steps.' },
    { title: 'Avoiding scams', detail: 'Do not rely on screenshots or payment promises. Confirm payment and transaction status in your account.' },
    { title: 'Meeting buyers', detail: 'Agree on a safe viewing location and confirm the vehicle and buyer details before proceeding.' },
    { title: 'Using escrow', detail: 'Follow the deal status and instructions shown in the participant escrow workspace.' },
  ];
  return (
    <div className="space-y-4" data-kayad-personal-help="true">
      <div><h2 className="text-xl font-black text-[#0A3340]">Guidance for your account</h2><p className="mt-1 text-sm text-[#64748B]">Guidance for buying and selling through your one personal account.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{topics.map((topic) => <article key={topic.title} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><h2 className="text-sm font-bold text-[#0A3340]">{topic.title}</h2><p className="mt-2 text-xs leading-5 text-[#64748B]">{topic.detail}</p></article>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F0F8F6] p-4"><div><p className="text-sm font-bold text-[#0A3340]">Need help with your account?</p><p className="mt-1 text-xs text-[#475569]">Open KAYARD KE support for account or transaction assistance.</p></div><button type="button" onClick={() => onNavigate?.('support')} className="min-h-10 rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white">Contact support</button></div>
    </div>
  );
}
