import React, { useState } from 'react';
import organizationApi, { type Branch, type OrgSummary } from '../services/organizationApi';
import { can } from './orgAccess';
import { Loading, ErrorBox, Empty, Notice, Pill, field, btnPrimary, btnGhost, btnDanger, useLoader, useAction } from './orgUi';

const tone = (s: Branch['status']) => (s === 'active' ? 'ok' : s === 'suspended' ? 'warn' : 'bad');

export const BranchesPanel: React.FC<{ org: OrgSummary }> = ({ org }) => {
  const role = org.you.role;
  const manage = can(role, 'branchManage');
  const { data, loading, error, reload } = useLoader(() => organizationApi.listBranches(org.id), [org.id]);
  const { busy, msg, run } = useAction(reload);
  const [form, setForm] = useState({ name: '', town: '', county: '', address: '', phone: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: '', town: '', county: '', address: '', phone: '' });
  const [statusFor, setStatusFor] = useState<{ id: string; status: 'suspended' | 'closed' } | null>(null);
  const [why, setWhy] = useState('');

  if (loading && !data) return <Loading label="Loading branches…" />;
  if (error) return <ErrorBox error={error} what="branches" onRetry={reload} />;
  const branches = data?.branches ?? [];

  return (
    <section aria-labelledby="org-branches" className="space-y-4">
      <div>
        <h2 id="org-branches" className="text-lg font-bold text-[#0A3340]">Branches</h2>
        <p className="text-sm text-[#64748B]">{role === 'branch_manager' ? 'Your branch.' : 'Each branch is a location of this one business. Staff and bookings belong to a branch or to the whole organization.'}</p>
      </div>
      <Notice msg={msg} />
      {branches.length === 0 ? (
        <Empty title="No branches yet" hint={manage ? 'Add your head office first. Bookings can then be routed to it.' : 'The organization has not added a branch.'} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {branches.map((b) => (
            <li key={b.id} className="rounded-xl border border-[#D7E7E4] bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[#0A3340] break-words">{b.name}</h3>
                {b.is_head_office && <Pill tone="neutral">Head office</Pill>}
                <Pill tone={tone(b.status)}>{b.status}</Pill>
              </div>
              <p className="text-sm text-[#64748B]">{[b.address, b.town, b.county].filter(Boolean).join(', ') || 'Address not provided'}{b.phone ? ` · ${b.phone}` : ''}</p>
              {b.status !== 'active' && b.status_reason && <p className="text-xs text-[#64748B]">Reason: {b.status_reason}</p>}
              {manage && b.status !== 'closed' && editing !== b.id && statusFor?.id !== b.id && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnGhost} disabled={busy} onClick={() => { setEditing(b.id); setEdit({ name: b.name, town: b.town || '', county: b.county || '', address: b.address || '', phone: b.phone || '' }); }}>Edit details</button>
                  {b.status === 'active' && !b.is_head_office && <button type="button" className={btnGhost} disabled={busy} onClick={() => { setStatusFor({ id: b.id, status: 'suspended' }); setWhy(''); }}>Suspend</button>}
                  {b.status === 'suspended' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => void run(() => organizationApi.setBranchStatus(org.id, b.id, 'active'), `${b.name} is active again.`)}>Reactivate</button>}
                  {!b.is_head_office && <button type="button" className={btnDanger} disabled={busy} onClick={() => { setStatusFor({ id: b.id, status: 'closed' }); setWhy(''); }}>Close permanently</button>}
                </div>
              )}
              {editing === b.id && (
                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => organizationApi.updateBranch(org.id, b.id, edit), 'Branch updated.').then((ok) => ok && setEditing(null)); }}>
                  {(['name', 'address', 'town', 'county', 'phone'] as const).map((k) => (
                    <div key={k}><label className="text-xs font-bold capitalize" htmlFor={`be-${b.id}-${k}`}>{k}</label>
                      <input id={`be-${b.id}-${k}`} className={field} value={edit[k]} required={k === 'name'} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
                  ))}
                  <div className="flex gap-2"><button type="submit" className={btnPrimary} disabled={busy}>Save</button><button type="button" className={btnGhost} onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              )}
              {statusFor?.id === b.id && (
                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => organizationApi.setBranchStatus(org.id, b.id, statusFor.status, why), statusFor.status === 'closed' ? 'Branch closed.' : 'Branch suspended. Its staff cannot work until it is reactivated.').then((ok) => ok && setStatusFor(null)); }}>
                  <label className="text-xs font-bold" htmlFor={`bs-${b.id}`}>{statusFor.status === 'closed' ? 'Why is this branch closing? (permanent)' : 'Why is this branch being suspended?'}</label>
                  <input id={`bs-${b.id}`} className={field} value={why} required minLength={3} onChange={(e) => setWhy(e.target.value)} />
                  <p className="text-xs text-[#64748B]">{statusFor.status === 'closed' ? 'A branch with team members or open bookings cannot be closed.' : 'Members tied to this branch lose access immediately.'}</p>
                  <div className="flex gap-2"><button type="submit" className={statusFor.status === 'closed' ? btnDanger : btnPrimary} disabled={busy || why.trim().length < 3}>{statusFor.status === 'closed' ? 'Close branch' : 'Suspend branch'}</button><button type="button" className={btnGhost} onClick={() => setStatusFor(null)}>Cancel</button></div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {manage && (
        <form className="rounded-xl border border-[#D7E7E4] bg-white p-4 space-y-3" aria-labelledby="org-branch-add" onSubmit={(e) => { e.preventDefault(); void run(() => organizationApi.createBranch(org.id, { name: form.name.trim(), town: form.town || undefined, county: form.county || undefined, address: form.address || undefined, phone: form.phone || undefined, isHeadOffice: branches.length === 0 }), 'Branch added.').then((ok) => ok && setForm({ name: '', town: '', county: '', address: '', phone: '' })); }}>
          <h3 id="org-branch-add" className="font-bold text-[#0A3340]">Add a branch</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['name', 'town', 'county', 'address', 'phone'] as const).map((k) => (
              <div key={k} className={k === 'address' ? 'sm:col-span-2' : ''}><label className="text-xs font-bold capitalize" htmlFor={`ba-${k}`}>{k}{k === 'name' ? ' *' : ''}</label>
                <input id={`ba-${k}`} className={field} value={form[k]} required={k === 'name'} maxLength={k === 'phone' ? 40 : 160} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
          </div>
          {branches.length === 0 && <p className="text-xs text-[#64748B]">The first branch you add becomes the head office.</p>}
          <button type="submit" className={btnPrimary} disabled={busy || form.name.trim().length < 2}>Add branch</button>
        </form>
      )}
    </section>
  );
};
export default BranchesPanel;
