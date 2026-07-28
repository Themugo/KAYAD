// backend/services/aiDealerHealthService.js
// AI-powered dealer health forecasting service

import DealerHealthScore from '../models/DealerHealthScore.js';
import Dealer from '../models/Dealer.js';
import Car from '../models/Car.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIDealerHealthService {
  constructor() {
    this.weights = {
      listingQuality: 0.25,
      responseTime: 0.2,
      salesVolume: 0.2,
      customerSatisfaction: 0.15,
      trustScore: 0.1,
      activityLevel: 0.1,
    };
  }

  /**
   * Forecast dealer health score
   */
  async forecastDealerHealth(dealerId, forecastMonths = 3) {
    try {
      const dealer = await Dealer.findById(dealerId);
      if (!dealer) {
        throw new Error('Dealer not found');
      }

      // Get historical health scores
      const historicalScores = await DealerHealthScore.find({ dealerId })
        .sort({ timestamp: -1 })
        .limit(12);

      // Calculate current health score
      const currentScore = await this.calculateCurrentHealth(dealer);

      // Forecast future scores using linear regression
      const forecast = this.forecastScores(historicalScores, forecastMonths);

      // Identify trends
      const trend = this.analyzeTrend(historicalScores);

      // Generate recommendations
      const recommendations = this.generateRecommendations(currentScore, trend);

      return {
        dealerId,
        currentScore,
        forecast,
        trend,
        recommendations,
        forecastMonths,
      };
    } catch (error) {
      logError('Failed to forecast dealer health', { error: error.message });
      throw error;
    }
  }

  async calculateCurrentHealth(dealer) {
    let totalScore = 0;
    const scores = {};

    // Score 1: Listing quality
    const listingQuality = await this.scoreListingQuality(dealer._id);
    scores.listingQuality = listingQuality;
    totalScore += listingQuality * this.weights.listingQuality;

    // Score 2: Response time
    const responseTime = await this.scoreResponseTime(dealer._id);
    scores.responseTime = responseTime;
    totalScore += responseTime * this.weights.responseTime;

    // Score 3: Sales volume
    const salesVolume = await this.scoreSalesVolume(dealer._id);
    scores.salesVolume = salesVolume;
    totalScore += salesVolume * this.weights.salesVolume;

    // Score 4: Customer satisfaction
    const customerSatisfaction = await this.scoreCustomerSatisfaction(dealer._id);
    scores.customerSatisfaction = customerSatisfaction;
    totalScore += customerSatisfaction * this.weights.customerSatisfaction;

    // Score 5: Trust score
    const trustScore = await this.scoreTrustScore(dealer._id);
    scores.trustScore = trustScore;
    totalScore += trustScore * this.weights.trustScore;

    // Score 6: Activity level
    const activityLevel = await this.scoreActivityLevel(dealer._id);
    scores.activityLevel = activityLevel;
    totalScore += activityLevel * this.weights.activityLevel;

    // Normalize to 0-100
    const finalScore = Math.round(totalScore * 100);

    // Determine health level
    let healthLevel = 'critical';
    if (finalScore >= 90) {
      healthLevel = 'excellent';
    } else if (finalScore >= 75) {
      healthLevel = 'good';
    } else if (finalScore >= 60) {
      healthLevel = 'fair';
    } else if (finalScore >= 40) {
      healthLevel = 'poor';
    }

    return {
      score: finalScore,
      healthLevel,
      scores,
    };
  }

  async scoreListingQuality(dealerId) {
    const cars = await Car.find({ dealer: dealerId, status: 'active' });
    
    if (cars.length === 0) {
      return 0.5;
    }

    // Calculate average listing quality
    let totalQuality = 0;
    for (const car of cars) {
      const hasImages = car.images && car.images.length > 0;
      const hasDescription = car.description && car.description.length > 50;
      const hasPrice = car.price > 0;
      const hasDetails = car.brand && car.model && car.year;

      let quality = 0;
      if (hasImages) quality += 0.3;
      if (hasDescription) quality += 0.3;
      if (hasPrice) quality += 0.2;
      if (hasDetails) quality += 0.2;

      totalQuality += quality;
    }

    return totalQuality / cars.length;
  }

  async scoreResponseTime(dealerId) {
    // This would check average response time to inquiries
    // For now, return a placeholder
    return 0.7;
  }

  async scoreSalesVolume(dealerId) {
    // This would check sales volume in last 30 days
    // For now, return a placeholder
    return 0.6;
  }

  async scoreCustomerSatisfaction(dealerId) {
    // This would check customer satisfaction scores
    // For now, return a placeholder
    return 0.75;
  }

  async scoreTrustScore(dealerId) {
    const dealer = await Dealer.findById(dealerId);
    
    if (!dealer) {
      return 0.5;
    }

    let score = 0.5;
    if (dealer.isVerified) score += 0.3;
    if (dealer.isBankOwned) score += 0.2;

    return Math.min(score, 1);
  }

  async scoreActivityLevel(dealerId) {
    // This would check recent activity (listings, inquiries, etc.)
    // For now, return a placeholder
    return 0.65;
  }

  forecastScores(historicalScores, forecastMonths) {
    if (historicalScores.length < 2) {
      // Not enough data, return flat forecast
      const currentScore = historicalScores[0]?.overallScore || 50;
      return Array(forecastMonths).fill(currentScore);
    }

    // Simple linear regression
    const scores = historicalScores.map(h => h.overallScore).reverse();
    const n = scores.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += scores[i];
      sumXY += i * scores[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = n; i < n + forecastMonths; i++) {
      const predictedScore = slope * i + intercept;
      forecast.push(Math.max(0, Math.min(100, predictedScore)));
    }

    return forecast;
  }

  analyzeTrend(historicalScores) {
    if (historicalScores.length < 2) {
      return 'stable';
    }

    const recentScores = historicalScores.slice(0, 3).map(h => h.overallScore);
    const olderScores = historicalScores.slice(3, 6).map(h => h.overallScore);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

    const change = recentAvg - olderAvg;

    if (change > 10) {
      return 'improving';
    } else if (change < -10) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  generateRecommendations(currentScore, trend) {
    const recommendations = [];

    if (currentScore.score < 60) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        recommendation: 'Dealer health is below acceptable levels. Immediate action required.',
      });
    }

    if (currentScore.scores.listingQuality < 0.7) {
      recommendations.push({
        priority: 'high',
        category: 'listing_quality',
        recommendation: 'Improve listing quality by adding more images and detailed descriptions.',
      });
    }

    if (currentScore.scores.responseTime < 0.6) {
      recommendations.push({
        priority: 'medium',
        category: 'response_time',
        recommendation: 'Improve response time to customer inquiries.',
      });
    }

    if (currentScore.scores.salesVolume < 0.5) {
      recommendations.push({
        priority: 'medium',
        category: 'sales_volume',
        recommendation: 'Increase sales volume through marketing and competitive pricing.',
      });
    }

    if (trend === 'declining') {
      recommendations.push({
        priority: 'high',
        category: 'trend',
        recommendation: 'Dealer health is declining. Investigate root causes and implement corrective actions.',
      });
    }

    return recommendations;
  }

  /**
   * Batch forecast multiple dealers
   */
  async batchForecastDealers(dealerIds, forecastMonths = 3) {
    const results = [];
    
    for (const dealerId of dealerIds) {
      try {
        const result = await this.forecastDealerHealth(dealerId, forecastMonths);
        results.push(result);
      } catch (error) {
        logError(`Failed to forecast dealer ${dealerId}`, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Get dealer health metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const totalScores = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
      });

      const excellent = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
        healthLevel: 'excellent',
      });

      const good = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
        healthLevel: 'good',
      });

      const fair = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
        healthLevel: 'fair',
      });

      const poor = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
        healthLevel: 'poor',
      });

      const critical = await DealerHealthScore.countDocuments({
        timestamp: { $gte: startDate },
        healthLevel: 'critical',
      });

      const averageScore = await DealerHealthScore.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
      ]);

      return {
        totalScores,
        excellent,
        good,
        fair,
        poor,
        critical,
        averageScore: averageScore[0]?.avgScore || 0,
        healthyRate: totalScores > 0 ? ((excellent + good) / totalScores) * 100 : 0,
      };
    } catch (error) {
      logError('Failed to get dealer health metrics', { error: error.message });
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

export default new AIDealerHealthService();
