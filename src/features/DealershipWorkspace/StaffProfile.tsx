import React, { useEffect, useState } from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { getMyStaffProfile, updateMyStaffProfile } from '../../services/dealerPlatformApi';

type Profile = {
  dealershipName: string; staffNumber: string | null; roleKey: string; roleLabel: string; accessLevel: string; employmentStatus: string;
  employmentStartDate: string | null; loginEmail: string; businessEmail: string | null; displayName: string | null; workPhone: string | null;
  profileCompleted: boolean; isBasicAccess: boolean; permissions: string[];
};

const STATUS: Record<string, string> = { onboarding: 'Onboarding', active: 'Active', suspended: 'Suspended', invited: 'Invited' };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded');

/** The employee's OWN staff identity. Reachable with Basic Staff Access (an active membership is all the server asks for). */
export default function StaffProfile() {
  const [state, setState] = useState<{ loading: boolean; profile: Profile | null; error: string | null; available: boolean }>({ loading: true, profile: null, error: null, available: true });
  const [displayName, setDisplayName] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    getMyStaffProfile()
      .then((r: any) => { if (!live) return; const p = r?.data as Profile; setState({ loading: false, profile: p, error: null, available: r?.employmentAvailable !== false }); setDisplayName(p?.displayName || ''); setWorkPhone(p?.workPhone || ''); })
      .catch(() => live && setState({ loading: false, profile: null, error: 'Your staff profile could not be loaded right now.', available: true }));
    return () => { live = false; };
  }, []);

  if (state.loading) return <p role="status" className="text-sm text-[#475569]">Loading your staff profile…</p>;
  if (!state.profile) return <p role="alert" className="text-sm text-[#7A271A]">{state.error}</p>;
  const p = state.profile;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!displayName.trim()) { setMsg({ kind: 'error', text: 'Enter the name the dealership should use for you.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const r: any = await updateMyStaffProfile({ displayName: displayName.trim(), workPhone: workPhone.trim() || undefined });
      if (r?.success === false) { setMsg({ kind: 'error', text: r.message || 'Your profile could not be saved.' }); return; }
      setState((s) => ({ ...s, profile: s.profile ? { ...s.profile, displayName: displayName.trim(), workPhone: workPhone.trim() || null, profileCompleted: true } : s.profile }));
      setMsg({ kind: 'ok', text: 'Your staff profile is saved.' });
    } catch (err: any) { setMsg({ kind: 'error', text: err?.response?.data?.message || 'Your profile could not be saved.' }); } finally { setSaving(false); }
  };

  const row = (label: string, value: React.ReactNode, testid?: string) => (<div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-2 border-b border-[#EEF3F2] last:border-0"><dt className="text-xs font-bold text-[#64748B]">{label}</dt><dd className="text-sm text-[#0A3340] break-words" data-testid={testid}>{value}</dd></div>);

  return (
    <section aria-label="My staff profile" className="space-y-4" data-testid="staff-profile">
      {!p.profileCompleted && state.available && <p role="status" className="rounded-lg border border-[#F2D58A] bg-[#FFF4D6] p-3 text-sm text-[#7A4B00]" data-testid="profile-incomplete">Welcome to {p.dealershipName}. Please complete your staff profile below so the dealership knows how to reach you.</p>}
      {p.isBasicAccess && (
        <div className="rounded-xl border border-[#B8DDD8] bg-[#EEF8F6] p-4 text-sm text-[#0A3340]" data-testid="basic-access-note">
          <p className="flex items-center gap-2 font-bold"><ShieldCheck size={16} aria-hidden="true" /> You have Basic Staff Access</p>
          <p className="mt-1">This is where every new employee starts. You can see your own staff profile here. {p.dealershipName} will give you a working role (and the access that goes with it) when they are ready. You cannot see leads, customers, listings, deals, finance or the team until then.</p>
        </div>
      )}
      <dl className="rounded-xl border border-[#D7E7E4] bg-white px-4 py-2" aria-label="Staff identity">
        {row('Dealership', p.dealershipName)}
        {row('Staff number', p.staffNumber ? <span className="inline-flex items-center gap-1 font-mono font-bold"><BadgeCheck size={14} aria-hidden="true" />{p.staffNumber}</span> : 'Not issued yet', 'staff-number')}
        {row('Role', p.roleLabel, 'staff-role')}
        {row('Access level', p.accessLevel, 'staff-access')}
        {row('Employment status', STATUS[p.employmentStatus] || p.employmentStatus)}
        {row('Employed since', fmt(p.employmentStartDate))}
        {row('Login e-mail (your personal account)', p.loginEmail)}
        {row('Business e-mail (recorded by the dealership)', p.businessEmail || 'None recorded', 'staff-business-email')}
      </dl>
      {state.available ? (
        <form onSubmit={save} noValidate aria-label="Complete your staff profile" className="rounded-xl border border-[#D7E7E4] bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#0A3340]">Your details for this dealership</h2>
          <div><label htmlFor="staff-display-name" className="block text-xs font-medium text-[#0A3340] mb-1">Name to use at {p.dealershipName}</label>
            <input id="staff-display-name" className="w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} disabled={saving} autoComplete="name" /></div>
          <div><label htmlFor="staff-work-phone" className="block text-xs font-medium text-[#0A3340] mb-1">Work phone (optional)</label>
            <input id="staff-work-phone" type="tel" inputMode="tel" className="w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm" value={workPhone} onChange={(e) => setWorkPhone(e.target.value)} disabled={saving} autoComplete="tel" /></div>
          {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${msg.kind === 'error' ? 'text-[#B42318]' : 'text-emerald-800'}`}>{msg.text}</p>}
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60">{saving ? 'Saving…' : 'Save my details'}</button>
          <p className="text-xs text-[#64748B]">This does not change your personal KAYARD KE account, listings, purchases or messages. Your role, access, staff number and business e-mail are managed by the dealership.</p>
        </form>
      ) : <p role="status" className="text-sm text-[#475569]">Staff profiles are not switched on for this platform yet.</p>}
    </section>
  );
}
