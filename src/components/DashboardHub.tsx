import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMyDealership } from '../features/DealershipWorkspace/useMyDealership';
import { Activity, BarChart3, Bell, Car, CreditCard, ChevronRight, ClipboardCheck, LayoutDashboard, RefreshCw, Settings2, ShieldCheck, ShoppingBag, Users, Wrench, MessageCircle } from 'lucide-react';
import { getOwnershipDashboard } from '../services/ownershipApi';
import { getMyListings, getMyListingPerformance, BackendCar } from '../services/vehicleApi';
import leadApi from '../services/leadApi';
import { getMyEscrowOverview } from '../services/escrowApi';
import type { BackendEscrow, EscrowParticipantSummary } from '../services/escrowApi';
import * as dealerApi from '../services/dealerPlatformApi';
import { getControlPlaneSnapshot } from '../services/commandCenterApi';
import { inspectionAPI } from '../api/api';
import { AuctionExperienceRail, BidderIdentityCard } from './auction/AuctionExperienceRail';
import { isStaffRole } from '../utils/staffRoles';
import { getPhoneVerificationStatus } from '../services/phoneVerificationApi';
import { getListingLifecycle } from '../utils/listingLifecycle';
import { personalNavGroups, personalNavItems, type PersonalSection } from './dashboard/personal/personalNav';
import PersonalSidebar from './dashboard/personal/PersonalSidebar';
import PersonalGreetingBanner from './dashboard/personal/PersonalGreetingBanner';
import PersonalOverview, { type Metric, type RecentEvent, type TrustState } from './dashboard/personal/PersonalOverview';
const PersonalOfferPanel = React.lazy(() => import('./offers/MarketplaceOfferPanel'));

const PersonalSellingTools = React.lazy(() => import('../features/PrivateSellerPlatform/pages/PersonalSellingModule'));
const PersonalBuyingTools = React.lazy(() => import('../features/OwnershipPlatform').then((module) => ({ default: module.PersonalBuyingModule })));
const PersonalActivityTimeline = React.lazy(() => import('../features/OwnershipPlatform/pages/PersonalActivityTimeline'));

type Props = { user: any; vehicles?: any[]; savedVehicleCount?: number; savedVehiclesList?: any[]; savedVehiclesSessionUserId?: string | null; savedVehiclesLoading?: boolean; savedVehiclesError?: string; savedVehiclesErrorUserId?: string | null; onRefreshSavedVehicles?: () => void; onNavigate: (nav: string) => void; initialSection?: string; initialInspectionTab?: 'mine' | 'reports'; messagesContent?: React.ReactNode; profileContent?: React.ReactNode };

const normalizePersonalSection = (value: string): PersonalSection => {
  const aliases: Record<string, PersonalSection> = {
    'seller-platform': 'my-vehicles', 'seller-dashboard': 'my-vehicles', seller: 'create-listing', sell: 'create-listing',
    'buyer-platform': 'buying', saved: 'buying', profile: 'account', settings: 'account', chat: 'messages', payments: 'deals',
  };
  const normalized = aliases[value] || value;
  return ['overview', 'activity', 'my-vehicles', 'create-listing', 'buying', 'messages', 'auctions', 'deals', 'seller-enquiries', 'performance', 'account', 'trust', 'help'].includes(normalized) ? normalized as PersonalSection : 'overview';
};

type RoleConfig = { title: string; subtitle: string; accent: string; actions: Array<{ label: string; nav: string; icon: React.ElementType }> };

const configs: Record<string, RoleConfig> = {
  user: { title: 'My Dashboard', subtitle: 'One personal account for buying, private selling and managing every vehicle transaction.', accent: '#176B87', actions: [{label:'Browse vehicles',nav:'marketplace',icon:Car},{label:'Saved vehicles',nav:'saved',icon:ShoppingBag},{label:'Vehicle financing',nav:'dashboard:deals',icon:CreditCard},{label:'Auctions',nav:'auctions',icon:Activity},{label:'My escrow deals',nav:'dashboard:deals',icon:ShieldCheck},{label:'Messages',nav:'chat',icon:Bell}] },
  broker: { title: 'Seller Dashboard', subtitle: 'Manage seller inventory and marketplace activity.', accent: '#12576d', actions: [{label:'My vehicles',nav:'my-vehicles',icon:LayoutDashboard},{label:'Marketplace',nav:'marketplace',icon:Car},{label:'Messages',nav:'chat',icon:Bell}] },
  dealer: { title: 'Dealer Dashboard', subtitle: 'Commercial inventory, leads, auctions, subscriptions and payouts.', accent: '#12576d', actions: [{label:'Dealer workspace',nav:'dealer-dashboard',icon:LayoutDashboard},{label:'Inventory',nav:'dealer-dashboard',icon:Car},{label:'Auctions',nav:'auctions',icon:Activity},{label:'Finance',nav:'finance',icon:BarChart3}] },
  ghost_checker: { title: 'Inspector Dashboard', subtitle: 'Assigned inspections, evidence and execution status.', accent: '#5AAFA4', actions: [{label:'Inspection work',nav:'inspections',icon:ClipboardCheck},{label:'Messages',nav:'chat',icon:Bell}] },
};

const staffActions = [{label:'Control plane',nav:'admin',icon:LayoutDashboard},{label:'Vehicle moderation',nav:'admin',icon:Car},{label:'Inspections',nav:'inspections',icon:ClipboardCheck},{label:'Support',nav:'support',icon:Users}];

export default function DashboardHub({ user, vehicles = [], savedVehicleCount, savedVehiclesList = [], savedVehiclesSessionUserId = null, savedVehiclesLoading = false, savedVehiclesError = '', savedVehiclesErrorUserId = null, onRefreshSavedVehicles, onNavigate, initialSection = 'overview', initialInspectionTab = 'mine', messagesContent, profileContent }: Props) {
  const role = user?.role || 'user';
  // Unified personal account: legacy personal role rows resolve to this one shell. Buying and private selling are sections, not separate dashboards.
  const isPersonal = role === 'user' || role === 'buyer' || role === 'individual_seller';
  const { membership: dealershipMembership } = useMyDealership(user?.id, role);
  const baseConfig = configs[role === 'individual_seller' || role === 'buyer' ? 'user' : role];
  // Every personal account can buy and privately sell from this same identity. The listing API
  // still enforces email verification and the authoritative seller capability policy.
  const personalConfig = isPersonal && baseConfig ? { ...baseConfig, actions: [...baseConfig.actions, {label:'Create listing',nav:'dashboard:create-listing',icon:Car}, ...(dealershipMembership ? [{label:`Work for ${dealershipMembership.dealershipName}`,nav:'dealership-workspace',icon:LayoutDashboard}] : [])] } : undefined;
  const config = personalConfig || configs[role] || (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role) ? { title: 'Platform Operations Dashboard', subtitle: 'Role-scoped control, queues and platform health.', accent: '#5AAFA4', actions: staffActions } : configs.user);
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable');
  const [personalSection, setPersonalSection] = useState<PersonalSection>(() => normalizePersonalSection(initialSection || 'overview'));
  useEffect(() => { if (initialSection) setPersonalSection(normalizePersonalSection(initialSection)); }, [initialSection]);
  const selectPersonalSection = (section: PersonalSection) => {
    setPersonalSection(section);
    onNavigate(`dashboard:${section}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handlePersonalNavigate = (nav: string) => {
    const internal: Record<string, PersonalSection> = { 'profile': 'account', 'chat': 'messages', 'buyer-platform': 'buying', 'saved': 'buying', 'payments': 'deals', 'activity': 'activity', 'seller-enquiries': 'seller-enquiries', 'auctions': 'auctions', 'my-vehicles': 'my-vehicles', 'seller-platform': 'my-vehicles', 'seller-dashboard': 'my-vehicles', sell: 'create-listing', seller: 'create-listing', 'create-listing': 'create-listing', 'listing-wizard': 'create-listing', 'listing-quality': 'my-vehicles', 'trust-center': 'trust', 'auction-verification': 'auctions', escrow: 'deals', help: 'help', settings: 'account' };
    if (internal[nav]) { selectPersonalSection(internal[nav]); return; }
    onNavigate(nav);
  };
  const [hidden, setHidden] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [personalListings, setPersonalListings] = useState<BackendCar[]>([]);
  const [personalPerformance, setPersonalPerformance] = useState<any>(null);
  const [personalPerformanceError, setPersonalPerformanceError] = useState('');
  const [sellerEnquiries, setSellerEnquiries] = useState<any[]>([]);
  const [sellerEnquiriesError, setSellerEnquiriesError] = useState('');
  const [sellerEnquiriesLoading, setSellerEnquiriesLoading] = useState(false);
  const [expandedSellerOfferId, setExpandedSellerOfferId] = useState<string | null>(null);
  const [personalInsightsRefresh, setPersonalInsightsRefresh] = useState(0);
  type Src = 'loading' | 'ready' | 'unavailable';
  const [sentEnquiries, setSentEnquiries] = useState<any[]>([]);
  const [overviewSrc, setOverviewSrc] = useState<{ seller: Src; sent: Src }>({ seller: 'loading', sent: 'loading' });
  const [expandedSentId, setExpandedSentId] = useState<string | null>(null);
  const [phoneStatus, setPhoneStatus] = useState<TrustState['phone']>('loading');
  const [personalListingsLoading, setPersonalListingsLoading] = useState(isPersonal);
  const [personalListingsError, setPersonalListingsError] = useState('');
  const [personalEscrowOverview, setPersonalEscrowOverview] = useState<{ escrows: BackendEscrow[]; summary: EscrowParticipantSummary | null } | null>(null);
  const [personalEscrowLoading, setPersonalEscrowLoading] = useState(isPersonal);
  const [personalEscrowError, setPersonalEscrowError] = useState(false);
  const [loading, setLoading] = useState(isPersonal);
  const [sourceError, setSourceError] = useState('');
  const dashboardRequestGeneration = useRef(0);

  const cards = useMemo(() => {
    const owned = vehicles.filter((v) => v?.sellerId && v.sellerId === (user?.id || user?._id));
    if (role === 'dealer' || role === 'broker') return [{id:'inventory',label:'Your inventory',value:owned.length,icon:Car},{id:'saved',label:'Saved vehicles',value:0,icon:ShoppingBag},{id:'activity',label:'Marketplace activity',value:vehicles.length,icon:Activity}];
    if (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role)) return [{id:'users',label:'Users',value:snapshot?.counts?.users ?? '—',icon:Users},{id:'cars',label:'Vehicles',value:snapshot?.counts?.cars ?? '—',icon:Car},{id:'incidents',label:'Incidents',value:snapshot?.counts?.incidents ?? '—',icon:Activity},{id:'alerts',label:'Alerts',value:snapshot?.counts?.alerts ?? '—',icon:Bell}];
    if (role === 'ghost_checker') return [{id:'assigned',label:'Assigned inspections',value:Array.isArray(snapshot?.orders) ? snapshot.orders.length : '—',icon:ClipboardCheck},{id:'messages',label:'Messages',value:'—',icon:Bell},{id:'market',label:'Marketplace',value:vehicles.length,icon:Car}];
    const buyerCards = [{id:'saved',label:'Saved vehicles',value:'—',icon:ShoppingBag},{id:'vehicles',label:'Marketplace inventory',value:vehicles.length,icon:Car},{id:'alerts',label:'Action alerts',value:'—',icon:Bell}];
    return role === 'individual_seller' ? [{id:'inventory',label:'Your inventory',value:owned.length,icon:Car}, ...buyerCards] : buyerCards;
  }, [vehicles, user, role, snapshot]);

  const refresh = async () => {
    const generation = ++dashboardRequestGeneration.current;
    setLoading(true); setSourceError('');
    try {
      if (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role)) {
        const result = await getControlPlaneSnapshot();
        if (generation !== dashboardRequestGeneration.current) return;
        setSnapshot(result?.data || result);
      } else if (role === 'dealer') {
        const result = await dealerApi.getDealerDashboard();
        if (generation !== dashboardRequestGeneration.current) return;
        setSnapshot(result?.data || result);
      } else if (role === 'user' || role === 'buyer' || role === 'individual_seller') {
        setPersonalListingsLoading(true);
        setPersonalListingsError('');
        setPersonalEscrowLoading(true);
        setPersonalEscrowError(false);
        const [ownershipResult, listingsResult, escrowResult] = await Promise.allSettled([getOwnershipDashboard(), getMyListings(), getMyEscrowOverview()]);
        if (generation !== dashboardRequestGeneration.current) return;
        if (ownershipResult.status === 'fulfilled') setSnapshot(ownershipResult.value);
        else setSourceError('Personal ownership data could not be refreshed. Unavailable values are not shown as zero.');
        if (listingsResult.status === 'fulfilled') setPersonalListings(listingsResult.value);
        else { setPersonalListingsError('Your listings could not be loaded. Please try again.'); setPersonalListings([]); }
        if (escrowResult.status === 'fulfilled') setPersonalEscrowOverview(escrowResult.value);
        else { setPersonalEscrowOverview(null); setPersonalEscrowError(true); }
        setPersonalListingsLoading(false);
        setPersonalEscrowLoading(false);
      } else if (role === 'ghost_checker') {
        const result = await inspectionAPI.myAssigned();
        if (generation !== dashboardRequestGeneration.current) return;
        setSnapshot(result?.data || result);
      }
    } catch (e) { if (generation === dashboardRequestGeneration.current) setSourceError('Live dashboard data could not be refreshed. Existing values were not replaced with mock data.'); }
    finally { if (generation === dashboardRequestGeneration.current) { setLoading(false); setPersonalListingsLoading(false); setPersonalEscrowLoading(false); } }
  };

  useEffect(() => {
    setSnapshot(null); setPersonalListings([]); setPersonalPerformance(null); setPersonalPerformanceError(''); setSellerEnquiries([]); setSellerEnquiriesError(''); setPersonalListingsLoading(isPersonal); setPersonalListingsError(''); setPersonalEscrowOverview(null); setPersonalEscrowLoading(isPersonal); setPersonalEscrowError(false);
    void refresh();
    return () => { dashboardRequestGeneration.current += 1; };
  }, [role, user?.id]);

  // Overview sources (all existing endpoints, read-only). Each one reports its own failure so a metric shows
  // "Unavailable" instead of a fabricated zero. Wrapped so a missing/failed service rejects instead of throwing.
  useEffect(() => {
    if (!isPersonal || !['overview', 'buying'].includes(personalSection)) return;
    let active = true;
    const safe = <T,>(fn: () => Promise<T>) => Promise.resolve().then(fn);
    const onOverview = personalSection === 'overview';
    setOverviewSrc((o) => ({ seller: onOverview ? 'loading' : o.seller, sent: 'loading' })); if (onOverview) setPhoneStatus('loading');
    if (onOverview) void safe(() => leadApi.mySellerEnquiries()).then((r: any) => { if (!active) return; setSellerEnquiries(Array.isArray(r?.enquiries) ? r.enquiries : []); setOverviewSrc((o) => ({ ...o, seller: 'ready' })); }).catch(() => { if (active) setOverviewSrc((o) => ({ ...o, seller: 'unavailable' })); });
    void safe(() => leadApi.myNegotiations()).then((r: any) => { if (!active) return; setSentEnquiries(Array.isArray(r?.leads) ? r.leads : []); setOverviewSrc((o) => ({ ...o, sent: 'ready' })); }).catch(() => { if (active) setOverviewSrc((o) => ({ ...o, sent: 'unavailable' })); });
    if (onOverview) void safe(() => getPhoneVerificationStatus()).then((r: any) => { if (active) setPhoneStatus(r?.verified ? 'verified' : r?.phone ? 'unverified' : 'no_phone'); }).catch(() => { if (active) setPhoneStatus('unavailable'); });
    return () => { active = false; };
  }, [isPersonal, personalSection, user?.id, personalInsightsRefresh]);

  useEffect(() => {
    if (!isPersonal || !['performance', 'seller-enquiries'].includes(personalSection)) return;
    let active = true;
    if (personalSection === 'performance') {
      setPersonalPerformanceError('');
      void getMyListingPerformance(30).then((result: any) => { if (active) setPersonalPerformance(result?.data || null); }).catch((error: any) => { if (active) setPersonalPerformanceError(error?.message || 'Personal listing analytics are temporarily unavailable.'); });
    } else {
      setSellerEnquiriesLoading(true); setSellerEnquiriesError('');
      void leadApi.mySellerEnquiries().then((result: any) => { if (active) setSellerEnquiries(Array.isArray(result?.enquiries) ? result.enquiries : []); }).catch((error: any) => { if (active) setSellerEnquiriesError(error?.message || 'Seller enquiries are temporarily unavailable.'); }).finally(() => { if (active) setSellerEnquiriesLoading(false); });
    }
    return () => { active = false; };
  }, [isPersonal, personalSection, user?.id, personalInsightsRefresh]);

  const toggle = (id: string) => setHidden((prev) => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  if (isPersonal) {
    const navItems = personalNavItems;
    const sectionLabel = navItems.find((item) => item.id === personalSection)?.label || ({ 'create-listing': 'Create listing', 'seller-enquiries': 'Seller enquiries', trust: 'Verification & trust', help: 'Help & support' } as Record<string, string>)[personalSection] || 'My account';
    const sectionToSeller: Partial<Record<PersonalSection, string>> = { 'my-vehicles': 'listing-quality', 'create-listing': 'listing-wizard', auctions: 'auction-verification', trust: 'trust-center', help: 'help' };
    const showSellerModule = Boolean(sectionToSeller[personalSection]);
    return <section className="mx-auto grid w-full max-w-[1500px] gap-4 pb-28 lg:grid-cols-[238px_minmax(0,1fr)] lg:pb-10" data-kayad-unified-personal-dashboard="true">
      <PersonalSidebar name={user?.name} active={personalSection} onSelect={selectPersonalSection} />
      <div className="min-w-0 space-y-4">
        <PersonalGreetingBanner variant={personalSection === 'overview' ? 'overview' : 'section'} title={sectionLabel} firstName={(user?.name || '').split(' ')[0]} refreshing={loading || personalListingsLoading || savedVehiclesLoading} density={density}
          onRefresh={() => { void refresh(); onRefreshSavedVehicles?.(); setPersonalInsightsRefresh((n) => n + 1); }} onSell={() => selectPersonalSection('create-listing')} onBrowse={() => handlePersonalNavigate('marketplace')} onToggleDensity={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')} />
        <details className="rounded-xl border border-[#DCE9E7] bg-white p-3 lg:hidden"><summary className="cursor-pointer text-sm font-bold text-[#0A3545]">Dashboard sections · {sectionLabel}</summary><div className="mt-3 space-y-3">{personalNavGroups.map((group) => <div key={group.id} role="group" aria-label={group.label}><p className="mb-1 text-[10px] font-black uppercase tracking-[.14em] text-[#5B7480]">{group.label}</p><div className="grid grid-cols-2 gap-2">{group.items.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => selectPersonalSection(item.id)} aria-current={personalSection === item.id ? 'page' : undefined} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs font-bold ${personalSection === item.id ? 'bg-[#DDF4F0] text-[#082B40]' : 'bg-[#F4F9F8] text-[#475569]'}`}><Icon size={15} aria-hidden="true" />{item.label}</button>; })}</div></div>)}</div></details>
        {personalSection==='overview' && (() => {
          const m = (state: Metric['state'], value?: number): Metric => ({ state, value });
          const terminal = ['sold', 'lost', 'won', 'closed', 'archived'];
          const activeEnquiries = sellerEnquiries.filter((e: any) => !terminal.includes(String(e?.stage || 'new').toLowerCase())).length;
          const savedMetric: Metric = savedVehiclesErrorUserId === user?.id ? m('unavailable') : savedVehiclesLoading || savedVehiclesSessionUserId !== user?.id ? m('loading') : typeof savedVehicleCount === 'number' ? m('ready', savedVehicleCount) : m('unavailable');
          const listingsMetric: Metric = personalListingsError ? m('unavailable') : personalListingsLoading ? m('loading') : m('ready', personalListings.length);
          const sellerMetric: Metric = overviewSrc.seller === 'ready' ? m('ready', activeEnquiries) : m(overviewSrc.seller);
          const escrow: Metric = personalEscrowError ? m('unavailable') : personalEscrowLoading ? m('loading') : personalEscrowOverview?.summary ? m('ready', personalEscrowOverview.summary.activeCount) : m('unavailable');
          const owned: Metric = Array.isArray(snapshot?.currentVehicles) ? m('ready', snapshot.currentVehicles.length) : loading ? m('loading') : m('unavailable');
          const offers: Metric = overviewSrc.sent === 'ready' ? m('ready', sentEnquiries.length) : m(overviewSrc.sent);
          const events: RecentEvent[] = [
            ...personalListings.map((l: any) => ({ id: `l-${l.id}`, title: `${l.brand} ${l.model}`, detail: `Listing ${getListingLifecycle(l.status, l.sold).label.toLowerCase()}`, at: Date.parse(l.updated_at || l.updatedAt || l.created_at || l.createdAt || ''), go: 'my-vehicles' as PersonalSection })),
            ...(personalEscrowOverview?.escrows || []).map((e: any) => ({ id: `e-${e.id}`, title: e.car?.title || 'Vehicle deal', detail: `Escrow ${String(e.status || '').replace(/_/g, ' ')}`, at: Date.parse(e.updatedAt || e.createdAt || ''), go: 'deals' as PersonalSection })),
            ...sellerEnquiries.map((e: any) => ({ id: `s-${e.id}`, title: e.listing?.title || 'Vehicle enquiry', detail: 'Enquiry received', at: Date.parse(e.createdAt || ''), go: 'seller-enquiries' as PersonalSection })),
            ...sentEnquiries.map((e: any) => ({ id: `n-${e.id}`, title: e.vehicle || 'Vehicle enquiry', detail: 'Enquiry sent', at: Date.parse(e.created_at || e.createdAt || ''), go: 'buying' as PersonalSection })),
          ].filter((e) => Number.isFinite(e.at)).sort((x, y) => y.at - x.at).slice(0, 5);
          const recentState: 'loading' | 'ready' | 'unavailable' = personalListingsLoading || overviewSrc.seller === 'loading' ? 'loading' : personalListingsError && overviewSrc.seller === 'unavailable' ? 'unavailable' : 'ready';
          return <PersonalOverview density={density} sourceError={sourceError} listings={personalListings} listingsLoading={personalListingsLoading} listingsError={personalListingsError}
            metrics={{ listings: listingsMetric, saved: savedMetric, enquiries: sellerMetric, deals: escrow }} buying={{ saved: savedMetric, offers, escrow, purchases: owned }}
            recent={{ state: recentState, events }} trust={{ emailVerified: typeof user?.emailVerified === 'boolean' ? user.emailVerified : undefined, phone: phoneStatus }}
            businessName={dealershipMembership?.dealershipName || null} onGo={selectPersonalSection} onNavigate={handlePersonalNavigate} />;
        })()}
        {personalSection==='activity' && <Suspense fallback={<div role="status" className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your personal activity…</div>}><PersonalActivityTimeline userId={String(user?.id || user?._id || '')} role={String(role)} listings={personalListings} listingsLoading={personalListingsLoading} listingsError={personalListingsError} escrows={personalEscrowOverview?.escrows || []} escrowsLoading={personalEscrowLoading} escrowsError={personalEscrowError} onNavigate={handlePersonalNavigate}/></Suspense>}
        {personalSection==='performance' && <section className="space-y-4" data-kayad-personal-performance="true"><div><h2 className="text-xl font-black text-[#0A3340]">Listing performance</h2><p className="mt-1 text-sm text-[#64748B]">Verified first-party listing activity for the last 30 days. Lifetime clicks and enquiries are labelled separately.</p></div><button type="button" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)} className="rounded-lg border border-[#D7E7E4] px-3 py-2 text-xs font-bold text-[#12576D]">Refresh analytics</button>{personalPerformanceError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{personalPerformanceError}<button type="button" className="ml-2 font-bold underline" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)}>Retry</button></div> : !personalPerformance ? <p className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Loading verified listing activity…</p> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Listings',value:personalPerformance.totals?.listings ?? 0},{label:'Listing views · 30 days',value:personalPerformance.totals?.listingViews ?? 0},{label:'Unique visitors · 30 days',value:personalPerformance.totals?.uniqueVisitors ?? 0},{label:'Clicks · lifetime',value:personalPerformance.totals?.clicks ?? 0},{label:'Enquiries · lifetime',value:personalPerformance.totals?.enquiries ?? 0}].map(metric=><article key={metric.label} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">{metric.label}</p><p className="mt-2 text-2xl font-black text-[#0A3340]">{metric.value == null ? '—' : Number(metric.value).toLocaleString('en-KE')}</p></article>)}</div>{personalPerformance.truncated && <p role="status" className="rounded-lg bg-[#F5FBFA] p-3 text-xs text-[#0A3340]">Some detailed events exceed the reporting limit. Unique visitor totals may be partial.</p>}<div className="rounded-xl border border-[#D7E7E4] bg-white p-4"><h3 className="font-bold text-[#0A3340]">Performance by listing</h3><div className="mt-3 space-y-2">{(personalPerformance.listings || []).map((item: any)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EFED] py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#0A3340]">{item.title || 'Vehicle listing'}</p><p className="text-xs capitalize text-[#64748B]">{item.status || 'unknown'}</p></div><div className="flex flex-wrap gap-3 text-xs text-[#526875]"><span>{item.views} views</span><span>{item.uniqueVisitors} visitors</span><span>{item.clicksLifetime} lifetime clicks</span><span>{item.enquiriesLifetime} lifetime enquiries</span></div></div>)}{!personalPerformance.listings?.length && <p className="text-sm text-[#64748B]">No owned listings to report yet.</p>}</div></div><p className="text-xs leading-5 text-[#64748B]">{personalPerformance.definitions?.listingViews} {personalPerformance.definitions?.clicks} {personalPerformance.definitions?.enquiries} Conversion rate is not reported because no verified enquiry-to-completed-sale attribution is available.</p></>}</section>}
        {personalSection==='seller-enquiries' && <section className="space-y-4" data-kayad-personal-seller-enquiries="true"><div><h2 className="text-xl font-black text-[#0A3340]">Seller enquiries</h2><p className="mt-1 text-sm text-[#64748B]">Enquiries received on vehicles you are selling from your personal account. Enquiries you sent to other sellers are under Buying. This is separate from dealer CRM.</p></div><button type="button" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)} className="rounded-lg border border-[#D7E7E4] px-3 py-2 text-xs font-bold text-[#12576D]">Refresh enquiries</button>{sellerEnquiriesLoading ? <p className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Loading your enquiries…</p> : sellerEnquiriesError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{sellerEnquiriesError}</div> : sellerEnquiries.length ? <div className="space-y-3">{sellerEnquiries.map((lead: any)=><article key={lead.id} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-[#0A3340]">{lead.listing?.title || 'Vehicle enquiry'}</h3><p className="mt-1 text-xs text-[#64748B]">{lead.source} · Received {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-KE') : 'date unavailable'}</p></div><span className="rounded-full bg-[#E6F5F1] px-3 py-1 text-xs font-bold capitalize text-[#12576D]">{lead.stage || 'new'}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#64748B]">Last activity: {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString('en-KE') : 'Not recorded'}{lead.isHot ? ' · Priority enquiry' : ''}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setExpandedSellerOfferId(current=>current===String(lead.id)?null:String(lead.id))} aria-expanded={expandedSellerOfferId===String(lead.id)} className="rounded-lg border border-[#BDE5DE] px-3 py-2 text-xs font-bold text-[#12576D]">{expandedSellerOfferId===String(lead.id)?'Hide offers':'View offers'}</button><button type="button" onClick={()=>selectPersonalSection('messages')} className="rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Open messages</button></div></div>{expandedSellerOfferId===String(lead.id)&&<Suspense fallback={<p role="status" className="mt-3 text-xs text-[#64748B]">Loading offer controls…</p>}><PersonalOfferPanel leadId={String(lead.id)} compact/></Suspense>}</article>)}</div> : <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center"><p className="font-bold text-[#0A3340]">No seller enquiries yet</p><p className="mt-1 text-sm text-[#64748B]">New enquiries for your active vehicle listings will appear here.</p></div>}</section>}
        {showSellerModule && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your account tools…</div>}><PersonalSellingTools user={user} isEmailVerified={Boolean(user?.emailVerified)} initialSection={sectionToSeller[personalSection] as any} listings={personalListings} listingsLoading={personalListingsLoading} listingsError={personalListingsError} onRefreshListings={refresh} onNavigate={handlePersonalNavigate}/></Suspense>}
        {['buying','auctions','deals'].includes(personalSection) && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your buying and transaction activity…</div>}><div className="space-y-4">{personalSection==='buying' && <section className="rounded-xl border border-[#DCE9E7] bg-white p-4 sm:p-5" aria-labelledby="sent-enquiries-title" data-kayad-personal-sent-enquiries="true"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#5B7480]">Buying</p><h2 id="sent-enquiries-title" className="text-lg font-black text-[#082B40]">Enquiries & offers you sent</h2><p className="mt-1 text-xs text-[#475569]">Conversations you started with other sellers. Enquiries buyers sent about your own vehicles are under Seller enquiries.</p><div className="mt-3">{overviewSrc.sent==='loading' ? <p role="status" className="text-sm text-[#5B7480]">Loading your enquiries…</p> : overviewSrc.sent==='unavailable' ? <p role="alert" className="text-sm text-[#0A3545]">Your sent enquiries are temporarily unavailable.</p> : sentEnquiries.length ? <ul className="space-y-2">{sentEnquiries.map((lead: any)=><li key={lead.id} className="rounded-lg border border-[#DCE9E7] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#082B40]">{lead.vehicle || 'Vehicle enquiry'}</p><p className="text-xs text-[#5B7480]">{lead.dealer ? `Seller: ${lead.dealer} · ` : ''}Sent {(lead.created_at || lead.createdAt) ? new Date(lead.created_at || lead.createdAt).toLocaleDateString('en-KE') : 'date unavailable'}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#E6F5F1] px-2.5 py-1 text-xs font-bold capitalize text-[#0A4A5C]">{String(lead.stage || 'new').replace(/_/g,' ')}</span><button type="button" aria-expanded={expandedSentId===String(lead.id)} onClick={()=>setExpandedSentId((c)=>c===String(lead.id)?null:String(lead.id))} className="min-h-9 rounded-lg border border-[#BDE5DE] px-3 text-xs font-bold text-[#0A4A5C]">{expandedSentId===String(lead.id)?'Hide offers':'View offers'}</button></div></div>{expandedSentId===String(lead.id)&&<Suspense fallback={<p role="status" className="mt-3 text-xs text-[#5B7480]">Loading offer controls…</p>}><PersonalOfferPanel leadId={String(lead.id)} compact/></Suspense>}</li>)}</ul> : <p className="rounded-lg border border-dashed border-[#BDE5DE] p-4 text-center text-sm text-[#5B7480]">You have not sent any enquiries or offers yet. Browse vehicles to get started.</p>}</div></section>}{personalSection==='auctions' && <BidderIdentityCard user={user} savedCount={null} onPayments={()=>handlePersonalNavigate('payments')}/>}<PersonalBuyingTools user={user} onNavigate={handlePersonalNavigate} section={personalSection as 'buying' | 'auctions' | 'deals'} initialInspectionTab={initialInspectionTab} ownershipDashboard={snapshot} ownershipDashboardLoading={loading} ownershipDashboardError={Boolean(sourceError)} savedVehicles={savedVehiclesList} savedVehicleCount={savedVehicleCount || 0} savedVehiclesSessionUserId={savedVehiclesSessionUserId} savedVehiclesLoading={savedVehiclesLoading} savedVehiclesError={savedVehiclesError} savedVehiclesErrorUserId={savedVehiclesErrorUserId} onRefreshSavedVehicles={onRefreshSavedVehicles} escrowOverview={personalEscrowOverview} escrowOverviewLoading={personalEscrowLoading} escrowOverviewError={personalEscrowError} onRefreshDashboard={refresh}/></div></Suspense>}
        {personalSection==='messages' && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your messages…</div>}>{messagesContent || <p className="rounded-xl border border-[#D7E7E4] bg-white p-5 text-sm text-[#64748B]">Messages are temporarily unavailable.</p>}</Suspense>}
        {personalSection==='account' && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your profile…</div>}>{profileContent || <p className="rounded-xl border border-[#D7E7E4] bg-white p-5 text-sm text-[#64748B]">Your profile is temporarily unavailable.</p>}</Suspense>}
      </div>
    </section>;
  }

  if (role === 'broker') return <section className="mx-auto max-w-3xl rounded-2xl border border-[#D7E7E4] bg-white p-6 shadow-sm" data-kayad-legacy-account-notice="broker">
    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#176B87]">KAYARD KE account update</p>
    <h1 className="mt-2 text-2xl font-black text-[#0A3340]">This legacy account type is no longer offered</h1>
    <p className="mt-3 text-sm leading-6 text-[#64748B]">KAYARD KE now supports Personal Account, Dealer, Garage / Workshop, Inspection Company, and Inspector or Mechanic. Your existing records have not been changed. Contact support to confirm the correct personal or business access before continuing.</p>
    <button type="button" onClick={() => onNavigate('support')} className="mt-5 rounded-xl bg-[#0A3340] px-4 py-2.5 text-sm font-bold text-white">Contact support</button>
  </section>;

  return <section className={`space-y-6 pb-10 auction-dashboard-experience kayad-portal kayad-portal--${role}`} data-kayad-portal={role} data-dashboard-role={role}>
    {!isStaffRole(role) && <>
      <AuctionExperienceRail current="wallet" />
      <BidderIdentityCard user={user} savedCount={null} onPayments={() => onNavigate('payments')} />
    </>}
    <div className="rounded-3xl p-6 text-white shadow-lg" style={{background:`linear-gradient(135deg, ${config.accent}, #0A3340)`}}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">KAYARD KE workspace</p><h1 className="mt-1 text-2xl font-black">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-white/70">{config.subtitle}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button><button onClick={()=>setDensity(density==='comfortable'?'compact':'comfortable')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold"><Settings2 size={14}/> {density==='comfortable'?'Compact':'Comfortable'}</button></div>
      </div>
    </div>


    {sourceError && <div className="rounded-xl border border-[#BDE5DE] bg-[#F3FAF9] p-3 text-xs font-bold text-[#0A3340]">{sourceError}</div>}

    <div className={`grid gap-3 ${density==='compact'?'sm:grid-cols-4':'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {cards.filter(c=>!hidden.includes(c.id)).map((card)=>{const Icon=card.icon;return <div key={card.id} className="group rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#5B6B7D]">{card.label}</p><p className="mt-1 text-2xl font-black text-[#0A3340]">{card.value}</p></div><Icon size={20} style={{color:config.accent}}/></div><button onClick={()=>toggle(card.id)} className="mt-3 text-[10px] font-bold text-[#5B6B7D] opacity-0 group-hover:opacity-100">Hide card</button></div>})}
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-[#D7E7E4] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-[#0A3340]">Workspace controls</h2><p className="text-xs text-[#64748B]">Role-scoped shortcuts into the existing canonical modules.</p></div><BarChart3 size={18} className="text-[#BDE5DE]"/></div><div className="grid gap-3 sm:grid-cols-2">{config.actions.map((action)=>{const Icon=action.icon;return <button key={action.label+action.nav} onClick={()=>onNavigate(action.nav)} className="flex items-center gap-3 rounded-xl border border-[#D7E7E4] p-3 text-left hover:border-[#BDE5DE] hover:shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6FAF9] text-[#0A3340]"><Icon size={17}/></span><span className="flex-1 text-xs font-black text-[#12576D]">{action.label}</span><ChevronRight size={15} className="text-[#BDE5DE]"/></button>})}</div></div>
      <div className="rounded-2xl border border-[#D7E7E4] bg-[#F6FAF9] p-5"><h2 className="text-sm font-black text-[#0A3340]">Dashboard controls</h2><div className="mt-4 space-y-3 text-xs text-[#64748B]"><button onClick={()=>setHidden([])} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-[#D7E7E4]">Restore hidden cards</button><button onClick={()=>setDensity('comfortable')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-[#D7E7E4]">Reset comfortable density</button><p className="pt-2 text-[11px] leading-5 text-[#5B6B7D]">The dashboard shell changes presentation only. Counts and workflow state remain sourced from KAYARD KE APIs; no placeholder records are created.</p></div></div>
    </div>
  </section>;
}
