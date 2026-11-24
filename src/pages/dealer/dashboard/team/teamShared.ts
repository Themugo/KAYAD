export interface TeamRole { key: string; label: string; description?: string; permissions: Record<string, boolean>; builtin?: boolean; onboarding?: boolean }
export interface PermissionDef { key: string; label: string }

export const inputCls = 'px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3340]';
export const btnCls = 'px-3 py-1 text-xs font-bold text-[#176B87] border border-[#B9D3CF] rounded-lg hover:bg-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]';
export const primaryBtnCls = 'px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]';

export function actionError(err: any): string {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 403) return msg && !/DEALER_PERMISSION/.test(msg) ? msg : 'You do not have permission to manage the team.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 409) return msg || 'That conflicts with the current team setup.';
  if (status === 503) return msg || 'This feature is not available yet.';
  return msg || 'That action could not be completed. Please try again.';
}

export const memberName = (m: any): string => m.staffDisplayName || m.memberProfile?.name || m.inviteEmail || m.memberProfile?.email || 'Team member';
export const initials = (name: string) => name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const isExpired = (m: any) => m.status === 'invited' && !!m.inviteExpiresAt && new Date(m.inviteExpiresAt).getTime() <= Date.now();
export const isFormer = (m: any) => m.status === 'removed' && !!m.member;
export const isCancelled = (m: any) => m.status === 'removed' && !m.member;

/** One display status from the two server statuses (access + employment). The server stays the authority; this only words it. */
export function displayStatus(m: any): { key: string; label: string; cls: string } {
  if (m.status === 'invited') return isExpired(m) ? { key: 'expired', label: 'Invitation expired', cls: 'bg-[#FEF3F2] text-[#7A271A]' } : { key: 'invited', label: 'Pending invitation', cls: 'bg-[#FFF4D6] text-[#7A4B00]' };
  if (m.status === 'suspended') return { key: 'suspended', label: 'Suspended', cls: 'bg-[#FEF3F2] text-[#7A271A]' };
  if (m.status === 'active') return m.employmentStatus === 'onboarding' ? { key: 'onboarding', label: 'Onboarding', cls: 'bg-[#E0F2FE] text-[#075985]' } : { key: 'active', label: 'Active', cls: 'bg-emerald-100 text-emerald-800' };
  if (m.status === 'removed' && m.member) {
    const l = { resigned: 'Resigned', archived: 'Archived' } as Record<string, string>;
    return { key: m.employmentStatus || 'terminated', label: l[m.employmentStatus] || 'Employment ended', cls: 'bg-[#EEF2F6] text-[#475569]' };
  }
  return { key: 'cancelled', label: 'Invitation cancelled', cls: 'bg-[#EEF2F6] text-[#475569]' };
}

export const EVENT_LABELS: Record<string, string> = {
  invited: 'Invitation sent', invitation_resent: 'Invitation re-sent', invitation_cancelled: 'Invitation cancelled', accepted: 'Accepted the invitation and joined',
  profile_completed: 'Completed their staff profile', role_changed: 'Role changed', permissions_changed: 'Permissions changed', business_email_changed: 'Business e-mail recorded',
  suspended: 'Access suspended', reinstated: 'Access reinstated', terminated: 'Employment ended', resigned: 'Resignation recorded', archived: 'Record archived',
  rehire_invited: 'Re-hire invitation sent', staff_number_assigned: 'Staff number issued',
  temporary_duty_granted: 'Temporary duties lent', temporary_duty_revoked: 'Temporary duties revoked',
};
export function describeEvent(e: any, roles: TeamRole[]): string {
  const rl = (k?: string) => roles.find((r) => r.key === k)?.label || String(k || '').replace(/_/g, ' ');
  const base = EVENT_LABELS[e.type] || String(e.type).replace(/_/g, ' ');
  if (e.type === 'role_changed') return `${base}: ${rl(e.from?.role)} → ${rl(e.to?.role)}`;
  if (e.type === 'staff_number_assigned') return `${base}: ${e.staffNumber || e.to?.staffNumber || ''}`.trim();
  if (e.type === 'business_email_changed') return `${base}${e.to?.businessEmail ? `: ${e.to.businessEmail}` : ' (cleared)'}`;
  return base;
}
