import { describe, it, expect } from 'vitest';
import { getListingLifecycle, countByLifecycle } from '../../utils/listingLifecycle';

describe('listing lifecycle mapping (read-only view of cars.status)', () => {
  it.each([
    ['draft', 'draft', false],
    ['pending', 'under_review', false],
    ['available', 'active', true],
    ['reserved', 'reserved', true],
    ['hidden', 'hidden', false],
    ['sold', 'sold', false],
  ])('maps stored status %s -> %s (visible=%s)', (status, state, visible) => {
    const info = getListingLifecycle(status);
    expect(info.state).toBe(state);
    expect(info.marketplaceVisible).toBe(visible);
  });

  it('keeps pending as under review: it is never promoted to active', () => {
    expect(getListingLifecycle('pending').marketplaceVisible).toBe(false);
    expect(getListingLifecycle('pending').label).toBe('Under review');
  });

  it('does not present hidden as "Rejected" (the data cannot distinguish rejection from withdrawal)', () => {
    expect(getListingLifecycle('hidden').label).not.toMatch(/reject/i);
  });

  it('treats sold=true as sold whatever the status says', () => {
    expect(getListingLifecycle('available', true).state).toBe('sold');
  });

  it('accepts legacy aliases and surfaces unknown values instead of hiding them', () => {
    expect(getListingLifecycle('under_review').state).toBe('under_review');
    expect(getListingLifecycle('active').state).toBe('active');
    expect(getListingLifecycle('mystery').state).toBe('unknown');
    expect(getListingLifecycle(null).label).toBe('Status unavailable');
  });

  it('counts a mixed list without inventing or dropping records', () => {
    const c = countByLifecycle([{ status: 'pending' }, { status: 'available' }, { status: 'draft' }, { status: 'sold' }, { status: 'hidden' }, { status: 'x' }]);
    expect(c).toEqual({ draft: 1, under_review: 1, active: 1, reserved: 0, hidden: 1, sold: 1, unknown: 1 });
  });
});
