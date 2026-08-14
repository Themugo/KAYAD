/**
 * Real backend vehicle/car API client. KAYAD Fusion Phase 4 - extends
 * the same "typed client + real backend calls" pattern established in
 * services/authApi.ts (Phase 3) to the next most foundational domain:
 * vehicles. Everything else in this app (auctions, bids, inspections,
 * escrow) references a vehicle, so this is the logical next connection
 * point after auth.
 *
 * IMPORTANT SCOPE NOTE, stated before anything else: this client is
 * built and tested (with mocked fetch, verifying real request shapes -
 * see phase-04-vehicles.md), but it is NOT wired into the rest of the
 * app in this phase. VehicleMarketplace, Gallery, and every other
 * component that currently reads from data/mockVehicles.ts's
 * INITIAL_VEHICLES continue to do so unchanged. Rewiring dozens of
 * components to use this client instead is a separate, much larger,
 * higher-risk step - especially with no live backend anywhere to
 * validate the rewiring against - and is deliberately left for a
 * later phase rather than attempted blindly here. See
 * phase-04-vehicles.md for the full reasoning.
 *
 * FIELD MAPPING GAP, the most important finding of this phase: the
 * backend's real `cars` table (backend/db/schema_clean.sql) has ~29
 * columns - it does NOT have sellerName, sellerType, escrow fields,
 * auction bid data, or inspection data. Those live in separate tables
 * (users/dealers, escrows, auctions, inspection_orders) with no join
 * performed by the backend's own getCars controller (confirmed
 * directly - no .map()/transform/join logic found in
 * backend/controllers/carController.js). This frontend's real Vehicle
 * type (src/types/index.ts) has ~50+ fields including all of the
 * above as a single flat object. mapBackendCarToVehicle() below maps
 * every field that genuinely exists on both sides, and leaves the rest
 * as sensible, clearly-documented defaults - it does NOT fabricate
 * seller names, bid counts, or escrow eligibility that the backend
 * response doesn't actually contain.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Raw shape of a single row from the backend's `cars` table, as
 * actually defined in backend/db/schema_clean.sql - snake_case,
 * matching Postgres column names directly since the backend performs
 * no camelCase transformation before responding. */
export interface BackendCar {
  id: string;
  dealer_id?: string | null;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  body_type?: string | null;
  color?: string | null;
  condition?: string | null;
  description?: string | null;
  images?: string[] | null;
  featured_image?: string | null;
  location?: string | null;
  status?: string | null;
  views?: number | null;
  featured?: boolean | null;
  has_auction?: boolean | null;
  is_verified?: boolean | null;
  vin?: string | null;
  engine_capacity?: string | null;
  drive_type?: string | null;
  seats?: number | null;
  doors?: number | null;
  features?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaginatedCarsResponse {
  success: boolean;
  data: BackendCar[];
  cars?: BackendCar[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
  message?: string;
}

export interface SingleCarResponse {
  success: boolean;
  data?: BackendCar;
  message?: string;
}

export type VehicleApiErrorKind = 'network' | 'not_found' | 'server' | 'unknown';

export class VehicleApiError extends Error {
  kind: VehicleApiErrorKind;
  status?: number;
  constructor(message: string, kind: VehicleApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function vehicleFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    // Same reasoning as authApi.ts's authFetch: a thrown fetch means no
    // server was reached at all, the single most likely outcome right
    // now given no backend is provisioned anywhere reachable from this
    // project's current state (confirmed in docs/fusion/01, 04).
    throw new VehicleApiError(
      'Unable to reach KAYAD servers. Please check your connection and try again.',
      'network'
    );
  }

  let body: T & { success?: boolean; message?: string };
  try {
    body = await res.json();
  } catch {
    throw new VehicleApiError('Unexpected response from server.', 'server', res.status);
  }

  if (!res.ok) {
    const kind: VehicleApiErrorKind = res.status === 404 ? 'not_found' : 'server';
    throw new VehicleApiError(body.message || 'Request failed.', kind, res.status);
  }

  return body;
}

export interface GetCarsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  brand?: string;
  model?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

/** GET /api/cars - real, paginated listing. Confirmed directly against
 * backend/routes/carRoutes.js and backend/controllers/carController.js
 * (getCars) rather than assumed - query params match the controller's
 * actual destructured req.query fields. */
export async function getCars(params: GetCarsParams = {}): Promise<PaginatedCarsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return vehicleFetch<PaginatedCarsResponse>(`/api/cars${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/** GET /api/cars/:id - single car by ID. */
export async function getCarById(id: string): Promise<BackendCar | null> {
  try {
    const res = await vehicleFetch<SingleCarResponse>(`/api/cars/${id}`, { method: 'GET' });
    return res.data ?? null;
  } catch (err) {
    if (err instanceof VehicleApiError && err.kind === 'not_found') {
      return null;
    }
    throw err;
  }
}

/** Maps a real backend car row to this frontend's real Vehicle type
 * (src/types/index.ts). Every field genuinely present on the backend
 * is mapped directly - nothing here invents a value the backend didn't
 * actually send. Fields the backend's `cars` table simply does not
 * have (sellerName, sellerType, sellerRating, isAuction bid data,
 * escrow eligibility, inspection results) are left as explicit,
 * documented defaults rather than fabricated - a caller displaying
 * "seller: Unknown Seller" knows that's a real gap, not a silent lie
 * about what KAYAD's actual seller data says. */
export function mapBackendCarToVehicle(car: BackendCar): {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  price: number;
  mileage: number;
  location: string;
  bodyStyle: string;
  transmission: string;
  fuelType: string;
  condition: string;
  images: string[];
  image?: string;
  description: string;
  features: string[];
  // Explicitly not backend-derived - documented gaps, not fabricated
  // values. A caller mapping this into the full frontend Vehicle type
  // must supply these from elsewhere (a separate dealer lookup, or an
  // explicit "unknown" UI state) rather than trusting these as real.
  sellerId: string;
  sellerName: string;
  sellerType: 'Verified Dealer' | 'Private Seller';
  isAuction: boolean;
} {
  return {
    id: car.id,
    title: car.title,
    make: car.make,
    model: car.model,
    year: car.year,
    vin: car.vin || '',
    price: Number(car.price),
    mileage: car.mileage ?? 0,
    location: car.location || '',
    bodyStyle: car.body_type || '',
    transmission: car.transmission || '',
    fuelType: car.fuel_type || '',
    condition: car.condition || '',
    images: car.images || (car.featured_image ? [car.featured_image] : []),
    image: car.featured_image || (car.images && car.images[0]) || undefined,
    description: car.description || '',
    features: car.features || [],
    // --- gap fields below: not present on the `cars` table at all ---
    sellerId: car.dealer_id || '',
    sellerName: 'Unknown Seller', // requires a separate users/dealers lookup by dealer_id - not performed here
    sellerType: car.dealer_id ? 'Verified Dealer' : 'Private Seller', // best-effort inference only, not a real backend field
    isAuction: Boolean(car.has_auction), // real field exists (has_auction), but bid/reserve/currentBid data does not - a caller needs a separate auctions lookup for those
  };
}
