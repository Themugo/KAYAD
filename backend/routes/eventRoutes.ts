import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect } from "../middleware/auth.ts";
import {
  track,
  trackSearchEvent,
  trackVehicleViewEvent,
  trackOfferEvent,
  trackBidEvent,
  trackEscrowEvent,
  getAnalytics,
  getUserEvents,
} from "../controllers/eventController.ts";

const router = express.Router();

// =============================
// 📊 EVENT TRACKING
// =============================

// Track generic event
router.post("/track", protect, asyncHandler(track));

// Track search event
router.post("/search", protect, asyncHandler(trackSearchEvent));

// Track vehicle view event
router.post("/vehicle-view", protect, asyncHandler(trackVehicleViewEvent));

// Track offer event
router.post("/offer", protect, asyncHandler(trackOfferEvent));

// Track bid event
router.post("/bid", protect, asyncHandler(trackBidEvent));

// Track escrow event
router.post("/escrow", protect, asyncHandler(trackEscrowEvent));

// =============================
// 📊 EVENT ANALYTICS
// =============================

// Get event analytics (admin only)
router.get("/analytics", protect, asyncHandler(getAnalytics));

// Get user events
router.get("/my-events", protect, asyncHandler(getUserEvents));

export default router;
