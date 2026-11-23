import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';

/**
 * Ask KAYARD KE about one specific vehicle (a feature, a change, a correction). It becomes a support case linked to the vehicle.
 * A request is not an approval: nothing on the listing changes until KAYARD KE replies, and there is no pricing or automatic grant.
 */
type Row = { id: string; ticketNumber?: string; subject: string; status: string; createdAt: string };
const STATUS_LABEL: Record<string, string> = { open: 'Received', in_progress: 'Being reviewed', waiting_on_user: 'Waiting for you', waiting_on_internal: 'Being reviewed', escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed' };
const TYPES: Array<[string, string]> = [['feature', 'Feature request'], ['change', 'Change request'], ['correction', 'Listing correction'], ['other', 'Other']];
const PREFIX = '[Vehicle request] ';

export default function VehicleRequestsPanel({ vehicles }: { vehicles: Array<{ id: string; title?: string; brand?: string; model?: string; year?: number | string }> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('feature');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadFailed(false);
    try { const body = await dealerApi.getVehicleRequests(); setRows(body?.data?.items ?? []); } catch { setLoadFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (!vehicleId) { setMsg({ ok: false, text: 'Choose the vehicle this is about.' }); return; }
    setBusy(true);
    try {
      const body = await dealerApi.createVehicleRequest({ vehicleId, type, title: title.trim(), details: details.trim() });
      setMsg({ ok: true, text: body?.data?.note || 'Request sent to KAYARD KE.' }); setTitle(''); setDetails(''); await load();
    } catch (err: any) {
      const code = err?.response?.status;
      setMsg({ ok: false, text: code === 403 ? 'You do not have permission to raise vehicle requests.' : code === 429 ? 'Too many requests. Wait a minute and try again.' : err?.response?.data?.message || 'Could not send the request. Please try again.' });
    } finally { setBusy(false); }
  };
  const label = (v: { title?: string; brand?: string; model?: string; year?: number | string }) => v.title || [v.year, v.brand, v.model].filter(Boolean).join(' ') || 'Vehicle';

  return (
    <details className="mt-6 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 sm:p-4" data-testid="vehicle-requests" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="min-h-11 cursor-pointer list-none py-2 font-bold text-[#0A3340]">Request something for a vehicle <span className="ml-1 text-sm font-medium text-[#475569]">(feature, change or correction — reviewed by KAYARD KE)</span></summary>
      {open && <>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#0A3340]">Vehicle
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D7E7E4] bg-white px-2 font-normal">
            <option value="">Choose a vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-[#0A3340]">Type
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D7E7E4] bg-white px-2 font-normal">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="text-sm font-semibold text-[#0A3340] sm:col-span-2">Short title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border border-[#D7E7E4] bg-white px-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-[#0A3340] sm:col-span-2">What do you need?
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[#D7E7E4] bg-white p-2 font-normal" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176B87] px-4 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Send request</button>
          <p className="mt-2 text-xs text-[#475569]">A request is not an approval. Nothing on your listing changes until KAYARD KE replies.</p>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-2 rounded-lg border p-2 text-sm ${msg.ok ? 'border-[#B8DDD8] bg-[#EEF8F6] text-[#0A3340]' : 'border-[#FDA29B] bg-[#FEF3F2] text-[#7A271A]'}`}>{msg.text}</p>}
        </div>
      </form>
      <div className="mt-4">
        <p className="mb-2 text-sm font-bold text-[#0A3340]">Your requests</p>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#176B87]" aria-label="Loading requests" /> : loadFailed ? <p className="text-sm text-[#475569]">Could not load your requests. <button type="button" onClick={load} className="font-semibold text-[#176B87] underline">Try again</button></p> : rows.length === 0 ? <p className="text-sm text-[#475569]">No requests yet.</p> : (
          <ul className="divide-y divide-[#E1EDEB] rounded-lg bg-white">{rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate font-semibold text-[#0A3340]">{r.subject.startsWith(PREFIX) ? r.subject.slice(PREFIX.length) : r.subject}</span><span className="rounded-full bg-[#DDF4F0] px-2.5 py-0.5 text-xs font-bold text-[#12576D]">{STATUS_LABEL[r.status] || r.status}</span></li>)}</ul>
        )}
      </div>
      </>}
    </details>
  );
}
