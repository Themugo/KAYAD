import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Car, Gavel, MessageSquare, MoreVertical, ReceiptText } from 'lucide-react';
import { ListingStatusBadge, ListingThumb } from '../../../../components/listing/ListingPresentation';
import type { BackendCar } from '../../../../services/vehicleApi';
import type { CommandCentreData } from '../CommandCentrePanel';
import { fmtKes, isNum, shortDate, type Period } from './overviewModel';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type TabId = 'inventory' | 'leads' | 'auctions' | 'sales';
type LeadRow = { id: string; stage?: string; source?: string; lastActivityAt?: string; updatedAt?: string; createdAt?: string; buyer?: { name?: string; email?: string } | null; vehicle?: { title?: string } | null };

type Props = {
  canInventory: boolean; canLeads: boolean; canAuctions: boolean; canSales: boolean;
  listings: BackendCar[]; listingsState: LoadState; onRetryListings: () => void;
  leads: LeadRow[]; leadsState: LoadState; onRetryLeads: () => void;
  auctions?: CommandCentreData['auctions'] & { upcomingList?: Array<{ id: string; title: string; auctionEnd: string | null }> };
  sales?: Period['sales'];
  leadCounts?: Record<string, number>;
  onTab: (tab: TabId) => void; onEdit: (id: string) => void; onOpen: (section: string) => void;
};

const STATUS_LABEL: Record<string, string> = { available: 'Published', active: 'Published', published: 'Published', pending: 'Pending Review', pending_review: 'Pending Review', draft: 'Draft', sold: 'Sold', reserved: 'Reserved', hidden: 'Paused', paused: 'Paused' };
const STAGE_LABEL: Record<string, string> = { new: 'New', contacted: 'Contacted', negotiating: 'Negotiating', inspectionBooked: 'Inspection booked', reserved: 'Reserved', sold: 'Sold', lost: 'Lost' };
const idOf = (c: BackendCar) => String((c as any).id || (c as any)._id);
const rel = (iso?: string) => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : shortDate(iso); };

const RowMenu: React.FC<{ label: string; items: Array<{ label: string; run: () => void }> }> = ({ label, items }) => {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away); return () => document.removeEventListener('mousedown', away);
  }, [open]);
  return (
    <div className="relative" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)} className="dcc-focus inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--dcc-muted)] hover:bg-[#EEF3F6]"><MoreVertical className="h-4 w-4" aria-hidden="true" /></button>
      {open && <div role="menu" className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-xl border border-[var(--dcc-border)] bg-white p-1 shadow-lg">
        {items.map((it) => <button key={it.label} role="menuitem" type="button" onClick={() => { setOpen(false); it.run(); }} className="dcc-focus block min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-[#EEF3F6]">{it.label}</button>)}
      </div>}
    </div>
  );
};

const Skeleton: React.FC<{ label: string }> = ({ label }) => <div role="status" aria-label={label} className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-[#EEF3F6]" />)}</div>;
const ErrorBox: React.FC<{ what: string; onRetry: () => void }> = ({ what, onRetry }) => <div className="m-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#FEF3F2] p-4 text-sm text-[#7A271A]" data-testid="tab-error"><span className="flex-1">{what} could not be loaded.</span><button type="button" onClick={onRetry} className="dcc-btn dcc-focus bg-[var(--dcc-navy)] text-white">Try again</button></div>;
const Empty: React.FC<{ title: string; hint: string }> = ({ title, hint }) => <div className="p-8 text-center text-sm text-[var(--dcc-muted)]" data-testid="tab-empty"><p className="font-semibold text-[var(--dcc-ink)]">{title}</p><p className="mt-1">{hint}</p></div>;
const th = 'px-4 py-2.5 text-left text-xs font-semibold text-[var(--dcc-muted)]';

const RecentActivityTabs: React.FC<Props> = (p) => {
  const tabs = [
    p.canInventory && { id: 'inventory' as TabId, label: 'Recent Inventory', icon: Car, link: 'View all inventory', section: 'inventory' },
    p.canLeads && { id: 'leads' as TabId, label: 'Hot Leads', icon: MessageSquare, link: 'View all leads', section: 'leads' },
    p.canAuctions && { id: 'auctions' as TabId, label: 'Active Auctions', icon: Gavel, link: 'View all auctions', section: 'auctions' },
    p.canSales && { id: 'sales' as TabId, label: 'Recent Sales', icon: ReceiptText, link: 'View escrow', section: 'escrow' },
  ].filter(Boolean) as Array<{ id: TabId; label: string; icon: React.ElementType; link: string; section: string }>;
  const [active, setActive] = useState<TabId | null>(tabs[0]?.id ?? null);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (!current) return null;
  const move = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length; let j = i;
    if (e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else return;
    e.preventDefault(); setActive(tabs[j].id); p.onTab(tabs[j].id); refs.current[tabs[j].id]?.focus();
  };
  const recent = [...p.listings].sort((a, b) => new Date((b as any).created_at || (b as any).createdAt || 0).getTime() - new Date((a as any).created_at || (a as any).createdAt || 0).getTime()).slice(0, 5);
  const hot = [...p.leads].filter((l) => l.stage !== 'sold' && l.stage !== 'lost').sort((a, b) => new Date(b.lastActivityAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.lastActivityAt || a.updatedAt || a.createdAt || 0).getTime()).slice(0, 5);
  const auctionRows = [...(p.auctions?.live || []), ...((p.auctions as any)?.upcomingList || [])].slice(0, 5);

  return (
    <section className="dcc-card overflow-hidden" data-testid="recent-activity" aria-label="Recent activity">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dcc-border)] px-3">
        <div role="tablist" aria-label="Recent activity" className="flex min-w-0 overflow-x-auto">
          {tabs.map((t, i) => { const on = t.id === current.id; const Icon = t.icon; return (
            <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} role="tab" type="button" id={`dcc-tab-${t.id}`} aria-selected={on} aria-controls={`dcc-panel-${t.id}`} tabIndex={on ? 0 : -1}
              onClick={() => { setActive(t.id); p.onTab(t.id); }} onKeyDown={(e) => move(e, i)}
              className={`dcc-focus inline-flex min-h-12 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-semibold ${on ? 'border-[var(--dcc-teal-2)] text-[var(--dcc-ink)]' : 'border-transparent text-[var(--dcc-muted)] hover:text-[var(--dcc-ink)]'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{t.label}</button>); })}
        </div>
        <button type="button" onClick={() => p.onOpen(current.section)} className="dcc-focus inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[var(--dcc-teal-2)] hover:underline">{current.link}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>

      <div role="tabpanel" id={`dcc-panel-${current.id}`} aria-labelledby={`dcc-tab-${current.id}`} tabIndex={0} className="dcc-focus relative overflow-x-auto">
        {current.id === 'inventory' && (p.listingsState === 'error' ? <ErrorBox what="Your inventory" onRetry={p.onRetryListings} />
          : p.listingsState !== 'ready' ? <Skeleton label="Loading recent inventory" />
          : recent.length === 0 ? <Empty title="No vehicles yet" hint="Add your first vehicle and it will appear here." />
          : (<table className="w-full min-w-[640px] text-sm"><caption className="sr-only">Recent inventory</caption>
              <thead><tr className="border-b border-[var(--dcc-border)]"><th scope="col" className={th}>Vehicle</th><th scope="col" className={th}>Make / Model</th><th scope="col" className={th}>Year</th><th scope="col" className={th}>Price (KES)</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Performance</th><th scope="col" className={th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{recent.map((car) => {
                const id = idOf(car); const c: any = car; const img = c.images?.[0];
                const sub = [c.body_type || c.bodyType, [c.engine, c.fuel].filter(Boolean).join(' ')].filter(Boolean).join(' • ') || [c.fuel, c.transmission].filter(Boolean).join(' • ');
                const leads = p.leadCounts ? (p.leadCounts[id] ?? 0) : null; const views = isNum(c.views) ? c.views : null;
                const perf = views === null && leads === null ? '—' : [views !== null ? `${views.toLocaleString('en-KE')} views` : null, leads !== null ? `${leads} ${leads === 1 ? 'lead' : 'leads'}` : null].filter(Boolean).join(' • ');
                return (<tr key={id} className="border-b border-[var(--dcc-border)] last:border-0 hover:bg-[#F8FBFC]">
                  <td className="px-4 py-2"><ListingThumb src={img?.thumb || img?.url} fallback={img?.url} alt={`${car.title}`} className="h-12 w-[72px] rounded-md" /></td>
                  <th scope="row" className="px-4 py-2 text-left font-normal"><span className="block font-bold text-[var(--dcc-ink)]">{[car.brand, car.model].filter(Boolean).join(' ') || car.title}</span>{sub && <span className="block text-xs text-[var(--dcc-muted)]">{sub}</span>}</th>
                  <td className="px-4 py-2 tabular-nums">{car.year || '—'}</td>
                  <td className="px-4 py-2 font-bold tabular-nums">{isNum(car.price) ? car.price.toLocaleString('en-KE') : '—'}</td>
                  <td className="px-4 py-2"><ListingStatusBadge status={car.status} label={STATUS_LABEL[String(car.status || '').toLowerCase()] || String(car.status || 'Draft')} /></td>
                  <td className="px-4 py-2 text-[var(--dcc-muted)]">{perf}</td>
                  <td className="px-2 py-2"><RowMenu label={`Actions for ${car.title}`} items={[{ label: 'Edit vehicle', run: () => p.onEdit(id) }, { label: 'Open inventory', run: () => p.onOpen('inventory') }]} /></td>
                </tr>); })}</tbody></table>))}

        {current.id === 'leads' && (p.leadsState === 'error' ? <ErrorBox what="Your leads" onRetry={p.onRetryLeads} />
          : p.leadsState !== 'ready' ? <Skeleton label="Loading hot leads" />
          : hot.length === 0 ? <Empty title="No open leads" hint="New buyer enquiries will appear here." />
          : (<table className="w-full min-w-[560px] text-sm"><caption className="sr-only">Hot leads</caption>
              <thead><tr className="border-b border-[var(--dcc-border)]"><th scope="col" className={th}>Buyer</th><th scope="col" className={th}>Vehicle</th><th scope="col" className={th}>Stage</th><th scope="col" className={th}>Last activity</th><th scope="col" className={th}><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{hot.map((l) => <tr key={l.id} className="border-b border-[var(--dcc-border)] last:border-0 hover:bg-[#F8FBFC]">
                <th scope="row" className="px-4 py-3 text-left font-normal"><span className="block font-bold">{l.buyer?.name || 'Buyer'}</span>{l.buyer?.email && <span className="block text-xs text-[var(--dcc-muted)]">{l.buyer.email}</span>}</th>
                <td className="px-4 py-3">{l.vehicle?.title || 'Vehicle'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[#E4F7F4] px-2.5 py-1 text-xs font-semibold text-[#0B5F5B]">{STAGE_LABEL[l.stage || 'new'] || l.stage}</span></td>
                <td className="px-4 py-3 text-[var(--dcc-muted)]">{rel(l.lastActivityAt || l.updatedAt || l.createdAt)}</td>
                <td className="px-2 py-3"><button type="button" onClick={() => p.onOpen('leads')} className="dcc-focus min-h-10 rounded-lg px-3 text-sm font-semibold text-[var(--dcc-teal-2)] hover:bg-[#EEF3F6]">Open<span className="sr-only"> lead from {l.buyer?.name || 'buyer'}</span></button></td>
              </tr>)}</tbody></table>))}

        {current.id === 'auctions' && (auctionRows.length === 0 ? <Empty title="No live or upcoming auctions" hint="Auctions you schedule will appear here." />
          : (<table className="w-full min-w-[480px] text-sm"><caption className="sr-only">Active auctions</caption>
              <thead><tr className="border-b border-[var(--dcc-border)]"><th scope="col" className={th}>Vehicle</th><th scope="col" className={th}>Ends</th><th scope="col" className={th}>Valid bids</th><th scope="col" className={th}>Highest bid</th></tr></thead>
              <tbody>{auctionRows.map((a: any) => <tr key={a.id} className="border-b border-[var(--dcc-border)] last:border-0"><th scope="row" className="px-4 py-3 text-left font-bold">{a.title}</th><td className="px-4 py-3 text-[var(--dcc-muted)]">{rel(a.auctionEnd)}</td><td className="px-4 py-3 tabular-nums">{isNum(a.validBids) ? a.validBids : '—'}</td><td className="px-4 py-3 font-bold tabular-nums">{isNum(a.highestValidBid) ? fmtKes(a.highestValidBid) : '—'}</td></tr>)}</tbody></table>))}

        {current.id === 'sales' && (!p.sales || p.sales.recent.length === 0 ? <Empty title="No completed sales in this period" hint="A sale is counted when the buyer's payment has been released to you." />
          : (<table className="w-full min-w-[420px] text-sm"><caption className="sr-only">Recent sales</caption>
              <thead><tr className="border-b border-[var(--dcc-border)]"><th scope="col" className={th}>Vehicle</th><th scope="col" className={th}>Released</th><th scope="col" className={th}>Amount (KES)</th></tr></thead>
              <tbody>{p.sales.recent.map((s) => <tr key={s.id} className="border-b border-[var(--dcc-border)] last:border-0"><th scope="row" className="px-4 py-3 text-left font-bold">{s.title || 'Vehicle sale'}</th><td className="px-4 py-3 text-[var(--dcc-muted)]">{rel(s.releasedAt)}</td><td className="px-4 py-3 font-bold tabular-nums">{s.amount.toLocaleString('en-KE')}</td></tr>)}</tbody></table>))}
      </div>
    </section>
  );
};
export default RecentActivityTabs;
