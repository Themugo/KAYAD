import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import * as dealerApi from '../../../../services/dealerPlatformApi';
import TemporaryDuties from './TemporaryDuties';
import { TeamRole, actionError, btnCls, inputCls, primaryBtnCls, memberName, displayStatus, fmtDate, describeEvent } from './teamShared';

interface Props { member: any; roles: TeamRole[]; employmentAvailable: boolean; onClose: () => void; onChanged: () => void }

/** One employee: business identity, employment, current role and effective permissions, history, and the lifecycle actions. The server enforces every one. */
export default function StaffDetail({ member, roles, employmentAvailable, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [role, setRole] = useState<string>(member.role);
  const [bizEmail, setBizEmail] = useState<string>(member.businessEmail || '');
  const [ending, setEnding] = useState<null | 'terminate' | 'resign'>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const name = memberName(member);
  const st = displayStatus(member);
  const accepted = Boolean(member.member);

  const load = async () => {
    try { const r: any = await dealerApi.getTeamMemberDetail(member.id); setDetail(r?.data || null); setLoadError(null); }
    catch (err) { setLoadError(actionError(err)); }
  };
  useEffect(() => { void load(); headRef.current?.focus(); }, [member.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRole(member.role); setBizEmail(member.businessEmail || ''); }, [member.role, member.businessEmail]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    if (busy) return false;
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fn();
      if (res?.success === false) { setError(res.message || 'That action could not be completed.'); return false; }
      setNotice(ok); onChanged(); await load(); return true;
    } catch (err) { setError(actionError(err)); return false; } finally { setBusy(false); }
  };

  const applyRole = () => run(() => dealerApi.updateTeamMember(member.id, { role }), role === 'basic_staff' ? `${name} now has Basic Staff Access only.` : `${name} is now ${roles.find((r) => r.key === role)?.label || role}.`);
  const saveBiz = () => run(() => dealerApi.setMemberBusinessEmail(member.id, bizEmail.trim()), bizEmail.trim() ? 'Business e-mail recorded.' : 'Business e-mail cleared.');
  const act = (action: 'suspend' | 'reinstate') => run(() => (employmentAvailable ? dealerApi.applyEmploymentAction(member.id, { action }) : dealerApi.updateTeamMember(member.id, { status: action === 'suspend' ? 'suspended' : 'active' })), action === 'suspend' ? `${name} suspended. They have no dealership access.` : `${name} reinstated.`);
  const endEmployment = async () => {
    if (!reason.trim()) { setReasonError('Give a short reason. It is kept in the employment record.'); return; }
    setReasonError(null);
    const kind = ending as 'terminate' | 'resign';
    const ok = await run(() => dealerApi.applyEmploymentAction(member.id, { action: kind, reason: reason.trim() }), kind === 'resign' ? `${name}’s resignation recorded. Their dealership access has ended.` : `${name}’s employment has ended. Their dealership access has been removed.`);
    if (ok) { setEnding(null); setReason(''); }
  };
  const archive = () => run(() => dealerApi.applyEmploymentAction(member.id, { action: 'archive' }), 'Record archived.');
  const rehire = () => run(() => dealerApi.inviteTeamMember({ email: member.inviteEmail }), `Re-hire invitation sent to ${member.inviteEmail}. They start again with Basic Staff Access and keep ${member.staffNumber || 'their record'}.`);

  const perms: { key: string; label: string; granted: boolean }[] = detail?.effectivePermissions || [];
  const identity = detail?.identity;
  const events: any[] = detail?.events || [];
  const protectedMsg = error && /protected|cannot change|owner/i.test(error);

  return (
    <section aria-label={`Staff details for ${name}`} className="rounded-xl border border-[#176B87] bg-white p-4 space-y-4" data-testid="staff-detail">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 ref={headRef} tabIndex={-1} className="text-base font-bold text-[#0A3340] truncate">{name}</h3>
          <p className="text-xs text-[#475569]"><span className="font-mono font-bold" data-testid="detail-staff-number">{member.staffNumber || 'No staff number yet'}</span> · <span className={`px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></p>
        </div>
        <button type="button" className={btnCls} onClick={onClose} aria-label="Close staff details"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>

      {error && <div role="alert" className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]" data-protected={protectedMsg ? 'true' : undefined}>{error}</div>}
      {notice && <p role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{notice}</p>}
      {loadError && <p role="alert" className="text-sm text-[#7A271A]">{loadError}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <dl className="text-sm space-y-1" aria-label="Business identity">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#64748B] mb-1">Business identity</h4>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Login e-mail</dt><dd className="text-[#0A3340] break-all text-right" data-testid="detail-login-email">{identity?.loginEmail || '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Invitation e-mail</dt><dd className="text-[#0A3340] break-all text-right">{member.inviteEmail}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Business e-mail</dt><dd className="text-[#0A3340] break-all text-right" data-testid="detail-business-email">{member.businessEmail || 'None recorded'}</dd></div>
          <p className="text-[11px] text-[#64748B]">The business e-mail is a contact the dealership records. It is not a mailbox KAYARD KE creates and it is never used to sign in.</p>
        </dl>
        <dl className="text-sm space-y-1" aria-label="Employment">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#64748B] mb-1">Employment</h4>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Employed since</dt><dd className="text-[#0A3340]">{fmtDate(member.employmentStartDate)}</dd></div>
          {member.employmentEndDate && <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Ended</dt><dd className="text-[#0A3340]">{fmtDate(member.employmentEndDate)}</dd></div>}
          {member.employmentEndReason && <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Reason</dt><dd className="text-[#0A3340] text-right">{member.employmentEndReason}</dd></div>}
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Current role</dt><dd className="text-[#0A3340]" data-testid="detail-role">{member.roleLabel || member.role}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Access level</dt><dd className="text-[#0A3340]">{member.accessLevel || 'Basic'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[#64748B]">Staff profile</dt><dd className="text-[#0A3340]">{member.profileCompletedAt ? 'Completed' : 'Not completed yet'}</dd></div>
        </dl>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#64748B] mb-1">Effective permissions</h4>
        {perms.length === 0 ? <p className="text-sm text-[#64748B]">Loading permissions…</p> : (
          <ul className="grid gap-1 sm:grid-cols-2 text-sm" aria-label="Effective permissions" data-testid="effective-permissions">
            {perms.map((p) => <li key={p.key} className={p.granted ? 'text-[#0A3340]' : 'text-[#94A3B8]'}><span aria-hidden="true">{p.granted ? '✓' : '–'}</span> {p.label}<span className="sr-only">{p.granted ? ' (allowed)' : ' (not allowed)'}</span></li>)}
          </ul>
        )}
        {perms.length > 0 && perms.every((p) => !p.granted) && <p className="mt-1 text-xs text-[#475569]">Basic access: this person can only see their own staff profile.</p>}
      </div>

      {accepted && member.status === 'active' && <TemporaryDuties memberId={member.id} memberName={name} onChanged={onChanged} />}

      {accepted && member.status !== 'removed' && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor={`detail-role-${member.id}`} className="block text-xs font-medium text-[#0A3340] mb-1">Operational role</label>
            <div className="flex gap-2">
              <select id={`detail-role-${member.id}`} className={`${inputCls} flex-1`} value={role} disabled={busy} onChange={(e) => setRole(e.target.value)}>
                {!roles.some((r) => r.key === member.role) && <option value={member.role}>{member.role}</option>}
                {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
              <button type="button" className={btnCls} disabled={busy || role === member.role} onClick={applyRole}>Apply role</button>
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">Choose Basic Staff Access to take working access away. Changes apply to the very next request.</p>
          </div>
          <div>
            <label htmlFor={`detail-biz-${member.id}`} className="block text-xs font-medium text-[#0A3340] mb-1">Business e-mail (recorded contact)</label>
            <div className="flex gap-2">
              <input id={`detail-biz-${member.id}`} type="email" className={`${inputCls} flex-1 min-w-0`} value={bizEmail} disabled={busy} onChange={(e) => setBizEmail(e.target.value)} placeholder="name@yourdealership.co.ke" />
              <button type="button" className={btnCls} disabled={busy || bizEmail.trim() === (member.businessEmail || '')} onClick={saveBiz}>Record</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Employment actions">
        {member.status === 'active' && <button type="button" className={btnCls} disabled={busy} onClick={() => act('suspend')}>Suspend access</button>}
        {member.status === 'suspended' && accepted && <button type="button" className={btnCls} disabled={busy} onClick={() => act('reinstate')}>Reinstate</button>}
        {employmentAvailable && ['active', 'suspended'].includes(member.status) && !ending && (<>
          <button type="button" className={`${btnCls} !text-[#B42318]`} disabled={busy} onClick={() => setEnding('terminate')}>End employment…</button>
          <button type="button" className={btnCls} disabled={busy} onClick={() => setEnding('resign')}>Record resignation…</button>
        </>)}
        {member.status === 'removed' && accepted && ['terminated', 'resigned'].includes(member.employmentStatus) && employmentAvailable && <button type="button" className={btnCls} disabled={busy} onClick={archive}>Archive record</button>}
        {member.status === 'removed' && accepted && <button type="button" className={btnCls} disabled={busy} onClick={rehire}>Re-hire (new invitation)</button>}
        {busy && <Loader2 className="w-4 h-4 animate-spin text-[#176B87]" aria-label="Working" />}
      </div>

      {ending && (
        <div role="group" aria-label={ending === 'resign' ? 'Record resignation' : 'End employment'} className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] p-3 space-y-2" onKeyDown={(e) => { if (e.key === 'Escape') { setEnding(null); setReason(''); } }}>
          <p className="text-sm text-[#7A271A]">{ending === 'resign' ? `Record that ${name} has resigned?` : `End ${name}’s employment?`} Their access to this dealership ends immediately. Their personal KAYARD KE account, your business records and their staff number ({member.staffNumber || 'none'}) are kept.</p>
          <label htmlFor="end-reason" className="block text-xs font-medium text-[#7A271A]">Reason (kept in the employment record)</label>
          <textarea id="end-reason" className={`${inputCls} w-full`} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonError ? true : undefined} />
          {reasonError && <p role="alert" className="text-xs text-[#B42318]">{reasonError}</p>}
          <div className="flex gap-2">
            <button type="button" className={`${btnCls} !text-[#B42318]`} disabled={busy} onClick={endEmployment}>{ending === 'resign' ? 'Confirm resignation' : 'Confirm end of employment'}</button>
            <button type="button" className={btnCls} onClick={() => { setEnding(null); setReason(''); setReasonError(null); }}>Keep employed</button>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#64748B] mb-1">Employment history</h4>
        {!employmentAvailable ? <p className="text-sm text-[#64748B]">Employment history is not switched on yet.</p> : events.length === 0 ? <p className="text-sm text-[#64748B]">No recorded events yet.</p> : (
          <ol className="divide-y divide-[#EEF3F2] rounded-lg border border-[#EEF3F2]" aria-label="Employment history" data-testid="staff-history">
            {events.map((e) => <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm text-[#0A3340]"><span>{describeEvent(e, roles)}{e.reason ? <span className="text-[#475569]"> — {e.reason}</span> : null}{e.actorLabel ? <span className="text-xs text-[#64748B]"> · by {e.actorLabel}</span> : null}</span><time className="text-xs text-[#64748B]" dateTime={e.at}>{fmtDate(e.at)}</time></li>)}
          </ol>
        )}
      </div>
    </section>
  );
}
