// backend/routes/escrowRoutes.js

import express from "express";
import { protect, adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validateObjectId } from "../middleware/validate.ts";
import { createLimiter } from "../middleware/rateLimiter.ts";
import { idempotencyCheck } from "../middleware/idempotency.ts";

import {
  getAllEscrows,
  getUserEscrows,
  getEscrowById,
  releaseEscrow,
  refundEscrow,
  confirmDelivery,
  requestRelease,
} from "../controllers/escrowController.ts";
import Escrow from "../models/Escrow.ts";
import { getIO } from "../utils/io.ts";

const router = express.Router();

// =============================
// 📄 USER ESCROWS (BUYER / SELLER)
// =============================
router.get("/my", protect, asyncHandler(getUserEscrows));

// =============================
// 🧠 ADMIN: ALL ESCROWS (PAGINATED + FILTER)
// =============================
router.get(
  "/",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    req.query.page = Number(req.query.page) || 1;
    req.query.limit = Number(req.query.limit) || 20;

    return getAllEscrows(req, res);
  }),
);

// =============================
// 🔍 GET SINGLE ESCROW
// =============================
router.get("/:id", protect, validateObjectId, asyncHandler(getEscrowById));

// =============================
// 💰 RELEASE ESCROW (ADMIN) - Idempotent to prevent duplicate releases
// =============================
router.post(
  "/:id/release",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(async (req, res) => {
    req.body.adminId = req.user.id; // 🔥 audit trail
    return releaseEscrow(req, res);
  }),
);

// =============================
// 🔁 REFUND ESCROW (ADMIN) - Idempotent to prevent duplicate refunds
// =============================
router.post(
  "/:id/refund",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(async (req, res) => {
    req.body.adminId = req.user.id; // 🔥 audit trail
    return refundEscrow(req, res);
  }),
);

// =============================
// ⚠️ DISPUTE ESCROW (BUYER/SELLER INITIATED)
// =============================
router.post(
  "/:id/dispute",
  protect,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Dispute reason required" });

    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    const userId = req.user.id;
    const isParty = String(escrow.buyer) === userId || String(escrow.seller) === userId;
    const isStaff = ["admin", "superadmin", "moderator"].includes(req.user.role);
    if (!isParty && !isStaff) return res.status(403).json({ success: false, message: "Not authorized" });

    if (!["held", "pending"].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: "Escrow cannot be disputed in current state" });
    }

    escrow.status = "disputed";
    escrow.disputeReason = reason;
    escrow.history.push({ action: `disputed: ${reason}` });
    await escrow.save();

    if (getIO()) {
      getIO().to(`user_${escrow.buyer}`).emit("escrowDisputed", { escrowId: escrow._id });
      getIO().to(`user_${escrow.seller}`).emit("escrowDisputed", { escrowId: escrow._id });
    }

    res.json({ success: true, message: "Dispute raised", escrow });
  }),
);

// =============================
// ✅ CONFIRM DELIVERY (BUYER) - Idempotent to prevent duplicate confirmations
// =============================
router.post(
  "/:id/confirm-delivery",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(async (req, res) => {
    return confirmDelivery(req, res);
  }),
);

// =============================
// 📦 REQUEST RELEASE (BUYER CONFIRMS DELIVERY) - Idempotent to prevent duplicate requests
// =============================
router.post(
  "/:id/request-release",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(async (req, res) => {
    return requestRelease(req, res);
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Escrow route not found",
  });
});

export default router;
