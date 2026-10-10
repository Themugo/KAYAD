import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  EscrowApiError, closeEscrow, completeRefund, getOperationsCase, getOperationsDashboard, getOperationsPending, initiatePayout,
  refundEscrow, releaseEscrow, runAnomalyScan, runReconciliation, verifyFunding,
  type EscrowStaffAction, type OpsCase, type OpsDashboard, type OpsEscrow,
} from '../../services/escrowApi';
import { STATUS_LABEL, formatDate, formatKes } from './escrowModel';
import ActionDialog from './ActionDialog';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; dash: OpsDashboard; pending: OpsEscrow[] };

const msg = (err: unknown) => {
  if (err instanceof EscrowApiError) {
    if (err.kind === 'forbidden') return 'Your role does not have access to this.';
    if (err.kind === 'conflict') return 'This case changed. Reload it and check its current state.';
    return err.message || 'Something went wrong.';
  }
  return 'Something went wrong.';
};

const ACTION_TEXT: Record<EscrowStaffAction, string> = {
  verify_funding: 'Verify funding', release: 'Release', refund: 'Approve refund', complete_refund: 'Record refund paid', payout: 'Start payout', close: 'Close escrow',
};
const NEEDS_REASON: EscrowStaffAction[] = ['refund', 'close'];

const QUEUES: Array<{ key: 'funded' | 'vehicleConfirmed' | 'delivered' | 'released' | 'disputed'; label: string }> = [
  { key: 'funded', label: 'Funded' }, { key: 'vehicleConfirmed', label: 'Vehicle accepted' }, { key: 'delivered', label: 'Delivered' },
  { key: 'released', label: 'Released (payout pending)' }, { key: 'disputed', label: 'Disputed' },
];

export const EscrowOperationsDesk: React.FC = () => {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [caseData, setCaseData] = useState<{ status: 'loading' | 'error' | 'ready'; data?: OpsCase; message?: string } | null>(null);
  const [action, setAction] = useState<EscrowStaffAction | null>(null);
  const [text, setText] = useState('');
  const [cash, setCash] = useState<'1000' | '1200'>('1000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoad({ status: 'loading' });
    try {
      const [dash, pending] = await Promise.all([getOperationsDashboard(), getOperationsPending().catch(() => [] as OpsEscrow[])]);
      setLoad({ status: 'ready', dash, pending });
    } catch (e) { setLoad({ status: 'error', message: msg(e) }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const openCase = async (id: string) => {
    setNotice(null); setCaseData({ status: 'loading' });
    try { setCaseData({ status: 'ready', data: await getOperationsCase(id) }); }
    catch (e) { setCaseData({ status: 'error', message: msg(e) }); }
  };

  const run = async () => {
    const c = caseData?.data; if (!c || !action) return;
    const id = c.escrow.id;
    setBusy(true); setErr(null);
    try {
      if (action === 'verify_funding') await verifyFunding(id, text.trim());
      else if (action === 'release') await releaseEscrow(id);
      else if (action === 'refund') await refundEscrow(id, text.trim());
      else if (action === 'complete_refund') { if (!c.escrow.refund?.id) throw new Error('no refund'); await completeRefund(id, c.escrow.refund?.id || '', text.trim(), cash); }
      else if (action === 'payout') await initiatePayout(id);
      else if (action === 'close') await closeEscrow(id, text.trim());
      setNotice(`${ACTION_TEXT[action]} — recorded.`);
      setAction(null); setText('');
      await Promise.all([openCase(id), refresh()]);
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };

  const runTool = async (fn: () => Promise<unknown>, label: string) => {
    setBusy(true); setNotice(null);
    try { await fn(); setNotice(`${label} started.`); await refresh(); } catch (e) { setNotice(msg(e)); } finally { setBusy(false); }
  };

  if (load.status === 'loading') return <div className="h-32 rounded-xl bg-[#EEF7F5] motion-safe:animate-pulse" role="status" aria-label="Loading operations" />;
  if (load.status === 'error') return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{load.message}</p>
      <button type="button" onClick={() => void refresh()} className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-white">Try again</button>
    </div>
  );

  const { dash, pending } = load;
  const can = dash.operator.can;
  const c = caseData?.data;
  const staffActions = c?.escrow.staffActions || [];
  const reasonNeeded = action ? NEEDS_REASON.includes(action) : false;
  const textNeeded = action === 'verify_funding' || action === 'complete_refund' || reasonNeeded;
  const invalid = !!action && ((reasonNeeded && text.trim().length < 10) || ((action === 'verify_funding' || action === 'complete_refund') && text.trim().length < 3));

  return (
    <section aria-labelledby="ops-heading" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ops-heading" className="text-lg font-semibold text-[#0A3340]">Escrow operations</h2>
        <div className="flex gap-2">
          {can.reconcile && <>
            <button type="button" disabled={busy} onClick={() => void runTool(runReconciliation, 'Reconciliation')} className="rounded-lg border border-[#BDE5DE] px-3 py-1.5 text-sm disabled:opacity-50">Run reconciliation</button>
            <button type="button" disabled={busy} onClick={() => void runTool(runAnomalyScan, 'Anomaly scan')} className="rounded-lg border border-[#BDE5DE] px-3 py-1.5 text-sm disabled:opacity-50">Run anomaly scan</button>
          </>}
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D7E7E4] px-3 py-1.5 text-sm"><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</button>
        </div>
      </div>
      {notice && !c && <p role="status" className="text-sm text-[#12576D]">{notice}</p>}

      <div className="rounded-xl border border-[#D7E7E4] bg-white p-4" data-testid="ops-totals">
        <p className="text-xs uppercase tracking-wide text-[#64748B]">Platform-wide (staff view)</p>
        <p className="text-xl font-semibold text-[#0A3340]">{formatKes(dash.totals.heldAmount)} <span className="text-sm font-normal text-[#64748B]">recorded as held across {dash.totals.heldCount} escrow{dash.totals.heldCount === 1 ? '' : 's'}</span></p>
        <p className="mt-1 text-xs text-[#64748B]">From KAYAD’s escrow records. Not a bank balance.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {can.settle && (
            <QueueBlock title="Awaiting funding verification" count={pending.length} items={pending} onOpen={openCase} />
          )}
          {QUEUES.map((q) => <QueueBlock key={q.key} title={q.label} count={dash.queues[q.key].count} items={dash.queues[q.key].items} onOpen={openCase} />)}
          <div className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#12576D]">
            <p>Refunds in progress: <b>{dash.queues.refunds.count}</b> · Open anomalies: <b>{dash.queues.anomalies.count}</b> · Reconciliation issues: <b>{dash.queues.reconciliation.count}</b></p>
          </div>
        </div>

        <div aria-live="polite">
          {caseData?.status === 'loading' && <p className="text-sm text-[#64748B]">Loading case…</p>}
          {caseData?.status === 'error' && <p role="alert" className="text-sm text-red-700">{caseData.message}</p>}
          {!caseData && <p className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Select a case to review it.</p>}
          {c && (
            <article className="space-y-3 rounded-xl border border-[#D7E7E4] bg-white p-4" aria-labelledby="case-title">
              <h3 id="case-title" className="font-semibold text-[#0A3340]">{c.escrow.car?.title || 'Vehicle'} — {STATUS_LABEL[c.escrow.status]}</h3>
              <p className="text-sm text-[#12576D]">{formatKes(c.escrow.amount)} · commission {formatKes(c.escrow.commission)} · seller {formatKes(c.escrow.sellerAmount)}</p>
              <p className="text-sm text-[#64748B]">{c.escrow.buyer?.name} → {c.escrow.seller?.name}</p>
              {c.escrow.refund && <p className="text-sm">Refund: {c.escrow.refund.status} ({formatKes(c.escrow.refund.amount)})</p>}
              {c.escrow.payout && <p className="text-sm">Payout: {c.escrow.payout.status} ({formatKes(c.escrow.payout.netAmount)}){c.escrow.payout.failureReason ? ` — ${c.escrow.payout.failureReason}` : ''}</p>}
              {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
              {staffActions.length > 0 ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Staff actions">
                  {staffActions.map((a) => (
                    <button key={a} type="button" onClick={() => { setErr(null); setText(''); setAction(a); }} className="rounded-lg bg-[#0A3340] px-3 py-1.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">{ACTION_TEXT[a]}</button>
                  ))}
                </div>
              ) : <p className="text-sm text-[#64748B]">No action available to you for this case in its current state.</p>}
              <h4 className="text-sm font-medium text-[#0A3340]">History</h4>
              <ol className="space-y-1 text-sm">
                {c.timeline.map((t) => <li key={t.id}>{formatDate(t.timestamp)} — {t.action.replace(/_/g, ' ')}{t.reason ? `: ${t.reason}` : ''}</li>)}
              </ol>
            </article>
          )}
        </div>
      </div>

      <ActionDialog open={action !== null} title={action ? ACTION_TEXT[action] : ''} tone={action === 'refund' || action === 'close' ? 'danger' : 'primary'}
        confirmLabel={action ? ACTION_TEXT[action] : 'Confirm'} busy={busy} error={err} confirmDisabled={invalid}
        description={action === 'release' ? 'Release posts the settlement and commission entries. Paying the seller is a separate step.'
          : action === 'payout' ? 'Starts the B2C payout for the seller’s net amount.'
          : action === 'refund' ? 'Approves the refund and reclassifies the ledger. Money leaves only when you record the refund as paid.'
          : action === 'close' ? 'Closing is an administrative record. It does not verify that any payout or refund completed.' : undefined}
        onConfirm={() => void run()} onClose={() => { if (!busy) setAction(null); }}>
        {textNeeded && (
          <div className="mt-3">
            <label htmlFor="ops-text" className="block text-sm font-medium text-[#0A3340]">
              {action === 'verify_funding' ? 'Bank funding reference' : action === 'complete_refund' ? 'Provider reference' : 'Reason (at least 10 characters)'}
            </label>
            <input id="ops-text" value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full rounded-lg border border-[#BDE5DE] p-2 text-sm" />
          </div>
        )}
        {action === 'complete_refund' && (
          <div className="mt-3">
            <label htmlFor="ops-cash" className="block text-sm font-medium text-[#0A3340]">Paid from</label>
            <select id="ops-cash" value={cash} onChange={(e) => setCash(e.target.value as '1000' | '1200')} className="mt-1 w-full rounded-lg border border-[#BDE5DE] p-2 text-sm">
              <option value="1000">1000 — M-Pesa</option><option value="1200">1200 — Bank</option>
            </select>
          </div>
        )}
      </ActionDialog>
    </section>
  );
};

const QueueBlock: React.FC<{ title: string; count: number; items: OpsEscrow[]; onOpen: (id: string) => void }> = ({ title, count, items, onOpen }) => (
  <div className="rounded-xl border border-[#D7E7E4] bg-white p-4">
    <h3 className="text-sm font-semibold text-[#0A3340]">{title} <span className="font-normal text-[#64748B]">({count})</span></h3>
    {items.length === 0 ? <p className="mt-1 text-sm text-[#64748B]">Nothing in this queue.</p> : (
      <ul className="mt-2 divide-y divide-[#D7E7E4]">
        {items.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onOpen(e.id)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-[#F6FAF9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">
              <span>{e.car?.title || 'Vehicle'} <span className="text-[#64748B]">· {e.buyer?.name} → {e.seller?.name}</span></span>
              <span className="shrink-0 font-medium">{formatKes(e.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default EscrowOperationsDesk;
