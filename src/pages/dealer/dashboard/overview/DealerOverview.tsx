import React from 'react';
import { AlertTriangle, BarChart3, Building2, Car, CheckCircle2, ChevronRight, Gavel, Info, Landmark, Minus, MessageSquare, Plus, ShieldCheck, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { BackendCar } from '../../../../services/vehicleApi';
import { DonutChart, SalesTrendChart } from './charts';
import RecentActivityTabs, { type LoadState, type TabId } from './RecentActivityTabs';
import { delta, fmtKes, healthRows, inventorySegments, isNum, type Delta, type OverviewData } from './overviewModel';
import './dealerCommandCentre.css';

type Props = {
  data: OverviewData | null; loading: boolean; days: number;
  verification: 'approved' | 'review' | 'unknown';
  onOpen: (section: string) => void; onAdd: () => void; onEdit: (id: string) => void;
  listings: BackendCar[]; listingsState: LoadState; onRetryListings: () => void;
  leads: Array<Record<string, any>>; leadsState: LoadState; onRetryLeads: () => void; onTab: (t: TabId) => void;
  /** Hero photo (an existing site asset). */
  heroImage?: string;
};

const Trend: React.FC<{ d: Delta | null; testId?: string }> = ({ d, testId }) => {
  if (!d) return null;
  const Icon = d.direction === 'up' ? TrendingUp : d.direction === 'down' ? TrendingDown : Minus;
  const tone = d.direction === 'up' ? 'border-[#BFE8D2] bg-[#EAF8F0] text-[#0F7A4A]' : d.direction === 'down' ? 'border-[#F6C8C3] bg-[#FEF0EE] text-[#B42318]' : 'border-[#DDE5EA] bg-[#F1F5F8] text-[var(--dcc-muted)]';
  return <span data-testid={testId} title={d.label} aria-label={d.label} className={`ml-auto inline-flex shrink-0 items-center gap-1 self-end rounded-lg border px-2 py-0.5 text-xs font-bold ${tone}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{d.text}</span>;
};

const Kpi: React.FC<{ id: string; icon: React.ElementType; label: string; value: React.ReactNode; trend: Delta | null; loading: boolean; onOpen?: () => void; openLabel?: string }> = ({ id, icon: Icon, label, value, trend, loading, onOpen, openLabel }) => {
  const body = (
    <>
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E4F7F4] text-[var(--dcc-teal-2)]"><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1 text-left"><span className="block text-[13px] font-medium text-[var(--dcc-muted)]">{label}</span>
        {loading ? <span role="status" aria-label={`Loading ${label}`} className="mt-1 block h-7 w-20 animate-pulse rounded bg-[#EEF3F6]" /> : <span className="block break-words text-2xl font-extrabold leading-tight text-[var(--dcc-ink)]" data-testid={`kpi-${id}-value`}>{value}</span>}</span>
      {!loading && <Trend d={trend} testId={`kpi-${id}-trend`} />}
    </>
  );
  const cls = 'dcc-card flex min-h-[78px] items-center gap-3 px-4 py-3';
  return onOpen
    ? <button type="button" onClick={onOpen} aria-label={`${openLabel}: ${label}`} data-testid={`kpi-${id}`} className={`${cls} dcc-focus w-full text-left hover:border-[#B9D3CF]`}>{body}</button>
    : <div data-testid={`kpi-${id}`} className={cls}>{body}</div>;
};

const ATT_ICON: Record<string, React.ElementType> = { inventory: Car, leads: MessageSquare, auctions: Gavel, banking: Landmark, escrow: ShieldCheck, team: Building2 };
const SEV_DOT: Record<string, string> = { critical: 'text-[#D92D20]', warning: 'text-[#D92D20]', info: 'text-[#D92D20]' };

const DealerOverview: React.FC<Props> = (p) => {
  const d = p.data; const known = !!d;
  const canLeads = !known || !!d?.leads; const canAuctions = !known || !!d?.auctions; const canFinance = !known || !!d?.period?.payouts;
  const inv = inventorySegments(d?.listings);
  const sales = d?.period?.sales; const days = p.days;
  const activeStages = d?.pipeline ? ['new', 'contacted', 'negotiating', 'inspectionBooked', 'reserved'].reduce((s, k) => s + (isNum((d.pipeline as any)[k]) ? (d.pipeline as any)[k] : 0), 0) : null;
  const added = d?.period?.inventory?.added; const total = d?.listings?.total;
  const invTrend: Delta | null = isNum(added) && isNum(total)
    ? (added > 0 ? { direction: 'up', text: `+${added}${total - added > 0 ? ` (${Math.round((added / (total - added)) * 100)}%)` : ''}`, label: `${added} ${added === 1 ? 'vehicle' : 'vehicles'} added in the last ${days} days` } : { direction: 'flat', text: '0', label: `No vehicles added in the last ${days} days` }) : null;
  const health = healthRows(d?.health, p.verification);
  const attention = (d?.attention || []).slice(0, 6);
  const summary = (l: NonNullable<OverviewData['listings']>) => `${l.active} published, ${l.pendingApproval} pending review, ${l.sold} sold, ${l.draft} draft`;
  return (
    <div className="dcc space-y-4" data-testid="dealer-command-overview">
      {/* HERO */}
      <section aria-label="Dealership command centre" data-testid="dealer-command-banner" className="dcc-hero px-6 py-5 sm:px-8 sm:py-6">
        <div aria-hidden="true" className="dcc-hero-slash" />
        <div aria-hidden="true" className="dcc-hero-photo" style={{ backgroundImage: `url('${p.heroImage || '/hero/kayad-land-cruiser-cutout.png'}')`, backgroundSize: 'contain', backgroundPosition: 'right 3% center' }} />
        <div className="dcc-hero-copy">
          <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--dcc-teal)]">KAYARD KE · Dealer account</p>
          <h2 className="mt-1 text-[26px] font-extrabold leading-tight sm:text-[30px]">Run your dealership from one place</h2>
          <p className="mt-1 text-sm text-white/85">Inventory, enquiries, auctions, payouts and your team — all secure and connected.</p>
          <div className="mt-4 flex flex-wrap gap-2" data-testid="hero-actions">
            <button type="button" onClick={p.onAdd} className="dcc-btn dcc-btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />Add a vehicle</button>
            <button type="button" onClick={() => p.onOpen('inventory')} className="dcc-btn dcc-btn-ghost"><Car className="h-4 w-4" aria-hidden="true" />Manage Inventory</button>
            {canLeads && <button type="button" onClick={() => p.onOpen('leads')} className="dcc-btn dcc-btn-ghost"><MessageSquare className="h-4 w-4" aria-hidden="true" />View Leads</button>}
            {canAuctions && <button type="button" onClick={() => p.onOpen('auctions')} className="dcc-btn dcc-btn-ghost"><Gavel className="h-4 w-4" aria-hidden="true" />Auctions</button>}
            {canFinance && <button type="button" onClick={() => p.onOpen('banking')} className="dcc-btn dcc-btn-ghost"><Landmark className="h-4 w-4" aria-hidden="true" />Payouts</button>}
          </div>
        </div>
      </section>

      {/* KPI ROW */}
      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-4" data-testid="kpi-row">
        <Kpi id="inventory" icon={Car} label="Total Inventory" loading={p.loading} value={d?.listings ? d.listings.total : '—'} trend={invTrend} onOpen={() => p.onOpen('inventory')} openLabel="Open inventory" />
        {canLeads && <Kpi id="leads" icon={MessageSquare} label="Active Leads" loading={p.loading} value={activeStages ?? (d?.leads ? d.leads.totalLeads : '—')} trend={delta(d?.period?.leads?.received, d?.period?.leads?.previousReceived)} onOpen={() => p.onOpen('leads')} openLabel="Open leads" />}
        {(!known || !!sales) && <Kpi id="sales" icon={BarChart3} label={`Sales (${days} days)`} loading={p.loading} value={sales ? sales.count : '—'} trend={delta(sales?.count, sales?.previousCount)} />}
        {canFinance && <Kpi id="payouts" icon={Wallet} label={`Payouts (${days} days)`} loading={p.loading} value={d?.period?.payouts ? fmtKes(d.period.payouts.amount) : '—'} trend={delta(d?.period?.payouts?.amount, d?.period?.payouts?.previousAmount, { money: true })} onOpen={() => p.onOpen('banking')} openLabel="Open payouts" />}
      </section>

      {/* ANALYTICS ROW */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,30fr)_minmax(0,40fr)_minmax(0,30fr)]">
        <section aria-labelledby="dcc-inv-title" className="dcc-card p-5" data-testid="inventory-overview">
          <h3 id="dcc-inv-title" className="text-[17px] font-bold leading-tight">Inventory Overview</h3><p className="text-xs text-[var(--dcc-muted)]">By status</p>
          {p.loading ? <div role="status" aria-label="Loading inventory overview" className="mt-4 h-36 animate-pulse rounded-xl bg-[#EEF3F6]" />
            : !d?.listings ? <p className="mt-6 text-sm text-[var(--dcc-muted)]">Inventory figures are not available for your role.</p>
            : inv.total === 0 ? <div className="mt-6 text-center text-sm text-[var(--dcc-muted)]" data-testid="inventory-empty"><p className="font-semibold text-[var(--dcc-ink)]">No vehicles yet</p><p className="mt-1">Add a vehicle to see your inventory mix.</p></div>
            : (
              <div className="mt-3 flex flex-wrap items-center gap-5">
                <DonutChart total={inv.total} segments={inv.segments} />
                <ul className="min-w-[150px] flex-1 space-y-2.5 text-sm" aria-label={`Inventory by status: ${summary(d.listings)}`}>
                  {inv.segments.map((s) => <li key={s.key} className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="tabular-nums"><strong>{s.count}</strong> <span className="text-[var(--dcc-muted)]">({s.percent}%)</span></span></li>)}
                </ul>
              </div>
            )}
        </section>

        <section aria-labelledby="dcc-sales-title" className="dcc-card p-5" data-testid="sales-trend">
          <h3 id="dcc-sales-title" className="text-[17px] font-bold leading-tight">Sales Trend</h3><p className="text-xs text-[var(--dcc-muted)]">Vehicles sold and revenue · last {days} days</p>
          {p.loading ? <div role="status" aria-label="Loading sales trend" className="mt-4 h-40 animate-pulse rounded-xl bg-[#EEF3F6]" />
            : !sales ? <p className="mt-6 text-sm text-[var(--dcc-muted)]" data-testid="sales-unavailable">Sales figures are not available for your role.</p>
            : sales.count === 0 ? <div className="mt-6 text-center text-sm text-[var(--dcc-muted)]" data-testid="sales-empty"><p className="font-semibold text-[var(--dcc-ink)]">No completed sales in this period</p><p className="mt-1">A sale is counted when the buyer's payment has been released to you.</p></div>
            : <div className="mt-2"><SalesTrendChart trend={sales.trend} /></div>}
        </section>

        <section aria-labelledby="dcc-att-title" className="rounded-[var(--dcc-radius)] border border-[#F4C7C3] bg-[#FEF6F5] p-5 lg:col-span-2 xl:col-span-1" data-testid="dealer-needs-attention">
          <h3 id="dcc-att-title" className="flex items-center gap-2 text-[17px] font-bold text-[#B42318]"><AlertTriangle className="h-5 w-5" aria-hidden="true" />Needs your attention</h3>
          {p.loading ? <div role="status" aria-label="Loading actions" className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/70" />)}</div>
            : !d ? <p className="mt-4 text-sm text-[var(--dcc-muted)]">Actions are unavailable until your figures load.</p>
            : attention.length === 0 ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-[#0F7A4A]" data-testid="attention-empty"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />You're all caught up. Nothing needs your attention.</p>
            : <ul className="mt-3 space-y-1.5" data-testid="attention-queue">{attention.map((it) => { const Icon = ATT_ICON[it.target.section] || Info; return (
                <li key={it.id}><button type="button" onClick={() => p.onOpen(it.target.section)} className="dcc-focus flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-white px-3 py-2 text-left text-sm hover:shadow-sm" data-testid={`attention-${it.id}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${SEV_DOT[it.severity] || ''}`} aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="font-bold">{it.count}</strong> {it.label}</span><ChevronRight className="h-4 w-4 shrink-0 text-[var(--dcc-muted)]" aria-hidden="true" /></button></li>
              ); })}</ul>}
        </section>
      </div>

      {/* ACTIVITY + HEALTH */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <RecentActivityTabs canInventory={!known || !!d?.listings} canLeads={canLeads} canAuctions={canAuctions} canSales={!known || !!sales}
          listings={p.listings} listingsState={p.listingsState} onRetryListings={p.onRetryListings} leads={p.leads as any} leadsState={p.leadsState} onRetryLeads={p.onRetryLeads}
          auctions={d?.auctions} sales={sales} leadCounts={d?.leadCounts} onTab={p.onTab} onEdit={p.onEdit} onOpen={p.onOpen} />
        <section aria-labelledby="dcc-health-title" className="dcc-card self-start p-5" data-testid="business-health">
          <h3 id="dcc-health-title" className="flex items-center gap-2 text-[17px] font-bold">Business health
            <span tabIndex={0} role="img" aria-label="How each indicator is calculated: inventory quality is the share of published listings with a price and a photo; listing performance is the share of published listings viewed at least once; lead response is not recorded yet; account compliance reflects dealership verification." title="Inventory quality: published listings with a price and a photo. Listing performance: published listings viewed at least once. Lead response: not recorded yet. Account compliance: dealership verification." className="dcc-focus inline-flex rounded-full text-[var(--dcc-muted)]"><Info className="h-4 w-4" aria-hidden="true" /></span></h3>
          {p.loading ? <div role="status" aria-label="Loading business health" className="mt-4 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-[#EEF3F6]" />)}</div> : (
            <ul className="mt-4 space-y-4">{health.map((h) => (
              <li key={h.id} data-testid={`health-${h.id}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{h.label}</span><span className="font-bold tabular-nums">{h.display}</span></div>
                <div role="progressbar" aria-label={h.label} aria-valuemin={0} aria-valuemax={100} {...(h.percent != null ? { 'aria-valuenow': h.percent } : {})} aria-valuetext={h.percent != null ? `${h.percent}%` : h.display === '—' ? 'Unavailable' : h.display} className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E6EEF1]">
                  {h.percent != null && <div className="h-full rounded-full bg-[#0A9F78]" style={{ width: `${h.percent}%` }} />}
                </div>
                <p className="mt-1 text-xs text-[var(--dcc-muted)]">{h.detail}</p>
              </li>))}</ul>)}
        </section>
      </div>
    </div>
  );
};
export default DealerOverview;
