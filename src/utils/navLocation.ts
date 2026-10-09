/** Keep the single-shell navigation state in the URL so stale auction query
 * state cannot survive after a visitor navigates back to Marketplace. */
export function navLocationFor(requested: string, currentHref: string): { nav: string; href: string } {
  const aliases: Record<string, string> = {
    home: 'marketplace',
    gallery: 'marketplace',
    auction: 'discovery',
    escrow: 'escrow',
    chat: 'chat',
    dashboard: 'dashboard',
    signin: 'support',
    login: 'support',
    seller: 'seller-platform',
    'seller-dashboard': 'seller-platform',
  };
  const value = requested.trim();
  const nav = aliases[value] || value || 'marketplace';
  const url = new URL(currentHref);
  if (nav === 'marketplace') url.searchParams.delete('nav');
  else url.searchParams.set('nav', nav);
  if (nav !== 'auctions' && nav !== 'discovery') url.searchParams.delete('auctionTab');
  return { nav, href: `${url.pathname}${url.search}${url.hash}` };
}
