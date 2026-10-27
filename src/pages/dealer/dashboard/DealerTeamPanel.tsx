import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';

/**
 * Phase 14.4 team management. Offers only what the real contracts support:
 * invite (email + role), role change, suspend / reactivate, remove. The server
 * (dealerOrgAccess("canManageTeam"), self-protection, audit) is authoritative;
 * a 403 is shown as "no permission" and the list stays read-only for the user.
 * The UI never offers status "active" for a not-yet-accepted invitation
 * (that would bypass the invite-accept flow) and never edits `permissions`.
 */

export const TEAM_ROLES = [
  { id: 'manager', label: 'Manager' },
  { id: 'sales_agent', label: 'Sales agent' },
  { id: 'lot_agent', label: 'Lot agent' },
  { id: 'finance_officer', label: 'Finance officer' },
  { id: 'viewer', label: 'Viewer' },
];

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
  if (status === 409) return msg || 'An invitation for this email already exists.';
  return msg || 'That action could not be completed. Please try again.';
}

interface Props { team: any[]; onChanged: () => void }

export default function DealerTeamPanel({ team, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales_agent');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const lock = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirmId) confirmRef.current?.focus(); }, [confirmId]);

  const run = async (id: string | null, fn: () => Promise<any>, ok: string) => {
    if (lock.current) return false;
    lock.current = true;
    if (id) setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      if (res?.success === false) { setError(res.message || 'That action could not be completed.'); return false; }
      setNotice(ok);
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
    const ok = await run(null, () => dealerApi.inviteTeamMember({ email: value, role }), `Invitation sent to ${value}.`);
    setInviting(false);
    if (ok) setEmail('');
  };

  const active = team.filter((m) => m.status !== 'removed');

  return (
    <div className="space-y-5">
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
              {TEAM_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={inviting} aria-busy={inviting} className="sm:mt-5 px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
            {inviting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {inviting ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      </form>

      {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
      {notice && <p role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{notice}</p>}

      {active.length === 0 ? (
        <p className="text-sm text-[#64748B] text-center py-8">No team members are currently listed for this dealership.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((member) => {
            const name = member.inviteEmail || member.memberProfile?.email || member.member?.name || 'Team member';
            const busy = busyId === member.id;
            const accepted = Boolean(member.member);
            return (
              <li key={member.id} className="p-4 bg-[#F6FAF9] rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-[#0A3340] truncate">{name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${(STATUS_LABELS[member.status] || { cls: 'bg-[#EEF7F5] text-[#475569]' }).cls}`}>{(STATUS_LABELS[member.status] || { label: String(member.status || 'Unknown') }).label}</span>
                  {member.status === 'invited' && <p className="text-xs text-[#475569] mt-1">Waiting for the invitee to accept. They cannot be activated from here.</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {name}</label>
                  <select
                    id={`role-${member.id}`} className={inputCls} value={member.role} disabled={busy}
                    onChange={(e) => run(member.id, () => dealerApi.updateTeamMember(member.id, { role: e.target.value }), `Role updated for ${name}.`)}
                  >
                    {TEAM_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
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
    </div>
  );
}
