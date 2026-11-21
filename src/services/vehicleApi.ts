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
  /** Derived reservation flag from the server (no buyer identity). */
  reservation?: { reserved?: boolean } | null;
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
  address?: string | null;
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
  /** Server-derived read-only owner action eligibility; the lifecycle RPC remains authoritative. */
  ownerActionEligibility?: {
    permissionsAvailable: boolean;
    isSellerHidden: boolean;
    isPolicyHidden: boolean;
    canEdit: boolean;
    canManagePhotos: boolean;
    canHide: boolean;
    canRepublish: boolean;
    canMarkSold: boolean;
    canRemove: boolean;
    maxListingImages?: number;
    maxImagesPerRequest?: number;
    reason?: string;
    /** Why an action is unavailable: SOLD, RESERVED, TRANSACTION_LOCK, OFFER_SETTLEMENT_LOCK, MODERATION_HIDDEN, SELLER_ACCESS, STATE or PERMISSION_CHECK_UNAVAILABLE (a service fault, not a denial). */
    reasonCode?: string;
    /** Why pause / republish / mark-as-sold are unavailable while edit and photos still work (e.g. the status service is not enabled yet). */
    lifecycleReason?: string;
    lifecycleReasonCode?: string;
    /** Record sets that are not deployed on this platform (treated as empty) and sets that could not be read right now. */
    degraded?: string[];
    unavailableSources?: string[];
  };
  /** Stable per-seller listing number: 1 is the seller's first listing ever. Server-derived (creation order, removed listings keep their number); never a database id. */
  listingNumber?: number | null;
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

/** Structured, non-sensitive facts from the response body (e.g. the backend's maintenance 503
 * `{ code, maintenance, scope }`), so callers can tell a maintenance pause from a real outage. */
export interface VehicleApiErrorDetails {
  code?: string;
  maintenance?: boolean;
  scope?: string;
}

export class VehicleApiError extends Error {
  kind: VehicleApiErrorKind;
  status?: number;
  code?: string;
  maintenance?: boolean;
  scope?: string;
  constructor(message: string, kind: VehicleApiErrorKind, status?: number, details?: VehicleApiErrorDetails) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.code = details?.code;
    this.maintenance = details?.maintenance;
    this.scope = details?.scope;
  }
}

/** The most useful message the server gave: field-level validation text ("year: Year is required") beats the generic "Validation failed". */
function serverMessageFrom(body: unknown, fallback: string): string {
  const errors = body && typeof body === 'object' ? (body as Record<string, unknown>).errors : undefined;
  return typeof errors === 'string' && errors.trim() ? errors : fallback;
}

function errorDetailsFrom(body: unknown): VehicleApiErrorDetails | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  const details: VehicleApiErrorDetails = {};
  if (typeof b.code === 'string') details.code = b.code;
  if (typeof b.maintenance === 'boolean') details.maintenance = b.maintenance;
  if (typeof b.scope === 'string') details.scope = b.scope;
  return Object.keys(details).length ? details : undefined;
}

async function vehicleFetch<T>(path: string, options: RequestInit = {}, timeout?: number): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string>, ...(timeout ? { timeout } : {}) });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: VehicleApiErrorKind = error.status === 404 ? 'not_found' : error.status ? 'server' : 'network';
    throw new VehicleApiError(error.message, kind, error.status, errorDetailsFrom(error.responseData));
  }
}

export interface GetCarsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  brand?: string;
  model?: string;
  /** Manual entry: typed text that is not a listed option; matched by "contains" on the server. */
  brandLike?: string;
  modelLike?: string;
  colorLike?: string;
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
  /** One seller's showroom: that seller's id (UUID). */
  dealer?: string;
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
function isTransientInventoryError(err: unknown): boolean {
  if (!(err instanceof VehicleApiError)) return false;
  if (err.maintenance) return false;
  return err.kind === 'network' || err.status === 408 || err.status === 502 || err.status === 503 || err.status === 504;
}

// ---------------------------------------------------------------------------
// Inventory read cache (stale-while-revalidate).
// The marketplace, the app shell and the market context all read the same
// /api/cars pages. Identical requests share one network call (in-flight dedupe),
// a fresh result is reused for FRESH_MS, and an older result (kept for STALE_MS,
// also across reloads via sessionStorage) is shown instantly while a background
// refresh replaces it. Any listing write clears it, so sellers never see old data.
// ---------------------------------------------------------------------------
const FRESH_MS = 30_000;
const STALE_MS = 10 * 60_000;
const FIRST_ATTEMPT_MS = 20_000;
const RETRY_ATTEMPT_MS = 45_000;
const STORE_KEY = 'kayad:cars-cache:v1';
const MAX_STORED = 6;
type CacheEntry = { at: number; data: PaginatedCarsResponse };
const carsCache = new Map<string, CacheEntry>();
const carsInflight = new Map<string, Promise<PaginatedCarsResponse>>();
let storeLoaded = false;
// Tests exercise request shapes and failures, so the cache is off under test unless a test turns it on.
let cacheEnabled = !(typeof import.meta !== 'undefined' && (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test');
/** Test hook: turn the inventory cache on or off. */
export function setCarsCacheEnabled(on: boolean): void { cacheEnabled = on; if (!on) clearCarsCache(); }

function carsQuery(params: GetCarsParams): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

/** Cache key: the same filters in any order are the same page. */
function carsKey(params: GetCarsParams): string {
  return [...new URLSearchParams(carsQuery(params)).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

function loadStore() {
  if (storeLoaded) return;
  storeLoaded = true;
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORE_KEY) : null;
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<[string, CacheEntry]>;
    parsed.forEach(([k, v]) => { if (v && Date.now() - v.at < STALE_MS && !carsCache.has(k)) carsCache.set(k, v); });
  } catch { /* storage unavailable or corrupt: run without it */ }
}

function saveStore() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const recent = [...carsCache.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, MAX_STORED);
    sessionStorage.setItem(STORE_KEY, JSON.stringify(recent));
  } catch { /* quota or private mode: ignore */ }
}

/** Drop every cached inventory page. Called after any listing write. */
export function clearCarsCache(): void {
  carsCache.clear();
  carsInflight.clear();
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

/** Synchronous read of a previously loaded page. `fresh` says whether it still needs no refresh. */
export function peekCars(params: GetCarsParams = {}): { data: PaginatedCarsResponse; fresh: boolean } | null {
  if (!cacheEnabled) return null;
  loadStore();
  const entry = carsCache.get(carsKey(params));
  if (!entry) return null;
  const age = Date.now() - entry.at;
  if (age > STALE_MS) return null;
  return { data: entry.data, fresh: age < FRESH_MS };
}

/** Warm the cache for a page the user is about to open (fire and forget). */
export function prefetchCars(params: GetCarsParams = {}): void {
  if (peekCars(params)?.fresh) return;
  void getCars(params, { force: true }).catch(() => undefined);
}

export async function getCars(params: GetCarsParams = {}, opts: { force?: boolean } = {}): Promise<PaginatedCarsResponse> {
  const key = carsKey(params);
  if (!opts.force) {
    const hit = peekCars(params);
    if (hit?.fresh) return hit.data;
  }
  const pending = carsInflight.get(key);
  if (pending) return pending;
  const path = `/api/cars${carsQuery(params) ? `?${carsQuery(params)}` : ''}`;
  // A first attempt that fails for a transient reason (no response, 408/502/503/504 other than maintenance) is retried once
  // with a longer allowance, which is what a server that is still waking up needs. Skipped under test and for definite answers.
  const run = vehicleFetch<PaginatedCarsResponse>(path, { method: 'GET' }, cacheEnabled ? FIRST_ATTEMPT_MS : undefined)
    .catch(async (err) => {
      if (!cacheEnabled || !isTransientInventoryError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return vehicleFetch<PaginatedCarsResponse>(path, { method: 'GET' }, RETRY_ATTEMPT_MS);
    })
    .then((data) => {
      if (cacheEnabled) { carsCache.set(key, { at: Date.now(), data }); saveStore(); }
      return data;
    })
    .finally(() => { carsInflight.delete(key); });
  carsInflight.set(key, run);
  return run;
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

/** GET /api/featured-campaigns/current - vehicle ids the Super Admin is featuring right now, in display order.
 * Never throws: when campaigns are unavailable the homepage keeps using its normal featured selection. */
export async function getCurrentFeaturedCampaignCarIds(): Promise<string[]> {
  try {
    const res = await vehicleFetch<{ carIds?: unknown }>('/api/featured-campaigns/current', { method: 'GET' });
    return Array.isArray(res?.carIds) ? res.carIds.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** GET /api/cars/my-listings - the real, signed-in seller's own
 * listings, every status (not just "available"). */
export async function getMyListings(): Promise<BackendCar[]> {
  const res = await vehicleFetch<{ data: BackendCar[] }>('/api/cars/my-listings', { method: 'GET' });
  return res.data || [];
}

export async function transitionMyListing(id: string, action: 'hide' | 'publish' | 'mark_sold') {
  return vehicleFetch<{ success: boolean; data?: { id: string; previousStatus: string; status: string; action: string }; code?: string; message?: string }>(`/api/cars/${encodeURIComponent(id)}/lifecycle`, { method: 'PATCH', body: JSON.stringify({ action }), headers: { 'Content-Type': 'application/json' } });
}

export async function getMyListingPerformance(days = 30) {
  return vehicleFetch<{ success: boolean; data: any }>(`/api/cars/my-listing-performance?days=${encodeURIComponent(String(days))}`, { method: 'GET' });
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
    engineSize: car.engine || undefined,
    driveType: ((car.driveType ?? car.drive_type) || undefined) as Vehicle['driveType'],
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
    reserved: Boolean(car.reservation?.reserved) || String(car.status || '').toLowerCase() === 'reserved',
    escrowEligible,
    dutyPaid: dutyStatus.toLowerCase() === 'duty_paid',
    status: car.status === 'sold' ? 'sold' : car.status === 'pending' ? 'pending' : car.status === 'draft' ? 'draft' : 'active',
    isFeatured: Boolean(car.isPromoted ?? car.is_promoted),
    createdAt: car.createdAt || car.created_at || '',
  };
}

/**
 * Canonical multipart listing-creation contract used by the unified personal
 * listing wizard. The browser sends real File objects and lets FormData set
 * its own multipart boundary; server-side validation and ownership checks are
 * authoritative. The current API does not persist the wizard's ownership
 * declaration or logbook-availability checkbox, so neither is represented as
 * verified evidence by this client contract.
 */
export interface CreateCarPayload {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  condition?: string;
  vin?: string;
  registrationNumber?: string;
  description?: string;
  city?: string;
  address?: string;
  features?: string[];
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
    clearCarsCache();
    // The shared client defaults to Content-Type: application/json, and axios
    // serialises FormData to JSON (dropping the files) under that header.
    // Declaring multipart lets the browser set the boundary itself.
    return await request<CreateCarResponse>('/api/cars', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    throw new VehicleApiError(serverMessageFrom(error.responseData, error.message), error.status === 404 ? 'not_found' : 'server', error.status, errorDetailsFrom(error.responseData));
  } finally { clearCarsCache(); }
}

export type UpdateCarPayload = Omit<CreateCarPayload, 'images' | 'vin' | 'registrationNumber'>;

/** PUT /api/cars/:id - the real, canonical edit endpoint. The backend
 * enforces owner-or-staff access, blocks staff-only fields and locks
 * auction fields once an auction has left draft; this helper only sends
 * the partial JSON body and surfaces whatever the server decides. */
export async function updateCar(id: string, payload: UpdateCarPayload): Promise<CreateCarResponse> {
  const body: Record<string, unknown> = {};
  const clearableTextFields = new Set(['description', 'fuel', 'transmission', 'bodyType', 'color', 'condition', 'address']);
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value === '' && !clearableTextFields.has(key)) return;
    body[key] = value;
  });
  try {
    clearCarsCache();
    return await request<CreateCarResponse>(`/api/cars/${encodeURIComponent(id)}`, { method: 'PUT', body });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    throw new VehicleApiError(serverMessageFrom(error.responseData, error.message), error.status === 404 ? 'not_found' : error.status ? 'server' : 'network', error.status, errorDetailsFrom(error.responseData));
  } finally { clearCarsCache(); }
}


// ---- Phase 14.6: existing-listing photo management and listing removal --------------------------------------------------
// All three use routes that already exist and enforce owner-or-staff on the server:
//   POST   /api/cars/:id/images          (multipart, <=10 files per request, administrator-configured per-listing cap up to 20, JPG/PNG/WEBP, 5 MB each)
//   DELETE /api/cars/:id/images/:index   (index into the listing's current image array)
//   DELETE /api/cars/:id                 (soft delete; owner-or-staff)
export const LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const LISTING_IMAGE_MAX_PER_REQUEST = 10;
export const LISTING_IMAGE_MAX_PER_LISTING = 20;

export interface ListingImage { url: string; thumb?: string; public_id?: string }
export interface ListingImagesResponse { success: boolean; message?: string; data?: { images?: ListingImage[]; coverImage?: number } }

function toVehicleError(err: unknown): VehicleApiError {
  const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
  return new VehicleApiError(error.message, error.status === 404 ? 'not_found' : error.status ? 'server' : 'network', error.status);
}

export async function addCarImages(id: string, files: File[], onProgress?: (percent: number) => void): Promise<ListingImagesResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  try {
    clearCarsCache();
    return await request<ListingImagesResponse>(`/api/cars/${encodeURIComponent(id)}/images`, {
      method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: onProgress,
    });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}

export async function deleteCarImage(id: string, index: number, publicId?: string): Promise<ListingImagesResponse> {
  try {
    clearCarsCache();
    return await request<ListingImagesResponse>(`/api/cars/${encodeURIComponent(id)}/images/${index}`, { method: 'DELETE', ...(publicId ? { params: { publicId } } : {}) });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}

/** Choose the poster: the server moves the photo to the front and returns the new order. */
export async function setCoverImage(id: string, index: number, publicId?: string): Promise<ListingImagesResponse> {
  try {
    clearCarsCache();
    return await request<ListingImagesResponse>(`/api/cars/${encodeURIComponent(id)}/images/cover`, { method: 'PATCH', body: { index, ...(publicId ? { publicId } : {}) } });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}

/** Save a new photo order. `order[newPosition] = currentIndex`; photo 0 becomes the poster. The server re-checks ownership and eligibility. */
export async function reorderCarImages(id: string, order: number[], currentOrder?: string[]): Promise<ListingImagesResponse> {
  try {
    clearCarsCache();
    return await request<ListingImagesResponse>(`/api/cars/${encodeURIComponent(id)}/images/order`, { method: 'PATCH', body: { order, ...(currentOrder ? { currentOrder } : {}) } });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}

/** Dealer marks one of their own listings as sold. Sale details are optional and kept in the audit log. */
export async function markCarSold(id: string, body: { buyerName?: string; salePrice?: number; notes?: string } = {}): Promise<{ success: boolean; message?: string; code?: string }> {
  try {
    clearCarsCache();
    return await request<{ success: boolean; message?: string }>(`/api/dealer/cars/${encodeURIComponent(id)}/mark-sold`, { method: 'PATCH', body });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}

export async function deleteCar(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    clearCarsCache();
    return await request<{ success: boolean; message?: string }>(`/api/cars/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) { throw toVehicleError(err); } finally { clearCarsCache(); }
}
