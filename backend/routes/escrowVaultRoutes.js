import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate, validateObjectId } from "../middleware/validate.js";
import { otpLimiter, webhookLimiter } from "../middleware/rateLimiter.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { escrowVaultWebhookSchema, releaseOtpSchema } from "../validation/escrow.schema.js";
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

router.post("/:id/init", protect, idempotencyCheck, asyncHandler(initEscrowVault));
router.get("/my", protect, asyncHandler(getUserVaults));
router.get("/car/:id", protect, asyncHandler(getVaultForCar));
router.get("/:id", protect, asyncHandler(getVaultById));
router.post("/:id/inspection-complete", protect, idempotencyCheck, asyncHandler(markInspectionComplete));
router.post("/:id/request-otp", protect, otpLimiter, idempotencyCheck, asyncHandler(requestReleaseOtp));
router.post("/:id/release", protect, idempotencyCheck, validateObjectId, validate(releaseOtpSchema), asyncHandler(releaseWithOtp));

router.get("/admin/all", protect, adminOnly, asyncHandler(getAllVaults));
router.post("/:id/admin-confirm-funding", protect, adminOnly, idempotencyCheck, asyncHandler(adminConfirmFunding));
router.post("/:id/admin-refund", protect, adminOnly, idempotencyCheck, asyncHandler(adminRefund));

export default router;
