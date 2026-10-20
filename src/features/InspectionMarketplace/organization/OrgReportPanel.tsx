import React, { useMemo, useState } from 'react';
import organizationApi, { type OrgSummary } from '../services/organizationApi';
import { STATUS_LABEL, ROLE_LABEL, orgWide } from './orgAccess';
import { Loading, ErrorBox, Empty, field, btnPrimary, money, useLoader } from './orgUi';

const nairobiToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
const TYPE_LABEL: Record<string, string> = { inspection_payment: 'Inspection payments', commission: 'Platform commission', refund: 'Refunds', payout: 'Payouts', adjustment: 'Adjustments' };

/** Consolidated reporting. Each section appears only if the server returned it for this person's role, and every figure is the
 *  server's: nothing is computed, estimated or defaulted on the client. */
export const OrgReportPanel: React.FC<{ org: OrgSummary }> = ({ org }) => {
  const today = nairobiToday();
  const [range, setRange] = useState({ from: `${today.slice(0, 8)}01`, to: today, branchId: '' });
  const [applied, setApplied] = useState(range);
  const branches = useLoader(() => organizationApi.listBranches(org.id), [org.id]);
  const rep = useLoader(() => organizationApi.report(org.id, { from: applied.from, to: applied.to, branchId: applied.branchId || undefined }), [org.id, applied.from, applied.to, applied.branchId]);
  const bName = useMemo(() => { const m = new Map((branches.data?.branches ?? []).map((b) => [b.id, b.name])); return (id: string | null) => (id ? m.get(id) || 'Branch' : 'Not routed to a branch'); }, [branches.data]);
  const invalid = range.from > range.to;
  const r = rep.data;
  const byBranch = useMemo(() => {
    const m = new Map<string | null, Record<string, number>>();
    for (const x of r?.bookings_by_branch_status ?? []) { const row = m.get(x.branch_id) || {}; row[x.status] = (row[x.status] || 0) + x.count; m.set(x.branch_id, row); }
    return [...m.entries()];
  }, [r]);

  return (
    <section aria-labelledby="org-report" className="space-y-4">
      <div>
        <h2 id="org-report" className="text-lg font-bold text-[#0A3340]">Report</h2>
        <p className="text-sm text-[#64748B]">Consolidated across {org.you.role === 'branch_manager' ? 'your branch' : 'branches'}. Each booking and each payment is counted once. Dates are in East Africa time.</p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!invalid) setApplied(range); }}>
        <div><label className="text-xs font-bold block" htmlFor="rp-from">From</label><input id="rp-from" type="date" className={field} value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div><label className="text-xs font-bold block" htmlFor="rp-to">To</label><input id="rp-to" type="date" className={field} value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        {(orgWide(org.you.role) || org.you.role === 'finance') ? (
          <div><label className="text-xs font-bold block" htmlFor="rp-branch">Branch</label>
            <select id="rp-branch" className={`${field} sm:w-56`} value={range.branchId} onChange={(e) => setRange({ ...range, branchId: e.target.value })}>
              <option value="">All branches</option>{(branches.data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        ) : null}
        <button type="submit" className={btnPrimary} disabled={invalid || rep.loading}>{rep.loading ? 'Loading…' : 'Update report'}</button>
        {invalid && <p role="alert" className="text-sm text-rose-800">The start date must not be after the end date.</p>}
      </form>
      {rep.loading && !r ? <Loading label="Building report…" /> : rep.error ? <ErrorBox error={rep.error} what="the report" onRetry={rep.reload} /> : r && (
        <div className="space-y-6" aria-busy={rep.loading}>
          <p className="text-xs text-[#64748B]">Period {r.period.from} to {r.period.to}.</p>
          {r.inspections && (
            <dl className="grid gap-3 sm:grid-cols-3">
              {([['Completed', r.inspections.completed], ['Outstanding', r.inspections.outstanding], ['Cancelled or no-show', r.inspections.cancelled_or_no_show]] as const).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><dt className="text-xs font-bold text-[#64748B]">{k}</dt><dd className="mt-1 text-2xl font-black text-[#12576D]">{v}</dd></div>))}
            </dl>
          )}
          {r.bookings_by_branch_status && (byBranch.length === 0 ? <Empty title="No bookings in this period" /> : (
            <div className="overflow-x-auto rounded-xl border border-[#D7E7E4] bg-white"><table className="min-w-full text-sm">
              <caption className="p-3 text-left font-bold text-[#0A3340]">Bookings by branch</caption>
              <thead><tr className="text-left text-xs text-[#64748B]"><th scope="col" className="p-3">Branch</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3 text-right">Bookings</th></tr></thead>
              <tbody>{byBranch.flatMap(([id, st]) => Object.entries(st).map(([s, n]) => <tr key={`${id}-${s}`} className="border-t border-[#EEF7F5]"><th scope="row" className="p-3 text-left font-medium">{bName(id)}</th><td className="p-3">{STATUS_LABEL[s] || s}</td><td className="p-3 text-right tabular-nums">{n}</td></tr>))}</tbody>
            </table></div>))}
          {r.report_quality && (
            <div className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm"><h3 className="font-bold text-[#0A3340]">Report quality</h3>
              <p className="mt-1 text-[#475569]">{r.report_quality.reports} report{r.report_quality.reports === 1 ? '' : 's'} issued · {r.report_quality.with_amendment} amended{r.report_quality.correction_rate !== null && r.report_quality.reports > 0 ? ` (${Math.round(Number(r.report_quality.correction_rate) * 100)}%)` : ''} · average turnaround {r.report_quality.turnaround_samples > 0 && r.report_quality.avg_turnaround_hours !== null ? `${Number(r.report_quality.avg_turnaround_hours).toFixed(1)} hours (from ${r.report_quality.turnaround_samples})` : 'not available yet'}.</p></div>)}
          {r.staff_workload && (r.staff_workload.length === 0 ? <Empty title="No inspectors in scope" /> : (
            <div className="overflow-x-auto rounded-xl border border-[#D7E7E4] bg-white"><table className="min-w-full text-sm">
              <caption className="p-3 text-left font-bold text-[#0A3340]">Inspector workload</caption>
              <thead><tr className="text-left text-xs text-[#64748B]"><th scope="col" className="p-3">Person</th><th scope="col" className="p-3">Role</th><th scope="col" className="p-3 text-right">Open</th><th scope="col" className="p-3 text-right">Completed in period</th></tr></thead>
              <tbody>{r.staff_workload.map((w) => <tr key={w.staff_id} className="border-t border-[#EEF7F5]"><th scope="row" className="p-3 text-left font-medium">{w.name || 'Team member'}</th><td className="p-3">{ROLE_LABEL[w.access_role]}</td><td className="p-3 text-right tabular-nums">{w.open_assigned}</td><td className="p-3 text-right tabular-nums">{w.completed_in_period}</td></tr>)}</tbody>
            </table></div>))}
          {r.earnings_by_branch && (r.earnings_by_branch.length === 0 ? <Empty title="No payments in this period" /> : (
            <div className="overflow-x-auto rounded-xl border border-[#D7E7E4] bg-white"><table className="min-w-full text-sm">
              <caption className="p-3 text-left font-bold text-[#0A3340]">Money by branch</caption>
              <thead><tr className="text-left text-xs text-[#64748B]"><th scope="col" className="p-3">Branch</th><th scope="col" className="p-3">Type</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3 text-right">Count</th><th scope="col" className="p-3 text-right">Amount</th></tr></thead>
              <tbody>{r.earnings_by_branch.map((e, i) => <tr key={i} className="border-t border-[#EEF7F5]"><th scope="row" className="p-3 text-left font-medium">{bName(e.branch_id)}</th><td className="p-3">{TYPE_LABEL[e.transaction_type] || e.transaction_type}</td><td className="p-3">{e.status}</td><td className="p-3 text-right tabular-nums">{e.count}</td><td className="p-3 text-right tabular-nums">{money(e.amount, e.currency)}</td></tr>)}</tbody>
            </table></div>))}
          {r.unattributed_transactions && r.unattributed_transactions.length > 0 && (
            <div className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm"><h3 className="font-bold text-[#0A3340]">Not attributed to a branch</h3>
              <p className="text-xs text-[#64748B]">Organization-level movements such as payouts. They are not counted in any branch above.</p>
              <ul className="mt-2 space-y-1">{r.unattributed_transactions.map((u, i) => <li key={i}>{TYPE_LABEL[u.transaction_type] || u.transaction_type} · {u.status} · {u.count} · <strong>{money(u.amount, u.currency)}</strong></li>)}</ul></div>)}
          {r.settlements && r.settlements.length > 0 && (
            <div className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm"><h3 className="font-bold text-[#0A3340]">Settlements</h3>
              <p className="text-xs text-[#64748B]">Settlements are paid to the organization as a whole, not per branch.</p>
              <ul className="mt-2 space-y-1">{r.settlements.map((s) => <li key={s.status}>{s.status} · {s.count} · gross {money(s.gross)} · net {money(s.net)}</li>)}</ul></div>)}
        </div>
      )}
    </section>
  );
};
export default OrgReportPanel;
