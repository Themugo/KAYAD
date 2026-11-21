// backend/middleware/apiCache.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// API response caching middleware
// Provides standardized caching for GET endpoints
// ─────────────────────────────────────────────────────────────

import { onJsonResponse } from "../utils/responseHooks.js";
import { cacheMiddleware, cacheDelPattern, CACHE_TTL } from "../utils/cache.js";

// =============================
// 📊 CACHE TTL CONSTANTS
// =============================

export const API_CACHE_TTL = {
  // High-frequency data (short TTL)
  STATS: 60, // 1 minute
  METRICS: 60, // 1 minute
  QUEUE_HEALTH: 30, // 30 seconds

  // Medium-frequency data (medium TTL)
  LISTINGS: 300, // 5 minutes
  USER_DATA: 300, // 5 minutes
  DEALER_DATA: 300, // 5 minutes
  ANALYTICS: 300, // 5 minutes

  // Low-frequency data (long TTL)
  MARKET_DATA: 600, // 10 minutes
  CONFIG: 3600, // 1 hour
  STATIC: 86400, // 24 hours
};

// =============================
// 📊 CACHE KEY GENERATORS
// =============================

export const generateCacheKey = (req, prefix = "") => {
  const userId = req.user?.id || "anonymous";
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `${prefix}:${userId}:${path}:${query}`;
};

// =============================
// 📊 CACHE MIDDLEWARE FACTORY
// =============================

export const cacheResponse = (ttl, keyPrefix = "") => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = generateCacheKey(req, keyPrefix);
    return cacheMiddleware(ttl, () => cacheKey)(req, res, next);
  };
};

// =============================
// 📊 CACHE INVALIDATION MIDDLEWARE
// =============================

// Keys are `${prefix}:${userId}:${path}:${query}`. A bare prefix ("dealer", "user") used to be passed to Redis SCAN MATCH as a literal,
// which matches no key, so a successful write never invalidated the cached GET (DA-04: saved banking details read back blank for 5
// minutes). A pattern without a glob character now means "everything under that prefix".
export const normalizeInvalidationPattern = (pattern) => (/[*?[\]]/.test(pattern) ? pattern : `${pattern}:*`);

export const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    onJsonResponse(res, () => {
      if (pattern) cacheDelPattern(normalizeInvalidationPattern(pattern));
    });

    next();
  };
};

// =============================
// 📊 PRE-CONFIGURED CACHE MIDDLEWARE
// =============================

export const cacheStats = cacheResponse(API_CACHE_TTL.STATS, "stats");
export const cacheMetrics = cacheResponse(API_CACHE_TTL.METRICS, "metrics");
export const cacheQueueHealth = cacheResponse(API_CACHE_TTL.QUEUE_HEALTH, "queue");
export const cacheListings = cacheResponse(API_CACHE_TTL.LISTINGS, "listings");
export const cacheUserData = cacheResponse(API_CACHE_TTL.USER_DATA, "user");
export const cacheDealerData = cacheResponse(API_CACHE_TTL.DEALER_DATA, "dealer");
export const cacheAnalytics = cacheResponse(API_CACHE_TTL.ANALYTICS, "analytics");
export const cacheMarketData = cacheResponse(API_CACHE_TTL.MARKET_DATA, "market");
export const cacheConfig = cacheResponse(API_CACHE_TTL.CONFIG, "config");

export default {
  API_CACHE_TTL,
  generateCacheKey,
  cacheResponse,
  invalidateCache,
  cacheStats,
  cacheMetrics,
  cacheQueueHealth,
  cacheListings,
  cacheUserData,
  cacheDealerData,
  cacheAnalytics,
  cacheMarketData,
  cacheConfig,
};
