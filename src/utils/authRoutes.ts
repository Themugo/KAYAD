import { safeNextPath } from './authIntent';
import { canOpenAdminPage, getEffectivePermissions } from './permissions';

export const STAFF_ROLES = [
  'admin',
  'superadmin',
  'marketing',
  'technical_support',
  'hr',
  'accounts',
  'escrow_officer',
  'ad_manager',
  'moderator',
  'ghost_checker',
] as const;

export const SELLER_ROLES = ['dealer', 'broker', 'individual_seller'] as const;

export type StaffRole = typeof STAFF_ROLES[number];
export type SellerRole = typeof SELLER_ROLES[number];
export type UserRole = StaffRole | SellerRole | 'user';

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  approved?: boolean;
  mustChangePassword?: boolean;
  role?: UserRole;
  status?: string;
  emailVerified?: boolean;
  // Added (Final Integration - real data integration): both are real
  // fields the backend actually returns (confirmed directly against
  // backend/controllers/authController.js's own allowed-fields list
  // in this project's own earlier hardening work) but were missing
  // from this type - needed so App.tsx can consume this context's
  // real user directly instead of maintaining its own, separate local
  // user state.
  avatar?: string;
  createdAt?: string;
  phone?: string;
}

export const isStaffRole = (role?: string): role is StaffRole =>
  STAFF_ROLES.includes(role as StaffRole);

export const isSellerRole = (role?: string): role is SellerRole =>
  SELLER_ROLES.includes(role as SellerRole);

export function safeRedirectPath(path: string, fallback = '/'): string {
  return safeNextPath(path, fallback);
}

/**
 * Where a person lands after signing in.
 *
 * `fallback` is the validated destination they were heading to (`/` when none).
 * An explicit destination wins for everyone except an account that must change
 * its password first. Without one, each role goes to its own workspace, and a
 * seller whose account is not yet approved goes to the step that matches its
 * state rather than to a workspace it cannot use.
 */
/** The personal-account workspace (My Account / personal dashboard). Staff never land here from sign-in. */
export function isPersonalWorkspacePath(path: string): boolean {
  const [pathAndSearch] = path.split('#');
  const [pathname, search = ''] = pathAndSearch.split('?');
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (['/dashboard', '/account', '/profile', '/portal'].some((p) => clean === p || clean.startsWith(`${p}/`))) return true;
  if (clean === '/') {
    const nav = new URLSearchParams(search).get('nav');
    return nav === 'dashboard' || nav === 'profile' || nav === 'account';
  }
  return false;
}

const isAdminPath = (path: string) => /^\/admin(\/|\?|#|$)/.test(path);

export function getPostAuthPath(user: User | undefined, fallback = '/'): string {
  const next = safeRedirectPath(fallback, '/');
  if (user?.mustChangePassword) return '/force-password-change';
  // Requested destination first, but only when it is one this identity may use. A saved or stale "next" must never
  // send a staff member to the personal workspace (the Super Admin -> My Account defect), a non-staff account to /admin,
  // or a staff member to an admin page their role/permissions do not open.
  let hasNext = next !== '/';
  if (hasNext && isStaffRole(user?.role)) {
    if (isPersonalWorkspacePath(next)) hasNext = false;
    else if (isAdminPath(next)) {
      const adminPath = next.split(/[?#]/)[0].replace(/\/+$/, '') || '/admin';
      if (user?.role !== 'superadmin' && !canOpenAdminPage(user as never, adminPath, getEffectivePermissions(user as never))) hasNext = false;
    }
  } else if (hasNext && isAdminPath(next)) {
    hasNext = false;
  }
  if (hasNext) return next;
  if (user?.role === 'ghost_checker') return '/inspector';
  if (isStaffRole(user?.role)) return '/admin';
  // /dealer is a dealer-only route (RequireDealer). Only a dealer account may be sent there; sending any other role would
  // bounce it straight back to the homepage right after sign-in.
  if (user?.role === 'dealer') {
    return user?.status === 'approved' ? '/dealer' : '/dealer/onboarding';
  }
  if (user?.role === 'broker') return '/?nav=dashboard&section=my-vehicles';
  // One personal account: "user" and the legacy "individual_seller" land on the same dashboard, behind the same email check.
  if (user?.role === 'user' || user?.role === 'individual_seller') {
    if (!user?.emailVerified) return '/login?verify=required';
    return '/dashboard';
  }
  return next;
}
