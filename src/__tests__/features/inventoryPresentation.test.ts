import { describe, expect, it } from 'vitest';
import { getEffectiveGridColumns, validateInventoryFilterRanges } from '../../features/VehicleMarketplace/utils/inventoryPresentation';

describe('inventory presentation contracts', () => {
  it.each([
    [3, 400, 1],
    [5, 519, 1],
    [5, 520, 2],
    [4, 679, 2],
    [3, 680, 3],
    [5, 900, 4],
    [5, 1120, 5],
  ] as const)('uses the CSS-effective grid count for request %i at %ipx', (requested, width, expected) => {
    expect(getEffectiveGridColumns(requested, width)).toBe(expected);
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
