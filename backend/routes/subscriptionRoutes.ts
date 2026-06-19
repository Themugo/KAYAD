import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import {
  getPlans,
  getSubscription,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  checkUsageLimits,
  getAllSubscriptions,
  getSubscriptionAnalytics,
} from "../controllers/subscriptionController.ts";

const router = express.Router();

// =============================
// 📦 SUBSCRIPTION PLANS
// =============================

// Get available plans
router.get("/plans", asyncHandler(getPlans));

// =============================
// 📋 DEALER SUBSCRIPTION
// =============================

// Get dealer subscription
router.get("/my-subscription", protect, asyncHandler(getSubscription));

// Upgrade subscription
router.post("/upgrade", protect, asyncHandler(upgradeSubscription));

// Cancel subscription
router.post("/cancel", protect, asyncHandler(cancelSubscription));

// Reactivate subscription
router.post("/reactivate", protect, asyncHandler(reactivateSubscription));

// Check usage limits
router.get("/usage-limits", protect, asyncHandler(checkUsageLimits));

// =============================
// 📊 ADMIN SUBSCRIPTION MANAGEMENT
// =============================

// Get all subscriptions (admin only)
router.get("/all", protect, adminOnly, asyncHandler(getAllSubscriptions));

// Get subscription analytics (admin only)
router.get("/analytics", protect, adminOnly, asyncHandler(getSubscriptionAnalytics));

export default router;
