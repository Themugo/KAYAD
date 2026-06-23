// backend/services/costTrackingService.js
// Cloud cost tracking and observability service

import { logInfo, logError } from '../utils/logger.js';

export class CostTrackingService {
  constructor() {
    // Render pricing (approximate, based on Render pricing tiers)
    this.pricing = {
      api: {
        requestsPerMonth: 1000000,
        costPerMillionRequests: 0.50, // $0.50 per million requests
      },
      storage: {
        costPerGB: 0.10, // $0.10 per GB per month
      },
      database: {
        m10: 57, // MongoDB Atlas M10 cluster per month
        m20: 80,
        m30: 160,
      },
      cache: {
        standard: 15, // Redis standard per month
        premium: 30,
      },
      monitoring: {
        sentry: 26, // Sentry per month
        posthog: 20, // PostHog per month
      },
    };
  }

  /**
   * Track API costs based on request count
   */
  async trackAPICost(requestCount, timeRange = 'monthly') {
    try {
      const costPerRequest = this.pricing.api.costPerMillionRequests / 1000000;
      const totalCost = requestCount * costPerRequest;

      return {
        requestCount,
        costPerRequest,
        totalCost,
        timeRange,
      };
    } catch (error) {
      logError('Failed to track API cost', { error: error.message });
      throw error;
    }
  }

  /**
   * Track storage costs based on usage
   */
  async trackStorageCost(storageGB, timeRange = 'monthly') {
    try {
      const totalCost = storageGB * this.pricing.storage.costPerGB;

      return {
        storageGB,
        costPerGB: this.pricing.storage.costPerGB,
        totalCost,
        timeRange,
      };
    } catch (error) {
      logError('Failed to track storage cost', { error: error.message });
      throw error;
    }
  }

  /**
   * Track database costs based on cluster tier
   */
  async trackDatabaseCost(tier = 'm10', timeRange = 'monthly') {
    try {
      const monthlyCost = this.pricing.database[tier] || this.pricing.database.m10;

      return {
        tier,
        monthlyCost,
        timeRange,
      };
    } catch (error) {
      logError('Failed to track database cost', { error: error.message });
      throw error;
    }
  }

  /**
   * Track cache costs based on tier
   */
  async trackCacheCost(tier = 'standard', timeRange = 'monthly') {
    try {
      const monthlyCost = this.pricing.cache[tier] || this.pricing.cache.standard;

      return {
        tier,
        monthlyCost,
        timeRange,
      };
    } catch (error) {
      logError('Failed to track cache cost', { error: error.message });
      throw error;
    }
  }

  /**
   * Track monitoring costs
   */
  async trackMonitoringCost(timeRange = 'monthly') {
    try {
      const sentryCost = this.pricing.monitoring.sentry;
      const posthogCost = this.pricing.monitoring.posthog;
      const totalCost = sentryCost + posthogCost;

      return {
        sentryCost,
        posthogCost,
        totalCost,
        timeRange,
      };
    } catch (error) {
      logError('Failed to track monitoring cost', { error: error.message });
      throw error;
    }
  }

  /**
   * Get total cost breakdown
   */
  async getTotalCostBreakdown(config = {}) {
    try {
      const {
        requestCount = 1000000,
        storageGB = 100,
        databaseTier = 'm10',
        cacheTier = 'standard',
      } = config;

      const apiCost = await this.trackAPICost(requestCount);
      const storageCost = await this.trackStorageCost(storageGB);
      const databaseCost = await this.trackDatabaseCost(databaseTier);
      const cacheCost = await this.trackCacheCost(cacheTier);
      const monitoringCost = await this.trackMonitoringCost();

      const totalCost =
        apiCost.totalCost +
        storageCost.totalCost +
        databaseCost.monthlyCost +
        cacheCost.monthlyCost +
        monitoringCost.totalCost;

      return {
        api: apiCost,
        storage: storageCost,
        database: databaseCost,
        cache: cacheCost,
        monitoring: monitoringCost,
        totalCost,
        breakdown: {
          api: apiCost.totalCost,
          storage: storageCost.totalCost,
          database: databaseCost.monthlyCost,
          cache: cacheCost.monthlyCost,
          monitoring: monitoringCost.totalCost,
        },
      };
    } catch (error) {
      logError('Failed to get total cost breakdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect cost anomalies
   */
  async detectCostAnomalies(currentCosts, historicalCosts) {
    try {
      const anomalies = [];

      for (const [category, currentCost] of Object.entries(currentCosts)) {
        if (historicalCosts[category]) {
          const historicalCost = historicalCosts[category];
          const percentChange = ((currentCost - historicalCost) / historicalCost) * 100;

          // Flag anomalies if change > 50%
          if (Math.abs(percentChange) > 50) {
            anomalies.push({
              category,
              currentCost,
              historicalCost,
              percentChange,
              severity: Math.abs(percentChange) > 100 ? 'high' : 'medium',
            });
          }
        }
      }

      return anomalies;
    } catch (error) {
      logError('Failed to detect cost anomalies', { error: error.message });
      throw error;
    }
  }

  /**
   * Forecast costs using simple linear regression
   */
  async forecastCosts(historicalData, months = 3) {
    try {
      const forecast = {};

      for (const [category, data] of Object.entries(historicalData)) {
        if (data.length < 2) {
          forecast[category] = data[data.length - 1];
          continue;
        }

        // Simple linear regression
        const n = data.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;

        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += data[i];
          sumXY += i * data[i];
          sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const forecastData = [];
        for (let i = n; i < n + months; i++) {
          forecastData.push(slope * i + intercept);
        }

        forecast[category] = {
          current: data[data.length - 1],
          forecast: forecastData,
          trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
        };
      }

      return forecast;
    } catch (error) {
      logError('Failed to forecast costs', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(costBreakdown) {
    try {
      const recommendations = [];

      // API cost optimization
      if (costBreakdown.api.totalCost > 50) {
        recommendations.push({
          category: 'API',
          priority: 'high',
          recommendation: 'Implement API caching to reduce request count',
          potentialSavings: costBreakdown.api.totalCost * 0.3,
        });
      }

      // Storage cost optimization
      if (costBreakdown.storage.totalCost > 20) {
        recommendations.push({
          category: 'Storage',
          priority: 'medium',
          recommendation: 'Implement image compression and CDN for static assets',
          potentialSavings: costBreakdown.storage.totalCost * 0.4,
        });
      }

      // Database cost optimization
      if (costBreakdown.database.monthlyCost > 100) {
        recommendations.push({
          category: 'Database',
          priority: 'high',
          recommendation: 'Review database tier and consider downscaling if underutilized',
          potentialSavings: costBreakdown.database.monthlyCost * 0.2,
        });
      }

      // Cache cost optimization
      if (costBreakdown.cache.monthlyCost > 30) {
        recommendations.push({
          category: 'Cache',
          priority: 'medium',
          recommendation: 'Review cache utilization and consider tier adjustment',
          potentialSavings: costBreakdown.cache.monthlyCost * 0.15,
        });
      }

      // Monitoring cost optimization
      if (costBreakdown.monitoring.totalCost > 50) {
        recommendations.push({
          category: 'Monitoring',
          priority: 'low',
          recommendation: 'Review monitoring tool usage and consolidate if possible',
          potentialSavings: costBreakdown.monitoring.totalCost * 0.1,
        });
      }

      // Calculate total potential savings
      const totalPotentialSavings = recommendations.reduce(
        (sum, rec) => sum + rec.potentialSavings,
        0
      );

      return {
        recommendations,
        totalPotentialSavings,
        currentMonthlyCost: costBreakdown.totalCost,
        optimizedMonthlyCost: costBreakdown.totalCost - totalPotentialSavings,
      };
    } catch (error) {
      logError('Failed to generate optimization recommendations', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(months = 12) {
    try {
      // This would fetch historical cost data from a database or cost monitoring service
      // For now, we'll generate sample data
      
      const trends = {
        api: [],
        storage: [],
        database: [],
        cache: [],
        monitoring: [],
        total: [],
      };

      for (let i = 0; i < months; i++) {
        const baseCost = 100;
        const variance = Math.random() * 20 - 10;
        
        trends.api.push(baseCost + variance);
        trends.storage.push(20 + variance * 0.5);
        trends.database.push(57 + variance * 0.3);
        trends.cache.push(15 + variance * 0.2);
        trends.monitoring.push(46 + variance * 0.1);
        trends.total.push(
          trends.api[i] +
          trends.storage[i] +
          trends.database[i] +
          trends.cache[i] +
          trends.monitoring[i]
        );
      }

      return trends;
    } catch (error) {
      logError('Failed to get cost trends', { error: error.message });
      throw error;
    }
  }
}

export default new CostTrackingService();
