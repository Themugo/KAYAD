import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CarFront, CheckCircle2, Clock3, Gavel, Loader2, MessageCircle, RefreshCw, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { BackendCar } from '../../../services/vehicleApi';
import type { BackendEscrow } from '../../../services/escrowApi';
import leadApi from '../../../services/leadApi';
import { fetchMyBids } from '../../../services/bidApi';

type Category = 'selling' | 'buying' | 'transactions' | 'auctions';
type ActivityEvent = {
  id: string;
  category: Category;
  title: string;
  description: string;
  at: string;
  timestamp: number;
  status?: string;
  amount?: number;
};

type Props = {
  userId: string;
  role: string;
  listings: BackendCar[];
  listingsLoading: boolean;
  listingsError?: string;
  escrows: BackendEscrow[];
  escrowsLoading: boolean;
  escrowsError?: boolean;
  onNavigate: (section: string) => void;
};

const validDate = (value: unknown): { at: string; timestamp: number } | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? { at: value, timestamp } : null;
};
const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `KES ${amount.toLocaleString('en-KE')}` : '';
};
const statusLabel = (value: unknown) => String(value || 'status unavailable').replace(/[_-]+/g, ' ');

export default function PersonalActivityTimeline({ userId, role, listings, listingsLoading, listingsError, escrows, escrowsLoading, escrowsError, onNavigate }: Props) {
  const [sellerEnquiries, setSellerEnquiries] = useState<any[]>([]);
  const [buyerLeads, setBuyerLeads] = useState<any[]>([]);
  const [bids, setBids] = useState<Array<Record<string, unknown>>>([]);
  const [offerEvents, setOfferEvents] = useState<Array<{ leadId: string; side: 'selling' | 'buying'; event: any }>>([]);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [sellerSourceState, setSellerSourceState] = useState<'loading' | 'ready' | 'unavailable' | 'not_applicable'>('loading');
  const [buyerSourceState, setBuyerSourceState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [bidSourceState, setBidSourceState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [filter, setFilter] = useState<'all' | Category>('all');

  const refresh = useCallback(() => setRefreshTick((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSellerEnquiries([]);
    setBuyerLeads([]);
    setBids([]);
    setOfferEvents([]);
    setSourceErrors([]);
    setSellerSourceState('loading');
    setBuyerSourceState('loading');
    setBidSourceState('loading');

    const canReadSellerInbox = ['user', 'individual_seller'].includes(String(role).toLowerCase());
    const sellerRequest = canReadSellerInbox ? leadApi.mySellerEnquiries() : Promise.resolve({ enquiries: [] });
    if (!canReadSellerInbox) setSellerSourceState('not_applicable');

    void Promise.allSettled([sellerRequest, leadApi.myNegotiations(), fetchMyBids()]).then(async ([sellerResult, buyerResult, bidsResult]) => {
      if (!active) return;
      const errors: string[] = [];
      const sellerRows = sellerResult.status === 'fulfilled' && Array.isArray(sellerResult.value?.enquiries) ? sellerResult.value.enquiries : [];
      const buyerRows = buyerResult.status === 'fulfilled' && Array.isArray(buyerResult.value?.leads) ? buyerResult.value.leads : [];
      const bidRows = bidsResult.status === 'fulfilled' && Array.isArray(bidsResult.value?.bids) ? bidsResult.value.bids : [];
      if (sellerResult.status === 'rejected') errors.push('Seller enquiries could not be loaded.');
      if (buyerResult.status === 'rejected') errors.push('Buyer enquiries and negotiations could not be loaded.');
      if (bidsResult.status === 'rejected') errors.push('Auction bid history could not be loaded.');
      setSellerSourceState(!canReadSellerInbox ? 'not_applicable' : sellerResult.status === 'fulfilled' ? 'ready' : 'unavailable');
      setBuyerSourceState(buyerResult.status === 'fulfilled' ? 'ready' : 'unavailable');
      setBidSourceState(bidsResult.status === 'fulfilled' ? 'ready' : 'unavailable');
      setSellerEnquiries(sellerRows);
      setBuyerLeads(buyerRows);
      setBids(bidRows);

      // Offer details are participant-scoped by the API. Limit detail lookups to the
      // eight most recently active unique lead conversations to avoid an unbounded fan-out.
      const leadCandidates = [
        ...sellerRows.map((lead: any) => ({ id: String(lead.id || ''), side: 'selling' as const, at: validDate(lead.lastActivityAt || lead.createdAt)?.timestamp || 0 })),
        ...buyerRows.map((lead: any) => ({ id: String(lead.id || ''), side: 'buying' as const, at: validDate(lead.created_at || lead.createdAt)?.timestamp || 0 })),
      ].filter((lead) => lead.id).sort((a, b) => b.at - a.at);
      const unique = new Map<string, typeof leadCandidates[number]>();
      leadCandidates.forEach((lead) => { if (!unique.has(lead.id)) unique.set(lead.id, lead); });
      const recent = [...unique.values()].slice(0, 8);
      if (recent.length) {
        const offerResults = await Promise.allSettled(recent.map((lead) => leadApi.offers(lead.id)));
        if (!active) return;
        const collected: Array<{ leadId: string; side: 'selling' | 'buying'; event: any }> = [];
        offerResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && Array.isArray(result.value?.events)) {
            result.value.events.forEach((event: any) => collected.push({ leadId: recent[index].id, side: recent[index].side, event }));
          } else if (result.status === 'rejected') {
            errors.push('Some offer details are temporarily unavailable.');
          }
        });
        setOfferEvents(collected);
      }
      if (active) setSourceErrors([...new Set(errors)]);
    }).catch(() => {
      if (active) setSourceErrors(['Personal activity could not be loaded.']);
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [userId, role, refreshTick]);

  const events = useMemo(() => {
    const result: ActivityEvent[] = [];
    listings.forEach((listing) => {
      const date = validDate(listing.createdAt || listing.created_at);
      if (!date) return;
      const title = listing.title || `${listing.year || ''} ${listing.brand || ''} ${listing.model || ''}`.trim() || 'Personal vehicle';
      result.push({ id: `listing:${listing.id}:created`, category: 'selling', title: 'Personal listing created', description: `${title} · Current status: ${statusLabel(listing.status)}`, ...date, status: statusLabel(listing.status) });
      const updated = validDate(listing.updatedAt || listing.updated_at);
      if (updated && updated.timestamp > date.timestamp) result.push({ id: `listing:${listing.id}:updated`, category: 'selling', title: 'Listing record updated', description: `${title} · Current status: ${statusLabel(listing.status)}`, ...updated, status: statusLabel(listing.status) });
    });
    sellerEnquiries.forEach((lead) => {
      const date = validDate(lead.lastActivityAt || lead.createdAt);
      if (!date) return;
      const title = lead.listing?.title || 'Your vehicle listing';
      result.push({ id: `seller-enquiry:${lead.id}`, category: 'selling', title: 'Seller enquiry activity', description: `${title} · ${statusLabel(lead.stage)}${lead.isHot ? ' · Priority enquiry' : ''}`, ...date, status: statusLabel(lead.stage) });
    });
    buyerLeads.forEach((lead) => {
      const date = validDate(lead.created_at || lead.createdAt);
      if (!date) return;
      result.push({ id: `buyer-lead:${lead.id}`, category: 'buying', title: 'Buyer enquiry opened', description: `Vehicle enquiry · ${statusLabel(lead.stage)}`, ...date, status: statusLabel(lead.stage) });
    });
    offerEvents.forEach(({ leadId, side, event }, index) => {
      const date = validDate(event.created_at || event.createdAt);
      if (!date) return;
      const action = statusLabel(event.event_type || 'offer activity');
      const amount = Number(event.amount);
      result.push({ id: `offer:${leadId}:${event.id || index}`, category: side, title: `Offer ${action}`, description: `${side === 'selling' ? 'Seller conversation' : 'Buyer conversation'}${money(amount) ? ` · ${money(amount)}` : ''}`, ...date, amount: Number.isFinite(amount) && amount > 0 ? amount : undefined, status: action });
    });
    escrows.forEach((escrow) => {
      const date = validDate(escrow.createdAt);
      if (date) {
        result.push({ id: `escrow:${escrow.id}:created`, category: 'transactions', title: 'Escrow transaction opened', description: `${escrow.car?.title || 'Vehicle transaction'} · ${money(escrow.amount)} · ${statusLabel(escrow.status)}`, ...date, amount: escrow.amount, status: escrow.status });
        const updated = validDate(escrow.updatedAt);
        if (updated && updated.timestamp > date.timestamp) result.push({ id: `escrow:${escrow.id}:updated`, category: 'transactions', title: 'Escrow record updated', description: `${escrow.car?.title || 'Vehicle transaction'} · Current status: ${statusLabel(escrow.status)}`, ...updated, amount: escrow.amount, status: escrow.status });
      }
    });
    bids.forEach((bid, index) => {
      const date = validDate(bid.createdAt || bid.created_at);
      if (!date) return;
      const car = bid.car && typeof bid.car === 'object' ? bid.car as Record<string, unknown> : {};
      const amount = Number(bid.amount);
      result.push({ id: `bid:${String(bid.id || bid._id || index)}`, category: 'auctions', title: 'Auction bid placed', description: `${String(car.title || 'Vehicle auction')} · ${money(amount)} · ${statusLabel(bid.status)}`, ...date, amount: Number.isFinite(amount) && amount > 0 ? amount : undefined, status: statusLabel(bid.status) });
    });
    return result.sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);
  }, [listings, sellerEnquiries, buyerLeads, offerEvents, escrows, bids]);

  const visibleEvents = filter === 'all' ? events : events.filter((event) => event.category === filter);
  const sourceLoading = loading || listingsLoading || escrowsLoading;
  const metricValue = (state: 'loading' | 'ready' | 'unavailable' | 'not_applicable', value: number) => state === 'ready' ? value : state === 'unavailable' ? 'Unavailable' : '—';
  const summary = [
    { label: 'My listings', value: listingsLoading ? '—' : listingsError ? 'Unavailable' : listings.length, icon: CarFront, category: 'selling' as const },
    { label: 'Seller enquiries', value: metricValue(sellerSourceState, sellerEnquiries.length), icon: MessageCircle, category: 'selling' as const },
    { label: 'Buyer negotiations', value: metricValue(buyerSourceState, buyerLeads.length), icon: ShoppingBag, category: 'buying' as const },
    { label: 'Auction bids', value: metricValue(bidSourceState, bids.length), icon: Gavel, category: 'auctions' as const },
    { label: 'Escrow deals', value: escrowsLoading ? '—' : escrowsError ? 'Unavailable' : escrows.length, icon: ShieldCheck, category: 'transactions' as const },
  ];
  const categoryLabel: Record<Category, string> = { selling: 'Selling', buying: 'Buying', transactions: 'Transactions', auctions: 'Auctions' };

  return (
    <section className="space-y-4" data-kayad-personal-activity="true" aria-labelledby="personal-activity-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0D766F]">One personal account · Confirmed records</p><h2 id="personal-activity-title" className="mt-1 text-xl font-black text-[#0A3340]">Personal activity</h2><p className="mt-1 text-sm text-[#64748B]">A combined view of your selling, buying, offers, auctions and escrow activity.</p></div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-3 text-xs font-bold text-[#12576D] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh activity</button>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {summary.map(({ label, value, icon: Icon, category }) => <button key={label} type="button" onClick={() => setFilter(category)} className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-left hover:border-[#8ECFC4]"><span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-[#64748B]">{label}<Icon size={16} className="text-[#0D9488]"/></span><span className="mt-2 block text-2xl font-black tabular-nums text-[#0A3340]">{value}</span></button>)}
      </div>

      {(sourceErrors.length > 0 || listingsError || escrowsError) && <div role="status" className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 text-xs leading-5 text-[#0A3340]">Some activity sources are unavailable. The timeline only shows records that could be confirmed; missing data is not treated as zero.{sourceErrors.length > 0 && <ul className="mt-1 list-disc pl-4">{sourceErrors.map((error) => <li key={error}>{error}</li>)}</ul>}{listingsError && <p className="mt-1">Personal listings are unavailable.</p>}{escrowsError && <p className="mt-1">Escrow activity is unavailable.</p>}</div>}

      <div className="flex flex-wrap gap-2" aria-label="Activity filters">
        {(['all', 'selling', 'buying', 'transactions', 'auctions'] as const).map((key) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-9 rounded-full px-3 text-xs font-bold capitalize ${filter === key ? 'bg-[#0A3340] text-white' : 'border border-[#D7E7E4] bg-white text-[#526875] hover:bg-[#F6FAF9]'}`}>{key === 'all' ? 'All activity' : categoryLabel[key]}</button>)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white">
        {sourceLoading && events.length === 0 ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-[#64748B]"><Loader2 size={18} className="animate-spin"/> Loading your personal activity…</div> : visibleEvents.length ? <ol className="divide-y divide-[#E5EFED]">
          {visibleEvents.map((event) => <li key={event.id} className="flex gap-3 p-4 sm:gap-4">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E8F7F3] text-[#0D766F]">{event.category === 'selling' ? <CarFront size={17}/> : event.category === 'buying' ? <ShoppingBag size={17}/> : event.category === 'transactions' ? <ShieldCheck size={17}/> : <Gavel size={17}/>}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-bold text-[#0A3340]">{event.title}</p><span className="shrink-0 rounded-full bg-[#F3FAF9] px-2.5 py-1 text-[10px] font-bold capitalize text-[#12576D]">{categoryLabel[event.category]}</span></div><p className="mt-1 text-xs leading-5 text-[#64748B]">{event.description}</p><p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#82919B]"><Clock3 size={11}/>{new Date(event.at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
          </li>)}
        </ol> : (sourceErrors.length > 0 || listingsError || escrowsError) ? <div className="p-8 text-center"><Activity className="mx-auto mb-2 h-7 w-7 text-[#B7791F]"/><p className="text-sm font-bold text-[#0A3340]">Activity could not be fully loaded</p><p className="mt-1 text-xs text-[#64748B]">We could not confirm enough source records to show this view. Refresh to try again; unavailable data is not presented as an empty history.</p><button type="button" onClick={refresh} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white"><RefreshCw size={13}/> Retry activity</button></div> : <div className="p-8 text-center"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#0D9488]"/><p className="text-sm font-bold text-[#0A3340]">No recorded activity in this view yet</p><p className="mt-1 text-xs text-[#64748B]">As you buy, sell, place bids or progress a transaction, confirmed records will appear here.</p><button type="button" onClick={() => onNavigate(filter === 'selling' ? 'my-vehicles' : filter === 'transactions' ? 'deals' : filter === 'auctions' ? 'auctions' : 'buying')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0A3340] px-4 text-xs font-bold text-white">Open {filter === 'selling' ? 'My Vehicles' : filter === 'transactions' ? 'Deals & escrow' : filter === 'auctions' ? 'Auctions' : 'Buying'} <ArrowUpRight size={14}/></button></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F6FAF9] p-3"><p className="text-xs text-[#64748B]">This timeline uses confirmed listing, enquiry, offer-event, bid and escrow records. Offer-event detail is loaded for the eight most recently active conversations; open a conversation in Buying or Seller enquiries for its complete offer history.</p><button type="button" onClick={() => onNavigate('messages')} className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[#12576D] hover:underline">Open messages <ArrowUpRight size={13}/></button></div>
    </section>
  );
}
