import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getBidderStatus,
  createDeposit,
  verifyDeposit,
  getUserDeposits,
  verifyBiometric,
  checkBidAuthorization,
  manageDeposit,
  getAllDeposits,
} from "../controllers/biddingSecurityController.js";

const router = express.Router();

// =============================
// USER ROUTES
// =============================

// Get bidder verification status
router.get("/status", protect, asyncHandler(getBidderStatus));

// Create deposit request
router.post("/deposit", protect, asyncHandler(createDeposit));

// Verify deposit payment
router.post("/deposit/:depositId/verify", protect, asyncHandler(verifyDeposit));

// Get user's deposits
router.get("/deposits", protect, asyncHandler(getUserDeposits));

// Biometric verification
router.post("/biometric/verify", protect, asyncHandler(verifyBiometric));

// Check bid authorization
router.get("/authorize/:carId/:amount", protect, asyncHandler(checkBidAuthorization));

// =============================
// ADMIN ROUTES
// =============================

// Manage deposit (approve/reject)
router.patch("/deposit/:depositId", protect, adminOnly, asyncHandler(manageDeposit));

// Get all deposits
router.get("/admin/deposits", protect, adminOnly, asyncHandler(getAllDeposits));

export default router;
