// ============================================================
// KAYAD PRIVATE SELLER PLATFORM - GUIDED SELLING EXPERIENCE
// Sections 1-17: Step-by-step seller journey
// ============================================================

import BrandMark from '../../../components/BrandMark';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { buildAuthPath } from '../../../utils/authIntent';
import { motion, AnimatePresence } from 'framer-motion';
import { createCar, getMyListings, VehicleApiError, BackendCar } from '../../../services/vehicleApi';
import { getMyEscrows, BackendEscrow } from '../../../services/escrowApi';
import { calculateListingQualityScore } from '../../../utils/listingQualityScore';
import PhoneVerification from '../../../components/PhoneVerification';
import { AuctionVerificationSection } from '../components/AuctionVerificationSection';
import type { UserProfile } from '../../../types';
import {
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight, Menu, X,
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
import { useBuyingActivity, metricLabel, summariseEscrows } from '../hooks/useBuyingActivity';
import { countByLifecycle } from '../../../utils/listingLifecycle';

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

interface EscrowTransaction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  buyerName: string;
  salePrice: number;
  escrowAmount: number;
  depositAmount: number;
  depositPaid: boolean;
  status: 'pending' | 'deposit_received' | 'inspection_passed' | 'funds_released' | 'completed' | 'cancelled' | 'disputed';
  milestones: { name: string; completed: boolean; date?: string }[];
  createdAt: string;
  completedAt?: string;
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
  | 'home'
  | 'listing-wizard'
  | 'auction-verification'
  | 'trust-center'
  | 'listing-quality'
  | 'escrow'
  | 'help'
  | 'settings';

interface PrivateSellerPlatformProps {
  user?: UserProfile | null;
  onOpenAuth?: (intent?: 'seller' | 'dealer') => void;
  onNavigate?: (nav: string) => void;
  onLogout?: () => void;
}

export default function PrivateSellerPlatform({ user, onOpenAuth, onNavigate, onLogout }: PrivateSellerPlatformProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>('home');
  // Phase 13E: seller eligibility comes from the real capability state of the SAME personal account.
  const personalRole = ['user', 'buyer', 'individual_seller'].includes(String(user?.role || '').toLowerCase());
  const { capability, loading: capLoading, error: capError, reload: reloadCap } = usePrivateSellerCapability(Boolean(user) && personalRole);
  const [sellerAccountType, setSellerAccountType] = useState<'seller' | 'dealer'>('seller');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);
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

  // The dashboard uses only the signed-in seller's backend listings and
  // escrow records. Unsupported seller capabilities remain unavailable
  // rather than being represented with local or synthetic records.
  const [myListings, setMyListings] = useState<BackendCar[]>([]);
  const [myEscrows, setMyEscrows] = useState<BackendEscrow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [escrowsError, setEscrowsError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const requestGeneration = useRef(0);

  const loadSellerData = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!user?.id) {
      setDataLoading(false);
      setMyListings([]);
      setMyEscrows([]);
      setListingsError(null);
      setEscrowsError(null);
      return;
    }
    setDataLoading(true);
    const [listingsResult, escrowsResult] = await Promise.allSettled([getMyListings(), getMyEscrows()]);
    if (generation !== requestGeneration.current) return;
    if (listingsResult.status === 'fulfilled') {
      setMyListings(listingsResult.value);
      setListingsError(null);
    } else {
      setListingsError('Your listings could not be loaded. Please try again.');
    }
    if (escrowsResult.status === 'fulfilled') {
      setMyEscrows(escrowsResult.value);
      setEscrowsError(null);
    } else {
      setEscrowsError('Your escrow activity could not be loaded. Please try again.');
    }
    if (listingsResult.status === 'fulfilled' || escrowsResult.status === 'fulfilled') setLastRefreshedAt(new Date());
    setDataLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadSellerData();
    return () => { requestGeneration.current += 1; };
  }, [loadSellerData]);

  const handleSectionChange = useCallback((section: PlatformSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  const normalizedRole = String(user?.role || '').toLowerCase();
  // Free policy returns an effective approved state for all eligible personal accounts.
  // Once approval is enabled, only an approved capability enters the workspace.
  // Existing individual_seller users retain the workspace during initial load to avoid a navigation flash.
  const sellerWorkspaceAllowed = capability
    ? capability.status === 'approved' && (!capability.packageMode || capability.packageMode === 'free')
    : normalizedRole === 'individual_seller';

  if (!user || !sellerWorkspaceAllowed) {
    const isDealer = sellerAccountType === 'dealer';
    const signedInWithoutSellerAccess = Boolean(user);
    return (
      <section className="kayad-sell-entry" aria-labelledby="kayad-sell-entry-title">
        <div className="kayad-sell-entry__hero">
          <span className="kayad-sell-entry__eyebrow"><Car size={14} aria-hidden="true" /> SELL ON KAYAD</span>
          <h1 id="kayad-sell-entry-title">Your next sale should feel simpler.</h1>
          <p>Present your vehicle clearly and manage genuine buyer conversations from one dedicated workspace. Private seller access is free and does not require a seller application or package.</p>
          <div className="kayad-sell-entry__trust-row" aria-label="Seller workflow benefits">
            <span><ShieldCheck size={16} aria-hidden="true" /> Free private selling · listing moderation remains separate</span>
            <span><MessageSquare size={16} aria-hidden="true" /> Buyer conversations</span>
            <span><FileCheck size={16} aria-hidden="true" /> Inspection options</span>
          </div>
        </div>

        <div className="kayad-sell-entry__content">
          <div className="kayad-sell-entry__intro">
            <span>CHOOSE YOUR SELLING WORKSPACE</span>
            <h2>Built for how you sell.</h2>
            <p>{signedInWithoutSellerAccess ? (personalRole ? 'You are signed in with your personal account. Private selling is added to this same account once approved; you do not need a second account.' : 'Your current account is signed in, but seller tools are not enabled for this role. Request the correct access instead of creating a duplicate account.') : 'Start with the right account type. You can sign in with an existing KAYAD account instead of creating another one.'}</p>
          </div>
          <div className="kayad-sell-entry__choices">
            <button type="button" aria-pressed={!isDealer} onClick={() => setSellerAccountType('seller')} className={`kayad-sell-choice ${!isDealer ? 'is-selected' : ''}`}>
              <span className="kayad-sell-choice__icon"><User size={22} aria-hidden="true" /></span>
              <span className="kayad-sell-choice__copy"><strong>Private seller</strong><small>For an individual selling their own vehicle.</small><em>Free personal listing workspace · no seller approval or package required</em></span>
              <span className="kayad-sell-choice__check" aria-hidden="true">{!isDealer ? '✓' : ''}</span>
            </button>
            <button type="button" aria-pressed={isDealer} onClick={() => setSellerAccountType('dealer')} className={`kayad-sell-choice kayad-sell-choice--dealer ${isDealer ? 'is-selected' : ''}`}>
              <span className="kayad-sell-choice__icon"><Warehouse size={22} aria-hidden="true" /></span>
              <span className="kayad-sell-choice__copy"><strong>Dealership</strong><small>For a showroom or business managing multiple vehicles.</small><em>Commercial inventory tools · Business review required</em></span>
              <span className="kayad-sell-choice__check" aria-hidden="true">{isDealer ? '✓' : ''}</span>
            </button>
          </div>
          <div className="kayad-sell-entry__actions">
            {signedInWithoutSellerAccess && personalRole && <div className="w-full"><SellerCapabilityPanel capability={capability} loading={capLoading} error={capError} onReload={reloadCap} onOpenWorkspace={() => onNavigate?.('seller-platform')} /></div>}
            {!(signedInWithoutSellerAccess && personalRole) && <button type="button" className="kayad-sell-entry__primary" onClick={() => signedInWithoutSellerAccess ? onNavigate?.('support') : onOpenAuth?.(sellerAccountType)}>
              {signedInWithoutSellerAccess ? 'Contact Support about seller access' : `Continue as ${isDealer ? 'a dealership' : 'a private seller'}`} <ArrowRight size={17} aria-hidden="true" />
            </button>}
            {!signedInWithoutSellerAccess && <Link className="kayad-sell-entry__signin" to={buildAuthPath('login', { intent: sellerAccountType, next: '/?nav=seller-platform' })}>Already have an account? Sign in</Link>}
          </div>
          <p className="kayad-sell-entry__disclaimer">{signedInWithoutSellerAccess ? 'Seller access is role-controlled. Support can direct your request to the existing KAYAD review process; this screen does not change permissions.' : 'Creating an account does not automatically approve a seller or publish a listing. KAYAD reviews eligibility before seller tools are activated.'}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen flex kayad-portal kayad-portal--seller" data-kayad-portal="seller" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onAppNavigate={onNavigate}
          user={user}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={36} nameClassName="text-white font-bold text-base" />
            <span className="truncate text-white font-semibold text-sm">My KAYAD Account</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            aria-label={mobileMenuOpen ? 'Close seller navigation' : 'Open seller navigation'}
            aria-expanded={mobileMenuOpen}
            aria-controls="seller-mobile-navigation"
          >
            {mobileMenuOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-x-0 bottom-0 top-16 z-40"
            style={{ backgroundColor: 'rgba(10, 51, 64, 0.5)' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              id="seller-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Seller navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="h-full p-4 overflow-y-auto overscroll-contain"
              style={{ backgroundColor: KAYAD_THEME.navy, width: 'min(86vw, 360px)', maxWidth: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                onAppNavigate={onNavigate}
                user={user}
                onLogout={onLogout}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="min-w-0 flex-1 min-h-screen pt-16 lg:pt-0 overflow-x-hidden">
        <div className="min-w-0 w-full max-w-7xl mx-auto px-3 py-4 sm:p-5 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'home' && <SellerHomeSection listings={myListings} escrows={myEscrows} loading={dataLoading} listingsError={listingsError} escrowsError={escrowsError} lastRefreshedAt={lastRefreshedAt} onRefresh={loadSellerData} userName={user?.name} onNavigate={handleSectionChange} policyOpen={capability?.source === 'policy_default'} />}
              {activeSection === 'listing-wizard' && <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} onNavigate={handleSectionChange} onPublished={loadSellerData} />}
              {activeSection === 'auction-verification' && <AuctionVerificationSection listings={myListings} />}
              {activeSection === 'trust-center' && <TrustCenterSection />}
              {activeSection === 'listing-quality' && <ListingQualitySection listings={myListings} loading={dataLoading} />}
              {activeSection === 'escrow' && <EscrowCenterSection transactions={myEscrows} loading={dataLoading} />}
              {activeSection === 'help' && <HelpCenterSection />}
              {activeSection === 'settings' && <SellerSettingsSection user={user} onLogout={onLogout} onNavigate={onNavigate} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

function SidebarContent({
  activeSection,
  onSectionChange,
  onAppNavigate,
  user,
  onLogout,
}: {
  activeSection: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
  onAppNavigate?: (nav: string) => void;
  user?: UserProfile | null;
  onLogout?: () => void;
}) {
  type NavEntry = { key: string; label: string; icon: React.ReactNode; section?: PlatformSection; app?: string };
  // One personal account: buying, selling, transactions and account tools, grouped. Every entry reuses an existing destination.
  const navGroups: { heading: string; items: NavEntry[] }[] = [
    { heading: 'Personal account', items: [
      { key: 'overview', label: 'Overview', icon: <Home size={20} />, section: 'home' },
      { key: 'browse', label: 'Browse marketplace', icon: <Search size={20} />, app: 'marketplace' },
      { key: 'saved', label: 'Saved vehicles', icon: <Heart size={20} />, app: 'saved' },
      { key: 'offers', label: 'Offers & enquiries', icon: <MessageSquare size={20} />, app: 'dashboard' },
    ] },
    { heading: 'Selling', items: [
      { key: 'create', label: 'Create listing', icon: <PlusCircleIcon size={20} />, section: 'listing-wizard' },
      { key: 'listings', label: 'My listings', icon: <Car size={20} />, section: 'listing-quality' },
    ] },
    { heading: 'Transactions', items: [
      { key: 'escrow', label: 'Escrow & deals', icon: <CreditCard size={20} />, section: 'escrow' },
    ] },
    { heading: 'Account', items: [
      { key: 'trust', label: 'Verification & trust', icon: <BadgeCheck size={20} />, section: 'trust-center' },
      { key: 'auction', label: 'Auction verification', icon: <ShieldCheck size={20} />, section: 'auction-verification' },
      { key: 'profile', label: 'My profile', icon: <User size={20} />, app: 'profile' },
      { key: 'settings', label: 'Settings', icon: <Settings size={20} />, section: 'settings' },
      { key: 'help', label: 'Help & support', icon: <HelpCircle size={20} />, section: 'help' },
    ] },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="text-white">
            <BrandMark size={36} nameClassName="text-white font-bold text-lg" />
          </div>
          <div>
            <p className="text-white/60 text-xs">Personal account</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-4">
          {navGroups.map(group => (
            <div key={group.heading} role="group" aria-label={group.heading}>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/40">{group.heading}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = Boolean(item.section) && activeSection === item.section;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => { if (item.section) onSectionChange(item.section); else if (item.app) onAppNavigate?.(item.app); }}
                      disabled={!item.section && !onAppNavigate}
                      className={`w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#13B8A6] disabled:opacity-40 ${
                        isActive ? 'bg-[#13B8A6]/20 text-[#A7F0E6]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium text-sm text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="px-3 pb-3">
        <button type="button" onClick={() => onLogout?.()} disabled={!onLogout} className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50" aria-label="Log out of KAYAD">
          <LogOut size={17} /> Log out
        </button>
      </div>
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckVerified size={16} style={{ color: KAYAD_THEME.emerald }} />
            <span className="text-white/70 text-xs">Personal account status</span>
          </div>
          <p className="text-white text-sm font-bold">Account &amp; trust</p>
          <p className="mt-1 text-white/60 text-[11px] leading-4">One KAYAD account for buying and selling. Review verification steps in Verification & trust.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SELLER ACCOUNT SETTINGS
// ============================================================

function SellerSettingsSection({ user, onLogout, onNavigate }: {
  user?: UserProfile | null;
  onLogout?: () => void;
  onNavigate?: (nav: string) => void;
}) {
  return (
    <section className="w-full min-w-0 space-y-6" aria-labelledby="seller-settings-title">
      <header className="rounded-2xl bg-white border border-[#D7E7E4] p-5 sm:p-7">
        <p className="text-xs font-bold tracking-widest text-[#176B87] uppercase">Account preferences</p>
        <h1 id="seller-settings-title" className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0A3340]">Seller settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your personal KAYAD account and security preferences. Buying and selling remain available from this one account.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="min-w-0 rounded-2xl bg-white border border-[#D7E7E4] p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#DDF4F0] text-[#0A3340] grid place-items-center"><User size={21}/></div>
            <div className="min-w-0"><h2 className="font-bold text-[#0A3340]">Personal account</h2><p className="text-xs text-slate-500">Your unified buyer and seller identity</p></div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Name</dt><dd className="font-semibold text-[#0A3340] break-words">{user?.name || 'KAYAD account holder'}</dd></div>
            <div><dt className="text-xs text-slate-500">Email</dt><dd className="font-semibold text-[#0A3340] break-all">{user?.email || 'Not available'}</dd></div>
            <div><dt className="text-xs text-slate-500">Account type</dt><dd className="font-semibold text-[#0A3340]">Personal · Buyer and private seller</dd></div>
          </dl>
          <button type="button" onClick={() => onNavigate?.('profile')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0A3340] px-4 text-sm font-bold text-white hover:bg-[#12576D]">Manage account details <ArrowRight size={16}/></button>
        </article>
        <article className="min-w-0 rounded-2xl bg-white border border-[#D7E7E4] p-5">
          <div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-[#DDF4F0] text-[#0A3340] grid place-items-center"><Shield size={21}/></div><div><h2 className="font-bold text-[#0A3340]">Sign-in and security</h2><p className="text-xs text-slate-500">Protect access to your account</p></div></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Update your account credentials and security details from the central KAYAD account settings.</p>
          <button type="button" onClick={() => onNavigate?.('profile')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E7E4] px-4 text-sm font-bold text-[#0A3340] hover:bg-[#F6FAF9]">Open account settings <ArrowRight size={16}/></button>
        </article>
      </div>
      <div className="rounded-2xl border border-red-100 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h2 className="font-bold text-[#0A3340]">Sign out</h2><p className="mt-1 text-sm text-slate-600">Sign out of this KAYAD account on this device.</p></div>
        <button type="button" onClick={() => onLogout?.()} disabled={!onLogout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"><LogOut size={16}/> Log out</button>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 1: SELLER HOME
// ============================================================

function SellerHomeSection({ listings, escrows, loading, listingsError, escrowsError, lastRefreshedAt, onRefresh, userName, onNavigate, policyOpen = false }: {
  listings: BackendCar[];
  escrows: BackendEscrow[];
  loading: boolean;
  listingsError: string | null;
  escrowsError: string | null;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
  userName?: string;
  onNavigate: (s: PlatformSection) => void;
  policyOpen?: boolean;
}) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const lifecycle = countByLifecycle(listings);
  const activeListings = lifecycle.active + lifecycle.reserved;
  const soldListings = lifecycle.sold;
  const draftListings = lifecycle.draft;
  const pendingListings = lifecycle.under_review;
  const hiddenListings = lifecycle.hidden;
  const buying = useBuyingActivity(true);
  const txn = summariseEscrows(escrows);
  const txnUnavailable = escrowsError !== null && escrows.length === 0;
  const txnMetric = (n: number) => (txnUnavailable ? 'Unavailable' : loading && escrows.length === 0 ? '—' : String(n));
  const viewCountsComplete = listings.every((listing) => typeof listing.views === 'number' && Number.isFinite(listing.views));
  const totalViews = listings.reduce((sum, listing) => sum + (typeof listing.views === 'number' && Number.isFinite(listing.views) ? listing.views : 0), 0);
  const openEscrows = escrows.filter((escrow) => !['closed', 'cancelled', 'refunded', 'released'].includes(escrow.status)).length;
  const refreshedLabel = lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const listingsMetric = listingsError && listings.length === 0 ? 'Unavailable' : loading && listings.length === 0 ? '—' : String(listings.length);
  const activeMetric = listingsError && listings.length === 0 ? 'Unavailable' : loading && listings.length === 0 ? '—' : String(activeListings);
  const reviewMetric = listingsError && listings.length === 0 ? 'Unavailable' : loading && listings.length === 0 ? '—' : String(pendingListings);
  const viewsMetric = listingsError && listings.length === 0 ? 'Unavailable' : loading && listings.length === 0 ? '—' : listings.length > 0 && !viewCountsComplete ? 'Unavailable' : totalViews.toLocaleString();
  const escrowMetric = escrowsError && escrows.length === 0 ? 'Unavailable' : loading && escrows.length === 0 ? '—' : String(openEscrows);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl p-5 sm:p-6 lg:p-8" style={{ background: `linear-gradient(125deg, ${KAYAD_THEME.navy} 0%, ${KAYAD_THEME.navyLight} 68%, #176B87 100%)` }} aria-labelledby="seller-dashboard-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100"><ShieldCheck size={14} aria-hidden="true" /> KAYAD PERSONAL ACCOUNT</div>
            <h1 id="seller-dashboard-title" className="text-2xl font-bold text-white sm:text-3xl">{greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Your KAYAD marketplace account. Discover vehicles, manage your listings and follow your transactions in one place.</p>
            {policyOpen && <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100">Free personal listing workspace · no seller approval or package required</p>}
            <p className="mt-3 text-xs text-white/60" aria-live="polite">{loading ? 'Refreshing your account data…' : refreshedLabel ? `Last updated ${refreshedLabel}` : 'Account data has not been refreshed yet'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Refresh seller dashboard data"><RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Refresh</button>
            <button type="button" onClick={() => onNavigate('listing-wizard')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ backgroundColor: '#0F766E' }}><PlusCircle size={17} aria-hidden="true" /> Create Listing</button>
          </div>
        </div>
      </motion.section>

      {listingsError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3 text-rose-800"><AlertTriangle size={19} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">Listings unavailable</p><p className="mt-1 text-sm">{listingsError} Existing values, if any, are retained and may be stale.</p></div></div><button type="button" onClick={onRefresh} disabled={loading} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50">Try again</button></div>}

      <section aria-label="Seller overview" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <SellerMetric icon={<Car size={19} />} label="Total Listings" value={listingsMetric} hint="Your vehicles" color="#176B87" />
        <SellerMetric icon={<CheckCircle2 size={19} />} label="Active Listings" value={activeMetric} hint="Live marketplace" color="#0D9488" />
        <SellerMetric icon={<Clock3 size={19} />} label="Under Review" value={reviewMetric} hint="Awaiting review" color="#B7791F" />
        <SellerMetric icon={<Eye size={19} />} label="Listing Views" value={viewsMetric} hint="Across your listings" color="#176B87" />
        <SellerMetric icon={<ShieldCheck size={19} />} label="Open Deals" value={escrowMetric} hint="Account-linked escrow activity" color="#7C3AED" />
      </section>

      <section aria-label="Buying and transactions" className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-[#12576D]">Buying &amp; transactions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <SellerMetric icon={<Heart size={19} />} label="Saved Vehicles" value={metricLabel(buying.saved)} hint="Your favourites" color="#BE185D" />
          <SellerMetric icon={<MessageSquare size={19} />} label="Negotiations" value={metricLabel(buying.negotiations)} hint="Offers and enquiries you started" color="#176B87" />
          <SellerMetric icon={<Clock3 size={19} />} label="Awaiting Payment" value={txnMetric(txn.pendingFunding)} hint="Escrow pending funding" color="#B7791F" />
          <SellerMetric icon={<CheckCircle2 size={19} />} label="Completed Deals" value={txnMetric(txn.completed)} hint="Released or closed escrow" color="#0D9488" />
          <SellerMetric icon={<AlertTriangle size={19} />} label="Refunds & Cancellations" value={txnMetric(txn.refundedOrCancelled)} hint="Refunded or cancelled escrow" color="#7C3AED" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="min-w-0 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="seller-listings-heading">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="seller-listings-heading" className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>My Listings</h2><p className="mt-1 text-sm text-slate-500">Your latest vehicles and their current status.</p></div><button type="button" onClick={() => onNavigate('listing-quality')} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#D7E7E4] px-3 py-2 text-sm font-semibold hover:bg-[#F6FAF9]" style={{ color: KAYAD_THEME.navy }}>View all <ChevronRight size={15} aria-hidden="true" /></button></div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#E7F5F2] px-3 py-1.5 font-semibold text-[#0F766E]">Active {activeListings}</span><span className="rounded-full bg-warning/10 px-3 py-1.5 font-semibold text-warning">Under review {pendingListings}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">Drafts {draftListings}</span><span className="rounded-full bg-[#F6FAF9] px-3 py-1.5 font-semibold text-[#12576D]">Sold {soldListings}</span>{hiddenListings > 0 && <span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700" title="Hidden from the marketplace; contact support to find out what is needed to publish it">Not published {hiddenListings}</span>}</div>
          {loading && listings.length === 0 ? <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><RefreshCw size={17} className="animate-spin" aria-hidden="true" /> Loading your listings…</div> : listingsError && listings.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><AlertCircle size={24} className="mx-auto mb-2 text-rose-500" aria-hidden="true" /><p className="font-semibold text-slate-800">We couldn't retrieve your listings</p><p className="mt-1 text-sm text-slate-500">Try refreshing. We won't show a false empty state.</p></div> : listings.length === 0 ? <div className="rounded-xl border border-dashed border-[#D7E7E4] bg-[#F8FBFA] p-7 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF4F0] text-[#12576D]"><Car size={24} aria-hidden="true" /></div><p className="font-semibold text-slate-800">Your first listing starts here</p><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add your vehicle details and photos to begin the KAYAD review process.</p><button type="button" onClick={() => onNavigate('listing-wizard')} className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: KAYAD_THEME.navy }}><Plus size={16} aria-hidden="true" /> Create your first listing</button></div> : <div className="space-y-3">{listings.slice(0, 5).map((listing, i) => <ListingCard key={listing.id} listing={listing} delay={i * 0.04} />)}</div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="seller-actions-heading"><h2 id="seller-actions-heading" className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>Quick Actions</h2><p className="mt-1 text-sm text-slate-500">Common tasks for your KAYAD account.</p><div className="mt-4 space-y-2">
            <SellerAction icon={<PlusCircle size={17} />} title="Create a listing" description="Start a new vehicle submission" onClick={() => onNavigate('listing-wizard')} />
            <SellerAction icon={<ClipboardList size={17} />} title="Manage my listings" description="Review statuses and listing details" onClick={() => onNavigate('listing-quality')} />
            <SellerAction icon={<ShieldCheck size={17} />} title="Trust & verification" description="Review your account verification and next steps" onClick={() => onNavigate('trust-center')} />
            <SellerAction icon={<CreditCard size={17} />} title="Escrow & sale progress" description="Review deals associated with your account" onClick={() => onNavigate('escrow')} />
            <SellerAction icon={<HelpCircle size={17} />} title="Help & support" description="Find guidance for selling on KAYAD" onClick={() => onNavigate('help')} />
          </div></section>

          <section className="rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="seller-activity-heading"><div className="mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-[#176B87]" aria-hidden="true" /><h2 id="seller-activity-heading" className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>Seller Snapshot</h2></div>
            {escrowsError && escrows.length === 0 ? <p role="status" className="text-sm text-warning">Escrow activity is temporarily unavailable.</p> : <div className="space-y-3"><SellerSnapshotRow label="Open drafts" value={listingsError && listings.length === 0 ? 'Unavailable' : loading && listings.length === 0 ? '—' : String(draftListings)} /><SellerSnapshotRow label="Released / closed records" value={escrowsError ? 'Unavailable' : loading && escrows.length === 0 ? '—' : String(escrows.filter((escrow) => ['closed', 'released'].includes(escrow.status)).length)} /><SellerSnapshotRow label="Escrow records" value={escrowsError ? 'Unavailable' : String(escrows.length)} /></div>}
            <p className="mt-4 text-xs leading-5 text-slate-500">Metrics reflect records returned by the authenticated account's existing APIs. Escrow activity may include deals where the account is a buyer or seller; views are engagement counts, not unique buyers or confirmed inquiries.</p>
          </section>
        </aside>
      </div>
      {escrowsError && <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning"><div className="flex items-start gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><div><strong>Escrow summary unavailable.</strong> {escrowsError} Previously loaded escrow values may be stale; listing information remains available independently.</div></div></div>}
    </div>
  );
}

function SellerMetric({ icon, label, value, hint, color }: { icon: React.ReactNode; label: string; value: string; hint: string; color: string }) {
  return <div className="min-w-0 rounded-xl border border-[#D7E7E4] bg-white p-3 shadow-sm sm:p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ color, backgroundColor: `${color}14` }}>{icon}</div><p className="break-words text-xl font-bold leading-tight text-[#0A3340] sm:text-2xl">{value}</p><p className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">{label}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p></div>;
}

function SellerAction({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-[#E2ECEA] p-3 text-left transition hover:border-[#8ECFC4] hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E7F5F2] text-[#12576D]" aria-hidden="true">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#0A3340]">{title}</span><span className="mt-0.5 block text-xs leading-4 text-slate-500">{description}</span></span><ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#176B87]" aria-hidden="true" /></button>;
}

function SellerSnapshotRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"><span className="text-sm text-slate-600">{label}</span><span className="text-sm font-bold text-[#0A3340]">{value}</span></div>;
}
function QuickStat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-white text-xl font-bold">{value}</p>
        <p className="text-white/60 text-xs">{label}</p>
      </div>
    </div>
  );
}

/** Whole vehicle visible (object-contain on a neutral ground). A failed load is shown explicitly as "Photo unavailable"
 *  and reported to the console with the failing URL: storage/permission faults are surfaced, not hidden. */
function VehicleImage({ urls, alt, className = '', compact = false }: { urls: (string | undefined)[]; alt: string; className?: string; compact?: boolean }) {
  const candidates = urls.filter((u): u is string => Boolean(u));
  const [index, setIndex] = React.useState(0);
  const src = candidates[index];
  if (!src) {
    return (
      <div role="img" aria-label={candidates.length ? `${alt}: photo unavailable` : `${alt}: no photo uploaded`} className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-center text-slate-500 ${className}`}>
        <Car size={compact ? 22 : 40} aria-hidden="true" />
        {!compact && <span className="px-2 text-[11px] font-semibold">{candidates.length ? 'Photo unavailable' : 'No photo yet'}</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`h-full w-full bg-slate-100 object-contain ${className}`}
      onError={() => { console.warn('[KAYAD] vehicle image failed to load:', src); setIndex((i) => i + 1); }}
    />
  );
}

function ListingCard({ listing, delay }: { listing: BackendCar; delay: number }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    draft: { bg: 'bg-[#EEF7F5]', text: 'text-[#64748B]' },
    sold: { bg: 'bg-[#DDF4F0]', text: 'text-[#12576D]' },
    pending: { bg: 'bg-[#DDF4F0]', text: 'text-[#12576D]' },
  };
  const statusClass = statusColors[listing.status || 'draft'] || statusColors.draft;
  const image = listing.images?.[0]?.thumb || listing.images?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-32 md:h-auto flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
          <VehicleImage urls={[listing.images?.[0]?.thumb, listing.images?.[0]?.url]} alt={`${listing.year} ${listing.brand} ${listing.model}`} />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{listing.year} {listing.brand} {listing.model}</h3>
              {listing.mileage != null && <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{listing.mileage.toLocaleString()} km</p>}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusClass.bg} ${statusClass.text}`}>
              {listing.status || 'draft'}
            </span>
          </div>
          <p className="text-xl font-bold mb-3" style={{ color: KAYAD_THEME.gold }}>KES {Number(listing.price || 0).toLocaleString('en-KE')}</p>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            <span className="flex items-center gap-1"><EyeIcon size={14} /> {listing.views || 0}</span>
          </div>
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
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-hidden pb-8" data-testid="private-seller-listing-wizard">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Private seller workspace</p><h1 className="break-words text-2xl font-bold text-[#0A3340]">Create vehicle listing</h1></div>
        <button type="button" onClick={() => { const saved = { ...form, step: currentStep }; setDraft(saved); try { const { photos: _photos, ...serializable } = saved; localStorage.setItem('kayad.privateSeller.listingDraft.v1', JSON.stringify(serializable)); } catch {} setValidationError('Draft saved on this device. Selected photos must be added again if you leave or reload this page.'); }} className="rounded-xl bg-[#DDF4F0] px-4 py-2.5 text-sm font-bold text-[#0A3340]">Save draft</button>
      </div>
      <section className="min-w-0 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#0A3340]">Step {currentStep} of {totalSteps}: {sectionTitle}</span><span className="text-sm text-slate-500">{Math.round(currentStep / totalSteps * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#13B8A6] transition-all" style={{ width: `${currentStep / totalSteps * 100}%` }} /></div>
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2" aria-label="Listing steps">{steps.map(step => <button type="button" key={step.id} onClick={() => { if (step.id < currentStep) { setCurrentStep(step.id); update('step', step.id); } }} disabled={step.id >= currentStep} aria-current={step.id === currentStep ? 'step' : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${step.id === currentStep ? 'bg-[#13B8A6] text-white' : step.id < currentStep ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{step.id < currentStep ? '✓ ' : ''}{step.label}</button>)}</div>
      </section>
      <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-6">
        {publishedCarId ? <div className="mx-auto max-w-xl py-8 text-center"><CheckCircle className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Listing submitted</h2><p className="mt-2 text-slate-600">KAYAD received your vehicle listing. Seller access is free and approval-free; listing visibility follows the separate moderation policy.</p><p className="mt-2 break-all text-xs text-slate-400">Reference: {publishedCarId}</p><button type="button" onClick={() => onNavigate('home')} className="mt-6 rounded-xl bg-[#0A3340] px-5 py-3 font-bold text-white">Return to seller dashboard</button></div> : <>
          {currentStep === 1 && <div className="mx-auto max-w-2xl py-6 text-center"><Car className="mx-auto mb-4 text-teal-600" size={48}/><h2 className="text-2xl font-bold text-[#0A3340]">Let's get your vehicle listed</h2><p className="mt-3 text-slate-600">Provide accurate details and clear photographs. Your listing is submitted for the existing KAYAD review process; submission does not guarantee immediate publication.</p><div className="mt-5 rounded-xl bg-[#F6FAF9] p-4 text-left text-sm text-slate-600">Have your vehicle details, at least one photo, asking price and accurate ownership information ready.</div></div>}
          {currentStep === 2 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Make *<input className={fieldClass} maxLength={80} value={form.vehicleInfo.make} onChange={e => updateNested('vehicleInfo','make',e.target.value)} placeholder="e.g. Toyota" /></label><label className={labelClass}>Model *<input className={fieldClass} maxLength={100} value={form.vehicleInfo.model} onChange={e => updateNested('vehicleInfo','model',e.target.value)} placeholder="e.g. Harrier" /></label><label className={labelClass}>Year *<input className={fieldClass} type="number" min="1900" max={new Date().getFullYear()+1} value={form.vehicleInfo.year || ''} onChange={e => updateNested('vehicleInfo','year',Number(e.target.value))}/></label><label className={labelClass}>Body type<select className={fieldClass} value={form.vehicleInfo.bodyType} onChange={e => updateNested('vehicleInfo','bodyType',e.target.value)}><option value="">Select body type</option>{['SUV','Sedan','Hatchback','Wagon','Coupe','Pickup','Van','Truck','Convertible','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Registration number<input className={fieldClass} value={form.vehicleInfo.registration} onChange={e => updateNested('vehicleInfo','registration',e.target.value)} placeholder="Optional" maxLength={50}/></label><label className={labelClass}>VIN / chassis number<input className={fieldClass} value={form.vehicleInfo.vin} onChange={e => updateNested('vehicleInfo','vin',e.target.value)} placeholder="Optional" maxLength={50}/></label></div>}
          {currentStep === 3 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-[#0A3340]">Add vehicle photographs *</h2><p className="mt-1 text-sm text-slate-500">JPEG, PNG or WebP; up to 10 photos in this submission, maximum 5 MB each. Show the full vehicle clearly.</p></div><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-5 text-center"><Camera className="mb-2 text-teal-700" size={32}/><span className="font-bold text-[#0A3340]">Choose vehicle photos</span><span className="mt-1 text-xs text-slate-500">Select up to 10 images</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const files = Array.from(e.currentTarget.files || []) as File[]; const valid = files.filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size <= 5*1024*1024); const hadInvalid = valid.length !== files.length; update('photos', [...form.photos, ...valid].slice(0,10)); if (hadInvalid) setValidationError('Some files were skipped. Use JPG, PNG or WebP images no larger than 5 MB each.'); e.currentTarget.value=''; }}/></label><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photoPreviews.map(({file,url},i)=><div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-xl border border-slate-200"><img src={url} alt={`Vehicle photo ${i+1}`} className="h-32 w-full object-contain bg-slate-50"/><button type="button" onClick={()=>update('photos',form.photos.filter((_,index)=>index!==i))} className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-rose-700">Remove</button></div>)}</div><p className="text-sm text-slate-600">{form.photos.length} of 10 photos selected</p></div>}
          {currentStep === 4 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Mileage (km)<input className={fieldClass} type="number" min="0" max="2000000" value={form.details.mileage || ''} onChange={e=>updateNested('details','mileage',Number(e.target.value))}/></label><label className={labelClass}>Fuel type<select className={fieldClass} value={form.details.fuelType} onChange={e=>updateNested('details','fuelType',e.target.value)}>{['Petrol','Diesel','Hybrid','Plug-in Hybrid','Electric'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Transmission<select className={fieldClass} value={form.details.transmission} onChange={e=>updateNested('details','transmission',e.target.value)}>{['Automatic','Manual','CVT','Dual-Clutch'].map(x=><option key={x}>{x}</option>)}</select></label><label className={labelClass}>Exterior colour<input className={fieldClass} value={form.details.color} onChange={e=>updateNested('details','color',e.target.value)} maxLength={60}/></label><label className={`${labelClass} sm:col-span-2`}>Vehicle location / town *<input className={fieldClass} value={form.details.city} onChange={e=>updateNested('details','city',e.target.value)} placeholder="e.g. Nairobi" maxLength={100}/></label><label className={`${labelClass} sm:col-span-2`}>Description *<textarea className={fieldClass} rows={5} maxLength={5000} value={form.details.description} onChange={e=>updateNested('details','description',e.target.value)} placeholder="Describe the vehicle, key features and anything a buyer should know."/><span className="mt-1 block text-xs font-normal text-slate-400">{form.details.description.length}/5000 characters</span></label><label className={labelClass}>Condition<select className={fieldClass} value={form.details.condition} onChange={e=>updateNested('details','condition',e.target.value)}>{['New','Like New','Excellent','Good','Fair','Used','Locally Used','Ex-Japan'].map(x=><option key={x}>{x}</option>)}</select></label></div>}
          {currentStep === 5 && <div className="max-w-2xl space-y-4"><h2 className="text-lg font-bold text-[#0A3340]">Ownership declaration</h2><p className="text-sm text-slate-600">Only list a vehicle you own or are legally authorised to sell. KAYAD may request supporting documents during its verification process.</p><label className="flex items-start gap-3 rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.ownerConfirmed} onChange={e=>updateNested('ownership','ownerConfirmed',e.target.checked)}/><span>I confirm that I am the vehicle owner or have authority from the owner to advertise and sell it. *</span></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" checked={form.ownership.logbookAvailable} onChange={e=>updateNested('ownership','logbookAvailable',e.target.checked)}/><span>I have access to the vehicle logbook / ownership documentation.</span></label><p className="text-xs text-amber-700">This declaration is part of the listing form. The current listing API does not store ownership documents or the logbook checkbox; verification remains subject to the Trust Center process.</p></div>}
          {currentStep === 6 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">{(['exterior','interior','engine','tyres'] as const).map(key=><label key={key} className={labelClass}>{key[0].toUpperCase()+key.slice(1)} condition<textarea className={fieldClass} rows={3} maxLength={500} value={form.condition[key]} onChange={e=>updateNested('condition',key,e.target.value)} placeholder={`Describe ${key} condition`}/></label>)}</div>}
          {currentStep === 7 && <label className={labelClass}>Known issues / repairs<textarea className={fieldClass} rows={6} maxLength={2000} value={form.condition.knownIssues} onChange={e=>updateNested('condition','knownIssues',e.target.value)} placeholder="Disclose known faults, accident repairs or issues. Enter 'None known' if applicable."/></label>}
          {currentStep === 8 && <label className={labelClass}>Service history<textarea className={fieldClass} rows={6} maxLength={2000} value={form.condition.serviceHistory} onChange={e=>updateNested('condition','serviceHistory',e.target.value)} placeholder="Describe available service records, recent maintenance and major work."/></label>}
          {currentStep === 9 && <div className="max-w-2xl space-y-3"><h2 className="text-lg font-bold text-[#0A3340]">Inspection and verification</h2><p className="text-sm text-slate-600">You can request or arrange an inspection through the available KAYAD inspection services. Do not describe a vehicle as inspected or verified unless KAYAD has confirmed it.</p><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">Your listing submission does not itself book an inspection or certify vehicle condition. Follow the dashboard and Trust Center for available next steps.</div></div>}
          {currentStep === 10 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Asking price (KES) *<input className={fieldClass} type="number" min="1" max="100000000" step="1000" value={form.pricing.askingPrice || ''} onChange={e=>updateNested('pricing','askingPrice',Number(e.target.value))} placeholder="e.g. 1850000"/></label><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">Your asking price is submitted in Kenyan shillings. Any platform fees, moderation or seller eligibility checks are handled by KAYAD's existing backend rules.</div></div>}
          {currentStep === 11 && <div className="space-y-4"><h2 className="text-lg font-bold text-[#0A3340]">Review your listing</h2><div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">{photoPreviews[0] && <img src={photoPreviews[0].url} alt="Selected vehicle cover" className="h-36 w-full rounded-xl bg-slate-50 object-contain"/>}<div className="min-w-0"><h3 className="break-words text-xl font-bold text-[#0A3340]">{form.vehicleInfo.year} {form.vehicleInfo.make} {form.vehicleInfo.model}</h3><p className="mt-1 text-lg font-bold text-teal-700">KES {Number(form.pricing.askingPrice || 0).toLocaleString('en-KE')}</p><p className="mt-2 break-words text-sm text-slate-600">{form.details.city} · {form.details.mileage.toLocaleString()} km · {form.details.fuelType} · {form.details.transmission}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{form.details.description}</p></div></div><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-600">{form.photos.length} photos · {form.details.condition} · Ownership declaration {form.ownership.ownerConfirmed ? 'confirmed' : 'not confirmed'}</div></div>}
          {currentStep === 12 && <div className="max-w-2xl space-y-3"><h2 className="text-lg font-bold text-[#0A3340]">Submit your vehicle</h2><p className="text-sm text-slate-600">Your details and photos will be sent to KAYAD. The server decides the listing status based on your account capability and moderation policy. You will see confirmation only after the server creates the listing.</p><div className="rounded-xl bg-[#F6FAF9] p-4 text-sm text-slate-700">{form.vehicleInfo.year} {form.vehicleInfo.make} {form.vehicleInfo.model} · KES {Number(form.pricing.askingPrice || 0).toLocaleString('en-KE')} · {form.photos.length} photos</div></div>}
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

function TrustCenterSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Trust Center</h1>
      {/* Only backend-supported verification signals are presented here. */}
      <PhoneVerification />
      <div className="grid md:grid-cols-3 gap-4">
        {['National ID', 'Email', 'NTSA TIMS Logbook'].map((label) => (
          <div key={label} className="p-4 rounded-xl bg-white border border-[#D7E7E4] flex items-center justify-between">
            <span style={{ color: KAYAD_THEME.navy }} className="text-sm font-semibold">{label}</span>
            <span className="text-[10px] font-bold uppercase text-[#94A3B8] bg-[#EEF7F5] px-2 py-1 rounded-full">Not Yet Available</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingQualitySection({ listings, loading }: { listings: BackendCar[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-[#94A3B8]">Loading your listings…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Listings</h1>
      {listings.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">You haven't listed any vehicles yet.</p>
      ) : listings.map((l) => {
        const { score } = calculateListingQualityScore({
          hasTitle: !!l.title,
          hasBrand: !!l.brand,
          hasModel: !!l.model,
          hasYear: !!l.year,
          hasPrice: !!l.price,
          hasMileage: l.mileage != null,
          hasFuel: !!l.fuel,
          hasTransmission: !!l.transmission,
          hasBodyType: !!l.body_type,
          hasDescription: !!l.description,
          hasLocation: !!l.location_city,
          hasImages: (l.images?.length || 0) > 0,
          imageCount: l.images?.length || 0,
          hasFeatures: (l.features?.length || 0) > 0,
          featureCount: l.features?.length || 0,
          hasVin: !!l.vin,
          hasLogbook: !!l.registration_number,
          descriptionLength: l.description?.length || 0,
        });
        return (
          <div key={l.id} className="rounded-xl p-4 bg-white flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
              <VehicleImage compact urls={[l.images?.[0]?.thumb, l.images?.[0]?.url]} alt={l.title} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{l.year} {l.brand} {l.model}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{l.status || 'draft'}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: score >= 80 ? KAYAD_THEME.emerald : KAYAD_THEME.amber }}>{score}%</p>
          </div>
        );
      })}
    </div>
  );
}

function EscrowCenterSection({ transactions, loading }: { transactions: BackendEscrow[]; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
        <Shield size={24} style={{ color: KAYAD_THEME.emerald }} className="inline mr-2" />
        <span style={{ color: KAYAD_THEME.navy }}>KAYAD Escrow Protection - Secure transactions for private sales</span>
      </div>
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Escrow Transactions</h1>
      {loading ? (
        <p className="text-sm text-[#94A3B8]">Loading…</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl p-8 text-center bg-white">
          <Shield size={48} style={{ color: KAYAD_THEME.slate[300] }} className="mx-auto mb-4" />
          <p style={{ color: KAYAD_THEME.slate[500] }}>No active escrow transactions</p>
        </div>
      ) : transactions.map(t => (
        <div key={t.id} className="rounded-xl p-6 bg-white">
          <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>{t.car?.title || 'Vehicle'}</h3>
          <p className="text-sm mb-4 capitalize" style={{ color: KAYAD_THEME.slate[500] }}>{t.status.replace('_', ' ')}</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_THEME.gold }}>KES {(t.amount / 1000000).toFixed(2)}M</p>
        </div>
      ))}
    </div>
  );
}

function HelpCenterSection() {
  const topics = ['How to Sell Safely', 'Avoiding Scams', 'Meeting Buyers', 'Using Escrow'];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Help Center</h1>
      {/* Fixed: each card's own "Read More →" button had no onClick
          handler at all - looked clickable, did nothing when clicked.
          No real, dedicated help-article system exists to link these
          to, so the button (a promise of functionality that isn't
          real) is removed rather than left dead; the topic titles
          themselves are honest, static content and stay. */}
      <div className="grid md:grid-cols-2 gap-4">
        {topics.map((t, i) => (
          <div key={i} className="rounded-xl p-4 bg-white">
            <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{t}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
