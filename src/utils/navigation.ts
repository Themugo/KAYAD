
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

// Auction lot deep-linking - same pattern as the vehicle-detail
// functions above (query param + pushState/popstate), extended for
// auction sessions rather than duplicated inline in AuctionsView.tsx.
// Found via a direct code check that no such mechanism existed at all
// for auctions before this: copying a specific lot's URL and opening
// it in a new tab, or refreshing the page while a lot was open, lost
// the selection entirely and fell back to the bare auction directory -
// exactly the gap a "Direct URL Test" section in a hardening spec
// would catch. A separate param name (auctionId, not vehicleId) avoids
// collision with the existing vehicle-detail deep link, since a page
// could in principle need to represent both independently.

export const AUCTION_PARAM = 'auctionId';

export function getAuctionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const auctionId = params.get(AUCTION_PARAM);
  return auctionId ? auctionId.trim() : null;
}

export function setAuctionDetailUrl(auctionId: string | null, pushState: boolean = true): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);

  if (auctionId) {
    url.searchParams.set(AUCTION_PARAM, auctionId);
  } else {
    url.searchParams.delete(AUCTION_PARAM);
  }

  const newUrl = url.toString();
  if (newUrl !== window.location.href) {
    if (pushState) {
      window.history.pushState({ auctionId }, '', newUrl);
    } else {
      window.history.replaceState({ auctionId }, '', newUrl);
    }
  }
}

// Escrow deal deep-linking - same pattern as vehicle-detail and
// auction-lot deep linking above (query param + pushState/popstate).
// Found (Phase 12, frontend production hardening) via a direct check
// of EscrowView.tsx: it has a real per-deal "selectedDeal" sub-state
// (not just a flat list), but that state was pure local useState
// defaulting to deals[0] with no URL sync at all - a real deep-link/
// refresh gap directly matching this phase's own named /escrow/:id
// verification requirement, using the same proven mechanism already
// working for vehicles and auctions rather than a new pattern.

export const ESCROW_PARAM = 'escrowId';

export function getEscrowIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const escrowId = params.get(ESCROW_PARAM);
  return escrowId ? escrowId.trim() : null;
}

export function setEscrowDetailUrl(escrowId: string | null, pushState: boolean = true): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);

  if (escrowId) {
    url.searchParams.set(ESCROW_PARAM, escrowId);
  } else {
    url.searchParams.delete(ESCROW_PARAM);
  }

  const newUrl = url.toString();
  if (newUrl !== window.location.href) {
    if (pushState) {
      window.history.pushState({ escrowId }, '', newUrl);
    } else {
      window.history.replaceState({ escrowId }, '', newUrl);
    }
  }
}
