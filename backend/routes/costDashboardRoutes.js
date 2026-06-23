// backend/routes/costDashboardRoutes.js
// Routes for cost dashboard and analytics

import express from 'express';
import {
  getCostDashboard,
  getCostAnomalies,
  getCostForecast,
  getOptimizationRecommendations,
  getCostByCategory,
} from '../controllers/costDashboardController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Cost dashboard (admin only)
router.get('/dashboard', protect, adminOnly, getCostDashboard);

// Cost anomalies (admin only)
router.get('/anomalies', protect, adminOnly, getCostAnomalies);

// Cost forecast (admin only)
router.get('/forecast', protect, adminOnly, getCostForecast);

// Optimization recommendations (admin only)
router.get('/recommendations', protect, adminOnly, getOptimizationRecommendations);

// Cost by category (admin only)
router.get('/category/:category', protect, adminOnly, getCostByCategory);

export default router;
