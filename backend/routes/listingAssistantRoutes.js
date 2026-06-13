import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  analyzeListing,
  batchAnalyze,
  getDealerQualityStats,
} from "../controllers/listingAssistantController.js";

const router = express.Router();

// =============================
// 🤖 LISTING ASSISTANT
// =============================

// Analyze listing quality
router.get("/analyze/:carId", protect, asyncHandler(analyzeListing));

// Batch analyze listings (admin only)
router.post("/batch-analyze", protect, adminOnly, asyncHandler(batchAnalyze));

// Get dealer listing quality stats
router.get("/dealer-stats", protect, asyncHandler(getDealerQualityStats));

export default router;
