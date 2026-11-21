import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getActiveBidLogs,
  getUserBidHistory,
  getWinningBidInfo,
  getBidActivityStats,
  getBidLogDetail,
  getAllBidLogs,
  getBidLogStats,
} from "../controllers/bidLogController.js";

const router = express.Router();

// =============================
// USER ROUTES
// =============================

// Get user's bid history
router.get("/my", protect, asyncHandler(getUserBidHistory));

// Get bid log detail
router.get("/:logId", protect, asyncHandler(getBidLogDetail));

// =============================
// PUBLIC ROUTES
// =============================

// Get active bid logs for a car
router.get("/car/:carId", asyncHandler(getActiveBidLogs));

// Get winning bid info
router.get("/car/:carId/winning", asyncHandler(getWinningBidInfo));

// Get bid activity stats
router.get("/car/:carId/stats", asyncHandler(getBidActivityStats));

// =============================
// ADMIN ROUTES
// =============================

// Get all bid logs
router.get("/admin/all", protect, adminOnly, asyncHandler(getAllBidLogs));

// Get bid log statistics
router.get("/admin/stats", protect, adminOnly, asyncHandler(getBidLogStats));

export default router;
