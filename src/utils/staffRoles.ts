// Presentation helper for the public shell (navbar, dashboard hub): which accounts get the administration menu
// instead of the buyer/seller shortcuts. It DERIVES from the canonical STAFF_ROLES in ./authRoutes (the same list
// that sets AuthContext.isAdmin), so the menu cannot drift from the access rules. Inspectors (ghost_checker) keep
// their own dashboard and are intentionally not treated as admin staff here.
// Presentation only: authorization is enforced by the backend, never by this list.
import { STAFF_ROLES as ACCESS_STAFF_ROLES } from './authRoutes';

const STAFF_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Administrator', moderator: 'Moderator', marketing: 'Marketing',
  technical_support: 'Technical Support', hr: 'HR', accounts: 'Accounts', escrow_officer: 'Escrow Officer', ad_manager: 'Ad Manager',
};

export const isStaffRole = (role: unknown): boolean =>
  typeof role === 'string' && role !== 'ghost_checker' && (ACCESS_STAFF_ROLES as readonly string[]).includes(role);

export const staffRoleLabel = (role: unknown): string => (typeof role === 'string' && STAFF_ROLE_LABELS[role]) || 'Staff';
