// backend/services/priceAnomalyDetectorService.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Price Anomaly Detection Service
// Detects unusual pricing patterns across the marketplace
// Alerts admins to potential issues: price manipulation, data entry errors, market disruptions
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, update, create } from "../db/index.js";

/**
 * Anomaly thresholds
 */
const THRESHOLDS = {
  // Price deviation from market
  deviationFromMarket: {
    low: 0.4,    // < 40% of market avg
    high: 2.5,   // > 250% of market avg
  },
  // Price change from previous
  priceDrop: 0.3,    // 30% drop in 24h
  priceJump: 0.5,    // 50% increase in 24h
  // Statistical thresholds (standard deviations)
  stdDev: 3,         // > 3 std devs from mean
  // Minimum sample size for reliable detection
  minSampleSize: 5,
  // Suspicious round numbers (may indicate fake prices)
  suspiciousRoundPrices: [1000, 10000, 100000, 1000000],
};

/**
 * @typedef {Object} PriceAnomaly
 * @property {string} carId - Vehicle ID
 * @property {string} type - 'too_low' | 'too_high' | 'sudden_drop' | 'sudden_jump' | 'suspicious_round'
 * @property {string} severity - 'low' | 'medium' | 'high' | 'critical'
 * @property {string} message - Human-readable description
 * @property {Object} data - Anomaly details
 */

/**
 * @typedef {Object} MarketAnalysis
 * @property {string} brand - Vehicle brand
 * @property {string} model - Vehicle model (optional)
 * @property {number} avgPrice - Average market price
 * @property {number} medianPrice - Median market price
 * @property {number} minPrice - Minimum price
 * @property {number} maxPrice - Maximum price
 * @property {number} stdDev - Standard deviation
 * @property {number} sampleSize - Number of vehicles analyzed
 */

/**
 * Analyze market prices for a brand/model
 * @param {string} brand - Vehicle brand
 * @param {string} [model] - Vehicle model (optional)
 * @param {number} [yearRange=3] - Year range for comparison
 * @returns {Promise<MarketAnalysis>} Market analysis data
 */
export const analyzeMarket = async (brand, model = null, yearRange = 3) => {
  try {
    const filters = {
      brand,
      status: 'active',
      price: { $gt: 0 },
    };
    
    if (model) {
      filters.model = model;
    }
    
    const vehicles = await findAll("cars", {
      filters,
      select: "price,year,mileage",
      limit: 100,
    });

    if (vehicles.length < THRESHOLDS.minSampleSize) {
      return {
        brand,
        model,
        avgPrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        stdDev: 0,
        sampleSize: vehicles.length,
        reliable: false,
      };
    }

    const prices = vehicles.map(v => v.price).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avgPrice = sum / prices.length;
    const medianPrice = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];
    
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    
    // Calculate standard deviation
    const squaredDiffs = prices.map(p => Math.pow(p - avgPrice, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return {
      brand,
      model,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      stdDev,
      sampleSize: vehicles.length,
      reliable: vehicles.length >= THRESHOLDS.minSampleSize,
    };
  } catch (err) {
    logError("Market analysis error", err);
    throw err;
  }
};

/**
 * Detect anomalies for a specific vehicle
 * @param {string} carId - Vehicle ID
 * @returns {Promise<PriceAnomaly[]>} List of detected anomalies
 */
export const detectAnomalies = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car || !car.price) {
      return [];
    }

    const anomalies = [];

    // Get market analysis for this vehicle
    const market = await analyzeMarket(car.brand, car.model);
    
    if (!market.reliable) {
      return anomalies;
    }

    // Check for absolute deviation from market
    const deviation = car.price / market.avgPrice;
    
    if (deviation < THRESHOLDS.deviationFromMarket.low) {
      anomalies.push({
        carId,
        type: 'too_low',
        severity: deviation < 0.2 ? 'critical' : 'high',
        message: `Price (KES ${car.price.toLocaleString()}) is ${Math.round((1 - deviation) * 100)}% below market average (KES ${Math.round(market.avgPrice).toLocaleString()})`,
        data: {
          price: car.price,
          marketAvg: market.avgPrice,
          deviation: Math.round((1 - deviation) * 100),
          marketMedian: market.medianPrice,
        },
      });
    }
    
    if (deviation > THRESHOLDS.deviationFromMarket.high) {
      anomalies.push({
        carId,
        type: 'too_high',
        severity: deviation > 5 ? 'critical' : 'high',
        message: `Price (KES ${car.price.toLocaleString()}) is ${Math.round((deviation - 1) * 100)}% above market average (KES ${Math.round(market.avgPrice).toLocaleString()})`,
        data: {
          price: car.price,
          marketAvg: market.avgPrice,
          deviation: Math.round((deviation - 1) * 100),
          marketMedian: market.medianPrice,
        },
      });
    }

    // Check for statistical anomaly (multiple standard deviations)
    const zScore = Math.abs(car.price - market.avgPrice) / market.stdDev;
    if (zScore > THRESHOLDS.stdDev) {
      anomalies.push({
        carId,
        type: 'statistical',
        severity: zScore > 5 ? 'high' : 'medium',
        message: `Price is ${zScore.toFixed(1)} standard deviations from market mean`,
        data: {
          price: car.price,
          marketMean: market.avgPrice,
          stdDev: market.stdDev,
          zScore: Math.round(zScore * 10) / 10,
        },
      });
    }

    // Check for suspicious round prices
    const isSuspiciousRound = THRESHOLDS.suspiciousRoundPrices.some(
      round => car.price % round === 0 && car.price >= round
    );
    
    if (isSuspiciousRound && car.price > 100000) {
      anomalies.push({
        carId,
        type: 'suspicious_round',
        severity: 'medium',
        message: `Price (KES ${car.price.toLocaleString()}) is suspiciously round - may indicate fake listing`,
        data: {
          price: car.price,
        },
      });
    }

    // Check for recent price changes
    const priceHistory = car.priceHistory || [];
    if (priceHistory.length > 0) {
      const lastChange = priceHistory[priceHistory.length - 1];
      const daysSinceChange = (Date.now() - new Date(lastChange.date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceChange <= 1) {
        const changePercent = Math.abs(car.price - lastChange.price) / lastChange.price;
        
        if (car.price < lastChange.price && changePercent >= THRESHOLDS.priceDrop) {
          anomalies.push({
            carId,
            type: 'sudden_drop',
            severity: changePercent >= 0.5 ? 'high' : 'medium',
            message: `Price dropped ${Math.round(changePercent * 100)}% in the last 24 hours`,
            data: {
              currentPrice: car.price,
              previousPrice: lastChange.price,
              changePercent: Math.round(changePercent * 100),
            },
          });
        }
        
        if (car.price > lastChange.price && changePercent >= THRESHOLDS.priceJump) {
          anomalies.push({
            carId,
            type: 'sudden_jump',
            severity: changePercent >= 0.75 ? 'high' : 'medium',
            message: `Price increased ${Math.round(changePercent * 100)}% in the last 24 hours`,
            data: {
              currentPrice: car.price,
              previousPrice: lastChange.price,
              changePercent: Math.round(changePercent * 100),
            },
          });
        }
      }
    }

    logInfo("Anomaly detection completed", {
      carId,
      anomaliesFound: anomalies.length,
      types: anomalies.map(a => a.type)
    });

    return anomalies;
  } catch (err) {
    logError("Anomaly detection error", err, { carId });
    return [];
  }
};

/**
 * Scan all active vehicles for anomalies
 * @param {Object} [options] - Scan options
 * @param {string[]} [options.brands] - Specific brands to scan
 * @param {number} [options.limit=100] - Max vehicles per brand
 * @returns {Promise<PriceAnomaly[]>} All detected anomalies
 */
export const scanMarketplace = async (options = {}) => {
  try {
    const { brands = null, limit = 100 } = options;
    
    // Get all brands or specific brands
    const brandFilters = brands ? { brand: { $in: brands } } : {};
    
    const vehicles = await findAll("cars", {
      filters: {
        status: 'active',
        price: { $gt: 0 },
        ...brandFilters,
      },
      select: "_id brand model price",
      limit,
    });

    const allAnomalies = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(v => detectAnomalies(v.id))
      );
      
      batchResults.forEach((anomalies, idx) => {
        if (anomalies.length > 0) {
          anomalies.forEach(anomaly => {
            anomaly.carId = batch[idx].id;
            anomaly.brand = batch[idx].brand;
            anomaly.model = batch[idx].model;
          });
          allAnomalies.push(...anomalies);
        }
      });
    }

    // Log and store anomalies
    if (allAnomalies.length > 0) {
      await logAnomalies(allAnomalies);
    }

    logInfo("Market scan completed", {
      vehiclesScanned: vehicles.length,
      anomaliesFound: allAnomalies.length,
    });

    return allAnomalies;
  } catch (err) {
    logError("Market scan error", err);
    throw err;
  }
};

/**
 * Log anomalies to database for tracking
 */
const logAnomalies = async (anomalies) => {
  try {
    for (const anomaly of anomalies) {
      await create("price_anomaly_logs", {
        car: anomaly.carId,
        brand: anomaly.brand,
        model: anomaly.model,
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
        data: anomaly.data,
        detectedAt: new Date().toISOString(),
        status: 'detected',
      });
    }
  } catch (err) {
    logWarn("Failed to log anomalies", err);
  }
};

/**
 * Get anomaly summary statistics
 * @returns {Promise<Object>} Summary statistics
 */
export const getAnomalySummary = async () => {
  try {
    // Get counts by severity
    const high = await findAll("price_anomaly_logs", {
      filters: { severity: 'high', status: 'detected' },
      select: "_id",
    });
    
    const critical = await findAll("price_anomaly_logs", {
      filters: { severity: 'critical', status: 'detected' },
      select: "_id",
    });

    // Get recent anomalies (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recent = await findAll("price_anomaly_logs", {
      filters: {
        detectedAt: { $gte: sevenDaysAgo },
        status: 'detected',
      },
      select: "_id type",
    });

    const typeBreakdown = recent.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    return {
      pendingReview: high.length + critical.length,
      criticalCount: critical.length,
      highCount: high.length,
      last7Days: {
        total: recent.length,
        byType: typeBreakdown,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logError("Anomaly summary error", err);
    return {
      pendingReview: 0,
      criticalCount: 0,
      highCount: 0,
      last7Days: { total: 0, byType: {} },
      error: err.message,
    };
  }
};

/**
 * Flag a vehicle's price as reviewed/resolved
 * @param {string} anomalyId - Anomaly log ID
 * @param {string} resolution - 'legitimate' | 'adjusted' | 'removed'
 * @param {string} adminId - Admin who resolved
 */
export const resolveAnomaly = async (anomalyId, resolution, adminId) => {
  try {
    const anomaly = await findById("price_anomaly_logs", anomalyId);
    if (!anomaly) {
      throw new Error("Anomaly not found");
    }

    await update("price_anomaly_logs", anomalyId, {
      status: 'resolved',
      resolution,
      resolvedBy: adminId,
      resolvedAt: new Date().toISOString(),
    });

    logInfo("Anomaly resolved", { anomalyId, resolution, adminId });
    
    return { success: true };
  } catch (err) {
    logError("Anomaly resolution error", err);
    throw err;
  }
};

export default {
  analyzeMarket,
  detectAnomalies,
  scanMarketplace,
  getAnomalySummary,
  resolveAnomaly,
};
