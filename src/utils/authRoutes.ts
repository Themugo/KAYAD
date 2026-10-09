import { safeNextPath } from './authIntent';

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
export function getPostAuthPath(user: User | undefined, fallback = '/'): string {
  const next = safeRedirectPath(fallback, '/');
  const hasNext = next !== '/';
  if (user?.mustChangePassword) return '/force-password-change';
  if (hasNext) return next;
  if (user?.role === 'ghost_checker') return '/inspector';
  if (isStaffRole(user?.role)) return '/admin';
  if (isSellerRole(user?.role)) {
    if (user?.status === 'approved') return '/dealer';
    if (user?.role === 'dealer') return '/dealer/onboarding';
    return '/?nav=seller-platform';
  }
  if (user?.role === 'user') {
    if (!user?.emailVerified) return '/login?verify=required';
    return '/dashboard';
  }
  return next;
}
