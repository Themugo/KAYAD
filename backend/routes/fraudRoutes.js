import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getFraudAnalytics,
  runFraudCheckOnTarget,
  checkUserFraud,
  checkAuctionFraud,
  checkEscrowFraud,
  checkDealerFraud,
  updateFraudStatus,
  getAllFraudDetections,
} from "../controllers/fraudController.js";

const router = express.Router();

// =============================
// 📊 FRAUD ANALYTICS
// =============================

// Get fraud analytics (admin only)
router.get("/analytics", protect, adminOnly, asyncHandler(getFraudAnalytics));

// Get all fraud detections (admin only)
router.get("/all", protect, adminOnly, asyncHandler(getAllFraudDetections));

// =============================
// 🔍 FRAUD CHECKS
// =============================

// Run comprehensive fraud check on target
router.post("/check", protect, adminOnly, asyncHandler(runFraudCheckOnTarget));

// Check user for fraud
router.get("/check/user/:userId", protect, adminOnly, asyncHandler(checkUserFraud));

// Check auction for fraud
router.get("/check/auction/:carId", protect, adminOnly, asyncHandler(checkAuctionFraud));

// Check escrow for fraud
router.get("/check/escrow/:escrowId", protect, adminOnly, asyncHandler(checkEscrowFraud));

// Check dealer for fraud
router.get("/check/dealer/:dealerId", protect, adminOnly, asyncHandler(checkDealerFraud));

// =============================
// ⚖️ FRAUD MANAGEMENT
// =============================

// Update fraud status and take action (admin only)
router.put("/:fraudId/status", protect, adminOnly, asyncHandler(updateFraudStatus));

export default router;
