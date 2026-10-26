// backend/utils/publicListingCache.js — Phase C.1
// Every cache family that serves public vehicle inventory. The anonymous GET /api/cars listing is cached under
// `vehicle_search:*` (middleware/searchCache.js), which no listing mutation used to invalidate, so deleted, hidden
// or edited vehicles stayed in the public listing until the cache TTL expired. Call this after any write that
// creates, edits, hides, sells or (soft-)deletes a listing.
import { cacheDelPattern } from "./cache.js";

export const PUBLIC_LISTING_CACHE_PATTERNS = Object.freeze([
  "cars:list:*",
  "vehicle_search:*",
  "kayad:search:facets:*",
  "kayad:search:suggestions:*",
  // Phase 13F: the shared response-cache family (`cache:GET:<url>`) that serves GET /api/cars/:id and its by-id sub-resources.
  // Scoped to the car routes only so unrelated cached responses (e.g. admin stats) are NOT flushed by a seller decision.
  "cache:GET:/api/cars*",
  "cache:GET:/api/v1/cars*",
  // Phase 13I: the anonymous valuation matrix (make/model/year/price-range aggregate, cached 300s) is computed from public listings, so a
  // hide/suspend/delete/edit must drop it too. Verified by phase13i_public_endpoint_exposure.mjs (CA4): without this a suspended seller's
  // listing stayed visible, as an aggregate row, until the TTL expired. Scoped to /matrix so by-id valuation caches (already guarded) are untouched.
  "cache:GET:/api/valuation/matrix*",
]);

export const invalidatePublicListingCaches = async ({ strict = false } = {}) => {
  for (const pattern of PUBLIC_LISTING_CACHE_PATTERNS) await cacheDelPattern(pattern, { strict });
};
