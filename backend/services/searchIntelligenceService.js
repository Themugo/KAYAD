// backend/services/searchIntelligenceService.js
// Enhanced search intelligence with typo tolerance, synonyms, and relevance tuning

import Car from '../models/Car.js';
import Dealer from '../models/Dealer.js';
import SearchAnalytics from '../models/SearchAnalytics.js';
import { logInfo, logError } from '../utils/logger.js';

export class SearchIntelligenceService {
  constructor() {
    // Synonym mappings for common car terms
    this.synonyms = {
      'suv': ['sport utility vehicle', '4x4', 'jeep'],
      'sedan': ['saloon', 'family car'],
      'hatchback': ['hatch', '5-door'],
      'pickup': ['truck', 'bakkie', 'lorry'],
      'van': ['mpv', 'minivan', 'people carrier'],
      'convertible': ['cabriolet', 'soft top', 'drop top'],
      'coupe': ['2-door', 'sports car'],
      'automatic': ['auto', 'self-shifting'],
      'manual': ['stick shift', 'standard'],
      'petrol': ['gasoline', 'gas'],
      'diesel': ['diesel'],
      'electric': ['ev', 'electric vehicle', 'hybrid'],
      'toyota': ['toyota', 'lexus'],
      'nissan': ['nissan', 'infiniti'],
      'honda': ['honda', 'acura'],
      'mazda': ['mazda'],
      'subaru': ['subaru'],
      'mitsubishi': ['mitsubishi'],
      'mercedes': ['mercedes', 'benz', 'mercedes-benz'],
      'bmw': ['bmw', 'bimmer', 'beamer'],
      'audi': ['audi'],
      'volkswagen': ['vw', 'volkswagen'],
      'ford': ['ford'],
      'chevrolet': ['chevy', 'chevrolet'],
    };

    // Relevance weights
    this.relevanceWeights = {
      titleMatch: 10,
      brandMatch: 8,
      modelMatch: 7,
      locationMatch: 5,
      priceMatch: 4,
      yearMatch: 3,
      dealerRank: 6,
      behaviorScore: 5,
      clickThroughRate: 4,
    };
  }

  /**
   * Fuzzy search with typo tolerance using Levenshtein distance
   */
  fuzzyMatch(query, text, maxDistance = 2) {
    if (!query || !text) return 0;
    
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    
    if (t.includes(q)) return 1; // Exact match
    
    const distance = this.levenshteinDistance(q, t);
    const maxLen = Math.max(q.length, t.length);
    
    return 1 - (distance / maxLen);
  }

  levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Expand query with synonyms
   */
  expandQueryWithSynonyms(query) {
    const terms = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set(terms);
    
    for (const term of terms) {
      if (this.synonyms[term]) {
        this.synonyms[term].forEach(synonym => {
          expandedTerms.add(synonym);
        });
      }
    }
    
    return Array.from(expandedTerms).join(' ');
  }

  /**
   * Calculate relevance score for a car
   */
  calculateRelevanceScore(car, query, filters = {}) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const expandedQuery = this.expandQueryWithSynonyms(query);
    const expandedTerms = expandedQuery.toLowerCase().split(/\s+/);

    // Title match (highest weight)
    if (car.title) {
      const titleLower = car.title.toLowerCase();
      if (titleLower.includes(queryLower)) {
        score += this.relevanceWeights.titleMatch;
      }
      
      // Check expanded terms
      for (const term of expandedTerms) {
        if (titleLower.includes(term)) {
          score += this.relevanceWeights.titleMatch * 0.5;
        }
      }
    }

    // Brand match
    if (car.brand) {
      const brandLower = car.brand.toLowerCase();
      if (brandLower.includes(queryLower) || queryLower.includes(brandLower)) {
        score += this.relevanceWeights.brandMatch;
      }
    }

    // Model match
    if (car.model) {
      const modelLower = car.model.toLowerCase();
      if (modelLower.includes(queryLower) || queryLower.includes(modelLower)) {
        score += this.relevanceWeights.modelMatch;
      }
    }

    // Location match
    if (filters.location && car.location?.city) {
      const cityLower = car.location.city.toLowerCase();
      if (cityLower.includes(filters.location.toLowerCase())) {
        score += this.relevanceWeights.locationMatch;
      }
    }

    // Price match (closer to target price = higher score)
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      const targetPrice = (filters.priceMin + filters.priceMax) / 2;
      const priceDiff = Math.abs(car.price - targetPrice);
      const maxPriceDiff = filters.priceMax - filters.priceMin;
      const priceScore = 1 - (priceDiff / maxPriceDiff);
      score += this.relevanceWeights.priceMatch * priceScore;
    }

    // Year match (closer to target year = higher score)
    if (filters.yearMin !== undefined && filters.yearMax !== undefined) {
      const targetYear = (filters.yearMin + filters.yearMax) / 2;
      const yearDiff = Math.abs(car.year - targetYear);
      const maxYearDiff = filters.yearMax - filters.yearMin;
      const yearScore = 1 - (yearDiff / maxYearDiff);
      score += this.relevanceWeights.yearMatch * yearScore;
    }

    return score;
  }

  /**
   * Calculate dealer ranking score
   */
  async calculateDealerRankScore(dealerId) {
    try {
      const dealer = await Dealer.findById(dealerId);
      if (!dealer) return 0;

      let score = 0;

      // Verification status
      if (dealer.isVerified) score += 3;
      if (dealer.isBankOwned) score += 2;

      // Trust score
      if (dealer.trustScore) {
        score += dealer.trustScore * 0.5;
      }

      // Health score
      if (dealer.healthScore) {
        score += dealer.healthScore * 0.3;
      }

      // Listing quality
      if (dealer.listingQualityScore) {
        score += dealer.listingQualityScore * 0.2;
      }

      return Math.min(score, 10); // Cap at 10
    } catch (error) {
      logError('Failed to calculate dealer rank score', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate behavioral ranking score based on user interactions
   */
  async calculateBehavioralScore(carId, userId = null) {
    try {
      const analytics = await SearchAnalytics.find({
        carId,
        ...(userId && { userId }),
      });

      let score = 0;

      // View count
      const viewCount = analytics.filter(a => a.action === 'view').length;
      score += Math.min(viewCount * 0.1, 2);

      // Click count
      const clickCount = analytics.filter(a => a.action === 'click').length;
      score += Math.min(clickCount * 0.2, 3);

      // Favorite count
      const favoriteCount = analytics.filter(a => a.action === 'favorite').length;
      score += Math.min(favoriteCount * 0.3, 3);

      // Inquiry count
      const inquiryCount = analytics.filter(a => a.action === 'inquiry').length;
      score += Math.min(inquiryCount * 0.5, 2);

      return Math.min(score, 10); // Cap at 10
    } catch (error) {
      logError('Failed to calculate behavioral score', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate click-through rate for a car
   */
  async calculateClickThroughRate(carId) {
    try {
      const analytics = await SearchAnalytics.find({ carId });
      
      const impressions = analytics.filter(a => a.action === 'impression').length;
      const clicks = analytics.filter(a => a.action === 'click').length;
      
      if (impressions === 0) return 0;
      
      return clicks / impressions;
    } catch (error) {
      logError('Failed to calculate CTR', { error: error.message });
      return 0;
    }
  }

  /**
   * Enhanced search with all intelligence features
   */
  async intelligentSearch(query, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      userId = null,
    } = options;

    try {
      // Expand query with synonyms
      const expandedQuery = this.expandQueryWithSynonyms(query);
      
      // Build search query
      const searchQuery = this.buildSearchQuery(expandedQuery, filters);
      
      // Get initial results
      let cars = await Car.find(searchQuery)
        .populate('dealer')
        .limit(limit * 2); // Get more for ranking

      // Calculate scores for each car
      const scoredCars = await Promise.all(cars.map(async (car) => {
        const relevanceScore = this.calculateRelevanceScore(car, query, filters);
        const dealerRankScore = await this.calculateDealerRankScore(car.dealer);
        const behaviorScore = await this.calculateBehavioralScore(car._id, userId);
        const ctr = await this.calculateClickThroughRate(car._id);

        return {
          ...car.toObject(),
          scores: {
            relevance: relevanceScore,
            dealerRank: dealerRankScore,
            behavior: behaviorScore,
            ctr: ctr,
          },
          totalScore: relevanceScore + dealerRankScore + behaviorScore + (ctr * 10),
        };
      }));

      // Sort by selected criteria
      const sortedCars = this.sortResults(scoredCars, sortBy);

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedCars = sortedCars.slice(startIndex, startIndex + limit);

      // Track search analytics
      await this.trackSearch(query, filters, paginatedCars.length, userId);

      return {
        results: paginatedCars,
        total: sortedCars.length,
        page,
        limit,
        queryExpanded: expandedQuery !== query,
      };
    } catch (error) {
      logError('Intelligent search failed', { error: error.message });
      throw error;
    }
  }

  buildSearchQuery(query, filters) {
    const searchQuery = {};
    const terms = query.toLowerCase().split(/\s+/);

    // Text search
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { model: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Apply filters
    if (filters.brand) searchQuery.brand = filters.brand;
    if (filters.model) searchQuery.model = filters.model;
    if (filters.yearMin) searchQuery.year = { $gte: filters.yearMin };
    if (filters.yearMax) {
      searchQuery.year = { ...searchQuery.year, $lte: filters.yearMax };
    }
    if (filters.priceMin) searchQuery.price = { $gte: filters.priceMin };
    if (filters.priceMax) {
      searchQuery.price = { ...searchQuery.price, $lte: filters.priceMax };
    }
    if (filters.fuel) searchQuery.fuel = filters.fuel;
    if (filters.transmission) searchQuery.transmission = filters.transmission;
    if (filters.bodyType) searchQuery.bodyType = filters.bodyType;
    if (filters.location) {
      searchQuery['location.city'] = { $regex: filters.location, $options: 'i' };
    }

    return searchQuery;
  }

  sortResults(cars, sortBy) {
    switch (sortBy) {
      case 'relevance':
        return cars.sort((a, b) => b.totalScore - a.totalScore);
      case 'price_asc':
        return cars.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return cars.sort((a, b) => b.price - a.price);
      case 'year_desc':
        return cars.sort((a, b) => b.year - a.year);
      case 'mileage_asc':
        return cars.sort((a, b) => a.mileage - b.mileage);
      case 'dealer_rank':
        return cars.sort((a, b) => b.scores.dealerRank - a.scores.dealerRank);
      case 'behavior':
        return cars.sort((a, b) => b.scores.behavior - a.scores.behavior);
      case 'ctr':
        return cars.sort((a, b) => b.scores.ctr - a.scores.ctr);
      default:
        return cars.sort((a, b) => b.totalScore - a.totalScore);
    }
  }

  async trackSearch(query, filters, resultCount, userId) {
    try {
      await SearchAnalytics.create({
        query,
        filters,
        resultCount,
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      logError('Failed to track search', { error: error.message });
    }
  }

  /**
   * Recommendation engine feedback loop
   */
  async recordFeedback(carId, userId, action) {
    try {
      await SearchAnalytics.create({
        carId,
        userId,
        action,
        timestamp: new Date(),
      });

      // Update behavioral scores in cache
      // This would trigger a cache invalidation for the car
      logInfo('Recorded search feedback', { carId, userId, action });
    } catch (error) {
      logError('Failed to record feedback', { error: error.message });
    }
  }

  /**
   * Update relevance weights based on feedback
   */
  async updateRelevanceWeights(feedbackData) {
    // This would analyze feedback data and adjust weights
    // For now, it's a placeholder for ML-based optimization
    logInfo('Updating relevance weights based on feedback', feedbackData);
  }

  /**
   * Get search analytics for dashboards
   */
  async getSearchAnalytics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const analytics = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              action: '$action',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]);

      const topQueries = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResults: { $avg: '$resultCount' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      const zeroResultsQueries = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate }, resultCount: 0 } },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      return {
        analytics,
        topQueries,
        zeroResultsQueries,
      };
    } catch (error) {
      logError('Failed to get search analytics', { error: error.message });
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

export default new SearchIntelligenceService();
