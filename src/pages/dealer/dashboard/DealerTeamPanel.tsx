import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Mail, ShieldCheck, Users, Search, Eye, KeyRound, Building2, Layers } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';
import RolesTab from './team/RolesTab';
import StaffDetail from './team/StaffDetail';
import {
  TeamRole, PermissionDef, actionError, btnCls, inputCls, primaryBtnCls, memberName, initials, displayStatus, fmtDate, isExpired, isFormer, describeEvent,
} from './team/teamShared';

/**
 * Team & Employment: ONE workspace over the same dealer_teams data (members, invitations, roles, employment records, dealer activity).
 * Every employee starts with Basic Staff Access; the dealer assigns an operational role after they join. The server
 * (dealerOrgAccess("canManageTeam"), owner-only role editing, no privilege expansion, audit) is authoritative; a 403 is shown as "no permission".
 * The UI never offers status "active" for a not-yet-accepted invitation and never claims an e-mail was delivered unless the server says it was handed
 * to the e-mail provider. Figures the server cannot supply are shown as "not available", never as zero.
 */

export type { TeamRole, PermissionDef };
// Used until the server list loads (or if it cannot be loaded): the built-in role names, without permission detail.
export const TEAM_ROLES = [
  { id: 'basic_staff', label: 'Basic Staff Access' },
  { id: 'manager', label: 'Manager' },
  { id: 'sales_agent', label: 'Sales agent' },
  { id: 'lot_agent', label: 'Lot agent' },
  { id: 'finance_officer', label: 'Finance officer' },
  { id: 'viewer', label: 'Viewer' },
];
const FALLBACK_ROLES: TeamRole[] = TEAM_ROLES.map((r) => ({ key: r.id, label: r.label, permissions: {}, builtin: true }));

type Section = 'members' | 'invitations' | 'roles' | 'records' | 'activity';
interface Props { team: any[]; onChanged: () => void; employmentAvailable?: boolean }

export default function DealerTeamPanel({ team, onChanged, employmentAvailable = true }: Props) {
  const [tab, setTab] = useState<Section>('members');
  const [roles, setRoles] = useState<TeamRole[]>(FALLBACK_ROLES);
  const [permDefs, setPermDefs] = useState<PermissionDef[]>([]);
  const [customAvailable, setCustomAvailable] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [email, setEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [bizError, setBizError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('current');
  const [events, setEvents] = useState<{ loaded: boolean; items: any[]; error: string | null }>({ loaded: false, items: [], error: null });
  const [activity, setActivity] = useState<{ loaded: boolean; data: any; error: string | null }>({ loaded: false, data: null, error: null });
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

  const loadEvents = useCallback(async () => {
    if (!employmentAvailable || typeof dealerApi.getEmploymentRecords !== 'function') { setEvents({ loaded: true, items: [], error: null }); return; }
    try { const r: any = await dealerApi.getEmploymentRecords(); setEvents({ loaded: true, items: r?.data?.events || [], error: null }); }
    catch (err) { setEvents({ loaded: true, items: [], error: actionError(err) }); }
  }, [employmentAvailable]);
  useEffect(() => { void loadEvents(); }, [loadEvents, team]);

  useEffect(() => {
    if (tab !== 'activity' || activity.loaded) return;
    let live = true;
    dealerApi.getCommandCentre().then((r: any) => live && setActivity({ loaded: true, data: r?.data?.team || null, error: null }))
      .catch((err: any) => live && setActivity({ loaded: true, data: null, error: actionError(err) }));
    return () => { live = false; };
  }, [tab, activity.loaded]);

  const refresh = () => { setActivity((a) => ({ ...a, loaded: false })); onChanged(); };

  const run = async (id: string | null, fn: () => Promise<any>, ok: string | ((res: any) => string)) => {
    if (lock.current) return false;
    lock.current = true;
    if (id) setBusyId(id);
    setError(null); setNotice(null); setWarning(null);
    try {
      const res = await fn();
      if (res?.success === false) { setError(res.message || 'That action could not be completed.'); return false; }
      setNotice(typeof ok === 'function' ? ok(res) : ok);
      if (res?.email && res.email.sent === false) setWarning(`The e-mail could not be sent${res.email.reason ? `: ${res.email.reason}` : ''} ${res.email.previousLinkStillValid ? 'The link in the previous e-mail still works.' : 'The invitation is saved.'} Use “Resend invitation” once e-mail is available.`);
      refresh();
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
    const biz = businessEmail.trim().toLowerCase();
    if (biz && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(biz)) { setBizError('Enter a valid business e-mail address, or leave it empty.'); return; }
    setEmailError(null); setBizError(null);
    setInviting(true);
    // The request never names a role: the server starts every invitation at Basic Staff Access.
    const body: Record<string, string> = { email: value };
    if (employeeName.trim()) body.employeeName = employeeName.trim();
    if (biz) body.businessEmail = biz;
    const ok = await run(null, () => dealerApi.inviteTeamMember(body), (res) => (res?.email?.sent === false ? `Invitation saved for ${value}.` : `Invitation sent to ${value}.`));
    setInviting(false);
    if (ok) { setEmail(''); setEmployeeName(''); setBusinessEmail(''); }
  };

  // ---- derived lists ----
  const staff = team.filter((m) => m.member && ['active', 'suspended'].includes(m.status));
  const former = team.filter(isFormer);
  const pending = team.filter((m) => m.status === 'invited');
  const outstanding = pending.filter((m) => !isExpired(m));
  const onboarding = team.filter((m) => m.status === 'active' && m.employmentStatus === 'onboarding');
  const roleChanges30 = events.items.filter((e) => e.type === 'role_changed' && Date.now() - new Date(e.at).getTime() < 30 * 86400000).length;
  const q = query.trim().toLowerCase();
  const matchesQuery = (m: any) => !q || [memberName(m), m.staffNumber, m.businessEmail, m.inviteEmail, m.memberProfile?.email].some((v) => String(v || '').toLowerCase().includes(q));
  const listed = (statusFilter === 'former' ? former : statusFilter === 'all' ? [...staff, ...former] : staff)
    .filter((m) => (roleFilter === 'all' || m.role === roleFilter) && matchesQuery(m) && (['current', 'former', 'all'].includes(statusFilter) || displayStatus(m).key === statusFilter));
  const roleLabel = (key: string) => roles.find((r) => r.key === key)?.label || String(key || '').replace(/^custom_/, '').replace(/_/g, ' ');
  const selected = selectedId ? team.find((m) => m.id === selectedId) : null;

  const tabBtn = (id: Section, label: string, badge?: number) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${tab === id ? 'bg-[#176B87] text-white' : 'text-[#176B87] border border-[#B9D3CF] hover:bg-[#F3FAF9]'}`}>{label}{badge ? <span className="ml-1.5 rounded-full bg-[#F79009] px-1.5 text-[10px] font-bold text-white">{badge}</span> : null}</button>
  );
  const tile = (testId: string, label: string, value: number | string | null, hint?: string) => (
    <div className="rounded-xl border border-[#D7E7E4] bg-white p-3" data-testid={testId}>
      <p className="text-xl font-black text-[#0A3340]">{value === null ? '—' : value}</p><p className="text-xs text-[#475569]">{label}</p>{hint && <p className="text-[10px] text-[#64748B]">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-black text-[#0A3340]">Team &amp; Employment</h2>
        <p className="text-sm text-[#475569]">Hire, onboard and manage your dealership staff, their roles and access.</p>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-[#475569]" aria-label="How Team & Employment works">
        <li className="flex gap-2 rounded-xl border border-[#D7E7E4] bg-white p-3"><ShieldCheck className="w-4 h-4 shrink-0 text-[#176B87]" aria-hidden="true" /><span><strong className="block text-[#0A3340]">Secure &amp; separated</strong>Staff access is for your dealership only and never mixes with personal KAYARD KE accounts.</span></li>
        <li className="flex gap-2 rounded-xl border border-[#D7E7E4] bg-white p-3"><KeyRound className="w-4 h-4 shrink-0 text-[#176B87]" aria-hidden="true" /><span><strong className="block text-[#0A3340]">Basic access first</strong>Every invitation starts with Basic Staff Access. You assign the role after they join.</span></li>
        <li className="flex gap-2 rounded-xl border border-[#D7E7E4] bg-white p-3"><Layers className="w-4 h-4 shrink-0 text-[#176B87]" aria-hidden="true" /><span><strong className="block text-[#0A3340]">Role-based access</strong>Permissions are enforced by the server on every request.</span></li>
        <li className="flex gap-2 rounded-xl border border-[#D7E7E4] bg-white p-3"><Building2 className="w-4 h-4 shrink-0 text-[#176B87]" aria-hidden="true" /><span><strong className="block text-[#0A3340]">Business identity</strong>Each employee gets a unique staff number. A business e-mail is a contact you record.</span></li>
      </ul>

      {!employmentAvailable && <p role="status" className="p-3 rounded-lg bg-[#FFF4D6] border border-[#F2D58A] text-sm text-[#7A4B00]" data-testid="employment-unavailable"><ShieldCheck className="inline w-4 h-4 mr-1" aria-hidden="true" />Employment records are not switched on yet (the platform database needs the “dealer employment” update). Inviting, roles and access keep working; staff numbers, employment dates and history appear once it is applied.</p>}

      <div role="tablist" aria-label="Team sections" className="flex gap-2 overflow-x-auto pb-1">
        {tabBtn('members', `Team Members (${staff.length})`)}
        {tabBtn('invitations', 'Invitations', outstanding.length)}
        {tabBtn('roles', 'Roles & Permissions')}
        {tabBtn('records', 'Employment Records')}
        {tabBtn('activity', 'Activity (Dealer)')}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" aria-label="Team summary">
        {tile('sum-active', 'Active staff', team.filter((m) => m.status === 'active').length)}
        {tile('sum-pending', 'Pending invitations', outstanding.length, pending.length > outstanding.length ? `${pending.length - outstanding.length} expired` : undefined)}
        {tile('sum-onboarding', 'Onboarding', employmentAvailable ? onboarding.length : null, employmentAvailable ? undefined : 'Not available yet')}
        {tile('sum-roles', 'Roles configured', rolesLoaded ? roles.length : null, rolesLoaded ? undefined : 'Loading')}
        {tile('sum-changes', 'Role changes (30 days)', employmentAvailable && events.loaded && !events.error ? roleChanges30 : null, employmentAvailable ? (events.error ? 'Could not load' : undefined) : 'Not available yet')}
      </div>

      {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
      {warning && <div role="status" className="flex items-start gap-2 p-3 rounded-lg bg-[#FFF4D6] border border-[#F2D58A] text-sm text-[#7A4B00]"><Mail className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{warning}</span></div>}
      {notice && <p role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{notice}</p>}

      {tab === 'members' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" aria-hidden="true" /><label htmlFor="team-search" className="sr-only">Search staff</label>
              <input id="team-search" type="search" className={`${inputCls} w-full pl-9`} placeholder="Search by name, staff number or e-mail" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <label className="sr-only" htmlFor="team-role-filter">Filter by role</label>
            <select id="team-role-filter" className={inputCls} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option>{roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
            <label className="sr-only" htmlFor="team-status-filter">Filter by status</label>
            <select id="team-status-filter" className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="current">Current staff</option><option value="active">Active</option><option value="onboarding">Onboarding</option><option value="suspended">Suspended</option><option value="former">Former staff</option><option value="all">Everyone</option>
            </select>
          </div>
          {listed.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-8" data-testid="members-empty">{staff.length + former.length === 0 ? 'No staff have joined yet. Invite someone from the Invitations section; they start with Basic Staff Access.' : 'No staff match these filters.'}</p>
          ) : (
            <div className="rounded-xl border border-[#D7E7E4] bg-white" role="table" aria-label="Team members">
              <div role="row" className="hidden md:grid md:grid-cols-[110px_1.2fr_1.2fr_1fr_90px_110px_120px_90px] gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B] border-b border-[#EEF3F2]">
                <span role="columnheader">Staff ID</span><span role="columnheader">Name</span><span role="columnheader">Business e-mail</span><span role="columnheader">Role</span><span role="columnheader">Access</span><span role="columnheader">Employed since</span><span role="columnheader">Status</span><span role="columnheader">Actions</span>
              </div>
              {listed.map((m) => {
                const name = memberName(m); const st = displayStatus(m);
                return (
                  <div role="row" key={m.id} data-testid={`member-row-${m.id}`} className="grid gap-1 md:grid-cols-[110px_1.2fr_1.2fr_1fr_90px_110px_120px_90px] md:gap-2 items-center px-3 py-3 text-sm text-[#0A3340] border-b border-[#EEF3F2] last:border-0">
                    <span role="cell" className="font-mono text-xs font-bold" data-testid="cell-staff-id"><span className="md:hidden text-[#64748B] font-sans font-normal">Staff ID: </span>{m.staffNumber || '—'}</span>
                    <span role="cell" className="flex items-center gap-2 min-w-0"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E3F1EF] text-[10px] font-bold text-[#176B87]">{initials(name)}</span><span className="truncate font-medium" title={name}>{name}</span></span>
                    <span role="cell" className="truncate text-[#475569]"><span className="md:hidden text-[#64748B]">Business e-mail: </span>{m.businessEmail || '—'}</span>
                    <span role="cell"><span className="px-2 py-0.5 rounded-full text-xs bg-[#EEF7F5] text-[#0A3340]">{m.roleLabel || roleLabel(m.role)}</span></span>
                    <span role="cell" className="text-xs text-[#475569]"><span className="md:hidden text-[#64748B]">Access: </span>{m.accessLevel || '—'}</span>
                    <span role="cell" className="text-xs text-[#475569]"><span className="md:hidden text-[#64748B]">Since: </span>{fmtDate(m.employmentStartDate)}</span>
                    <span role="cell"><span className={`px-2 py-0.5 rounded-full text-xs ${st.cls}`}>{st.label}</span></span>
                    <span role="cell"><button type="button" className={`${btnCls} inline-flex items-center gap-1`} onClick={() => setSelectedId(m.id)} aria-label={`View ${name}`}><Eye className="w-3.5 h-3.5" aria-hidden="true" />View</button></span>
                  </div>
                );
              })}
            </div>
          )}
          {selected && <StaffDetail key={selected.id} member={selected} roles={roles} employmentAvailable={employmentAvailable} onClose={() => setSelectedId(null)} onChanged={refresh} />}
        </div>
      )}

      {tab === 'invitations' && (
        <div className="space-y-4">
          <form onSubmit={invite} noValidate aria-label="Invite team member" className="p-4 rounded-xl bg-[#F3FAF9] border border-[#D7E7E4] space-y-3">
            <h4 className="text-sm font-bold text-[#0A3340]">Invite a team member</h4>
            <p className="text-sm text-[#0A3340]" data-testid="basic-default-note">Every new employee starts with Basic Staff Access. You can assign their operational role after they join.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="team-invite-email" className="block text-xs font-medium text-[#0A3340] mb-1">Email</label>
                <input id="team-invite-email" type="email" className={`${inputCls} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} disabled={inviting} autoComplete="off" aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? 'team-invite-email-error' : 'team-invite-email-hint'} />
                <p id="team-invite-email-hint" className="text-[11px] text-[#64748B] mt-1">The invitation link goes only to this address. The person must sign in or register with it.</p>
                {emailError && <p id="team-invite-email-error" role="alert" className="text-xs text-[#B42318] mt-1">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="team-invite-name" className="block text-xs font-medium text-[#0A3340] mb-1">Employee name (optional)</label>
                <input id="team-invite-name" className={`${inputCls} w-full`} value={employeeName} maxLength={80} onChange={(e) => setEmployeeName(e.target.value)} disabled={inviting} autoComplete="off" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="team-invite-biz" className="block text-xs font-medium text-[#0A3340] mb-1">Business e-mail (optional, recorded contact)</label>
                <input id="team-invite-biz" type="email" className={`${inputCls} w-full`} value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} disabled={inviting} autoComplete="off" aria-invalid={bizError ? true : undefined} aria-describedby="team-invite-biz-hint" />
                <p id="team-invite-biz-hint" className="text-[11px] text-[#64748B] mt-1">A contact address you record for this employee. KAYARD KE does not create a mailbox, and it is never used to sign in or to deliver this invitation.</p>
                {bizError && <p role="alert" className="text-xs text-[#B42318] mt-1">{bizError}</p>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-white border border-[#D7E7E4] p-3" data-testid="basic-allows"><p className="font-bold text-[#0A3340] mb-1">Basic Staff Access allows</p><ul className="list-disc pl-4 text-[#475569] space-y-0.5"><li>Registering or signing in, and verifying their e-mail</li><li>Accepting this invitation</li><li>Completing their staff profile</li><li>Seeing their own staff number, role and employment status</li></ul></div>
              <div className="rounded-lg bg-white border border-[#D7E7E4] p-3" data-testid="basic-denies"><p className="font-bold text-[#0A3340] mb-1">It does not allow</p><ul className="list-disc pl-4 text-[#475569] space-y-0.5"><li>Seeing leads, customers, finance or earnings</li><li>Creating or editing listings, or approving deals</li><li>Managing staff, roles or dealership settings</li></ul></div>
            </div>
            {email.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && (
              <p className="text-xs text-[#475569]" data-testid="invite-preview">Preview: {employeeName.trim() || email.trim()} will get an e-mail from KAYARD KE naming your dealership and “Basic Staff Access”, with a link that works for 7 days and only for {email.trim().toLowerCase()}.</p>
            )}
            <button type="submit" disabled={inviting} aria-busy={inviting} className={primaryBtnCls}>
              {inviting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {inviting ? 'Sending…' : 'Send invitation'}
            </button>
          </form>

          <h4 className="text-sm font-bold text-[#0A3340]">Pending invitations ({pending.length})</h4>
          {pending.length === 0 ? <p className="text-sm text-[#64748B] text-center py-6">No invitations are waiting.</p> : (
            <ul className="space-y-3" aria-label="Pending invitations">
              {pending.map((m) => {
                const name = memberName(m); const busy = busyId === m.id; const st = displayStatus(m);
                return (
                  <li key={m.id} className="p-4 bg-[#F6FAF9] rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-[#0A3340] truncate">{m.inviteEmail}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${st.cls}`}>{st.label}</span>
                      <p className="text-xs text-[#475569] mt-1">{m.roleLabel || roleLabel(m.role)} · {m.inviteExpiresAt ? `${isExpired(m) ? 'expired' : 'expires'} ${fmtDate(m.inviteExpiresAt)}` : 'no expiry set'}{m.member ? ' · returning employee' : ''}</p>
                      <p className="text-xs text-[#475569] mt-1">Waiting for the invitee to accept. They cannot be activated from here.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className={btnCls} disabled={busy} onClick={() => run(m.id, () => dealerApi.resendTeamInvite(m.id), (res) => (res?.email?.sent === false ? `Invitation for ${name} was not re-sent.` : `Invitation re-sent to ${name}.`))}>Resend invitation</button>
                      {confirmId === m.id ? (
                        <div role="group" aria-label={`Confirm cancelling the invitation for ${name}`} onKeyDown={(e) => { if (e.key === 'Escape') setConfirmId(null); }} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-[#FEF3F2] border border-[#FDA29B]">
                          <span className="text-xs text-[#7A271A]">Cancel the invitation for {name}? The link stops working.</span>
                          <button ref={confirmRef} type="button" className={`${btnCls} !text-[#B42318]`} disabled={busy} onClick={async () => { await run(m.id, () => dealerApi.removeTeamMember(m.id), `Invitation for ${name} cancelled.`); setConfirmId(null); }}>Confirm</button>
                          <button type="button" className={btnCls} onClick={() => setConfirmId(null)}>Keep</button>
                        </div>
                      ) : (
                        <button type="button" className={btnCls} disabled={busy} onClick={() => setConfirmId(m.id)} aria-label={`Cancel invitation for ${name}`}>Cancel invitation</button>
                      )}
                      {busy && <Loader2 className="w-4 h-4 animate-spin text-[#176B87]" aria-label="Working" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'roles' && <RolesTab roles={roles} permDefs={permDefs} customAvailable={customAvailable} team={team} reloadRoles={loadRoles} onChanged={refresh} />}

      {tab === 'records' && (
        <section aria-label="Employment records" className="space-y-3">
          <p className="text-sm text-[#475569]">Every hire, role change, suspension and departure, kept even after someone leaves. Dealer-managed: only people with team access can see it.</p>
          {!employmentAvailable ? <p role="status" className="text-sm text-[#64748B]">Employment records are not switched on yet.</p>
            : !events.loaded ? <p role="status" className="text-sm text-[#475569]">Loading employment records…</p>
            : events.error ? <p role="alert" className="text-sm text-[#7A271A]">{events.error}</p>
            : events.items.length === 0 ? <p className="text-sm text-[#64748B] text-center py-6">No employment events yet.</p> : (
              <ol className="divide-y divide-[#EEF3F2] rounded-xl border border-[#D7E7E4] bg-white" aria-label="Employment events" data-testid="records-list">
                {events.items.map((e) => {
                  const m = team.find((x) => x.id === e.teamId);
                  return <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm text-[#0A3340]"><span><strong>{m ? memberName(m) : 'Team member'}</strong>{e.staffNumber ? <span className="font-mono text-xs text-[#64748B]"> {e.staffNumber}</span> : null} — {describeEvent(e, roles)}{e.reason ? <span className="text-[#475569]"> ({e.reason})</span> : null}</span><time className="text-xs text-[#64748B]" dateTime={e.at}>{fmtDate(e.at)}</time></li>;
                })}
              </ol>
            )}
        </section>
      )}

      {tab === 'activity' && (
        <section aria-label="Dealer activity" className="space-y-3">
          <p className="text-sm text-[#475569]">What your team has done in your dealership (listings published, paused, sold). This is for you as the dealership; KAYARD KE does not run a staff supervision dashboard.</p>
          {!activity.loaded ? <p role="status" className="text-sm text-[#475569]">Loading activity…</p>
            : activity.error ? <p role="alert" className="text-sm text-[#7A271A]">{activity.error}</p>
            : !activity.data || (activity.data.activity || []).length === 0 ? <p className="text-sm text-[#64748B] text-center py-6" data-testid="activity-empty">No team activity recorded yet.</p> : (
              <ul className="divide-y divide-[#EEF3F2] rounded-xl border border-[#D7E7E4] bg-white" aria-label="Team activity" data-testid="activity-list">
                {activity.data.activity.map((a: any) => <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-[#0A3340]"><span className="min-w-0 flex-1">{a.message}</span><time className="shrink-0 text-xs text-[#64748B]" dateTime={a.at}>{fmtDate(a.at)}</time></li>)}
              </ul>
            )}
        </section>
      )}

      <section aria-label="Employment lifecycle" className="rounded-xl border border-[#D7E7E4] bg-white p-4">
        <h4 className="text-sm font-bold text-[#0A3340] mb-2 flex items-center gap-2"><Users className="w-4 h-4" aria-hidden="true" /> Employment lifecycle</h4>
        <ol className="grid gap-2 sm:grid-cols-5 text-xs text-[#475569]">
          <li><strong className="block text-[#0A3340]">1 Invite</strong>Add an e-mail. Basic Staff Access is applied.</li>
          <li><strong className="block text-[#0A3340]">2 Enrol</strong>They register or sign in and accept.</li>
          <li><strong className="block text-[#0A3340]">3 Verify</strong>Their e-mail is verified; a staff number is issued.</li>
          <li><strong className="block text-[#0A3340]">4 Assign role</strong>Give the right role. Change it any time.</li>
          <li><strong className="block text-[#0A3340]">5 Manage</strong>Suspend, end employment or re-hire. History is kept.</li>
        </ol>
      </section>
    </div>
  );
}
