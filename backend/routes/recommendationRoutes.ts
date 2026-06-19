import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect } from "../middleware/auth.ts";
import { getRecommendations } from "../controllers/recommendationController.ts";

const router = express.Router();

// =============================
// 🎯 RECOMMENDATIONS
// =============================

// Get personalized recommendations
router.get("/", protect, asyncHandler(getRecommendations));

export default router;
