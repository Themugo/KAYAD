import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../components/ui';
import { providerGovernanceApi } from './InspectionMarketplace/services/api';

/**
 * Admin governance of the single provider network (existing admin console + control plane).
 *
 * The browser is a convenience, never the authority: the backend re-validates every
 * decision (evidence required, no self-decision, optimistic concurrency, audit trail).
 * Suspending or revoking here changes the same rows the matching query reads, so
 * eligibility changes immediately for search and for job assignment, not just a badge.
 */
const STAGES = ['', 'UNDER_REVIEW', 'CREDENTIALS_SUBMITTED', 'PROFILE_COMPLETED', 'REGISTERED', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];

const reason = (err: any) => err?.response?.data?.message || err?.message || 'The server rejected this change.';

export default function AdminProviderGovernance() {
  const [stage, setStage] = useState('UNDER_REVIEW');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState<'premises' | 'alternative'>('premises');
  const [notes, setNotes] = useState('');
  const [why, setWhy] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true); setListError(null);
    try { setRows((await providerGovernanceApi.list({ stage: stage || undefined, limit: 50 })).items || []); }
    catch (e) { setRows([]); setListError(reason(e)); }
    finally { setLoading(false); }
  }, [stage]);
  useEffect(() => { void loadList(); }, [loadList]);

  const open = useCallback(async (id: string) => {
    setOpenId(id); setDetail(null); setDetailLoading(true); setMessage(null); setNotes(''); setWhy('');
    try { setDetail(await providerGovernanceApi.get(id)); }
    catch (e) { setMessage({ kind: 'error', text: reason(e) }); }
    finally { setDetailLoading(false); }
  }, []);

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true); setMessage(null);
    try { await fn(); setMessage({ kind: 'ok', text: okText }); if (openId) await open(openId); await loadList(); setMessage({ kind: 'ok', text: okText }); }
    catch (e) { setMessage({ kind: 'error', text: reason(e) }); }
    finally { setBusy(false); }
  };

  const p = detail?.provider;
  return (
    <Card className="p-5 space-y-4" data-testid="admin-provider-governance">
      <div>
        <h3 className="font-bold text-[#176B87]">Provider network governance</h3>
        <p className="text-sm text-slate-600 mt-1">
          Review businesses, their credentials and the services they claim. A business is approved on one of two routes — workshop premises, or an
          evidence-based alternative for legitimate businesses without customer-facing premises. Neither is a shortcut: both need verified evidence and
          a written basis. Verifying a business does not certify its staff. Every decision is recorded and takes effect in search and job assignment immediately.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="gov-stage" className="text-sm font-medium">Stage</label>
        <select id="gov-stage" className="rounded-lg border border-slate-300 px-3 py-2 min-h-[44px] bg-white" value={stage} onChange={(e) => { setStage(e.target.value); setOpenId(null); setDetail(null); }}>
          {STAGES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ').toLowerCase() : 'all stages'}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => void loadList()}>Refresh</Button>
      </div>

      {message && <div role="status" className={`text-sm rounded-lg px-3 py-2 ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{message.text}</div>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-5">
        <div aria-busy={loading}>
          {listError && <p role="alert" className="text-sm text-red-700">{listError}</p>}
          {!loading && !listError && rows.length === 0 && <p className="text-sm text-slate-600">No businesses in this stage.</p>}
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => void open(r.id)} aria-current={openId === r.id} className={`w-full text-left rounded-xl border p-3 min-h-[44px] ${openId === r.id ? 'border-[#13B8A6] bg-[#E7F7F4]' : 'border-slate-200 bg-white'}`}>
                  <span className="block font-semibold">{r.trading_name || r.company_name}</span>
                  <span className="block text-xs text-slate-600">{[r.town, r.county].filter(Boolean).join(', ') || 'No location'} · {String(r.lifecycle_stage).replace(/_/g, ' ').toLowerCase()}{r.verification_route ? ` · ${r.verification_route} route` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div aria-live="polite">
          {detailLoading && <p className="text-sm text-slate-600">Loading…</p>}
          {!openId && !detailLoading && <p className="text-sm text-slate-600">Select a business to review.</p>}
          {p && (
            <div className="space-y-5">
              <div>
                <h4 className="font-bold">{p.trading_name || p.company_name}</h4>
                <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-2">
                  <dt className="text-slate-500">Stage</dt><dd>{p.lifecycle_stage}</dd>
                  <dt className="text-slate-500">Contact</dt><dd>{[p.email, p.phone].filter(Boolean).join(' · ') || '—'}</dd>
                  <dt className="text-slate-500">Registration</dt><dd>{p.registration_number || p.tax_id || 'none supplied'}</dd>
                  <dt className="text-slate-500">Premises</dt><dd>{p.has_workshop && p.address ? p.address : 'No customer-facing premises declared'}</dd>
                  {p.rejection_reason && (<><dt className="text-slate-500">Rejected</dt><dd>{p.rejection_reason}</dd></>)}
                  {p.suspended_reason && (<><dt className="text-slate-500">Suspended</dt><dd>{p.suspended_reason}</dd></>)}
                </dl>
              </div>

              <section aria-labelledby="gov-creds">
                <h5 id="gov-creds" className="font-semibold text-sm">Credentials and evidence</h5>
                {(detail.credentials || []).length === 0 && <p className="text-sm text-slate-600">None submitted.</p>}
                <ul className="space-y-2 mt-2">
                  {(detail.credentials || []).map((c: any) => (
                    <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{c.title || c.credential_type || 'Credential'} <span className="text-slate-500">· {c.verification_status}</span></p>
                      <p className="text-xs text-slate-600">{[c.issued_by, c.certificate_number, c.expires_at && `expires ${String(c.expires_at).slice(0, 10)}`].filter(Boolean).join(' · ')}</p>
                      {c.document_url && /^(https:\/\/|\/(?!\/))/i.test(String(c.document_url)) ? <a className="text-xs underline text-[#176B87]" href={c.document_url} target="_blank" rel="noopener noreferrer">Open submitted document</a> : <p className="text-xs text-amber-800">No usable document submitted: cannot be verified.</p>}
                      {c.verification_status !== 'verified' && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" disabled={busy || !notes.trim()} onClick={() => void act(() => providerGovernanceApi.decideCredential(c.id, { decision: 'verify', notes }), 'Credential verified.')}>Verify</Button>
                          <Button size="sm" variant="outline" disabled={busy || !notes.trim()} onClick={() => void act(() => providerGovernanceApi.decideCredential(c.id, { decision: 'reject', notes }), 'Credential rejected.')}>Reject</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="gov-caps">
                <h5 id="gov-caps" className="font-semibold text-sm">Services claimed</h5>
                {(detail.capabilities || []).length === 0 && <p className="text-sm text-slate-600">None declared.</p>}
                <ul className="space-y-2 mt-2">
                  {(detail.capabilities || []).map((c: any) => (
                    <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{c.category_code.replace(/_/g, ' ')}{c.subcategory_code ? ` / ${c.subcategory_code.replace(/_/g, ' ')}` : ''} <span className="text-slate-500">· {c.status}</span>{c.staff_id ? ' · specific team member' : ''}</p>
                      <p className="text-xs text-slate-600">Makes: {c.all_makes ? 'all' : (c.vehicle_makes || []).join(', ') || 'not stated'} · Power: {(c.powertrains || []).join(', ') || 'not stated'}{c.evidence_credential_id ? ' · evidence attached' : ''}</p>
                      <div className="mt-2 flex gap-2">
                        {c.status !== 'verified' && <Button size="sm" disabled={busy || !notes.trim()} onClick={() => void act(() => providerGovernanceApi.decideCapability(c.id, { decision: 'verify', notes }), 'Service verified.')}>Verify service</Button>}
                        {c.status !== 'revoked' && <Button size="sm" variant="outline" disabled={busy || !notes.trim()} onClick={() => void act(() => providerGovernanceApi.decideCapability(c.id, { decision: 'revoke', notes }), 'Service revoked.')}>Revoke</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="gov-staff">
                <h5 id="gov-staff" className="font-semibold text-sm">Team affiliations</h5>
                {(detail.staff || []).length === 0 && <p className="text-sm text-slate-600">No team members.</p>}
                <ul className="space-y-2 mt-2">
                  {(detail.staff || []).map((s: any) => (
                    <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm flex flex-wrap items-center gap-2">
                      <span className="flex-1 min-w-[140px]">{[s.first_name, s.last_name].filter(Boolean).join(' ') || 'Team member'} · {s.role || 'role not stated'} · <strong>{s.affiliation_status}</strong></span>
                      {s.affiliation_status !== 'ended' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => providerGovernanceApi.endStaff(s.id), 'Affiliation ended; their services were revoked.')}>End affiliation</Button>}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="gov-decision" className="rounded-xl bg-slate-50 p-4 space-y-3">
                <h5 id="gov-decision" className="font-semibold text-sm">Decision</h5>
                <div>
                  <label htmlFor="gov-notes" className="text-sm font-medium block">What you checked (required to verify or approve)</label>
                  <textarea id="gov-notes" className="w-full rounded-lg border border-slate-300 p-2 min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
                </div>
                <div>
                  <label htmlFor="gov-why" className="text-sm font-medium block">Reason (required to reject, suspend or request information)</label>
                  <textarea id="gov-why" className="w-full rounded-lg border border-slate-300 p-2 min-h-[56px]" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={2000} />
                </div>
                <div>
                  <label htmlFor="gov-route" className="text-sm font-medium block">Verification route</label>
                  <select id="gov-route" className="rounded-lg border border-slate-300 px-3 py-2 min-h-[44px] bg-white" value={route} onChange={(e) => setRoute(e.target.value as 'premises' | 'alternative')}>
                    <option value="premises">Premises: published workshop + at least 1 verified credential</option>
                    <option value="alternative">Alternative: registration/tax ID + at least 2 verified pieces of evidence</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.lifecycle_stage !== 'ACTIVE' && p.lifecycle_stage !== 'SUSPENDED' && p.lifecycle_stage !== 'INACTIVE' && (<>
                    <Button disabled={busy || !notes.trim()} onClick={() => void act(() => providerGovernanceApi.decideProvider(p.id, { decision: 'approve', route, notes }), 'Business approved.')}>Approve business</Button>
                    <Button variant="outline" disabled={busy || !why.trim()} onClick={() => void act(() => providerGovernanceApi.decideProvider(p.id, { decision: 'request_info', reason: why }), 'More information requested.')}>Request information</Button>
                    <Button variant="outline" disabled={busy || !why.trim()} onClick={() => void act(() => providerGovernanceApi.decideProvider(p.id, { decision: 'reject', reason: why, notes: notes || undefined }), 'Business rejected.')}>Reject</Button>
                  </>)}
                  {p.lifecycle_stage === 'ACTIVE' && <Button variant="danger" disabled={busy || !why.trim()} onClick={() => void act(() => providerGovernanceApi.decideProvider(p.id, { decision: 'suspend', reason: why }), 'Business suspended. It no longer appears in search or takes new jobs.')}>Suspend</Button>}
                  {p.lifecycle_stage === 'SUSPENDED' && <Button disabled={busy} onClick={() => void act(() => providerGovernanceApi.decideProvider(p.id, { decision: 'reinstate' }), 'Business reinstated.')}>Reinstate</Button>}
                </div>
                <p className="text-xs text-slate-500">You cannot decide your own application. If the business changed while you were reviewing it, the decision is refused and you must reload.</p>
              </section>

              {(detail.history || []).length > 0 && (
                <section aria-labelledby="gov-history">
                  <h5 id="gov-history" className="font-semibold text-sm">Audit trail</h5>
                  <ul className="text-xs text-slate-600 space-y-1 mt-1 max-h-48 overflow-auto">
                    {detail.history.map((h: any) => <li key={h.id}>{String(h.created_at).slice(0, 16).replace('T', ' ')} · {h.entity_type} · {h.from_status || '—'} → {h.to_status}{h.notes ? ` · ${h.notes}` : ''}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
