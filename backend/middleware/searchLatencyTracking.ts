// backend/middleware/searchLatencyTracking.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Latency Tracking middleware
// Tracks search latency with percentile metrics
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 📊 LATENCY TRACKING STORAGE
// =============================

const latencyMetrics = {
  vehicleSearch: [],
  dealerSearch: [],
  auctionSearch: [],
};

const MAX_METRICS = 1000; // Keep last 1000 metrics per search type

// =============================
// 📊 CALCULATE PERCENTILES
// =============================

const calculatePercentile = (arr, percentile) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

// =============================
// 📊 TRACK LATENCY MIDDLEWARE
// =============================

export const trackSearchLatency = (searchType = "general") => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response time
    res.json = function (data) {
      const endTime = Date.now();
      const latency = endTime - startTime;

      // Store latency metric
      if (latencyMetrics[searchType]) {
        latencyMetrics[searchType].push(latency);

        // Keep only last MAX_METRICS
        if (latencyMetrics[searchType].length > MAX_METRICS) {
          latencyMetrics[searchType].shift();
        }
      }

      // Add latency to response (for debugging)
      if (process.env.NODE_ENV === "development") {
        data.searchLatency = latency;
      }

      // Log slow searches (> 1000ms)
      if (latency > 1000) {
        logWarn("Slow search detected", {
          searchType,
          latency,
          path: req.path,
          query: req.query,
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// =============================
// 📊 GET LATENCY METRICS
// =============================

export const getLatencyMetrics = (searchType) => {
  const metrics = latencyMetrics[searchType] || [];

  if (metrics.length === 0) {
    return {
      searchType,
      count: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      min: 0,
      max: 0,
    };
  }

  return {
    searchType,
    count: metrics.length,
    p50: calculatePercentile(metrics, 50),
    p95: calculatePercentile(metrics, 95),
    p99: calculatePercentile(metrics, 99),
    avg: metrics.reduce((sum, val) => sum + val, 0) / metrics.length,
    min: Math.min(...metrics),
    max: Math.max(...metrics),
  };
};

// =============================
// 📊 GET ALL LATENCY METRICS
// =============================

export const getAllLatencyMetrics = () => {
  return {
    vehicleSearch: getLatencyMetrics("vehicleSearch"),
    dealerSearch: getLatencyMetrics("dealerSearch"),
    auctionSearch: getLatencyMetrics("auctionSearch"),
  };
};

// =============================
// 📊 RESET LATENCY METRICS
// =============================

export const resetLatencyMetrics = (searchType) => {
  if (searchType && latencyMetrics[searchType]) {
    latencyMetrics[searchType] = [];
  } else if (!searchType) {
    Object.keys(latencyMetrics).forEach((key) => {
      latencyMetrics[key] = [];
    });
  }
};

// =============================
// 📊 PRE-CONFIGURED LATENCY TRACKING MIDDLEWARE
// =============================

export const trackVehicleSearchLatency = trackSearchLatency("vehicleSearch");
export const trackDealerSearchLatency = trackSearchLatency("dealerSearch");
export const trackAuctionSearchLatency = trackSearchLatency("auctionSearch");

export default {
  trackSearchLatency,
  trackVehicleSearchLatency,
  trackDealerSearchLatency,
  trackAuctionSearchLatency,
  getLatencyMetrics,
  getAllLatencyMetrics,
  resetLatencyMetrics,
};
