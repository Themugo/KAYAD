/**
 * Browser-tab / history title for the current screen, so a person with several tabs open (or a
 * long back-button history) can tell the pages apart. Pure: the caller decides when to apply it.
 */
const BRAND = 'KAYAD';
export const DEFAULT_TITLE = "KAYAD | Kenya's Verified Automotive Marketplace & Escrow Vault";

const NAV_TITLES: Record<string, string> = {
  marketplace: 'Vehicle marketplace',
  discovery: 'Auctions',
  auctions: 'Auctions',
  escrow: 'Escrow',
  'escrow-operations': 'Escrow operations',
  inspections: 'Vehicle inspections',
  'inspection-marketplace': 'Automotive services',
  financing: 'Financing',
  finance: 'Financing',
  dealers: 'Dealers and sellers',
  support: 'Support',
  chat: 'Messages',
  saved: 'Saved vehicles',
  profile: 'My profile',
  payments: 'Payments',
  dashboard: 'Dashboard',
  'buyer-platform': 'My KAYAD',
  'dealer-dashboard': 'Dealer workspace',
  'seller-platform': 'Sell your vehicle',
  sell: 'Sell your vehicle',
  seller: 'Sell your vehicle',
  'seller-dashboard': 'Seller dashboard',
  kayadlive: 'KAYAD Live',
  admin: 'Admin',
};

const PATH_TITLES: Array<[RegExp, string]> = [
  [/^\/login\/?$/, 'Sign in'],
  [/^\/admin\/login\/?$/, 'Admin sign in'],
  [/^\/register\/?$/, 'Create your account'],
  [/^\/forgot-password\/?$/, 'Reset your password'],
  [/^\/reset-password\/?$/, 'Choose a new password'],
  [/^\/auction\/[^/]+\/?$/, 'Live auction'],
  [/^\/notifications\/?$/, 'Notifications'],
  [/^\/admin(\/|$)/, 'Admin'],
];

export function titleForRoute(pathname: string, search: string, vehicleTitle?: string | null): string {
  if (vehicleTitle && vehicleTitle.trim()) return `${vehicleTitle.trim()} | ${BRAND}`;
  for (const [pattern, label] of PATH_TITLES) {
    if (pattern.test(pathname)) return `${label} | ${BRAND}`;
  }
  if (pathname === '/' || pathname === '') {
    const nav = new URLSearchParams(search).get('nav');
    if (nav && NAV_TITLES[nav]) return `${NAV_TITLES[nav]} | ${BRAND}`;
  }
  return DEFAULT_TITLE;
}
