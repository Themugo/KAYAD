// backend/services/aiListingQualityService.js
// AI-powered listing quality scoring service

import ListingQuality from '../models/ListingQuality.js';
import Car from '../models/Car.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIListingQualityService {
  constructor() {
    this.weights = {
      images: 0.3,
      description: 0.25,
      price: 0.15,
      details: 0.15,
      condition: 0.1,
      location: 0.05,
    };
  }

  /**
   * Score listing quality
   */
  async scoreListing(carId) {
    try {
      const car = await Car.findById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      let totalScore = 0;
      const scores = {};

      // Score 1: Image quality
      const imageScore = this.scoreImages(car);
      scores.images = imageScore;
      totalScore += imageScore * this.weights.images;

      // Score 2: Description quality
      const descriptionScore = this.scoreDescription(car);
      scores.description = descriptionScore;
      totalScore += descriptionScore * this.weights.description;

      // Score 3: Price competitiveness
      const priceScore = await this.scorePrice(car);
      scores.price = priceScore;
      totalScore += priceScore * this.weights.price;

      // Score 4: Details completeness
      const detailsScore = this.scoreDetails(car);
      scores.details = detailsScore;
      totalScore += detailsScore * this.weights.details;

      // Score 5: Condition accuracy
      const conditionScore = this.scoreCondition(car);
      scores.condition = conditionScore;
      totalScore += conditionScore * this.weights.condition;

      // Score 6: Location accuracy
      const locationScore = this.scoreLocation(car);
      scores.location = locationScore;
      totalScore += locationScore * this.weights.location;

      // Normalize to 0-100
      const finalScore = Math.round(totalScore * 100);

      // Determine quality level
      let qualityLevel = 'poor';
      if (finalScore >= 90) {
        qualityLevel = 'excellent';
      } else if (finalScore >= 75) {
        qualityLevel = 'good';
      } else if (finalScore >= 60) {
        qualityLevel = 'fair';
      }

      // Store listing quality score
      await ListingQuality.create({
        carId,
        score: finalScore,
        qualityLevel,
        scores,
        timestamp: new Date(),
      });

      return {
        carId,
        score: finalScore,
        qualityLevel,
        scores,
        recommendations: this.getRecommendations(scores),
      };
    } catch (error) {
      logError('Failed to score listing quality', { error: error.message });
      throw error;
    }
  }

  scoreImages(car) {
    if (!car.images || car.images.length === 0) {
      return 0;
    }

    let score = 0;
    const imageCount = car.images.length;

    // Image count (max 30 images, 30 points)
    score += Math.min(imageCount * 3, 30);

    // Image variety (exterior, interior, engine, etc.)
    const hasExterior = this.hasImageType(car.images, 'exterior');
    const hasInterior = this.hasImageType(car.images, 'interior');
    const hasEngine = this.hasImageType(car.images, 'engine');
    const hasDetails = this.hasImageType(car.images, 'details');

    if (hasExterior) score += 15;
    if (hasInterior) score += 15;
    if (hasEngine) score += 10;
    if (hasDetails) score += 10;

    // Image quality (resolution, lighting - would need image analysis)
    score += 20; // Placeholder for image quality analysis

    return Math.min(score / 100, 1);
  }

  hasImageType(images, type) {
    // This would check image metadata or tags
    // For now, assume all images are exterior
    return images.length > 0;
  }

  scoreDescription(car) {
    if (!car.description) {
      return 0;
    }

    let score = 0;
    const description = car.description;
    const wordCount = description.split(/\s+/).length;

    // Description length (min 100 words for full score)
    if (wordCount >= 100) {
      score += 40;
    } else if (wordCount >= 50) {
      score += 20;
    } else {
      score += 10;
    }

    // Key information presence
    const keyInfo = [
      'mileage',
      'condition',
      'history',
      'features',
      'maintenance',
    ];

    keyInfo.forEach(info => {
      if (description.toLowerCase().includes(info)) {
        score += 12;
      }
    });

    // Grammar and spelling (would need NLP analysis)
    score += 0; // Placeholder

    return Math.min(score / 100, 1);
  }

  async scorePrice(car) {
    // Compare with similar listings
    const similarCars = await Car.find({
      brand: car.brand,
      model: car.model,
      year: { $gte: car.year - 2, $lte: car.year + 2 },
      status: 'active',
    }).limit(20);

    if (similarCars.length === 0) {
      return 0.5; // Neutral score if no comparison
    }

    const avgPrice = similarCars.reduce((sum, c) => sum + c.price, 0) / similarCars.length;
    const priceDiff = Math.abs(car.price - avgPrice) / avgPrice;

    if (priceDiff < 0.1) {
      return 1; // Within 10% of average
    } else if (priceDiff < 0.2) {
      return 0.8;
    } else if (priceDiff < 0.3) {
      return 0.6;
    } else if (priceDiff < 0.5) {
      return 0.4;
    } else {
      return 0.2; // More than 50% difference
    }
  }

  scoreDetails(car) {
    let score = 0;
    const requiredFields = [
      'brand',
      'model',
      'year',
      'price',
      'mileage',
      'fuel',
      'transmission',
      'bodyType',
    ];

    requiredFields.forEach(field => {
      if (car[field]) {
        score += 12.5;
      }
    });

    // Optional fields
    const optionalFields = [
      'color',
      'engineSize',
      'driveTrain',
      'vin',
    ];

    optionalFields.forEach(field => {
      if (car[field]) {
        score += 4;
      }
    });

    return Math.min(score / 100, 1);
  }

  scoreCondition(car) {
    if (!car.condition) {
      return 0.5;
    }

    const conditionScores = {
      'new': 1,
      'excellent': 0.9,
      'good': 0.75,
      'fair': 0.5,
      'poor': 0.25,
    };

    return conditionScores[car.condition.toLowerCase()] || 0.5;
  }

  scoreLocation(car) {
    if (!car.location || !car.location.coordinates) {
      return 0.5;
    }

    // Check if location is within service area
    // For now, assume all locations are valid
    return 1;
  }

  getRecommendations(scores) {
    const recommendations = [];

    if (scores.images < 0.7) {
      recommendations.push({
        category: 'images',
        priority: 'high',
        recommendation: 'Add more images including exterior, interior, engine, and details',
      });
    }

    if (scores.description < 0.7) {
      recommendations.push({
        category: 'description',
        priority: 'high',
        recommendation: 'Expand description with more details about condition, history, and features',
      });
    }

    if (scores.price < 0.6) {
      recommendations.push({
        category: 'price',
        priority: 'medium',
        recommendation: 'Review pricing compared to similar listings',
      });
    }

    if (scores.details < 0.7) {
      recommendations.push({
        category: 'details',
        priority: 'medium',
        recommendation: 'Complete all vehicle details including VIN, engine size, and drive train',
      });
    }

    return recommendations;
  }

  /**
   * Batch score multiple listings
   */
  async batchScoreListings(carIds) {
    const results = [];
    
    for (const carId of carIds) {
      try {
        const result = await this.scoreListing(carId);
        results.push(result);
      } catch (error) {
        logError(`Failed to score listing ${carId}`, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Get listing quality metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const totalScores = await ListingQuality.countDocuments({
        timestamp: { $gte: startDate },
      });

      const excellent = await ListingQuality.countDocuments({
        timestamp: { $gte: startDate },
        qualityLevel: 'excellent',
      });

      const good = await ListingQuality.countDocuments({
        timestamp: { $gte: startDate },
        qualityLevel: 'good',
      });

      const fair = await ListingQuality.countDocuments({
        timestamp: { $gte: startDate },
        qualityLevel: 'fair',
      });

      const poor = await ListingQuality.countDocuments({
        timestamp: { $gte: startDate },
        qualityLevel: 'poor',
      });

      const averageScore = await ListingQuality.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } },
      ]);

      return {
        totalScores,
        excellent,
        good,
        fair,
        poor,
        averageScore: averageScore[0]?.avgScore || 0,
        excellentRate: totalScores > 0 ? (excellent / totalScores) * 100 : 0,
      };
    } catch (error) {
      logError('Failed to get listing quality metrics', { error: error.message });
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

export default new AIListingQualityService();
