import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
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
router.get("/check/user/:userId", protect, adminOnly, validateObjectId, asyncHandler(checkUserFraud));

// Check auction for fraud
router.get("/check/auction/:carId", protect, adminOnly, validateObjectId, asyncHandler(checkAuctionFraud));

// Check escrow for fraud
router.get("/check/escrow/:escrowId", protect, adminOnly, validateObjectId, asyncHandler(checkEscrowFraud));

// Check dealer for fraud
router.get("/check/dealer/:dealerId", protect, adminOnly, validateObjectId, asyncHandler(checkDealerFraud));

// Check for price manipulation
router.get("/check/price-manipulation/:carId", protect, adminOnly, validateObjectId, asyncHandler(checkPriceManipulation));

// Check for account farms
router.get("/check/account-farms/:dealerId", protect, adminOnly, validateObjectId, asyncHandler(checkAccountFarms));

// Check for duplicate photos
router.get("/check/duplicate-photos/:carId", protect, adminOnly, validateObjectId, asyncHandler(checkDuplicatePhotos));

// =============================
// ⚖️ FRAUD MANAGEMENT
// =============================

// Update fraud status and take action (admin only)
router.put("/:fraudId/status", protect, adminOnly, validateObjectId, asyncHandler(updateFraudStatus));

export default router;
