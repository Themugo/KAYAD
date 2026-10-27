import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  decidePrivateSellerApplication,
  getPrivateSellerApplications,
  type PrivateSellerApplication,
  type SellerDecision,
  type SellerStatus,
} from '../../services/privateSellerCapabilityApi';

const FILTERS: Array<{ value: SellerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All applications' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
];

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const statusTone: Record<string, string> = {
  pending: 'border-warning/30 bg-warning/10 text-warning',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800',
  suspended: 'border-slate-300 bg-slate-200 text-slate-900',
  revoked: 'border-slate-200 bg-slate-100 text-slate-700',
};

export default function AdminPrivateSellerApplications() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<SellerStatus | 'all'>('pending');
  const [applications, setApplications] = useState<PrivateSellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await getPrivateSellerApplications(filter === 'all' ? undefined : filter);
      setApplications(rows);
    } catch (error) {
      // Never keep rows from a previous filter/refresh on screen after a failed load, and never present failure as an empty queue.
      setApplications([]);
      setLoadError(error instanceof Error ? error.message : 'Applications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void reload(); }, [reload]);

  const act = async (application: PrivateSellerApplication, decision: SellerDecision) => {
    const reason = (reasons[application.userId] || '').trim();
    if (['reject', 'suspend', 'revoke'].includes(decision) && !reason) {
      toast('Enter a reason before taking this action.', 'error');
      return;
    }
    const destructive = decision === 'suspend' || decision === 'revoke';
    const detail = destructive
      ? 'This will hide the seller’s currently published, approved listings from public view. Records and ownership will be preserved; listings are restored only if approval is reinstated and they remain eligible.'
      : '';
    if (destructive && !window.confirm(`Confirm ${decision} for ${application.userId}? ${detail}`)) return;
    setBusyUserId(application.userId);
    try {
      const outcome = await decidePrivateSellerApplication(application.userId, decision, reason || undefined);
      toast(`Private-seller application ${({ approve: 'approved', reject: 'rejected', suspend: 'suspended', revoke: 'revoked' } as const)[decision]}.`, 'success');
      // The decision is committed either way; say so honestly if public caches could not be cleared (hidden listings may stay visible until the cache expires).
      if (outcome?.visibility?.changed && outcome.visibility.cacheInvalidated === false) {
        toast('Decision saved, but public listing caches could not be refreshed. Hidden or restored listings may take a few minutes to update publicly.', 'error');
      }
      setReasons((old) => ({ ...old, [application.userId]: '' }));
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The decision could not be saved.', 'error');
      // Phase 13I: a refused decision usually means another administrator changed the application first (stale view). Reload so the
      // row shows the real current state and only the actions valid for it, instead of leaving the stale buttons on screen.
      await reload();
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" aria-labelledby="private-seller-review-title">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#176B87]">Account governance</p>
          <h1 id="private-seller-review-title" className="mt-1 text-2xl font-black text-[#0A3340]">Private-seller applications</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#64748B]">Review private-selling capability for existing personal accounts. Approval does not create a dealer account or remove buyer access.</p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-4 py-2 text-sm font-bold text-[#0A3340] disabled:opacity-60">
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter private-seller applications">
        {FILTERS.map((item) => (
          <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value}
            className={`rounded-full border px-3 py-2 text-xs font-bold ${filter === item.value ? 'border-[#0A3340] bg-[#0A3340] text-white' : 'border-[#D7E7E4] bg-white text-[#0A3340]'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {loadError && <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="font-bold">Could not load applications</p><p>{loadError}</p></div></div>}
      <section className="overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white shadow-sm" aria-label="Application records">
        {loading ? <div className="p-10 text-center text-sm text-[#64748B]" role="status">Loading application records…</div>
          : loadError ? <div className="p-10 text-center text-sm text-[#64748B]">Application records are unavailable. Use Refresh to try again.</div>
          : applications.length === 0 ? <div className="p-10 text-center"><Clock3 className="mx-auto text-[#64748B]" size={28} aria-hidden="true" /><h2 className="mt-3 font-bold text-[#0A3340]">No applications in this view</h2><p className="mt-1 text-sm text-[#64748B]">Try another status filter or refresh the list.</p></div>
          : <div className="divide-y divide-[#E7EFEE]">
            {applications.map((app) => {
              const busy = busyUserId === app.userId;
              return <article key={app.userId} className="p-4 sm:p-5" aria-label={`Application ${app.userId}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-sm font-extrabold text-[#0A3340]">Personal account: {app.userId}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase ${statusTone[app.status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{app.status}</span>
                      <span className="rounded-full bg-[#F1F7F6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#37616A]">{app.source === 'legacy_backfill' ? 'Legacy account' : 'Application'}</span>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div><dt className="text-xs font-bold text-[#64748B]">Contact phone</dt><dd className="mt-1 text-[#0A3340]">{app.contactPhone || 'Not provided'}</dd></div>
                      <div><dt className="text-xs font-bold text-[#64748B]">Submitted</dt><dd className="mt-1 text-[#0A3340]">{formatDate(app.submittedAt)}</dd></div>
                      <div><dt className="text-xs font-bold text-[#64748B]">Last reviewed</dt><dd className="mt-1 text-[#0A3340]">{formatDate(app.reviewedAt)}</dd></div>
                      <div className="sm:col-span-2 xl:col-span-3"><dt className="text-xs font-bold text-[#64748B]">Intended selling activity</dt><dd className="mt-1 whitespace-pre-wrap text-[#0A3340]">{app.intendedUse || 'Not provided'}</dd></div>
                      {app.reviewReason && <div className="sm:col-span-2 xl:col-span-3"><dt className="text-xs font-bold text-[#64748B]">Previous review reason</dt><dd className="mt-1 text-[#0A3340]">{app.reviewReason}</dd></div>}
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                    {['pending', 'rejected', 'suspended', 'revoked'].includes(app.status) && <button type="button" disabled={busy} onClick={() => void act(app, 'approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#047857] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 size={14} aria-hidden="true" /> {app.status === 'pending' ? 'Approve' : 'Restore approval'}</button>}
                    {app.status === 'pending' && <button type="button" disabled={busy} onClick={() => void act(app, 'reject')} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50"><XCircle size={14} aria-hidden="true" /> Reject</button>}
                    {app.status === 'approved' && <><button type="button" disabled={busy} onClick={() => void act(app, 'suspend')} className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 px-3 py-2 text-xs font-bold text-warning disabled:opacity-50"><AlertTriangle size={14} aria-hidden="true" /> Suspend</button><button type="button" disabled={busy} onClick={() => void act(app, 'revoke')} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50"><ShieldCheck size={14} aria-hidden="true" /> Revoke</button></>}
                  </div>
                </div>
                {['pending', 'approved'].includes(app.status) || app.status === 'suspended' ? <div className="mt-4 max-w-2xl"><label htmlFor={`review-reason-${app.userId}`} className="mb-1 block text-xs font-bold text-[#37616A]">Decision reason (required for reject, suspend or revoke)</label><textarea id={`review-reason-${app.userId}`} rows={2} maxLength={500} value={reasons[app.userId] || ''} onChange={(event) => setReasons((old) => ({ ...old, [app.userId]: event.target.value }))} className="w-full rounded-xl border border-[#D7E7E4] px-3 py-2 text-sm text-[#0A3340] outline-none focus:border-[#176B87]" placeholder="Record the reason for this decision" /></div> : null}
                {busy && <p className="mt-3 text-xs font-bold text-[#176B87]" role="status">Saving decision…</p>}
              </article>;
            })}
          </div>}
      </section>
      <p className="mt-4 text-xs leading-relaxed text-[#64748B]">Suspending or revoking a private seller hides their currently public, approved listings through the database lifecycle trigger. Listing records and ownership are retained. Reinstatement restores only listings hidden by this policy that remain eligible. This page does not grant dealer or financial permissions.</p>
    </main>
  );
}
