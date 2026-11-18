/** Keep the single-shell navigation state in the URL so stale auction query
 * state cannot survive after a visitor navigates back to Marketplace. */
export function navLocationFor(requested: string, currentHref: string): { nav: string; href: string } {
  const aliases: Record<string, string> = {
    home: 'marketplace',
    gallery: 'marketplace',
    auction: 'discovery',
    escrow: 'escrow',
    'escrow:journey': 'escrow',
    'escrow:create': 'escrow',
    'escrow:deals': 'dashboard',
    'escrow:operations': 'escrow',
    chat: 'chat',
    dashboard: 'dashboard',
    'dashboard:account': 'dashboard',
    'dashboard:overview': 'dashboard',
    'dashboard:activity': 'dashboard',
    'dashboard:my-vehicles': 'dashboard',
    'dashboard:create-listing': 'dashboard',
    'dashboard:buying': 'dashboard',
    'dashboard:messages': 'dashboard',
    'dashboard:auctions': 'dashboard',
    'dashboard:deals': 'dashboard',
    'dashboard:seller-enquiries': 'dashboard',
    'dashboard:performance': 'dashboard',
    'dashboard:trust': 'dashboard',
    'dashboard:help': 'dashboard',
    'dashboard:settings': 'dashboard',
    'buyer-platform': 'dashboard',
    'seller-platform': 'dashboard',
    'seller-dashboard': 'dashboard',
    seller: 'dashboard',
    sell: 'dashboard',
    signin: 'support',
    login: 'support',
  };
  const value = requested.trim();
  const nav = aliases[value] || value || 'marketplace';
  const url = new URL(currentHref);
  const legacyDashboardSections: Record<string, string> = {
    'buyer-platform': 'buying',
    'seller-platform': 'my-vehicles',
    'seller-dashboard': 'my-vehicles',
    'escrow:deals': 'deals',
    seller: 'create-listing',
    sell: 'create-listing',
  };
  const requestedSection = value.startsWith('dashboard:')
    ? value.slice('dashboard:'.length)
    : legacyDashboardSections[value] || null;
  const dashboardSection = requestedSection === 'settings' ? 'account' : requestedSection;
  if (nav === 'marketplace') url.searchParams.delete('nav');
  else url.searchParams.set('nav', nav);
  if (dashboardSection) url.searchParams.set('section', dashboardSection);
  // `section` belongs to the personal dashboard and the dealer workspace only; any other destination drops a stale one.
  else if (nav !== 'dashboard' && nav !== 'dealer-dashboard') url.searchParams.delete('section');
  if (nav !== 'auctions' && nav !== 'discovery') url.searchParams.delete('auctionTab');
  return { nav, href: `${url.pathname}${url.search}${url.hash}` };
}
