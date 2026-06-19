import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect } from "../middleware/auth.ts";
import {
  trackView,
  trackFavorite,
  trackChat,
  trackOffer,
  trackEscrow,
  trackSale,
  getFunnelAnalytics,
  getDealerFunnelAnalytics,
} from "../controllers/conversionFunnelController.ts";

const router = express.Router();

// =============================
// 📊 TRACK FUNNEL EVENTS
// =============================

// Track car view (public endpoint, but we track authenticated users)
router.post("/cars/:carId/view", asyncHandler(trackView));

// Track favorite (requires auth)
router.post("/cars/:carId/favorite", protect, asyncHandler(trackFavorite));

// Track chat initiation (requires auth)
router.post("/cars/:carId/chat", protect, asyncHandler(trackChat));

// Track offer (requires auth)
router.post("/cars/:carId/offer", protect, asyncHandler(trackOffer));

// Track escrow initiation (requires auth)
router.post("/cars/:carId/escrow", protect, asyncHandler(trackEscrow));

// Track sale (requires auth)
router.post("/cars/:carId/sale", protect, asyncHandler(trackSale));

// =============================
// 📊 GET FUNNEL ANALYTICS
// =============================

// Get funnel analytics for a specific car
router.get("/cars/:carId/analytics", protect, asyncHandler(getFunnelAnalytics));

// Get dealer's overall funnel analytics
router.get("/dealer/analytics", protect, asyncHandler(getDealerFunnelAnalytics));

export default router;
