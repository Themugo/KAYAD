import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import {
  getExecutiveDashboard,
  getRevenueBreakdown,
  getUserGrowth,
} from "../controllers/executiveAnalyticsController.ts";

const router = express.Router();

// =============================
// 📊 EXECUTIVE ANALYTICS
// =============================

// Get executive dashboard (admin only)
router.get("/dashboard", protect, adminOnly, asyncHandler(getExecutiveDashboard));

// Get revenue breakdown (admin only)
router.get("/revenue", protect, adminOnly, asyncHandler(getRevenueBreakdown));

// Get user growth (admin only)
router.get("/user-growth", protect, adminOnly, asyncHandler(getUserGrowth));

export default router;
