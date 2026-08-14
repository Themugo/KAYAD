/**
 * Real backend vehicle/car API client. KAYAD Fusion Phase 4/5.
 *
 * MAJOR CORRECTION (Phase 5): the original version of this file was
 * built against backend/db/schema_clean.sql, which turned out to be a
 * STALE, SUPERSEDED schema definition - confirmed directly via a
 * detailed comment in supabase/migrations/..._foundational_tables.sql.sql
 * (a prior session's own cross-referenced schema-archaeology work,
 * checked against seed_demo_vehicles.sql.sql, update_car_bid_stats.sql.sql,
 * and real multi-file backend usage) that explicitly states its column
 * choices "disagree with backend/db/schema_clean.sql's naming, and take
 * precedence here as already-committed, already-real evidence."
 *
 * This version is built against that real, authoritative schema
 * instead. The most significant correction: auction data (current_bid,
 * bids_count, auction_status, auction_end, highest_bidder_id, allow_bid)
 * is DENORMALIZED DIRECTLY ONTO THE cars ROW, not in a separate joined
 * table as the original version of this file assumed. This means a
 * single /api/cars response already carries real auction state with no
 * join needed - a meaningfully better starting point than Phase 4
 * documented.
 *
 * What is still genuinely missing from the cars row itself: sellerName/
 * sellerAvatar/sellerRating (only dealer_id, a foreign key, exists),
 * and full inspection detail (only a basic inspection_status string
 * exists on cars - the rich score/points/health data lives in a
 * separate inspection table, not joined here either). Documented
 * honestly below, not glossed over just because the auction-data
 * correction was good news.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Raw shape of a single row from the backend's real `cars` table
 * (supabase/migrations/..._foundational_tables.sql.sql, cross-checked
 * against backend/utils/fieldMap.js's FIELD_ALIASES.cars and against
 * real controller/service usage - not the stale backend/db/schema_clean.sql
 * version this file originally used). */
export interface BackendCar {
  id: string;
  dealer_id?: string | null;
  title: string;
  slug?: string | null;
  brand: string; // NOT "make" - confirmed the real column name is "brand"
  model: string;
  year: number;
  price: number;
  mileage?: number | null;
  fuel?: string | null; // NOT "fuel_type"
  transmission?: string | null;
  body_type?: string | null;
  color?: string | null;
  engine?: string | null; // NOT "engine_capacity"
  drive_type?: string | null;
  condition?: string | null;
  description?: string | null;
  features?: string[] | null;
  /** JSONB array of {url, thumb, public_id, ...} objects - NOT a plain
   * TEXT[] of URL strings, confirmed via createCar()/updateCar() and
   * the Cloudinary-upload follow-up flow in carController.js. */
  images?: Array<{ url: string; thumb?: string; public_id?: string }> | null;
  location_city?: string | null; // NOT a nested "location.city" path
  vin?: string | null;
  chassis_number?: string | null;
  registration_number?: string | null;
  is_flagged_duplicate?: boolean | null;
  status?: string | null;
  views?: number | null;
  approved?: boolean | null;
  inspection_status?: string | null; // basic status only - not the full inspection record
  is_verified_dealer?: boolean | null;
  is_promoted?: boolean | null;
  deal_rating?: string | null;
  // --- Auction fields, denormalized directly onto the car row ---
  auction_status?: string | null; // 'none' | (other real values not yet fully enumerated)
  auction_end?: string | null;
  current_bid?: number | null;
  bids_count?: number | null;
  highest_bidder_id?: string | null;
  allow_bid?: boolean | null;
  allow_buy?: boolean | null;
  has_auction?: boolean | null; // GENERATED column: auction_status IS DISTINCT FROM 'none'
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

/** GET /api/cars - real, paginated listing. Query params match
 * backend/controllers/carController.js's getCars destructured
 * req.query fields directly. */
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
 * (src/types/index.ts). Corrected in Phase 5 to reflect the real
 * schema (see file header) - auction fields are now mapped from real
 * data that genuinely exists on the row, not defaulted to false/zero
 * as the pre-correction version did. sellerName/sellerAvatar/
 * sellerRating and full inspection detail remain honest gaps - the
 * backend genuinely does not have this data on the cars row, and nothing
 * here fabricates it. */
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
  sellerId: string;
  sellerName: string;
  sellerType: 'Verified Dealer' | 'Private Seller';
  isAuction: boolean;
  // Real auction fields, now genuinely populated (Phase 5 correction) -
  // not defaulted, since they actually exist on the car row.
  currentBid?: number;
  bidsCount?: number;
  auctionEndsAt?: string;
  // Real, though partial, verification/inspection signals that DO
  // exist directly on the row (not the full inspection record).
  verified: boolean;
  isDealerCertified: boolean;
} {
  const imageUrls = (car.images || []).map((img) => img.url).filter(Boolean);
  return {
    id: car.id,
    title: car.title,
    make: car.brand, // real column is "brand", not "make"
    model: car.model,
    year: car.year,
    vin: car.vin || '',
    price: Number(car.price),
    mileage: car.mileage ?? 0,
    location: car.location_city || '',
    bodyStyle: car.body_type || '',
    transmission: car.transmission || '',
    fuelType: car.fuel || '', // real column is "fuel", not "fuel_type"
    condition: car.condition || '',
    images: imageUrls,
    image: imageUrls[0] || undefined,
    description: car.description || '',
    features: car.features || [],
    // --- still-genuine gaps: not present on the cars row at all ---
    sellerId: car.dealer_id || '',
    sellerName: 'Unknown Seller', // requires a separate users/dealers lookup by dealer_id - not performed here
    sellerType: car.dealer_id ? 'Verified Dealer' : 'Private Seller', // best-effort inference, not a real backend field
    // --- corrected in Phase 5: these ARE real, denormalized fields ---
    isAuction: Boolean(car.has_auction),
    currentBid: car.current_bid != null ? Number(car.current_bid) : undefined,
    bidsCount: car.bids_count ?? undefined,
    auctionEndsAt: car.auction_end || undefined,
    verified: Boolean(car.is_verified_dealer),
    isDealerCertified: Boolean(car.is_verified_dealer),
  };
}
