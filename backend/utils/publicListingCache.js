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
]);

export const invalidatePublicListingCaches = async () => {
  for (const pattern of PUBLIC_LISTING_CACHE_PATTERNS) await cacheDelPattern(pattern);
};
