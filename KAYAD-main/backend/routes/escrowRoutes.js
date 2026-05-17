// backend/routes/escrowRoutes.js

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import {
  getAllEscrows,
  getUserEscrows,
  getEscrowById,
  releaseEscrow,
  refundEscrow,
} from "../controllers/escrowController.js";

const router = express.Router();

// =============================
// 📄 USER ESCROWS (BUYER / SELLER)
// =============================
router.get(
  "/my",
  protect,
  asyncHandler(getUserEscrows)
);

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
  })
);

// =============================
// 🔍 GET SINGLE ESCROW
// =============================
router.get(
  "/:id",
  protect,
  validateObjectId,
  asyncHandler(getEscrowById)
);

// =============================
// 💰 RELEASE ESCROW (ADMIN)
// =============================
router.post(
  "/:id/release",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    req.body.adminId = req.user.id; // 🔥 audit trail
    return releaseEscrow(req, res);
  })
);

// =============================
// 🔁 REFUND ESCROW (ADMIN)
// =============================
router.post(
  "/:id/refund",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    req.body.adminId = req.user.id; // 🔥 audit trail
    return refundEscrow(req, res);
  })
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