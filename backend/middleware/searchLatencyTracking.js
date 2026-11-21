// backend/middleware/searchLatencyTracking.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Latency Tracking middleware
// Tracks search latency with percentile metrics
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// LATENCY
// =============================

const latencyMetrics = {
  vehicleSearch: [],
  dealerSearch: [],
  auctionSearch: [],
};

const MAX_METRICS = 1000; // Keep last 1000 metrics per search type

// =============================
// CALCULATE
// =============================

const calculatePercentile = (arr, percentile) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

// =============================
// TRACK
// =============================

export const trackSearchLatency = (searchType = "general") => {
  return (req, res, next) => {
    const startTime = Date.now();

    const recordLatency = () => {
      const latency = Date.now() - startTime;
      if (latencyMetrics[searchType]) {
        latencyMetrics[searchType].push(latency);
        if (latencyMetrics[searchType].length > MAX_METRICS) latencyMetrics[searchType].shift();
      }
      if (latency > 1000) {
        logWarn("Slow search detected", { searchType, latency, path: req.path, query: req.query });
      }
    };
    res.once("finish", recordLatency);
    res.once("close", recordLatency);

    next();
  };
};

// =============================
// GET
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
// GET
// =============================

export const getAllLatencyMetrics = () => {
  return {
    vehicleSearch: getLatencyMetrics("vehicleSearch"),
    dealerSearch: getLatencyMetrics("dealerSearch"),
    auctionSearch: getLatencyMetrics("auctionSearch"),
  };
};

// =============================
// RESET
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
// PRE-CONFIGURED
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
