import type { CommandCentreData } from '../CommandCentrePanel';

/** Pure, unit-tested derivations for the Dealer Command Centre overview. Nothing here invents a figure: missing data stays missing. */
export type PeriodDays = 7 | 30 | 90;
export const PERIOD_OPTIONS: Array<{ days: PeriodDays; label: string }> = [
  { days: 7, label: 'Last 7 days' }, { days: 30, label: 'Last 30 days' }, { days: 90, label: 'Last 90 days' },
];

export type TrendBucket = { start: string; end: string; sold: number; revenue: number };
export type Period = {
  days: number; from: string; to: string;
  inventory?: { added: number; addedPrevious: number };
  leads?: { received: number; previousReceived: number };
  sales?: { count: number; revenue: number; previousCount: number; previousRevenue: number; trend: TrendBucket[]; recent: Array<{ id: string; car: string; title: string | null; amount: number; releasedAt: string }> };
  payouts?: { amount: number; previousAmount: number; count: number };
};
export type Health = {
  published: number;
  inventoryQuality: { percent: number | null; of: number };
  listingPerformance: { percent: number | null; of: number };
  leadResponse: { percent: number | null; unavailableReason?: string };
};
export type OverviewData = CommandCentreData & { period?: Period; health?: Health; pipeline?: Record<string, number>; leadCounts?: Record<string, number> };

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const fmtKes = (n: number | null | undefined) => (isNum(n) ? `KES ${Math.round(n).toLocaleString('en-KE')}` : '—');
/** 2,450,000 → 2.5M · 950,000 → 950K · 1,200 → 1.2K (axis labels only). */
export const fmtCompact = (n: number) => {
  const a = Math.abs(n);
  const r = (x: number) => String(Math.round(x * 10) / 10).replace(/\.0$/, '');
  return a >= 1_000_000 ? `${r(n / 1_000_000)}M` : a >= 1_000 ? `${r(n / 1_000)}K` : String(Math.round(n));
};

export type Delta = { direction: 'up' | 'down' | 'flat'; text: string; label: string };
/**
 * Trend indicator. A percentage is shown only when a valid comparison exists (previous > 0); with no previous figure the change is
 * shown without a percentage; with no data at all: null (no indicator).
 */
export function delta(current: number | null | undefined, previous: number | null | undefined, opts: { money?: boolean } = {}): Delta | null {
  if (!isNum(current) || !isNum(previous)) return null;
  const diff = current - previous;
  const direction: Delta['direction'] = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const word = direction === 'flat' ? 'No change' : direction === 'up' ? 'Up' : 'Down';
  if (opts.money) {
    if (previous <= 0) return current > 0 ? { direction: 'up', text: 'New', label: 'No earlier figure to compare with' } : null;
    const p = Math.round((Math.abs(diff) / previous) * 100);
    return { direction, text: `${sign}${p}%`, label: `${word} ${p}% on the previous period` };
  }
  const abs = Math.abs(diff);
  const pct = previous > 0 ? ` (${Math.round((abs / previous) * 100)}%)` : '';
  return { direction, text: `${sign}${abs}${pct}`, label: `${word} ${abs} on the previous period` };
}

export type DonutSegment = { key: string; label: string; count: number; percent: number; color: string };
export const STATUS_COLORS: Record<string, string> = { published: '#0A9F78', pending: '#F5B82E', sold: '#8B5CF6', draft: '#94A3B8', paused: '#5B7C99', reserved: '#2E90FA' };
/** Distribution of the dealer's own listings by status. Segments with 0 are dropped; percentages are whole numbers of the total. */
export function inventorySegments(l: NonNullable<CommandCentreData['listings']> | undefined): { total: number; segments: DonutSegment[] } {
  if (!l) return { total: 0, segments: [] };
  const rows: Array<[string, string, number]> = [
    ['published', 'Published', l.active], ['pending', 'Pending Review', l.pendingApproval], ['sold', 'Sold', l.sold], ['draft', 'Draft', l.draft],
    ['paused', 'Paused', l.hidden], ['reserved', 'Reserved', l.reserved],
  ];
  const total = rows.reduce((s, r) => s + (isNum(r[2]) ? r[2] : 0), 0);
  const segments = rows.filter((r) => isNum(r[2]) && r[2] > 0).map(([key, label, count]) => ({ key, label, count, percent: total ? Math.round((count / total) * 100) : 0, color: STATUS_COLORS[key] }));
  return { total, segments };
}

/** Round a maximum up to a "nice" axis ceiling and return evenly spaced ticks (0..max). */
export function niceTicks(max: number, steps = 5): { max: number; ticks: number[] } {
  if (!isNum(max) || max <= 0) return { max: steps, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const raw = max / steps; const pow = 10 ** Math.floor(Math.log10(raw)); const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const top = step * Math.ceil(max / step);
  const n = Math.round(top / step);
  return { max: top, ticks: Array.from({ length: n + 1 }, (_, i) => Math.round(i * step * 1000) / 1000) };
}

export type HealthRow = { id: string; label: string; percent: number | null; display: string; detail: string };
/** Business-health rows. `verification` is the existing verification-status stage (approved / in review / unavailable). */
export function healthRows(health: Health | undefined, verification: 'approved' | 'review' | 'unknown'): HealthRow[] {
  const pct = (v: number | null | undefined, of: number | undefined, what: string) => ({ percent: isNum(v) ? v : null, display: isNum(v) ? `${v}%` : '—', detail: isNum(v) ? `${what} (${of} published)` : `${what}: no published listings yet` });
  return [
    { id: 'inventory-quality', label: 'Inventory quality', ...pct(health?.inventoryQuality.percent, health?.inventoryQuality.of, 'Published listings with a price and at least one photo') },
    { id: 'lead-response', label: 'Lead response (≤ 2 hrs)', percent: null, display: '—', detail: health?.leadResponse.unavailableReason || 'Lead response times are not recorded yet.' },
    { id: 'listing-performance', label: 'Listing performance', ...pct(health?.listingPerformance.percent, health?.listingPerformance.of, 'Published listings viewed at least once') },
    verification === 'approved' ? { id: 'account-compliance', label: 'Account compliance', percent: 100, display: '100%', detail: 'Dealership verification is approved.' }
      : verification === 'review' ? { id: 'account-compliance', label: 'Account compliance', percent: null, display: 'In review', detail: 'Verification is in progress.' }
      : { id: 'account-compliance', label: 'Account compliance', percent: null, display: '—', detail: 'Verification status is unavailable right now.' },
  ];
}

/** "27 Oct"-style short label for an ISO date (Africa/Nairobi calendar day). */
export const shortDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }); };
