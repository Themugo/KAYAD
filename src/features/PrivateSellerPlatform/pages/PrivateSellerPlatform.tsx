// ============================================================
// KAYAD PRIVATE SELLER PLATFORM - GUIDED SELLING EXPERIENCE
// Sections 1-17: Step-by-step seller journey
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
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
  };
  photos: string[];
  details: {
    mileage: number;
    fuelType: string;
    transmission: string;
    color: string;
    condition: string;
    description: string;
  };
  ownership: {
    ownerName: string;
    ownerId: string;
    purchaseDate: string;
    logbookAvailable: boolean;
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
  | 'help';

interface PrivateSellerPlatformProps {
  user?: UserProfile | null;
  onOpenAuth?: (intent?: 'seller' | 'dealer') => void;
  onNavigate?: (nav: string) => void;
}

export default function PrivateSellerPlatform({ user, onOpenAuth, onNavigate }: PrivateSellerPlatformProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>('home');
  const [sellerAccountType, setSellerAccountType] = useState<'seller' | 'dealer'>('seller');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);

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
  const sellerWorkspaceAllowed = normalizedRole === 'individual_seller';

  if (!user || !sellerWorkspaceAllowed) {
    const isDealer = sellerAccountType === 'dealer';
    const signedInWithoutSellerAccess = Boolean(user);
    return (
      <section className="kayad-sell-entry" aria-labelledby="kayad-sell-entry-title">
        <div className="kayad-sell-entry__hero">
          <span className="kayad-sell-entry__eyebrow"><Car size={14} aria-hidden="true" /> KAYAD SELLER STUDIO</span>
          <h1 id="kayad-sell-entry-title">Your next sale should feel simpler.</h1>
          <p>Present your vehicle clearly, manage genuine buyer conversations and follow the approval steps from one dedicated workspace.</p>
          <div className="kayad-sell-entry__trust-row" aria-label="Seller workflow benefits">
            <span><ShieldCheck size={16} aria-hidden="true" /> Approval-led listings</span>
            <span><MessageSquare size={16} aria-hidden="true" /> Buyer conversations</span>
            <span><FileCheck size={16} aria-hidden="true" /> Inspection options</span>
          </div>
        </div>

        <div className="kayad-sell-entry__content">
          <div className="kayad-sell-entry__intro">
            <span>CHOOSE YOUR SELLING WORKSPACE</span>
            <h2>Built for how you sell.</h2>
            <p>{signedInWithoutSellerAccess ? 'Your current account is signed in, but seller tools are not enabled for this role. Request the correct access instead of creating a duplicate account.' : 'Start with the right account type. You can sign in with an existing KAYAD account instead of creating another one.'}</p>
          </div>
          <div className="kayad-sell-entry__choices">
            <button type="button" aria-pressed={!isDealer} onClick={() => setSellerAccountType('seller')} className={`kayad-sell-choice ${!isDealer ? 'is-selected' : ''}`}>
              <span className="kayad-sell-choice__icon"><User size={22} aria-hidden="true" /></span>
              <span className="kayad-sell-choice__copy"><strong>Private seller</strong><small>For an individual selling their own vehicle.</small><em>Personal listing workspace · KAYAD approval required</em></span>
              <span className="kayad-sell-choice__check" aria-hidden="true">{!isDealer ? '✓' : ''}</span>
            </button>
            <button type="button" aria-pressed={isDealer} onClick={() => setSellerAccountType('dealer')} className={`kayad-sell-choice kayad-sell-choice--dealer ${isDealer ? 'is-selected' : ''}`}>
              <span className="kayad-sell-choice__icon"><Warehouse size={22} aria-hidden="true" /></span>
              <span className="kayad-sell-choice__copy"><strong>Dealership</strong><small>For a showroom or business managing multiple vehicles.</small><em>Commercial inventory tools · Business review required</em></span>
              <span className="kayad-sell-choice__check" aria-hidden="true">{isDealer ? '✓' : ''}</span>
            </button>
          </div>
          <div className="kayad-sell-entry__actions">
            <button type="button" className="kayad-sell-entry__primary" onClick={() => signedInWithoutSellerAccess ? onNavigate?.('support') : onOpenAuth?.(sellerAccountType)}>
              {signedInWithoutSellerAccess ? 'Contact Support about seller access' : `Continue as ${isDealer ? 'a dealership' : 'a private seller'}`} <ArrowRight size={17} aria-hidden="true" />
            </button>
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
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#13B8A6] flex items-center justify-center">
              <Car size={18} style={{ color: 'white' }} />
            </div>
            <span className="text-white font-bold">Sell</span>
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
            className="lg:hidden fixed inset-0 z-40 pt-16"
            style={{ backgroundColor: 'rgba(10, 51, 64, 0.5)' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              id="seller-mobile-navigation"
              role="dialog"
              aria-label="Seller navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-72 h-full p-4 overflow-y-auto"
              style={{ backgroundColor: KAYAD_THEME.navy }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'home' && <SellerHomeSection listings={myListings} escrows={myEscrows} loading={dataLoading} listingsError={listingsError} escrowsError={escrowsError} lastRefreshedAt={lastRefreshedAt} onRefresh={loadSellerData} userName={user?.name} onNavigate={handleSectionChange} />}
              {activeSection === 'listing-wizard' && <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} onNavigate={handleSectionChange} />}
              {activeSection === 'auction-verification' && <AuctionVerificationSection listings={myListings} />}
              {activeSection === 'trust-center' && <TrustCenterSection />}
              {activeSection === 'listing-quality' && <ListingQualitySection listings={myListings} loading={dataLoading} />}
              {activeSection === 'escrow' && <EscrowCenterSection transactions={myEscrows} loading={dataLoading} />}
              {activeSection === 'help' && <HelpCenterSection />}
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
}: {
  activeSection: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
}) {
  const navItems: { id: PlatformSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Seller Home', icon: <Home size={20} /> },
    { id: 'listing-wizard', label: 'Create Listing', icon: <PlusCircleIcon size={20} /> },
    { id: 'escrow', label: 'Escrow & Deals', icon: <CreditCard size={20} /> },
    { id: 'auction-verification', label: 'Auction verification', icon: <ShieldCheck size={20} /> },
    { id: 'trust-center', label: 'Trust Center', icon: <BadgeCheck size={20} /> },
    { id: 'listing-quality', label: 'My Listings', icon: <Car size={20} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#13B8A6] flex items-center justify-center flex-shrink-0">
            <Car size={24} color="white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">KAYAD</h1>
            <p className="text-white/60 text-xs">Private Seller</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                activeSection === item.id
                  ? 'bg-[#13B8A6]/20 text-[#A7F0E6]'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckVerified size={16} style={{ color: KAYAD_THEME.emerald }} />
            <span className="text-white/70 text-xs">Seller account status</span>
          </div>
          <p className="text-white text-sm font-bold">Access &amp; verification</p>
          <p className="mt-1 text-white/60 text-[11px] leading-4">Review your seller approval and any required next steps in Trust Center.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: SELLER HOME
// ============================================================

function SellerHomeSection({ listings, escrows, loading, listingsError, escrowsError, lastRefreshedAt, onRefresh, userName, onNavigate }: {
  listings: BackendCar[];
  escrows: BackendEscrow[];
  loading: boolean;
  listingsError: string | null;
  escrowsError: string | null;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
  userName?: string;
  onNavigate: (s: PlatformSection) => void;
}) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const activeListings = listings.filter((l) => l.status === 'available' || l.status === 'active').length;
  const soldListings = listings.filter((l) => l.status === 'sold').length;
  const draftListings = listings.filter((l) => l.status === 'draft').length;
  const pendingListings = listings.filter((l) => l.status === 'pending' || l.status === 'under_review').length;
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100"><ShieldCheck size={14} aria-hidden="true" /> KAYAD SELLER STUDIO</div>
            <h1 id="seller-dashboard-title" className="text-2xl font-bold text-white sm:text-3xl">{greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Manage your listings, follow approval progress and keep track of buyer interest.</p>
            <p className="mt-3 text-xs text-white/60" aria-live="polite">{loading ? 'Refreshing your seller data…' : refreshedLabel ? `Last updated ${refreshedLabel}` : 'Seller data has not been refreshed yet'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Refresh seller dashboard data"><RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Refresh</button>
            <button type="button" onClick={() => onNavigate('listing-wizard')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ backgroundColor: KAYAD_THEME.emerald }}><PlusCircle size={17} aria-hidden="true" /> Create Listing</button>
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="min-w-0 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="seller-listings-heading">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="seller-listings-heading" className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>My Listings</h2><p className="mt-1 text-sm text-slate-500">Your latest vehicles and their current status.</p></div><button type="button" onClick={() => onNavigate('listing-quality')} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#D7E7E4] px-3 py-2 text-sm font-semibold hover:bg-[#F6FAF9]" style={{ color: KAYAD_THEME.navy }}>View all <ChevronRight size={15} aria-hidden="true" /></button></div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#E7F5F2] px-3 py-1.5 font-semibold text-[#0F766E]">Active {activeListings}</span><span className="rounded-full bg-warning/10 px-3 py-1.5 font-semibold text-warning">Under review {pendingListings}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">Drafts {draftListings}</span><span className="rounded-full bg-[#F6FAF9] px-3 py-1.5 font-semibold text-[#12576D]">Sold {soldListings}</span></div>
          {loading && listings.length === 0 ? <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><RefreshCw size={17} className="animate-spin" aria-hidden="true" /> Loading your listings…</div> : listingsError && listings.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><AlertCircle size={24} className="mx-auto mb-2 text-rose-500" aria-hidden="true" /><p className="font-semibold text-slate-800">We couldn't retrieve your listings</p><p className="mt-1 text-sm text-slate-500">Try refreshing. We won't show a false empty state.</p></div> : listings.length === 0 ? <div className="rounded-xl border border-dashed border-[#D7E7E4] bg-[#F8FBFA] p-7 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF4F0] text-[#12576D]"><Car size={24} aria-hidden="true" /></div><p className="font-semibold text-slate-800">Your first listing starts here</p><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add your vehicle details and photos to begin the KAYAD review process.</p><button type="button" onClick={() => onNavigate('listing-wizard')} className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: KAYAD_THEME.navy }}><Plus size={16} aria-hidden="true" /> Create your first listing</button></div> : <div className="space-y-3">{listings.slice(0, 5).map((listing, i) => <ListingCard key={listing.id} listing={listing} delay={i * 0.04} />)}</div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="seller-actions-heading"><h2 id="seller-actions-heading" className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>Quick Actions</h2><p className="mt-1 text-sm text-slate-500">Common tasks for your seller account.</p><div className="mt-4 space-y-2">
            <SellerAction icon={<PlusCircle size={17} />} title="Create a listing" description="Start a new vehicle submission" onClick={() => onNavigate('listing-wizard')} />
            <SellerAction icon={<ClipboardList size={17} />} title="Manage my listings" description="Review statuses and listing details" onClick={() => onNavigate('listing-quality')} />
            <SellerAction icon={<ShieldCheck size={17} />} title="Trust & verification" description="Review your seller access and next steps" onClick={() => onNavigate('trust-center')} />
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
          {image ? (
            <img src={image} alt={`${listing.year} ${listing.brand} ${listing.model}`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Car size={48} style={{ color: KAYAD_THEME.slate[300] }} />
          )}
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

function ListingWizardSection({ draft, setDraft, onNavigate }: {
  draft: ListingDraft | null;
  setDraft: (d: ListingDraft | null) => void;
  onNavigate: (s: PlatformSection) => void;
}) {
  const [currentStep, setCurrentStep] = useState(draft?.step || 1);
  const totalSteps = 12;
  // Added (Final Integration Phase 2): real publish state - the
  // frontend must not claim publication until the real backend
  // confirms it (this phase's own explicit instruction). No fake
  // "success" is ever shown; the real HTTP response, success or
  // failure, is what the UI reflects.
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCarId, setPublishedCarId] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      // Maps the wizard's own, existing draft state to the real
      // backend's real field names - does not invent any field the
      // wizard doesn't already declare in its own ListingDraft type.
      // title is constructed from year+make+model since the wizard
      // never collects a separate title field of its own - a direct,
      // literal combination of fields it does declare, not a new
      // input being added.
      const vehicleInfo = draft?.vehicleInfo;
      const details = draft?.details;
      const pricing = draft?.pricing;
      const title = vehicleInfo
        ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(' ').trim()
        : '';

      const result = await createCar({
        title: title || undefined,
        brand: vehicleInfo?.make,
        model: vehicleInfo?.model,
        year: vehicleInfo?.year,
        vin: vehicleInfo?.vin,
        registrationNumber: vehicleInfo?.registration,
        mileage: details?.mileage,
        fuel: details?.fuelType,
        transmission: details?.transmission,
        color: details?.color,
        condition: details?.condition,
        description: details?.description,
        price: pricing?.askingPrice,
      });

      if (result.success && result.data) {
        setPublishedCarId(result.data.id);
        setDraft(null);
      } else {
        setPublishError(result.message || 'Failed to publish listing.');
      }
    } catch (err) {
      setPublishError(err instanceof VehicleApiError ? err.message : 'Failed to publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [draft, setDraft]);

  const steps = [
    { id: 1, label: 'Start' },
    { id: 2, label: 'Vehicle' },
    { id: 3, label: 'Photos' },
    { id: 4, label: 'Details' },
    { id: 5, label: 'Ownership' },
    { id: 6, label: 'Condition' },
    { id: 7, label: 'Issues' },
    { id: 8, label: 'Service' },
    { id: 9, label: 'Inspection' },
    { id: 10, label: 'Pricing' },
    { id: 11, label: 'Preview' },
    { id: 12, label: 'Publish' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Create Listing</h1>
        <button onClick={() => setDraft({ ...draft || { step: 1 } as ListingDraft, step: currentStep })} className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
          Save Draft
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            {Math.round((currentStep / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                step.id === currentStep
                  ? 'bg-[#13B8A6] text-white'
                  : step.id < currentStep
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#EEF7F5] text-[#64748B]'
              }`}
            >
              {step.id < currentStep ? <CheckCircle size={14} /> : null}
              {step.label}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.orange}15` }}>
            <Sparkles size={40} style={{ color: KAYAD_THEME.orange }} />
          </div>
          {publishedCarId ? (
            // Real success - only ever shown after the real backend
            // returned a real, created car record. Never shown
            // optimistically.
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Listing Published</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                Your listing has been saved to KAYAD. It is now searchable in the real marketplace.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Create Your Vehicle Listing</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                We'll guide you step-by-step to create a professional listing. The process takes about 10-15 minutes.
              </p>
              {publishError && (
                // Real failure, surfaced honestly - the real backend's
                // own validation/authorization message, never
                // swallowed or replaced with a fake success state.
                <p className="text-sm mb-4 max-w-2xl mx-auto font-medium" style={{ color: '#DC2626' }}>
                  {publishError}
                </p>
              )}
              <button
                onClick={() => {
                  if (currentStep < totalSteps) {
                    setCurrentStep(currentStep + 1);
                  } else {
                    handlePublish();
                  }
                }}
                disabled={isPublishing}
                className="px-8 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: KAYAD_THEME.orange }}
              >
                {isPublishing
                  ? 'Publishing…'
                  : currentStep < totalSteps ? 'Start Creating Listing' : 'Publish Listing'} <ArrowRight size={20} className="inline ml-2" />
              </button>
            </>
          )}
        </div>
      </div>
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
              {l.images?.[0]?.thumb || l.images?.[0]?.url ? (
                <img src={l.images[0].thumb || l.images[0].url} alt={l.title} className="w-full h-full object-cover" />
              ) : (
                <Car size={32} style={{ color: KAYAD_THEME.slate[400] }} />
              )}
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
