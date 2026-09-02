import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVehicleCollections } from '../../hooks/useVehicleCollections';
import { Vehicle } from '../../types';

/**
 * KAYAD Phase 1 (architecture hardening) - first coverage for this
 * hook, extracted verbatim from App.tsx. Verifies the moved logic
 * preserves the real collection contract (empty initial state,
 * toggle add/remove, the existing max-4 compare limit, and that the
 * derived lists correctly filter the passed-in vehicle array).
 */

function makeVehicle(id: string): Vehicle {
  return {
    id,
    title: `Vehicle ${id}`,
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    vin: `VIN-${id}`,
    price: 1000000,
    mileage: 10000,
    location: 'Nairobi',
    bodyStyle: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    engine: '1.8L',
    horsepower: 140,
    exteriorColor: 'White',
    interiorColor: 'Black',
    condition: 'Good',
    listingType: 'fixed',
    images: [],
    description: '',
    features: [],
    sellerId: 's1',
    sellerName: 'Seller',
    sellerRating: 4,
    isDealerCertified: false,
    savedCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

describe('useVehicleCollections', () => {
  it('starts with an empty saved collection and no seeded vehicle IDs', () => {
    const { result } = renderHook(() => useVehicleCollections([]));
    expect(result.current.savedVehicles).toEqual([]);
    expect(result.current.comparedVehicles).toEqual([]);
  });

  it('toggling save adds an unsaved ID and removes an already-saved one', () => {
    const { result } = renderHook(() => useVehicleCollections([]));

    act(() => result.current.handleToggleSave('v3'));
    expect(result.current.savedVehicles).toContain('v3');

    act(() => result.current.handleToggleSave('v3'));
    expect(result.current.savedVehicles).not.toContain('v3');
  });

  it('toggling compare respects the existing max-4 limit', () => {
    const { result } = renderHook(() => useVehicleCollections([]));

    act(() => {
      result.current.handleToggleCompare('a');
      result.current.handleToggleCompare('b');
      result.current.handleToggleCompare('c');
      result.current.handleToggleCompare('d');
    });
    expect(result.current.comparedVehicles).toHaveLength(4);

    act(() => result.current.handleToggleCompare('e'));
    // A 5th addition is silently rejected - the same behavior the
    // original inline logic had, moved verbatim.
    expect(result.current.comparedVehicles).toHaveLength(4);
    expect(result.current.comparedVehicles).not.toContain('e');
  });

  it('savedVehiclesList/comparedVehiclesList correctly derive from the passed-in vehicles array', () => {
    const vehicles = [makeVehicle('v1'), makeVehicle('v2'), makeVehicle('v9')];
    const { result } = renderHook(() => useVehicleCollections(vehicles));

    // No seeded/demo IDs are present, so the derived list starts empty.
    expect(result.current.savedVehiclesList).toEqual([]);

    act(() => result.current.handleToggleCompare('v9'));
    expect(result.current.comparedVehiclesList.map((v) => v.id)).toEqual(['v9']);
  });
});

/**
 * KAYAD Phase 2 (eliminate mock business state) - real favorites
 * integration. Every test mocks fetch() and asserts on the actual
 * request made or the actual resulting state, matching this program's
 * established standard (real request shapes, not just "doesn't crash").
 */
describe('useVehicleCollections - authenticated path (real favorites API, Phase 2)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches real favorites on mount when a userId is provided', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        favorites: [{ id: 'real-1' }, { id: 'real-2' }],
        total: 2,
        pagination: { page: 1, limit: 50, total: 2, pages: 1 },
      }),
    });

    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));

    await waitFor(() => expect(result.current.savedVehicles).toEqual(['real-1', 'real-2']));
  });

  it('does NOT attempt any fetch when no userId is provided - confirms the anonymous path never calls the real API', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    renderHook(() => useVehicleCollections([]));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('toggling save for an authenticated user calls the real toggle endpoint with the correct URL and method', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, favorites: [], total: 0, pagination: { page: 1, limit: 50, total: 0, pages: 0 } }),
    });

    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(result.current.savedVehicles).toEqual([]));

    const toggleFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, favorited: true }),
    });
    global.fetch = toggleFetch;

    act(() => result.current.handleToggleSave('car-42'));
    // Optimistic update happens synchronously
    expect(result.current.savedVehicles).toContain('car-42');

    await waitFor(() => expect(toggleFetch).toHaveBeenCalled());
    const [url, options] = toggleFetch.mock.calls[0];
    expect(url).toContain('/api/favorites/car-42/toggle');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
  });

  it('rolls back the optimistic update if the real toggle request fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, favorites: [], total: 0, pagination: { page: 1, limit: 50, total: 0, pages: 0 } }),
    });

    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(result.current.savedVehicles).toEqual([]));

    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    act(() => result.current.handleToggleSave('car-99'));
    expect(result.current.savedVehicles).toContain('car-99'); // optimistic

    await waitFor(() => expect(result.current.savedVehicles).not.toContain('car-99')); // rolled back
    await waitFor(() => expect(result.current.favoritesError).toBeTruthy());
  });

  it('a fetch failure on mount does not invent a fabricated local saved list', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));

    await waitFor(() => expect(result.current.favoritesError).toBeTruthy());
    expect(result.current.savedVehicles).toEqual([]);
  });

  it('clears the authenticated collection at the logout boundary', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        favorites: [{ id: 'real-1' }],
        total: 1,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      }),
    });

    const { result, rerender } = renderHook(
      ({ userId }) => useVehicleCollections([], userId),
      { initialProps: { userId: 'user-123' as string | null } },
    );

    await waitFor(() => expect(result.current.savedVehicles).toEqual(['real-1']));
    rerender({ userId: null });
    expect(result.current.savedVehicles).toEqual([]);
  });
});
