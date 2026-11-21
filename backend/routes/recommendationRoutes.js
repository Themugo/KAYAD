import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { getRecommendations } from "../controllers/recommendationController.js";

const router = express.Router();

// =============================
// 🎯 RECOMMENDATIONS
// =============================

// Get personalized recommendations
router.get("/", protect, validateQuery(analyticsQuerySchema), asyncHandler(getRecommendations));

export default router;
