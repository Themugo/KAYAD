import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Gavel, UserCog, Car, Wallet } from 'lucide-react';

/**
 * Dealer command centre (overview). Renders ONLY what the server returned for this member's role; a missing section is never
 * guessed or filled. Definitions of every money figure: reports/DEALER-FINANCIAL-DEFINITIONS.md.
 */
export type CommandCentreData = {
  access?: { owner?: boolean };
  listings?: { total: number; active: number; pendingApproval: number; draft: number; sold: number; hidden: number; reserved: number };
  leads?: { totalLeads: number; newEnquiries: number; unansweredLeads: number; offersAwaitingDecision: number };
  financial?: {
    releasedRevenue?: { amount: number; count: number };
    grossSales?: { amount: number; count: number };
    platformFees?: { amount: number };
    escrowHeld?: { amount: number; gross: number; count: number };
    escrowDisputed?: { amount: number; count: number };
    pendingSettlement?: { amount: number; offerSettlements: { count: number }; auctionOutcomes: { count: number } };
    pendingPayout?: { amount: number; count: number; notRequested: { count: number }; inProgress: { count: number }; failed: { count: number } };
    completedPayout?: { amount: number; count: number };
    refunds?: { amount: number; count: number; openCount: number };
    outstandingReceivables?: { amount: number };
    transactionVolume?: { count: number; gross: number };
  };
  auctions?: { active: number; upcoming: number; completed: number; validBids: number; live: Array<{ id: string; title: string; auctionEnd: string | null; validBids: number; highestValidBid: number | null }>; upcomingList: Array<{ id: string; title: string; auctionEnd: string | null }>; outcomesRequiringAttention: number };
  team?: { outstandingInvitations: number; expiredInvitations: number; activeMembers: number; invitations: Array<{ id: string; email: string; role: string }>; changes: Array<{ id: string; message: string; at: string }>; activity: Array<{ id: string; message: string; at: string }> };
  /** A delegated member's OWN recent authorised activity (never other members'). */
  myActivity?: Array<{ id: string; action: string; at: string }>;
  attention?: Array<{ id: string; label: string; count: number; severity: 'critical' | 'warning' | 'info'; target: { section: string }; detail?: string }>;
  truncated?: string[];
  /** Source tables the connected database does not have yet; the figures that depend on them are hidden, never shown as zero. */
  unavailable?: string[];
  generatedAt?: string;
};

const ksh = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? `Ksh ${n.toLocaleString('en-KE')}` : '—');
const when = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }); };
const endsIn = (iso?: string | null) => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now(); if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'ending';
  const h = Math.floor(ms / 3600000); return h >= 48 ? `${Math.floor(h / 24)} days left` : h >= 1 ? `${h} h left` : `${Math.max(1, Math.floor(ms / 60000))} min left`;
};
const SEVERITY: Record<string, string> = { critical: 'border-[#FDA29B] bg-[#FEF3F2] text-[#7A271A]', warning: 'border-[#FEDF89] bg-[#FFFAEB] text-[#7A2E0E]', info: 'border-[#B8DDD8] bg-[#EEF8F6] text-[#0A3340]' };
const SEVERITY_LABEL: Record<string, string> = { critical: 'Urgent', warning: 'Soon', info: 'New' };

type Props = { data: CommandCentreData | null; loading: boolean; unavailable?: boolean; onOpen: (section: string) => void; onRetry?: () => void };

const Tile = ({ label, value, hint, onClick, testId }: { label: string; value: React.ReactNode; hint?: string; onClick?: () => void; testId?: string }) => {
  const inner = (<><p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-1 break-words text-lg font-bold leading-tight text-[#0A3340] sm:text-xl">{value}</p>{hint && <p className="mt-0.5 text-xs text-[#475569]">{hint}</p>}</>);
  const cls = 'rounded-xl border border-[#D7E7E4] bg-white p-3 text-left sm:p-4';
  return onClick
    ? <button type="button" data-testid={testId} onClick={onClick} className={`${cls} w-full hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]`}>{inner}</button>
    : <div data-testid={testId} className={cls}>{inner}</div>;
};

const Section = ({ id, title, icon: Icon, action, children }: { id: string; title: string; icon: React.ElementType; action?: { label: string; onClick: () => void }; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 id={id} className="flex items-center gap-2 font-bold text-[#0A3340]"><Icon className="h-4 w-4 text-[#176B87]" aria-hidden="true" />{title}</h3>
      {action && <button type="button" onClick={action.onClick} className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-semibold text-[#176B87] hover:text-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]">{action.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
    </div>
    {children}
  </section>
);

export default function CommandCentrePanel({ data, loading, unavailable, onOpen, onRetry }: Props) {
  if (loading) {
    return <div className="mb-5 space-y-3" role="status" aria-label="Loading command centre" data-testid="command-centre-loading">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#E1EDEB]" />)}</div>;
  }
  if (!data) {
    if (!unavailable) return null;
    return (
      <p role="status" data-testid="command-centre-unavailable" className="mb-5 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 text-sm text-[#475569]">
        The command centre could not be loaded right now. Your other dealer sections still work.{onRetry && <button type="button" onClick={onRetry} className="ml-2 font-semibold text-[#176B87] underline">Try again</button>}
      </p>
    );
  }
  const { listings, leads, financial, auctions, team, attention = [] } = data;
  const owner = data.access?.owner === true;
  const missing = new Set(data.unavailable || []);
  const nothing = !listings && !leads && !financial && !auctions && !team;
  return (
    <div className="mb-5 space-y-4 sm:mb-6" data-testid="command-centre">
      {missing.size > 0 && <p role="status" className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3 text-sm text-[#7A2E0E]" data-testid="command-centre-partial">Some figures are not available yet because part of the data service is still being set up ({[...missing].join(', ').replace(/_/g, ' ')}). Those figures are hidden rather than shown as zero.</p>}
      {data.truncated && data.truncated.length > 0 && <p role="status" className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3 text-sm text-[#7A2E0E]" data-testid="command-centre-truncated">Very large history: some figures may be incomplete ({data.truncated.join(', ')}). Contact support to reconcile.</p>}
      {nothing && <p className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 text-sm text-[#475569]">Your role has no dashboard sections. Ask the dealership owner for access.</p>}

      {!nothing && (
        <Section id="cc-attention" title="Needs your attention" icon={AlertCircle}>
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-white p-3 text-sm text-[#475569]" data-testid="attention-empty"><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />Nothing needs your attention right now.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2" data-testid="attention-queue">
              {attention.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpen(item.target.section)} data-testid={`attention-${item.id}`} className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87] ${SEVERITY[item.severity]}`}>
                    <span className="text-xl font-black" aria-hidden="true">{item.count}</span>
                    <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{item.label}</span>{item.detail && <span className="block text-xs opacity-80">{item.detail}</span>}<span className="sr-only">. {item.count} item{item.count === 1 ? '' : 's'}, {SEVERITY_LABEL[item.severity]}. Opens {item.target.section}.</span></span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {(listings || leads || auctions) && (
        <Section id="cc-business" title="Business overview" icon={Car}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {listings && <><Tile testId="tile-active" label="Active listings" value={listings.active} onClick={() => onOpen('inventory')} />
              <Tile testId="tile-pending" label="Under review" value={listings.pendingApproval} onClick={() => onOpen('inventory')} />
              <Tile testId="tile-draft" label="Draft listings" value={listings.draft} onClick={() => onOpen('inventory')} />
              <Tile testId="tile-sold" label="Sold vehicles" value={listings.sold} onClick={() => onOpen('inventory')} /></>}
            {leads && <><Tile testId="tile-enquiries" label="New enquiries" value={leads.newEnquiries} onClick={() => onOpen('leads')} />
              {!missing.has('offers') && <Tile testId="tile-offers" label="Open offers" value={leads.offersAwaitingDecision} hint="Waiting for your decision" onClick={() => onOpen('leads')} />}</>}
            {auctions && <><Tile testId="tile-auctions-active" label="Active auctions" value={auctions.active} onClick={() => onOpen('auctions')} />
              <Tile testId="tile-auctions-done" label="Completed auctions" value={auctions.completed} onClick={() => onOpen('auctions')} /></>}
          </div>
        </Section>
      )}

      {financial && (
        <Section id="cc-financial" title="Financial overview" icon={Wallet} action={owner ? { label: 'Banking & payouts', onClick: () => onOpen('banking') } : undefined}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {financial.releasedRevenue && <Tile testId="fin-revenue" label="Released sales revenue" value={ksh(financial.releasedRevenue.amount)} hint={`${financial.releasedRevenue.count} sale${financial.releasedRevenue.count === 1 ? '' : 's'}, after platform fees`} />}
            {financial.escrowHeld && <Tile testId="fin-escrow" label="Pending escrow" value={ksh(financial.escrowHeld.amount)} hint={`${financial.escrowHeld.count} deal${financial.escrowHeld.count === 1 ? '' : 's'} held, not yet revenue`} onClick={() => onOpen('escrow')} />}
            {financial.pendingPayout && <Tile testId="fin-pending-payout" label="Pending payouts" value={ksh(financial.pendingPayout.amount)} hint={`${financial.pendingPayout.count} released sale${financial.pendingPayout.count === 1 ? '' : 's'} not yet paid out`} onClick={() => onOpen('banking')} />}
            {financial.completedPayout && <Tile testId="fin-completed-payout" label="Completed payouts" value={ksh(financial.completedPayout.amount)} hint={`${financial.completedPayout.count} paid`} onClick={() => onOpen('banking')} />}
            {financial.refunds && <Tile testId="fin-refunds" label="Refunds" value={ksh(financial.refunds.amount)} hint={financial.refunds.openCount ? `${financial.refunds.openCount} in progress` : `${financial.refunds.count} completed`} onClick={() => onOpen('escrow')} />}
            {financial.platformFees && <Tile testId="fin-fees" label="Platform fees" value={ksh(financial.platformFees.amount)} hint="Deducted from released sales" />}
          </div>
          {owner && financial.pendingSettlement && !(missing.has('settlements') || missing.has('auction_outcomes')) && (
            <p className="mt-3 text-xs text-[#475569]" data-testid="fin-pending-settlement">Awaiting buyer payment: {ksh(financial.pendingSettlement.amount)} ({financial.pendingSettlement.offerSettlements.count} accepted offer{financial.pendingSettlement.offerSettlements.count === 1 ? '' : 's'}, {financial.pendingSettlement.auctionOutcomes.count} auction result{financial.pendingSettlement.auctionOutcomes.count === 1 ? '' : 's'}). Not counted as revenue.</p>
          )}
          <details className="mt-3 rounded-lg bg-white p-3 text-xs text-[#475569]">
            <summary className="cursor-pointer font-semibold text-[#176B87]">How these figures are calculated</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li><strong>Released sales revenue</strong>: your share of sales whose escrow has been released, after platform fees. Held escrow, enquiries, offers and listing prices are never counted.</li>
              <li><strong>Pending escrow</strong>: buyer money held in escrow for your sales that has not been released yet.</li>
              <li><strong>Pending payouts</strong>: released sales that have not been paid to you yet.</li>
              <li><strong>Completed payouts</strong>: payouts confirmed as paid.</li>
              <li><strong>Refunds</strong>: completed refunds on your escrow sales. <strong>Platform fees</strong>: the fee taken from released sales.</li>
            </ul>
          </details>
        </Section>
      )}

      {auctions && (
        <Section id="cc-auctions" title="Auction performance" icon={Gavel} action={{ label: 'Auctions', onClick: () => onOpen('auctions') }}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile label="Active" value={auctions.active} /><Tile label="Upcoming" value={auctions.upcoming} /><Tile label="Valid bids (open auctions)" value={auctions.validBids} /><Tile label="Completed" value={auctions.completed} />
          </div>
          {auctions.live.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#E1EDEB] rounded-lg bg-white" data-testid="auction-live-list">
              {auctions.live.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#0A3340]">{a.title}</span>
                  <span className="text-xs text-[#475569]">{a.validBids} valid bid{a.validBids === 1 ? '' : 's'} · highest {a.highestValidBid ? ksh(a.highestValidBid) : 'none yet'} · {endsIn(a.auctionEnd)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#475569]" data-testid="auction-empty">No auctions are live right now.</p>}
          {auctions.outcomesRequiringAttention > 0 && <button type="button" onClick={() => onOpen('auctions')} className="mt-3 min-h-11 rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-3 text-sm font-semibold text-[#7A271A]">{auctions.outcomesRequiringAttention} auction result{auctions.outcomesRequiringAttention === 1 ? '' : 's'} need action</button>}
        </Section>
      )}

      {team && (
        <Section id="cc-team" title="Team activity" icon={UserCog} action={{ label: 'Manage team', onClick: () => onOpen('team') }}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Tile testId="team-active" label="Active members" value={team.activeMembers} /><Tile testId="team-invites" label="Invitations waiting" value={team.outstandingInvitations} hint={team.expiredInvitations ? `${team.expiredInvitations} expired` : undefined} />
          </div>
          {team.changes.length + team.activity.length === 0 ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#475569]" data-testid="team-empty">No team changes yet.</p> : (
            <ul className="mt-3 divide-y divide-[#E1EDEB] rounded-lg bg-white" data-testid="team-feed">
              {[...team.changes, ...team.activity].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-[#0A3340]"><span className="min-w-0 flex-1">{x.message}</span><span className="shrink-0 text-xs text-[#64748B]">{when(x.at)}</span></li>
              ))}
            </ul>
          )}
        </Section>
      )}
      <p className="sr-only" aria-live="polite">Command centre updated.</p>
    </div>
  );
}
