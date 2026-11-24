// backend/routes/verificationRoutes.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification API routes
// Handles document submission, OTP verification, admin review
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { requireDecisionAuthority } from "../services/onboardingPolicy.service.js"; // STAGE 5
import { submitRequest, listRequests, cancelRequest, decideRequest } from "../services/dealerSuspensionRequest.service.js";

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
  applyVerificationTransition,
  SUSPEND_MESSAGE,
  reinstateDealer,
} from "../controllers/verificationController.js";

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

// ---- Dealer suspension: Admin staff REQUEST, Super Admin DECIDES --------------------------------------------------------------
const reqFail = (res, e) => (e?.status ? res.status(e.status).json({ success: false, code: e.code, message: e.message }) : null);
router.get("/admin/suspension-requests", allowRoles("admin", "superadmin"), asyncHandler(async (req, res) => {
  try { res.json({ success: true, data: await listRequests({ actor: req.user, status: req.query.status, limit: req.query.limit }) }); } catch (e) { if (!reqFail(res, e)) throw e; }
}));
router.post("/admin/suspension-requests/:requestId/decision", allowRoles("superadmin"), asyncHandler(async (req, res) => {
  try {
    const decision = req.body?.decision;
    // Honour the owner decision-authority setting for an APPROVAL exactly as for the other dealer decisions.
    if (decision === "approve") {
      const { getOnboardingPolicy, mayDecide } = await import("../services/onboardingPolicy.service.js");
      if (typeof mayDecide === "function") { const result = await getOnboardingPolicy(); if (!mayDecide(req.user, "dealer", result)) return res.status(403).json({ success: false, code: "DECISION_AUTHORITY_REQUIRED", message: "Dealer decisions are reserved for the platform owner under the current onboarding settings." }); }
    }
    const out = await decideRequest({ requestId: req.params.requestId, actor: req.user, decision, reason: req.body?.reason,
      applySuspension: (verificationId, body) => applyVerificationTransition(verificationId, "suspended", req.user.id, body, SUSPEND_MESSAGE) });
    await logActionFromReq(req, decision === "approve" ? "dealer_suspension_request_approved" : "dealer_suspension_request_rejected", {
      target: out.request.verificationId, targetModel: "DealerVerification", details: { requestId: req.params.requestId, requestedBy: out.request.requestedBy, reason: req.body?.reason || null },
    });
    res.json({ success: true, data: out });
  } catch (e) { if (!reqFail(res, e)) throw e; }
}));
router.post("/admin/suspension-requests/:requestId/cancel", allowRoles("admin", "superadmin"), asyncHandler(async (req, res) => {
  try {
    const out = await cancelRequest({ requestId: req.params.requestId, actor: req.user });
    await logActionFromReq(req, "dealer_suspension_request_cancelled", { target: out.verificationId, targetModel: "DealerVerification", details: { requestId: out.id } });
    res.json({ success: true, data: out });
  } catch (e) { if (!reqFail(res, e)) throw e; }
}));
router.post("/admin/:id/suspend-request", allowRoles("admin"), validateObjectId, asyncHandler(async (req, res) => {
  try {
    const out = await submitRequest({ verificationId: req.params.id, actor: req.user, reasonCategory: req.body?.reasonCategory, reason: req.body?.reason, evidenceReference: req.body?.evidenceReference });
    await logActionFromReq(req, "dealer_suspension_requested", { target: req.params.id, targetModel: "DealerVerification", details: { requestId: out.id, reasonCategory: out.reasonCategory } });
    res.status(201).json({ success: true, data: out });
  } catch (e) { if (!reqFail(res, e)) throw e; }
}));

// GET /api/verification/admin/:id - Get verification by ID (admin only)
router.get("/admin/:id", allowRoles("admin", "superadmin"), validateObjectId, asyncHandler(getVerificationById));

// POST /api/verification/admin/:id/approve - Approve verification (admin only, idempotent)
router.post(
  "/admin/:id/approve",
  allowRoles("admin", "superadmin"),
  requireDecisionAuthority("dealer"), // STAGE 5
  validateObjectId,
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
  requireDecisionAuthority("dealer"), // STAGE 5
  validateObjectId,
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
  validateObjectId,
  (req, res, next) => {
    // Admin staff cannot suspend directly: they submit a request that a Super Admin must approve (POST /admin/:id/suspend-request).
    if (req.user?.role !== "superadmin") {
      return res.status(403).json({ success: false, code: "SUSPENSION_REQUIRES_APPROVAL", message: "Admin staff submit a dealer suspension request; a Super Admin must approve it before it takes effect." });
    }
    // The reason is mandatory for the audit trail on the server, not only in the form.
    if (String(req.body?.suspensionReason || "").trim().length < 10) {
      return res.status(400).json({ success: false, code: "REASON_REQUIRED", message: "A suspension reason of at least 10 characters is required." });
    }
    return next();
  },
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
  allowRoles("superadmin"), // restoring a suspension is a Super Admin decision; Admin staff cannot reverse an approved suspension
  requireDecisionAuthority("dealer"), // STAGE 5
  validateObjectId,
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
