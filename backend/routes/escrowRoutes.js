// backend/routes/escrowRoutes.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Strict state machine escrow routes.
// Every state-changing endpoint validates the transition via
// escrowStateMachine before executing. Role permissions are
// checked at both route and state machine level.
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, adminOnly, authorize } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

import {
  getAllEscrows,
  getUserEscrows,
  getEscrowById,
  getEscrowState,
  releaseEscrow,
  refundEscrow,
  confirmVehicleHandler,
  confirmDelivery,
  requestRelease,
  disputeEscrow,
  closeEscrowHandler,
} from "../controllers/escrowController.js";

const router = express.Router();

// =============================
// 📄 GET: USER ESCROWS
// =============================
router.get("/my", protect, asyncHandler(getUserEscrows));

// =============================
// 📄 GET: ALL ESCROWS (ADMIN)
// =============================
router.get("/", protect, adminOnly, asyncHandler(getAllEscrows));

// =============================
// 🔍 GET: SINGLE ESCROW
// =============================
router.get("/:id", protect, validateObjectId, asyncHandler(getEscrowById));

// =============================
// 🔍 GET: STATE MACHINE INFO
// =============================
router.get("/:id/state", protect, validateObjectId, asyncHandler(getEscrowState));

// =============================
// ✅ VEHICLE CONFIRMED (BUYER)
// =============================
router.post(
  "/:id/confirm-vehicle",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(confirmVehicleHandler),
);

// =============================
// 🚚 DELIVERED (SELLER)
// =============================
router.post(
  "/:id/confirm-delivery",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(confirmDelivery),
);

// =============================
// 📋 REQUEST RELEASE (BUYER)
// =============================
router.post(
  "/:id/request-release",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(requestRelease),
);

// =============================
// ⚠️ DISPUTE (BUYER / SELLER / ADMIN)
// =============================
router.post(
  "/:id/dispute",
  protect,
  validateObjectId,
  asyncHandler(disputeEscrow),
);

// =============================
// 💰 RELEASE (ADMIN)
// =============================
router.post(
  "/:id/release",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(releaseEscrow),
);

// =============================
// 🔁 REFUND (ADMIN)
// =============================
router.post(
  "/:id/refund",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(refundEscrow),
);

// =============================
// 🔒 CLOSE (ADMIN)
// =============================
router.post(
  "/:id/close",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(closeEscrowHandler),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({ success: false, message: "Escrow route not found" });
});

export default router;
