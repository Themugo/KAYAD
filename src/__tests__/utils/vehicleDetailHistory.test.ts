import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setVehicleDetailUrl } from '../../utils/navigation';

describe('vehicle details browser history', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?make=Toyota&page=2'); vi.restoreAllMocks(); });

  it('opening pushes one entry and keeps catalogue params', () => {
    const push = vi.spyOn(window.history, 'pushState');
    setVehicleDetailUrl('v1');
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain('make=Toyota');
    expect(window.location.search).toContain('vehicleId=v1');
  });

  it('previous/next replaces the entry instead of stacking history', () => {
    setVehicleDetailUrl('v1');
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');
    setVehicleDetailUrl('v2');
    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain('vehicleId=v2');
  });

  it('closing a vehicle the app opened goes back instead of pushing a new entry', () => {
    setVehicleDetailUrl('v1');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const push = vi.spyOn(window.history, 'pushState');
    setVehicleDetailUrl(null);
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('closing a directly-loaded vehicle link strips the param without leaving the site', () => {
    window.history.replaceState({}, '', '/?make=Toyota&vehicleId=v9');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    setVehicleDetailUrl(null);
    expect(back).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?make=Toyota');
  });
});
