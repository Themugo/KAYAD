import { describe, expect, it } from 'vitest';
import { CATALOGUE_DEFAULTS, readCatalogueUrl, writeCatalogueUrl } from '../../features/VehicleMarketplace/utils/catalogueUrlState';

describe('catalogue URL state', () => {
  it('a clean catalogue writes a clean URL and keeps unrelated params', () => {
    expect(writeCatalogueUrl('', CATALOGUE_DEFAULTS)).toBe('');
    expect(writeCatalogueUrl('?nav=x&vehicleId=abc', CATALOGUE_DEFAULTS)).toBe('?nav=x&vehicleId=abc');
  });
  it('round-trips every supported filter', () => {
    const state = { ...CATALOGUE_DEFAULTS, q: 'cruiser', make: 'Toyota', model: 'Land Cruiser', body: 'SUV', fuel: 'Diesel',
      transmission: 'Automatic', condition: 'Used', seller: 'Private Seller', color: 'Black', county: 'Nairobi',
      minPrice: 1500000, maxPrice: 4000000, minYear: 2016, maxYear: 2024, maxMileage: 150000,
      onlyAuction: true, sort: 'price-asc' as const, page: 3, view: 'list' as const, cols: 4 as const };
    const search = writeCatalogueUrl('?vehicleId=v1', state);
    expect(search).toContain('vehicleId=v1');
    expect(readCatalogueUrl(search)).toEqual(state);
  });
  it('ignores invalid or hostile values instead of breaking', () => {
    const s = readCatalogueUrl('?sort=drop&page=-4&cols=9&view=x&minPrice=abc&yearFrom=-1&maxKm=1e99');
    expect(s).toEqual(CATALOGUE_DEFAULTS);
  });
  it('removes stale catalogue params when filters are cleared', () => {
    expect(writeCatalogueUrl('?make=Toyota&page=2&nav=x', CATALOGUE_DEFAULTS)).toBe('?nav=x');
  });
});
