import { describe, it, expect } from 'vitest';
import { VehicleApiError } from '../../services/vehicleApi';
import { classifyInventoryFailure } from '../../features/VehicleMarketplace/utils/inventoryAvailability';

describe('classifyInventoryFailure (public inventory failure causes)', () => {
  it('names maintenance only when the 503 body says so', () => {
    const f = classifyInventoryFailure(new VehicleApiError('x', 'server', 503, { code: 'MAINTENANCE', maintenance: true, scope: 'global' }));
    expect(f.kind).toBe('maintenance');
    expect(f.status).toBe(503);
    expect(f.title).toMatch(/paused for maintenance/i);
  });
  it('treats a 503 without a maintenance body as a genuine outage', () => {
    const f = classifyInventoryFailure(new VehicleApiError('x', 'server', 503, { code: 'DATABASE_UNAVAILABLE' }));
    expect(f.kind).toBe('unavailable');
    expect(f.pill).toBe('Inventory unavailable');
  });
  it('does not call a maintenance flag on a non-503 status maintenance', () => {
    expect(classifyInventoryFailure(new VehicleApiError('x', 'server', 500, { maintenance: true })).kind).toBe('unavailable');
  });
  it.each([[401], [403]])('HTTP %i is a restriction', (status) => {
    expect(classifyInventoryFailure(new VehicleApiError('x', 'server', status)).kind).toBe('restricted');
  });
  it.each([[408], [504]])('HTTP %i is a timeout', (status) => {
    expect(classifyInventoryFailure(new VehicleApiError('x', 'server', status)).kind).toBe('timeout');
  });
  it('a client-side timeout message is a timeout; no status and a connection message is a network failure', () => {
    expect(classifyInventoryFailure(new VehicleApiError('timeout of 30000ms exceeded', 'network')).kind).toBe('timeout');
    expect(classifyInventoryFailure(new VehicleApiError('Unable to reach KAYAD servers. Please check your connection and try again.', 'network')).kind).toBe('network');
  });
  it('classifies the app shell\'s plain loadError strings only from their own words', () => {
    expect(classifyInventoryFailure('System under scheduled maintenance.').kind).toBe('maintenance');
    expect(classifyInventoryFailure('Request failed with status code 502').status).toBe(502);
    expect(classifyInventoryFailure('Something went wrong loading vehicles. Please try again.').kind).toBe('unavailable');
    expect(classifyInventoryFailure(undefined).kind).toBe('unavailable');
  });
});
