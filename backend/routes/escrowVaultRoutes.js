import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  initEscrowVault,
  webhookFundsReceived,
  adminConfirmFunding,
  markInspectionComplete,
  requestReleaseOtp,
  releaseWithOtp,
  adminRefund,
  getUserVaults,
  getVaultById,
  getAllVaults,
  getVaultForCar,
} from "../controllers/escrowVaultController.js";

const router = Router();

// Public — bank webhook simulates RTGS/EFT/Pesalink callback
router.post("/webhook/:id/funded", asyncHandler(webhookFundsReceived));

// Protected
router.post("/:id/init", protect, asyncHandler(initEscrowVault));
router.get("/my", protect, asyncHandler(getUserVaults));
router.get("/car/:id", protect, asyncHandler(getVaultForCar));
router.get("/:id", protect, asyncHandler(getVaultById));
router.post("/:id/inspection-complete", protect, asyncHandler(markInspectionComplete));
router.post("/:id/request-otp", protect, asyncHandler(requestReleaseOtp));
router.post("/:id/release", protect, asyncHandler(releaseWithOtp));

// Admin
router.get("/admin/all", protect, adminOnly, asyncHandler(getAllVaults));
router.post("/:id/admin-confirm-funding", protect, adminOnly, asyncHandler(adminConfirmFunding));
router.post("/:id/admin-refund", protect, adminOnly, asyncHandler(adminRefund));

export default router;
