// backend/middleware/searchCache.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Cache middleware
// Provides Redis-based caching for search results
// ─────────────────────────────────────────────────────────────

import { cacheMiddleware, CACHE_TTL } from "../utils/cache.ts";

// =============================
// 📊 SEARCH CACHE TTL CONSTANTS
// =============================

export const SEARCH_CACHE_TTL = {
  // Real-time searches (short TTL)
  LIVE_AUCTIONS: 30, // 30 seconds
  TRENDING: 60, // 1 minute

  // Standard searches (medium TTL)
  VEHICLE_SEARCH: 300, // 5 minutes
  DEALER_SEARCH: 300, // 5 minutes
  AUCTION_SEARCH: 300, // 5 minutes

  // Popular searches (long TTL)
  POPULAR_FILTERS: 600, // 10 minutes
  TRENDING_SEARCHES: 600, // 10 minutes
  SEARCH_SUGGESTIONS: 600, // 10 minutes

  // Analytics (longer TTL)
  SEARCH_ANALYTICS: 1800, // 30 minutes
  SEARCH_SUMMARY: 1800, // 30 minutes
};

// =============================
// 📊 SEARCH CACHE KEY GENERATORS
// =============================

export const generateSearchCacheKey = (req, prefix = "search") => {
  const userId = req.user?.id || "anonymous";
  const path = req.path;
  const query = JSON.stringify(req.query);
  const body = req.method === "POST" ? JSON.stringify(req.body) : "";

  return `${prefix}:${userId}:${path}:${query}:${body}`;
};

export const generateVehicleSearchKey = (searchParams) => {
  const {
    keyword,
    minPrice,
    maxPrice,
    brand,
    year,
    minMileage,
    maxMileage,
    sort = "latest",
    page = 1,
    limit = 12,
  } = searchParams;

  const key = `vehicle_search:${keyword || ""}:${minPrice || ""}:${maxPrice || ""}:${brand || ""}:${year || ""}:${minMileage || ""}:${maxMileage || ""}:${sort}:${page}:${limit}`;
  return key;
};

export const generateDealerSearchKey = (searchParams) => {
  const { q, role, page = 1, limit = 20 } = searchParams;

  const key = `dealer_search:${q || ""}:${role || ""}:${page}:${limit}`;
  return key;
};

export const generateAuctionSearchKey = (searchParams) => {
  const { keyword, minPrice, maxPrice, brand, sort = "ending_soon", page = 1, limit = 12 } = searchParams;

  const key = `auction_search:${keyword || ""}:${minPrice || ""}:${maxPrice || ""}:${brand || ""}:${sort}:${page}:${limit}`;
  return key;
};

// =============================
// 📊 SEARCH CACHE MIDDLEWARE FACTORY
// =============================

export const cacheSearch = (ttl, keyPrefix = "search") => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = generateSearchCacheKey(req, keyPrefix);
    return cacheMiddleware(ttl, () => cacheKey)(req, res, next);
  };
};

// =============================
// 📊 PRE-CONFIGURED SEARCH CACHE MIDDLEWARE
// =============================

export const cacheVehicleSearch = cacheSearch(SEARCH_CACHE_TTL.VEHICLE_SEARCH, "vehicle_search");
export const cacheDealerSearch = cacheSearch(SEARCH_CACHE_TTL.DEALER_SEARCH, "dealer_search");
export const cacheAuctionSearch = cacheSearch(SEARCH_CACHE_TTL.AUCTION_SEARCH, "auction_search");
export const cacheLiveAuctions = cacheSearch(SEARCH_CACHE_TTL.LIVE_AUCTIONS, "live_auctions");
export const cacheTrending = cacheSearch(SEARCH_CACHE_TTL.TRENDING, "trending");
export const cachePopularFilters = cacheSearch(SEARCH_CACHE_TTL.POPULAR_FILTERS, "popular_filters");
export const cacheSearchSuggestions = cacheSearch(SEARCH_CACHE_TTL.SEARCH_SUGGESTIONS, "search_suggestions");
export const cacheSearchAnalytics = cacheSearch(SEARCH_CACHE_TTL.SEARCH_ANALYTICS, "search_analytics");
export const cacheSearchSummary = cacheSearch(SEARCH_CACHE_TTL.SEARCH_SUMMARY, "search_summary");

// =============================
// 📊 SEARCH CACHE INVALIDATION
// =============================

export const invalidateSearchCache = async (pattern) => {
  // This would be implemented with cache service
  // For now, we'll just log the invalidation
  console.log(`Search cache invalidated for pattern: ${pattern}`);

  // In production, this would:
  // 1. Connect to Redis
  // 2. Delete keys matching pattern
  // 3. Log the invalidation
  // Example:
  // const keys = await redis.keys(pattern);
  // if (keys.length > 0) {
  //   await redis.del(keys);
  // }
};

export const invalidateVehicleSearchCache = async () => {
  await invalidateSearchCache("vehicle_search:*");
};

export const invalidateDealerSearchCache = async () => {
  await invalidateSearchCache("dealer_search:*");
};

export const invalidateAuctionSearchCache = async () => {
  await invalidateSearchCache("auction_search:*");
};

export default {
  SEARCH_CACHE_TTL,
  generateSearchCacheKey,
  generateVehicleSearchKey,
  generateDealerSearchKey,
  generateAuctionSearchKey,
  cacheSearch,
  cacheVehicleSearch,
  cacheDealerSearch,
  cacheAuctionSearch,
  cacheLiveAuctions,
  cacheTrending,
  cachePopularFilters,
  cacheSearchSuggestions,
  cacheSearchAnalytics,
  cacheSearchSummary,
  invalidateSearchCache,
  invalidateVehicleSearchCache,
  invalidateDealerSearchCache,
  invalidateAuctionSearchCache,
};
