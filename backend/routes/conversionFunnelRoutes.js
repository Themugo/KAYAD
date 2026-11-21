import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  trackView,
  trackFavorite,
  trackChat,
  trackOffer,
  trackEscrow,
  trackSale,
  getFunnelAnalytics,
  getDealerFunnelAnalytics,
} from "../controllers/conversionFunnelController.js";

const router = express.Router();

// =============================
// 📊 TRACK FUNNEL EVENTS
// =============================

// Track car view (public endpoint, but we track authenticated users)
router.post("/cars/:carId/view", validateObjectId, asyncHandler(trackView));

// Track favorite (requires auth)
router.post("/cars/:carId/favorite", protect, validateObjectId, asyncHandler(trackFavorite));

// Track chat initiation (requires auth)
router.post("/cars/:carId/chat", protect, validateObjectId, asyncHandler(trackChat));

// Track offer (requires auth)
router.post("/cars/:carId/offer", protect, validateObjectId, asyncHandler(trackOffer));

// Track escrow initiation (requires auth)
router.post("/cars/:carId/escrow", protect, validateObjectId, asyncHandler(trackEscrow));

// Track sale (requires auth)
router.post("/cars/:carId/sale", protect, validateObjectId, asyncHandler(trackSale));

// =============================
// 📊 GET FUNNEL ANALYTICS
// =============================

// Get funnel analytics for a specific car
router.get("/cars/:carId/analytics", protect, validateObjectId, asyncHandler(getFunnelAnalytics));

// Get dealer's overall funnel analytics
router.get("/dealer/analytics", protect, asyncHandler(getDealerFunnelAnalytics));

export default router;
