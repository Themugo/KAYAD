// backend/utils/queryOptimizer.js
// ─────────────────────────────────────────────────────────────
// Query Optimization Utility
// Provides query optimization strategies and middleware
// for improving database query performance
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "./logger.js";
import { incrementCounter, setGauge, recordHistogram } from "../config/metrics.js";

// =============================
// 📊 QUERY METRICS
// =============================

const queryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  optimizedQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

// =============================
// ⚙️ QUERY CONFIGURATION
// =============================

const QUERY_CONFIG = {
  // Slow query threshold in milliseconds
  SLOW_QUERY_THRESHOLD: 1000,
  
  // Query timeout in milliseconds
  QUERY_TIMEOUT: 5000,
  
  // Maximum documents to return
  MAX_DOCUMENTS: 1000,
  
  // Projection for common queries
  PROJECTIONS: {
    CAR_LISTING: {
      _id: 1,
      title: 1,
      price: 1,
      mileage: 1,
      year: 1,
      transmission: 1,
      fuelType: 1,
      location: 1,
      images: 1,
      status: 1,
      auction: 1,
      createdAt: 1,
    },
    CAR_DETAIL: {
      _id: 1,
      title: 1,
      description: 1,
      price: 1,
      mileage: 1,
      year: 1,
      make: 1,
      model: 1,
      transmission: 1,
      fuelType: 1,
      bodyType: 1,
      color: 1,
      location: 1,
      images: 1,
      features: 1,
      status: 1,
      auction: 1,
      seller: 1,
      verification: 1,
      createdAt: 1,
      updatedAt: 1,
    },
    USER_PROFILE: {
      _id: 1,
      name: 1,
      email: 1,
      phone: 1,
      role: 1,
      emailVerified: 1,
      profilePicture: 1,
      location: 1,
      createdAt: 1,
    },
    AUCTION_DETAIL: {
      _id: 1,
      car: 1,
      startTime: 1,
      endTime: 1,
      startingPrice: 1,
      currentBid: 1,
      status: 1,
      participants: 1,
    },
  },
};

// =============================
// 🔍 QUERY OPTIMIZATION FUNCTIONS
// =============================

/**
 * Add projection to query to limit returned fields
 */
export const addProjection = (query, projectionName) => {
  const projection = QUERY_CONFIG.PROJECTIONS[projectionName];
  if (projection) {
    query.projection(projection);
  }
  return query;
};

/**
 * Add lean() to query for better performance
 */
export const addLean = (query) => {
  return query.lean();
};

/**
 * Add limit to query to prevent excessive results
 */
export const addLimit = (query, limit = QUERY_CONFIG.MAX_DOCUMENTS) => {
  return query.limit(limit);
};

/**
 * Add skip and limit for pagination
 */
export const addPagination = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

/**
 * Add sort to query
 */
export const addSort = (query, sortField = "createdAt", sortOrder = -1) => {
  return query.sort({ [sortField]: sortOrder });
};

/**
 * Add index hints to query
 */
export const addIndexHint = (query, indexName) => {
  return query.hint({ [indexName]: 1 });
};

/**
 * Optimize query with common optimizations
 */
export const optimizeQuery = (query, options = {}) => {
  const {
    projection,
    lean = true,
    limit,
    page,
    sort,
    indexHint,
  } = options;

  if (projection) {
    addProjection(query, projection);
  }

  if (lean) {
    addLean(query);
  }

  if (page) {
    addPagination(query, page, limit);
  } else if (limit) {
    addLimit(query, limit);
  }

  if (sort) {
    addSort(query, sort.field, sort.order);
  }

  if (indexHint) {
    addIndexHint(query, indexHint);
  }

  return query;
};

// =============================
// ⏱️ QUERY TIMING MIDDLEWARE
// =============================

/**
 * Wrap query execution with timing
 */
export const withQueryTiming = async (queryFn, queryName) => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    queryMetrics.totalQueries++;
    
    // Record histogram
    recordHistogram("query_duration", duration, { query: queryName });
    
    // Check for slow query
    if (duration > QUERY_CONFIG.SLOW_QUERY_THRESHOLD) {
      queryMetrics.slowQueries++;
      incrementCounter("slow_query", { query: queryName });
      logWarn("Slow query detected", { query: queryName, duration });
    }
    
    logInfo("Query executed", { query: queryName, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Query error", error, { query: queryName, duration });
    incrementCounter("query_error", { query: queryName });
    throw error;
  }
};

// =============================
// 📊 QUERY METRICS
// =============================

/**
 * Get query metrics
 */
export const getQueryMetrics = () => {
  return {
    ...queryMetrics,
    slowQueryRate: queryMetrics.totalQueries > 0
      ? (queryMetrics.slowQueries / queryMetrics.totalQueries) * 100
      : 0,
  };
};

/**
 * Reset query metrics
 */
export const resetQueryMetrics = () => {
  queryMetrics.totalQueries = 0;
  queryMetrics.slowQueries = 0;
  queryMetrics.optimizedQueries = 0;
  queryMetrics.cacheHits = 0;
  queryMetrics.cacheMisses = 0;
};

/**
 * Update query metrics gauge
 */
export const updateQueryMetricsGauge = () => {
  const metrics = getQueryMetrics();
  setGauge("query_total", metrics.totalQueries);
  setGauge("query_slow", metrics.slowQueries);
  setGauge("query_optimized", metrics.optimizedQueries);
  setGauge("query_cache_hit", metrics.cacheHits);
  setGauge("query_cache_miss", metrics.cacheMisses);
  setGauge("query_slow_rate", metrics.slowQueryRate);
};

// =============================
// 🎯 SPECIFIC QUERY OPTIMIZATIONS
// =============================

/**
 * Optimize car listing query
 */
export const optimizeCarListingQuery = (query, filters = {}) => {
  // Add projection
  addProjection(query, "CAR_LISTING");
  
  // Add lean
  addLean(query);
  
  // Add pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  addPagination(query, page, limit);
  
  // Add sort
  const sortField = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || -1;
  addSort(query, sortField, sortOrder);
  
  // Add index hint if available
  if (filters.status) {
    addIndexHint(query, "status_1_createdAt_-1");
  }
  
  queryMetrics.optimizedQueries++;
  incrementCounter("query_optimized", { type: "car_listing" });
  
  return query;
};

/**
 * Optimize car detail query
 */
export const optimizeCarDetailQuery = (query) => {
  // Add projection
  addProjection(query, "CAR_DETAIL");
  
  // Add lean
  addLean(query);
  
  // Add index hint
  addIndexHint(query, "_id_1");
  
  queryMetrics.optimizedQueries++;
  incrementCounter("query_optimized", { type: "car_detail" });
  
  return query;
};

/**
 * Optimize user profile query
 */
export const optimizeUserProfileQuery = (query) => {
  // Add projection
  addProjection(query, "USER_PROFILE");
  
  // Add lean
  addLean(query);
  
  // Add index hint
  addIndexHint(query, "_id_1");
  
  queryMetrics.optimizedQueries++;
  incrementCounter("query_optimized", { type: "user_profile" });
  
  return query;
};

/**
 * Optimize auction query
 */
export const optimizeAuctionQuery = (query) => {
  // Add projection
  addProjection(query, "AUCTION_DETAIL");
  
  // Add lean
  addLean(query);
  
  // Add index hint
  addIndexHint(query, "car_1_status_1");
  
  queryMetrics.optimizedQueries++;
  incrementCounter("query_optimized", { type: "auction" });
  
  return query;
};

/**
 * Optimize search query
 */
export const optimizeSearchQuery = (query, searchFields = []) => {
  // Add text index hint if searching
  if (searchFields.length > 0) {
    addIndexHint(query, "title_text_description_text");
  }
  
  // Add limit
  addLimit(query, 50);
  
  // Add lean
  addLean(query);
  
  queryMetrics.optimizedQueries++;
  incrementCounter("query_optimized", { type: "search" });
  
  return query;
};

// =============================
// 🔧 QUERY BUILDER
// =============================

/**
 * Build optimized query from options
 */
export const buildOptimizedQuery = (Model, options = {}) => {
  const {
    filters = {},
    projection,
    lean = true,
    page,
    limit,
    sort,
    indexHint,
  } = options;

  let query = Model.find(filters);

  if (projection) {
    addProjection(query, projection);
  }

  if (lean) {
    addLean(query);
  }

  if (page) {
    addPagination(query, page, limit);
  } else if (limit) {
    addLimit(query, limit);
  }

  if (sort) {
    addSort(query, sort.field, sort.order);
  }

  if (indexHint) {
    addIndexHint(query, indexHint);
  }

  return query;
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  QUERY_CONFIG,
  addProjection,
  addLean,
  addLimit,
  addPagination,
  addSort,
  addIndexHint,
  optimizeQuery,
  withQueryTiming,
  getQueryMetrics,
  resetQueryMetrics,
  updateQueryMetricsGauge,
  optimizeCarListingQuery,
  optimizeCarDetailQuery,
  optimizeUserProfileQuery,
  optimizeAuctionQuery,
  optimizeSearchQuery,
  buildOptimizedQuery,
};
