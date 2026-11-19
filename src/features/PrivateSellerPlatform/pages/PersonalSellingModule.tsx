// ============================================================
// KAYAD PERSONAL SELLING MODULE
// Listing creation and management rendered inside the canonical DashboardHub
// ============================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countByLifecycle, getListingLifecycle, type ListingLifecycleState } from '../../../utils/listingLifecycle';
import { ListingStatusBadge, ListingThumb, ListingFacts, ListingScoreRing } from '../../../components/listing/ListingPresentation';
import { createCar, updateCar, deleteCar, addCarImages, deleteCarImage, setCoverImage, LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES, LISTING_IMAGE_MAX_PER_LISTING, transitionMyListing, VehicleApiError, BackendCar } from '../../../services/vehicleApi';
import { calculateListingQualityScore } from '../../../utils/listingQualityScore';
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
  const personalRole = ['user', 'buyer', 'individual_seller'].includes(String(user?.role || '').toLowerCase());
  const { capability, loading: capLoading, error: capError, reload: reloadCap } = usePrivateSellerCapability(Boolean(user) && personalRole);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(() => {
    try {
      const saved = window.localStorage.getItem('kayad.privateSeller.listingDraft.v1');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as ListingDraft;
      return { ...parsed, photos: [] }; // Browsers cannot restore File objects; photos are reselected after reload.
    } catch { return null; }
  });
  useEffect(() => {
    try {
      if (listingDraft) {
        const { photos: _photos, ...serializable } = listingDraft;
        window.localStorage.setItem('kayad.privateSeller.listingDraft.v1', JSON.stringify(serializable));
      } else {
        window.localStorage.removeItem('kayad.privateSeller.listingDraft.v1');
      }
    } catch { /* Storage may be disabled; the in-session draft remains usable. */ }
  }, [listingDraft]);

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

  const normalizedRole = String(user?.role || '').toLowerCase();
  // Free policy returns an effective approved state for all eligible personal accounts.
  // Once approval is enabled, only an approved capability enters the workspace.
  // Existing individual_seller users retain the workspace during initial load to avoid a navigation flash.
  const sellerWorkspaceAllowed = capability
    ? capability.status === 'approved' && (!capability.packageMode || capability.packageMode === 'free')
    : normalizedRole === 'individual_seller';


  // Personal identities only: staff and business roles never see (or can be offered) personal selling controls here.
  if (!user || !personalRole) return null;

  if (!sellerWorkspaceAllowed) {
    return (
      <section className="rounded-2xl border border-[#D7E7E4] bg-white p-5 shadow-sm" data-testid="kayad-seller-access-state" data-kayad-seller-access-state={capLoading ? 'loading' : capability?.status || 'unavailable'}>
        {/* Reuse the canonical capability panel: it shows the REAL state (pending, rejected + reason, suspended, revoked, paid-package mode) and, where the server allows it, the application form. */}
        <SellerCapabilityPanel capability={capability} loading={capLoading} error={capError ? 'We could not confirm your selling access. Your personal buying account remains available.' : ''} onReload={reloadCap} onOpenWorkspace={() => onNavigate?.('dashboard:my-vehicles')} />
        {!capLoading && !capError && (!capability || capability.status === 'not_applicable' || (capability.status === 'none' && !capability.canApply)) && <div className="flex items-start gap-3"><ShieldCheck size={22} className="mt-0.5 text-[#0D9488]"/><div className="min-w-0"><h2 className="font-black text-[#0A3340]">Selling access</h2><p className="mt-1 text-sm leading-6 text-[#64748B]">Selling is currently restricted for this personal account. No separate seller account is required.</p></div></div>}
        {!capLoading && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={reloadCap} className="rounded-lg border border-[#D7E7E4] px-4 py-2 text-sm font-bold text-[#12576D]">Recheck access</button><button type="button" onClick={() => onNavigate?.('support')} className="rounded-lg bg-[#0A3340] px-4 py-2 text-sm font-bold text-white">Contact support</button></div>}
      </section>
    );
  }

  return (
      <section className="min-w-0 space-y-4" data-kayad-personal-selling-module="true" aria-label="My vehicles and selling tools">
        {activeSection !== 'listing-quality' && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7E7E4] pb-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#176B87]">Personal account · {activeSection === 'listing-wizard' ? 'My vehicles' : activeSection === 'trust-center' ? 'Verification' : activeSection === 'auction-verification' ? 'Auctions' : activeSection === 'help' ? 'Support' : 'Selling'}</p><h2 className="text-base font-black text-[#0A3340]">{activeSection === 'listing-wizard' ? 'Create a listing' : activeSection === 'trust-center' ? 'Verification & trust' : activeSection === 'auction-verification' ? 'Auction eligibility' : activeSection === 'help' ? 'Help & support' : 'Selling tools'}</h2></div>
        </div>}
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
            {activeSection === 'listing-wizard' && (isEmailVerified ? <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} onNavigate={handleSectionChange} onPublished={onRefreshListings} /> : <section className="rounded-2xl border border-[#D7E7E4] bg-white p-5" role="status"><h3 className="font-black text-[#0A3340]">Verify your email to publish a vehicle</h3><p className="mt-2 text-sm leading-6 text-[#64748B]">Your personal account can browse and buy vehicles now. Confirm your email address to create and publish private vehicle listings. No separate seller account or package is required.</p><button type="button" onClick={() => onNavigate?.('profile')} className="mt-4 rounded-xl bg-[#0A3340] px-4 py-2.5 text-sm font-bold text-white">Open my account</button></section>)}
            {activeSection === 'auction-verification' && (listingsError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{listingsError}<button type="button" onClick={onRefreshListings} className="ml-3 rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Retry</button></div> : <AuctionVerificationSection listings={listings} />)}
            {activeSection === 'trust-center' && <TrustCenterSection user={user} />}
            {activeSection === 'listing-quality' && <ListingQualitySection listings={listings} loading={listingsLoading} error={listingsError} onRefresh={onRefreshListings} />}
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

function ListingWizardSection({ draft, setDraft, onNavigate, onPublished }: {
  draft: ListingDraft | null;
  setDraft: (d: ListingDraft | null) => void;
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
      setPublishedCarId(result.data.id); setDraft(null); window.localStorage.removeItem('kayad.privateSeller.listingDraft.v1'); onPublished();
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
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Personal account · My vehicles</p><h1 className="break-words text-2xl font-bold text-[#0A3340]">Create vehicle listing</h1></div>
        <button type="button" onClick={() => { const saved = { ...form, step: currentStep }; setDraft(saved); try { const { photos: _photos, ...serializable } = saved; localStorage.setItem('kayad.privateSeller.listingDraft.v1', JSON.stringify(serializable)); } catch {} setValidationError('Draft saved on this device. Selected photos must be added again if you leave or reload this page.'); }} className="rounded-xl bg-[#DDF4F0] px-4 py-2.5 text-sm font-bold text-[#0A3340]">Save draft</button>
      </div>
      <section className="min-w-0 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#0A3340]">Step {currentStep} of {totalSteps}: {sectionTitle}</span><span className="text-sm text-slate-500">{Math.round(currentStep / totalSteps * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#13B8A6] transition-all" style={{ width: `${currentStep / totalSteps * 100}%` }} /></div>
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2" aria-label="Listing steps">{steps.map(step => <button type="button" key={step.id} onClick={() => { if (step.id < currentStep) { setCurrentStep(step.id); update('step', step.id); } }} disabled={step.id >= currentStep} aria-current={step.id === currentStep ? 'step' : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${step.id === currentStep ? 'bg-[#0F766E] text-white' : step.id < currentStep ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{step.id < currentStep ? '✓ ' : ''}{step.label}</button>)}</div>
      </section>
      <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-6">
        {publishedCarId ? <div className="mx-auto max-w-xl py-8 text-center"><CheckCircle className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Listing submitted</h2><p className="mt-2 text-slate-600">KAYARD KE received your vehicle listing. Seller access is free and approval-free; listing visibility follows the separate moderation policy.</p><p className="mt-2 break-all text-xs text-slate-400">Reference: {publishedCarId}</p><button type="button" onClick={() => onNavigate('listing-quality')} className="mt-6 rounded-xl bg-[#0A3340] px-5 py-3 font-bold text-white">Return to my vehicles</button></div> : <>
          {currentStep === 1 && <div className="mx-auto max-w-2xl py-6 text-center"><Car className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Let's get your vehicle listed</h2><p className="mt-3 text-slate-600">Provide accurate details and clear photographs. Your listing is submitted for the existing KAYARD KE review process; submission does not guarantee immediate publication.</p><div className="mt-5 rounded-xl bg-[#F6FAF9] p-4 text-left text-sm text-slate-600">Have your vehicle details, at least one photo, asking price and accurate ownership information ready.</div></div>}
          {currentStep === 2 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Make *<input className={fieldClass} maxLength={80} value={form.vehicleInfo.make} onChange={e => updateNested('vehicleInfo','make',e.target.value)} placeholder="e.g. Toyota" /></label><label className={labelClass}>Model *<input className={fieldClass} maxLength={100} value={form.vehicleInfo.model} onChange={e => updateNested('vehicleInfo','model',e.target.value)} placeholder="e.g. Harrier" /></label><label className={labelClass}>Year *<input className={fieldClass} type="number" min="1900" max={new Date().getFullYear()+1} value={form.vehicleInfo.year || ''} onChange={e => updateNested('vehicleInfo','year',Number(e.target.value))}/></label><label className={labelClass}>Body type<select className={fieldClass} value={form.vehicleInfo.bodyType} onChange={e => updateNested('vehicleInfo','bodyType',e.target.value)}><option value="">Select body type</option>{['SUV','Sedan','Hatchback','Wagon','Coupe','Pickup','Van','Truck','Convertible','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Registration number<input className={fieldClass} value={form.vehicleInfo.registration} onChange={e => updateNested('vehicleInfo','registration',e.target.value)} placeholder="Optional" maxLength={50}/></label><label className={labelClass}>VIN / chassis number<input className={fieldClass} value={form.vehicleInfo.vin} onChange={e => updateNested('vehicleInfo','vin',e.target.value)} placeholder="Optional" maxLength={50}/></label></div>}
          {currentStep === 3 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-[#0A3340]">Add vehicle photographs *</h2><p className="mt-1 text-sm text-slate-500">JPEG, PNG or WebP; up to 10 photos in this submission, maximum 5 MB each. Show the full vehicle clearly.</p></div><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-5 text-center"><Camera className="mb-2 text-teal-700" size={32}/><span className="font-bold text-[#0A3340]">Choose vehicle photos</span><span className="mt-1 text-xs text-slate-500">Select up to 10 images</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const files = Array.from(e.currentTarget.files || []) as File[]; const valid = files.filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size <= 5*1024*1024); const hadInvalid = valid.length !== files.length; update('photos', [...form.photos, ...valid].slice(0,10)); if (hadInvalid) setValidationError('Some files were skipped. Use JPG, PNG or WebP images no larger than 5 MB each.'); e.currentTarget.value=''; }}/></label><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photoPreviews.map(({file,url},i)=><div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-xl border border-slate-200"><img src={url} alt={`Vehicle photo ${i+1}`} className="h-32 w-full object-contain bg-slate-50"/><button type="button" onClick={()=>update('photos',form.photos.filter((_,index)=>index!==i))} className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-rose-700">Remove</button></div>)}</div><p className="text-sm text-slate-600">{form.photos.length} of 10 photos selected</p></div>}
          {currentStep === 4 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Mileage (km)<input className={fieldClass} type="number" min="0" max="2000000" value={form.details.mileage || ''} onChange={e=>updateNested('details','mileage',Number(e.target.value))}/></label><label className={labelClass}>Fuel type<select className={fieldClass} value={form.details.fuelType} onChange={e=>updateNested('details','fuelType',e.target.value)}>{['Petrol','Diesel','Hybrid','Plug-in Hybrid','Electric'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Transmission<select className={fieldClass} value={form.details.transmission} onChange={e=>updateNested('details','transmission',e.target.value)}>{['Automatic','Manual','CVT','Dual-Clutch'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Exterior colour<input className={fieldClass} value={form.details.color} onChange={e=>updateNested('details','color',e.target.value)} maxLength={60}/></label><label className={`${labelClass} sm:col-span-2`}>Vehicle location / town *<input className={fieldClass} value={form.details.city} onChange={e=>updateNested('details','city',e.target.value)} placeholder="e.g. Nairobi" maxLength={100}/></label><label className={`${labelClass} sm:col-span-2`}>Description *<textarea className={fieldClass} rows={5} maxLength={5000} value={form.details.description} onChange={e=>updateNested('details','description',e.target.value)} placeholder="Describe the vehicle, key features and anything a buyer should know."/><span className="mt-1 block text-xs font-normal text-slate-400">{form.details.description.length}/5000 characters</span></label><label className={labelClass}>Condition<select className={fieldClass} value={form.details.condition} onChange={e=>updateNested('details','condition',e.target.value)}>{['New','Like New','Excellent','Good','Fair','Used','Locally Used','Ex-Japan'].map(x=><option key={x}>{x}</option>)}</select></label></div>}
          {currentStep === 5 && <div className="max-w-2xl space-y-4"><h2 className="text-lg font-bold text-[#0A3340]">Ownership declaration</h2><p className="text-sm text-slate-600">Only list a vehicle you own or are legally authorised to sell. KAYARD KE may request supporting documents during its verification process.</p><label className="flex items-start gap-3 rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.ownerConfirmed} onChange={e=>updateNested('ownership','ownerConfirmed',e.target.checked)}/><span>I confirm that I am the vehicle owner or have authority from the owner to advertise and sell it. *</span></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.logbookAvailable} onChange={e=>updateNested('ownership','logbookAvailable',e.target.checked)}/><span>I have access to the vehicle logbook / ownership documentation.</span></label><p className="text-xs text-teal-700">This declaration is part of the listing form. The current listing API does not store ownership documents or the logbook checkbox; verification remains subject to the Trust Center process.</p></div>}
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
      <div><h1 className="text-xl font-black text-[#0A3340]">Verification & trust</h1><p className="mt-1 text-sm text-[#64748B]">Personal account checks that support safe buying and private selling.</p></div>
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const images = Array.isArray(listing.images) ? listing.images : [];
  const remaining = Math.max(0, LISTING_IMAGE_MAX_PER_LISTING - images.length);
  const upload = async (files: File[]) => {
    setError(''); setMessage('');
    const valid = files.filter((file) => LISTING_IMAGE_TYPES.includes(file.type) && file.size <= LISTING_IMAGE_MAX_BYTES);
    if (valid.length !== files.length) setError('Some photos were skipped. Use JPG, PNG or WebP up to 5 MB each.');
    if (!valid.length) return;
    if (valid.length > remaining) { setError(`You can add ${remaining} more photo(s) to this listing.`); return; }
    setBusy(true);
    try { const result = await addCarImages(listing.id, valid); if (!result?.success) throw new Error(result?.message || 'The server did not confirm the photo upload.'); setMessage('Photos uploaded successfully.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload photos.'); } finally { setBusy(false); }
  };
  const remove = async (index: number) => {
    if (images.length <= 1) { setError('Keep at least one photo on your listing.'); return; }
    if (!window.confirm('Remove this vehicle photo?')) return;
    setBusy(true); setError(''); setMessage('');
    try { const result = await deleteCarImage(listing.id, index); if (!result?.success) throw new Error(result?.message || 'The server did not confirm photo removal.'); setMessage('Photo removed.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove this photo.'); } finally { setBusy(false); }
  };
  const cover = async (index: number) => {
    setBusy(true); setError(''); setMessage('');
    try { const result = await setCoverImage(listing.id, index); if (!result?.success) throw new Error(result?.message || 'The server did not confirm the cover change.'); setMessage('Cover photo updated.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update cover photo.'); } finally { setBusy(false); }
  };
  return <section className="mt-4 border-t border-[#E5EFED] pt-4" aria-label="Manage vehicle photos">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-[#0A3340]">Vehicle photos</h4><p className="text-xs text-[#64748B]">{images.length} of {LISTING_IMAGE_MAX_PER_LISTING} photos · Cover photo appears first</p></div>
      <label className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-[#0A3340] px-3 text-xs font-bold text-white ${busy || remaining === 0 ? 'pointer-events-none opacity-50' : ''}`}>{busy ? 'Please wait…' : 'Add photos'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || remaining === 0} onChange={(event) => { const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = ''; void upload(files); }}/></label></div>
    {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}{message && <p role="status" className="mb-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p>}
    {images.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{images.map((image, index) => <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-[#D7E7E4] bg-[#F6FAF9]"><img src={image.thumb || image.url} alt={`Vehicle photo ${index + 1}`} className="h-28 w-full object-contain"/><div className="flex flex-wrap items-center justify-between gap-1 p-2"><span className="text-[10px] font-bold text-[#526875]">{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span><div className="flex gap-1">{index !== 0 && <button type="button" disabled={busy} onClick={() => void cover(index)} className="rounded border border-[#BDE5DE] px-2 py-1 text-[10px] font-bold text-[#12576D]">Make cover</button>}<button type="button" disabled={busy} onClick={() => void remove(index)} className="rounded border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700">Remove</button></div></div></div>)}</div> : <p className="rounded-lg bg-[#F6FAF9] p-3 text-xs text-[#64748B]">No photos are attached to this listing yet.</p>}
  </section>;
}

function ListingQualitySection({ listings, loading, error, onRefresh }: { listings: BackendCar[]; loading: boolean; error?: string; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ price: '', mileage: '', city: '', description: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [lifecycleBusyId, setLifecycleBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ListingLifecycleState>('all');
  const [photosOpen, setPhotosOpen] = useState<string[]>([]);

  const beginEdit = (listing: BackendCar) => {
    setActionError('');
    setActionNotice('');
    setEditingId(listing.id);
    setEditValues({
      price: String(listing.price ?? ''),
      mileage: String(listing.mileage ?? ''),
      city: String(listing.city || listing.location_city || ''),
      description: String(listing.description || ''),
    });
  };

  const saveEdit = async (listing: BackendCar) => {
    const price = Number(editValues.price);
    const mileage = Number(editValues.mileage);
    if (!Number.isFinite(price) || price <= 0) { setActionError('Enter a valid asking price greater than zero.'); return; }
    if (!Number.isFinite(mileage) || mileage < 0) { setActionError('Enter a valid mileage of zero or more.'); return; }
    if (!editValues.city.trim()) { setActionError('Enter the vehicle location.'); return; }
    setSavingId(listing.id); setActionError(''); setActionNotice('');
    try {
      const result = await updateCar(listing.id, {
        price,
        mileage,
        city: editValues.city.trim(),
        description: editValues.description.trim(),
      });
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm the listing update.');
      setEditingId(null);
      setActionNotice('Listing details updated successfully.');
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update this listing. Please try again.');
    } finally { setSavingId(null); }
  };

  const changeLifecycle = async (listing: BackendCar, action: 'hide' | 'publish' | 'mark_sold') => {
    const label = action === 'hide' ? 'hide this listing' : action === 'publish' ? 'republish this listing' : 'mark this vehicle as sold';
    if (!window.confirm(`Are you sure you want to ${label}? KAYARD KE will check auction, bid and transaction locks before applying the change.`)) return;
    setLifecycleBusyId(listing.id); setActionError(''); setActionNotice('');
    try {
      const result = await transitionMyListing(listing.id, action);
      if (!result?.success) throw new Error(result?.message || 'The server did not confirm this listing status change.');
      setActionNotice(action === 'hide' ? 'Listing hidden from the public marketplace.' : action === 'publish' ? 'Listing republished.' : 'Vehicle marked as sold.');
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
      if (editingId === listing.id) setEditingId(null);
      setActionNotice('Listing removed.');
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to remove this listing. Please try again.');
    } finally { setRemovingId(null); }
  };

  if (loading) return <p role="status" className="text-sm text-[#64748B]">Loading your listings…</p>;
  if (error) return <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]"><p>{error} We will not show a false empty state.</p><button type="button" onClick={onRefresh} className="mt-3 rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Retry</button></div>;

  // Filters are a read-only view over the EXISTING lifecycle mapping (utils/listingLifecycle): no second status system.
  const counts = countByLifecycle(listings);
  const filters: Array<{ id: 'all' | ListingLifecycleState; label: string; count: number }> = [
    { id: 'all', label: 'All', count: listings.length },
    { id: 'draft', label: 'Drafts', count: counts.draft },
    { id: 'under_review', label: 'Under review', count: counts.under_review },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'hidden', label: 'Paused / hidden', count: counts.hidden },
    { id: 'sold', label: 'Sold', count: counts.sold },
    ...(counts.reserved ? [{ id: 'reserved' as const, label: 'Reserved', count: counts.reserved }] : []),
  ];
  const visible = filter === 'all' ? listings : listings.filter((l) => getListingLifecycle(l.status, (l as any).sold).state === filter);
  const btn = 'inline-flex min-h-10 items-center rounded-lg border px-3 text-xs font-bold disabled:opacity-50';
  return (
    <div className="space-y-4" data-kayad-my-vehicles-management="true">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-[#082B40]">My Vehicles</h2><p className="mt-1 text-sm text-[#475569]">Manage your personal listings from the same account you use to buy vehicles.</p></div><button type="button" onClick={onRefresh} className="min-h-10 rounded-lg border border-[#DCE9E7] bg-white px-3 text-sm font-semibold text-[#0A4A5C]">Refresh listings</button></div>
      {listings.length > 0 && <div role="group" aria-label="Filter listings by status" className="flex flex-wrap gap-2">{filters.map((f) => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${filter === f.id ? 'border-[#082B40] bg-[#082B40] text-white' : 'border-[#DCE9E7] bg-white text-[#0A4A5C] hover:border-[#11B8A6]'}`}>{f.label}<span className={`rounded-full px-1.5 text-[11px] ${filter === f.id ? 'bg-white/20' : 'bg-[#F4F9F8]'}`}>{f.count}</span></button>)}</div>}
      {actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{actionError}</div>}
      {actionNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionNotice}</div>}
      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center"><Car className="mx-auto mb-3 h-8 w-8 text-[#11B8A6]"/><h2 className="font-bold text-[#0A3340]">No personal listings yet</h2><p className="mt-1 text-sm text-[#64748B]">Create your first listing to sell a vehicle through your personal account.</p></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center" role="status"><h2 className="font-bold text-[#0A3340]">No {filters.find((f) => f.id === filter)?.label.toLowerCase()} listings</h2><button type="button" onClick={() => setFilter('all')} className="mt-3 text-xs font-bold text-[#0B6B63] underline">Show all listings</button></div>
      ) : visible.map((l) => {
        const { score } = calculateListingQualityScore({
          hasTitle: !!l.title, hasBrand: !!l.brand, hasModel: !!l.model, hasYear: !!l.year,
          hasPrice: !!l.price, hasMileage: l.mileage != null, hasFuel: !!l.fuel,
          hasTransmission: !!l.transmission, hasBodyType: !!l.body_type,
          hasDescription: !!l.description, hasLocation: !!l.location_city,
          hasImages: (l.images?.length || 0) > 0, imageCount: l.images?.length || 0,
          hasFeatures: (l.features?.length || 0) > 0, featureCount: l.features?.length || 0,
          hasVin: !!l.vin, hasLogbook: !!l.registration_number,
          descriptionLength: l.description?.length || 0,
        });
        const isEditing = editingId === l.id;
        const status = String(l.status || '').toLowerCase();
        const info = getListingLifecycle(l.status, (l as any).sold);
        const place = l.location_city || l.city;
        const facts = [typeof l.mileage === 'number' ? `${l.mileage.toLocaleString('en-KE')} km` : null, l.fuel, place].filter(Boolean).join(' · ');
        // Remove is hidden exactly where the backend delete guard refuses it (sold / reserved); auction and bid locks are enforced server-side and reported on click.
        const canRemove = info.state !== 'sold' && info.state !== 'reserved';
        const busy = lifecycleBusyId === l.id;
        return (
          <article key={l.id} data-kayad-listing-card={l.id} className="rounded-xl border border-[#DCE9E7] bg-white p-3 shadow-[0_1px_2px_rgba(8,43,64,.05)] sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <ListingThumb src={l.images?.[0]?.thumb || l.images?.[0]?.url} fallback={l.images?.[0]?.url} alt={l.title} count={l.images?.length || 0} className="h-44 w-full sm:h-28 sm:w-40" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="truncate text-base font-black text-[#082B40]">{l.year} {l.brand} {l.model}</h3><p className="mt-0.5 text-xs text-[#475569]">{facts || 'Details not added yet'}</p></div>
                  <ListingStatusBadge status={l.status || 'draft'} label={info.label} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="text-base font-black text-[#0B6B63]">KES {Number(l.price || 0).toLocaleString('en-KE')}</span>{typeof l.views === 'number' && <span className="text-xs font-semibold text-[#5B7480]">{l.views.toLocaleString('en-KE')} views</span>}</div>
                  <div className="flex items-center gap-2" title="Listing completeness"><ListingScoreRing score={score}/><span className="text-[10px] font-semibold uppercase tracking-wide text-[#5B7480]">Quality</span></div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E5EFED] pt-3">
              <button type="button" onClick={() => isEditing ? setEditingId(null) : beginEdit(l)} className={`${btn} border-[#BDE5DE] text-[#0A4A5C]`}>{isEditing ? 'Close editor' : 'Edit details'}</button>
              <button type="button" aria-expanded={photosOpen.includes(l.id)} onClick={() => setPhotosOpen((cur) => cur.includes(l.id) ? cur.filter((x) => x !== l.id) : [...cur, l.id])} className={`${btn} border-[#DCE9E7] text-[#0A4A5C]`}>{photosOpen.includes(l.id) ? 'Close photos' : 'Manage photos'}</button>
              {status === 'available' && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'hide')} className={`${btn} border-[#DCE9E7] text-[#0A4A5C]`}>{busy ? 'Please wait…' : 'Hide / pause'}</button>}
              {status === 'hidden' && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'publish')} className={`${btn} border-[#BDE5DE] text-[#0D766F]`}>Republish</button>}
              {['available', 'hidden'].includes(status) && <button type="button" disabled={busy} onClick={() => void changeLifecycle(l, 'mark_sold')} className={`${btn} border-[#B8D9D6] text-[#082B40]`}>Mark as sold</button>}
              {canRemove && <button type="button" onClick={() => void removeListing(l)} disabled={removingId === l.id || savingId === l.id} className={`${btn} ml-auto border-rose-200 text-rose-700`}>{removingId === l.id ? 'Removing…' : 'Remove'}</button>}
            </div>
            {isEditing && <form className="mt-4 grid gap-3 border-t border-[#E5EFED] pt-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void saveEdit(l); }}>
              <label className="text-xs font-bold text-[#526875]">Asking price (KES)<input required min="1" type="number" inputMode="numeric" value={editValues.price} onChange={(event) => setEditValues((current) => ({ ...current, price: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              <label className="text-xs font-bold text-[#526875]">Mileage (km)<input required min="0" type="number" inputMode="numeric" value={editValues.mileage} onChange={(event) => setEditValues((current) => ({ ...current, mileage: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              <label className="text-xs font-bold text-[#526875] sm:col-span-2">Location<input required value={editValues.city} onChange={(event) => setEditValues((current) => ({ ...current, city: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE9E7] px-3 text-sm text-[#0A3340]"/></label>
              <label className="text-xs font-bold text-[#526875] sm:col-span-2">Description<textarea rows={3} value={editValues.description} onChange={(event) => setEditValues((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#DCE9E7] px-3 py-2 text-sm text-[#0A3340]"/></label>
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-lg border border-[#DCE9E7] px-4 text-xs font-bold text-[#526875]">Cancel</button><button type="submit" disabled={savingId === l.id} className="min-h-10 rounded-lg bg-[#082B40] px-4 text-xs font-bold text-white disabled:opacity-50">{savingId === l.id ? 'Saving…' : 'Save changes'}</button></div>
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
      <div><h1 className="text-xl font-black text-[#0A3340]">Help & support</h1><p className="mt-1 text-sm text-[#64748B]">Guidance for buying and selling through your one personal account.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{topics.map((topic) => <article key={topic.title} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><h2 className="text-sm font-bold text-[#0A3340]">{topic.title}</h2><p className="mt-2 text-xs leading-5 text-[#64748B]">{topic.detail}</p></article>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F0F8F6] p-4"><div><p className="text-sm font-bold text-[#0A3340]">Need help with your account?</p><p className="mt-1 text-xs text-[#64748B]">Open KAYARD KE support for account or transaction assistance.</p></div><button type="button" onClick={() => onNavigate?.('support')} className="min-h-10 rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white">Contact support</button></div>
    </div>
  );
}
