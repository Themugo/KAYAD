import React, { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { automotiveApi } from '../InspectionMarketplace/services/api';
import type { ServiceTaxonomy } from '../InspectionMarketplace/types/inspection';

interface Props { isOpen: boolean; onClose: () => void }

const field = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm min-h-[44px]';
const reason = (e: any) => e?.response?.data?.message || e?.message || 'The request could not be completed.';

type MyProvider = NonNullable<Awaited<ReturnType<typeof automotiveApi.getMyProvider>>['provider']>;

/**
 * "My business" and "My affiliations". One place for a business owner to see where the application is,
 * declare services (verified later by KAYAD), submit evidence and manage the team; and for any signed-in
 * person to accept an invitation or leave a business. Nothing here can verify anything.
 */
export const ProviderServicesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const uid = useId();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<MyProvider | null>(null);
  const [taxonomy, setTaxonomy] = useState<ServiceTaxonomy | null>(null);
  const [caps, setCaps] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [affs, setAffs] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState({ category: '', makes: '', all: true, powertrains: [] as string[], travels: false, evidence: '' });
  const [creds, setCreds] = useState<any[]>([]);
  const [ev, setEv] = useState({ type: 'business_registration', name: '', issuer: '', number: '', expiry: '' });
  const [evFile, setEvFile] = useState<File | null>(null);
  const [regNo, setRegNo] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [mine, tax, a] = await Promise.all([automotiveApi.getMyProvider(), automotiveApi.getServiceTaxonomy(), automotiveApi.myAffiliations()]);
      setTaxonomy(tax); setAffs(a.affiliations || []);
      setProvider(mine.provider);
      if (mine.provider) {
        const [c, s] = await Promise.all([automotiveApi.listCapabilities(mine.provider.id), automotiveApi.listStaff(mine.provider.id)]);
        setCaps(c.capabilities || []); setStaff(s.staff || []);
      } else { setCaps([]); setStaff([]); }
    } catch (e) { setLoadError(reason(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isOpen) void load(); }, [isOpen, load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: ok }); await load(); }
    catch (e) { setMsg({ kind: 'error', text: reason(e) }); }
    finally { setBusy(false); }
  };

  const catLabel = (code: string) => taxonomy?.categories.find((c) => c.code === code)?.label || code;
  const selected = taxonomy?.categories.find((c) => c.code === cap.category);
  const editable = provider && !['SUSPENDED', 'INACTIVE'].includes(provider.lifecycle_stage);
  const live = provider?.lifecycle_stage === 'ACTIVE';

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title="My business and affiliations" size="lg">
      <div className="space-y-6" aria-busy={loading}>
        {loading && <p className="text-sm text-slate-600" role="status">Loading…</p>}
        {loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{loadError}</p>}
        {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{msg.text}</p>}

        {!loading && !loadError && (
          <>
            <section aria-labelledby={`${uid}-aff`}>
              <h3 id={`${uid}-aff`} className="font-bold text-slate-800">Businesses you work with</h3>
              <p className="text-xs text-slate-500">A business and the person must both confirm an affiliation. A name typed on a profile is not proof.</p>
              {affs.length === 0 && <p className="text-sm text-slate-600 mt-2">None yet. Open a business in the finder and choose “I work here” to ask it to confirm you.</p>}
              <ul className="space-y-2 mt-2">
                {affs.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm flex flex-wrap items-center gap-2">
                    <span className="flex-1 min-w-[160px]"><strong>{a.businessName || 'Business'}</strong> · {a.role || 'role not stated'} · {a.affiliation_status}
                      {a.affiliation_status === 'pending' && (a.provider_confirmed_at && !a.user_confirmed_at ? ' · invited by the business' : ' · waiting for the business')}</span>
                    {a.affiliation_status === 'pending' && a.provider_confirmed_at && !a.user_confirmed_at && <Button size="sm" disabled={busy} onClick={() => void run(() => automotiveApi.acceptAffiliation(a.id), 'Affiliation accepted.')}>Accept</Button>}
                    {a.affiliation_status !== 'ended' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => automotiveApi.leaveAffiliation(a.id), 'You left this business.')}>{a.affiliation_status === 'pending' ? 'Decline' : 'Leave'}</Button>}
                  </li>
                ))}
              </ul>
            </section>

            {!provider && <p className="text-sm text-slate-600">You have not applied to list a business. Use “Apply to list your business” first.</p>}

            {provider && (
              <>
                <section aria-labelledby={`${uid}-status`} className="rounded-xl bg-[#F5F8F8] border border-slate-200 p-4">
                  <h3 id={`${uid}-status`} className="font-bold text-slate-800">{provider.trading_name || provider.company_name}</h3>
                  <p className="text-sm mt-1">Status: <strong>{provider.lifecycle_stage.replace(/_/g, ' ').toLowerCase()}</strong>{provider.verification_route ? ` (${provider.verification_route} route)` : ''}</p>
                  {provider.info_requested && <p className="text-sm mt-1 text-amber-900">KAYAD asked for: {provider.info_requested}</p>}
                  {provider.rejection_reason && <p className="text-sm mt-1 text-rose-800">Not approved: {provider.rejection_reason}</p>}
                  {provider.suspended_reason && <p className="text-sm mt-1 text-rose-800">Suspended: {provider.suspended_reason}. You are not listed and cannot take new jobs.</p>}
                  {!live && <p className="text-xs text-slate-500 mt-2">You are not listed until a KAYAD administrator approves the business. Services you declare stay “declared” until each is verified.</p>}
                </section>

                {editable && !live && (
                  <section aria-labelledby={`${uid}-reg`}>
                    <h3 id={`${uid}-reg`} className="font-bold text-slate-800">Business identity</h3>
                    <p className="text-xs text-slate-500">Needed for the evidence-based route when you have no customer-facing premises. Current: {provider.registration_number || 'none supplied'}.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <label htmlFor={`${uid}-regno`} className="sr-only">Business registration or tax number</label>
                      <input id={`${uid}-regno`} className={`${field} sm:w-72`} placeholder="Registration or tax number" value={regNo} onChange={(e) => setRegNo(e.target.value)} maxLength={60} />
                      <Button size="sm" disabled={busy || !regNo.trim()} onClick={() => void run(() => automotiveApi.updateProviderProfile(provider.id, { registration_number: regNo.trim() }), 'Registration number saved.')}>Save</Button>
                    </div>
                  </section>
                )}

                {editable && (
                  <section aria-labelledby={`${uid}-ev`}>
                    <h3 id={`${uid}-ev`} className="font-bold text-slate-800">Evidence</h3>
                    <p className="text-xs text-slate-500">Upload certificates, registrations or licences. KAYAD reviews each one; an expired or document-less item cannot be verified. Business documents do not certify individual staff.</p>
                    <div className="grid sm:grid-cols-2 gap-2 mt-2">
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-etype`}>Type</label>
                        <select id={`${uid}-etype`} className={field} value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value })}>
                          <option value="business_registration">Business registration</option><option value="tax_certificate">Tax certificate</option><option value="trade_licence">Trade licence</option>
                          <option value="technical_qualification">Technical qualification</option><option value="hv_safety_certificate">High-voltage safety certificate</option><option value="insurance">Insurance</option><option value="other">Other</option>
                        </select></div>
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-ename`}>Title</label><input id={`${uid}-ename`} className={field} value={ev.name} onChange={(e) => setEv({ ...ev, name: e.target.value })} maxLength={160} /></div>
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-eiss`}>Issued by</label><input id={`${uid}-eiss`} className={field} value={ev.issuer} onChange={(e) => setEv({ ...ev, issuer: e.target.value })} maxLength={160} /></div>
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-enum`}>Number</label><input id={`${uid}-enum`} className={field} value={ev.number} onChange={(e) => setEv({ ...ev, number: e.target.value })} maxLength={80} /></div>
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-eexp`}>Expiry date</label><input id={`${uid}-eexp`} type="date" className={field} value={ev.expiry} onChange={(e) => setEv({ ...ev, expiry: e.target.value })} /></div>
                      <div><label className="text-xs font-bold block" htmlFor={`${uid}-efile`}>Document</label><input id={`${uid}-efile`} type="file" accept="image/*,application/pdf" className={field} onChange={(e) => setEvFile(e.target.files?.[0] || null)} /></div>
                    </div>
                    <Button className="mt-2" size="sm" disabled={busy || !ev.name.trim() || !evFile} onClick={() => void run(async () => {
                      const url = await automotiveApi.uploadEvidence(evFile as File);
                      const created = await automotiveApi.addCredential(provider.id, { type: ev.type, name: ev.name.trim(), issuingBody: ev.issuer.trim() || undefined, certificateNumber: ev.number.trim() || undefined, expiryDate: ev.expiry || undefined, documentUrl: url });
                      setCreds((c) => [...c, created]); setEv({ ...ev, name: '', issuer: '', number: '', expiry: '' }); setEvFile(null);
                    }, 'Evidence submitted for review. It is not verified until an administrator decides.')}>Submit evidence</Button>
                    {creds.length > 0 && <ul className="mt-2 text-xs text-slate-600 space-y-1">{creds.map((c) => <li key={c.id}>Submitted: {c.title} (unverified)</li>)}</ul>}
                  </section>
                )}

                <section aria-labelledby={`${uid}-caps`}>
                  <h3 id={`${uid}-caps`} className="font-bold text-slate-800">Services</h3>
                  {caps.length === 0 && <p className="text-sm text-slate-600 mt-1">No services declared.</p>}
                  <ul className="space-y-1 mt-1">
                    {caps.map((c) => (
                      <li key={c.id} className="text-sm flex flex-wrap gap-2 items-center">
                        <strong>{catLabel(c.category_code)}</strong>
                        <span className={`text-xs rounded-full px-2 py-0.5 border ${c.status === 'verified' ? 'bg-[#E7F7F4] border-[#13B8A6]' : c.status === 'revoked' ? 'bg-rose-50 border-rose-300' : 'border-slate-300'}`}>{c.status === 'verified' ? 'verified by KAYAD' : c.status === 'revoked' ? 'revoked' : 'declared, not verified'}</span>
                        <span className="text-xs text-slate-500">{c.all_makes ? 'all makes' : (c.vehicle_makes || []).join(', ') || 'makes not stated'}</span>
                      </li>
                    ))}
                  </ul>
                  {editable && (
                    <div className="mt-3 rounded-xl border border-slate-200 p-3 space-y-2">
                      <label className="text-xs font-bold block" htmlFor={`${uid}-cat`}>Add or update a service</label>
                      <select id={`${uid}-cat`} className={field} value={cap.category} onChange={(e) => setCap({ ...cap, category: e.target.value })}>
                        <option value="">Choose…</option>
                        {(taxonomy?.categories || []).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      {selected?.highRisk && <p className="text-xs text-amber-900">High-voltage work is listed only after KAYAD verifies a qualification. Submit that evidence above, then select it here.</p>}
                      {selected?.highRisk && (
                        <div><label className="text-xs font-bold block" htmlFor={`${uid}-evid`}>Qualification evidence</label>
                          <select id={`${uid}-evid`} className={field} value={cap.evidence} onChange={(e) => setCap({ ...cap, evidence: e.target.value })}>
                            <option value="">Choose a submitted credential…</option>
                            {creds.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select></div>
                      )}
                      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" className="w-4 h-4" checked={cap.all} onChange={(e) => setCap({ ...cap, all: e.target.checked })} /> I work on all makes</label>
                      {!cap.all && <input aria-label="Makes you work on, comma separated" className={field} placeholder="Toyota, Subaru…" value={cap.makes} onChange={(e) => setCap({ ...cap, makes: e.target.value })} />}
                      <fieldset className="flex flex-wrap gap-3"><legend className="text-xs font-bold">Power types (optional)</legend>
                        {(taxonomy?.powertrains || []).map((p) => <label key={p.code} className="text-sm flex items-center gap-1 min-h-[32px]"><input type="checkbox" checked={cap.powertrains.includes(p.code)} onChange={(e) => setCap({ ...cap, powertrains: e.target.checked ? [...cap.powertrains, p.code] : cap.powertrains.filter((x) => x !== p.code) })} />{p.label}</label>)}
                      </fieldset>
                      {selected?.travelsToCustomer && <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" className="w-4 h-4" checked={cap.travels} onChange={(e) => setCap({ ...cap, travels: e.target.checked })} /> I travel to the vehicle</label>}
                      <Button size="sm" disabled={busy || !cap.category} onClick={() => void run(() => automotiveApi.declareCapability(provider.id, {
                        category: cap.category, allMakes: cap.all, vehicleMakes: cap.all ? [] : cap.makes.split(',').map((m) => m.trim()).filter(Boolean),
                        powertrains: cap.powertrains, travelsToCustomer: cap.travels, evidenceCredentialId: cap.evidence || null,
                      }), 'Service saved as declared. Changing a verified service sends it back for review.')}>Save service</Button>
                    </div>
                  )}
                </section>

                <section aria-labelledby={`${uid}-team`}>
                  <h3 id={`${uid}-team`} className="font-bold text-slate-800">Team</h3>
                  {!live && <p className="text-xs text-slate-500">You can add staff once your business is approved.</p>}
                  <ul className="space-y-2 mt-1">
                    {staff.map((s) => (
                      <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm flex flex-wrap items-center gap-2">
                        <span className="flex-1 min-w-[160px]">{[s.first_name, s.last_name].filter(Boolean).join(' ') || 'Team member'} · {s.role || 'role not stated'} · <strong>{s.affiliation_status}</strong>
                          {s.affiliation_status === 'pending' && (s.user_confirmed_at && !s.provider_confirmed_at ? ' · asked to join' : ' · invited, waiting for them')}</span>
                        {s.affiliation_status === 'pending' && s.user_confirmed_at && !s.provider_confirmed_at && <Button size="sm" disabled={busy || !live} onClick={() => void run(() => automotiveApi.confirmStaff(provider.id, s.id), 'Team member confirmed.')}>Confirm</Button>}
                        {s.affiliation_status !== 'ended' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => automotiveApi.endStaff(provider.id, s.id), 'Affiliation ended. Their services were removed.')}>{s.affiliation_status === 'pending' ? 'Decline' : 'Remove'}</Button>}
                      </li>
                    ))}
                  </ul>
                  {live && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <label htmlFor={`${uid}-inv`} className="sr-only">Email of a KAYAD account to invite</label>
                      <input id={`${uid}-inv`} type="email" className={`${field} sm:w-72`} placeholder="Email of their KAYAD account" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      <Button size="sm" disabled={busy || !inviteEmail.trim()} onClick={() => void run(async () => { await automotiveApi.inviteStaff(provider.id, inviteEmail.trim(), 'mechanic'); setInviteEmail(''); }, 'Invitation sent. They must accept before they count as part of your team.')}>Invite</Button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">Confirming someone proves a working relationship. It does not certify their qualifications; qualifications are verified separately.</p>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ProviderServicesModal;
