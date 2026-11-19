import React from 'react';
import { ArrowRight, Car, CheckCircle2, CircleAlert, Clock3, Gavel, LayoutDashboard, MessageCircle, PlusCircle, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import type { BackendCar } from '../../../services/vehicleApi';
import { getListingLifecycle } from '../../../utils/listingLifecycle';
import { ListingStatusBadge } from '../../listing/ListingPresentation';
import type { PersonalSection } from './personalNav';

/** A value that came from a real data source, or an honest reason it is not available. Never a made-up zero. */
export type Metric = { state: 'loading' | 'ready' | 'unavailable'; value?: number };
export type RecentEvent = { id: string; title: string; detail: string; at: number; go: PersonalSection };
export type TrustState = {
  emailVerified: boolean | undefined;
  phone: 'loading' | 'verified' | 'unverified' | 'no_phone' | 'unavailable';
};

type Props = {
  density: 'comfortable' | 'compact';
  sourceError?: string;
  listings: BackendCar[];
  listingsLoading: boolean;
  listingsError: string;
  metrics: { listings: Metric; saved: Metric; enquiries: Metric; deals: Metric };
  buying: { saved: Metric; offers: Metric; escrow: Metric; purchases: Metric };
  recent: { state: 'loading' | 'ready' | 'unavailable'; events: RecentEvent[] };
  trust: TrustState;
  businessName?: string | null;
  onGo: (section: PersonalSection) => void;
  onNavigate: (nav: string) => void;
};

const card = 'rounded-xl border border-[#DCE9E7] bg-white shadow-[0_1px_2px_rgba(8,43,64,.05)]';
const label = 'text-[10px] font-black uppercase tracking-[.14em] text-[#5B7480]';
const show = (m: Metric) => (m.state === 'loading' ? '…' : m.state === 'unavailable' || typeof m.value !== 'number' ? 'Unavailable' : String(m.value));
const kes = (n: unknown) => { const v = Number(n); return Number.isFinite(v) && v > 0 ? `KES ${v.toLocaleString('en-KE')}` : 'Price on request'; };
const ago = (t: number) => {
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'Just now'; if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d < 30 ? `${d} d ago` : new Date(t).toLocaleDateString('en-KE');
};
const time = (l: BackendCar) => { const a = l as any; const t = Date.parse(a.updated_at || a.updatedAt || a.created_at || a.createdAt || ''); return Number.isFinite(t) ? t : 0; };

function MetricCard({ title, metric, icon: Icon, onClick, density }: { title: string; metric: Metric; icon: React.ElementType; onClick: () => void; density: Props['density'] }) {
  return (
    <button type="button" onClick={onClick} className={`${card} ${density === 'compact' ? 'p-3' : 'p-4'} text-left transition hover:border-[#11B8A6]`} data-kayad-metric={title}>
      <div className="flex items-center justify-between gap-2"><span className={label}>{title}</span><Icon size={18} className="shrink-0 text-[#11B8A6]" aria-hidden="true" /></div>
      <p className={`mt-2 font-black text-[#082B40] ${metric.state === 'ready' ? 'text-2xl' : 'text-base'}`}>{show(metric)}</p>
    </button>
  );
}

function VehicleRow({ l, onManage }: { l: BackendCar; onManage: () => void }) {
  const a = l as any;
  const info = getListingLifecycle(l.status, a.sold);
  const photo = l.images?.[0]?.thumb || l.images?.[0]?.url;
  const place = l.location_city || l.city;
  const facts = [l.year, typeof l.mileage === 'number' ? `${l.mileage.toLocaleString('en-KE')} km` : null, l.fuel, place].filter(Boolean).join(' · ');
  return (
    <li className="flex gap-3 rounded-xl border border-[#DCE9E7] p-3" data-kayad-vehicle-summary={l.id}>
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[#E1EDEB]">
        {photo ? <img src={photo} alt={`${l.brand} ${l.model}`} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#5B7480]"><Car size={22} aria-hidden="true" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="truncate text-sm font-black text-[#082B40]">{l.brand} {l.model}</h3>
          <ListingStatusBadge status={l.status} label={info.label} />
        </div>
        <p className="mt-0.5 truncate text-xs text-[#475569]">{facts}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-[#0B6B63]">{kes(l.price)}{typeof l.views === 'number' && <span className="ml-2 text-xs font-semibold text-[#5B7480]">{l.views.toLocaleString('en-KE')} views</span>}</p>
          <button type="button" onClick={onManage} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#DCE9E7] px-3 text-xs font-bold text-[#0A3545] hover:bg-[#F4F9F8]">Manage <ArrowRight size={13} aria-hidden="true" /></button>
        </div>
      </div>
    </li>
  );
}

export default function PersonalOverview({ density, sourceError, listings, listingsLoading, listingsError, metrics, buying, recent, trust, businessName, onGo, onNavigate }: Props) {
  const gap = density === 'compact' ? 'gap-2' : 'gap-3';
  const recentListings = [...listings].sort((x, y) => time(y) - time(x)).slice(0, 3);
  const quick: Array<{ label: string; desc: string; icon: React.ElementType; run: () => void }> = [
    { label: 'Create listing', desc: 'List your own vehicle', icon: PlusCircle, run: () => onGo('create-listing') },
    { label: 'Saved vehicles', desc: 'Offers and purchases too', icon: ShoppingBag, run: () => onGo('buying') },
    { label: 'Seller enquiries', desc: 'Buyers asking about your cars', icon: MessageCircle, run: () => onGo('seller-enquiries') },
    { label: 'Deals & escrow', desc: 'Follow your transactions', icon: ShieldCheck, run: () => onGo('deals') },
    { label: 'Messages', desc: 'Your conversations', icon: MessageCircle, run: () => onGo('messages') },
    { label: 'Auctions', desc: 'Bids and verification', icon: Gavel, run: () => onGo('auctions') },
  ];
  const phoneText = { loading: 'Checking…', verified: 'Verified', unverified: 'Not verified', no_phone: 'No number added', unavailable: 'Status unavailable' }[trust.phone];
  const chip = (ok: boolean, text: string) => ok
    ? <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F7F3] px-2 py-0.5 text-[11px] font-bold text-[#0B6B63]"><CheckCircle2 size={12} aria-hidden="true" />{text}</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F9F8] px-2 py-0.5 text-[11px] font-bold text-[#475569] ring-1 ring-inset ring-[#DCE9E7]"><CircleAlert size={12} aria-hidden="true" />{text}</span>;

  return (
    <div className="space-y-4" data-kayad-personal-overview="true">
      {sourceError && <div role="alert" className="rounded-xl border border-[#B8D9D6] bg-[#F5FBFA] p-3 text-xs font-semibold text-[#0A3545]">{sourceError}</div>}
      <div className={`grid grid-cols-2 xl:grid-cols-4 ${gap}`}>
        <MetricCard density={density} title="My listings" metric={metrics.listings} icon={Car} onClick={() => onGo('my-vehicles')} />
        <MetricCard density={density} title="Saved vehicles" metric={metrics.saved} icon={ShoppingBag} onClick={() => onGo('buying')} />
        <MetricCard density={density} title="Active enquiries" metric={metrics.enquiries} icon={MessageCircle} onClick={() => onGo('seller-enquiries')} />
        <MetricCard density={density} title="Open deals" metric={metrics.deals} icon={ShieldCheck} onClick={() => onGo('deals')} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="overview-vehicles-title">
            <div className="flex items-center justify-between gap-3">
              <div><p className={label}>Selling</p><h2 id="overview-vehicles-title" className="text-lg font-black text-[#082B40]">My vehicles</h2></div>
              <button type="button" onClick={() => onGo('my-vehicles')} className="text-xs font-bold text-[#0B6B63] hover:underline">Manage vehicles →</button>
            </div>
            <div className="mt-3">
              {listingsLoading ? <p role="status" className="rounded-lg bg-[#F4F9F8] p-4 text-sm text-[#5B7480]">Loading your vehicles…</p>
                : listingsError ? <p role="alert" className="rounded-lg border border-[#B8D9D6] bg-[#F5FBFA] p-4 text-sm text-[#0A3545]">{listingsError}</p>
                : recentListings.length ? <ul className="space-y-2">{recentListings.map((l) => <VehicleRow key={l.id} l={l} onManage={() => onGo('my-vehicles')} />)}</ul>
                : <div className="rounded-lg border border-dashed border-[#BFD8D4] p-6 text-center"><p className="text-sm font-bold text-[#082B40]">You have no vehicles listed yet</p><p className="mt-1 text-xs text-[#5B7480]">Create a listing to start selling privately.</p><button type="button" onClick={() => onGo('create-listing')} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#082B40] px-4 text-xs font-bold text-white"><PlusCircle size={14} aria-hidden="true" />Create listing</button></div>}
            </div>
          </section>

          <section className={`${card} p-4 sm:p-5`} aria-labelledby="overview-buying-title">
            <p className={label}>Buying</p><h2 id="overview-buying-title" className="text-lg font-black text-[#082B40]">Buying activity</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[{ t: 'Saved vehicles', m: buying.saved, go: 'buying' as PersonalSection, i: ShoppingBag }, { t: 'My offers', m: buying.offers, go: 'buying' as PersonalSection, i: Gavel }, { t: 'In escrow', m: buying.escrow, go: 'deals' as PersonalSection, i: ShieldCheck }, { t: 'Owned vehicles', m: buying.purchases, go: 'buying' as PersonalSection, i: Car }].map((x) => (
                <button key={x.t} type="button" onClick={() => onGo(x.go)} className="rounded-lg border border-[#DCE9E7] bg-[#F4F9F8] p-3 text-left hover:border-[#11B8A6]">
                  <x.i size={16} className="text-[#11B8A6]" aria-hidden="true" /><p className="mt-2 text-xs font-bold text-[#0A3545]">{x.t}</p><p className="text-sm font-black text-[#082B40]">{show(x.m)}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="overview-quick-title">
            <p className={label}>Shortcuts</p><h2 id="overview-quick-title" className="text-lg font-black text-[#082B40]">Quick actions</h2>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
              {quick.map((q) => <button key={q.label} type="button" onClick={q.run} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-left hover:bg-[#F4F9F8]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#11B8A6]/10 text-[#0B6B63]"><q.icon size={16} aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-bold text-[#082B40]">{q.label}</span><span className="block truncate text-[11px] text-[#5B7480]">{q.desc}</span></span></button>)}
              <button type="button" onClick={() => onNavigate('marketplace')} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-left hover:bg-[#F4F9F8]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#11B8A6]/10 text-[#0B6B63]"><Car size={16} aria-hidden="true" /></span><span><span className="block text-sm font-bold text-[#082B40]">Search marketplace</span><span className="block text-[11px] text-[#5B7480]">Find your next vehicle</span></span></button>
            </div>
          </section>

          <section className={`${card} p-4 sm:p-5`} aria-labelledby="overview-recent-title">
            <div className="flex items-center justify-between gap-3"><div><p className={label}>Latest</p><h2 id="overview-recent-title" className="text-lg font-black text-[#082B40]">Recent activity</h2></div><button type="button" onClick={() => onGo('activity')} className="text-xs font-bold text-[#0B6B63] hover:underline">View all →</button></div>
            <div className="mt-3">
              {recent.state === 'unavailable' && recent.events.length > 0 && <p role="status" className="mb-3 rounded-lg bg-[#F6FAF9] p-3 text-xs text-[#526875]">Some activity sources are unavailable. The records below are confirmed, but this list may be incomplete.</p>}
              {recent.state === 'loading' && recent.events.length > 0 && <p role="status" className="mb-3 text-xs text-[#64748B]">Updating recent activity…</p>}
              {recent.state === 'loading' && !recent.events.length ? <p role="status" className="text-sm text-[#5B7480]">Loading recent activity…</p>
                : recent.state === 'unavailable' && !recent.events.length ? <p role="alert" className="text-sm text-[#0A3545]">Recent activity is temporarily unavailable.</p>
                : recent.events.length ? <ul className="space-y-3">{recent.events.map((e) => <li key={e.id}><button type="button" onClick={() => onGo(e.go)} className="flex w-full items-start gap-3 text-left"><Clock3 size={15} className="mt-0.5 shrink-0 text-[#11B8A6]" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#082B40]">{e.title}</span><span className="block truncate text-xs text-[#5B7480]">{e.detail} · {ago(e.at)}</span></span></button></li>)}</ul>
                : <p className="text-sm text-[#5B7480]">No activity yet. Listings, enquiries and deals will appear here.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-[#DCE9E7] bg-[#F4F9F8] p-4 sm:p-5" aria-labelledby="overview-trust-title" data-kayad-account-trust="true">
            <p className={label}>Account</p><h2 id="overview-trust-title" className="text-lg font-black text-[#082B40]">Account & trust</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-[#475569]">Email</dt><dd>{chip(trust.emailVerified === true, trust.emailVerified === true ? 'Verified' : trust.emailVerified === false ? 'Not verified' : 'Status unavailable')}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[#475569]">Phone</dt><dd>{chip(trust.phone === 'verified', phoneText)}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onGo('trust')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#082B40] px-4 text-xs font-bold text-white"><ShieldCheck size={14} aria-hidden="true" />Verification & trust</button>
              <button type="button" onClick={() => onGo('account')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#DCE9E7] bg-white px-4 text-xs font-bold text-[#0A3545]"><UserRound size={14} aria-hidden="true" />My Account</button>
            </div>
            {businessName && <div className="mt-4 border-t border-[#DCE9E7] pt-4"><button type="button" onClick={() => onNavigate('dealership-workspace')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#0A4A5C] bg-white px-4 text-xs font-bold text-[#0A4A5C]"><LayoutDashboard size={14} aria-hidden="true" />{`Work for ${businessName}`}</button><p className="mt-2 text-xs text-[#5B7480]">This business membership does not change your personal account ownership.</p></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
