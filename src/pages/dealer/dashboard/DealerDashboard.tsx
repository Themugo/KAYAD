import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Car, Users, TrendingUp, TrendingDown, DollarSign,
  Eye, MessageSquare, Phone, Calendar, ShoppingCart, Target, Clock,
  AlertCircle, CheckCircle2, Star, Filter, ArrowRight,
  MoreVertical, ChevronDown, ChevronRight, Bot, BarChart3,
  PieChart, Activity, Bell,
  Settings, FileText, Send, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserPlus, Shield, Award, CreditCard, CalendarCheck, ClipboardCheck,
  Gavel, X, Loader2, UserCog, ExternalLink, Megaphone, ChevronLeft, Plus,
} from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';
import DealerListingForm from './DealerListingForm';
import DealerSettingsPanel from './DealerSettingsPanel';
import DealerTeamPanel from './DealerTeamPanel';
import { getMyListings, deleteCar } from '../../../services/vehicleApi';
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

type StatCardProps = { title: string; value: React.ReactNode; change?: number; icon: React.ElementType; color?: string; onOpen?: () => void; openLabel?: string };

const StatCard = ({ title, value, change, icon: Icon, color = colors.navy, onOpen, openLabel }: StatCardProps) => {
  const body = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[#64748B] mb-1">{title}</p>
        <p className="text-2xl font-bold text-[#0A3340]">{value === '—' ? <span aria-label="Unavailable" role="img">—</span> : value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" aria-hidden="true" /> : <ArrowDownRight className="w-4 h-4" aria-hidden="true" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
        {onOpen && <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#176B87]">{openLabel} <ArrowRight className="w-3 h-3" aria-hidden="true" /></p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
    </div>
  );
  const base = 'bg-white rounded-xl border border-[#D7E7E4] p-5 hover:shadow-md transition-shadow';
  // Only a card with a real destination becomes a button; the rest stay plain information cards.
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`${base} w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]`}>{body}</button>
  ) : (
    <div className={base}>{body}</div>
  );
};

/** Lead Pipeline Stage */
const PipelineStage = ({ stage, count, value, color }: { stage: string; count: number | string; value?: number; color: string }) => (
  <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-[#D7E7E4]">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
      <span className="font-medium text-[#12576D]">{stage}</span>
    </div>
    <div className="text-right">
      <p className="font-bold text-[#0A3340]">{count === '—' ? <span aria-label="Unavailable" role="img">—</span> : count}</p>
    </div>
  </div>
);

/** Quick Action Button */
const QuickAction = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed ${color} hover:bg-opacity-10 transition-all`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <span className="text-sm font-medium text-[#12576D]">{label}</span>
  </button>
);

/** Activity Item */
const ActivityItem = ({ type, message, time, icon: Icon }) => {
  const typeColors = {
    lead: colors.emerald,
    view: colors.softBlue,
    sale: colors.navy,
    listing: colors.purple,
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#D7E7E4] last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${typeColors[type]}20` }}>
        <Icon className="w-4 h-4" style={{ color: typeColors[type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#12576D]">{message}</p>
        <p className="text-xs text-[#64748B] mt-1">{time}</p>
      </div>
    </div>
  );
};

/** Top Vehicle Card */
const TopVehicle = ({ vehicle, rank }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#D7E7E4]">
    <div className="w-8 h-8 rounded-full bg-[#EEF7F5] flex items-center justify-center font-bold text-[#64748B]">
      {rank}
    </div>
    <div className="w-12 h-12 bg-[#EEF7F5] rounded-lg flex-shrink-0">
      <Car className="w-6 h-6 text-[#64748B] m-auto" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-[#0A3340] truncate">{vehicle.title}</p>
      <div className="flex items-center gap-3 text-xs text-[#64748B]">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{vehicle.views == null ? '—' : Number(vehicle.views).toLocaleString('en-KE')}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{vehicle.leads == null ? '—' : Number(vehicle.leads).toLocaleString('en-KE')}</span>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-[#0A3340]">{vehicle.price == null || !Number.isFinite(Number(vehicle.price)) ? 'Price unavailable' : `Ksh ${Number(vehicle.price).toLocaleString('en-KE')}`}</p>
    </div>
  </div>
);

/** AI Copilot */
const AICopilot = () => (
  <div className="bg-white rounded-xl border border-[#D7E7E4] overflow-hidden">
    <div className="p-4 bg-gradient-to-r from-[#176B87] to-[#13B8A6] text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5" /></div>
        <div><h3 className="font-bold">AI Dealer Copilot</h3><p className="text-xs text-[#DDF4F0]">KAYAD Intelligence</p></div>
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
    className={`flex shrink-0 lg:w-full items-center gap-3 px-4 py-3 min-h-11 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87] ${
      active ? 'bg-[#DDF4F0] text-[#12576D]' : 'text-[#64748B] hover:bg-[#F6FAF9]'
    }`}
  >
    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden="true" />
    <span className="font-medium text-sm whitespace-nowrap lg:whitespace-normal lg:truncate">{label}</span>
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
    { id: 'settings', label: 'Settings', icon: Settings, title: 'Settings', description: 'Dealership settings.' },
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
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  };

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    try {
      const body = await dealerApi.updateLead(leadId, { stage: nextStage });
      if (!body?.data) throw new Error('Lead update returned no record');
      setLeads((prev) => prev.map((l) => l.id === leadId ? body.data : l));
    } catch {
      setLeadsError('Could not update this lead. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#176B87] animate-spin" />
      </div>
    );
  }

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-[#64748B] mb-4">{loadError}</p>
          <button onClick={loadDashboard} className="bg-[#0A3340] text-white text-xs font-bold rounded-lg px-5 py-2.5">
            Try Again
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
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 lg:min-w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#D7E7E4] flex flex-col">
        <div className="p-4 border-b border-[#D7E7E4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#176B87] to-[#13B8A6] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#0A3340]">Dealer Hub</h1>
              <p className="text-xs text-[#64748B]">{user?.businessName || user?.name || "Dealer account"}</p>
            </div>
          </div>
        </div>

        <nav aria-label="Dealer workspace" className="flex-1 p-3 lg:p-4 flex lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-x-visible">
          {DEALER_NAV_GROUPS.map((group, index) => (
            <div
              key={group.id}
              role="group"
              aria-labelledby={`dealer-nav-${group.id}`}
              className={`flex lg:block gap-2 lg:gap-1 lg:space-y-1 ${index > 0 ? 'pl-2 border-l border-[#D7E7E4] lg:pl-0 lg:border-l-0 lg:border-t lg:mt-3 lg:pt-3' : ''}`}
            >
              <p id={`dealer-nav-${group.id}`} className="sr-only lg:not-sr-only lg:px-4 lg:pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
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

        <div className="hidden lg:block p-4 border-t border-[#D7E7E4]">
          <div className="p-4 bg-gradient-to-r from-[#DDF4F0] to-[#F3FAF9] rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-[#176B87]" />
              <span className="font-semibold text-[#0E4655]">Account status</span>
            </div>
            <p className="text-xs text-[#176B87]">Plan and verification details appear here when supplied by the account service.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div className="min-w-0">
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
              <h2 className="text-2xl font-bold text-[#0A3340]">{currentItem.title}</h2>
              <p className="text-[#64748B]">{activeSection === 'overview' ? `Welcome back, ${user?.name || 'dealer'}` : currentItem.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Notifications" className="p-2 bg-white border border-[#D7E7E4] rounded-xl hover:bg-[#F6FAF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]" onClick={() => { window.location.assign('/notifications'); }}>
                <Bell className="w-5 h-5 text-[#64748B]" aria-hidden="true" />
              </button>
              {activeSection !== 'inventory' && (
                <button type="button" onClick={() => setActiveSection('inventory')} className="px-4 py-2 bg-[#176B87] text-white font-medium rounded-xl hover:bg-[#12576D] flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
                  <Car className="w-5 h-5" aria-hidden="true" />
                  Manage Inventory
                </button>
              )}
            </div>
          </div>

          {activeSection === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Total Listings"
                  onOpen={() => setActiveSection('inventory')}
                  openLabel="Open inventory"
                  value={dashboard?.overview?.totalListings ?? '—'}
                  icon={Car}
                  color={colors.softBlue}
                />
                <StatCard
                  title="Total Views"
                  value={dashboard?.overview?.totalViews == null ? '—' : dashboard.overview.totalViews.toLocaleString()}
                  icon={Eye}
                  color={colors.purple}
                />
                <StatCard
                  title="Total Leads"
                  onOpen={() => setActiveSection('leads')}
                  openLabel="Open leads"
                  value={dashboard?.overview?.leads?.total ?? '—'}
                  icon={Users}
                  color={colors.emerald}
                />
                <StatCard
                  title="Revenue (released escrow, all time)"
                  value={dashboard?.overview?.revenue?.total == null ? '—' : `Ksh ${Number(dashboard.overview.revenue.total).toLocaleString('en-KE')}`}
                  icon={DollarSign}
                  color={colors.navy}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* Lead Pipeline */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-[#D7E7E4] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0A3340]">Lead Pipeline</h3>
                    <button onClick={() => setActiveSection('leads')} className="text-sm text-[#176B87] font-medium hover:text-[#12576D]">View All</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PipelineStage stage="New" count={dashboard?.overview?.leads?.new ?? '—'} color={colors.softBlue} />
                    <PipelineStage stage="Contacted" count={dashboard?.overview?.leads?.contacted ?? '—'} color={colors.purple} />
                    <PipelineStage stage="Negotiating" count={dashboard?.overview?.leads?.negotiating ?? '—'} color={colors.amber} />
                    <PipelineStage stage="Reserved" count={dashboard?.overview?.leads?.reserved ?? '—'} color={colors.emerald} />
                  </div>
                  <div className="mt-4 p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#64748B]">Conversion Rate</p>
                        <p className="text-2xl font-bold text-emerald-700">{dashboard?.overview?.performance?.leadConversion == null ? '—' : `${dashboard.overview.performance.leadConversion}%`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#64748B]">Avg Response Rate</p>
                        <p className="text-2xl font-bold text-[#176B87]">{dashboard?.overview?.performance?.responseRate == null ? '—' : `${dashboard.overview.performance.responseRate}%`}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
                  <h3 className="font-bold text-[#0A3340] mb-4">Recent Activity</h3>
                  <div className="space-y-1">
                    {dashboard?.recentActivity?.length ? dashboard.recentActivity.map((activity, i) => (
                      <ActivityItem
                        key={i}
                        type={activity.type}
                        message={activity.message}
                        time={activity.time}
                        icon={
                          activity.type === 'lead' ? MessageSquare :
                          activity.type === 'view' ? Eye :
                          activity.type === 'sale' ? CheckCircle2 :
                          Car
                        }
                      />
                    )) : <p className="py-6 text-sm text-[#64748B]">No recent activity is available.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Top Performing Vehicles */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-[#D7E7E4] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0A3340]">Top Performing Vehicles</h3>
                    <button onClick={() => setActiveSection('inventory')} className="text-sm text-[#176B87] font-medium hover:text-[#12576D]">View Inventory</button>
                  </div>
                  <div className="space-y-3">
                    {dashboard?.topPerformers?.vehicles?.length ? dashboard.topPerformers.vehicles.map((vehicle, i) => (
                      <TopVehicle key={vehicle.id} vehicle={vehicle} rank={i + 1} />
                    )) : <p className="py-6 text-sm text-[#64748B]">No vehicle performance data is available.</p>}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
                  <h3 className="font-bold text-[#0A3340] mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickAction icon={Users} label="View Leads" color={colors.purple} onClick={() => setActiveSection('leads')} />
                    <QuickAction icon={Car} label="Manage Inventory" color={colors.softBlue} onClick={() => setActiveSection('inventory')} />
                    <QuickAction icon={Calendar} label="Inspections" color={colors.amber} onClick={() => setActiveSection('inspections')} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'inventory' && (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
              {listingForm ? null : (
                <div className="flex items-center justify-between gap-3 mb-6">
                  <h3 className="text-xl font-bold text-[#0A3340]">Inventory Management</h3>
                  <button type="button" onClick={() => openListingForm({ mode: 'create' })} className="px-4 py-2 bg-[#176B87] text-white font-medium rounded-xl hover:bg-[#12576D] flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-700">{myListings.filter((l) => l.status === 'available' || l.status === 'active').length}</p>
                      <p className="text-xs text-emerald-800">Published</p>
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
                  <div className="space-y-3">
                    {myListings.length === 0 ? (
                      <p className="text-sm text-[#64748B] text-center py-8">You haven't listed any vehicles yet.</p>
                    ) : myListings.map((car) => {
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
                      return (
                        <div key={car.id} className="p-4 bg-[#F6FAF9] rounded-xl">
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                            <div className="w-20 h-14 bg-[#DDF4F0] rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                              {image ? <img src={image} alt={label} className="w-full h-full object-cover" /> : <Car className="w-6 h-6 text-[#64748B]" aria-hidden="true" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#0A3340] truncate">{label}</p>
                              <p className="text-sm text-[#475569]">{car.price == null ? 'Price unavailable' : `Ksh ${Number(car.price).toLocaleString('en-KE')}`} • {car.views == null ? 'Views unavailable' : `${Number(car.views).toLocaleString('en-KE')} views`}</p>
                              {updated && <p className="text-xs text-[#475569]">Updated {updated}</p>}
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                              car.status === 'available' || car.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              car.status === 'reserved' ? 'bg-[#DDF4F0] text-[#12576D]' :
                              'bg-[#EEF7F5] text-[#475569]'
                            }`}>
                              {statusText}
                            </span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openListingForm({ mode: 'edit', id: carId })} className="px-3 py-1 text-xs font-bold text-[#176B87] border border-[#B9D3CF] rounded-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]" aria-label={`Edit ${car.title || 'vehicle'}`}>Edit</button>
                              {!isAuctionListing && !isSoldListing && (
                                <button type="button" disabled={Boolean(deletingId)} onClick={() => { setDeleteError(null); setDeleteTargetId(carId); }} className="px-3 py-1 text-xs font-bold text-[#B42318] border border-[#B9D3CF] rounded-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]" aria-label={`Remove ${car.title || 'vehicle'}`}>Remove</button>
                              )}
                            </div>
                          </div>
                          {isAuctionListing && <p className="mt-2 text-xs text-[#475569]">Listings with an auction cannot be removed from this screen.</p>}
                          {isSoldListing && !isAuctionListing && <p className="mt-2 text-xs text-[#475569]">Sold listings cannot be removed; completed sales are handled through escrow.</p>}
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
              {leadsLoading ? (
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
              {/* Fixed: this section had a real nav entry (Pipeline)
                  but zero content behind it at all - clicking it
                  showed nothing. Real, working kanban-style view now,
                  sharing the same real leads data as the table above.
                  Advancing a lead's stage genuinely persists (the
                  real backend's own updateLead previously just echoed
                  back whatever was sent without writing to the
                  database at all - fixed as part of this same pass). */}
              {leadsLoading ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="mt-1 text-sm text-[#64748B]">View and manage only the deals associated with your authenticated account. Available actions are supplied by KAYAD’s backend.</p>
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
              {customersLoading ? (
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
              <div className="flex gap-2 mb-6">
                <input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="New campaign name"
                  className="flex-1 border border-[#D7E7E4] rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCreateCampaign}
                  disabled={creatingCampaign || !newCampaignName.trim()}
                  className="px-4 py-2 bg-[#176B87] text-white rounded-xl font-medium hover:bg-[#12576D] disabled:opacity-50"
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

          {['auctions', 'finance', 'inspections', 'settings'].includes(activeSection) && (
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
                <DealerSettingsPanel userId={String(user?.id || user?._id || '')} />
              ) : operationsLoading ? (
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
                    <div key={auction.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
                      <div><p className="font-medium text-[#0A3340]">{auction.title}</p><p className="text-xs text-[#64748B]">{auction.bidsCount} bids • {auction.views} views</p></div>
                      <div className="text-right"><p className="font-bold text-[#0A3340]">Ksh {Number(auction.currentBid || auction.startingBid || 0).toLocaleString()}</p><span className="text-xs capitalize text-[#64748B]">{auction.status}</span></div>
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
              {operationsLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" /></div> : operationsError ? <div className="py-12 text-center"><p className="text-sm text-[#64748B] mb-3">{operationsError}</p><button onClick={() => setOperations((prev) => ({ ...prev, analytics: undefined }))} className="text-xs font-bold text-[#176B87]">Try Again</button></div> : <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
