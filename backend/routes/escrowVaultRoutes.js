import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
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
router.post("/webhook/:id/funded", webhookFundsReceived);

// Protected
router.post("/:id/init", protect, initEscrowVault);
router.get("/my", protect, getUserVaults);
router.get("/car/:id", protect, getVaultForCar);
router.get("/:id", protect, getVaultById);
router.post("/:id/inspection-complete", protect, markInspectionComplete);
router.post("/:id/request-otp", protect, requestReleaseOtp);
router.post("/:id/release", protect, releaseWithOtp);

// Admin
router.get("/admin/all", protect, adminOnly, getAllVaults);
router.post("/:id/admin-confirm-funding", protect, adminOnly, adminConfirmFunding);
router.post("/:id/admin-refund", protect, adminOnly, adminRefund);

export default router;
