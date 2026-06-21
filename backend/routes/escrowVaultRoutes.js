import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate, validateObjectId } from "../middleware/validate.js";
import { otpLimiter, webhookLimiter } from "../middleware/rateLimiter.js";
import { escrowVaultWebhookSchema, releaseOtpSchema } from "../validation/platform.schema.js";
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

router.post(
  "/webhook/:id/funded",
  webhookLimiter,
  validate(escrowVaultWebhookSchema),
  asyncHandler(webhookFundsReceived),
);

router.post("/:id/init", protect, asyncHandler(initEscrowVault));
router.get("/my", protect, asyncHandler(getUserVaults));
router.get("/car/:id", protect, asyncHandler(getVaultForCar));
router.get("/:id", protect, asyncHandler(getVaultById));
router.post("/:id/inspection-complete", protect, asyncHandler(markInspectionComplete));
router.post("/:id/request-otp", protect, otpLimiter, asyncHandler(requestReleaseOtp));
router.post("/:id/release", protect, validateObjectId, validate(releaseOtpSchema), asyncHandler(releaseWithOtp));

router.get("/admin/all", protect, adminOnly, asyncHandler(getAllVaults));
router.post("/:id/admin-confirm-funding", protect, adminOnly, asyncHandler(adminConfirmFunding));
router.post("/:id/admin-refund", protect, adminOnly, asyncHandler(adminRefund));

export default router;
