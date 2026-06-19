// backend/middleware/searchTracking.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Tracking middleware
// Tracks user search behavior for analytics
// ─────────────────────────────────────────────────────────────

import { trackSearch } from "../services/searchInsightsService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🔍 EXTRACT SEARCH FILTERS
// =============================

export const extractSearchFilters = (req) => {
  const query = req.query;
  const body = req.body;

  // Extract filters from query or body
  const filters = {
    brand: query.brand || body.brand,
    model: query.model || body.model,
    year: {
      min: query.yearMin || body.yearMin,
      max: query.yearMax || body.yearMax,
    },
    price: {
      min: query.minPrice || body.minPrice,
      max: query.maxPrice || body.maxPrice,
    },
    location: query.city || body.city,
    county: query.county || body.county,
    bodyType: query.body || body.bodyType,
    fuelType: query.fuel || body.fuel,
    transmission: query.transmission || body.transmission,
    mileage: {
      max: query.mileageMax || body.mileageMax,
    },
    condition: query.condition || body.condition,
  };

  // Clean up undefined values
  Object.keys(filters).forEach((key) => {
    if (typeof filters[key] === "object") {
      Object.keys(filters[key]).forEach((subKey) => {
        if (filters[key][subKey] === undefined || filters[key][subKey] === "") {
          delete filters[key][subKey];
        }
      });
    } else if (filters[key] === undefined || filters[key] === "") {
      delete filters[key];
    }
  });

  return filters;
};

// =============================
// 🔤 NORMALIZE SEARCH TERM
// =============================

export const normalizeSearchTerm = (term) => {
  if (!term) return "";
  return term.toLowerCase().trim();
};

// =============================
// 🔍 TRACK SEARCH MIDDLEWARE
// =============================

export const trackSearchMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (data) {
      // Track search after response is sent
      process.nextTick(async () => {
        try {
          const searchTerm = req.query.keyword || req.body.keyword || "";
          const filters = extractSearchFilters(req);
          const resultCount = data?.data?.length || data?.cars?.length || data?.results?.length || 0;

          const searchData = {
            searchTerm,
            filters,
            userId: req.user?._id,
            userRole: req.user?.role,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("user-agent"),
            searchType: options.searchType || "quick_search",
            category: options.category || "all",
            resultCount,
          };

          await trackSearch(searchData);
        } catch (err) {
          logError("Failed to track search in middleware", err);
          // Don't throw error to avoid breaking response
        }
      });

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// =============================
// 🔍 TRACK CAR SEARCH MIDDLEWARE
// =============================

export const trackCarSearch = trackSearchMiddleware({
  searchType: "quick_search",
  category: "listings",
});

// =============================
// 🔍 TRACK AUCTION SEARCH MIDDLEWARE
// =============================

export const trackAuctionSearch = trackSearchMiddleware({
  searchType: "quick_search",
  category: "auctions",
});

// =============================
// 🔍 TRACK ADVANCED SEARCH MIDDLEWARE
// =============================

export const trackAdvancedSearch = trackSearchMiddleware({
  searchType: "advanced_search",
  category: "all",
});

// =============================
// 🔍 TRACK SAVED SEARCH MIDDLEWARE
// =============================

export const trackSavedSearch = trackSearchMiddleware({
  searchType: "saved_search",
  category: "all",
});

export default {
  extractSearchFilters,
  normalizeSearchTerm,
  trackSearchMiddleware,
  trackCarSearch,
  trackAuctionSearch,
  trackAdvancedSearch,
  trackSavedSearch,
};
