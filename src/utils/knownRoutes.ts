/**
 * Every address the app serves (directly or by redirecting). Anything else is a real "page not found".
 * Keep in step with the path switch in App.tsx (AuthRouteSurface).
 */
const EXACT = new Set([
  '/', '/login', '/admin/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/owner-invite',
  '/force-password-change', '/notifications', '/gallery', '/marketplace', '/auction', '/auctions', '/escrow', '/support',
  '/inspections', '/financing', '/sell', '/sell-car', '/sell-vehicle', '/saved', '/profile', '/payments', '/chat',
  '/dashboard', '/buyer-platform', '/dealer', '/inspector/dashboard', '/dealer/setup', '/dealer/onboarding',
  '/dealer/auction-setup', '/dealer/auction-operations', '/terms', '/privacy', '/admin',
]);
const PREFIXES = ['/admin/', '/auction/', '/cars/', '/dealer/auction-operations/'];

export function isKnownPath(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (EXACT.has(p) || p === '') return true;
  return PREFIXES.some((x) => p.startsWith(x));
}
