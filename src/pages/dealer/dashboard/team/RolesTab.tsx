import React, { useState } from 'react';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import * as dealerApi from '../../../../services/dealerPlatformApi';
import { TeamRole, PermissionDef, actionError, btnCls, inputCls, primaryBtnCls } from './teamShared';

const summarize = (perms: Record<string, boolean> | undefined, defs: PermissionDef[]) => {
  const on = defs.filter((d) => perms?.[d.key]).map((d) => d.label);
  return on.length ? on.join(' · ') : 'No permissions: can look but not act';
};

interface Props { roles: TeamRole[]; permDefs: PermissionDef[]; customAvailable: boolean; team: any[]; reloadRoles: () => Promise<void>; onChanged: () => void }

/** Roles & Permissions: built-in roles (fixed), the owner's custom roles, a read-only permission matrix and the protected boundaries. */
export default function RolesTab({ roles, permDefs, customAvailable, team, reloadRoles, onChanged }: Props) {
  const blank = { key: '', label: '', description: '', permissions: {} as Record<string, boolean> };
  const [draft, setDraft] = useState<typeof blank | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<string | null>(null);
  const counts = (key: string) => team.filter((m) => m.role === key && ['active', 'suspended'].includes(m.status)).length;

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || roleBusy) return;
    if (draft.label.trim().length < 2) { setRoleError('Give the role a name of at least 2 characters.'); return; }
    setRoleBusy(true); setRoleError(null); setNotice(null);
    try {
      const body = { label: draft.label.trim(), description: draft.description.trim(), permissions: draft.permissions };
      const res: any = draft.key ? await dealerApi.updateTeamRole(draft.key, body) : await dealerApi.createTeamRole(body);
      if (res?.success === false) { setRoleError(res.message || 'The role could not be saved.'); return; }
      setNotice(draft.key ? `Role “${body.label}” updated${res?.updatedMembers ? `; ${res.updatedMembers} member${res.updatedMembers === 1 ? '' : 's'} now have the new permissions` : ''}${res?.keptCustom ? `. ${res.keptCustom} member${res.keptCustom === 1 ? '' : 's'} with individually adjusted access kept their own permissions` : ''}.` : `Role “${body.label}” created.`);
      setDraft(null);
      await reloadRoles();
      onChanged();
    } catch (err) { setRoleError(actionError(err)); } finally { setRoleBusy(false); }
  };
  const resetRole = async (key: string) => {
    setRoleBusy(true); setRoleError(null); setNotice(null);
    try {
      const res: any = await dealerApi.resetTeamRole(key);
      if (res?.success === false) { setRoleError(res.message || 'The role could not be reset.'); return; }
      setNotice(`Role reset to its default permissions${res?.updatedMembers ? `; ${res.updatedMembers} member${res.updatedMembers === 1 ? '' : 's'} updated` : ''}.`); setResetKey(null);
      await reloadRoles(); onChanged();
    } catch (err) { setRoleError(actionError(err)); setResetKey(null); } finally { setRoleBusy(false); }
  };
  const removeRole = async (key: string) => {
    setRoleBusy(true); setRoleError(null); setNotice(null);
    try {
      const res: any = await dealerApi.deleteTeamRole(key);
      if (res?.success === false) { setRoleError(res.message || 'The role could not be deleted.'); return; }
      setNotice('Role deleted.'); setDeleteKey(null);
      await reloadRoles();
    } catch (err) { setRoleError(actionError(err)); setDeleteKey(null); } finally { setRoleBusy(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#475569]">A role is a set of permissions. New employees start with <strong>Basic Staff Access</strong>; you then assign an operational role. You can edit any role (including the built-in ones) or create your own, and you can also adjust any one person’s access from their staff details. Changing a role updates everyone in it, except people whose access you adjusted individually. Basic Staff Access is the fixed starting level and cannot be changed.</p>
      {!customAvailable && (
        <p role="status" className="p-3 rounded-lg bg-[#FFF4D6] border border-[#F2D58A] text-sm text-[#7A4B00]"><ShieldCheck className="inline w-4 h-4 mr-1" aria-hidden="true" />Custom roles are not switched on yet: the platform database needs the “dealer team custom roles” update. Built-in roles keep working.</p>
      )}
      {notice && <p role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">{notice}</p>}
      {roleError && <div role="alert" className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">{roleError}</div>}

      <ul className="space-y-3" aria-label="Roles">
        {roles.map((r) => (
          <li key={r.key} className="p-4 bg-[#F6FAF9] rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#0A3340]">{r.label} <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#EEF7F5] text-[#475569]">{r.onboarding ? 'Onboarding level' : r.builtin ? (r.customised ? 'Built-in · customised' : 'Built-in') : 'Custom'}</span> <span className="ml-1 text-xs text-[#64748B]" data-testid={`role-count-${r.key}`}>{counts(r.key)} member{counts(r.key) === 1 ? '' : 's'}</span></p>
                {r.description && <p className="text-xs text-[#475569]">{r.description}</p>}
                <p className="text-xs text-[#475569] mt-1">{summarize(r.permissions, permDefs)}</p>
                {r.onboarding && <p className="text-[11px] text-[#64748B] mt-1">Fixed starting level. Grant extra access to a person from their staff details.</p>}
              </div>
              {!r.locked && !r.onboarding && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnCls} onClick={() => { setRoleError(null); setDraft({ key: r.key, label: r.label, description: r.description || '', permissions: { ...r.permissions } }); }} aria-label={`Edit role ${r.label}`}>Edit</button>
                  {r.builtin && r.customised && (resetKey === r.key ? (
                    <>
                      <button type="button" className={btnCls} disabled={roleBusy} onClick={() => resetRole(r.key)}>Confirm reset</button>
                      <button type="button" className={btnCls} onClick={() => setResetKey(null)}>Keep</button>
                    </>
                  ) : (
                    <button type="button" className={btnCls} onClick={() => setResetKey(r.key)} aria-label={`Reset role ${r.label} to default`}>Reset to default</button>
                  ))}
                  {!r.builtin && (deleteKey === r.key ? (
                    <>
                      <button type="button" className={`${btnCls} !text-[#B42318]`} disabled={roleBusy} onClick={() => removeRole(r.key)}>Confirm delete</button>
                      <button type="button" className={btnCls} onClick={() => setDeleteKey(null)}>Keep</button>
                    </>
                  ) : (
                    <button type="button" className={btnCls} onClick={() => setDeleteKey(r.key)} aria-label={`Delete role ${r.label}`}>Delete</button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!draft ? (
        <button type="button" className={primaryBtnCls} disabled={!customAvailable || !permDefs.length} onClick={() => { setRoleError(null); setDraft({ ...blank }); }}>Create a custom role</button>
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
            <button type="submit" disabled={roleBusy} className={primaryBtnCls}>{roleBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}Save role</button>
            <button type="button" className={btnCls} disabled={roleBusy} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}

      {permDefs.length > 0 && (
        <section aria-label="Permission matrix" className="rounded-xl border border-[#D7E7E4] bg-white">
          <h4 className="px-4 pt-3 text-sm font-bold text-[#0A3340]">Permission matrix</h4>
          <div className="overflow-x-auto p-2" tabIndex={0} role="region" aria-label="Permission matrix table">
            <table className="w-full min-w-[520px] text-xs text-[#0A3340]">
              <thead><tr><th scope="col" className="text-left p-2 font-bold">Permission</th>{roles.map((r) => <th key={r.key} scope="col" className="p-2 font-bold text-center">{r.label}</th>)}</tr></thead>
              <tbody>
                {permDefs.map((p) => (
                  <tr key={p.key} className="border-t border-[#EEF3F2]"><th scope="row" className="text-left p-2 font-normal">{p.label}</th>
                    {roles.map((r) => <td key={r.key} className="p-2 text-center" aria-label={`${r.label}: ${r.permissions?.[p.key] ? 'allowed' : 'not allowed'}`}>{r.permissions?.[p.key] ? '✓' : '–'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-label="Protected boundaries" className="rounded-xl border border-[#D7E7E4] bg-[#F3FAF9] p-4 text-sm text-[#0A3340]" data-testid="protected-boundaries">
        <h4 className="flex items-center gap-2 text-sm font-bold"><Lock size={14} aria-hidden="true" /> Always protected</h4>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-[#475569]">
          <li>The dealership <strong>Owner</strong> is a protected role: full control, cannot be created, edited or removed here, and no role (including Manager) inherits ownership.</li>
          <li>Only the owner can create, edit, reset or delete roles, promote someone to Manager, or change a Manager. Every change is recorded.</li>
          <li>Nobody can change their own role, permissions or status, and a person can only hand out permissions they hold themselves.</li>
          <li>Banking, payouts, subscription and payment settings stay with the owner account; no role can delegate them.</li>
        </ul>
      </section>
    </div>
  );
}
