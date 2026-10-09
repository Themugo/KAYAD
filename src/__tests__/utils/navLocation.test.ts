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
});
