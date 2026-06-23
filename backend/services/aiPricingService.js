// backend/services/aiPricingService.js
// AI-powered pricing recommendations service

import Car from '../models/Car.js';
import MarketPricing from '../models/MarketPricing.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIPricingService {
  constructor() {
    this.weights = {
      marketAverage: 0.4,
      condition: 0.2,
      mileage: 0.15,
      year: 0.1,
      location: 0.1,
      demand: 0.05,
    };
  }

  /**
   * Generate pricing recommendation for a car
   */
  async recommendPrice(carId) {
    try {
      const car = await Car.findById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      // Get similar cars for market comparison
      const similarCars = await this.getSimilarCars(car);
      
      // Calculate market average
      const marketAverage = this.calculateMarketAverage(similarCars);
      
      // Calculate condition adjustment
      const conditionAdjustment = this.calculateConditionAdjustment(car);
      
      // Calculate mileage adjustment
      const mileageAdjustment = this.calculateMileageAdjustment(car);
      
      // Calculate year adjustment
      const yearAdjustment = this.calculateYearAdjustment(car);
      
      // Calculate location adjustment
      const locationAdjustment = this.calculateLocationAdjustment(car);
      
      // Calculate demand adjustment
      const demandAdjustment = await this.calculateDemandAdjustment(car);

      // Calculate recommended price
      const recommendedPrice = this.calculateRecommendedPrice(
        marketAverage,
        conditionAdjustment,
        mileageAdjustment,
        yearAdjustment,
        locationAdjustment,
        demandAdjustment
      );

      // Calculate price range
      const priceRange = this.calculatePriceRange(recommendedPrice);

      // Generate recommendations
      const recommendations = this.generateRecommendations(car, recommendedPrice, similarCars);

      return {
        carId,
        currentPrice: car.price,
        recommendedPrice,
        priceRange,
        marketAverage,
        adjustments: {
          condition: conditionAdjustment,
          mileage: mileageAdjustment,
          year: yearAdjustment,
          location: locationAdjustment,
          demand: demandAdjustment,
        },
        similarCars: similarCars.slice(0, 5),
        recommendations,
      };
    } catch (error) {
      logError('Failed to recommend price', { error: error.message });
      throw error;
    }
  }

  async getSimilarCars(car) {
    const query = {
      brand: car.brand,
      model: car.model,
      year: { $gte: car.year - 2, $lte: car.year + 2 },
      status: 'active',
      _id: { $ne: car._id },
    };

    const similarCars = await Car.find(query).limit(20);
    return similarCars;
  }

  calculateMarketAverage(similarCars) {
    if (similarCars.length === 0) {
      return 0;
    }

    const total = similarCars.reduce((sum, car) => sum + car.price, 0);
    return total / similarCars.length;
  }

  calculateConditionAdjustment(car) {
    const conditionScores = {
      'new': 1.2,
      'excellent': 1.1,
      'good': 1.0,
      'fair': 0.9,
      'poor': 0.8,
    };

    return conditionScores[car.condition?.toLowerCase()] || 1.0;
  }

  calculateMileageAdjustment(car) {
    if (!car.mileage) {
      return 1.0;
    }

    // Assume average mileage is 15,000 km per year
    const carAge = new Date().getFullYear() - car.year;
    const expectedMileage = carAge * 15000;
    
    if (car.mileage < expectedMileage * 0.5) {
      return 1.1; // Low mileage, price up
    } else if (car.mileage < expectedMileage) {
      return 1.05; // Below average, price slightly up
    } else if (car.mileage < expectedMileage * 1.5) {
      return 1.0; // Average, no adjustment
    } else if (car.mileage < expectedMileage * 2) {
      return 0.95; // Above average, price slightly down
    } else {
      return 0.9; // High mileage, price down
    }
  }

  calculateYearAdjustment(car) {
    const carAge = new Date().getFullYear() - car.year;
    
    if (carAge <= 1) {
      return 1.1; // New car, price up
    } else if (carAge <= 3) {
      return 1.05; // Newer car, price slightly up
    } else if (carAge <= 5) {
      return 1.0; // Average age, no adjustment
    } else if (carAge <= 10) {
      return 0.95; // Older car, price slightly down
    } else {
      return 0.9; // Very old car, price down
    }
  }

  calculateLocationAdjustment(car) {
    // This would check location-based demand
    // For now, return neutral
    return 1.0;
  }

  async calculateDemandAdjustment(car) {
    // This would check demand for this make/model
    // For now, return neutral
    return 1.0;
  }

  calculateRecommendedPrice(
    marketAverage,
    conditionAdjustment,
    mileageAdjustment,
    yearAdjustment,
    locationAdjustment,
    demandAdjustment
  ) {
    if (marketAverage === 0) {
      return 0;
    }

    const adjustedPrice = marketAverage *
      (conditionAdjustment * this.weights.condition +
       mileageAdjustment * this.weights.mileage +
       yearAdjustment * this.weights.year +
       locationAdjustment * this.weights.location +
       demandAdjustment * this.weights.demand +
       this.weights.marketAverage);

    return Math.round(adjustedPrice);
  }

  calculatePriceRange(recommendedPrice) {
    const lowerBound = Math.round(recommendedPrice * 0.9);
    const upperBound = Math.round(recommendedPrice * 1.1);

    return {
      lower: lowerBound,
      upper: upperBound,
    };
  }

  generateRecommendations(car, recommendedPrice, similarCars) {
    const recommendations = [];
    const priceDiff = ((recommendedPrice - car.price) / car.price) * 100;

    if (priceDiff > 10) {
      recommendations.push({
        priority: 'high',
        type: 'increase',
        message: `Consider increasing price by ${Math.round(priceDiff)}% to match market value`,
        suggestedPrice: recommendedPrice,
      });
    } else if (priceDiff < -10) {
      recommendations.push({
        priority: 'high',
        type: 'decrease',
        message: `Consider decreasing price by ${Math.round(Math.abs(priceDiff))}% to match market value`,
        suggestedPrice: recommendedPrice,
      });
    } else {
      recommendations.push({
        priority: 'low',
        type: 'maintain',
        message: 'Current price is within market range',
        suggestedPrice: car.price,
      });
    }

    // Additional recommendations based on car attributes
    if (car.mileage > 100000) {
      recommendations.push({
        priority: 'medium',
        type: 'mileage',
        message: 'High mileage may affect sale price. Consider highlighting maintenance history.',
      });
    }

    if (car.year < 2015) {
      recommendations.push({
        priority: 'medium',
        type: 'age',
        message: 'Older vehicle may require competitive pricing.',
      });
    }

    return recommendations;
  }

  /**
   * Batch recommend prices for multiple cars
   */
  async batchRecommendPrices(carIds) {
    const results = [];
    
    for (const carId of carIds) {
      try {
        const result = await this.recommendPrice(carId);
        results.push(result);
      } catch (error) {
        logError(`Failed to recommend price for car ${carId}`, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Get pricing metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const totalRecommendations = await MarketPricing.countDocuments({
        timestamp: { $gte: startDate },
      });

      const averageAccuracy = await MarketPricing.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: null, avgAccuracy: { $avg: '$accuracy' } } },
      ]);

      return {
        totalRecommendations,
        averageAccuracy: averageAccuracy[0]?.avgAccuracy || 0,
      };
    } catch (error) {
      logError('Failed to get pricing metrics', { error: error.message });
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

export default new AIPricingService();
