import React, { useMemo, useState } from 'react';
import organizationApi, { type AccessRole, type Member, type OrgSummary, type TechTitle } from '../services/organizationApi';
import { ROLE_LABEL, ROLE_HELP, TITLE_LABEL, TITLES_FOR, invitableRoles, mayHaveBranch, needsBranch } from './orgAccess';
import { Loading, ErrorBox, Empty, Notice, Pill, field, btnPrimary, btnGhost, btnDanger, useLoader, useAction } from './orgUi';

const tone = (s: Member['status']) => (s === 'confirmed' ? 'ok' : s === 'pending' ? 'warn' : 'bad');
const RANK: Record<string, number> = { owner: 100, org_admin: 80, operations_manager: 60, branch_manager: 50, finance: 30, report_reviewer: 30, inspector: 20, technician: 20 };

export const TeamPanel: React.FC<{ org: OrgSummary }> = ({ org }) => {
  const me = org.you;
  const roles = invitableRoles(me.role);
  const members = useLoader(() => organizationApi.listMembers(org.id), [org.id]);
  const branches = useLoader(() => organizationApi.listBranches(org.id), [org.id]);
  const reloadAll = async () => { await Promise.all([members.reload(), branches.reload()]); };
  const { busy, msg, run } = useAction(reloadAll);
  const [inv, setInv] = useState<{ email: string; accessRole: AccessRole; title: TechTitle | ''; branchId: string }>({ email: '', accessRole: roles[roles.length > 3 ? 3 : 0] || 'inspector', title: '', branchId: me.role === 'branch_manager' ? me.branchId || '' : '' });
  const [act, setAct] = useState<{ id: string; kind: 'suspend' | 'revoke' | 'change' } | null>(null);
  const [why, setWhy] = useState('');
  const [chg, setChg] = useState<{ accessRole: AccessRole; branchId: string; title: TechTitle | '' }>({ accessRole: 'inspector', branchId: '', title: '' });
  const branchName = useMemo(() => new Map((branches.data?.branches ?? []).map((b) => [b.id, b.name])), [branches.data]);

  if (members.loading && !members.data) return <Loading label="Loading team…" />;
  if (members.error) return <ErrorBox error={members.error} what="the team" onRetry={members.reload} />;
  const list = members.data?.members ?? [];
  const activeBranches = (branches.data?.branches ?? []).filter((b) => b.status === 'active');
  const mayManage = (m: Member) => m.id !== me.staffId && (me.role === 'owner' || (me.role === 'org_admin' && RANK[m.accessRole] < 80) || (me.role === 'branch_manager' && ['inspector', 'technician'].includes(m.accessRole) && m.branchId === me.branchId));

  return (
    <section aria-labelledby="org-team" className="space-y-4">
      <div>
        <h2 id="org-team" className="text-lg font-bold text-[#0A3340]">Team</h2>
        <p className="text-sm text-[#64748B]">{me.role === 'branch_manager' ? 'People in your branch.' : 'Everyone who works for this organization. A person is only on the team after they accept an invitation.'}</p>
      </div>
      <Notice msg={msg} />
      {list.length === 0 ? <Empty title="No team members yet" hint={roles.length ? 'Invite a registered KAYAD user by email below.' : undefined} /> : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="rounded-xl border border-[#D7E7E4] bg-white p-3 text-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="break-words">{m.name || 'Team member'}</strong>
                <Pill>{ROLE_LABEL[m.accessRole]}</Pill>
                <Pill tone={tone(m.status)}>{m.status === 'pending' ? (m.awaiting === 'business' ? 'asked to join' : 'invited') : m.status}</Pill>
                <span className="text-xs text-[#64748B]">{m.branchId ? `Branch: ${branchName.get(m.branchId) || 'unknown'}` : 'All branches'}{m.accessRole === 'inspector' || m.accessRole === 'technician' ? ` · ${TITLE_LABEL[m.title] || m.title}` : ''}</span>
              </div>
              {m.status === 'pending' && m.invitationExpiresAt && <p className="text-xs text-[#64748B]">{new Date(m.invitationExpiresAt).getTime() < Date.now() ? 'Invitation expired.' : `Invitation expires ${new Date(m.invitationExpiresAt).toLocaleDateString()}.`}</p>}
              {m.reason && (m.status === 'suspended' || m.status === 'ended') && <p className="text-xs text-[#64748B]">Reason: {m.reason}</p>}
              {mayManage(m) && m.status !== 'ended' && act?.id !== m.id && (
                <div className="flex flex-wrap gap-2">
                  {m.status === 'pending' && m.awaiting === 'business' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => void run(() => organizationApi.confirm(org.id, m.id), 'Team member confirmed.')}>Confirm</button>}
                  {m.status !== 'pending' && <button type="button" className={btnGhost} disabled={busy} onClick={() => { setAct({ id: m.id, kind: 'change' }); setChg({ accessRole: m.accessRole, branchId: m.branchId || '', title: m.title }); }}>Change role or branch</button>}
                  {m.status === 'confirmed' && <button type="button" className={btnGhost} disabled={busy} onClick={() => { setAct({ id: m.id, kind: 'suspend' }); setWhy(''); }}>Suspend</button>}
                  {m.status === 'suspended' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => void run(() => organizationApi.setMemberStatus(org.id, m.id, 'reactivate'), 'Access restored.')}>Reactivate</button>}
                  <button type="button" className={btnDanger} disabled={busy} onClick={() => { setAct({ id: m.id, kind: 'revoke' }); setWhy(''); }}>{m.status === 'pending' ? 'Cancel invitation' : 'Remove from team'}</button>
                </div>
              )}
              {act?.id === m.id && act.kind !== 'change' && (
                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => organizationApi.setMemberStatus(org.id, m.id, act.kind as 'suspend' | 'revoke', why), act.kind === 'suspend' ? 'Suspended. They lose access immediately.' : 'Removed. They lose access immediately and any pending assignments return to the queue.').then((ok) => ok && setAct(null)); }}>
                  <label className="text-xs font-bold" htmlFor={`tw-${m.id}`}>{act.kind === 'suspend' ? 'Reason for suspension' : 'Reason (kept in the audit log)'}</label>
                  <input id={`tw-${m.id}`} className={field} required={act.kind === 'suspend'} value={why} onChange={(e) => setWhy(e.target.value)} />
                  <div className="flex gap-2"><button type="submit" className={act.kind === 'revoke' ? btnDanger : btnPrimary} disabled={busy || (act.kind === 'suspend' && why.trim().length < 3)}>{act.kind === 'suspend' ? 'Suspend' : 'Remove'}</button><button type="button" className={btnGhost} onClick={() => setAct(null)}>Cancel</button></div>
                </form>
              )}
              {act?.id === m.id && act.kind === 'change' && (
                <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const body: Record<string, unknown> = {}; if (chg.accessRole !== m.accessRole) body.accessRole = chg.accessRole; if ((chg.branchId || null) !== (m.branchId || null)) body.branchId = chg.branchId || null; if (chg.title && chg.title !== m.title) body.title = chg.title; if (!Object.keys(body).length) { setAct(null); return; } void run(() => organizationApi.change(org.id, m.id, body), 'Updated. The change applies on their next request.').then((ok) => ok && setAct(null)); }}>
                  <div><label className="text-xs font-bold" htmlFor={`cr-${m.id}`}>Role</label>
                    <select id={`cr-${m.id}`} className={field} value={chg.accessRole} onChange={(e) => { const r = e.target.value as AccessRole; setChg({ ...chg, accessRole: r, branchId: mayHaveBranch(r) ? chg.branchId : '', title: TITLES_FOR[r]?.[0] || '' }); }}>
                      {[...new Set([m.accessRole, ...roles])].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select></div>
                  <div><label className="text-xs font-bold" htmlFor={`cb-${m.id}`}>Branch</label>
                    <select id={`cb-${m.id}`} className={field} value={chg.branchId} disabled={!mayHaveBranch(chg.accessRole) || me.role === 'branch_manager'} onChange={(e) => setChg({ ...chg, branchId: e.target.value })}>
                      {!needsBranch(chg.accessRole) && <option value="">All branches</option>}
                      {(branches.data?.branches ?? []).filter((b) => b.status === 'active' || b.id === m.branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                  {TITLES_FOR[chg.accessRole] && <div><label className="text-xs font-bold" htmlFor={`ct-${m.id}`}>Job title</label>
                    <select id={`ct-${m.id}`} className={field} value={chg.title} onChange={(e) => setChg({ ...chg, title: e.target.value as TechTitle })}>
                      {TITLES_FOR[chg.accessRole]!.map((t) => <option key={t} value={t}>{TITLE_LABEL[t]}</option>)}</select></div>}
                  <p className="sm:col-span-3 text-xs text-[#64748B]">{ROLE_HELP[chg.accessRole]} Moving someone off inspections returns their not-yet-started jobs to the queue; a person mid-inspection cannot be changed.</p>
                  <div className="sm:col-span-3 flex gap-2"><button type="submit" className={btnPrimary} disabled={busy}>Save change</button><button type="button" className={btnGhost} onClick={() => setAct(null)}>Cancel</button></div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {roles.length > 0 && (
        <form className="rounded-xl border border-[#D7E7E4] bg-white p-4 space-y-3" aria-labelledby="org-invite" onSubmit={(e) => { e.preventDefault(); void run(() => organizationApi.invite(org.id, { email: inv.email.trim(), accessRole: inv.accessRole, title: TITLES_FOR[inv.accessRole] ? (inv.title || TITLES_FOR[inv.accessRole]![TITLES_FOR[inv.accessRole]!.length - 1]) : undefined, branchId: mayHaveBranch(inv.accessRole) ? inv.branchId || null : null }), 'Invitation sent. They must accept before they count as part of your team. It expires in 7 days.').then((ok) => ok && setInv({ ...inv, email: '' })); }}>
          <h3 id="org-invite" className="font-bold text-[#0A3340]">Invite someone</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="text-xs font-bold" htmlFor="inv-email">Email of their KAYAD account *</label>
              <input id="inv-email" type="email" required className={field} value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} autoComplete="off" /></div>
            <div><label className="text-xs font-bold" htmlFor="inv-role">Role *</label>
              <select id="inv-role" className={field} value={inv.accessRole} onChange={(e) => { const r = e.target.value as AccessRole; setInv({ ...inv, accessRole: r, title: TITLES_FOR[r]?.[0] || '', branchId: mayHaveBranch(r) ? inv.branchId : '' }); }}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
            <div><label className="text-xs font-bold" htmlFor="inv-branch">Branch{needsBranch(inv.accessRole) ? ' *' : ''}</label>
              <select id="inv-branch" className={field} value={inv.branchId} required={needsBranch(inv.accessRole)} disabled={!mayHaveBranch(inv.accessRole) || me.role === 'branch_manager'} onChange={(e) => setInv({ ...inv, branchId: e.target.value })}>
                {!needsBranch(inv.accessRole) && <option value="">All branches</option>}
                {needsBranch(inv.accessRole) && <option value="">Choose a branch…</option>}
                {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            {TITLES_FOR[inv.accessRole] && <div><label className="text-xs font-bold" htmlFor="inv-title">Job title</label>
              <select id="inv-title" className={field} value={inv.title || TITLES_FOR[inv.accessRole]![TITLES_FOR[inv.accessRole]!.length - 1]} onChange={(e) => setInv({ ...inv, title: e.target.value as TechTitle })}>
                {TITLES_FOR[inv.accessRole]!.map((t) => <option key={t} value={t}>{TITLE_LABEL[t]}</option>)}</select></div>}
          </div>
          <p className="text-xs text-[#64748B]">{ROLE_HELP[inv.accessRole]}</p>
          {activeBranches.length === 0 && needsBranch(inv.accessRole) && <p role="status" className="text-xs text-amber-900">Add an active branch first; a branch manager runs one branch.</p>}
          <button type="submit" className={btnPrimary} disabled={busy || !inv.email.trim() || (needsBranch(inv.accessRole) && !inv.branchId)}>Send invitation</button>
        </form>
      )}
    </section>
  );
};
export default TeamPanel;
