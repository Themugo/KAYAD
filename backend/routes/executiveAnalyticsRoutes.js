import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import {
  getExecutiveDashboard,
  getRevenueBreakdown,
  getUserGrowth,
} from "../controllers/executiveAnalyticsController.js";

const router = express.Router();

// =============================
// 📊 EXECUTIVE ANALYTICS
// =============================

// Get executive dashboard (admin only)
router.get("/dashboard", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getExecutiveDashboard));

// Get revenue breakdown (admin only)
router.get("/revenue", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getRevenueBreakdown));

// Get user growth (admin only)
router.get("/user-growth", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getUserGrowth));

export default router;
