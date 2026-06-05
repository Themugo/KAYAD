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
];

export const SELLER_ROLES = ['dealer', 'broker', 'individual_seller'];

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]);

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const isSellerRole = (role) => SELLER_ROLES.includes(role);

export function safeRedirectPath(path, fallback = '/') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback;
  return AUTH_PATHS.has(path) ? fallback : path;
}

export function getPostAuthPath(user, fallback = '/') {
  const safeFallback = safeRedirectPath(fallback, '/');
  if (user?.mustChangePassword) return '/force-password-change';
  if (!user?.emailVerified && user?.role === 'user') return '/register';
  if (user?.role === 'ghost_checker') return '/inspector';
  if (isStaffRole(user?.role)) return '/admin';
  if (isSellerRole(user?.role)) {
    if (!user?.approved) return '/register';
    return '/dealer';
  }
  if (user?.role === 'user') return '/dashboard';
  return safeFallback;
}
