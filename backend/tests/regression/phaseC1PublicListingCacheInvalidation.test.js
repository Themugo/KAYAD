// Phase C.1 regression (newly created). The anonymous public listing (GET /api/cars) is cached under
// `vehicle_search:*` by middleware/searchCache.js, but listing mutations only cleared `cars:list:*` and the
// facet/suggestion keys, so a deleted or edited vehicle stayed in the public listing until the cache TTL.
// Runs against the in-memory cache (no REDIS_URL); the Redis path is covered by
// tests/integration/cache-invalidation.integration.test.js against a real Redis server.
import { describe, test, expect, beforeAll } from "@jest/globals";

delete process.env.REDIS_URL;
delete process.env.REDIS_URI;
const cache = await import("../../utils/cache.js");
const { PUBLIC_LISTING_CACHE_PATTERNS, invalidatePublicListingCaches } = await import("../../utils/publicListingCache.js");

describe("public listing cache invalidation (in-memory)", () => {
  beforeAll(async () => { await cache.initCache(); });

  test("helper covers every cache family that serves public inventory, including vehicle_search", () => {
    expect([...PUBLIC_LISTING_CACHE_PATTERNS].sort()).toEqual(
      ["cache:GET:/api/cars*", "cache:GET:/api/v1/cars*", "cache:GET:/api/valuation/matrix*", "cars:list:*", "kayad:search:facets:*", "kayad:search:suggestions:*", "vehicle_search:*"].sort(),
    );
  });

  test("invalidatePublicListingCaches clears the anonymous listing cache and leaves unrelated keys", async () => {
    const listingKey = 'vehicle_search:anonymous:/:{"brand":"Toyota","limit":"50"}:';
    await cache.cacheSet(listingKey, { data: [{ id: "deleted-car" }] }, 300);
    await cache.cacheSet("cars:list:page1", { x: 1 }, 300);
    await cache.cacheSet("kayad:search:facets:{}", { x: 1 }, 300);
    await cache.cacheSet("kayad:search:suggestions:toy", { x: 1 }, 300);
    await cache.cacheSet("cache:GET:/api/admin/stats", { keep: true }, 300);

    await invalidatePublicListingCaches();

    expect(await cache.cacheGet(listingKey)).toBeNull();
    expect(await cache.cacheGet("cars:list:page1")).toBeNull();
    expect(await cache.cacheGet("kayad:search:facets:{}")).toBeNull();
    expect(await cache.cacheGet("kayad:search:suggestions:toy")).toBeNull();
    expect(await cache.cacheGet("cache:GET:/api/admin/stats")).toEqual({ keep: true });
  });
});
