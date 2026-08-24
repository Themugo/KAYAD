import crypto from "node:crypto";
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

// ── Bank webhook authentication ──────────────────────────────
// The "bank confirms funds" callback moves real money state, so it
// must prove it comes from the bank integration, not the public
// internet. Fail closed: unless ESCROW_VAULT_WEBHOOK_SECRET is
// deliberately configured, the endpoint stays disabled (503) — the
// vault then relies on the admin funding-confirmation path only.
const verifyEscrowVaultWebhook = (req, res, next) => {
  const secret = process.env.ESCROW_VAULT_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "Escrow vault webhook is not enabled (no webhook secret configured)",
    });
  }
  const provided = req.headers["x-escrow-vault-secret"] || "";
  const a = Buffer.from(String(provided));
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: "Invalid webhook credentials" });
  }
  next();
};

router.post(
  "/webhook/:id/funded",
  webhookLimiter,
  verifyEscrowVaultWebhook,
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
