import { Vehicle } from '../types';

/**
 * STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE FIX: this app has no
 * react-router `<Routes>`/`<Route>` tree anywhere (confirmed: `src/main.tsx`
 * only wraps the app in `<BrowserRouter>`; routing is a manual path switch
 * in `src/App.tsx::AuthRouteSurface`). `useParams()` only ever returns
 * values populated by an ancestor `<Route>` match — with none in the render
 * tree, it always returns `{}`. Two live pages rendered directly from that
 * path switch (`AuctionLivePage`, matched on `/auction/:id`, and
 * `DealerAuctionOperationCase`, matched on `/dealer/auction-operations/:id`)
 * destructured `useParams().id` as their sole source of identity, so `id`
 * was `undefined` on every real navigation — the live auction page always
 * rendered "Auction not found" and the dealer case page always rendered
 * "Auction case not found", for every car, regardless of which one was
 * clicked. `AuthRouteSurface` already has an established, working
 * convention for exactly this (`vehiclePathMatch` on `/cars/:id`): extract
 * the trailing path segment directly from the URL instead of relying on
 * router-provided params. This helper generalizes that convention so both
 * affected pages can read their own canonical identity the same way,
 * without introducing a second routing mechanism.
 *
 * Takes the pathname explicitly (from react-router's own `useLocation()`,
 * the same source `AuthRouteSurface` already reads) rather than reading
 * `window.location` directly — `AuthRouteSurface` itself is rendered under
 * `<BrowserRouter>` in production, where the two stay in sync, but tests
 * mount pages under `<MemoryRouter>`, which deliberately does NOT update
 * `window.location`. Reading through `useLocation()` keeps this helper
 * correct in both.
 */
export function getIdFromPathPrefix(pathname: string, prefix: string): string | null {
  if (!pathname || !pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segment = rest.split('/')[0];
  return segment ? decodeURIComponent(segment) : null;
}

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

export const AUCTION_PARAM = 'auctionId';

/**
 * Reads the auction lot ID from the current browser URL query parameters.
 */
export function getAuctionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const auctionId = params.get(AUCTION_PARAM);
  return auctionId ? auctionId.trim() : null;
}

/**
 * Updates the browser location URL with or without pushing a history state entry.
 */
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

export const ESCROW_PARAM = 'escrowId';

/**
 * Reads the escrow transaction ID from the current browser URL query parameters.
 */
export function getEscrowIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const escrowId = params.get(ESCROW_PARAM);
  return escrowId ? escrowId.trim() : null;
}

/**
 * Updates the browser location URL with or without pushing a history state entry.
 */
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
