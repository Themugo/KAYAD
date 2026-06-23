// backend/routes/searchIntelligenceRoutes.js
// Routes for search intelligence features

import express from 'express';
import {
  getSearchIntelligenceDashboard,
  getIntelligentSearch,
  recordSearchFeedback,
  getSearchMetrics,
  getRelevanceWeights,
  updateRelevanceWeights,
  getSynonyms,
  addSynonym,
} from '../controllers/searchIntelligenceController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Search intelligence dashboard (admin only)
router.get('/dashboard', protect, adminOnly, getSearchIntelligenceDashboard);

// Intelligent search endpoint
router.post('/search', protect, getIntelligentSearch);

// Record search feedback
router.post('/feedback', protect, recordSearchFeedback);

// Search metrics (admin only)
router.get('/metrics', protect, adminOnly, getSearchMetrics);

// Relevance weights (admin only)
router.get('/weights', protect, adminOnly, getRelevanceWeights);
router.put('/weights', protect, adminOnly, updateRelevanceWeights);

// Synonyms (admin only)
router.get('/synonyms', protect, adminOnly, getSynonyms);
router.post('/synonyms', protect, adminOnly, addSynonym);

export default router;
