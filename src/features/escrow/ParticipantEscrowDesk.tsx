import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, Loader2, RefreshCw } from 'lucide-react';
import {
  EscrowApiError, confirmDelivery, confirmVehicle, disputeEscrow, getFundingInstructions, getMyEscrowOverview, requestRelease,
  type BackendEscrow, type EscrowParticipantSummary, type EscrowPartyAction, type FundingInstructions,
} from '../../services/escrowApi';
import { ACTION_LABEL, DISPUTE_STATUS_LABEL, STATUS_LABEL, STATUS_TONE, formatDate, formatKes, storyFor, timelineFor, type Tone } from './escrowModel';
import ActionDialog from './ActionDialog';
import EvidenceUpload from '../../components/EvidenceUpload';

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string; kind: EscrowApiError['kind'] | 'unknown' }
  | { status: 'ready'; deals: BackendEscrow[]; summary: EscrowParticipantSummary | null };

type Filter = 'all' | 'needs_action' | 'in_progress' | 'settled';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-[#EEF7F5] text-[#12576D] border-[#D7E7E4]',
  progress: 'bg-[#F3FAF9] text-[#0E4655] border-[#D7E7E4]',
  attention: 'bg-[#F3FAF9] text-[#0A3340] border-[#BDE5DE]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'needs_action', label: 'Needs your action' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'settled', label: 'Settled' },
];

const needsAction = (d: BackendEscrow) =>
  (d.availableActions || []).some((a) => a !== 'open_dispute' && a !== 'view_funding_instructions') ||
  (d.status === 'pending' && d.viewerRole === 'buyer');
const settled = (d: BackendEscrow) => ['released', 'refunded', 'closed'].includes(d.status);

const errorText = (err: unknown): { message: string; kind: EscrowApiError['kind'] | 'unknown' } => {
  if (err instanceof EscrowApiError) {
    if (err.kind === 'unauthenticated') return { kind: err.kind, message: 'Your session has ended. Sign in again to see your deals.' };
    if (err.kind === 'forbidden') return { kind: err.kind, message: 'You do not have access to this.' };
    if (err.kind === 'network') return { kind: err.kind, message: 'We could not reach KAYAD. Check your connection and try again.' };
    return { kind: err.kind, message: err.message || 'Something went wrong.' };
  }
  return { kind: 'unknown', message: 'Something went wrong.' };
};

const SummaryCard: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-[#D7E7E4] bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
    <p className="mt-1 text-xl font-semibold text-[#0A3340]">{value}</p>
    {hint && <p className="mt-1 text-xs text-[#64748B]">{hint}</p>}
  </div>
);

const SummarySkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true" data-testid="escrow-summary-skeleton">
    {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-[#D7E7E4] bg-[#EEF7F5] motion-safe:animate-pulse" />)}
  </div>
);

interface Props {
  initialEscrowId?: string | null;
  onNavigate?: (nav: string) => void;
}

export const ParticipantEscrowDesk: React.FC<Props> = ({ initialEscrowId = null, onNavigate }) => {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialEscrowId);
  const [funding, setFunding] = useState<{ id: string; state: 'loading' | 'error' | 'ready'; data?: FundingInstructions; message?: string } | null>(null);
  const [pending, setPending] = useState<EscrowPartyAction | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoad({ status: 'loading' });
    try {
      const { escrows, summary } = await getMyEscrowOverview();
      setLoad({ status: 'ready', deals: escrows, summary });
    } catch (err) {
      const e = errorText(err);
      setLoad({ status: 'error', message: e.message, kind: e.kind });
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const deals = load.status === 'ready' ? load.deals : [];
  const visible = useMemo(() => deals.filter((d) => {
    if (filter === 'needs_action') return needsAction(d);
    if (filter === 'settled') return settled(d);
    if (filter === 'in_progress') return !settled(d);
    return true;
  }), [deals, filter]);
  const selected = deals.find((d) => d.id === selectedId) || null;
  const unknownLink = load.status === 'ready' && selectedId !== null && !selected;

  const select = (id: string | null) => {
    setSelectedId(id); setFunding(null); setNotice(null); setActionError(null);
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('escrowId', id); else url.searchParams.delete('escrowId');
      window.history.replaceState(null, '', url.toString());
    } catch { /* non-browser */ }
  };

  const loadFunding = async (id: string) => {
    setFunding({ id, state: 'loading' });
    try { setFunding({ id, state: 'ready', data: await getFundingInstructions(id) }); }
    catch (err) { setFunding({ id, state: 'error', message: errorText(err).message }); }
  };

  const runAction = async () => {
    if (!selected || !pending) return;
    setBusy(true); setActionError(null);
    try {
      if (pending === 'confirm_vehicle') await confirmVehicle(selected.id);
      else if (pending === 'confirm_delivery') await confirmDelivery(selected.id);
      else if (pending === 'request_release') await requestRelease(selected.id);
      else if (pending === 'open_dispute') await disputeEscrow(selected.id, reason.trim());
      setNotice(`${ACTION_LABEL[pending]} — done.`);
      setPending(null); setReason('');
      await refresh(true);
    } catch (err) {
      const e = errorText(err);
      setActionError(e.kind === 'conflict' ? 'This deal changed while you were looking at it. Refresh to see its current state.' : e.message);
      if (e.kind === 'conflict') void refresh(true);
    } finally { setBusy(false); }
  };

  const copyRef = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const summary = load.status === 'ready' ? load.summary : null;

  return (
    <section aria-labelledby="my-deals-heading" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="my-deals-heading" className="text-lg font-semibold text-[#0A3340]">My escrow deals</h2>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D7E7E4] px-3 py-1.5 text-sm text-[#12576D] hover:bg-[#F6FAF9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      {load.status === 'loading' && <SummarySkeleton />}
      {load.status === 'error' && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">We could not load your deals.</p>
          <p className="mt-1">{load.message}</p>
          <button type="button" onClick={() => void refresh()} className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Try again</button>
        </div>
      )}

      {load.status === 'ready' && summary && deals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="escrow-summary">
          <SummaryCard label="Your deals" value={String(summary.totalDeals)} />
          <SummaryCard label="Held in your deals" value={formatKes(summary.heldAmount)} hint={`${summary.heldCount} deal${summary.heldCount === 1 ? '' : 's'} — only deals you are part of`} />
          <SummaryCard label="Awaiting funding" value={String(summary.pendingFundingCount)} />
          <SummaryCard label="Need your action" value={String(summary.needsActionCount)} />
        </div>
      )}

      {load.status === 'ready' && deals.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center" data-testid="escrow-empty">
          <p className="font-medium text-[#0A3340]">You have no escrow deals yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#64748B]">An escrow starts when a vehicle and seller that KAYAD has approved for escrow are bought through KAYAD. If a listing does not show the Escrow badge, it is not escrow-protected.</p>
          {onNavigate && <button type="button" onClick={() => onNavigate('marketplace')} className="mt-4 rounded-lg bg-[#0A3340] px-4 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Browse vehicles</button>}
          <p className="mx-auto mt-4 max-w-md text-xs text-[#64748B]">Dealer team members: deals are currently visible only to the account that owns them, not to its team members.</p>
        </div>
      )}

      {load.status === 'ready' && deals.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <div role="group" aria-label="Filter deals" className="mb-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                  className={`rounded-full border px-3 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4] ${filter === f.id ? 'border-[#0A3340] bg-[#0A3340] text-white' : 'border-[#D7E7E4] bg-white text-[#12576D]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {visible.length === 0 ? <p className="text-sm text-[#64748B]">No deals match this filter.</p> : (
              <ul className="space-y-2">
                {visible.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => select(d.id)} aria-current={selectedId === d.id ? 'true' : undefined}
                      className={`w-full rounded-xl border p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4] ${selectedId === d.id ? 'border-[#0A3340] bg-[#F6FAF9]' : 'border-[#D7E7E4] bg-white hover:bg-[#F6FAF9]'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#0A3340]">{d.car?.title || 'Vehicle'}</span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${TONE_CLASS[STATUS_TONE[d.status]]}`}>{STATUS_LABEL[d.status]}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#64748B]">{formatKes(d.amount)} · you are the {d.viewerRole}</p>
                      {needsAction(d) && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3340]"><Clock className="h-3 w-3" aria-hidden="true" /> Needs your action</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div aria-live="polite">
            {unknownLink && <p role="status" data-testid="escrow-unknown-link" className="mb-3 rounded-lg border border-[#BDE5DE] bg-[#F3FAF9] p-3 text-sm text-[#0A3340]">The deal in that link is not one of your deals, or no longer exists. Pick one from your list.</p>}
            {!selected && <p className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">Select a deal to see where it stands and what you can do.</p>}
            {selected && <DealDetail deal={selected} funding={funding?.id === selected.id ? funding : null} copied={copied}
              notice={notice} onLoadFunding={() => void loadFunding(selected.id)} onCopy={copyRef} onEvidenceUploaded={() => void refresh(true)}
              onAction={(a) => { setActionError(null); setReason(''); setPending(a); }} />}
          </div>
        </div>
      )}

      <ActionDialog
        open={pending !== null && pending !== 'open_dispute' && pending !== 'view_funding_instructions'}
        title={pending ? ACTION_LABEL[pending] : ''}
        description={pending === 'confirm_vehicle' ? 'Confirm that you have inspected the vehicle and accept it. This does not pay the seller by itself.'
          : pending === 'confirm_delivery' ? 'Confirm that the handover to the buyer is complete.'
          : pending === 'request_release' ? 'Ask KAYAD to release the funds to the seller. KAYAD staff carry out the release; you can still raise a dispute until they do.' : ''}
        confirmLabel={pending ? ACTION_LABEL[pending] : 'Confirm'} busy={busy} error={actionError}
        onConfirm={() => void runAction()} onClose={() => { if (!busy) setPending(null); }} />
      <ActionDialog
        open={pending === 'open_dispute'} title="Raise a dispute" tone="danger" confirmLabel="Open dispute" busy={busy} error={actionError}
        confirmDisabled={reason.trim().length < 10}
        description="Opening a dispute stops release and refund until KAYAD staff decide. Describe what is wrong (at least 10 characters)."
        onConfirm={() => void runAction()} onClose={() => { if (!busy) setPending(null); }}>
        <label className="mt-3 block text-sm font-medium text-[#0A3340]" htmlFor="dispute-reason">What is the problem?</label>
        <textarea id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
          className="mt-1 w-full rounded-lg border border-[#BDE5DE] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]" />
      </ActionDialog>
    </section>
  );
};

const Fact: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => value ? (
  <div><dt className="text-xs uppercase tracking-wide text-[#64748B]">{label}</dt><dd className="text-sm text-[#0A3340]">{value}</dd></div>
) : null;

interface DetailProps {
  deal: BackendEscrow;
  funding: { state: 'loading' | 'error' | 'ready'; data?: FundingInstructions; message?: string } | null;
  copied: boolean;
  notice: string | null;
  onLoadFunding: () => void;
  onCopy: (t: string) => void;
  onAction: (a: EscrowPartyAction) => void;
  onEvidenceUploaded: () => void;
}

const DealDetail: React.FC<DetailProps> = ({ deal, funding, copied, notice, onLoadFunding, onCopy, onAction, onEvidenceUploaded }) => {
  const role = deal.viewerRole ?? null;
  const story = storyFor(deal, role);
  const steps = timelineFor(deal);
  const actions = (deal.availableActions || []).filter((a) => a !== 'view_funding_instructions');
  const canSeeFunding = (deal.availableActions || []).includes('view_funding_instructions');
  const other = role === 'buyer' ? deal.seller : deal.buyer;

  return (
    <article className="space-y-4 rounded-xl border border-[#D7E7E4] bg-white p-5" aria-labelledby="deal-title">
      <header>
        <h3 id="deal-title" className="text-base font-semibold text-[#0A3340]">{deal.car?.title || 'Vehicle'}</h3>
        <p className="text-sm text-[#64748B]">{formatKes(deal.amount)} · {STATUS_LABEL[deal.status]}</p>
      </header>

      {notice && <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{notice}</p>}

      <div className={`rounded-lg border p-3 ${TONE_CLASS[STATUS_TONE[deal.status]]}`}>
        <p className="font-medium">{story.headline}</p>
        <p className="mt-1 text-sm">{story.detail}</p>
        <p className="mt-2 text-xs opacity-90">{story.funds}</p>
      </div>

      <ol className="space-y-1" aria-label="Deal progress">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm" aria-current={s.state === 'current' ? 'step' : undefined}>
            <span className={`h-2.5 w-2.5 rounded-full ${s.state === 'done' ? 'bg-emerald-500' : s.state === 'current' ? 'bg-[#13B8A6]' : 'bg-[#BDE5DE]'}`} aria-hidden="true" />
            <span className={s.state === 'upcoming' ? 'text-[#64748B]' : 'text-[#0A3340]'}>{s.label}</span>
            <span className="sr-only">{s.state === 'done' ? '(done)' : s.state === 'current' ? '(current)' : '(upcoming)'}</span>
            {s.at && <span className="text-xs text-[#64748B]">{formatDate(s.at)}</span>}
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-3">
        <Fact label="Amount" value={formatKes(deal.amount)} />
        <Fact label={role === 'buyer' ? 'Seller' : 'Buyer'} value={other?.businessName || other?.name || null} />
        {role === 'seller' && deal.commission != null && <Fact label="KAYAD commission" value={formatKes(deal.commission)} />}
        {role === 'seller' && deal.sellerAmount != null && <Fact label="You receive (after commission)" value={formatKes(deal.sellerAmount)} />}
        <Fact label="Opened" value={formatDate(deal.createdAt)} />
        <Fact label="Funding verified" value={formatDate(deal.fundingVerifiedAt)} />
        <Fact label="Eligible for automatic release from" value={formatDate(deal.autoReleaseEligibleAt)} />
      </dl>

      {canSeeFunding && (
        <div className="rounded-lg border border-[#D7E7E4] p-3">
          <p className="text-sm font-medium text-[#0A3340]">How to pay</p>
          {!funding && <button type="button" onClick={onLoadFunding} className="mt-2 rounded-lg border border-[#BDE5DE] px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Show payment instructions</button>}
          {funding?.state === 'loading' && <p className="mt-2 flex items-center gap-2 text-sm text-[#64748B]"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />Loading…</p>}
          {funding?.state === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">{funding.message}</p>}
          {funding?.state === 'ready' && funding.data && (
            <div className="mt-2 space-y-1 text-sm text-[#0A3340]">
              {funding.data.account ? (
                <>
                  <p>Pay {formatKes(funding.data.amount)} to {funding.data.account.accountName} — {funding.data.account.bankName}{funding.data.account.branch ? `, ${funding.data.account.branch}` : ''}</p>
                  <p>Account number: <span className="font-mono">{funding.data.account.accountNumber}</span></p>
                </>
              ) : <p>No payment account is available for this deal yet. Contact KAYAD support.</p>}
              <p className="flex items-center gap-2">Reference: <span className="font-mono">{funding.data.reference}</span>
                <button type="button" onClick={() => onCopy(funding.data!.reference)} className="inline-flex items-center gap-1 rounded border border-[#BDE5DE] px-2 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]"><Copy className="h-3 w-3" aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button></p>
              <p className="text-xs text-[#64748B]">Your deal shows as funded only after KAYAD verifies the transfer.</p>
            </div>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Actions available to you">
          {actions.map((a) => (
            <button key={a} type="button" onClick={() => onAction(a)}
              className={`rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4] ${a === 'open_dispute' ? 'border border-red-300 text-red-700 hover:bg-red-50' : 'bg-[#0A3340] text-white hover:bg-[#12576D]'}`}>
              {ACTION_LABEL[a]}
            </button>
          ))}
        </div>
      )}
      {actions.length === 0 && story.waitingOn !== 'none' && <p className="text-sm text-[#64748B]">Nothing for you to do right now.</p>}

      {deal.status === 'disputed' || deal.disputedAt ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Dispute{deal.disputeWorkflowStatus ? ` — ${DISPUTE_STATUS_LABEL[deal.disputeWorkflowStatus] || deal.disputeWorkflowStatus}` : ''}</p>
          {deal.disputeReason && <p className="mt-1">{deal.disputeReason}</p>}
          {(deal.disputeEvidence?.length || 0) > 0 && (
            <ul className="mt-2 list-disc pl-5">{deal.disputeEvidence!.map((e, i) => <li key={i}>{e.fileName || e.type || 'Evidence'}{e.verified ? ' (verified)' : ''}</li>)}</ul>
          )}
          {deal.status === 'disputed' && (
            <div className="mt-3 rounded-lg bg-white p-3 text-[#0A3340]">
              {/* The dispute is stored on the escrow row, so the escrow id is the dispute id. */}
              <EvidenceUpload disputeId={deal.id} onUploaded={onEvidenceUploaded} />
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
};

export default ParticipantEscrowDesk;
