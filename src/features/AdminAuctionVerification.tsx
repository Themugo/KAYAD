// Stage 5F.10 — admin review of private-seller auction cases and custody capability. Mounted as a tab in the existing AdminView.
// The server enforces who may act (admin/superadmin) and the database re-verifies it; this UI only presents what the API returns.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PsapApiError, PsapDetail, PsapProposal, adminCapabilityAction, adminGetProposal, adminListProposals, adminSendEvent, newIdempotencyKey, AdminEvent,
} from '../services/privateSellerAuctionApi';

const errText = (e: unknown) => (e instanceof PsapApiError ? (e.kind === 'forbidden' ? 'You do not have permission to do that.' : e.message) : 'Something went wrong. Nothing was changed.');
const lbl = (v: string) => v.replace(/_/g, ' ');

export default function AdminAuctionVerification() {
  const [rows, setRows] = useState<PsapProposal[] | null>(null);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<PsapDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [reason, setReason] = useState('');
  const [partner, setPartner] = useState(''); const [loc, setLoc] = useState('');
  const [capProv, setCapProv] = useState(''); const [capKind, setCapKind] = useState<'garage' | 'dealer'>('garage');
  const [capReason, setCapReason] = useState(''); const [capPremises, setCapPremises] = useState(''); const [capAgreement, setCapAgreement] = useState(''); const [capInsurance, setCapInsurance] = useState('');
  const keys = useRef<Record<string, string>>({});

  const load = useCallback(async () => { try { setRows(await adminListProposals(filter || undefined)); setErr(null); } catch (e) { setErr(errText(e)); } }, [filter]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!sel) { setDetail(null); return; } adminGetProposal(sel).then(setDetail).catch((e) => { setDetail(null); setMsg({ ok: false, t: errText(e) }); }); }, [sel]);

  const run = async (intent: string, fn: (k: string) => Promise<unknown>, ok: string) => {
    if (busy) return; setBusy(true); setMsg(null);
    const k = (keys.current[intent] ||= newIdempotencyKey());
    try { await fn(k); delete keys.current[intent]; setMsg({ ok: true, t: ok }); await load(); if (sel) setDetail(await adminGetProposal(sel)); }
    catch (e) { setMsg({ ok: false, t: errText(e) }); } finally { setBusy(false); }
  };
  const ev = (event: AdminEvent, payload: Record<string, unknown>, ok: string) => run(`${sel}:${event}`, (k) => adminSendEvent(sel!, event, payload, k), ok);
  const p = detail?.proposal;

  return (
    <section aria-labelledby="aav-title" className="space-y-5">
      <h2 id="aav-title" className="text-xl font-bold">Private-seller auction verification</h2>
      <div role="status" aria-live="polite" className="min-h-[1.5rem]">{msg && <p role={msg.ok ? undefined : 'alert'} className={`rounded px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{msg.t}</p>}</div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <label htmlFor="aav-filter" className="block text-sm font-semibold">Status</label>
          <select id="aav-filter" className="min-h-11 w-full rounded border px-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All cases</option>{['submitted', 'under_review', 'changes_requested', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{lbl(s)}</option>)}
          </select>
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{err} <button type="button" className="underline" onClick={() => void load()}>Retry</button></p>}
          {rows === null && !err && <p className="text-sm text-slate-500">Loading cases…</p>}
          {rows && rows.length === 0 && <p className="text-sm text-slate-500">No cases match.</p>}
          <ul className="space-y-2" aria-label="Cases">{(rows ?? []).map((r) => (
            <li key={r.id}><button type="button" aria-pressed={sel === r.id} onClick={() => setSel(r.id)} className={`min-h-11 w-full rounded border p-3 text-left text-sm ${sel === r.id ? 'border-teal-600 bg-teal-50' : 'bg-white'}`}>
              <span className="block font-mono text-xs">{r.id.slice(0, 8)}</span><span>{lbl(r.proposal_status)} · inspection {lbl(r.verification_status)} · custody {lbl(r.custody_status)}</span></button></li>
          ))}</ul>
        </div>

        <div className="space-y-4">
          {p && detail ? (
            <div className="space-y-4 rounded border bg-white p-4">
              <p className={`rounded px-3 py-2 text-sm font-semibold ${detail.eligibility.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{detail.eligibility.eligible ? 'Gate: eligible for auction' : 'Gate: blocked'}</p>
              {detail.eligibility.blockers.length > 0 && <ul className="list-disc pl-5 text-sm">{detail.eligibility.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
              <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Proposal / evidence version</dt><dd>{p.proposal_version} / {p.evidence_version}</dd><dt>Inspection</dt><dd>{lbl(p.verification_status)}</dd><dt>Custody</dt><dd>{lbl(p.custody_status)}</dd><dt>Appeal</dt><dd>{lbl(p.appeal_status)}</dd><dt>Payment</dt><dd>{p.inspection_payment_confirmed_at ? 'Confirmed (server-recorded)' : 'Not confirmed'}</dd></dl>
              <fieldset disabled={busy} className="space-y-3 border-t pt-3">
                <legend className="text-sm font-semibold">Actions</legend>
                <label htmlFor="aav-reason" className="block text-xs font-semibold">Reason (required for anything except approval)</label>
                <textarea id="aav-reason" rows={2} className="w-full rounded border p-2" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={() => ev('authority_verified', {}, 'Seller authority recorded.')}>Verify seller authority</button>
                  <button type="button" className="min-h-11 rounded bg-teal-700 px-3 text-sm font-semibold text-white" onClick={() => ev('admin_decision', { decision: 'approve', reason: reason.trim() || 'Approved after review' }, 'Decision recorded.')}>Approve</button>
                  <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('admin_decision', { decision: 'request_changes', reason: reason.trim() }, 'Changes requested.')}>Request changes</button>
                  <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border border-red-300 px-3 text-sm text-red-700 disabled:opacity-50" onClick={() => ev('admin_decision', { decision: 'reject', reason: reason.trim() }, 'Rejected.')}>Reject</button>
                  <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('custody_incident', { reason: reason.trim() }, 'Custody hold placed.')}>Place custody hold</button>
                  <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('custody_hold_released', { reason: reason.trim() }, 'Hold released; case returned to review.')}>Release hold</button>
                  {['submitted', 'under_review'].includes(p.appeal_status) && <>
                    <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('appeal_decision', { decision: 'upheld', reason: reason.trim() }, 'Appeal upheld.')}>Uphold appeal result</button>
                    <button type="button" disabled={!reason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('appeal_decision', { decision: 'overturned', reason: reason.trim() }, 'Appeal overturned — reinspection required; eligibility is not restored.')}>Overturn appeal result</button></>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><label htmlFor="aav-partner" className="text-xs font-semibold">Custody partner ID (garage or dealer)</label><input id="aav-partner" className="mt-1 min-h-11 w-full rounded border px-2" value={partner} onChange={(e) => setPartner(e.target.value.trim())} /></div>
                  <div><label htmlFor="aav-loc" className="text-xs font-semibold">Approved premises ID</label><input id="aav-loc" className="mt-1 min-h-11 w-full rounded border px-2" value={loc} onChange={(e) => setLoc(e.target.value.trim())} /></div>
                </div>
                <button type="button" disabled={!partner || !loc} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => ev('custody_assigned', { partner_id: partner, location_id: loc }, 'Custody partner assigned.')}>Assign custody partner</button>
              </fieldset>
              <details className="text-sm"><summary className="cursor-pointer font-semibold">Audit trail ({detail.events.length})</summary><ul className="mt-2 space-y-1">{detail.events.map((e) => <li key={e.id}>{new Date(e.created_at).toLocaleString()} — {lbl(e.event_type)}{e.actor_role ? ` (${e.actor_role})` : ''}</li>)}</ul></details>
            </div>
          ) : <p className="rounded border border-dashed p-6 text-sm text-slate-500">Select a case.</p>}

          <form className="space-y-2 rounded border bg-white p-4" aria-labelledby="aav-cap" onSubmit={(e) => e.preventDefault()}>
            <h3 id="aav-cap" className="text-sm font-semibold">Custody capability (separate from inspection and from escrow)</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label htmlFor="aav-cp" className="text-xs font-semibold">Partner ID</label><input id="aav-cp" className="mt-1 min-h-11 w-full rounded border px-2" value={capProv} onChange={(e) => setCapProv(e.target.value.trim())} /></div>
              <div><label htmlFor="aav-ck" className="text-xs font-semibold">Partner type</label><select id="aav-ck" className="mt-1 min-h-11 w-full rounded border px-2" value={capKind} onChange={(e) => setCapKind(e.target.value as 'garage' | 'dealer')}><option value="garage">Approved garage</option><option value="dealer">Approved dealer</option></select></div>
              <div><label htmlFor="aav-pr" className="text-xs font-semibold">Approved premises IDs (comma separated)</label><input id="aav-pr" className="mt-1 min-h-11 w-full rounded border px-2" value={capPremises} onChange={(e) => setCapPremises(e.target.value)} /></div>
              <div><label htmlFor="aav-ag" className="text-xs font-semibold">Agreement version</label><input id="aav-ag" className="mt-1 min-h-11 w-full rounded border px-2" value={capAgreement} onChange={(e) => setCapAgreement(e.target.value)} /></div>
              <div><label htmlFor="aav-in" className="text-xs font-semibold">Insurance valid until</label><input id="aav-in" type="date" className="mt-1 min-h-11 w-full rounded border px-2" value={capInsurance} onChange={(e) => setCapInsurance(e.target.value)} /></div>
              <div><label htmlFor="aav-cr" className="text-xs font-semibold">Reason (suspend / revoke)</label><input id="aav-cr" className="mt-1 min-h-11 w-full rounded border px-2" value={capReason} onChange={(e) => setCapReason(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !capProv || !capPremises || !capAgreement || !capInsurance} className="min-h-11 rounded bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => run(`cap:approve:${capProv}`, (k) => adminCapabilityAction(capProv, 'approve', capKind, { approved_premises: capPremises.split(',').map((s) => s.trim()).filter(Boolean), agreement_version: capAgreement, insurance_expires_at: new Date(`${capInsurance}T23:59:59Z`).toISOString() }, k), 'Capability approved.')}>Approve capability</button>
              {(['suspend', 'revoke'] as const).map((a) => <button key={a} type="button" disabled={busy || !capProv || !capReason.trim()} className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" onClick={() => run(`cap:${a}:${capProv}`, (k) => adminCapabilityAction(capProv, a, capKind, { reason: capReason.trim() }, k), `Capability ${a === 'suspend' ? 'suspended' : 'revoked'}.`)}>{a === 'suspend' ? 'Suspend' : 'Revoke'}</button>)}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
