import React from 'react';
import organizationApi, { type MyMembership, type OrgBooking } from '../services/organizationApi';
import { ROLE_LABEL, STATUS_LABEL, ACTION_LABEL, TITLE_LABEL, nextActions } from './orgAccess';
import { Loading, ErrorBox, Empty, Notice, Pill, btnPrimary, btnGhost, btnDanger, useLoader, useAction } from './orgUi';

/** The signed-in person's own side: invitations to accept or decline, where they work and in what role, and (for inspectors and
 *  technicians) the inspections assigned to them across every organization where their membership is live. */
export const MyMembershipsPanel: React.FC<{ onOpenWorkspace?: (organizationId: string) => void }> = ({ onOpenWorkspace }) => {
  const mem = useLoader(() => organizationApi.myMemberships(), []);
  const work = useLoader(() => organizationApi.myWorklist(), []);
  const reloadAll = async () => { await Promise.all([mem.reload(), work.reload()]); };
  const { busy, msg, run } = useAction(reloadAll);

  if (mem.loading && !mem.data) return <Loading label="Loading your memberships…" />;
  if (mem.error) return <ErrorBox error={mem.error} what="your memberships" onRetry={mem.reload} />;
  const rows = (mem.data?.memberships ?? []).filter((m) => m.status !== 'ended');
  const invites = rows.filter((m) => m.status === 'pending' && !m.invitationExpired);
  const current = rows.filter((m) => m.status === 'confirmed' || m.status === 'suspended');
  const ended = (mem.data?.memberships ?? []).filter((m) => m.status === 'ended').slice(0, 3);
  const row = (m: MyMembership) => `${m.organizationName || 'Business'} · ${ROLE_LABEL[m.accessRole]}${m.branchName ? ` · ${m.branchName}` : ''}${m.accessRole === 'inspector' || m.accessRole === 'technician' ? ` · ${TITLE_LABEL[m.title]}` : ''}`;
  const items: OrgBooking[] = work.data?.items ?? [];

  return (
    <section aria-labelledby="my-mem" className="space-y-4">
      <h2 id="my-mem" className="text-lg font-bold text-[#0A3340]">Businesses you work with</h2>
      <Notice msg={msg} />
      {invites.length > 0 && (
        <div className="space-y-2"><h3 className="font-bold text-[#0A3340]">Invitations</h3>
          <ul className="space-y-2">{invites.map((m) => (
            <li key={m.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm flex flex-wrap items-center gap-2">
              <span className="flex-1 min-w-[180px]"><strong>{row(m)}</strong>{m.invitationExpiresAt ? <span className="block text-xs text-[#64748B]">Expires {new Date(m.invitationExpiresAt).toLocaleDateString()}</span> : null}</span>
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void run(() => organizationApi.acceptInvitation(m.id), 'You joined the team.')}>Accept</button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => void run(() => organizationApi.leave(m.id, 'declined the invitation'), 'Invitation declined.')}>Decline</button>
            </li>))}</ul></div>
      )}
      {current.length === 0 && invites.length === 0 ? <Empty title="You are not on any team yet" hint="When a business invites you, the invitation appears here. You can also ask a business to confirm you from its profile." /> : (
        <ul className="space-y-2">{current.map((m) => (
          <li key={m.id} className="rounded-xl border border-[#D7E7E4] bg-white p-3 text-sm flex flex-wrap items-center gap-2">
            <span className="flex-1 min-w-[180px]">{row(m)} <Pill tone={m.status === 'confirmed' ? 'ok' : 'bad'}>{m.status}</Pill>{m.status === 'suspended' && m.reason ? <span className="block text-xs text-[#64748B]">Reason: {m.reason}</span> : null}</span>
            {m.status === 'confirmed' && onOpenWorkspace && <button type="button" className={btnPrimary} onClick={() => onOpenWorkspace(m.organizationId)}>Open workspace</button>}
            <button type="button" className={btnDanger} disabled={busy} onClick={() => void run(() => organizationApi.leave(m.id, 'left the organization'), 'You left this business.')}>Leave</button>
          </li>))}</ul>
      )}
      {ended.length > 0 && <p className="text-xs text-[#64748B]">Past: {ended.map((m) => m.organizationName || 'Business').join(', ')}.</p>}

      <div aria-labelledby="my-work" className="space-y-2">
        <h3 id="my-work" className="font-bold text-[#0A3340]">My assigned inspections</h3>
        {work.loading && !work.data ? <Loading label="Loading your inspections…" /> : work.error ? <ErrorBox error={work.error} what="your inspections" onRetry={work.reload} /> : items.length === 0 ? (
          <Empty title="Nothing assigned to you" hint={work.data?.memberships ? 'New jobs appear here when a manager assigns them.' : 'Inspections appear here once you are an active inspector or technician on a team.'} />
        ) : (
          <ul className="space-y-2">{items.map((b) => (
            <li key={b.id} className="rounded-xl border border-[#D7E7E4] bg-white p-3 text-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2"><strong className="font-mono break-all">{b.booking_reference}</strong><Pill>{STATUS_LABEL[b.status] || b.status}</Pill><span className="text-xs text-[#64748B]">{b.scheduled_date}{b.scheduled_time ? ` ${String(b.scheduled_time).slice(0, 5)}` : ''}</span></div>
              <p className="text-[#475569]">{[b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle not stated'}{b.inspection_town ? ` · ${b.inspection_town}` : ''}</p>
              <div className="flex flex-wrap gap-2">{nextActions(b.status).filter((a) => a !== 'confirm' && a !== 'cancel').map((a) => <button key={a} type="button" className={a === 'no_show' ? btnDanger : btnPrimary} disabled={busy} onClick={() => void run(() => organizationApi.transition(b.provider_id, b.id, a), `${ACTION_LABEL[a]} recorded.`)}>{ACTION_LABEL[a]}</button>)}</div>
            </li>))}</ul>
        )}
      </div>
    </section>
  );
};
export default MyMembershipsPanel;
