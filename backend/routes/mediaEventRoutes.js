// ============================================================
// KAYAD MEDIA EVENT ENGINE - ROUTES
// ============================================================

import express from 'express';
import * as controller from '../controllers/mediaEventController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Dashboard & Monitoring (accessible by all authenticated users)
router.get('/dashboard', controller.getDashboard);
router.get('/overview', controller.getOverview);
router.get('/channels', controller.getChannels);
router.get('/events', controller.getEvents);
router.get('/replay', controller.getReplay);
router.get('/commentary', controller.getCommentary);
router.get('/audit', controller.getAudit);
router.get('/adapters', controller.getAdapters);
router.get('/failover', controller.getFailover);
router.get('/health', controller.getHealth);
router.get('/metrics', controller.getMetrics);
router.get('/supported-events', controller.getSupportedEvents);

// Auction-specific endpoints
router.get('/auction/:auctionId/replay', controller.getAuctionReplay);
router.get('/auction/:auctionId/commentary', controller.getAuctionCommentary);
router.get('/auction/:auctionId/audit', controller.getAuctionAudit);

// Event publishing (requires organizer or admin role)
router.post('/publish', requireRole(['organizer', 'admin']), controller.publishEvent);

// Commentary (requires announcer or admin role)
router.post('/commentary', requireRole(['announcer', 'organizer', 'admin']), controller.sendCommentary);

// Simulation endpoints (for testing - require admin)
if (process.env.NODE_ENV !== 'production') {
  router.post('/simulation/bid', requireRole(['admin']), controller.simulateBid);
  router.post('/simulation/time-warning', requireRole(['admin']), controller.simulateTimeWarning);
}

export default router;
