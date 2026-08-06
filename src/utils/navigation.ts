
export const VEHICLE_PARAM = 'vehicleId';

/**
 * Reads the vehicle ID from the current browser URL query parameters.
 * Supports both `vehicleId` and `v` parameters for flexibility.
 */
export function getVehicleIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const vehicleId = params.get(VEHICLE_PARAM) || params.get('v');
  if (vehicleId) return vehicleId.trim();

  // Also check URL hash format e.g. #vehicle/v1 or #vehicle-v1
  const hash = window.location.hash;
  if (hash.startsWith('#vehicle/')) {
    return hash.replace('#vehicle/', '').trim();
  } else if (hash.startsWith('#vehicle-')) {
    return hash.replace('#vehicle-', '').trim();
  }

  return null;
}

/**
 * Returns a fully formatted URL query string for a given vehicle ID.
 */
export function getVehicleDetailUrl(vehicleId: string): string {
  if (typeof window === 'undefined') return `?${VEHICLE_PARAM}=${encodeURIComponent(vehicleId)}`;
  const url = new URL(window.location.href);
  url.searchParams.set(VEHICLE_PARAM, vehicleId);
  return url.pathname + url.search;
}

/**
 * Updates the browser location URL with or without pushing a history state entry.
 */
export function setVehicleDetailUrl(vehicleId: string | null, pushState: boolean = true): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);

  if (vehicleId) {
    url.searchParams.set(VEHICLE_PARAM, vehicleId);
  } else {
    url.searchParams.delete(VEHICLE_PARAM);
    url.searchParams.delete('v');
    if (url.hash.startsWith('#vehicle')) {
      url.hash = '';
    }
  }

  const newUrl = url.toString();
  if (newUrl !== window.location.href) {
    if (pushState) {
      window.history.pushState({ vehicleId }, '', newUrl);
    } else {
      window.history.replaceState({ vehicleId }, '', newUrl);
    }
  }
}
