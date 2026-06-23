import express from "express";
import { z } from "zod";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { validate, validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import {
  track,
  trackSearchEvent,
  trackVehicleViewEvent,
  trackOfferEvent,
  trackBidEvent,
  trackEscrowEvent,
  getAnalytics,
  getUserEvents,
} from "../controllers/eventController.js";

const eventSchema = z.object({
  eventType: z.string().min(1).max(100).optional(),
  carId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const searchEventSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  filters: z.record(z.unknown()).optional(),
  resultsCount: z.number().int().positive().optional(),
});

const vehicleViewSchema = z.object({
  carId: z.string().regex(/^[0-9a-f]{24}$/i),
  source: z.string().optional(),
});

const offerEventSchema = z.object({
  carId: z.string().regex(/^[0-9a-f]{24}$/i),
  offerAmount: z.number().positive().optional(),
});

const bidEventSchema = z.object({
  carId: z.string().regex(/^[0-9a-f]{24}$/i),
  amount: z.number().positive().optional(),
});

const escrowEventSchema = z.object({
  escrowId: z.string().regex(/^[0-9a-f]{24}$/i),
  status: z.string().optional(),
  amount: z.number().positive().optional(),
});

const router = express.Router();

// =============================
// 📊 EVENT TRACKING
// =============================

// Track generic event
router.post("/track", protect, validate(eventSchema), asyncHandler(track));

// Track search event
router.post("/search", protect, validate(searchEventSchema), asyncHandler(trackSearchEvent));

// Track vehicle view event
router.post("/vehicle-view", protect, validate(vehicleViewSchema), asyncHandler(trackVehicleViewEvent));

// Track offer event
router.post("/offer", protect, validate(offerEventSchema), asyncHandler(trackOfferEvent));

// Track bid event
router.post("/bid", protect, validate(bidEventSchema), asyncHandler(trackBidEvent));

// Track escrow event
router.post("/escrow", protect, validate(escrowEventSchema), asyncHandler(trackEscrowEvent));

// =============================
// 📊 EVENT ANALYTICS
// =============================

// Get event analytics (admin only)
router.get("/analytics", protect, validateQuery(analyticsQuerySchema), asyncHandler(getAnalytics));

// Get user events
router.get("/my-events", protect, validateQuery(analyticsQuerySchema), asyncHandler(getUserEvents));

export default router;
