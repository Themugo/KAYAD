import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as dealerApi from '../../../../services/dealerPlatformApi';
import { actionError, btnCls, inputCls, primaryBtnCls } from './teamShared';
const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const DUTY_LABELS: Record<string, string> = {
  canListCars: 'Add vehicles', canEditCars: 'Edit vehicles and photos', canDeleteCars: 'Remove vehicles', canViewEarnings: 'View earnings and finance summaries',
  canApproveDeals: 'Approve deals', canChatBuyers: 'Handle enquiries and reply to buyers',
};
const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Props { memberId: string; memberName: string; onChanged: () => void }

/** Lend extra duties for a limited time without changing the role. The server enforces limits, who may grant what, and expiry. */
export default function TemporaryDuties({ memberId, memberName, onChanged }: Props) {
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [expires, setExpires] = useState(() => localInput(new Date(Date.now() + 7 * 86400000)));
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r: any = await dealerApi.getTemporaryDuties(memberId); setData(r?.data || null); setLoadError(null); }
    catch (err) { setLoadError(actionError(err)); }
  }, [memberId]);
  useEffect(() => { void load(); }, [load]);

  const toggle = (k: string) => { setReviewing(false); setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); };
  const roleKeys: string[] = data?.rolePermissions || [];
  const addedNow = picked.filter((k) => !roleKeys.includes(k));
  const expiryDate = new Date(expires);
  const expiryOk = !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() > Date.now();

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const res: any = await dealerApi.createTemporaryDuty(memberId, { permissions: picked, expiresAt: expiryDate.toISOString(), reason: reason.trim() || undefined });
      if (res?.success === false) { setError(res.message || 'Could not lend these duties.'); return; }
      setNotice(`${memberName} can now ${addedNow.map((k) => (DUTY_LABELS[k] || k).toLowerCase()).join(', ') || 'use the selected duties'} until ${fmtDate(expiryDate.toISOString())}. Their role has not changed.`);
      setPicked([]); setReason(''); setReviewing(false); await load(); onChanged();
    } catch (err) { setError(actionError(err)); } finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { await dealerApi.revokeTemporaryDuty(memberId, id); setNotice('Temporary duty revoked. Their role is unchanged.'); await load(); onChanged(); }
    catch (err) { setError(actionError(err)); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-[#D7E7E4] p-3 space-y-3" data-testid="temporary-duties">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Temporary duties</h4>
        <p className="text-xs text-[#475569]">Lend specific duties for a limited time — for example to cover leave — without promoting {memberName}. They end automatically at the expiry you choose. Team management and dealership settings can never be lent.</p>
      </div>
      {loadError && <p role="alert" className="text-sm text-[#7A271A]">{loadError}</p>}
      {!data && !loadError && <p className="text-sm text-[#64748B]">Loading…</p>}
      {data && (
        <>
          {(data.grants || []).length > 0 && (
            <ul className="space-y-1" aria-label="Temporary duties history" data-testid="duty-history">
              {data.grants.map((g: any) => (
                <li key={g.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.state === 'active' ? 'bg-emerald-100 text-emerald-900' : g.state === 'scheduled' ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-700'}`}>{g.state}</span>
                  <span className="text-[#0A3340]">{g.permissions.map((k: string) => DUTY_LABELS[k] || k).join(', ')}</span>
                  <span className="text-xs text-[#475569]">until {fmtDate(g.expiresAt)}{g.reason ? ` · ${g.reason}` : ''}</span>
                  {(g.state === 'active' || g.state === 'scheduled') && <button type="button" className={`${btnCls} ml-auto`} disabled={busy} onClick={() => revoke(g.id)} aria-label={`Revoke temporary duty ending ${fmtDate(g.expiresAt)}`}>Revoke</button>}
                </li>
              ))}
            </ul>
          )}
          <fieldset className="space-y-2" disabled={busy}>
            <legend className="text-xs font-medium text-[#0A3340]">Duties to lend</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {(data.catalogue || []).map((k: string) => (
                <label key={k} className={`flex min-h-10 items-center gap-2 text-sm ${roleKeys.includes(k) ? 'text-[#94A3B8]' : 'text-[#0A3340]'}`}>
                  <input type="checkbox" className="h-4 w-4" checked={picked.includes(k)} disabled={roleKeys.includes(k)} onChange={() => toggle(k)} />
                  {DUTY_LABELS[k] || k}{roleKeys.includes(k) ? ' (already in their role)' : ''}
                </label>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label htmlFor={`duty-exp-${memberId}`} className="block text-xs font-medium text-[#0A3340] mb-1">Ends on (required, up to {data.maxDays} days)</label>
                <input id={`duty-exp-${memberId}`} type="datetime-local" className={inputCls} value={expires} onChange={(e) => { setReviewing(false); setExpires(e.target.value); }} /></div>
              <div><label htmlFor={`duty-reason-${memberId}`} className="block text-xs font-medium text-[#0A3340] mb-1">Note for the record (optional)</label>
                <input id={`duty-reason-${memberId}`} className={inputCls} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Covering inventory during leave" /></div>
            </div>
          </fieldset>
          {!expiryOk && picked.length > 0 && <p role="alert" className="text-xs text-[#7A271A]">Choose an end time in the future.</p>}
          {reviewing && addedNow.length > 0 && (
            <div role="status" className="rounded-lg bg-[#F3FAF9] p-3 text-sm text-[#0A3340]" data-testid="duty-review">
              <p className="font-semibold">Review the change</p>
              <p>Adds: {addedNow.map((k) => DUTY_LABELS[k] || k).join(', ')}.</p>
              <p>Ends {fmtDate(expiryDate.toISOString())}. {memberName}'s role stays the same and nothing else changes.</p>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-[#7A271A]">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
          <div className="flex gap-2">
            {!reviewing
              ? <button type="button" className={btnCls} disabled={busy || addedNow.length === 0 || !expiryOk} onClick={() => setReviewing(true)}>Review change</button>
              : <button type="button" className={primaryBtnCls} disabled={busy} aria-busy={busy} onClick={submit}>{busy ? <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden="true" /> : null} Lend duties</button>}
          </div>
        </>
      )}
    </div>
  );
}
