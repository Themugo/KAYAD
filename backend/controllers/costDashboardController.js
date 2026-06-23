// backend/controllers/costDashboardController.js
// Controller for cost dashboards and analytics

import costTrackingService from '../services/costTrackingService.js';
import { logInfo, logError } from '../utils/logger.js';

export const getCostDashboard = async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    
    const costBreakdown = await costTrackingService.getTotalCostBreakdown();
    const trends = await costTrackingService.getCostTrends(12);
    
    res.json({
      success: true,
      data: {
        current: costBreakdown,
        trends,
        timeRange,
      },
    });
  } catch (error) {
    logError('Failed to get cost dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get cost dashboard',
    });
  }
};

export const getCostAnomalies = async (req, res) => {
  try {
    const currentCosts = await costTrackingService.getTotalCostBreakdown();
    const historicalCosts = await costTrackingService.getTotalCostBreakdown({
      requestCount: 900000, // Previous month
    });
    
    const anomalies = await costTrackingService.detectCostAnomalies(
      currentCosts.breakdown,
      historicalCosts.breakdown
    );
    
    res.json({
      success: true,
      data: {
        anomalies,
        currentCosts: currentCosts.breakdown,
        historicalCosts: historicalCosts.breakdown,
      },
    });
  } catch (error) {
    logError('Failed to get cost anomalies', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get cost anomalies',
    });
  }
};

export const getCostForecast = async (req, res) => {
  try {
    const { months = 3 } = req.query;
    const trends = await costTrackingService.getCostTrends(12);
    
    const forecast = await costTrackingService.forecastCosts(trends, parseInt(months));
    
    res.json({
      success: true,
      data: {
        forecast,
        months: parseInt(months),
      },
    });
  } catch (error) {
    logError('Failed to get cost forecast', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get cost forecast',
    });
  }
};

export const getOptimizationRecommendations = async (req, res) => {
  try {
    const costBreakdown = await costTrackingService.getTotalCostBreakdown();
    
    const recommendations = await costTrackingService.generateOptimizationRecommendations(costBreakdown);
    
    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logError('Failed to get optimization recommendations', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization recommendations',
    });
  }
};

export const getCostByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    let cost;
    switch (category) {
      case 'api':
        cost = await costTrackingService.trackAPICost(1000000);
        break;
      case 'storage':
        cost = await costTrackingService.trackStorageCost(100);
        break;
      case 'database':
        cost = await costTrackingService.trackDatabaseCost('m10');
        break;
      case 'cache':
        cost = await costTrackingService.trackCacheCost('standard');
        break;
      case 'monitoring':
        cost = await costTrackingService.trackMonitoringCost();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
        });
    }
    
    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    logError('Failed to get cost by category', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get cost by category',
    });
  }
};
