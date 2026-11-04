import { describe, it, expect } from 'vitest';
import { titleForRoute, DEFAULT_TITLE } from '../../utils/pageTitle';

describe('titleForRoute', () => {
  it('keeps the brand title on the home page', () => expect(titleForRoute('/', '')).toBe(DEFAULT_TITLE));
  it('names each main screen', () => {
    expect(titleForRoute('/', '?nav=discovery')).toBe('Auctions | KAYAD');
    expect(titleForRoute('/', '?nav=saved')).toBe('Saved vehicles | KAYAD');
    expect(titleForRoute('/login', '')).toBe('Sign in | KAYAD');
    expect(titleForRoute('/auction/abc', '')).toBe('Live auction | KAYAD');
    expect(titleForRoute('/admin/cars', '')).toBe('Admin | KAYAD');
  });
  it('uses the vehicle title when a vehicle is open', () => {
    expect(titleForRoute('/', '?vehicleId=1', '2016 Toyota Land Cruiser')).toBe('2016 Toyota Land Cruiser | KAYAD');
  });
  it('falls back to the brand title for unknown screens', () => expect(titleForRoute('/', '?nav=zzz')).toBe(DEFAULT_TITLE));
});
