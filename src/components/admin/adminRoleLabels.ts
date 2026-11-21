// One label map for the admin header and the dashboard hero so the same role is never spelled two ways.
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', marketing: 'Marketing',
  technical_support: 'Tech Support', hr: 'HR', accounts: 'Accounts',
  escrow_officer: 'Escrow Officer', ad_manager: 'Ad Manager', moderator: 'Moderator',
  ghost_checker: 'Ghost Checker',
};

export const adminRoleLabel = (role: unknown): string | null => {
  if (typeof role !== 'string' || !role.trim()) return null;
  return ADMIN_ROLE_LABELS[role] || role.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};
