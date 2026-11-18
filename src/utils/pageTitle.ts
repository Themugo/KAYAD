/**
 * Browser-tab / history title for the current screen, so a person with several tabs open (or a
 * long back-button history) can tell the pages apart. Pure: the caller decides when to apply it.
 */
import { isKnownPath } from './knownRoutes';

const BRAND = 'KAYARD KE';
export const DEFAULT_TITLE = "KAYARD KE | Kenya's Vehicle Marketplace";

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
  profile: 'My Account',
  payments: 'Payments',
  dashboard: 'Dashboard',
  'dealer-dashboard': 'Dealer workspace',
  sell: 'Sell your vehicle',
  seller: 'Sell your vehicle',
  kayadlive: 'KAYARD Live',
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
  [/^\/dealer\/auction-setup\/?$/, 'Set up an auction'],
  [/^\/dealer\/auction-operations(\/|$)/, 'Auction operations'],
  [/^\/dealer\/onboarding\/?$/, 'Dealer application'],
  [/^\/dealer\/setup\/?$/, 'Join a dealer team'],
  [/^\/force-password-change\/?$/, 'Change your password'],
  [/^\/verify-email\/?$/, 'Verify your email'],
  [/^\/terms\/?$/, 'Terms of Service'],
  [/^\/privacy\/?$/, 'Privacy Policy'],
  [/^\/admin\/featured-vehicles\/?$/, 'Featured vehicles'],
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
  if (pathname && pathname !== '/' && !isKnownPath(pathname)) return `Page not found | ${BRAND}`;
  return DEFAULT_TITLE;
}
