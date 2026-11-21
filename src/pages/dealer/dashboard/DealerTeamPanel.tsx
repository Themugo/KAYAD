import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';

/**
 * Dealer team: members (invite by e-mail, change role, suspend / reactivate, remove, resend a pending invitation) and roles.
 * A role is a named permission set. The five built-in roles are fixed templates; the owner can add, edit and delete their own roles.
 * The server (dealerOrgAccess("canManageTeam"), owner-only role editing, no privilege expansion, audit) is authoritative; a 403 is shown
 * as "no permission". The UI never offers status "active" for a not-yet-accepted invitation and never claims an e-mail was delivered
 * unless the server says it was handed to the e-mail provider.
 */

export interface TeamRole { key: string; label: string; description?: string; permissions: Record<string, boolean>; builtin?: boolean }
export interface PermissionDef { key: string; label: string }

// Used until the server list loads (or if it cannot be loaded): the five built-in role names, without permission detail.
export const TEAM_ROLES = [
  { id: 'manager', label: 'Manager' },
  { id: 'sales_agent', label: 'Sales agent' },
  { id: 'lot_agent', label: 'Lot agent' },
  { id: 'finance_officer', label: 'Finance officer' },
  { id: 'viewer', label: 'Viewer' },
];
const FALLBACK_ROLES: TeamRole[] = TEAM_ROLES.map((r) => ({ key: r.id, label: r.label, permissions: {}, builtin: true }));

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800' },
  invited: { label: 'Pending invitation', cls: 'bg-[#FFF4D6] text-[#7A4B00]' },
  suspended: { label: 'Suspended', cls: 'bg-[#FEF3F2] text-[#7A271A]' },
};

const inputCls = 'px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3340]';
const btnCls = 'px-3 py-1 text-xs font-bold text-[#176B87] border border-[#B9D3CF] rounded-lg hover:bg-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]';

function actionError(err: any): string {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 403) return msg && !/DEALER_PERMISSION/.test(msg) ? msg : 'You do not have permission to manage the team.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 409) return msg || 'That conflicts with the current team setup.';
  if (status === 503) return msg || 'This feature is not available yet.';
  return msg || 'That action could not be completed. Please try again.';
}

const summarize = (perms: Record<string, boolean> | undefined, defs: PermissionDef[]) => {
  const on = defs.filter((d) => perms?.[d.key]).map((d) => d.label);
  return on.length ? on.join(' · ') : 'No permissions: can look but not act';
};

interface Props { team: any[]; onChanged: () => void }

export default function DealerTeamPanel({ team, onChanged }: Props) {
  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [roles, setRoles] = useState<TeamRole[]>(FALLBACK_ROLES);
  const [permDefs, setPermDefs] = useState<PermissionDef[]>([]);
  const [customAvailable, setCustomAvailable] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales_agent');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const lock = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirmId) confirmRef.current?.focus(); }, [confirmId]);

  const loadRoles = useCallback(async () => {
    try {
      const body: any = await dealerApi.getTeamRoles();
      const d = body?.data;
      if (Array.isArray(d?.roles) && d.roles.length) {
        setRoles(d.roles);
        setPermDefs(Array.isArray(d.permissions) ? d.permissions : []);
        setCustomAvailable(d.customRolesAvailable !== false);
        setRolesLoaded(true);
      }
    } catch { /* keep the built-in names; role editing simply stays unavailable */ }
  }, []);
  useEffect(() => { void loadRoles(); }, [loadRoles]);

  const roleLabel = (key: string) => roles.find((r) => r.key === key)?.label || String(key || '').replace(/^custom_/, '').replace(/_/g, ' ');

  const run = async (id: string | null, fn: () => Promise<any>, ok: string | ((res: any) => string)) => {
    if (lock.current) return false;
    lock.current = true;
    if (id) setBusyId(id);
    setError(null); setNotice(null); setWarning(null);
    try {
      const res = await fn();
      if (res?.success === false) { setError(res.message || 'That action could not be completed.'); return false; }
      setNotice(typeof ok === 'function' ? ok(res) : ok);
      if (res?.email && res.email.sent === false) setWarning(`The e-mail could not be sent${res.email.reason ? `: ${res.email.reason}` : ''} The invitation is saved. Use “Resend invitation” once e-mail is working.`);
      onChanged();
      return true;
    } catch (err) {
      setError(actionError(err));
      return false;
    } finally {
      lock.current = false;
      setBusyId(null);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) { setEmailError('Enter a valid email address.'); document.getElementById('team-invite-email')?.focus(); return; }
    setEmailError(null);
    setInviting(true);
    const ok = await run(null, () => dealerApi.inviteTeamMember({ email: value, role }), (res) => (res?.email?.sent === false ? `Invitation saved for ${value}.` : `Invitation sent to ${value}.`));
    setInviting(false);
    if (ok) setEmail('');
  };

  // ---- roles editor ----
  const blank = { key: '', label: '', description: '', permissions: {} as Record<string, boolean> };
  const [draft, setDraft] = useState<typeof blank | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || roleBusy) return;
    if (draft.label.trim().length < 2) { setRoleError('Give the role a name of at least 2 characters.'); return; }
    setRoleBusy(true); setRoleError(null);
    try {
      const body = { label: draft.label.trim(), description: draft.description.trim(), permissions: draft.permissions };
      const res: any = draft.key ? await dealerApi.updateTeamRole(draft.key, body) : await dealerApi.createTeamRole(body);
      if (res?.success === false) { setRoleError(res.message || 'The role could not be saved.'); return; }
      setNotice(draft.key ? `Role “${body.label}” updated${res?.updatedMembers ? `; ${res.updatedMembers} member${res.updatedMembers === 1 ? '' : 's'} now have the new permissions` : ''}.` : `Role “${body.label}” created.`);
      setDraft(null);
      await loadRoles();
      onChanged();
    } catch (err) { setRoleError(actionError(err)); } finally { setRoleBusy(false); }
  };
  const removeRole = async (key: string) => {
    setRoleBusy(true); setRoleError(null);
    try {
      const res: any = await dealerApi.deleteTeamRole(key);
      if (res?.success === false) { setRoleError(res.message || 'The role could not be deleted.'); return; }
      setNotice('Role deleted.'); setDeleteKey(null);
      await loadRoles();
    } catch (err) { setRoleError(actionError(err)); setDeleteKey(null); } finally { setRoleBusy(false); }
  };

  const active = team.filter((m) => m.status !== 'removed');
  const tabBtn = (id: 'members' | 'roles', label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === id ? 'bg-[#176B87] text-white' : 'text-[#176B87] border border-[#B9D3CF] hover:bg-[#F3FAF9]'}`}>{label}</button>
  );

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Team sections" className="flex gap-2">{tabBtn('members', 'Members')}{tabBtn('roles', 'Roles')}</div>

      {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
      {warning && <div role="status" className="flex items-start gap-2 p-3 rounded-lg bg-[#FFF4D6] border border-[#F2D58A] text-sm text-[#7A4B00]"><Mail className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{warning}</span></div>}
      {notice && <p role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{notice}</p>}

      {tab === 'members' && (
        <>
          <form onSubmit={invite} noValidate aria-label="Invite team member" className="p-4 rounded-xl bg-[#F3FAF9] border border-[#D7E7E4]">
            <h4 className="text-sm font-bold text-[#0A3340] mb-3">Invite a team member</h4>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
              <div className="flex-1">
                <label htmlFor="team-invite-email" className="block text-xs font-medium text-[#0A3340] mb-1">Email</label>
                <input id="team-invite-email" type="email" className={`${inputCls} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} disabled={inviting} aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? 'team-invite-email-error' : undefined} />
                {emailError && <p id="team-invite-email-error" role="alert" className="text-xs text-[#B42318] mt-1">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="team-invite-role" className="block text-xs font-medium text-[#0A3340] mb-1">Role</label>
                <select id="team-invite-role" className={`${inputCls} w-full`} value={role} onChange={(e) => setRole(e.target.value)} disabled={inviting}>
                  {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={inviting} aria-busy={inviting} className="sm:mt-5 px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
                {inviting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {inviting ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
            {rolesLoaded && <p className="text-xs text-[#475569] mt-2">{summarize(roles.find((r) => r.key === role)?.permissions, permDefs)}</p>}
          </form>

          {active.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-8">No team members are currently listed for this dealership.</p>
          ) : (
            <ul className="space-y-3">
              {active.map((member) => {
                const name = member.inviteEmail || member.memberProfile?.email || member.member?.name || 'Team member';
                const busy = busyId === member.id;
                const accepted = Boolean(member.member);
                const known = roles.some((r) => r.key === member.role);
                return (
                  <li key={member.id} className="p-4 bg-[#F6FAF9] rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-[#0A3340] truncate">{name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${(STATUS_LABELS[member.status] || { cls: 'bg-[#EEF7F5] text-[#475569]' }).cls}`}>{(STATUS_LABELS[member.status] || { label: String(member.status || 'Unknown') }).label}</span>
                      {rolesLoaded && <p className="text-xs text-[#475569] mt-1">{summarize(member.permissions, permDefs)}</p>}
                      {member.status === 'invited' && <p className="text-xs text-[#475569] mt-1">Waiting for the invitee to accept. They cannot be activated from here.</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {name}</label>
                      <select
                        id={`role-${member.id}`} className={inputCls} value={member.role} disabled={busy}
                        onChange={(e) => run(member.id, () => dealerApi.updateTeamMember(member.id, { role: e.target.value }), `Role updated for ${name}.`)}
                      >
                        {!known && <option value={member.role}>{roleLabel(member.role)}</option>}
                        {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                      {member.status === 'invited' && (
                        <button type="button" className={btnCls} disabled={busy} onClick={() => run(member.id, () => dealerApi.resendTeamInvite(member.id), (res) => (res?.email?.sent === false ? `Invitation refreshed for ${name}.` : `Invitation re-sent to ${name}.`))}>Resend invitation</button>
                      )}
                      {member.status === 'active' && (
                        <button type="button" className={btnCls} disabled={busy} onClick={() => run(member.id, () => dealerApi.updateTeamMember(member.id, { status: 'suspended' }), `${name} suspended.`)}>Suspend</button>
                      )}
                      {member.status === 'suspended' && accepted && (
                        <button type="button" className={btnCls} disabled={busy} onClick={() => run(member.id, () => dealerApi.updateTeamMember(member.id, { status: 'active' }), `${name} reactivated.`)}>Reactivate</button>
                      )}
                      {confirmId === member.id ? (
                        <div role="group" aria-label={`Confirm removal of ${name}`} onKeyDown={(e) => { if (e.key === 'Escape') setConfirmId(null); }} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-[#FEF3F2] border border-[#FDA29B]">
                          <span className="text-xs text-[#7A271A]">Remove {name}? They will lose access to this dealership.</span>
                          <button ref={confirmRef} type="button" className={`${btnCls} !text-[#B42318]`} disabled={busy} onClick={async () => { await run(member.id, () => dealerApi.removeTeamMember(member.id), `${name} removed.`); setConfirmId(null); }}>Confirm remove</button>
                          <button type="button" className={btnCls} onClick={() => setConfirmId(null)}>Keep</button>
                        </div>
                      ) : (
                        <button type="button" className={btnCls} disabled={busy} onClick={() => setConfirmId(member.id)} aria-label={`Remove ${name}`}>Remove</button>
                      )}
                      {busy && <Loader2 className="w-4 h-4 animate-spin text-[#176B87]" aria-label="Working" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'roles' && (
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">A role is a set of permissions. Pick one when you invite someone. Built-in roles are fixed; create your own for how your dealership really works. Changing a custom role’s permissions updates everyone already in it.</p>
          {!customAvailable && (
            <p role="status" className="p-3 rounded-lg bg-[#FFF4D6] border border-[#F2D58A] text-sm text-[#7A4B00]"><ShieldCheck className="inline w-4 h-4 mr-1" aria-hidden="true" />Custom roles are not switched on yet: the platform database needs the “dealer team custom roles” update. Built-in roles work in the meantime.</p>
          )}
          {roleError && <div role="alert" className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">{roleError}</div>}
          <ul className="space-y-3" aria-label="Roles">
            {roles.map((r) => (
              <li key={r.key} className="p-4 bg-[#F6FAF9] rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#0A3340]">{r.label} <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#EEF7F5] text-[#475569]">{r.builtin ? 'Built-in' : 'Custom'}</span></p>
                    {r.description && <p className="text-xs text-[#475569]">{r.description}</p>}
                    <p className="text-xs text-[#475569] mt-1">{summarize(r.permissions, permDefs)}</p>
                  </div>
                  {!r.builtin && (
                    <div className="flex gap-2">
                      <button type="button" className={btnCls} onClick={() => { setRoleError(null); setDraft({ key: r.key, label: r.label, description: r.description || '', permissions: { ...r.permissions } }); }} aria-label={`Edit role ${r.label}`}>Edit</button>
                      {deleteKey === r.key ? (
                        <>
                          <button type="button" className={`${btnCls} !text-[#B42318]`} disabled={roleBusy} onClick={() => removeRole(r.key)}>Confirm delete</button>
                          <button type="button" className={btnCls} onClick={() => setDeleteKey(null)}>Keep</button>
                        </>
                      ) : (
                        <button type="button" className={btnCls} onClick={() => setDeleteKey(r.key)} aria-label={`Delete role ${r.label}`}>Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {!draft ? (
            <button type="button" className="px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60" disabled={!customAvailable || !permDefs.length} onClick={() => { setRoleError(null); setDraft({ ...blank }); }}>Create a role</button>
          ) : (
            <form onSubmit={saveRole} noValidate aria-label={draft.key ? 'Edit role' : 'Create role'} className="p-4 rounded-xl border border-[#D7E7E4] bg-white space-y-3">
              <h4 className="text-sm font-bold text-[#0A3340]">{draft.key ? 'Edit role' : 'New role'}</h4>
              <div>
                <label htmlFor="role-label" className="block text-xs font-medium text-[#0A3340] mb-1">Role name</label>
                <input id="role-label" className={`${inputCls} w-full`} value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} disabled={roleBusy} />
              </div>
              <div>
                <label htmlFor="role-description" className="block text-xs font-medium text-[#0A3340] mb-1">What is this role for? (optional)</label>
                <input id="role-description" className={`${inputCls} w-full`} value={draft.description} maxLength={200} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={roleBusy} />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-[#0A3340] mb-1">Permissions</legend>
                {permDefs.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm text-[#0A3340]">
                    <input type="checkbox" checked={Boolean(draft.permissions[p.key])} disabled={roleBusy} onChange={(e) => setDraft({ ...draft, permissions: { ...draft.permissions, [p.key]: e.target.checked } })} />
                    {p.label}
                  </label>
                ))}
              </fieldset>
              <div className="flex gap-2">
                <button type="submit" disabled={roleBusy} className="px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center gap-2">{roleBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}Save role</button>
                <button type="button" className={btnCls} disabled={roleBusy} onClick={() => setDraft(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
