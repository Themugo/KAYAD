// backend/controllers/searchIntelligenceController.js
// Controller for search intelligence analytics dashboards

import searchIntelligenceService from '../services/searchIntelligenceService.js';
import { logInfo, logError } from '../utils/logger.js';

export const getSearchIntelligenceDashboard = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    const analytics = await searchIntelligenceService.getSearchAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logError('Failed to get search intelligence dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get search intelligence dashboard',
    });
  }
};

export const getIntelligentSearch = async (req, res) => {
  try {
    const { query, filters = {}, options = {} } = req.body;
    const userId = req.user?.id;
    
    const results = await searchIntelligenceService.intelligentSearch(
      query,
      filters,
      { ...options, userId }
    );
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logError('Intelligent search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
};

export const recordSearchFeedback = async (req, res) => {
  try {
    const { carId, action } = req.body;
    const userId = req.user?.id;
    
    await searchIntelligenceService.recordFeedback(carId, userId, action);
    
    res.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    logError('Failed to record search feedback', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback',
    });
  }
};

export const getSearchMetrics = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    const analytics = await searchIntelligenceService.getSearchAnalytics(timeRange);
    
    // Calculate metrics
    const totalSearches = analytics.analytics.reduce((sum, item) => sum + item.count, 0);
    const avgResultsPerSearch = analytics.topQueries.reduce((sum, item) => sum + item.avgResults, 0) / analytics.topQueries.length || 0;
    const zeroResultsRate = analytics.zeroResultsQueries.reduce((sum, item) => sum + item.count, 0) / totalSearches || 0;
    
    const metrics = {
      totalSearches,
      avgResultsPerSearch,
      zeroResultsRate,
      topQueries: analytics.topQueries.slice(0, 10),
      zeroResultsQueries: analytics.zeroResultsQueries.slice(0, 5),
      dailyTrends: analytics.analytics,
    };
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logError('Failed to get search metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get search metrics',
    });
  }
};

export const getRelevanceWeights = async (req, res) => {
  try {
    const weights = searchIntelligenceService.relevanceWeights;
    
    res.json({
      success: true,
      data: weights,
    });
  } catch (error) {
    logError('Failed to get relevance weights', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get relevance weights',
    });
  }
};

export const updateRelevanceWeights = async (req, res) => {
  try {
    const { weights } = req.body;
    
    await searchIntelligenceService.updateRelevanceWeights(weights);
    
    res.json({
      success: true,
      message: 'Relevance weights updated',
    });
  } catch (error) {
    logError('Failed to update relevance weights', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update relevance weights',
    });
  }
};

export const getSynonyms = async (req, res) => {
  try {
    const synonyms = searchIntelligenceService.synonyms;
    
    res.json({
      success: true,
      data: synonyms,
    });
  } catch (error) {
    logError('Failed to get synonyms', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get synonyms',
    });
  }
};

export const addSynonym = async (req, res) => {
  try {
    const { term, synonyms } = req.body;
    
    searchIntelligenceService.synonyms[term.toLowerCase()] = synonyms;
    
    res.json({
      success: true,
      message: 'Synonym added',
    });
  } catch (error) {
    logError('Failed to add synonym', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to add synonym',
    });
  }
};
