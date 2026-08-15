import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVehicleCollections } from '../../hooks/useVehicleCollections';
import { Vehicle } from '../../types';

/**
 * KAYAD Phase 1 (architecture hardening) - first coverage for this
 * hook, extracted verbatim from App.tsx. Verifies the moved logic
 * behaves identically to what it did inline (default saved IDs,
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
  it('starts with the same default saved vehicle IDs the inline App.tsx state used', () => {
    const { result } = renderHook(() => useVehicleCollections([]));
    expect(result.current.savedVehicles).toEqual(['v1', 'v2']);
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

    // Default saved IDs are v1/v2 - both present in this vehicles array
    expect(result.current.savedVehiclesList.map((v) => v.id)).toEqual(['v1', 'v2']);

    act(() => result.current.handleToggleCompare('v9'));
    expect(result.current.comparedVehiclesList.map((v) => v.id)).toEqual(['v9']);
  });
});
