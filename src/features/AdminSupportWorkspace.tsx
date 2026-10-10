import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Send, Lock } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import {
  getStaffCase, getStaffMetrics, getStaffQueue, getStaffTeam, staffReplyToCase, staffUpdateCase,
  SupportApiError, StaffCase, StaffCaseSummary, StaffPerson, SupportMetrics,
} from '../services/supportApi';

// Mirrors backend supportPolicy transitions; the server is authoritative and re-validates every change.
const NEXT: Record<string, string[]> = {
  open: ['in_progress', 'waiting_on_user', 'waiting_on_internal', 'escalated', 'resolved'],
  in_progress: ['waiting_on_user', 'waiting_on_internal', 'escalated', 'resolved'],
  waiting_on_user: ['in_progress', 'waiting_on_internal', 'escalated', 'resolved'],
  waiting_on_internal: ['in_progress', 'waiting_on_user', 'escalated', 'resolved'],
  escalated: ['in_progress', 'waiting_on_user', 'waiting_on_internal', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: [],
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', waiting_on_user: 'Waiting on customer', waiting_on_internal: 'Waiting on internal',
  escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed',
};
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const when = (v?: string | null) => (v ? new Date(v).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const mins = (m: number | null | undefined) => (m == null ? 'No data' : m >= 120 ? `${(m / 60).toFixed(1)} h` : `${m} min`);

const errText = (e: unknown, fallback: string) => (e instanceof SupportApiError ? (e.kind === 'forbidden' ? 'You do not have access to support cases.' : e.message) : fallback);

export const AdminSupportWorkspace: React.FC = () => {
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [rows, setRows] = useState<StaffCaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [team, setTeam] = useState<StaffPerson[]>([]);
  const [filters, setFilters] = useState({ status: 'active', priority: '', category: '', assignedTo: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<StaffCase | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [capability, setCapability] = useState<'agent' | 'oversight'>('agent');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, m] = await Promise.all([getStaffQueue({ ...filters, limit: 50 }), getStaffMetrics(30)]);
      setRows(q.cases); setTotal(q.total); setCapability(q.capability === 'oversight' ? 'oversight' : 'agent'); setMetrics(m.metrics); setForbidden(false);
    } catch (e) {
      if (e instanceof SupportApiError && e.kind === 'forbidden') setForbidden(true);
      setError(errText(e, 'Unable to load the support queue.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { getStaffTeam().then((r) => setTeam(r.staff)).catch(() => setTeam([])); }, []);

  const open = async (id: string, why?: string) => {
    setReply(''); setInternal(false); setNextStatus(''); setResolution(''); setDetailError(null);
    if (capability === 'oversight' && !why) { setSelected(null); setPendingId(id); setReason(''); return; }
    setDetailBusy(true); setPendingId(null);
    try { setSelected((await getStaffCase(id, why)).case); } catch (e) { setDetailError(errText(e, 'Unable to load this case.')); } finally { setDetailBusy(false); }
  };

  const apply = async (fn: () => Promise<{ case: StaffCase }>, ok?: () => void) => {
    setDetailBusy(true); setDetailError(null);
    try { setSelected((await fn()).case); ok?.(); void load(); } catch (e) { setDetailError(errText(e, 'The change could not be saved.')); } finally { setDetailBusy(false); }
  };

  const options = useMemo(() => (selected ? NEXT[selected.status] || [] : []), [selected]);

  if (forbidden) return <Card className="p-6 text-sm text-[#64748B]"><Lock className="w-4 h-4 inline mr-2" />Your role does not include customer support access.</Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Open backlog', metrics?.openBacklog],
          ['Unassigned', metrics?.unassignedOpen],
          ['Awaiting first reply', metrics?.awaitingFirstResponse],
          ['Median first reply', metrics ? mins(metrics.medianFirstResponseMinutes) : undefined],
          ['Median resolution', metrics ? mins(metrics.medianResolutionMinutes) : undefined],
          ['Avg rating', metrics ? (metrics.averageRating ?? 'No ratings') : undefined],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</p><p className="mt-1 text-lg font-black text-[#0A3340]">{value ?? '…'}</p></Card>
        ))}
      </div>
      {metrics && <p className="text-[11px] text-[#64748B]">Last {metrics.windowDays} days · {metrics.total} cases · {metrics.slaConfigured ? `Within first-reply target: ${metrics.firstResponseWithinTarget ?? 'n/a'}` : 'No response targets are configured, so no target compliance is reported.'}</p>}

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs font-bold text-[#64748B]">Status
            <select className="mt-1 block rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="active">Active</option><option value="">All</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
          <label className="text-xs font-bold text-[#64748B]">Priority
            <select className="mt-1 block rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">Any</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select></label>
          <label className="text-xs font-bold text-[#64748B]">Assignee
            <select className="mt-1 block rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={filters.assignedTo} onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}>
              <option value="">Anyone</option><option value="unassigned">Unassigned</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name || t.id.slice(0, 8)}</option>)}
            </select></label>
          <label className="text-xs font-bold text-[#64748B]">Case number
            <input className="mt-1 block rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="SUP-2026…" /></label>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D7E7E4] text-xs font-bold text-[#64748B]">{total} case{total === 1 ? '' : 's'}</div>
          <ul>
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => void open(r.id)} className={`w-full text-left px-4 py-3 border-b border-[#D7E7E4] hover:bg-[#F6FAF9] ${selected?.id === r.id ? 'bg-[#F6FAF9]' : ''}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold tracking-wider text-[#176B87]">{r.ticketNumber}</span>
                    <span className="flex gap-1">{r.awaitingStaff && <Badge variant="warning">Needs reply</Badge>}<Badge variant="neutral">{STATUS_LABEL[r.status] || r.status}</Badge></span></div>
                  <p className="mt-1 text-sm font-bold text-[#0A3340] truncate">{r.subject}</p>
                  <p className="mt-0.5 text-[11px] text-[#64748B]">{r.customer?.name || 'Customer'} · {r.priority} · {r.assignedTo?.name || 'Unassigned'} · {when(r.createdAt)}</p>
                </button>
              </li>
            ))}
            {!rows.length && !loading && <li className="px-4 py-8 text-center text-xs text-[#64748B]">No cases match these filters.</li>}
            {loading && <li className="px-4 py-8 text-center text-xs text-[#64748B]"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</li>}
          </ul>
        </Card>

        <Card className="p-4">
          {capability === 'oversight' && <p className="mb-3 rounded-lg border border-[#D7E7E4] bg-[#F6FAF9] p-2 text-[11px] text-[#64748B]"><Lock className="w-3 h-3 inline mr-1" />Oversight access is read-only. Internal notes are hidden, and each case you open is recorded with your stated reason.</p>}
          {pendingId && !selected && (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void open(pendingId, reason.trim()); }}>
              <label htmlFor="support-oversight-reason" className="text-xs font-bold text-[#64748B]">Reason for opening this case (10–300 characters, recorded)</label>
              <textarea id="support-oversight-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" />
              <Button size="sm" variant="primary" type="submit" disabled={detailBusy || reason.trim().length < 10}>Open case read-only</Button>
            </form>
          )}
          {!selected && !pendingId && !detailBusy && <p className="text-sm text-[#64748B]">Select a case to read the thread, reply, or change its status.</p>}
          {detailBusy && !selected && <p className="text-xs text-[#64748B]"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</p>}
          {detailError && <p className="mb-3 text-xs font-semibold text-rose-700" role="alert">{detailError}</p>}
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-[#176B87]">{selected.ticketNumber} · {selected.category}</p>
                <h3 className="text-base font-black text-[#0A3340]">{selected.subject}</h3>
                <p className="text-[11px] text-[#64748B]">Customer: {selected.customer?.name || 'Unknown'} · Opened {when(selected.createdAt)}{selected.reopenCount ? ` · reopened ${selected.reopenCount}×` : ''}</p>
                {selected.references.length > 0 && <p className="mt-1 text-[11px] text-[#64748B]">Linked: {selected.references.map((r) => `${r.kind} ${r.id}`).join(', ')}</p>}
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3 text-sm text-[#12576D]">{selected.description}</p>
              </div>

              <ul className="space-y-2 max-h-72 overflow-auto">
                {selected.messages.map((m, i) => (
                  <li key={m.id || i} className={`rounded-xl border p-3 text-sm ${m.internal ? 'border-[#BDE5DE] bg-[#F3FAF9]' : m.kind === 'staff' ? 'border-[#D7E7E4] bg-[#F6FAF9]' : 'border-[#D7E7E4]'}`}>
                    <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]"><span>{m.internal ? 'Internal note' : m.kind === 'staff' ? `Staff${m.senderName ? ` · ${m.senderName}` : ''}` : 'Customer'}</span><span>{when(m.createdAt)}</span></div>
                    <p className="mt-1 whitespace-pre-wrap text-[#12576D]">{m.content}</p>
                  </li>
                ))}
              </ul>

              {selected.status !== 'closed' && !selected.readOnly && (
                <div>
                  <textarea aria-label="Reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={internal ? 'Internal note (never shown to the customer)…' : 'Reply to the customer…'} className={`w-full rounded-xl border px-3 py-2 text-sm ${internal ? 'border-[#BDE5DE] bg-[#F3FAF9]' : 'border-[#D7E7E4]'}`} />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs font-bold text-[#64748B]"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note only</label>
                    <Button size="sm" variant="primary" disabled={detailBusy || !reply.trim()} onClick={() => void apply(() => staffReplyToCase(selected.id, reply.trim(), internal), () => setReply(''))}><Send className="w-3.5 h-3.5" /> {internal ? 'Add note' : 'Send reply'}</Button>
                  </div>
                </div>
              )}

              {!selected.readOnly && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[#D7E7E4] pt-3">
                <label className="text-xs font-bold text-[#64748B]">Assign to
                  <select className="mt-1 block w-full rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={selected.assignedTo?.id || ''} disabled={detailBusy || selected.status === 'closed'}
                    onChange={(e) => void apply(() => staffUpdateCase(selected.id, { assignedTo: e.target.value || null, expectedVersion: selected.rowVersion }))}>
                    <option value="">Unassigned</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name || t.id.slice(0, 8)} ({t.role})</option>)}
                  </select></label>
                <label className="text-xs font-bold text-[#64748B]">Priority
                  <select className="mt-1 block w-full rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={selected.priority} disabled={detailBusy || selected.status === 'closed'}
                    onChange={(e) => void apply(() => staffUpdateCase(selected.id, { priority: e.target.value, expectedVersion: selected.rowVersion }))}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
                <label className="text-xs font-bold text-[#64748B]">Change status
                  <select className="mt-1 block w-full rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" value={nextStatus} disabled={detailBusy || !options.length} onChange={(e) => setNextStatus(e.target.value)}>
                    <option value="">{STATUS_LABEL[selected.status]} (current)</option>{options.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}</select></label>
                {nextStatus === 'resolved' && (
                  <label className="text-xs font-bold text-[#64748B] sm:col-span-2">Resolution note (internal, required)
                    <textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#D7E7E4] px-2 py-2 text-sm" /></label>
                )}
                {nextStatus && (
                  <div className="sm:col-span-2"><Button size="sm" variant="primary" disabled={detailBusy || (nextStatus === 'resolved' && !resolution.trim())}
                    onClick={() => void apply(() => staffUpdateCase(selected.id, { status: nextStatus, resolutionNote: resolution.trim() || undefined, expectedVersion: selected.rowVersion }), () => { setNextStatus(''); setResolution(''); })}>Apply status change</Button></div>
                )}
              </div>}
              {selected.rating != null && <p className="text-xs text-[#64748B]">Customer rating: <strong>{selected.rating}/5</strong>{selected.ratingComment ? ` — “${selected.ratingComment}”` : ''}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminSupportWorkspace;
