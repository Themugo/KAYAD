import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend favorites API client. KAYAD Phase 2 (eliminate mock
 * business state) - "Saved vehicles" priority item.
 *
 * Follows the exact pattern established in services/authApi.ts and
 * services/vehicleApi.ts: typed error class with a `kind` field,
 * `credentials: 'include'` on every request (the real backend requires
 * auth for every one of these routes - confirmed via `router.use(protect)`
 * in backend/routes/favoriteRoutes.js, applied before any handler).
 *
 * IMPORTANT SCOPE NOTE: this client is real and tested, but the
 * backend's favorite endpoints are auth-required. This means an
 * unauthenticated visitor genuinely cannot have server-side saved
 * vehicles - there is no anonymous-favorites concept on the backend at
 * all. The hook that uses this client (useVehicleCollections.ts) must
 * therefore keep a local-state fallback for logged-out users, not as a
 * network-failure fallback (like vehicleApi.ts's pattern) but as a
 * genuine, permanent behavioral difference between authenticated and
 * anonymous use - documented here so that distinction isn't lost.
 *
 */


export interface BackendFavoriteCar {
  id?: string;
  _id?: string;
  title: string;
  price: number;
  images?: Array<{ url: string }>;
  brand?: string;
  model?: string;
  year?: number;
  fuel?: string;
  transmission?: string;
  mileage?: number;
  location?: string;
  _favoriteId?: string;
  notifyOnPriceDrop?: boolean;
}

export interface GetFavoritesResponse {
  success: boolean;
  favorites: BackendFavoriteCar[];
  total: number;
  pagination: { page: number; limit: number; total: number; pages: number };
  message?: string;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  favorited: boolean;
  message?: string;
}

export type FavoriteApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server';

export class FavoriteApiError extends Error {
  kind: FavoriteApiErrorKind;
  status?: number;
  constructor(message: string, kind: FavoriteApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function favoriteFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: FavoriteApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 404 ? 'not_found' : 'server';
    throw new FavoriteApiError(error.message, kind, error.status);
  }
}

/** GET /api/favorites - real, paginated, populated list. */
export async function getFavorites(params: { page?: number; limit?: number } = {}): Promise<GetFavoritesResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return favoriteFetch<GetFavoritesResponse>(`/api/favorites${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/** POST /api/favorites/:carId/toggle - single call handles both add
 * and remove, matching this frontend's existing toggle-based UX
 * (handleToggleSave in the pre-existing useVehicleCollections hook). */
export async function toggleFavorite(carId: string): Promise<ToggleFavoriteResponse> {
  return favoriteFetch<ToggleFavoriteResponse>(`/api/favorites/${carId}/toggle`, { method: 'POST' });
}
