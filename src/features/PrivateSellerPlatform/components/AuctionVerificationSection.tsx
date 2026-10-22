// Stage 5F.10 — "Auction verification" section of the EXISTING PrivateSellerPlatform (no second dashboard).
// Every state shown here is read from the backend; this component never decides eligibility or payment.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PsapApiError, PsapDetail, PsapProposal, getMyProposal, listMyProposals, newIdempotencyKey, openProposal, sendSellerEvent, SellerEvent,
} from '../../../services/privateSellerAuctionApi';
import type { BackendCar } from '../../../services/vehicleApi';

const STATUS_COPY: Record<string, string> = {
  draft: 'Draft — add evidence and submit', submitted: 'Submitted — waiting for KAYAD review', under_review: 'Under KAYAD review',
  changes_requested: 'Changes requested', approved: 'Approved by KAYAD', rejected: 'Not approved', withdrawn: 'Withdrawn',
  not_started: 'Not started', awaiting_payment: 'Waiting for inspection fee', assigned: 'Inspection assigned', in_progress: 'Inspection in progress',
  passed: 'Passed', failed: 'Did not pass', inconclusive: 'Inconclusive — reinspection needed', expired: 'Expired — reinspection needed', disputed: 'Disputed',
  awaiting_partner: 'Waiting for a custody partner', handover_scheduled: 'Handover scheduled', received: 'Received — being checked', in_custody: 'In approved custody',
  release_authorized: 'Release authorised', released: 'Released', refused: 'Custody refused — contact support', incident_hold: 'On hold — KAYAD is reviewing',
};
const label = (v: string) => STATUS_COPY[v] ?? v.replace(/_/g, ' ');

function errorText(e: unknown): string {
  if (e instanceof PsapApiError) {
    if (e.kind === 'unauthenticated') return 'Please sign in again.';
    if (e.kind === 'forbidden') return 'You do not have permission to do that.';
    if (e.kind === 'unavailable') return 'We could not confirm this right now. Nothing was changed — please try again shortly.';
    return e.message || 'The request was not accepted.';
  }
  return 'Something went wrong. Nothing was changed.';
}

export function AuctionVerificationSection({ listings }: { listings: BackendCar[] }) {
  const [proposals, setProposals] = useState<PsapProposal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PsapDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [carId, setCarId] = useState('');
  const [docKind, setDocKind] = useState('logbook');
  const [docRef, setDocRef] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const gen = useRef(0);
  const pendingKey = useRef<Record<string, string>>({});

  const loadList = useCallback(async () => {
    const g = ++gen.current;
    try { const rows = await listMyProposals(); if (g === gen.current) { setProposals(rows); setLoadError(null); } }
    catch (e) { if (g === gen.current) setLoadError(errorText(e)); }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try { setDetail(await getMyProposal(id)); setDetailError(null); } catch (e) { setDetail(null); setDetailError(errorText(e)); }
  }, []);
  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { if (selected) void loadDetail(selected); else setDetail(null); }, [selected, loadDetail]);

  // One idempotency key per user intent: a retry after a network error re-sends the same key, so it cannot double-apply.
  const act = async (intent: string, fn: (key: string) => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setNotice(null);
    const key = (pendingKey.current[intent] ||= newIdempotencyKey());
    try { await fn(key); delete pendingKey.current[intent]; setNotice({ kind: 'ok', text: success }); await loadList(); if (selected) await loadDetail(selected); }
    catch (e) { if (e instanceof PsapApiError && e.status && e.status < 500 && e.status !== 409) delete pendingKey.current[intent]; setNotice({ kind: 'error', text: errorText(e) }); }
    finally { setBusy(false); }
  };

  const p = detail?.proposal;
  const send = (event: SellerEvent, payload: Record<string, unknown>, ok: string) => act(`${selected}:${event}`, (k) => sendSellerEvent(selected!, event, payload, k), ok);
  const eligibleCars = listings.filter((l) => l.id && !(proposals ?? []).some((x) => x.car_id === l.id && !['rejected', 'withdrawn'].includes(x.proposal_status)));

  return (
    <section aria-labelledby="auction-verification-title" className="space-y-5">
      <header>
        <h1 id="auction-verification-title" className="text-2xl font-bold text-slate-900">Auction verification</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Private-seller vehicles can only go to auction after the inspection fee is paid, the vehicle passes inspection, an approved garage or dealer holds it in custody and KAYAD approves it.
          KAYAD&apos;s servers decide each step; this page only shows what they report.
        </p>
      </header>

      <div aria-live="polite" role="status" className="min-h-[1.5rem]">
        {notice && <p className={`rounded-lg px-3 py-2 text-sm ${notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`} role={notice.kind === 'error' ? 'alert' : undefined}>{notice.text}</p>}
      </div>

      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError} <button type="button" className="underline" onClick={() => void loadList()}>Try again</button></p>}
      {proposals === null && !loadError && <p className="text-sm text-slate-500">Loading your auction cases…</p>}

      {proposals && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); if (carId) void act(`open:${carId}`, (k) => openProposal(carId, k), 'Auction case opened.'); }}>
              <label htmlFor="psap-car" className="block text-sm font-semibold text-slate-800">Start a case for a vehicle</label>
              <select id="psap-car" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={carId} onChange={(e) => setCarId(e.target.value)} disabled={busy || eligibleCars.length === 0}>
                <option value="">{eligibleCars.length ? 'Choose a listing' : 'No listing available'}</option>
                {eligibleCars.map((l) => <option key={l.id} value={l.id}>{l.title || l.id}</option>)}
              </select>
              <button type="submit" disabled={!carId || busy} className="mt-3 min-h-11 w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Open auction case</button>
            </form>
            <ul className="space-y-2" aria-label="Your auction cases">
              {proposals.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">You have no auction cases yet.</li>}
              {proposals.map((x) => (
                <li key={x.id}>
                  <button type="button" aria-pressed={selected === x.id} onClick={() => setSelected(x.id)} className={`min-h-11 w-full rounded-xl border p-3 text-left text-sm ${selected === x.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                    <span className="block font-semibold text-slate-900">{listings.find((l) => l.id === x.car_id)?.title || 'Vehicle'}</span>
                    <span className="block text-slate-600">{label(x.proposal_status)} · {label(x.custody_status)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {!selected && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Select a case to see its progress.</p>}
            {selected && detailError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{detailError}</p>}
            {selected && p && detail && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${detail.eligibility.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-warning/10 text-warning'}`}>
                  {detail.eligibility.eligible ? 'Cleared for auction — all verification and custody requirements are met.' : 'Not yet cleared for auction. Bidding cannot open until every step below is complete.'}
                </p>
                <ol className="space-y-3" aria-label="Verification progress">
                  <Step title="1. Evidence and proposal" done={['submitted', 'under_review', 'approved'].includes(p.proposal_status)} value={label(p.proposal_status)} />
                  <Step title="2. Inspection fee" done={!!p.inspection_payment_confirmed_at} value={p.inspection_payment_confirmed_at ? 'Payment confirmed by KAYAD' : 'Not confirmed — only a verified M-Pesa confirmation counts, not a page redirect'} />
                  <Step title="3. Vehicle inspection" done={p.verification_status === 'passed'} value={label(p.verification_status)} />
                  <Step title="4. Physical custody" done={p.custody_status === 'in_custody'} value={label(p.custody_status)} />
                  <Step title="5. KAYAD approval" done={p.proposal_status === 'approved'} value={label(p.proposal_status)} />
                </ol>
                {detail.eligibility.blockers.length > 0 && (
                  <div><h2 className="text-sm font-semibold text-slate-800">What is still needed</h2><ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{detail.eligibility.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
                )}
                {(p.decision_reason || p.custody_hold_reason) && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Note from KAYAD:</strong> {p.custody_hold_reason || p.decision_reason}</p>}

                <fieldset disabled={busy} className="space-y-4 border-t border-slate-200 pt-4">
                  <legend className="text-sm font-semibold text-slate-800">What you can do now</legend>
                  {['draft', 'changes_requested'].includes(p.proposal_status) && (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div><label htmlFor="psap-doc-kind" className="text-xs font-semibold text-slate-700">Document</label>
                          <select id="psap-doc-kind" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                            <option value="logbook">Logbook / ownership</option><option value="id">Seller ID</option><option value="sale_authority">Authority to sell</option><option value="service_history">Service history</option></select></div>
                        <div><label htmlFor="psap-doc-ref" className="text-xs font-semibold text-slate-700">Reference or description</label>
                          <input id="psap-doc-ref" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" value={docRef} onChange={(e) => setDocRef(e.target.value)} maxLength={200} /></div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="min-h-11 rounded-lg border border-teal-700 px-4 text-sm font-semibold text-teal-800 disabled:opacity-50" disabled={!docRef.trim()} onClick={() => send('evidence_submitted', { documents: [{ kind: docKind, reference: docRef.trim() }] }, 'Evidence recorded.')}>Add evidence</button>
                        <button type="button" className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white" onClick={() => send('proposal_submitted', {}, 'Proposal submitted for KAYAD review.')}>Submit proposal</button>
                      </div>
                    </div>
                  )}
                  {['not_started', 'awaiting_payment'].includes(p.verification_status) && (
                    <div className="space-y-2">
                      <label htmlFor="psap-booking" className="block text-xs font-semibold text-slate-700">Paid inspection booking ID</label>
                      <p className="text-xs text-slate-500">Pay the inspection fee first. KAYAD links the booking only after M-Pesa has confirmed the payment; an unpaid booking is refused.</p>
                      <div className="flex flex-wrap gap-2">
                        <input id="psap-booking" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-2" value={bookingId} onChange={(e) => setBookingId(e.target.value.trim())} />
                        <button type="button" className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!bookingId} onClick={() => send('inspection_assigned', { booking_id: bookingId }, 'Inspection booking linked.')}>Link booking</button>
                      </div>
                    </div>
                  )}
                  {(['failed', 'inconclusive', 'expired'].includes(p.verification_status) || p.proposal_status === 'rejected') && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">This vehicle cannot go to auction yet. {p.proposal_status === 'rejected' ? 'KAYAD did not approve this case; you can appeal that decision.' : 'You can correct the issue and request a reinspection (a new booking and fee apply), or appeal the result.'}</p>
                      <label htmlFor="psap-reason" className="block text-xs font-semibold text-slate-700">Reason (required)</label>
                      <textarea id="psap-reason" rows={3} className="w-full rounded-lg border border-slate-300 p-2" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
                      <div className="flex flex-wrap gap-2">
                        {p.proposal_status !== 'rejected' && <button type="button" className="min-h-11 rounded-lg border border-teal-700 px-4 text-sm font-semibold text-teal-800 disabled:opacity-50" disabled={!reason.trim()} onClick={() => send('reinspection_requested', { reason: reason.trim() }, 'Reinspection requested.')}>Request reinspection</button>}
                        {p.verification_status !== 'expired' && <button type="button" className="min-h-11 rounded-lg border border-slate-400 px-4 text-sm font-semibold text-slate-800 disabled:opacity-50" disabled={!reason.trim() || ['submitted', 'under_review'].includes(p.appeal_status)} onClick={() => send('appeal_submitted', { reason: reason.trim() }, 'Appeal submitted.')}>Appeal result</button>}
                      </div>
                      {['submitted', 'under_review'].includes(p.appeal_status) && <p className="text-xs text-slate-600">Your appeal is {p.appeal_status === 'submitted' ? 'waiting for' : 'under'} review. Auction stays blocked until it is decided.</p>}
                    </div>
                  )}
                  {!['approved', 'rejected', 'withdrawn'].includes(p.proposal_status) && (
                    <button type="button" className="min-h-11 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700" onClick={() => send('proposal_withdrawn', {}, 'Proposal withdrawn.')}>Withdraw this case</button>
                  )}
                </fieldset>
                <details className="text-sm text-slate-600"><summary className="cursor-pointer font-semibold">History ({detail.events.length})</summary>
                  <ul className="mt-2 space-y-1">{detail.events.map((ev) => <li key={ev.id}>{new Date(ev.created_at).toLocaleString()} — {ev.event_type.replace(/_/g, ' ')}{ev.actor_role ? ` (${ev.actor_role})` : ''}</li>)}</ul></details>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Step({ title, done, value }: { title: string; done: boolean; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{done ? '✓' : '·'}</span>
      <span className="min-w-0 text-sm"><span className="block font-semibold text-slate-900">{title}</span><span className="block text-slate-600">{value}<span className="sr-only">{done ? ' — complete' : ' — not complete'}</span></span></span>
    </li>
  );
}
export default AuctionVerificationSection;
