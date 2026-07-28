// backend/utils/cacheStrategy.js
// ─────────────────────────────────────────────────────────────
// Redis Caching Strategy
// Implements a comprehensive caching strategy with TTL,
// cache invalidation, and cache warming
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "./logger.js";
import { incrementCounter, setGauge } from "../config/metrics.js";

// =============================
// 📦 CACHE CONFIGURATION
// =============================

const CACHE_CONFIG = {
  // TTL in seconds
  TTL: {
    // Short-lived cache (5 minutes)
    SHORT: 300,
    // Medium-lived cache (15 minutes)
    MEDIUM: 900,
    // Long-lived cache (1 hour)
    LONG: 3600,
    // Very long-lived cache (24 hours)
    VERY_LONG: 86400,
  },

  // Cache keys
  KEYS: {
    // Car listings
    CAR_LISTING: "car:listing",
    CAR_DETAIL: "car:detail",
    CAR_SEARCH: "car:search",
    
    // User data
    USER_PROFILE: "user:profile",
    USER_STATS: "user:stats",
    
    // Auction data
    AUCTION_LISTING: "auction:listing",
    AUCTION_DETAIL: "auction:detail",
    AUCTION_BIDS: "auction:bids",
    
    // Escrow data
    ESCROW_DETAIL: "escrow:detail",
    ESCROW_STATUS: "escrow:status",
    
    // Analytics
    MARKET_STATS: "market:stats",
    TRENDING_CARS: "trending:cars",
    
    // Static content
    SETTINGS: "settings",
    CONFIG: "config",
  },

  // Cache tags for invalidation
  TAGS: {
    CARS: "cars",
    USERS: "users",
    AUCTIONS: "auctions",
    ESCROWS: "escrows",
    ANALYTICS: "analytics",
  },
};

// =============================
// 📊 CACHE METRICS
// =============================

const cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

// =============================
// 🔧 CACHE HELPER FUNCTIONS
// =============================

/**
 * Generate cache key with namespace
 */
export const generateCacheKey = (namespace, identifier) => {
  return `${namespace}:${identifier}`;
};

/**
 * Generate cache key with tags
 */
export const generateCacheKeyWithTags = (namespace, identifier, tags = []) => {
  const key = generateCacheKey(namespace, identifier);
  // Store tags separately for invalidation
  return key;
};

/**
 * Parse cache key
 */
export const parseCacheKey = (key) => {
  const [namespace, ...identifierParts] = key.split(":");
  return {
    namespace,
    identifier: identifierParts.join(":"),
  };
};

// =============================
// 💾 CACHE OPERATIONS
// =============================

/**
 * Get value from cache
 */
export const cacheGet = async (redis, key) => {
  try {
    const value = await redis.get(key);
    if (value) {
      cacheMetrics.hits++;
      incrementCounter("cache_hit");
      return JSON.parse(value);
    }
    cacheMetrics.misses++;
    incrementCounter("cache_miss");
    return null;
  } catch (error) {
    cacheMetrics.errors++;
    incrementCounter("cache_error");
    logError("Cache get error", error, { key });
    return null;
  }
};

/**
 * Set value in cache with TTL
 */
export const cacheSet = async (redis, key, value, ttl = CACHE_CONFIG.TTL.MEDIUM) => {
  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    cacheMetrics.sets++;
    incrementCounter("cache_set");
    return true;
  } catch (error) {
    cacheMetrics.errors++;
    incrementCounter("cache_error");
    logError("Cache set error", error, { key });
    return false;
  }
};

/**
 * Delete value from cache
 */
export const cacheDelete = async (redis, key) => {
  try {
    await redis.del(key);
    cacheMetrics.deletes++;
    incrementCounter("cache_delete");
    return true;
  } catch (error) {
    cacheMetrics.errors++;
    incrementCounter("cache_error");
    logError("Cache delete error", error, { key });
    return false;
  }
};

/**
 * Delete multiple keys by pattern
 */
export const cacheDeletePattern = async (redis, pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      cacheMetrics.deletes += keys.length;
      incrementCounter("cache_delete", { count: keys.length });
    }
    return keys.length;
  } catch (error) {
    cacheMetrics.errors++;
    incrementCounter("cache_error");
    logError("Cache delete pattern error", error, { pattern });
    return 0;
  }
};

/**
 * Invalidate cache by tag
 */
export const cacheInvalidateByTag = async (redis, tag) => {
  const pattern = `${tag}:*`;
  return await cacheDeletePattern(redis, pattern);
};

// =============================
// 🚀 CACHE WRAPPER
// =============================

/**
 * Cache wrapper function
 * Caches the result of a function call
 */
export const withCache = async (
  redis,
  key,
  fn,
  ttl = CACHE_CONFIG.TTL.MEDIUM,
  forceRefresh = false
) => {
  // If force refresh, skip cache
  if (!forceRefresh) {
    const cached = await cacheGet(redis, key);
    if (cached !== null) {
      logInfo("Cache hit", { key });
      return cached;
    }
  }

  // Execute function
  const result = await fn();

  // Cache result
  if (result !== null && result !== undefined) {
    await cacheSet(redis, key, result, ttl);
    logInfo("Cache set", { key, ttl });
  }

  return result;
};

// =============================
// 🔄 CACHE WARMING
// =============================

/**
 * Warm cache with initial data
 */
export const warmCache = async (redis, data) => {
  const warmed = [];
  for (const { key, value, ttl } of data) {
    const success = await cacheSet(redis, key, value, ttl);
    if (success) {
      warmed.push(key);
    }
  }
  logInfo("Cache warmed", { count: warmed.length });
  return warmed;
};

// =============================
// 📊 CACHE METRICS
// =============================

/**
 * Get cache metrics
 */
export const getCacheMetrics = () => {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  const hitRate = total > 0 ? (cacheMetrics.hits / total) * 100 : 0;

  return {
    ...cacheMetrics,
    hitRate: hitRate.toFixed(2),
    total,
  };
};

/**
 * Reset cache metrics
 */
export const resetCacheMetrics = () => {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.sets = 0;
  cacheMetrics.deletes = 0;
  cacheMetrics.errors = 0;
};

/**
 * Update cache metrics gauge
 */
export const updateCacheMetricsGauge = () => {
  const metrics = getCacheMetrics();
  setGauge("cache_hit_rate", parseFloat(metrics.hitRate));
  setGauge("cache_hits", metrics.hits);
  setGauge("cache_misses", metrics.misses);
  setGauge("cache_sets", metrics.sets);
  setGauge("cache_deletes", metrics.deletes);
  setGauge("cache_errors", metrics.errors);
};

// =============================
// 🎯 SPECIFIC CACHE STRATEGIES
// =============================

/**
 * Cache car listing
 */
export const cacheCarListing = async (redis, filters, cars) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.CAR_LISTING, JSON.stringify(filters));
  return await cacheSet(redis, key, cars, CACHE_CONFIG.TTL.SHORT);
};

/**
 * Get cached car listing
 */
export const getCachedCarListing = async (redis, filters) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.CAR_LISTING, JSON.stringify(filters));
  return await cacheGet(redis, key);
};

/**
 * Cache car detail
 */
export const cacheCarDetail = async (redis, carId, car) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.CAR_DETAIL, carId);
  return await cacheSet(redis, key, car, CACHE_CONFIG.TTL.MEDIUM);
};

/**
 * Get cached car detail
 */
export const getCachedCarDetail = async (redis, carId) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.CAR_DETAIL, carId);
  return await cacheGet(redis, key);
};

/**
 * Invalidate car cache
 */
export const invalidateCarCache = async (redis, carId) => {
  const detailKey = generateCacheKey(CACHE_CONFIG.KEYS.CAR_DETAIL, carId);
  await cacheDelete(redis, detailKey);
  // Invalidate all car listings
  await cacheDeletePattern(redis, `${CACHE_CONFIG.KEYS.CAR_LISTING}:*`);
  await cacheDeletePattern(redis, `${CACHE_CONFIG.KEYS.CAR_SEARCH}:*`);
};

/**
 * Cache user profile
 */
export const cacheUserProfile = async (redis, userId, profile) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.USER_PROFILE, userId);
  return await cacheSet(redis, key, profile, CACHE_CONFIG.TTL.MEDIUM);
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = async (redis, userId) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.USER_PROFILE, userId);
  return await cacheGet(redis, key);
};

/**
 * Invalidate user cache
 */
export const invalidateUserCache = async (redis, userId) => {
  const profileKey = generateCacheKey(CACHE_CONFIG.KEYS.USER_PROFILE, userId);
  const statsKey = generateCacheKey(CACHE_CONFIG.KEYS.USER_STATS, userId);
  await cacheDelete(redis, profileKey);
  await cacheDelete(redis, statsKey);
};

/**
 * Cache auction detail
 */
export const cacheAuctionDetail = async (redis, auctionId, auction) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.AUCTION_DETAIL, auctionId);
  return await cacheSet(redis, key, auction, CACHE_CONFIG.TTL.SHORT);
};

/**
 * Get cached auction detail
 */
export const getCachedAuctionDetail = async (redis, auctionId) => {
  const key = generateCacheKey(CACHE_CONFIG.KEYS.AUCTION_DETAIL, auctionId);
  return await cacheGet(redis, key);
};

/**
 * Invalidate auction cache
 */
export const invalidateAuctionCache = async (redis, auctionId) => {
  const detailKey = generateCacheKey(CACHE_CONFIG.KEYS.AUCTION_DETAIL, auctionId);
  const bidsKey = generateCacheKey(CACHE_CONFIG.KEYS.AUCTION_BIDS, auctionId);
  await cacheDelete(redis, detailKey);
  await cacheDelete(redis, bidsKey);
  await cacheDeletePattern(redis, `${CACHE_CONFIG.KEYS.AUCTION_LISTING}:*`);
};

/**
 * Cache market stats
 */
export const cacheMarketStats = async (redis, stats) => {
  const key = CACHE_CONFIG.KEYS.MARKET_STATS;
  return await cacheSet(redis, key, stats, CACHE_CONFIG.TTL.LONG);
};

/**
 * Get cached market stats
 */
export const getCachedMarketStats = async (redis) => {
  const key = CACHE_CONFIG.KEYS.MARKET_STATS;
  return await cacheGet(redis, key);
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  CACHE_CONFIG,
  generateCacheKey,
  generateCacheKeyWithTags,
  parseCacheKey,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheInvalidateByTag,
  withCache,
  warmCache,
  getCacheMetrics,
  resetCacheMetrics,
  updateCacheMetricsGauge,
  cacheCarListing,
  getCachedCarListing,
  cacheCarDetail,
  getCachedCarDetail,
  invalidateCarCache,
  cacheUserProfile,
  getCachedUserProfile,
  invalidateUserCache,
  cacheAuctionDetail,
  getCachedAuctionDetail,
  invalidateAuctionCache,
  cacheMarketStats,
  getCachedMarketStats,
};
