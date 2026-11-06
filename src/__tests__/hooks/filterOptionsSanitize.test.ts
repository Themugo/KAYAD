import { describe, it, expect } from 'vitest';
import { sanitizePriceSteps, sanitizeYearFrom, DEFAULT_PRICE_STEPS } from '../../features/VehicleMarketplace/hooks/useHomePageConfig';

describe('search filter settings', () => {
  it('keeps sensible, sorted, unique price steps from a list or comma text', () => {
    expect(sanitizePriceSteps('4000000, 1500000;1500000 9e6')).toEqual([1500000, 4000000, 9000000]);
    expect(sanitizePriceSteps([3000000, 1000000])).toEqual([1000000, 3000000]);
  });
  it('falls back to the defaults for empty, junk or tiny values', () => {
    expect(sanitizePriceSteps('')).toEqual(DEFAULT_PRICE_STEPS);
    expect(sanitizePriceSteps('abc, -5, 12')).toEqual(DEFAULT_PRICE_STEPS);
  });
  it('caps the list at eight steps', () => {
    expect(sanitizePriceSteps(Array.from({ length: 12 }, (_, i) => (i + 1) * 1000000))).toHaveLength(8);
  });
  it('accepts any plausible earliest year and rejects the rest', () => {
    expect(sanitizeYearFrom(1998)).toBe(1998);
    expect(sanitizeYearFrom('2012')).toBe(2012);
    expect(sanitizeYearFrom(1900)).toBe(2005);
    expect(sanitizeYearFrom(2999)).toBe(2005);
    expect(sanitizeYearFrom(undefined)).toBe(2005);
  });
});
