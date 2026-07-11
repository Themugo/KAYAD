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
  'inspector',
] as const;

export const SELLER_ROLES = ['dealer', 'individual_seller'] as const;

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]);

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
  escrowApproved?: boolean;
  escrowForced?: boolean;
}

export const isStaffRole = (role?: string): role is StaffRole => 
  STAFF_ROLES.includes(role as StaffRole);

export const isSellerRole = (role?: string): role is SellerRole => 
  SELLER_ROLES.includes(role as SellerRole);

export function safeRedirectPath(path: string, fallback = '/'): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback;
  return AUTH_PATHS.has(path) ? fallback : path;
}

export function getPostAuthPath(user: User | undefined, fallback = '/'): string {
  const safeFallback = safeRedirectPath(fallback, '/');
  if (user?.mustChangePassword) return '/force-password-change';
  if (user?.role === 'inspector') return '/inspector';
  if (isStaffRole(user?.role)) {
    if (user?.role === 'technical_support') return '/admin/support';
    return '/admin';
  }
  if (isSellerRole(user?.role)) {
    if (user?.status !== 'approved') return fallback;
    if (user?.role === 'individual_seller') return '/seller';
    return '/dealer';
  }
  if (user?.role === 'user') {
    if (!user?.emailVerified) return '/login?verify=required';
    return '/dashboard';
  }
  return safeFallback;
}
