import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import {
  getFraudAnalytics,
  runFraudCheckOnTarget,
  checkUserFraud,
  checkAuctionFraud,
  checkEscrowFraud,
  checkDealerFraud,
  checkPriceManipulation,
  checkAccountFarms,
  checkDuplicatePhotos,
  updateFraudStatus,
  getAllFraudDetections,
} from "../controllers/fraudController.ts";

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

// Check for price manipulation
router.get("/check/price-manipulation/:carId", protect, adminOnly, asyncHandler(checkPriceManipulation));

// Check for account farms
router.get("/check/account-farms/:dealerId", protect, adminOnly, asyncHandler(checkAccountFarms));

// Check for duplicate photos
router.get("/check/duplicate-photos/:carId", protect, adminOnly, asyncHandler(checkDuplicatePhotos));

// =============================
// ⚖️ FRAUD MANAGEMENT
// =============================

// Update fraud status and take action (admin only)
router.put("/:fraudId/status", protect, adminOnly, asyncHandler(updateFraudStatus));

export default router;
