import React, { useMemo, useState } from 'react';
import organizationApi, { type OrgBooking, type OrgSummary, type TransitionAction } from '../services/organizationApi';
import { ACTION_LABEL, MANAGER_ACTIONS, STATUS_LABEL, can, nextActions, orgWide } from './orgAccess';
import { Loading, ErrorBox, Empty, Notice, Pill, field, btnPrimary, btnGhost, btnDanger, useLoader, useAction } from './orgUi';

const STATUS_FILTERS = ['booked', 'confirmed', 'inspector_assigned', 'travelling', 'inspection_started', 'inspection_complete', 'report_generated', 'closed', 'cancelled'];
const when = (b: OrgBooking) => `${b.scheduled_date}${b.scheduled_time ? ` ${String(b.scheduled_time).slice(0, 5)}` : ''}`;
const vehicle = (b: OrgBooking) => [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle not stated';

/** Booking operations: routing to a branch, assigning an inspector, and moving a job along. Every button maps to one server action
 *  and is shown only when the person's role could plausibly do it; the database makes the final decision per booking. */
export const OperationsPanel: React.FC<{ org: OrgSummary }> = ({ org }) => {
  const me = org.you; const manage = can(me.role, 'bookingManage'); const execute = can(me.role, 'bookingExecute');
  const [filter, setFilter] = useState({ status: '', branchId: '' });
  const [page, setPage] = useState(1);
  const list = useLoader(() => organizationApi.listBookings(org.id, { status: filter.status || undefined, branchId: filter.branchId || undefined, page, limit: 20 }), [org.id, filter.status, filter.branchId, page]);
  const branches = useLoader(() => organizationApi.listBranches(org.id), [org.id]);
  const team = useLoader(async () => (manage ? organizationApi.listMembers(org.id) : { members: [] }), [org.id, manage]);
  const { busy, msg, run } = useAction(async () => { await list.reload(); });
  const [pick, setPick] = useState<Record<string, string>>({});
  const branchName = useMemo(() => new Map((branches.data?.branches ?? []).map((b) => [b.id, b.name])), [branches.data]);
  const people = useMemo(() => new Map((team.data?.members ?? []).map((m) => [m.id, m])), [team.data]);

  if (list.loading && !list.data) return <Loading label="Loading bookings…" />;
  if (list.error) return <ErrorBox error={list.error} what="bookings" onRetry={list.reload} />;
  const items = list.data?.items ?? []; const total = list.data?.total ?? 0; const pages = Math.max(1, Math.ceil(total / 20));
  const inspectors = (b: OrgBooking) => (team.data?.members ?? []).filter((m) => m.status === 'confirmed' && m.isActive && m.isAvailable && ['inspector', 'technician'].includes(m.accessRole) && (!m.branchId || m.branchId === b.branch_id));
  const act = (b: OrgBooking, a: TransitionAction) => run(() => organizationApi.transition(org.id, b.id, a), `${ACTION_LABEL[a]} done.`);

  return (
    <section aria-labelledby="org-ops" className="space-y-4">
      <div>
        <h2 id="org-ops" className="text-lg font-bold text-[#0A3340]">{me.role === 'inspector' || me.role === 'technician' ? 'My inspections' : 'Bookings'}</h2>
        <p className="text-sm text-[#64748B]">{me.role === 'inspector' || me.role === 'technician' ? 'Inspections assigned to you.' : me.role === 'branch_manager' ? 'Bookings for your branch.' : 'Bookings routed to your branches, plus the organization-level queue that has not been routed yet.'}</p>
      </div>
      <Notice msg={msg} />
      <div className="flex flex-wrap gap-3">
        <div><label className="text-xs font-bold block" htmlFor="ops-status">Status</label>
          <select id="ops-status" className={`${field} sm:w-56`} value={filter.status} onChange={(e) => { setPage(1); setFilter({ ...filter, status: e.target.value }); }}>
            <option value="">All</option>{STATUS_FILTERS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
        {orgWide(me.role) && <div><label className="text-xs font-bold block" htmlFor="ops-branch">Branch</label>
          <select id="ops-branch" className={`${field} sm:w-56`} value={filter.branchId} onChange={(e) => { setPage(1); setFilter({ ...filter, branchId: e.target.value }); }}>
            <option value="">All branches</option><option value="unrouted">Not routed yet</option>{(branches.data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
      </div>
      {items.length === 0 ? <Empty title="No bookings match" hint={filter.status || filter.branchId ? 'Clear a filter to see more.' : 'New bookings appear here as customers book.'} /> : (
        <ul className="space-y-3" aria-busy={list.loading}>
          {items.map((b) => {
            const mine = b.assigned_staff_id && b.assigned_staff_id === me.staffId;
            const exec = nextActions(b.status).filter((a) => (MANAGER_ACTIONS.includes(a) ? manage : execute && (manage || mine)));
            const canRoute = manage && me.role !== 'branch_manager' && ['booked', 'confirmed'].includes(b.status);
            const canAssign = manage && ['booked', 'confirmed'].includes(b.status) && b.payment_status === 'fully_paid';
            const assigned = b.assigned_staff_id ? people.get(b.assigned_staff_id) : null;
            return (
              <li key={b.id} className="rounded-xl border border-[#D7E7E4] bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="font-mono text-sm break-all">{b.booking_reference}</strong>
                  <Pill tone={b.status === 'cancelled' || b.status === 'no_show' ? 'bad' : b.status === 'closed' ? 'ok' : 'neutral'}>{STATUS_LABEL[b.status] || b.status}</Pill>
                  {b.payment_status && b.payment_status !== 'fully_paid' && <Pill tone="warn">payment {b.payment_status.replace(/_/g, ' ')}</Pill>}
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-sm text-[#475569] sm:grid-cols-2">
                  <div className="flex gap-2"><dt className="text-[#94A3B8]">Vehicle</dt><dd>{vehicle(b)}</dd></div>
                  <div className="flex gap-2"><dt className="text-[#94A3B8]">When</dt><dd>{when(b)}</dd></div>
                  <div className="flex gap-2"><dt className="text-[#94A3B8]">Branch</dt><dd>{b.branch_id ? branchName.get(b.branch_id) || 'Another branch' : 'Not routed yet'}</dd></div>
                  <div className="flex gap-2"><dt className="text-[#94A3B8]">Inspector</dt><dd>{b.assigned_staff_id ? (mine ? 'You' : assigned?.name || 'Assigned') : 'Not assigned'}</dd></div>
                </dl>
                {(canRoute || canAssign || exec.length > 0) && (
                  <div className="flex flex-wrap items-end gap-2">
                    {canRoute && (<>
                      <div><label className="text-xs font-bold block" htmlFor={`rt-${b.id}`}>Route to branch</label>
                        <select id={`rt-${b.id}`} className={`${field} sm:w-48`} value={pick[`r${b.id}`] ?? (b.branch_id || '')} onChange={(e) => setPick({ ...pick, [`r${b.id}`]: e.target.value })}>
                          <option value="">Organization queue</option>{(branches.data?.branches ?? []).filter((x) => x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                      <button type="button" className={btnGhost} disabled={busy || (pick[`r${b.id}`] ?? (b.branch_id || '')) === (b.branch_id || '')} onClick={() => void run(() => organizationApi.routeBooking(org.id, b.id, pick[`r${b.id}`] || null), 'Booking routed.')}>Route</button>
                    </>)}
                    {canAssign && (<>
                      <div><label className="text-xs font-bold block" htmlFor={`as-${b.id}`}>Assign inspector</label>
                        <select id={`as-${b.id}`} className={`${field} sm:w-56`} value={pick[`a${b.id}`] || ''} onChange={(e) => setPick({ ...pick, [`a${b.id}`]: e.target.value })}>
                          <option value="">Choose…</option>{inspectors(b).map((m) => <option key={m.id} value={m.id}>{m.name || 'Team member'}{m.branchId ? '' : ' (all branches)'}</option>)}</select></div>
                      <button type="button" className={btnPrimary} disabled={busy || !pick[`a${b.id}`]} onClick={() => void run(() => organizationApi.assignBooking(org.id, b.id, pick[`a${b.id}`]), 'Inspector assigned.')}>Assign</button>
                    </>)}
                    {exec.map((a) => <button key={a} type="button" className={a === 'cancel' || a === 'no_show' ? btnDanger : btnPrimary} disabled={busy} onClick={() => void act(b, a)}>{ACTION_LABEL[a]}</button>)}
                  </div>
                )}
                {manage && ['booked', 'confirmed'].includes(b.status) && b.payment_status !== 'fully_paid' && <p className="text-xs text-[#64748B]">An inspector can be assigned once the customer's payment is confirmed.</p>}
                {canAssign && inspectors(b).length === 0 && <p className="text-xs text-slate-900" role="status">No available inspector for this branch. Invite one or check the team.</p>}
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && <div className="flex items-center gap-3"><button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm text-[#64748B]" aria-live="polite">Page {page} of {pages}</span><button type="button" className={btnGhost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  );
};
export default OperationsPanel;
