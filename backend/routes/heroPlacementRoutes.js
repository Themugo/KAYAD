import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { getPublicHeroCommercial, getActiveHeroPlacements, listMyHeroPlacements, createHeroPlacement, listAdminHeroPlacements, scheduleHeroPlacement } from '../controllers/heroPlacementController.js';

const router = express.Router();
router.get('/public-config', asyncHandler(getPublicHeroCommercial));
router.get('/public-active', asyncHandler(getActiveHeroPlacements));
router.get('/mine', protect, asyncHandler(listMyHeroPlacements));
router.post('/', protect, asyncHandler(createHeroPlacement));
router.get('/admin/all', protect, adminOnly, asyncHandler(listAdminHeroPlacements));
router.put('/admin/:id/schedule', protect, adminOnly, asyncHandler(scheduleHeroPlacement));
export default router;
