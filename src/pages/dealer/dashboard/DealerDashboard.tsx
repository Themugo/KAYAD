import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Car, Users, TrendingUp, TrendingDown, DollarSign,
  Eye, MessageSquare, Phone, Calendar, ShoppingCart, Target, Clock,
  AlertCircle, CheckCircle2, Star, Filter, ArrowRight,
  MoreVertical, ChevronDown, ChevronRight, Bot, BarChart3,
  PieChart, Activity, Bell,
  Settings, FileText, Send, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserPlus, Shield, Award, CreditCard, CalendarCheck, ClipboardCheck,
  Gavel, X, Loader2, UserCog, ExternalLink, Megaphone, ChevronLeft, Plus, Landmark, LogOut, Menu,
} from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';
import { useAuth } from '../../../context/AuthContext';
import { useBrandingSafe } from '../../../context/BrandingContext';
import DealerListingForm from './DealerListingForm';
import DealerSettingsPanel from './DealerSettingsPanel';
import DealerBankingPanel from './DealerBankingPanel';
import DealerCollectionAccountPanel from './DealerCollectionAccountPanel';
import AuctionInsightsPanel from './AuctionInsightsPanel';
import DealerAccountStatus from './DealerAccountStatus';
import DealerTeamPanel from './DealerTeamPanel';
import { getMyListings, deleteCar, markCarSold } from '../../../services/vehicleApi';
import { ListingStatusBadge, ListingThumb } from '../../../components/listing/ListingPresentation';
import type { BackendCar } from '../../../services/vehicleApi';
import { ParticipantEscrowDesk } from '../../../features/escrow/ParticipantEscrowDesk';

// ============================================================
// DESIGN TOKENS
// ============================================================

const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
  mutedOrange: '#13b8a6',
  mutedCrimson: '#EF4444',
  purple: '#5aafa4',
  amber: '#176b87',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Stat Card */
type DealerOperationResponse = {
  auctions?: { items?: Array<{ id: string; title: string; bidsCount?: number; views?: number; currentBid?: number; startingBid?: number; status?: string }> };
  inspections?: { items?: Array<{ id: string; vehicle?: string; status?: string }> };
  finance?: { items?: Array<{ id: string; applicantName?: string; vehicle?: string; status?: string }> };
  analytics?: {
    overview?: { totalRevenue?: number; totalSales?: number; totalViews?: number };
    performance?: { avgDealSize?: number };
    topVehicles?: Array<{ id: string; title?: string; views?: number }>;
  };
};

type StatCardProps = { title: string; value: React.ReactNode; caption?: string; change?: number; icon: React.ElementType; color?: string; onOpen?: () => void; openLabel?: string; loading?: boolean };

/** Metric card: equal height, wraps long values safely, and tells "unavailable" (—) apart from a real 0 and from "still loading". */
const StatCard = ({ title, value, caption, change, icon: Icon, onOpen, openLabel, loading }: StatCardProps) => {
  const body = (
    <div className="flex h-full items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] sm:text-[13px]">{title}</p>
        {loading
          ? <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-[#E1EDEB]" role="status" aria-label={`Loading ${title}`} />
          : <p className="mt-1 break-words text-xl font-bold leading-tight text-[#0A3340] sm:text-2xl">{value === '—' ? <span aria-label="Unavailable" role="img">—</span> : value}</p>}
        {caption && !loading && <p className="mt-1 text-xs text-[#475569]">{caption}</p>}
        {change !== undefined && (
          <div className={`mt-2 flex items-center gap-1 ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {change >= 0 ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : <ArrowDownRight className="h-4 w-4" aria-hidden="true" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
        {onOpen && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#176B87]">{openLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" /></p>}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF4F0] text-[#176B87]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );
  const base = 'h-full rounded-xl border border-[#D7E7E4] bg-white p-4 transition-shadow hover:shadow-md sm:p-5';
  // Only a card with a real destination becomes a button; the rest stay plain information cards.
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`${base} w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]`}>{body}</button>
  ) : (
    <div className={base}>{body}</div>
  );
};

/** Lead pipeline stage: a real count, and a real destination (the existing pipeline workspace). */
const PipelineStage = ({ stage, count, color, onOpen, loading }: { stage: string; count: number | string; color: string; onOpen?: () => void; loading?: boolean }) => {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" /><span className="truncate text-sm font-semibold text-[#12576D]">{stage}</span></span>
      {loading ? <span className="h-5 w-8 animate-pulse rounded bg-[#E1EDEB]" aria-hidden="true" /> : <span className="text-lg font-bold text-[#0A3340]">{count === '—' ? <span aria-label="Unavailable" role="img">—</span> : count}</span>}
    </>
  );
  const cls = 'flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-[#D7E7E4] bg-white px-3.5 py-2.5 text-left';
  return onOpen
    ? <button type="button" onClick={onOpen} aria-label={`${stage}: ${count === '—' ? 'unavailable' : count} leads. Open pipeline`} className={`${cls} transition-colors hover:border-[#91CEC5] hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]`}>{inner}</button>
    : <div className={cls}>{inner}</div>;
};

/** Quick action: solid design-system card, 44px+ target, labels wrap instead of clipping. */
const QuickAction = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#D7E7E4] bg-white p-3 text-center transition-colors hover:border-[#91CEC5] hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DDF4F0] text-[#176B87]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
    <span className="break-words text-xs font-semibold leading-tight text-[#12576D] sm:text-sm">{label}</span>
  </button>
);

/** "3 hours ago" style label from a real ISO timestamp; returns null when the time is missing or invalid. */
const relativeTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Activity row: real event, real time, and a link to where it can be actioned. */
const ActivityItem = ({ message, time, icon: Icon, onOpen }: { message: string; time?: string | null; icon: React.ElementType; onOpen?: () => void }) => {
  const when = relativeTime(time);
  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF4F0] text-[#176B87]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block break-words text-sm text-[#12576D]">{message}</span>{when && <time dateTime={time || undefined} className="mt-0.5 block text-xs text-[#64748B]">{when}</time>}</span>
      {onOpen && <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 border-b border-[#EEF3F2] py-2.5 text-left last:border-0';
  return onOpen
    ? <button type="button" onClick={onOpen} className={`${cls} rounded-md hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]`}>{inner}</button>
    : <div className={cls}>{inner}</div>;
};

/** Inventory performance row: the real listing photo (full frame, never cropped), identity, status, price and real counters. */
const TopVehicle = ({ vehicle, rank, onOpen }: { vehicle: any; rank: number; onOpen?: () => void }) => (
  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border border-[#D7E7E4] bg-white p-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
    <div className="relative">
      <ListingThumb src={vehicle.image} alt={vehicle.title ? `Photo of ${vehicle.title}` : 'Vehicle photo'} className="h-16 w-24 sm:h-[72px] sm:w-28" />
      <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A3340] px-1 text-[10px] font-bold text-white" aria-label={`Rank ${rank}`}>{rank}</span>
    </div>
    <div className="min-w-0">
      <p className="line-clamp-2 break-words text-sm font-semibold text-[#0A3340]">{vehicle.title || 'Untitled listing'}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569]">
        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden="true" />{vehicle.views == null ? '—' : Number(vehicle.views).toLocaleString('en-KE')} views</span>
        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />{vehicle.leads == null ? '—' : Number(vehicle.leads).toLocaleString('en-KE')} {Number(vehicle.leads) === 1 ? 'enquiry' : 'enquiries'}</span>
      </div>
    </div>
    <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
      <p className="break-words text-sm font-bold text-[#0A3340]">{vehicle.price == null || !Number.isFinite(Number(vehicle.price)) ? 'Price unavailable' : `Ksh ${Number(vehicle.price).toLocaleString('en-KE')}`}</p>
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        {vehicle.status && <ListingStatusBadge status={vehicle.status} label={String(vehicle.status).replace(/_/g, ' ')} />}
        {onOpen && <button type="button" onClick={onOpen} className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-[#176B87] hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]">Manage</button>}
      </div>
    </div>
  </div>
);

/** AI Copilot */
const AICopilot = () => (
  <div className="bg-white rounded-xl border border-[#D7E7E4] overflow-hidden">
    <div className="p-4 bg-gradient-to-r from-[#176B87] to-[#13B8A6] text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5" /></div>
        <div><h3 className="font-bold">AI Dealer Copilot</h3><p className="text-xs text-[#DDF4F0]">KAYARD KE Intelligence</p></div>
      </div>
    </div>
    <div className="p-6 text-sm text-[#64748B]">
      AI dealer insights are not enabled for this deployment yet. No simulated recommendations, forecasts, leads, or revenue figures are shown here.
    </div>
  </div>
);

/** Navigation Tab */
const NavTab = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    type="button"
    aria-current={active ? 'page' : undefined}
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87] ${
      active ? 'bg-[#DDF4F0] text-[#12576D]' : 'text-[#64748B] hover:bg-[#F6FAF9]'
    }`}
  >
    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden="true" />
    <span className="font-medium text-sm truncate">{label}</span>
    {badge ? (
      <span className="ml-auto px-2 py-0.5 bg-[#176B87] text-white text-xs rounded-full">
        <span aria-hidden="true">{badge}</span>
        <span className="sr-only">{badge} new</span>
      </span>
    ) : null}
  </button>
);

// ============================================================
// NAVIGATION MODEL (Phase 14.2)
// Groups only organise sections that already exist; no section is added or removed.
// ============================================================

type NavItem = { id: string; label: string; icon: React.ElementType; title: string; description: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const DEALER_NAV_GROUPS: NavGroup[] = [
  { id: 'overview', label: 'Overview', items: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Dashboard', description: 'Your dealership at a glance: activity, listings and what needs attention.' },
  ] },
  { id: 'business', label: 'Business', items: [
    { id: 'inventory', label: 'Inventory', icon: Car, title: 'Inventory', description: 'Vehicles you have listed and their current status.' },
    { id: 'leads', label: 'Leads', icon: MessageSquare, title: 'Leads', description: 'Buyer enquiries on your vehicles.' },
    { id: 'pipeline', label: 'Pipeline', icon: Target, title: 'Lead pipeline', description: 'Enquiries grouped by sales stage.' },
    { id: 'customers', label: 'Customers', icon: Users, title: 'Customers', description: 'Buyers who have dealt with your dealership.' },
    { id: 'finance', label: 'Finance', icon: CreditCard, title: 'Finance applications', description: 'Financing applications attached to your vehicles.' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, title: 'Analytics', description: 'Revenue, sales and viewing performance.' },
    { id: 'reputation', label: 'Reputation', icon: Star, title: 'Reputation', description: 'Ratings and reviews from buyers.' },
  ] },
  { id: 'operations', label: 'Operations', items: [
    { id: 'auctions', label: 'Auctions', icon: Gavel, title: 'Auctions', description: 'Auctions run by your dealership.' },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck, title: 'Inspections', description: 'Inspection orders on your vehicles.' },
    { id: 'escrow', label: 'Escrow', icon: Shield, title: 'Escrow', description: 'Protected transactions on your sales.' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, title: 'Marketing', description: 'Campaigns promoting your vehicles.' },
  ] },
  { id: 'system', label: 'System Management', items: [
    { id: 'team', label: 'Team', icon: UserCog, title: 'Team', description: 'People who work with your dealership account.' },
    { id: 'settings', label: 'Settings', icon: Settings, title: 'Settings', description: 'Profile, notifications, plan, team and banking for your dealership.' },
    // Banking sits at the bottom of the list: payout details are no longer asked for during onboarding.
    { id: 'banking', label: 'Banking', icon: Landmark, title: 'Banking', description: 'Where your payouts are sent: bank account and M-Pesa.' },
  ] },
];

const DEALER_SECTION_IDS = new Set(DEALER_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)));

/** Reads the active section from `?section=`; anything unknown falls back to the overview. */
const readDealerSectionFromUrl = (): string => {
  try {
    const value = new URLSearchParams(window.location.search).get('section');
    return value && DEALER_SECTION_IDS.has(value) ? value : 'overview';
  } catch {
    return 'overview';
  }
};

/** Adds a history entry for a section change, keeping every other URL parameter (e.g. nav). */
const writeDealerSectionToUrl = (section: string) => {
  try {
    const url = new URL(window.location.href);
    if (section === 'overview') url.searchParams.delete('section');
    else url.searchParams.set('section', section);
    if (section !== 'escrow') url.searchParams.delete('escrowId');
    if (section !== 'settings') url.searchParams.delete('tab');
    if (section !== 'inventory') { url.searchParams.delete('mode'); url.searchParams.delete('id'); }
    if (url.search === window.location.search) return;
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* history unavailable: the section still changes in memory */
  }
};

type ListingFormState = { mode: 'create' | 'edit'; id?: string } | null;

/** Reads the inventory form state from `?mode=new|edit&id=` (only meaningful on the inventory section). */
const readListingFormFromUrl = (): ListingFormState => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') !== 'inventory') return null;
    const mode = params.get('mode');
    if (mode === 'new') return { mode: 'create' };
    const id = params.get('id');
    if (mode === 'edit' && id) return { mode: 'edit', id };
    return null;
  } catch {
    return null;
  }
};

const writeListingFormToUrl = (state: ListingFormState) => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('section', 'inventory');
    url.searchParams.delete('mode');
    url.searchParams.delete('id');
    if (state?.mode === 'create') url.searchParams.set('mode', 'new');
    if (state?.mode === 'edit' && state.id) { url.searchParams.set('mode', 'edit'); url.searchParams.set('id', state.id); }
    if (url.search === window.location.search) return;
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* history unavailable */
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DealerDashboard({ user, onOpenAuth, onNavigate }) {
  const { signOut } = useAuth();
  const branding = useBrandingSafe();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const handleDealerLogout = async () => {
    setLogoutError(null);
    try {
      const result = await signOut();
      if (!result.ok) setLogoutError(result.message || "Could not sign out. Please try again.");
      else window.location.assign("/");
    } catch { setLogoutError("Could not sign out. Please try again."); }
  };
  const [insightsFor, setInsightsFor] = useState<string | null>(null);
  const [activeSection, setActiveSectionState] = useState<string>(readDealerSectionFromUrl);
  const [listingForm, setListingFormState] = useState<ListingFormState>(readListingFormFromUrl);
  const [listingNotice, setListingNotice] = useState<string | null>(null);
  const setListingForm = (state: ListingFormState) => setListingFormState(state);
  const openListingForm = (state: ListingFormState) => {
    setListingNotice(null);
    setListingFormState(state);
    setActiveSectionState('inventory');
    writeListingFormToUrl(state);
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  };
  const setActiveSection = (section: string) => {
    if (!DEALER_SECTION_IDS.has(section)) return;
    setListingFormState(null);
    setActiveSectionState(section);
    writeDealerSectionToUrl(section);
    setMobileNavOpen(false);
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  };

  // Phone drawer: Escape closes it and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mobileNavOpen]);

  // Browser Back/Forward and refreshes resolve to the section named in the URL.
  useEffect(() => {
    const onPop = () => { setActiveSectionState(readDealerSectionFromUrl()); setListingForm(readListingFormFromUrl()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Fixed: the Inventory section previously never fetched anything at
  // all - every stat (38 published, 5 draft, etc.) and all 4 listed
  // vehicles were hardcoded directly in the JSX, identical for every
  // dealer regardless of what's actually in the database. Reuses the
  // same real, already-proven getMyListings endpoint built for the
  // private seller dashboards (scoped to req.user.id server-side).
  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [listingsRetry, setListingsRetry] = useState(0);
  const photosChangedRef = React.useRef(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [invQuery, setInvQuery] = useState('');
  const [invStatus, setInvStatus] = useState('all');
  const [invSort, setInvSort] = useState<'newest' | 'price_desc' | 'price_asc' | 'views'>('newest');
  const visibleListings = React.useMemo(() => {
    const q = invQuery.trim().toLowerCase();
    const matchStatus = (st: unknown) => invStatus === 'sold' ? st === 'sold' : st !== 'sold' && (invStatus === 'all' || (invStatus === 'published' ? st === 'available' || st === 'active' : st === invStatus));
    const list = (myListings as any[]).filter((l) => matchStatus(l.status) && (!q || `${l.title || ''} ${l.brand || ''} ${l.model || ''} ${l.year || ''} ${l.city || l.location_city || ''}`.toLowerCase().includes(q)));
    const time = (l: any) => Date.parse(String(l.createdAt || l.created_at || l.updatedAt || l.updated_at || '')) || 0;
    const price = (l: any) => (l.price == null ? 0 : Number(l.price) || 0);
    const views = (l: any) => Number(l.views) || 0;
    const sorted = [...list];
    if (invSort === 'price_desc') sorted.sort((a, b) => price(b) - price(a));
    else if (invSort === 'price_asc') sorted.sort((a, b) => price(a) - price(b));
    else if (invSort === 'views') sorted.sort((a, b) => views(b) - views(a));
    else sorted.sort((a, b) => time(b) - time(a));
    return sorted;
  }, [myListings, invQuery, invStatus, invSort]);
  const activeListings = (myListings as any[]).filter((l) => l.status !== 'sold');
  const soldListings = (myListings as any[]).filter((l) => l.status === 'sold');
  const [soldTargetId, setSoldTargetId] = useState<string | null>(null);
  const [soldBuyer, setSoldBuyer] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldBusy, setSoldBusy] = useState(false);
  const [soldError, setSoldError] = useState<string | null>(null);
  const [showSold, setShowSold] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmMarkSold = async (car: BackendCar) => {
    const id = String(car.id || car._id);
    if (soldBusy) return;
    setSoldBusy(true); setSoldError(null);
    try {
      const price = Number(soldPrice.replace(/[^0-9.]/g, ''));
      const res = await markCarSold(id, { buyerName: soldBuyer.trim() || undefined, salePrice: price > 0 ? price : undefined });
      if (res && res.success === false) throw new Error(res.message || 'Could not mark this vehicle as sold.');
      setMyListings((prev) => prev.map((c) => (String(c.id || c._id) === id ? { ...c, status: 'sold', sold: true } : c)));
      setSoldTargetId(null); setSoldBuyer(''); setSoldPrice('');
      setListingNotice('Marked as sold. It moved to your Sold list and the active inventory renumbered.');
    } catch (err) {
      setSoldError((err as Error)?.message || 'Could not mark this vehicle as sold. Nothing was changed — please try again.');
    } finally { setSoldBusy(false); }
  };

  const confirmDeleteListing = async (car: BackendCar) => {
    const id = String(car.id || car._id);
    if (deletingId) return;
    setDeletingId(id); setDeleteError(null);
    try {
      const res = await deleteCar(id);
      if (res && res.success === false) throw new Error(res.message || 'The listing could not be removed.');
      setMyListings((prev) => prev.filter((c) => String(c.id || c._id) !== id));
      setDeleteTargetId(null);
      setListingNotice('Listing removed from your inventory.');
      setListingsLoaded(false);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setDeleteError(status === 403 ? 'You do not have permission to remove this listing.' : status === 404 ? 'This listing no longer exists. Refresh your inventory.' : ((err as Error)?.message && status ? (err as Error).message : 'The listing could not be removed. Nothing was changed — please try again.'));
    } finally { setDeletingId(null); }
  };

  useEffect(() => {
    if (user) loadDashboard();
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (activeSection === 'inventory' && user && !listingsLoaded) {
      setListingsLoading(true);
      setListingsError(null);
      getMyListings()
        .then((data) => { setMyListings(Array.isArray(data) ? data : []); setListingsLoaded(true); })
        .catch(() => setListingsError('Could not load your inventory. Please try again.'))
        .finally(() => setListingsLoading(false));
    }
  }, [activeSection, user, listingsLoaded, listingsRetry]);

  // Fixed: both Leads and Pipeline previously showed entirely
  // hardcoded, invented leads (fake emails, a fake "lead score" with
  // no real scoring system, fake staff assignments with no real team-
  // assignment system) - Pipeline had no content at all behind its
  // own real nav entry. Both now share this one real fetch, against
  // the real leads table (found already fully defined in the schema
  // but never actually queried).
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [leadUpdating, setLeadUpdating] = useState(null);
  const [leadActionError, setLeadActionError] = useState<string | null>(null);

  const loadLeads = () => {
    setLeadsLoading(true);
    setLeadsError(null);
    dealerApi.getLeads({ limit: 100 })
      .then((body) => { setLeads(body?.data?.items ?? []); setLeadsLoaded(true); })
      .catch(() => setLeadsError('Could not load your leads. Please try again.'))
      .finally(() => setLeadsLoading(false));
  };

  useEffect(() => {
    if ((activeSection === 'leads' || activeSection === 'pipeline') && user && !leadsLoaded) {
      loadLeads();
    }
  }, [activeSection, user, leadsLoaded]);

  const advanceLeadStage = async (leadId, nextStage) => {
    setLeadUpdating(leadId);
    setLeadActionError(null);
    try {
      const body = await dealerApi.updateLead(leadId, { stage: nextStage });
      if (!body?.data) throw new Error('Lead update returned no record');
      setLeads((prev) => prev.map((l) => l.id === leadId ? body.data : l));
    } catch {
      setLeadActionError('Could not update this lead. Please try again.');
    } finally {
      setLeadUpdating(null);
    }
  };

  // Fixed: Customers previously had no real backend equivalent at all.
  // Real customers are honestly derived from this
  // dealer's own real, released escrow deals.
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(null);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [customersRetry, setCustomersRetry] = useState(0);

  useEffect(() => {
    if (activeSection === 'customers' && user && !customersLoaded) {
      setCustomersLoading(true);
      setCustomersError(null);
      dealerApi.getCustomers()
        .then((body) => { setCustomers(body?.data?.items ?? []); setCustomersLoaded(true); })
        .catch(() => setCustomersError('Could not load your customers. Please try again.'))
        .finally(() => setCustomersLoading(false));
    }
  }, [activeSection, user, customersLoaded, customersRetry]);

  // Fixed: Marketing previously showed 4 fully invented campaigns with
  // fabricated impressions/clicks/ROI numbers, and its own real
  // "create campaign" action never actually saved anything at all -
  // it just echoed back whatever was submitted. Real campaigns below,
  // genuinely persisted via a new real table - performance metrics
  // (impressions, clicks, ROI) are intentionally not shown, since no
  // real ad-tracking infrastructure exists to back them honestly.
  const [operations, setOperations] = useState<DealerOperationResponse>({});
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState(null);

  useEffect(() => {
    const loaders = {
      auctions: dealerApi.getAuctionInventory,
      inspections: dealerApi.getInspectionOrders,
      analytics: dealerApi.getDealerAnalytics,
      // Phase 12 fix (dealer-platform convergence mission): this endpoint
      // already existed and was already dealer-scoped and safe
      // (backend/controllers/dealerPlatformController.js:getFinanceApplications,
      // reads loan_applications filtered by dealer: req.user.id) - the
      // dashboard's Finance tab just never called it, showing a stale
      // "not backed by a canonical dealer-scoped data contract yet"
      // placeholder instead. See KAYAD_DEALER_CAPABILITY_WIRING_MATRIX.md.
      finance: dealerApi.getFinanceApplications,
    };
    const loader = loaders[activeSection];
    if (!loader || !user || operations[activeSection]) return;
    setOperationsLoading(true);
    setOperationsError(null);
    loader()
      .then((response) => setOperations((prev) => ({ ...prev, [activeSection]: response.data })))
      .catch(() => setOperationsError(`Could not load ${activeSection}. Please try again.`))
      .finally(() => setOperationsLoading(false));
  }, [activeSection, user, operations]);

  // Phase 12 fix (R4/R5): Team and Reputation both had real, safe,
  // dealer-scoped backend endpoints with zero dashboard entry point.
  // Loaded the same way as customers/leads above - lazily, once per
  // section visit, re-fetchable via the loaded-flag being reset.
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamRetry, setTeamRetry] = useState(0);

  useEffect(() => {
    if (activeSection === 'team' && user && !teamLoaded) {
      setTeamLoading(true);
      setTeamError(null);
      dealerApi.getTeamMembers()
        .then((response) => { setTeam(response.members || []); setTeamLoaded(true); })
        .catch(() => setTeamError('Could not load your team. Please try again.'))
        .finally(() => setTeamLoading(false));
    }
  }, [activeSection, user, teamLoaded, teamRetry]);

  const [reputation, setReputation] = useState(null);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [reputationError, setReputationError] = useState(null);
  const [reputationLoaded, setReputationLoaded] = useState(false);
  const [reputationRetry, setReputationRetry] = useState(0);

  useEffect(() => {
    if (activeSection === 'reputation' && user && !reputationLoaded) {
      setReputationLoading(true);
      setReputationError(null);
      dealerApi.getReputation()
        .then((response) => { setReputation(response.data); setReputationLoaded(true); })
        .catch(() => setReputationError('Could not load your reputation. Please try again.'))
        .finally(() => setReputationLoading(false));
    }
  }, [activeSection, user, reputationLoaded, reputationRetry]);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState(null);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const loadCampaigns = () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    dealerApi.getMarketingCampaigns()
      .then((body) => { setCampaigns(body?.data?.items ?? []); setCampaignsLoaded(true); })
      .catch(() => setCampaignsError('Could not load your campaigns. Please try again.'))
      .finally(() => setCampaignsLoading(false));
  };

  useEffect(() => {
    if (activeSection === 'marketing' && user && !campaignsLoaded) {
      loadCampaigns();
    }
  }, [activeSection, user, campaignsLoaded]);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      await dealerApi.createCampaign({ name: newCampaignName.trim(), campaignType: 'promotion', budget: 0 });
      setNewCampaignName('');
      setCampaignsLoaded(false);
      loadCampaigns();
    } catch {
      setCampaignsError('Could not create this campaign. Please try again.');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // dealerPlatformApi resolves the response body: { success, data: <dashboard> }.
      const body = await dealerApi.getDealerDashboard();
      if (!body?.data) throw new Error('Dashboard response had no data');
      setDashboard(body.data);
    } catch {
      // Keep the failure visible instead of replacing unavailable data
      // with invented or stale business figures.
      setLoadError('Could not load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#64748B] mb-4">Sign in to manage your dealership.</p>
          <button onClick={onOpenAuth} className="bg-[#0A3340] text-white text-xs font-bold rounded-lg px-5 py-2.5">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const currentGroup = DEALER_NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeSection)) || DEALER_NAV_GROUPS[0];
  const currentItem = currentGroup.items.find((i) => i.id === activeSection) || currentGroup.items[0];
  const leadBadge = dashboard?.overview?.leads?.new;

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col lg:flex-row">
      {user?.role === 'dealer' && user?.status === 'pending' && (
        <div role="status" className="mx-3 mt-3 rounded-xl border border-[#D7E7E4] bg-[#EAF7F4] px-4 py-3 text-sm text-[#0A3340] lg:mx-6 lg:mt-5">
          <strong>Business verification is in progress.</strong>
          <p className="mb-0 mt-1 text-xs text-[#315B63]">
            You can publish and manage your own vehicle listings after submitting the required verification details. Auction, payout and other sensitive dealer features remain restricted until verification is approved.
          </p>
        </div>
      )}
      {/* Sidebar Navigation */}
      {/* Phone app bar: menu, where you are, notifications. Always reachable while scrolling. */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#D7E7E4] bg-white/95 px-3 py-2 backdrop-blur lg:hidden" data-testid="dealer-mobile-bar">
        <button type="button" aria-expanded={mobileNavOpen} aria-controls="dealer-workspace-sidebar" onClick={() => setMobileNavOpen(v => !v)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-3 text-sm font-semibold text-[#0A3340] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]"><Menu className="h-4 w-4" aria-hidden="true" /><span>{mobileNavOpen ? "Close dealer menu" : "Dealer menu"}</span></button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-[#0A3340]" aria-hidden="true">{currentItem.label}</p>
      </div>
      {mobileNavOpen && <button type="button" aria-label="Close dealer menu overlay" tabIndex={-1} onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-[1090] bg-[#071F2A]/55 lg:hidden" />}
      <aside id="dealer-workspace-sidebar" className={`${mobileNavOpen ? "flex" : "hidden"} lg:flex fixed inset-y-0 left-0 z-[1100] w-[88%] max-w-sm overflow-hidden shadow-2xl lg:static lg:z-auto lg:w-64 lg:min-w-64 lg:max-w-none lg:shadow-none bg-white lg:border-r border-[#D7E7E4] flex-col lg:sticky lg:top-0 lg:h-screen`}>
        <div className="p-4 border-b border-[#D7E7E4]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#176B87] to-[#13B8A6] flex items-center justify-center overflow-hidden">
              {branding.logoType === 'image' && branding.logoUrl ? <img src={branding.logoUrl} alt={branding.logoText || 'KAYARD KE'} className="w-full h-full object-contain bg-white" /> : branding.logoType === 'text' ? <span className="text-xs font-black text-white">{branding.logoText || 'KAYARD KE'}</span> : <img src={branding.logoUrl || '/branding/kayad-symbol.svg'} alt={branding.logoText || 'KAYARD KE'} className="w-full h-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[#0A3340] truncate">{branding.logoText || 'KAYARD KE'}</h1>
              <p className="text-xs text-[#64748B] truncate">{user?.businessName || user?.name || 'Dealer account'}</p>
            </div>
          </div>
        </div>

        <nav aria-label="Dealer workspace" className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 lg:p-4">
          {DEALER_NAV_GROUPS.map((group, index) => (
            <div
              key={group.id}
              role="group"
              aria-labelledby={`dealer-nav-${group.id}`}
              className={`space-y-1 ${index > 0 ? 'mt-3 border-t border-[#D7E7E4] pt-3' : ''}`}
            >
              <p id={`dealer-nav-${group.id}`} className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavTab
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  badge={item.id === 'leads' ? leadBadge : undefined}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#D7E7E4] space-y-3">
          <DealerAccountStatus />
          {logoutError && <p role="alert" className="text-sm text-red-700">{logoutError}</p>}
          <button type="button" onClick={handleDealerLogout} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#D7E7E4] px-4 py-2 text-sm font-semibold text-[#0A3340] hover:bg-[#EEF7F5]"><LogOut className="w-4 h-4" />Sign out</button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-3 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="relative mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 pr-12 sm:pr-0">
              <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-[#64748B]">
                {activeSection === 'overview' ? (
                  <span aria-current="page">Dealer Hub</span>
                ) : (
                  <>
                    <button type="button" onClick={() => setActiveSection('overview')} className="inline-flex items-center gap-1 font-medium text-[#176B87] hover:text-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]">
                      <ChevronLeft className="w-3 h-3" aria-hidden="true" />Dealer Hub
                    </button>
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    <span>{currentGroup.label}</span>
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    <span aria-current="page" className="font-medium text-[#0A3340]">{currentItem.label}</span>
                  </>
                )}
              </nav>
              <h2 className="text-xl font-bold text-[#0A3340] sm:text-2xl">{currentItem.title}</h2>
              <p className="text-sm text-[#64748B] sm:text-base">{activeSection === 'overview' ? `Welcome back, ${user?.name || 'dealer'}` : currentItem.description}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center rounded-xl border border-[#D7E7E4] bg-white p-1 sm:inline-flex" aria-label="Page history">
                <button type="button" aria-label="Go to previous page" title="Previous page" onClick={() => window.history.back()} className="rounded-lg p-2 text-[#176B87] hover:bg-[#EEF7F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="Go to next page" title="Next page" onClick={() => window.history.forward()} className="rounded-lg p-2 text-[#176B87] hover:bg-[#EEF7F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <button type="button" aria-label="Notifications" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center sm:static sm:h-auto sm:w-auto p-2 bg-white border border-[#D7E7E4] rounded-xl hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]" onClick={() => { window.location.assign('/notifications'); }}>
                <Bell className="w-5 h-5 text-[#64748B]" aria-hidden="true" />
              </button>
              {activeSection !== 'inventory' && (
                <button type="button" onClick={() => setActiveSection('inventory')} className={`${activeSection === 'overview' ? 'flex' : 'hidden sm:flex'} min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#176B87] px-4 py-2 font-medium text-white hover:bg-[#12576D] sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]`}>
                  <Car className="w-5 h-5" aria-hidden="true" />
                  Manage Inventory
                </button>
              )}
            </div>
          </div>

          {loadError && activeSection === 'overview' && (
            <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#FDA29B] bg-[#FEF3F2] p-4 text-sm text-[#7A271A]">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="flex-1"><span>{loadError}</span> The other sections of your Dealer Hub still work.</span>
              <button type="button" onClick={loadDashboard} className="bg-[#0A3340] text-white text-xs font-bold rounded-lg px-4 py-2">Try Again</button>
            </div>
          )}

          {activeSection === 'overview' && (() => {
            const ov = dashboard?.overview;
            const leadsOv = ov?.leads;
            const dataReady = !loading && !!dashboard;
            const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
            const totalLeads = num(leadsOv?.total);
            const newLeads = num(leadsOv?.new);
            const sold = num(leadsOv?.sold);
            const st = ov?.listingStatus;
            const listingCaption = st ? [st.available != null ? `${st.available} live` : null, st.pending ? `${st.pending} pending review` : null, st.draft ? `${st.draft} draft` : null].filter(Boolean).join(' · ') : undefined;
            // Conversion is shown only when it can be calculated from real counts (at least one lead, and a real "sold" count).
            const conversion = totalLeads && totalLeads > 0 && sold != null ? Math.round((sold / totalLeads) * 100) : null;
            const stages: Array<[string, string, string]> = [
              ['New', 'new', '#13B8A6'], ['Contacted', 'contacted', '#176B87'], ['Negotiating', 'negotiating', '#0A3340'],
              ['Inspection booked', 'inspectionBooked', '#5AAFA4'], ['Reserved', 'reserved', '#0E4655'],
            ];
            const activity = Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [];
            const performers = Array.isArray(dashboard?.topPerformers?.vehicles) ? dashboard.topPerformers.vehicles : [];
            return (
            <div data-testid="dealer-overview">
              {/* Business summary: real figures only. "—" = unavailable, 0 = a genuine zero, skeleton = still loading. */}
              <div className="mb-5 grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 sm:mb-6 sm:gap-4 xl:grid-cols-4">
                <StatCard title="Total Listings" loading={loading} onOpen={() => setActiveSection('inventory')} openLabel="Open inventory" value={ov?.totalListings ?? '—'} caption={listingCaption} icon={Car} />
                <StatCard title="Total Leads" loading={loading} onOpen={() => setActiveSection('leads')} openLabel="Open leads" value={totalLeads ?? '—'} caption={newLeads != null ? (newLeads > 0 ? `${newLeads} new, awaiting your response` : 'No new enquiries waiting') : undefined} icon={Users} />
                <StatCard title="Total Views" loading={loading} value={ov?.totalViews == null ? '—' : Number(ov.totalViews).toLocaleString('en-KE')} caption="All time, across your listings" icon={Eye} />
                <StatCard title="Revenue (released escrow, all time)" loading={loading} value={ov?.revenue?.total == null ? '—' : `Ksh ${Number(ov.revenue.total).toLocaleString('en-KE')}`} icon={DollarSign} />
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 sm:mb-6 sm:gap-6 xl:grid-cols-3">
                {/* Lead pipeline */}
                <section aria-labelledby="dealer-pipeline-title" className="rounded-xl border border-[#D7E7E4] bg-white p-4 sm:p-5 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 id="dealer-pipeline-title" className="font-bold text-[#0A3340]">Lead pipeline</h3>
                    <button type="button" onClick={() => setActiveSection('pipeline')} className="min-h-[44px] px-2 text-sm font-semibold text-[#176B87] hover:text-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]">Open pipeline</button>
                  </div>
                  {loadError && !dashboard ? (
                    <p className="rounded-lg bg-[#F6FAF9] p-4 text-sm text-[#475569]">Pipeline figures are unavailable right now. Use “Try Again” above.</p>
                  ) : dataReady && totalLeads === 0 ? (
                    <div className="rounded-lg bg-[#F6FAF9] p-4 text-sm text-[#475569]" data-testid="pipeline-empty">
                      <p className="font-semibold text-[#12576D]">No enquiries yet</p>
                      <p className="mt-1">When buyers contact you about a vehicle, each lead appears here by stage. Complete, well-photographed listings attract more enquiries.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2 lg:grid-cols-3">
                      {stages.map(([label, key, color]) => <PipelineStage key={key} stage={label} color={color} loading={loading} count={num((leadsOv as any)?.[key]) ?? '—'} onOpen={() => setActiveSection('pipeline')} />)}
                    </div>
                  )}
                  {dataReady && totalLeads != null && totalLeads > 0 && (
                    <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#F6FAF9] p-3.5 min-[460px]:grid-cols-2" data-testid="pipeline-outcomes">
                      <div><dt className="text-xs text-[#64748B]">Sold from enquiries</dt><dd className="text-xl font-bold text-[#0A3340]">{sold ?? 0} <span className="text-sm font-medium text-[#475569]">of {totalLeads}{conversion != null ? ` · ${conversion}%` : ''}</span></dd></div>
                      <div><dt className="text-xs text-[#64748B]">Closed without a sale</dt><dd className="text-xl font-bold text-[#0A3340]">{num((leadsOv as any)?.lost) ?? 0}</dd></div>
                    </dl>
                  )}
                </section>

                {/* Recent activity */}
                <section aria-labelledby="dealer-activity-title" className="rounded-xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
                  <h3 id="dealer-activity-title" className="mb-2 font-bold text-[#0A3340]">Recent activity</h3>
                  {loading ? (
                    <div className="space-y-3" role="status" aria-label="Loading recent activity">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-[#E1EDEB]" />)}</div>
                  ) : activity.length ? (
                    <div>{activity.slice(0, 6).map((a: any, i: number) => <ActivityItem key={a.id || i} message={a.message} time={a.time} icon={a.type === 'view' ? Eye : a.type === 'sale' ? CheckCircle2 : a.type === 'listing' ? Car : MessageSquare} onOpen={() => setActiveSection('leads')} />)}</div>
                  ) : (
                    <p className="rounded-lg bg-[#F6FAF9] px-3 py-3 text-sm text-[#475569]" data-testid="activity-empty">{loadError ? 'Activity is unavailable right now.' : 'No activity yet. New enquiries and lead updates will appear here.'}</p>
                  )}
                </section>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
                {/* Inventory performance */}
                <section aria-labelledby="dealer-performance-title" className="rounded-xl border border-[#D7E7E4] bg-white p-4 sm:p-5 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 id="dealer-performance-title" className="font-bold text-[#0A3340]">Inventory performance</h3>
                    <button type="button" onClick={() => setActiveSection('inventory')} className="min-h-[44px] px-2 text-sm font-semibold text-[#176B87] hover:text-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]">View inventory</button>
                  </div>
                  {loading ? (
                    <div className="space-y-2.5" role="status" aria-label="Loading inventory performance">{[0, 1].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-xl bg-[#E1EDEB]" />)}</div>
                  ) : performers.length ? (
                    <div className="space-y-2.5">{performers.map((vehicle: any, i: number) => <TopVehicle key={vehicle.id} vehicle={vehicle} rank={i + 1} onOpen={() => setActiveSection('inventory')} />)}</div>
                  ) : (
                    <div className="rounded-lg bg-[#F6FAF9] p-4 text-sm text-[#475569]" data-testid="performance-empty">
                      <p className="font-semibold text-[#12576D]">{loadError ? 'Inventory performance is unavailable right now.' : 'No listings to rank yet'}</p>
                      {!loadError && <p className="mt-1">Add your first vehicle and its views and enquiries will be ranked here.</p>}
                    </div>
                  )}
                </section>

                {/* Quick actions */}
                <section aria-labelledby="dealer-actions-title" className="rounded-xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
                  <h3 id="dealer-actions-title" className="mb-3 font-bold text-[#0A3340]">Quick actions</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <QuickAction icon={Plus} label="Add a vehicle" onClick={() => openListingForm({ mode: 'create' })} />
                    <QuickAction icon={Car} label="Manage inventory" onClick={() => setActiveSection('inventory')} />
                    <QuickAction icon={Users} label="View leads" onClick={() => setActiveSection('leads')} />
                    <QuickAction icon={Target} label="Lead pipeline" onClick={() => setActiveSection('pipeline')} />
                    <QuickAction icon={Calendar} label="Inspections" onClick={() => setActiveSection('inspections')} />
                    <QuickAction icon={Settings} label="Dealer settings" onClick={() => setActiveSection('settings')} />
                  </div>
                </section>
              </div>
            </div>
            );
          })()}

          {activeSection === 'inventory' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-3 sm:p-6">
              {listingForm ? null : (
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                  <h3 className="text-lg font-bold text-[#0A3340] sm:text-xl">Inventory Management</h3>
                  <button type="button" onClick={() => openListingForm({ mode: 'create' })} className="whitespace-nowrap px-4 py-2.5 bg-[#176B87] text-white font-medium rounded-xl hover:bg-[#12576D] flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add vehicle
                  </button>
                </div>
              )}
              {listingNotice && !listingForm && (
                <p role="status" className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{listingNotice}</p>
              )}
              {/* Fixed: this entire section previously never fetched
                  anything - every stat below and all 4 listed
                  vehicles were hardcoded directly in the JSX (the
                  same "Toyota Land Cruiser 300 GX-R" invented model
                  found earlier in this same file's now-fixed backend
                  call), identical for every dealer regardless of
                  what's actually in the database. Real counts and
                  real listings below, computed from this dealer's own
                  real inventory (getMyListings). The "Filter" button
                  had no onClick handler at all - removed rather than
                  left as dead UI, since no real filtering logic
                  exists here to wire it to. */}
              {listingForm && (listingForm.mode === 'create' || (!listingsLoading && !listingsError && listingsLoaded)) ? (
                listingForm.mode === 'edit' && !myListings.find((c) => String(c.id || c._id) === listingForm.id) ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-[#64748B] mb-3">This listing was not found in your inventory.</p>
                    <button type="button" onClick={() => openListingForm(null)} className="text-xs font-bold text-[#176B87]">Back to inventory</button>
                  </div>
                ) : (
                  <DealerListingForm
                    key={`${listingForm.mode}-${listingForm.id || 'new'}`}
                    mode={listingForm.mode}
                    car={listingForm.mode === 'edit' ? myListings.find((c) => String(c.id || c._id) === listingForm.id) : null}
                    onPhotosChanged={() => { photosChangedRef.current = true; }}
                    onCancel={() => { if (photosChangedRef.current) { photosChangedRef.current = false; setListingsLoaded(false); } openListingForm(null); }}
                    onSaved={() => {
                      photosChangedRef.current = false;
                      setListingsLoaded(false);
                      setListingNotice(listingForm.mode === 'create' ? 'Vehicle submitted. It now appears in your inventory.' : 'Changes saved.');
                      setListingFormState(null);
                      writeListingFormToUrl(null);
                    }}
                  />
                )
              ) : listingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#176B87] animate-spin" />
                </div>
              ) : listingsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B] mb-3">{listingsError}</p>
                  <button onClick={() => setListingsRetry((attempt) => attempt + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button>
                </div>
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-700">{myListings.filter((l) => l.status === 'available' || l.status === 'active').length}</p>
                      <p className="text-xs text-emerald-800">Published</p>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-teal-700">{myListings.filter((l) => l.status === 'pending').length}</p>
                      <p className="text-xs text-teal-800">Pending review</p>
                    </div>
                    <div className="p-3 bg-[#F3FAF9] rounded-xl text-center">
                      <p className="text-2xl font-bold text-[#176B87]">{myListings.filter((l) => l.status === 'draft').length}</p>
                      <p className="text-xs text-[#176B87]">Draft</p>
                    </div>
                    <div className="p-3 bg-[#F3FAF9] rounded-xl text-center">
                      <p className="text-2xl font-bold text-[#176B87]">{myListings.filter((l) => l.status === 'reserved').length}</p>
                      <p className="text-xs text-[#176B87]">Reserved</p>
                    </div>
                    <div className="p-3 bg-[#EEF7F5] rounded-xl text-center">
                      <p className="text-2xl font-bold text-[#64748B]">{myListings.filter((l) => l.status === 'sold').length}</p>
                      <p className="text-xs text-[#475569]">Sold</p>
                    </div>
                  </div>
                  {myListings.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap" data-testid="inventory-controls">
                      <input type="search" value={invQuery} onChange={(e) => setInvQuery(e.target.value)} placeholder="Search make, model, title…" aria-label="Search your inventory" className="col-span-2 min-h-11 flex-1 sm:min-w-[180px] px-3 py-2 text-base sm:text-sm border border-[#B9D3CF] rounded-lg" />
                      <select value={invStatus} onChange={(e) => setInvStatus(e.target.value)} aria-label="Filter by status" className="min-h-11 px-3 py-2 text-sm border border-[#B9D3CF] rounded-lg bg-white">
                        <option value="all">All statuses</option>
                        <option value="published">Published</option>
                        <option value="pending">Pending review</option>
                        <option value="draft">Draft</option>
                        <option value="reserved">Reserved</option>
                        <option value="sold">Sold</option>
                      </select>
                      <select value={invSort} onChange={(e) => setInvSort(e.target.value as typeof invSort)} aria-label="Sort inventory" className="min-h-11 px-3 py-2 text-sm border border-[#B9D3CF] rounded-lg bg-white">
                        <option value="newest">Newest first</option>
                        <option value="price_desc">Price: high to low</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="views">Most viewed</option>
                      </select>
                      <p className="col-span-2 text-xs text-[#475569] sm:ml-auto" data-testid="inventory-count">Showing {visibleListings.length} of {invStatus === 'sold' ? soldListings.length : activeListings.length} {invStatus === 'sold' ? 'sold' : 'active'}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {myListings.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-[#64748B] mb-3">You haven't listed any vehicles yet.</p>
                        <button type="button" onClick={() => openListingForm({ mode: 'create' })} className="px-4 py-2 bg-[#176B87] text-white text-sm font-medium rounded-xl hover:bg-[#12576D]">Add your first vehicle</button>
                      </div>
                    ) : visibleListings.length === 0 ? (
                      <p className="text-sm text-[#64748B] text-center py-8" data-testid="inventory-no-match">{activeListings.length === 0 && invStatus !== 'sold' ? 'No active vehicles. Add a vehicle or open the Sold list below.' : 'No vehicles match your search or filter.'}</p>
                    ) : visibleListings.map((car, rowIdx) => {
                      const image = car.images?.[0]?.thumb || car.images?.[0]?.url;
                      const carId = String(car.id || car._id);
                      const label = car.title || `${car.year} ${car.brand} ${car.model}`;
                      const updatedRaw = car.updatedAt || car.updated_at;
                      const updated = updatedRaw && !Number.isNaN(Date.parse(String(updatedRaw))) ? new Date(String(updatedRaw)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                      const bids = Number(car.bidsCount ?? car.bids_count ?? 0);
                      const aStatus = String(car.auctionStatus ?? car.auction_status ?? '');
                      const isAuctionListing = Boolean(car.isAuction || car.hasAuction || car.has_auction || (aStatus && aStatus !== 'none' && aStatus !== 'draft') || bids > 0);
                      const isSoldListing = car.status === 'sold';
                      const statusText = car.status ? String(car.status).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Status unavailable';
                      const confirming = deleteTargetId === carId;
                      const photoCount = Array.isArray(car.images) ? car.images.length : 0;
                      const mileageNum = Number(car.mileage);
                      const detailLine = [
                        car.year ? String(car.year) : '',
                        Number.isFinite(mileageNum) && mileageNum > 0 ? `${mileageNum.toLocaleString('en-KE')} km` : '',
                        car.city || car.location_city || '',
                      ].filter(Boolean).join(' · ');
                      return (
                        <div key={car.id} data-testid="inventory-row" className="rounded-2xl border border-[#D7E7E4] bg-white p-3 shadow-[0_2px_10px_rgba(11,29,58,0.04)] transition hover:border-[#176B87]/40 hover:shadow-[0_8px_22px_rgba(11,29,58,0.08)] sm:p-4">
                          <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:flex sm:items-center sm:gap-4">
                            <span className="hidden sm:inline w-7 text-center text-sm font-bold text-[#475569] shrink-0" aria-label={`Listing number ${rowIdx + 1}`} data-testid="inventory-row-number">{rowIdx + 1}</span>
                            <ListingThumb src={image} fallback={car.images?.[0]?.url} alt={label} count={photoCount} priority={rowIdx < 3} className="h-20 w-full sm:h-24 sm:w-36" />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-[15px] font-bold text-[#0A3340]">{label}</p>
                              <p className="text-sm font-semibold text-[#176B87]">{car.price == null ? 'Price unavailable' : `Ksh ${Number(car.price).toLocaleString('en-KE')}`} • {car.views == null ? 'Views unavailable' : `${Number(car.views).toLocaleString('en-KE')} views`}</p>
                              {detailLine && <p className="text-xs text-[#475569]" data-testid="inventory-details">{detailLine}</p>}
                              {updated && <p className="text-xs text-[#475569]">Updated {updated}</p>}
                            </div>
                            <ListingStatusBadge status={car.status} label={statusText} className="col-start-2 justify-self-start" />
                            <div className="col-span-2 grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap [&>button]:min-h-10 [&>button]:justify-center">
                              {!isSoldListing && !(aStatus === 'live') && (
                                <button type="button" onClick={() => { setSoldError(null); setSoldBuyer(''); setSoldPrice(''); setSoldTargetId(carId); }} className="px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]" aria-label={`Mark ${car.title || 'vehicle'} as sold`}>Mark sold</button>
                              )}
                              <button type="button" onClick={() => openListingForm({ mode: 'edit', id: carId })} className="px-3 py-1 text-xs font-bold text-[#176B87] border border-[#B9D3CF] rounded-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]" aria-label={`Edit ${car.title || 'vehicle'}`}>Edit</button>
                              {!isAuctionListing && !isSoldListing && (
                                <button type="button" disabled={Boolean(deletingId)} onClick={() => { setDeleteError(null); setDeleteTargetId(carId); }} className="px-3 py-1 text-xs font-bold text-[#B42318] border border-[#B9D3CF] rounded-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]" aria-label={`Remove ${car.title || 'vehicle'}`}>Remove</button>
                              )}
                            </div>
                          </div>
                          {isAuctionListing && <p className="mt-2 text-xs text-[#475569]">Listings with an auction cannot be removed from this screen.</p>}
                          {isSoldListing && !isAuctionListing && <p className="mt-2 text-xs text-[#475569]">Sold listings cannot be removed; completed sales are handled through escrow.</p>}
                          {soldTargetId === carId && (
                            <div role="alertdialog" aria-label={`Confirm marking ${label} as sold`} className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-950">
                              <p className="font-semibold">Mark “{label}” as sold?</p>
                              <p className="text-xs mt-1">It will leave your active inventory (the list renumbers) and stop appearing to buyers. You can add the buyer and final price for your records.</p>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input value={soldBuyer} onChange={(e) => setSoldBuyer(e.target.value)} maxLength={200} placeholder="Buyer name (optional)" aria-label="Buyer name" className="px-3 py-2 text-sm border border-emerald-300 rounded-lg bg-white" />
                                <input value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} inputMode="numeric" placeholder="Final price Ksh (optional)" aria-label="Final sale price" className="px-3 py-2 text-sm border border-emerald-300 rounded-lg bg-white" />
                              </div>
                              {soldError && <p role="alert" className="mt-2 font-medium text-[#7A271A]">{soldError}</p>}
                              <div className="mt-2 flex gap-2">
                                <button type="button" disabled={soldBusy} onClick={() => confirmMarkSold(car)} aria-busy={soldBusy} className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-700 text-white disabled:opacity-60 flex items-center gap-1">
                                  {soldBusy && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}{soldBusy ? 'Saving…' : soldError ? 'Try again' : 'Yes, mark as sold'}
                                </button>
                                <button type="button" disabled={soldBusy} onClick={() => { setSoldTargetId(null); setSoldError(null); }} className="px-3 py-1 text-xs font-bold rounded-lg border border-emerald-300 text-emerald-900">Cancel</button>
                              </div>
                            </div>
                          )}
                          {confirming && (
                            <div role="alertdialog" aria-label={`Confirm removing ${label}`} className="mt-3 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">
                              <p>Remove “{label}” from your inventory? It will no longer appear to buyers.</p>
                              {deleteError && <p role="alert" className="mt-2 font-medium">{deleteError}</p>}
                              <div className="mt-2 flex gap-2">
                                <button type="button" autoFocus disabled={Boolean(deletingId)} onClick={() => confirmDeleteListing(car)} aria-busy={deletingId === carId} className="px-3 py-1 text-xs font-bold rounded-lg bg-[#B42318] text-white disabled:opacity-60 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
                                  {deletingId === carId && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}{deletingId === carId ? 'Removing…' : deleteError ? 'Try again' : 'Remove listing'}
                                </button>
                                <button type="button" disabled={Boolean(deletingId)} onClick={() => { setDeleteTargetId(null); setDeleteError(null); }} className="px-3 py-1 text-xs font-bold rounded-lg border border-[#B9D3CF] text-[#0A3340] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">Keep listing</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {soldListings.length > 0 && invStatus !== 'sold' && (
                    <div className="mt-6 border-t border-[#D7E7E4] pt-4" data-testid="sold-section">
                      <button type="button" onClick={() => setShowSold((v) => !v)} aria-expanded={showSold} className="w-full flex items-center justify-between text-left text-sm font-bold text-[#0A3340] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340] rounded-lg">
                        <span>Sold vehicles ({soldListings.length})</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showSold ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {showSold && (
                        <ul className="mt-3 space-y-2" aria-label="Sold vehicles">
                          {soldListings.map((car) => {
                            const img = car.images?.[0]?.thumb || car.images?.[0]?.url;
                            const name = car.title || `${car.year} ${car.brand} ${car.model}`;
                            return (
                              <li key={String(car.id || car._id)} className="flex items-center gap-3 p-2 rounded-lg bg-[#EEF7F5]">
                                <div className="w-14 h-10 rounded-md bg-[#DDF4F0] overflow-hidden shrink-0 flex items-center justify-center">{img ? <img src={img} alt="" loading="lazy" className="w-full h-full object-cover grayscale" /> : <Car className="w-5 h-5 text-[#64748B]" aria-hidden="true" />}</div>
                                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#0A3340] truncate">{name}</p><p className="text-xs text-[#475569]">{car.price == null ? '' : `Listed at Ksh ${Number(car.price).toLocaleString('en-KE')}`}</p></div>
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#DDE7E5] text-[#475569]">Sold</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === 'leads' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#0A3340]">Lead Management (CRM)</h3>
              </div>
              {/* Fixed: this whole table previously showed 5
                  entirely invented leads - fake emails, a fake "lead
                  score" and fake staff assignments with no real
                  scoring or team-assignment system anywhere in this
                  project. Removed those 2 fake columns rather than
                  fake a version of either; the rest (name, email,
                  phone, vehicle, real source, real stage, real
                  timestamp) are all genuinely real now. The dead
                  "Filter"/"Export" buttons (no onClick handler on
                  either) were removed rather than left non-functional. */}
              {leadsLoading || (!leadsLoaded && !leadsError) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#176B87] animate-spin" />
                </div>
              ) : leadsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B] mb-3">{leadsError}</p>
                  <button onClick={loadLeads} className="text-xs font-bold text-[#176B87]">Try Again</button>
                </div>
              ) : leads.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-12">No leads yet.</p>
              ) : (
                <div className="overflow-x-auto" role="region" aria-label="Leads table" tabIndex={0}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#D7E7E4]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Lead</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Vehicle</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Source</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Stage</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-[#D7E7E4] hover:bg-[#F6FAF9]">
                          <td className="py-3 px-4">
                            <p className="font-medium text-[#0A3340]">{lead.buyer?.name || 'Unknown'}</p>
                            <p className="text-xs text-[#64748B]">{lead.buyer?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-[#12576D]">{lead.vehicle?.title || 'Vehicle'}</td>
                          <td className="py-3 px-4 text-[#12576D]">{lead.source || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              lead.stage === 'new' ? 'bg-[#DDF4F0] text-[#12576D]' :
                              lead.stage === 'contacted' ? 'bg-[#DDF4F0] text-[#12576D]' :
                              lead.stage === 'negotiating' ? 'bg-[#DDF4F0] text-[#12576D]' :
                              lead.stage === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-[#EEF7F5] text-[#475569]'
                            }`}>
                              {(lead.stage || 'new').replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#64748B]">{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : 'Never'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSection === 'pipeline' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="text-xl font-bold text-[#0A3340] mb-6">Sales Pipeline</h3>
              {leadActionError && <p role="alert" className="mb-4 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">{leadActionError}</p>}
              {/* Fixed: this section had a real nav entry (Pipeline)
                  but zero content behind it at all - clicking it
                  showed nothing. Real, working kanban-style view now,
                  sharing the same real leads data as the table above.
                  Advancing a lead's stage genuinely persists (the
                  real backend's own updateLead previously just echoed
                  back whatever was sent without writing to the
                  database at all - fixed as part of this same pass). */}
              {leadsLoading || (!leadsLoaded && !leadsError) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#176B87] animate-spin" />
                </div>
              ) : leadsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B] mb-3">{leadsError}</p>
                  <button onClick={loadLeads} className="text-xs font-bold text-[#176B87]">Try Again</button>
                </div>
              ) : (
                <>
                {(() => {
                  const shown = ['new', 'contacted', 'negotiating', 'sold'];
                  const other = leads.filter((l) => !shown.includes(l.stage || 'new')).length;
                  return other > 0 ? <p className="mb-3 text-xs text-[#475569]">{other} {other === 1 ? 'lead is' : 'leads are'} in other stages (test drive, escrow started or lost) and appear in the Leads table.</p> : null;
                })()}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {['new', 'contacted', 'negotiating', 'sold'].map((stage, stageIdx) => {
                    const nextStage = ['new', 'contacted', 'negotiating', 'sold'][stageIdx + 1];
                    const stageLeads = leads.filter((l) => (l.stage || 'new') === stage);
                    return (
                      <div key={stage} className="bg-[#F6FAF9] rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <h4 className="text-sm font-bold text-[#0A3340] capitalize">{stage}</h4>
                          <span className="min-w-6 px-2 py-0.5 rounded-full bg-white border border-[#D7E7E4] text-xs font-bold text-[#176B87] text-center" aria-label={`${stageLeads.length} ${stageLeads.length === 1 ? 'lead' : 'leads'}`}>{stageLeads.length}</span>
                        </div>
                        <div className="space-y-2">
                          {stageLeads.length === 0 ? (
                            <p className="text-xs text-[#64748B]">Empty</p>
                          ) : stageLeads.map((lead) => (
                            <div key={lead.id} className="bg-white rounded-lg p-3 border border-[#D7E7E4] shadow-xs">
                              <p className="text-sm font-bold text-[#0A3340] break-words">{lead.buyer?.name || 'Unknown'}</p>
                              <p className="text-xs text-[#475569] mb-2 break-words">{lead.vehicle?.title || 'Vehicle'}</p>
                              {nextStage && (
                                <button
                                  onClick={() => advanceLeadStage(lead.id, nextStage)}
                                  disabled={leadUpdating === lead.id}
                                  aria-label={`Move ${lead.buyer?.name || 'lead'} to ${nextStage}`}
                                  className="text-xs font-bold text-[#176B87] disabled:opacity-50 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]"
                                >
                                  {leadUpdating === lead.id ? 'Moving…' : `Move to ${nextStage} →`}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'escrow' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#0A3340]">Escrow transactions</h2>
                <p className="mt-1 text-sm text-[#64748B]">View and manage only the deals associated with your authenticated account. Available actions are supplied by KAYARD KE’s backend.</p>
              </div>
              <ParticipantEscrowDesk key={user?.id ?? 'signed-out'} initialEscrowId={new URLSearchParams(window.location.search).get('escrowId')} onNavigate={onNavigate} />
            </div>
          )}

          {activeSection === 'customers' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="text-xl font-bold text-[#0A3340] mb-6">Customers</h3>
              {/* Fixed: this section had a real nav entry but zero
                  content behind it at all. Real customers below,
                  honestly derived from this dealer's own real,
                  released escrow deals (there is no separate real
                  "customer" entity anywhere in this project's
                  schema). */}
              {customersLoading || (!customersLoaded && !customersError) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#176B87] animate-spin" />
                </div>
              ) : customersError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B] mb-3">{customersError}</p>
                  <button onClick={() => setCustomersRetry((attempt) => attempt + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button>
                </div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-12">No customers yet - customers appear here once a real deal completes.</p>
              ) : (
                <div className="space-y-3">
                  {customers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
                      <div>
                        <p className="font-medium text-[#0A3340]">{c.name}</p>
                        <p className="text-xs text-[#64748B]">{c.email}{Array.isArray(c.vehicles) ? ` • ${c.vehicles.length} vehicle${c.vehicles.length === 1 ? '' : 's'}` : ''}</p>
                      </div>
                      <p className="text-sm font-bold text-[#0A3340]">{c.totalSpent == null || !Number.isFinite(Number(c.totalSpent)) ? 'Spend unavailable' : `Ksh ${Number(c.totalSpent).toLocaleString('en-KE')}`}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'marketing' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="text-xl font-bold text-[#0A3340] mb-6">Marketing</h3>
              {/* Fixed: this section had a real nav entry but zero
                  content behind it at all. Real campaigns below, with
                  a real create form - performance metrics
                  (impressions/clicks/ROI) are intentionally not shown
                  since no real ad-tracking infrastructure exists to
                  back them honestly. */}
              <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="New campaign name"
                  aria-label="New campaign name"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleCreateCampaign(); } }}
                  className="min-h-11 min-w-0 flex-1 border border-[#D7E7E4] rounded-xl px-3 py-2 text-base sm:text-sm"
                />
                <button
                  onClick={handleCreateCampaign}
                  disabled={creatingCampaign || !newCampaignName.trim()}
                  className="min-h-11 whitespace-nowrap px-4 py-2 bg-[#176B87] text-white rounded-xl font-medium hover:bg-[#12576D] disabled:opacity-50"
                >
                  {creatingCampaign ? 'Creating…' : 'Create Campaign'}
                </button>
              </div>
              {campaignsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#176B87] animate-spin" />
                </div>
              ) : campaignsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B] mb-3">{campaignsError}</p>
                  <button onClick={loadCampaigns} className="text-xs font-bold text-[#176B87]">Try Again</button>
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-8">No campaigns yet.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
                      <div>
                        <p className="font-medium text-[#0A3340]">{c.name}</p>
                        <p className="text-xs text-[#64748B] capitalize">{c.campaign_type || 'Campaign'} • {c.budget == null || !Number.isFinite(Number(c.budget)) ? 'Budget unavailable' : `Budget Ksh ${Number(c.budget).toLocaleString('en-KE')}`}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'draft' ? 'bg-[#EEF7F5] text-[#475569]' :
                        'bg-[#DDF4F0] text-[#12576D]'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {['auctions', 'finance', 'inspections', 'settings', 'banking'].includes(activeSection) && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="sr-only">{currentItem.label}</h3>
              {/* Phase 12 fix: "finance" used to be grouped with "team"/"settings"
                  as a hardcoded "not backed yet" stub, but a real, dealer-scoped,
                  already-safe backend contract for finance already existed
                  (getFinanceApplications) - only the UI binding was missing.
                  "team" was moved to its own section below once it was wired to
                  the real, already-authorized dealer-platform team endpoints.
                  "settings" has no backend contract found in this audit, so it
                  honestly keeps the disclosed-gap placeholder. */}
              {activeSection === 'settings' ? (
                <DealerSettingsPanel userId={String(user?.id || user?._id || '')} onOpenSection={setActiveSection} />
              ) : activeSection === 'banking' ? (
                <><DealerBankingPanel /><DealerCollectionAccountPanel /></>
              ) : operationsLoading || (!operations[activeSection] && !operationsError) ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" /></div>
              ) : operationsError ? (
                <div className="py-12 text-center"><p className="text-sm text-[#64748B] mb-3">{operationsError}</p><button onClick={() => setOperations((prev) => ({ ...prev, [activeSection]: undefined }))} className="text-xs font-bold text-[#176B87]">Try Again</button></div>
              ) : activeSection === 'auctions' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <a href="/dealer/auction-operations" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176B87] px-4 text-sm font-medium text-white hover:bg-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">Auction operations<ExternalLink className="w-4 h-4" aria-hidden="true" /></a>
                    <a href="/dealer/auction-setup" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-4 text-sm font-medium text-[#12576D] hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]">Set up an auction<ExternalLink className="w-4 h-4" aria-hidden="true" /></a>
                  </div>
                  {(operations.auctions?.items || []).length === 0 ? <p className="py-10 text-center text-sm text-[#64748B]">No auctions found for this dealership.</p> : (operations.auctions.items || []).map((auction) => (
                    <div key={auction.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 p-4 bg-[#F6FAF9] rounded-xl">
                      <div><p className="font-medium text-[#0A3340]">{auction.title}</p><p className="text-xs text-[#64748B]">{auction.bidsCount} bids • {auction.views} views</p></div>
                      <div className="text-right"><p className="font-bold text-[#0A3340]">Ksh {Number(auction.currentBid || auction.startingBid || 0).toLocaleString()}</p><span className="text-xs capitalize text-[#64748B]">{auction.status}</span><button type="button" aria-expanded={insightsFor === String(auction.id)} onClick={() => setInsightsFor((cur) => (cur === String(auction.id) ? null : String(auction.id)))} className="mt-1 block min-h-11 rounded-lg border border-[#D7E7E4] bg-white px-3 text-xs font-semibold text-[#12576D]">{insightsFor === String(auction.id) ? 'Hide insights' : 'Audience insights'}</button></div>
                    </div>
                    {insightsFor === String(auction.id) && <AuctionInsightsPanel auctionId={String(auction.id)} />}
                    </div>
                  ))}
                </div>
              ) : activeSection === 'finance' ? (
                <div className="space-y-3">
                  {(operations.finance?.items || []).length === 0 ? <p className="py-10 text-center text-sm text-[#64748B]">No finance applications found for this dealership.</p> : (operations.finance.items || []).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
                      <div><p className="font-medium text-[#0A3340]">{application.vehicle || 'Vehicle'}</p><p className="text-xs text-[#64748B]">Applicant: {application.applicantName || 'Buyer'}</p></div>
                      <span className="px-3 py-1 rounded-full bg-[#EEF7F5] text-[#475569] text-xs capitalize">{application.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#64748B]">Inspections of your vehicles, requested by buyers and carried out by independent providers. You see that an inspection exists and its stage. The buyer’s details and the report stay with the buyer who requested it.</p>
                  {(operations.inspections?.items || []).length === 0 ? <p className="py-10 text-center text-sm text-[#64748B]">No inspection orders found for this dealership.</p> : (operations.inspections.items || []).map((inspection) => (
                    <div key={inspection.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl"><div><p className="font-medium text-[#0A3340]">{inspection.vehicle}</p><p className="text-xs text-[#64748B]">{inspection.id}</p></div><span className="px-3 py-1 rounded-full bg-[#EEF7F5] text-[#475569] text-xs capitalize">{inspection.status}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'team' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="text-xl font-bold text-[#0A3340] mb-6">Team</h3>
              {/* Phase 12 fix: this tab was a hardcoded "not backed yet" stub
                  even though a real, authorized, already-live backend contract
                  existed (dealer-platform's /team endpoints, protected by
                  dealerOrgAccess("canManageTeam") - see
                  KAYAD_DEALER_GAP_AND_RISK_REGISTER.md R4). Bound to the safe
                  dealer-platform team endpoint only - never the separate,
                  legacy dealerRoutes.js duplicate flagged in that same register. */}
              {teamLoading && team.length === 0 ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" /></div>
              ) : teamError ? (
                <div className="py-12 text-center"><p className="text-sm text-[#64748B] mb-3">{teamError}</p><button onClick={() => setTeamRetry((attempt) => attempt + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button></div>
              ) : (
                <DealerTeamPanel team={team} onChanged={() => setTeamLoaded(false)} />
              )}
            </div>
          )}

          {activeSection === 'reputation' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              <h3 className="text-xl font-bold text-[#0A3340] mb-6">Reputation</h3>
              {/* Phase 12 fix: getReputation already existed, live and
                  dealer-scoped, with no dashboard entry point anywhere (see
                  KAYAD_DEALER_GAP_AND_RISK_REGISTER.md R5). Added as its own
                  section rather than folding it into Settings/Analytics,
                  since neither of those has a UI built for it either. */}
              {reputationLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" /></div>
              ) : reputationError ? (
                <div className="py-12 text-center"><p className="text-sm text-[#64748B] mb-3">{reputationError}</p><button onClick={() => setReputationRetry((attempt) => attempt + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button></div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <p className="text-3xl font-bold text-[#0A3340]">{reputation?.overall?.rating ?? '—'}</p>
                    <p className="text-sm text-[#64748B]">{reputation?.overall?.totalReviews == null ? '— reviews' : `${reputation.overall.totalReviews} review${reputation.overall.totalReviews === 1 ? '' : 's'}`}</p>
                  </div>
                  {(reputation?.recentReviews || []).length === 0 ? (
                    <p className="text-sm text-[#64748B] text-center py-8">No reviews yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {reputation.recentReviews.map((review) => (
                        <div key={review.id} className="p-4 bg-[#F6FAF9] rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-[#0A3340]">{review.name}</p>
                            <span className="text-sm font-bold text-[#176B87]">{review.rating}★</span>
                          </div>
                          {review.text && <p className="text-sm text-[#64748B]">{review.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              {operationsLoading || (!operations.analytics && !operationsError) ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" /></div> : operationsError ? <div className="py-12 text-center"><p className="text-sm text-[#64748B] mb-3">{operationsError}</p><button onClick={() => setOperations((prev) => ({ ...prev, analytics: undefined }))} className="text-xs font-bold text-[#176B87]">Try Again</button></div> : <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                  <StatCard title="Total Revenue" value={operations.analytics?.overview?.totalRevenue == null ? '—' : `Ksh ${Number(operations.analytics.overview.totalRevenue).toLocaleString('en-KE')}`} icon={DollarSign} color={colors.emerald} />
                  <StatCard title="Total Sales" value={operations.analytics?.overview?.totalSales ?? '—'} icon={ShoppingCart} color={colors.navy} />
                  <StatCard title="Avg Deal Size" value={operations.analytics?.performance?.avgDealSize == null ? '—' : `Ksh ${Number(operations.analytics.performance.avgDealSize).toLocaleString('en-KE')}`} icon={Target} color={colors.purple} />
                  <StatCard title="Total Views" value={operations.analytics?.overview?.totalViews ?? '—'} icon={Eye} color={colors.amber} />
                </div>
                <div className="bg-white rounded-xl border border-[#D7E7E4] p-6"><h3 className="font-bold text-[#0A3340] mb-4">Top Vehicles by Views</h3>{(operations.analytics?.topVehicles || []).length ? (operations.analytics.topVehicles.map((vehicle) => <div key={vehicle.id} className="flex justify-between py-3 border-b last:border-0 border-[#D7E7E4]"><span className="text-sm text-[#12576D]">{vehicle.title}</span><span className="text-sm font-semibold text-[#0A3340]">{vehicle.views} views</span></div>)) : <p className="text-sm text-[#64748B]">No vehicle analytics yet.</p>}</div>
              </>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
