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

const PersonalSellingTools = React.lazy(() => import('../features/PrivateSellerPlatform/pages/PersonalSellingModule'));
const PersonalBuyingTools = React.lazy(() => import('../features/OwnershipPlatform').then((module) => ({ default: module.PersonalBuyingModule })));
type PersonalSection = 'overview' | 'my-vehicles' | 'create-listing' | 'buying' | 'messages' | 'seller-enquiries' | 'auctions' | 'deals' | 'performance' | 'account' | 'trust' | 'help';

type Props = { user: any; vehicles?: any[]; savedVehicleCount?: number; savedVehiclesList?: any[]; savedVehiclesSessionUserId?: string | null; savedVehiclesLoading?: boolean; savedVehiclesError?: string; savedVehiclesErrorUserId?: string | null; onRefreshSavedVehicles?: () => void; onNavigate: (nav: string) => void; initialSection?: string; initialInspectionTab?: 'mine' | 'reports'; messagesContent?: React.ReactNode; profileContent?: React.ReactNode };

const normalizePersonalSection = (value: string): PersonalSection => {
  const aliases: Record<string, PersonalSection> = {
    'seller-platform': 'my-vehicles', 'seller-dashboard': 'my-vehicles', seller: 'create-listing', sell: 'create-listing',
    'buyer-platform': 'buying', saved: 'buying', profile: 'account', settings: 'account', chat: 'messages', payments: 'deals',
  };
  const normalized = aliases[value] || value;
  return ['overview', 'my-vehicles', 'create-listing', 'buying', 'messages', 'auctions', 'deals', 'seller-enquiries', 'performance', 'account', 'trust', 'help'].includes(normalized) ? normalized as PersonalSection : 'overview';
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
    const internal: Record<string, PersonalSection> = { 'profile': 'account', 'chat': 'messages', 'buyer-platform': 'buying', 'saved': 'buying', 'payments': 'deals', 'seller-enquiries': 'seller-enquiries', 'auctions': 'auctions', 'my-vehicles': 'my-vehicles', 'seller-platform': 'my-vehicles', 'seller-dashboard': 'my-vehicles', sell: 'create-listing', seller: 'create-listing', 'create-listing': 'create-listing', 'listing-wizard': 'create-listing', 'listing-quality': 'my-vehicles', 'trust-center': 'trust', 'auction-verification': 'auctions', escrow: 'deals', help: 'help', settings: 'account' };
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
  const [personalInsightsRefresh, setPersonalInsightsRefresh] = useState(0);
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
    const navItems: Array<{ id: PersonalSection; label: string; icon: React.ElementType }> = [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'my-vehicles', label: 'My vehicles', icon: Car },
      { id: 'buying', label: 'Buying', icon: ShoppingBag }, { id: 'messages', label: 'Messages', icon: MessageCircle },
      { id: 'auctions', label: 'Auctions', icon: Activity }, { id: 'deals', label: 'Deals & escrow', icon: ShieldCheck },
      { id: 'seller-enquiries', label: 'Seller enquiries', icon: MessageCircle }, { id: 'performance', label: 'Performance', icon: BarChart3 }, { id: 'account', label: 'My account', icon: Users },
    ];
    const sectionLabel = navItems.find((item) => item.id === personalSection)?.label || ({ 'create-listing': 'Create listing', 'seller-enquiries': 'Seller enquiries', trust: 'Verification & trust', help: 'Help & support' } as Record<string, string>)[personalSection] || 'My account';
    const sectionToSeller: Partial<Record<PersonalSection, string>> = { 'my-vehicles': 'listing-quality', 'create-listing': 'listing-wizard', auctions: 'auction-verification', trust: 'trust-center', help: 'help' };
    const showSellerModule = Boolean(sectionToSeller[personalSection]);
    return <section className="mx-auto grid w-full max-w-[1500px] gap-4 pb-28 lg:grid-cols-[238px_minmax(0,1fr)] lg:pb-10" data-kayad-unified-personal-dashboard="true">
      <aside className="hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto rounded-2xl bg-[#0A3340] p-3 text-white shadow-sm lg:sticky lg:top-24 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-4 pt-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#13B8A6] font-black">{String(user?.name || 'K').slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-black">{user?.name || 'My account'}</p><p className="text-[11px] text-white/60">Personal account</p></div></div>
        <nav className="mt-4 flex-1 space-y-1" aria-label="Personal dashboard sections">{navItems.map(item => { const Icon=item.icon; const active=personalSection===item.id || (item.id==='my-vehicles' && personalSection==='create-listing'); return <button key={item.id} type="button" onClick={()=>selectPersonalSection(item.id)} aria-current={active?'page':undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${active?'bg-[#0D9488] text-white':'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon size={17}/>{item.label}</button>; })}</nav>
        <div className="mt-4 rounded-xl bg-white/10 p-3 text-[11px] leading-5 text-white/70"><ShieldCheck size={16} className="mb-2 text-[#13B8A6]"/>One personal identity for private buying and selling. Business memberships remain separate.</div>
      </aside>
      <div className="min-w-0 space-y-4">
        <header className="rounded-2xl bg-gradient-to-r from-[#0A3340] via-[#12576D] to-[#0D766F] p-5 text-white shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#BDE5DE]">KAYAD · Personal account</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{personalSection==='overview' ? `Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${(user?.name||'').split(' ')[0] || 'there'}` : sectionLabel}</h1><p className="mt-1 max-w-2xl text-sm text-white/75">Buy and sell privately from one account. Your personal activity stays separate from every business you work with.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{ void refresh(); onRefreshSavedVehicles?.(); }} disabled={loading || personalListingsLoading || savedVehiclesLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60"><RefreshCw size={15} className={loading || personalListingsLoading ? 'animate-spin' : ''}/> Refresh</button><button type="button" onClick={()=>selectPersonalSection('create-listing')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-4 text-sm font-black text-white hover:bg-[#115E59]"><Car size={17}/> Sell a vehicle</button><button type="button" onClick={()=>handlePersonalNavigate('marketplace')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"><ShoppingBag size={17}/> Browse vehicles</button><button type="button" onClick={()=>setDensity(density==='comfortable'?'compact':'comfortable')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15"><Settings2 size={15}/>{density==='comfortable'?'Compact view':'Comfortable view'}</button></div></div></header>
        <details className="rounded-xl border border-[#D7E7E4] bg-white p-3 lg:hidden"><summary className="cursor-pointer text-sm font-bold text-[#0A3340]">Dashboard sections · {sectionLabel}</summary><div className="mt-3 grid grid-cols-2 gap-2">{navItems.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" onClick={()=>selectPersonalSection(item.id)} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-xs font-bold ${personalSection===item.id?'bg-[#DDF4F0] text-[#0A3340]':'bg-[#F6FAF9] text-[#526875]'}`}><Icon size={15}/>{item.label}</button>;})}</div></details>
        {personalSection==='overview' && <>{sourceError && <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-3 text-xs font-semibold text-[#0A3340]">{sourceError}</div>}<div className={`grid ${density==='compact'?'gap-2 sm:grid-cols-2 xl:grid-cols-4':'gap-3 sm:grid-cols-2 xl:grid-cols-4'}`}>{[{id:'listings',label:'My listings',value:personalListingsError ? 'Unavailable' : personalListingsLoading ? '…' : personalListings.length,icon:Car,go:'my-vehicles' as PersonalSection},{id:'saved',label:'Saved vehicles',value:savedVehiclesErrorUserId === user?.id ? 'Unavailable' : savedVehiclesLoading || savedVehiclesSessionUserId !== user?.id ? '…' : typeof savedVehicleCount === 'number' ? savedVehicleCount : 'Unavailable',icon:ShoppingBag,go:'buying' as PersonalSection},{id:'deals',label:'Open deals',value:personalEscrowError ? 'Unavailable' : personalEscrowLoading ? '…' : (personalEscrowOverview?.summary ? personalEscrowOverview.summary.activeCount : 'Unavailable'),icon:ShieldCheck,go:'deals' as PersonalSection},{id:'owned',label:'Owned vehicles',value:Array.isArray(snapshot?.currentVehicles) ? snapshot.currentVehicles.length : loading ? '…' : 'Unavailable',icon:ShoppingBag,go:'buying' as PersonalSection}].map(card=>{const Icon=card.icon;return <button key={card.id} onClick={()=>selectPersonalSection(card.go)} className={`rounded-2xl border border-[#D7E7E4] bg-white ${density==='compact'?'p-3':'p-4'} text-left shadow-sm hover:border-[#8ECFC4]`}><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">{card.label}</span><Icon size={19} className="text-[#0D9488]"/></div><p className="mt-2 text-2xl font-black text-[#0A3340]">{loading ? '…' : card.value}</p></button>;})}</div>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-[#D7E7E4] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#0A3340]">Your personal marketplace</h2><p className="text-xs text-[#64748B]">Buying and selling tools in one place.</p></div><button onClick={()=>selectPersonalSection('my-vehicles')} className="text-xs font-bold text-[#0D766F]">Manage vehicles →</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[{label:'Create a listing',desc:'List your own vehicle',section:'create-listing' as PersonalSection},{label:'Manage my vehicles',desc:'Drafts, review and active listings',section:'my-vehicles' as PersonalSection},{label:'Buying activity',desc:'Saved vehicles and offers',section:'buying' as PersonalSection},{label:'Deals & escrow',desc:'Follow your transactions',section:'deals' as PersonalSection}].map(a=><button key={a.label} onClick={()=>selectPersonalSection(a.section)} className="rounded-xl border border-[#D7E7E4] p-3 text-left hover:bg-[#F6FAF9]"><span className="block text-sm font-black text-[#12576D]">{a.label}</span><span className="mt-1 block text-xs text-[#64748B]">{a.desc}</span></button>)}</div></section><aside className="rounded-2xl border border-[#D7E7E4] bg-[#F6FAF9] p-5"><h2 className="font-black text-[#0A3340]">Account & trust</h2><p className="mt-2 text-sm text-[#64748B]">Keep your personal profile and verification up to date.</p><button onClick={()=>selectPersonalSection('trust')} className="mt-4 rounded-xl bg-[#0A3340] px-4 py-2.5 text-xs font-bold text-white">Verification & trust</button>{dealershipMembership && <div className="mt-4 border-t border-[#D7E7E4] pt-4"><button type="button" onClick={() => onNavigate('dealership-workspace')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#12576D] bg-white px-4 py-2.5 text-xs font-bold text-[#12576D] hover:bg-[#F0F8F6]"><LayoutDashboard size={14} aria-hidden="true"/>{`Work for ${dealershipMembership.dealershipName}`}</button><p className="mt-2 text-xs text-[#64748B]">This business membership does not change your personal account ownership.</p></div>}</aside></div>
        </>}
        {personalSection==='performance' && <section className="space-y-4" data-kayad-personal-performance="true"><div><h2 className="text-xl font-black text-[#0A3340]">Listing performance</h2><p className="mt-1 text-sm text-[#64748B]">Verified first-party listing activity for the last 30 days. Lifetime clicks and enquiries are labelled separately.</p></div><button type="button" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)} className="rounded-lg border border-[#D7E7E4] px-3 py-2 text-xs font-bold text-[#12576D]">Refresh analytics</button>{personalPerformanceError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{personalPerformanceError}<button type="button" className="ml-2 font-bold underline" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)}>Retry</button></div> : !personalPerformance ? <p className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Loading verified listing activity…</p> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Listings',value:personalPerformance.totals?.listings ?? 0},{label:'Listing views · 30 days',value:personalPerformance.totals?.listingViews ?? 0},{label:'Unique visitors · 30 days',value:personalPerformance.totals?.uniqueVisitors ?? 0},{label:'Clicks · lifetime',value:personalPerformance.totals?.clicks ?? 0},{label:'Enquiries · lifetime',value:personalPerformance.totals?.enquiries ?? 0}].map(metric=><article key={metric.label} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">{metric.label}</p><p className="mt-2 text-2xl font-black text-[#0A3340]">{metric.value == null ? '—' : Number(metric.value).toLocaleString('en-KE')}</p></article>)}</div>{personalPerformance.truncated && <p role="status" className="rounded-lg bg-[#F5FBFA] p-3 text-xs text-[#0A3340]">Some detailed events exceed the reporting limit. Unique visitor totals may be partial.</p>}<div className="rounded-xl border border-[#D7E7E4] bg-white p-4"><h3 className="font-bold text-[#0A3340]">Performance by listing</h3><div className="mt-3 space-y-2">{(personalPerformance.listings || []).map((item: any)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EFED] py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#0A3340]">{item.title || 'Vehicle listing'}</p><p className="text-xs capitalize text-[#64748B]">{item.status || 'unknown'}</p></div><div className="flex flex-wrap gap-3 text-xs text-[#526875]"><span>{item.views} views</span><span>{item.uniqueVisitors} visitors</span><span>{item.clicksLifetime} lifetime clicks</span><span>{item.enquiriesLifetime} lifetime enquiries</span></div></div>)}{!personalPerformance.listings?.length && <p className="text-sm text-[#64748B]">No owned listings to report yet.</p>}</div></div><p className="text-xs leading-5 text-[#64748B]">{personalPerformance.definitions?.listingViews} {personalPerformance.definitions?.clicks} {personalPerformance.definitions?.enquiries} Conversion rate is not reported because no verified enquiry-to-completed-sale attribution is available.</p></>}</section>}
        {personalSection==='seller-enquiries' && <section className="space-y-4" data-kayad-personal-seller-enquiries="true"><div><h2 className="text-xl font-black text-[#0A3340]">Seller enquiries</h2><p className="mt-1 text-sm text-[#64748B]">Enquiries tied to vehicles currently owned by your personal account. This is separate from dealer CRM.</p></div><button type="button" onClick={()=>setPersonalInsightsRefresh((n)=>n+1)} className="rounded-lg border border-[#D7E7E4] px-3 py-2 text-xs font-bold text-[#12576D]">Refresh enquiries</button>{sellerEnquiriesLoading ? <p className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Loading your enquiries…</p> : sellerEnquiriesError ? <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3340]">{sellerEnquiriesError}</div> : sellerEnquiries.length ? <div className="space-y-3">{sellerEnquiries.map((lead: any)=><article key={lead.id} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-[#0A3340]">{lead.listing?.title || 'Vehicle enquiry'}</h3><p className="mt-1 text-xs text-[#64748B]">{lead.source} · Received {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-KE') : 'date unavailable'}</p></div><span className="rounded-full bg-[#E6F5F1] px-3 py-1 text-xs font-bold capitalize text-[#12576D]">{lead.stage || 'new'}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#64748B]">Last activity: {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString('en-KE') : 'Not recorded'}{lead.isHot ? ' · Priority enquiry' : ''}</p><button type="button" onClick={()=>selectPersonalSection('messages')} className="rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-bold text-white">Open messages</button></div></article>)}</div> : <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center"><p className="font-bold text-[#0A3340]">No seller enquiries yet</p><p className="mt-1 text-sm text-[#64748B]">New enquiries for your active vehicle listings will appear here.</p></div>}</section>}
        {showSellerModule && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your account tools…</div>}><PersonalSellingTools user={user} isEmailVerified={Boolean(user?.emailVerified)} initialSection={sectionToSeller[personalSection] as any} listings={personalListings} listingsLoading={personalListingsLoading} listingsError={personalListingsError} onRefreshListings={refresh} onNavigate={handlePersonalNavigate}/></Suspense>}
        {['buying','auctions','deals'].includes(personalSection) && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your buying and transaction activity…</div>}><div className="space-y-4">{personalSection==='auctions' && <BidderIdentityCard user={user} savedCount={null} onPayments={()=>handlePersonalNavigate('payments')}/>}<PersonalBuyingTools user={user} onNavigate={handlePersonalNavigate} section={personalSection as 'buying' | 'auctions' | 'deals'} initialInspectionTab={initialInspectionTab} ownershipDashboard={snapshot} ownershipDashboardLoading={loading} ownershipDashboardError={Boolean(sourceError)} savedVehicles={savedVehiclesList} savedVehicleCount={savedVehicleCount || 0} savedVehiclesSessionUserId={savedVehiclesSessionUserId} savedVehiclesLoading={savedVehiclesLoading} savedVehiclesError={savedVehiclesError} savedVehiclesErrorUserId={savedVehiclesErrorUserId} onRefreshSavedVehicles={onRefreshSavedVehicles} escrowOverview={personalEscrowOverview} escrowOverviewLoading={personalEscrowLoading} escrowOverviewError={personalEscrowError} onRefreshDashboard={refresh}/></div></Suspense>}
        {personalSection==='messages' && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your messages…</div>}>{messagesContent || <p className="rounded-xl border border-[#D7E7E4] bg-white p-5 text-sm text-[#64748B]">Messages are temporarily unavailable.</p>}</Suspense>}
        {personalSection==='account' && <Suspense fallback={<div className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Loading your profile…</div>}>{profileContent || <p className="rounded-xl border border-[#D7E7E4] bg-white p-5 text-sm text-[#64748B]">Your profile is temporarily unavailable.</p>}</Suspense>}
      </div>
    </section>;
  }

  if (role === 'broker') return <section className="mx-auto max-w-3xl rounded-2xl border border-[#D7E7E4] bg-white p-6 shadow-sm" data-kayad-legacy-account-notice="broker">
    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#176B87]">KAYAD account update</p>
    <h1 className="mt-2 text-2xl font-black text-[#0A3340]">This legacy account type is no longer offered</h1>
    <p className="mt-3 text-sm leading-6 text-[#64748B]">KAYAD now supports Personal Account, Dealer, Garage / Workshop, Inspection Company, and Inspector or Mechanic. Your existing records have not been changed. Contact support to confirm the correct personal or business access before continuing.</p>
    <button type="button" onClick={() => onNavigate('support')} className="mt-5 rounded-xl bg-[#0A3340] px-4 py-2.5 text-sm font-bold text-white">Contact support</button>
  </section>;

  return <section className={`space-y-6 pb-10 auction-dashboard-experience kayad-portal kayad-portal--${role}`} data-kayad-portal={role} data-dashboard-role={role}>
    {!isStaffRole(role) && <>
      <AuctionExperienceRail current="wallet" />
      <BidderIdentityCard user={user} savedCount={null} onPayments={() => onNavigate('payments')} />
    </>}
    <div className="rounded-3xl p-6 text-white shadow-lg" style={{background:`linear-gradient(135deg, ${config.accent}, #0A3340)`}}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">KAYAD workspace</p><h1 className="mt-1 text-2xl font-black">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-white/70">{config.subtitle}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button><button onClick={()=>setDensity(density==='comfortable'?'compact':'comfortable')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold"><Settings2 size={14}/> {density==='comfortable'?'Compact':'Comfortable'}</button></div>
      </div>
    </div>


    {sourceError && <div className="rounded-xl border border-[#BDE5DE] bg-[#F3FAF9] p-3 text-xs font-bold text-[#0A3340]">{sourceError}</div>}

    <div className={`grid gap-3 ${density==='compact'?'sm:grid-cols-4':'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {cards.filter(c=>!hidden.includes(c.id)).map((card)=>{const Icon=card.icon;return <div key={card.id} className="group rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#5B6B7D]">{card.label}</p><p className="mt-1 text-2xl font-black text-[#0A3340]">{card.value}</p></div><Icon size={20} style={{color:config.accent}}/></div><button onClick={()=>toggle(card.id)} className="mt-3 text-[10px] font-bold text-[#5B6B7D] opacity-0 group-hover:opacity-100">Hide card</button></div>})}
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-[#D7E7E4] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-[#0A3340]">Workspace controls</h2><p className="text-xs text-[#64748B]">Role-scoped shortcuts into the existing canonical modules.</p></div><BarChart3 size={18} className="text-[#BDE5DE]"/></div><div className="grid gap-3 sm:grid-cols-2">{config.actions.map((action)=>{const Icon=action.icon;return <button key={action.label+action.nav} onClick={()=>onNavigate(action.nav)} className="flex items-center gap-3 rounded-xl border border-[#D7E7E4] p-3 text-left hover:border-[#BDE5DE] hover:shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6FAF9] text-[#0A3340]"><Icon size={17}/></span><span className="flex-1 text-xs font-black text-[#12576D]">{action.label}</span><ChevronRight size={15} className="text-[#BDE5DE]"/></button>})}</div></div>
      <div className="rounded-2xl border border-[#D7E7E4] bg-[#F6FAF9] p-5"><h2 className="text-sm font-black text-[#0A3340]">Dashboard controls</h2><div className="mt-4 space-y-3 text-xs text-[#64748B]"><button onClick={()=>setHidden([])} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-[#D7E7E4]">Restore hidden cards</button><button onClick={()=>setDensity('comfortable')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-[#D7E7E4]">Reset comfortable density</button><p className="pt-2 text-[11px] leading-5 text-[#5B6B7D]">The dashboard shell changes presentation only. Counts and workflow state remain sourced from KAYAD APIs; no placeholder records are created.</p></div></div>
    </div>
  </section>;
}
