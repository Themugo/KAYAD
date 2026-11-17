import { describe, expect, it } from 'vitest';
import { navLocationFor } from '../../utils/navLocation';

describe('canonical navigation URL', () => {
  it('uses Marketplace as the clean root landing page', () => {
    expect(navLocationFor('marketplace', 'https://kayad.space/?nav=auctions&auctionTab=scheduled').href).toBe('/');
  });

  it('preserves intentional auction deep links and their selected tab', () => {
    expect(navLocationFor('auctions', 'https://kayad.space/?auctionTab=scheduled').href).toBe('/?auctionTab=scheduled&nav=auctions');
  });

  it('removes a stale auction tab when navigating to another surface', () => {
    expect(navLocationFor('support', 'https://kayad.space/?nav=auctions&auctionTab=saved').href).toBe('/?nav=support');
  });

  it('canonicalizes legacy aliases without losing unrelated context', () => {
    expect(navLocationFor('home', 'https://kayad.space/?vehicleId=car-1&nav=discovery').href).toBe('/?vehicleId=car-1');
  });
  it('normalizes legacy escrow sub-navigation to the public information page', () => {
    const escrowHref = navLocationFor('escrow:deals', 'https://kayad.space/?nav=escrow:deals&escrowId=e1').href;
    // Parameter order is not part of the contract; the set of parameters is.
    expect(Object.fromEntries(new URL(escrowHref, 'https://kayad.space').searchParams)).toEqual({ nav: 'dashboard', section: 'deals', escrowId: 'e1' });
    expect(navLocationFor('escrow:operations', 'https://kayad.space/?nav=escrow:operations').href).toBe('/?nav=escrow');
  });

  it('keeps the mobile Account tab inside DashboardHub and selects the account section', () => {
    const result = navLocationFor('dashboard:account', 'https://kayad.space/?nav=marketplace&auctionTab=saved');
    expect(result.nav).toBe('dashboard');
    expect(result.href).toBe('/?nav=dashboard&section=account');
  });


  it('keeps every personal account section in the same dashboard URL', () => {
    expect(navLocationFor('dashboard:create-listing', 'https://kayad.space/?nav=marketplace').href).toBe('/?nav=dashboard&section=create-listing');
    expect(navLocationFor('dashboard:trust', 'https://kayad.space/?nav=dashboard').href).toBe('/?nav=dashboard&section=trust');
    expect(navLocationFor('dashboard:help', 'https://kayad.space/?nav=dashboard').href).toBe('/?nav=dashboard&section=help');
  });

  it('normalizes legacy buyer and seller dashboard routes into the one personal dashboard', () => {
    expect(navLocationFor('buyer-platform', 'https://kayad.space/?nav=buyer-platform').href).toBe('/?nav=dashboard&section=buying');
    expect(navLocationFor('seller-platform', 'https://kayad.space/?nav=seller-platform').href).toBe('/?nav=dashboard&section=my-vehicles');
    expect(navLocationFor('seller-dashboard', 'https://kayad.space/?nav=seller-dashboard').href).toBe('/?nav=dashboard&section=my-vehicles');
    expect(navLocationFor('sell', 'https://kayad.space/?nav=sell').href).toBe('/?nav=dashboard&section=create-listing');
  });

  it('keeps dashboard section deep links inside the unified account shell', () => {
    const result = navLocationFor('dashboard:my-vehicles', 'https://kayad.space/?nav=dashboard&section=overview');
    expect(result.nav).toBe('dashboard');
    expect(result.href).toBe('/?nav=dashboard&section=my-vehicles');
  });


  it('keeps the dealer workspace section when navigating to the dealer workspace, and drops it elsewhere', () => {
    expect(navLocationFor('dealer-dashboard', 'https://kayad.space/?nav=dealer-dashboard&section=settings').href).toBe('/?nav=dealer-dashboard&section=settings');
    expect(navLocationFor('marketplace', 'https://kayad.space/?nav=dealer-dashboard&section=settings').href).toBe('/');
    expect(navLocationFor('chat', 'https://kayad.space/?nav=dashboard&section=buying').href).toBe('/?nav=chat');
  });
});
