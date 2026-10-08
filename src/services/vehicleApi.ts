import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend vehicle/car API client. KAYAD Fusion Phase 4/5.
 *
 * MAJOR CORRECTION (Phase 5): the original version of this file was
 * built against the retired legacy schema artifact, which turned out to be a
 * STALE, SUPERSEDED schema definition - confirmed directly via a
 * detailed comment in supabase/migrations/..._foundational_tables.sql.sql
 * (a prior session's own cross-referenced schema-archaeology work,
 * checked against the historical vehicle seed migration, update_car_bid_stats.sql.sql,
 * and real multi-file backend usage) that explicitly states its column
 * choices "disagree with the retired legacy schema artifact's naming, and take
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

import type { Vehicle } from '../types';


/** Raw shape of a single row from the backend's real `cars` table
 * (supabase/migrations/..._foundational_tables.sql.sql, cross-checked
 * against backend/utils/fieldMap.js's FIELD_ALIASES.cars and against
 * real controller/service usage - not the stale the retired legacy schema artifact
 * version this file originally used). */
export interface BackendCar {
  id: string;
  /** Canonical public /api/cars responses use camelCase after the backend field mapper.
   * Legacy snake_case aliases remain accepted because older fixtures and some
   * direct database-backed paths still expose them. */
  _id?: string;
  dealer_id?: string | null;
  title: string;
  slug?: string | null;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  body_type?: string | null;
  bodyType?: string | null;
  color?: string | null;
  engine?: string | null;
  drive_type?: string | null;
  driveType?: string | null;
  condition?: string | null;
  description?: string | null;
  features?: string[] | null;
  images?: Array<{ url: string; thumb?: string; public_id?: string }> | null;
  location_city?: string | null;
  city?: string | null;
  vin?: string | null;
  chassis_number?: string | null;
  registration_number?: string | null;
  is_flagged_duplicate?: boolean | null;
  status?: string | null;
  views?: number | null;
  approved?: boolean | null;
  inspection_status?: string | null;
  inspectionStatus?: string | null;
  duty_status?: string | null;
  dutyStatus?: string | null;
  is_verified_dealer?: boolean | null;
  isVerifiedDealer?: boolean | null;
  dealer?: string | { _id?: string; id?: string; name?: string; businessName?: string; business_name?: string; avatar?: string; phone?: string; email?: string; role?: string; dealerApprovedAt?: string | null } | null;
  is_promoted?: boolean | null;
  isPromoted?: boolean | null;
  deal_rating?: string | null;
  dealRating?: string | null;
  // Auction fields are returned in camelCase by the canonical /api/cars route.
  auctionStatus?: string | null;
  auction_status?: string | null;
  auctionEnd?: string | null;
  auction_end?: string | null;
  auctionStartTime?: string | null;
  auction_start_time?: string | null;
  startingBid?: number | null;
  starting_bid?: number | null;
  currentBid?: number | null;
  current_bid?: number | null;
  bidsCount?: number | null;
  bids_count?: number | null;
  highestBidderId?: string | null;
  highest_bidder_id?: string | null;
  allowBid?: boolean | null;
  allow_bid?: boolean | null;
  allowBuy?: boolean | null;
  allow_buy?: boolean | null;
  isAuction?: boolean | null;
  hasAuction?: boolean | null;
  has_auction?: boolean | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  // STAGE 8 MARKETPLACE TRUST SIGNAL FIX: escrowEnabled is a real,
  // server-enforced field on the canonical Car record (see
  // backend/controllers/carController.js's role-based enforcement) but
  // was never declared or read here, so the frontend's existing
  // escrow-capability system (src/utils/escrow.ts::isEscrowApplicable)
  // had no authoritative backend signal to key off at all.
  escrowEnabled?: boolean | null;
  escrow_enabled?: boolean | null;
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
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: VehicleApiErrorKind = error.status === 404 ? 'not_found' : error.status ? 'server' : 'network';
    throw new VehicleApiError(error.message, kind, error.status);
  }
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
  yearMin?: number;
  yearMax?: number;
  body?: string;
  fuel?: string;
  transmission?: string;
  mileageMin?: number;
  mileageMax?: number;
  color?: string;
  condition?: string;
  category?: 'auction' | 'fixed';
  featured?: boolean;
  dealerType?: 'dealer' | 'private';
  vin?: string;
  engine?: string;
  drivetrain?: string;
  /** Confirmed real, already-supported backend filter
   * (carController.js's own getCars: query.auctionStatus =
   * auctionStatus) - 'draft' | 'live' | 'ended'. */
  auctionStatus?: string;
  /** Confirmed real, already-supported backend sort values
   * (carController.js's own getCars sortOption logic) -
   * 'newest' is also the real, unconditional default when
   * omitted, so this param only needs passing for a non-default
   * order. */
  sort?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'mileage_asc' | 'views_desc' | 'newest' | 'ending_soon';
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

/** GET /api/cars/my-listings - the real, signed-in seller's own
 * listings, every status (not just "available"). */
export async function getMyListings(): Promise<BackendCar[]> {
  const res = await vehicleFetch<{ data: BackendCar[] }>('/api/cars/my-listings', { method: 'GET' });
  return res.data || [];
}

/** Maps a real backend car row to this frontend's real Vehicle type
 * (src/types/index.ts). Corrected in Phase 5 to reflect the real
 * schema (see file header) - auction fields are now mapped from real
 * data that genuinely exists on the row, not defaulted to false/zero
 * as the pre-correction version did. sellerName/sellerAvatar/
 * sellerRating and full inspection detail remain honest gaps - the
 * backend genuinely does not have this data on the cars row, and nothing
 * here fabricates it. */
/**
 * Maps a real backend car row to this frontend's complete, real
 * Vehicle type (src/types/index.ts). Rewritten in Phase 7 to return a
 * genuinely complete Vehicle object - the pre-Phase-7 version returned
 * a partial object missing several fields the real Vehicle interface
 * requires (engine, horsepower, exteriorColor, interiorColor,
 * listingType, sellerRating, savedCount, status, createdAt), which
 * would have caused real problems the moment any component actually
 * consumed it (this was never caught earlier because nothing called
 * this function from real UI code until this phase).
 *
 * Every field genuinely present on the backend is mapped directly -
 * nothing here invents a value the backend didn't actually send.
 * Seller identity/contact fields are derived from the real populated `dealer`
 * relation returned by the backend. If that relation is unavailable, the mapper
 * uses an explicit unknown state rather than inventing a seller identity.
 * Other fields with no authoritative source retain honest defaults.
 */
export function mapBackendCarToVehicle(car: BackendCar): Vehicle {
  const imageUrls = (car.images || []).map((img) => img?.url).filter((url): url is string => Boolean(url));
  const auctionStatus = String(car.auctionStatus ?? car.auction_status ?? '').toLowerCase();
  const isAuction = Boolean(
    car.isAuction ??
    car.hasAuction ??
    car.has_auction ??
    ((auctionStatus && auctionStatus !== 'none') || car.allowBid || car.allow_bid),
  );
  const currentBid = car.currentBid ?? car.current_bid;
  const bidsCount = car.bidsCount ?? car.bids_count;
  const auctionEnd = car.auctionEnd ?? car.auction_end;
  const location = car.city ?? car.location_city ?? '';
  const bodyStyleValue = (car.bodyType ?? car.body_type ?? '') as Vehicle['bodyStyle'];
  const transmissionValue = (car.transmission || '') as Vehicle['transmission'];
  const fuelTypeValue = (car.fuel || '') as Vehicle['fuelType'];
  const conditionValue = (car.condition || '') as Vehicle['condition'];
  const dealer = typeof car.dealer === 'object' && car.dealer ? car.dealer : null;
  const sellerId = car.dealer_id || dealer?._id || dealer?.id || (typeof car.dealer === 'string' ? car.dealer : '') || '';
  const dealerRole = dealer?.role;
  const sellerType = dealerRole === 'dealer'
    ? 'Verified Dealer'
    : dealerRole === 'individual_seller'
      ? 'Private Seller'
      : sellerId
        ? undefined
        : 'Private Seller';
  const isVerifiedDealer = Boolean(car.isVerifiedDealer ?? car.is_verified_dealer ?? dealer?.dealerApprovedAt);
  const inspectionStatus = String(car.inspectionStatus ?? car.inspection_status ?? '').trim();
  // STAGE 8 MARKETPLACE TRUST SIGNAL FIX: wire the already-built escrow
  // capability system (src/utils/escrow.ts::isEscrowApplicable) to the
  // real, server-enforced cars.escrow_enabled field. Before this fix,
  // escrowEligible was never populated here, so isEscrowApplicable() for
  // a dealer vehicle (the "optional" policy tier, which reads
  // escrowEligible) silently always evaluated as false/undefined —
  // not because the backend said so, but because nothing ever told it.
  const escrowEligible = Boolean(car.escrowEnabled ?? car.escrow_enabled);
  // STAGE 10M FIX: cars.duty_status is a real, authoritative backend field
  // (written only by the NTSA verification workflow, AdminNtsaQueue.jsx,
  // to the literal value 'duty_paid' once actually confirmed — never a
  // client-settable free text on the public listing form), but it was
  // never threaded through to the frontend at all. The vehicle detail
  // page's "Duty Paid" chip rendered unconditionally regardless of this
  // field — a fabricated trust claim per this stage's explicit audit.
  // Fixed by wiring the real field through, rather than removing the
  // signal outright, since (unlike "Clean Title") an authoritative source
  // for it already exists.
  const dutyStatus = String(car.dutyStatus ?? car.duty_status ?? '').trim();
  const auctionLifecycle = (['none', 'draft', 'live', 'ended'] as const).includes(auctionStatus as 'none' | 'draft' | 'live' | 'ended')
    ? (auctionStatus as 'none' | 'draft' | 'live' | 'ended')
    : 'none';

  return {
    id: car.id || car._id || '',
    title: car.title,
    make: car.brand,
    model: car.model,
    year: car.year,
    vin: car.vin || '',
    price: Number(car.price),
    mileage: car.mileage ?? 0,
    location,
    bodyStyle: bodyStyleValue,
    transmission: transmissionValue,
    fuelType: fuelTypeValue,
    engine: car.engine || '',
    horsepower: 0,
    exteriorColor: car.color || '',
    interiorColor: '',
    condition: conditionValue,
    listingType: isAuction ? 'auction' : 'fixed',
    images: imageUrls,
    image: imageUrls[0] || undefined,
    description: car.description || '',
    features: car.features || [],
    sellerId,
    sellerName: dealer?.businessName || dealer?.business_name || dealer?.name || 'Unknown Seller',
    sellerAvatar: dealer?.avatar || undefined,
    sellerPhone: dealer?.phone || undefined,
    sellerEmail: dealer?.email || undefined,
    sellerRating: 0,
    sellerType,
    isDealerCertified: isVerifiedDealer,
    dealerId: sellerId || undefined,
    verified: isVerifiedDealer,
    isAuction,
    auctionLifecycle,
    currentBid: currentBid != null ? Number(currentBid) : undefined,
    bidsCount: bidsCount != null ? Number(bidsCount) : undefined,
    auctionEndsAt: auctionEnd || undefined,
    savedCount: 0,
    inspectionStatus: inspectionStatus || undefined,
    inspectionPassed: inspectionStatus.toLowerCase() === 'passed',
    escrowEligible,
    dutyPaid: dutyStatus.toLowerCase() === 'duty_paid',
    status: car.status === 'sold' ? 'sold' : car.status === 'pending' ? 'pending' : car.status === 'draft' ? 'draft' : 'active',
    isFeatured: Boolean(car.isPromoted ?? car.is_promoted),
    createdAt: car.createdAt || car.created_at || '',
  };
}

// Added (Final Integration Phase 2 - seller listing -> publish ->
// marketplace). The real backend already has a complete, working
// POST /api/cars endpoint (backend/controllers/carController.js's
// createCar, mounted with real auth/ownership/validation middleware
// - protect, dealerOnly, requireDealerVerification, image upload,
// createCarSchema validation) - it was simply never called from any
// real frontend UI. This is the one, real, canonical creation
// endpoint - not a new API being invented here.
//
// Traced directly: the real seller listing wizard
// (PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx) has no
// per-step form inputs implemented at all for any of its 12 steps -
// its own `ListingDraft` state is declared but never populated by any
// real user input anywhere in that file, confirmed by direct
// inspection (no <input>, no onChange handler exists for any listing
// field in that component). Per this phase's own explicit
// instruction ("do not add seller functionality, do not redesign the
// seller wizard"), this function does not invent form fields that
// were never collected - it sends exactly what the wizard's own
// draft state actually contains, using FormData so it matches the
// real backend's multipart/form-data + upload.array("images", 10)
// contract exactly (never manually set Content-Type here - the
// browser must set the multipart boundary itself).
export interface CreateCarPayload {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  color?: string;
  condition?: string;
  vin?: string;
  registrationNumber?: string;
  description?: string;
  city?: string;
  /** Real image files - the real backend requires at least one
   * (confirmed directly: POST /api/cars rejects with "At least one
   * image is required." when omitted). */
  images?: File[];
}

export interface CreateCarResponse {
  success: boolean;
  message?: string;
  /** STAGE 2 API CONTRACT CONVERGENCE FIX: the real, canonical backend
   * envelope for every car-returning response in carController.js (list,
   * create, update, get) is `{ success, data }` — confirmed directly
   * (backend/controllers/carController.js:528 for this specific create
   * response, and every other car response in that file). This type
   * previously declared `car`, a field the backend has never sent, so
   * `result.success && result.car` was always false on every real,
   * successful listing creation — the caller fell through to its error
   * branch and showed "Failed to publish listing." on every success. */
  data?: BackendCar;
}

/** POST /api/cars - the one, real, canonical listing-creation
 * endpoint. Server-side validation (createCarSchema) is authoritative
 * - this function does not duplicate or pre-empt it, it simply
 * surfaces exactly what the real backend decides, success or
 * rejection, to the caller. */
export async function createCar(payload: CreateCarPayload): Promise<CreateCarResponse> {
  const formData = new FormData();
  const { images, ...scalarFields } = payload;
  Object.entries(scalarFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });
  // Real backend field name, confirmed directly: routes/carRoutes.js's
  // own upload.array("images", 10).
  (images || []).forEach((file) => formData.append('images', file));

  try {
    return await request<CreateCarResponse>('/api/cars', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    throw new VehicleApiError(error.message, error.status === 404 ? 'not_found' : 'server', error.status);
  }
}

