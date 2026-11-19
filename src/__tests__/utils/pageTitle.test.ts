import { describe, it, expect } from 'vitest';
import { titleForRoute, DEFAULT_TITLE } from '../../utils/pageTitle';

describe('titleForRoute', () => {
  it('keeps the brand title on the home page', () => expect(titleForRoute('/', '')).toBe(DEFAULT_TITLE));
  it('names each main screen', () => {
    expect(titleForRoute('/', '?nav=discovery')).toBe('Auctions | KAYARD KE');
    expect(titleForRoute('/', '?nav=saved')).toBe('Saved vehicles | KAYARD KE');
    expect(titleForRoute('/', '?nav=dashboard')).toBe('Overview | KAYARD KE');
    expect(titleForRoute('/', '?nav=dashboard&section=my-vehicles')).toBe('My Vehicles | KAYARD KE');
    expect(titleForRoute('/', '?nav=dashboard&section=seller-enquiries')).toBe('Seller Enquiries | KAYARD KE');
    expect(titleForRoute('/', '?nav=dashboard&section=account')).toBe('My Account | KAYARD KE');
    expect(titleForRoute('/login', '')).toBe('Sign in | KAYARD KE');
    expect(titleForRoute('/auction/abc', '')).toBe('Live auction | KAYARD KE');
    expect(titleForRoute('/admin/cars', '')).toBe('Admin | KAYARD KE');
  });
  it('uses the vehicle title when a vehicle is open', () => {
    expect(titleForRoute('/', '?vehicleId=1', '2016 Toyota Land Cruiser')).toBe('2016 Toyota Land Cruiser | KAYARD KE');
  });
  it('falls back to the brand title for unknown screens', () => expect(titleForRoute('/', '?nav=zzz')).toBe(DEFAULT_TITLE));
});
