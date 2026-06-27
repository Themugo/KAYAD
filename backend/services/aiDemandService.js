// backend/services/aiDemandService.js
// AI-powered demand forecasting service

import Car from '../models/Car.js';
import DemandSignals from '../models/DemandSignals.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIDemandService {
  constructor() {
    this.weights = {
      seasonality: 0.3,
      trend: 0.25,
      price: 0.2,
      inventory: 0.15,
      external: 0.1,
    };
  }

  /**
   * Forecast demand for a vehicle category
   */
  async forecastDemand(category, forecastMonths = 3) {
    try {
      // Get historical demand data
      const historicalData = await this.getHistoricalDemand(category);
      
      // Calculate seasonality
      const seasonality = this.calculateSeasonality(historicalData);
      
      // Calculate trend
      const trend = this.calculateTrend(historicalData);
      
      // Calculate price sensitivity
      const priceSensitivity = await this.calculatePriceSensitivity(category);
      
      // Calculate inventory impact
      const inventoryImpact = await this.calculateInventoryImpact(category);
      
      // Calculate external factors
      const externalFactors = await this.calculateExternalFactors(category);

      // Generate forecast
      const forecast = this.generateForecast(
        historicalData,
        seasonality,
        trend,
        priceSensitivity,
        inventoryImpact,
        externalFactors,
        forecastMonths
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(forecast, trend);

      return {
        category,
        forecast,
        seasonality,
        trend,
        recommendations,
        forecastMonths,
      };
    } catch (error) {
      logError('Failed to forecast demand', { error: error.message });
      throw error;
    }
  }

  async getHistoricalDemand(category) {
    // This would fetch historical demand data from database
    // For now, generate sample data
    const data = [];
    for (let i = 0; i < 12; i++) {
      data.push({
        month: i,
        demand: Math.floor(Math.random() * 100) + 50,
      });
    }
    return data;
  }

  calculateSeasonality(data) {
    // Calculate seasonal patterns
    const monthlyAverages = {};
    data.forEach(d => {
      const month = d.month % 12;
      monthlyAverages[month] = (monthlyAverages[month] || 0) + d.demand;
    });

    const seasonality = [];
    for (let i = 0; i < 12; i++) {
      const avg = monthlyAverages[i] || data.reduce((sum, d) => sum + d.demand, 0) / data.length;
      seasonality.push(avg);
    }

    return seasonality;
  }

  calculateTrend(data) {
    if (data.length < 2) {
      return 'stable';
    }

    const recent = data.slice(-3).reduce((sum, d) => sum + d.demand, 0) / 3;
    const older = data.slice(0, 3).reduce((sum, d) => sum + d.demand, 0) / 3;

    if (recent > older * 1.1) {
      return 'increasing';
    } else if (recent < older * 0.9) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  async calculatePriceSensitivity(category) {
    // This would analyze price vs demand correlation
    return 0.5; // Placeholder
  }

  async calculateInventoryImpact(category) {
    // This would analyze inventory levels vs demand
    return 0.5; // Placeholder
  }

  async calculateExternalFactors(category) {
    // This would analyze external factors (economic, seasonal events, etc.)
    return 0.5; // Placeholder
  }

  generateForecast(
    historicalData,
    seasonality,
    trend,
    priceSensitivity,
    inventoryImpact,
    externalFactors,
    forecastMonths
  ) {
    const lastDemand = historicalData[historicalData.length - 1].demand;
    const forecast = [];

    for (let i = 0; i < forecastMonths; i++) {
      const monthIndex = (historicalData.length + i) % 12;
      const seasonalFactor = seasonality[monthIndex] / (historicalData.reduce((sum, d) => sum + d.demand, 0) / historicalData.length);
      
      let forecastedDemand = lastDemand * seasonalFactor;

      // Apply trend adjustment
      if (trend === 'increasing') {
        forecastedDemand *= 1.05;
      } else if (trend === 'decreasing') {
        forecastedDemand *= 0.95;
      }

      // Apply other factors
      forecastedDemand *= (1 + (priceSensitivity - 0.5) * 0.1);
      forecastedDemand *= (1 + (inventoryImpact - 0.5) * 0.1);
      forecastedDemand *= (1 + (externalFactors - 0.5) * 0.1);

      forecast.push({
        month: historicalData.length + i,
        demand: Math.round(forecastedDemand),
        confidence: 0.8 - (i * 0.1), // Decreasing confidence over time
      });
    }

    return forecast;
  }

  generateRecommendations(forecast, trend) {
    const recommendations = [];

    const avgForecast = forecast.reduce((sum, f) => sum + f.demand, 0) / forecast.length;

    if (trend === 'increasing') {
      recommendations.push({
        priority: 'high',
        action: 'increase_inventory',
        message: 'Demand is increasing. Consider increasing inventory for this category.',
      });
    } else if (trend === 'decreasing') {
      recommendations.push({
        priority: 'medium',
        action: 'reduce_inventory',
        message: 'Demand is decreasing. Consider reducing inventory for this category.',
      });
    }

    if (avgForecast > 100) {
      recommendations.push({
        priority: 'high',
        action: 'promote_category',
        message: 'High demand expected. Consider promotional activities.',
      });
    } else if (avgForecast < 50) {
      recommendations.push({
        priority: 'low',
        action: 'monitor_category',
        message: 'Low demand expected. Monitor market conditions.',
      });
    }

    return recommendations;
  }

  /**
   * Batch forecast multiple categories
   */
  async batchForecastDemand(categories, forecastMonths = 3) {
    const results = [];
    
    for (const category of categories) {
      try {
        const result = await this.forecastDemand(category, forecastMonths);
        results.push(result);
      } catch (error) {
        logError(`Failed to forecast demand for ${category}`, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Get demand forecasting metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      // This would fetch actual metrics from a database
      return {
        totalForecasts: 100,
        averageAccuracy: 85,
        categoriesForecasted: 20,
        forecastHorizon: 3,
      };
    } catch (error) {
      logError('Failed to get demand forecasting metrics', { error: error.message });
      throw error;
    }
  }

  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1d':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

export default new AIDemandService();
