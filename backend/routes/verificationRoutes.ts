// backend/routes/verificationRoutes.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification API routes
// Handles document submission, OTP verification, admin review
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { idempotencyCheck } from "../middleware/idempotency.ts";
import { logActionFromReq } from "../utils/securityLogger.ts";

import {
  submitVerification,
  getVerificationStatus,
  requestPhoneVerification,
  verifyOTP,
  getAllVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
  suspendDealer,
  reinstateDealer,
} from "../controllers/verificationController.ts";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);

// =============================
// 📤 DEALER VERIFICATION ENDPOINTS
// =============================

// POST /api/verification/submit - Submit verification documents (idempotent)
router.post(
  "/submit",
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await submitVerification(req, res);
    await logActionFromReq(req, "verification_submit", {
      target: result.verification?._id,
      targetModel: "DealerVerification",
    });
  }),
);

// GET /api/verification/status - Get verification status
router.get("/status", asyncHandler(getVerificationStatus));

// POST /api/verification/phone/request - Request phone verification OTP (idempotent)
router.post(
  "/phone/request",
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await requestPhoneVerification(req, res);
    await logActionFromReq(req, "phone_verification_request", {
      details: { phoneNumber: req.body.phoneNumber },
    });
  }),
);

// POST /api/verification/phone/verify - Verify OTP (idempotent)
router.post(
  "/phone/verify",
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await verifyOTP(req, res);
    if (result.success) {
      await logActionFromReq(req, "phone_verified", {});
    }
  }),
);

// =============================
// 👮 ADMIN VERIFICATION ENDPOINTS
// =============================

// GET /api/verification/admin/all - Get all verifications (admin only)
router.get("/admin/all", allowRoles("admin", "superadmin"), asyncHandler(getAllVerifications));

// GET /api/verification/admin/:id - Get verification by ID (admin only)
router.get("/admin/:id", allowRoles("admin", "superadmin"), asyncHandler(getVerificationById));

// POST /api/verification/admin/:id/approve - Approve verification (admin only, idempotent)
router.post(
  "/admin/:id/approve",
  allowRoles("admin", "superadmin"),
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await approveVerification(req, res);
    await logActionFromReq(req, "verification_approve", {
      target: req.params.id,
      targetModel: "DealerVerification",
      details: { adminNotes: req.body.adminNotes },
    });
  }),
);

// POST /api/verification/admin/:id/reject - Reject verification (admin only, idempotent)
router.post(
  "/admin/:id/reject",
  allowRoles("admin", "superadmin"),
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await rejectVerification(req, res);
    await logActionFromReq(req, "verification_reject", {
      target: req.params.id,
      targetModel: "DealerVerification",
      details: { rejectionReason: req.body.rejectionReason },
    });
  }),
);

// POST /api/verification/admin/:id/suspend - Suspend dealer (admin only, idempotent)
router.post(
  "/admin/:id/suspend",
  allowRoles("admin", "superadmin"),
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await suspendDealer(req, res);
    await logActionFromReq(req, "dealer_suspend", {
      target: req.params.id,
      targetModel: "DealerVerification",
      details: { suspensionReason: req.body.suspensionReason, suspensionDays: req.body.suspensionDays },
    });
  }),
);

// POST /api/verification/admin/:id/reinstate - Reinstate dealer (admin only, idempotent)
router.post(
  "/admin/:id/reinstate",
  allowRoles("admin", "superadmin"),
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await reinstateDealer(req, res);
    await logActionFromReq(req, "dealer_reinstate", {
      target: req.params.id,
      targetModel: "DealerVerification",
    });
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Verification route not found",
  });
});

export default router;
