import { describe, expect, it } from 'vitest';
import { getAvailableGridColumns, getEffectiveGridColumns, validateInventoryFilterRanges } from '../../features/VehicleMarketplace/utils/inventoryPresentation';

describe('inventory presentation contracts', () => {
  it.each([
    [3, 400, 1],
    [5, 519, 1],
    [5, 520, 2],
    [4, 759, 2],
    [3, 760, 3],
    [5, 939, 3],
    [4, 940, 4],
    [5, 1279, 4],
    [5, 1280, 5],
  ] as const)('uses the CSS-effective grid count for request %i at %ipx', (requested, width, expected) => {
    expect(getEffectiveGridColumns(requested, width)).toBe(expected);
  });

  it('offers only column choices that can really render', () => {
    expect(getAvailableGridColumns(700)).toEqual([]);
    expect(getAvailableGridColumns(900)).toEqual([3]);
    expect(getAvailableGridColumns(1100)).toEqual([3, 4]);
    expect(getAvailableGridColumns(1400)).toEqual([3, 4, 5]);
  });

  it('rejects a minimum price above the maximum', () => {
    expect(validateInventoryFilterRanges({ minPrice: 900000, maxPrice: 500000, minYear: 0, maxYear: 2026 }))
      .toBe('Minimum price cannot be greater than maximum price.');
  });

  it('rejects a minimum year after the maximum year', () => {
    expect(validateInventoryFilterRanges({ minPrice: 0, maxPrice: 20000000, minYear: 2024, maxYear: 2018 }))
      .toBe('From year cannot be later than the To year.');
  });

  it('accepts valid ranges and empty minimums', () => {
    expect(validateInventoryFilterRanges({ minPrice: 0, maxPrice: 20000000, minYear: 0, maxYear: 2026 })).toBeNull();
    expect(validateInventoryFilterRanges({ minPrice: 100000, maxPrice: 900000, minYear: 2015, maxYear: 2024 })).toBeNull();
  });
});
