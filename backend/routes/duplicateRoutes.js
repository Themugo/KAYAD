// backend/routes/duplicateRoutes.js - Production Hardened v3.0
// ─────────────────────────────────────────────────────────────
// Admin duplicate review routes
// Handles admin review workflow for flagged duplicate listings
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";

import {
  getAllFlaggedDuplicates,
  getDuplicateLogById,
  markAsFalsePositive,
  confirmAsDuplicate,
  setToUnderReview,
  getDuplicateStatistics,
  searchDuplicates,
} from "../controllers/duplicateController.js";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);
router.use(allowRoles("admin", "superadmin"));

// =============================
// 📋 DUPLICATE REVIEW ENDPOINTS
// =============================

// GET /api/duplicates/all - Get all flagged duplicates (admin only)
router.get("/all", asyncHandler(getAllFlaggedDuplicates));

// GET /api/duplicates/:id - Get duplicate log by ID (admin only)
router.get("/:id", asyncHandler(getDuplicateLogById));

// POST /api/duplicates/:id/false-positive - Mark as false positive (admin only)
router.post(
  "/:id/false-positive",
  asyncHandler(async (req, res) => {
    const result = await markAsFalsePositive(req, res);
    await logActionFromReq(req, "duplicate_false_positive", {
      target: req.params.id,
      targetModel: "DuplicateVehicleLog",
      details: { reviewNotes: req.body.reviewNotes },
    });
  }),
);

// POST /api/duplicates/:id/confirm - Confirm as duplicate (admin only)
router.post(
  "/:id/confirm",
  asyncHandler(async (req, res) => {
    const result = await confirmAsDuplicate(req, res);
    await logActionFromReq(req, "duplicate_confirmed", {
      target: req.params.id,
      targetModel: "DuplicateVehicleLog",
      details: { action: req.body.action, reviewNotes: req.body.reviewNotes },
    });
  }),
);

// POST /api/duplicates/:id/under-review - Set to under review (admin only)
router.post(
  "/:id/under-review",
  asyncHandler(async (req, res) => {
    const result = await setToUnderReview(req, res);
    await logActionFromReq(req, "duplicate_under_review", {
      target: req.params.id,
      targetModel: "DuplicateVehicleLog",
      details: { reviewNotes: req.body.reviewNotes },
    });
  }),
);

// GET /api/duplicates/statistics - Get duplicate statistics (admin only)
router.get("/statistics", asyncHandler(getDuplicateStatistics));

// GET /api/duplicates/search - Search duplicates by criteria (admin only)
router.get("/search", asyncHandler(searchDuplicates));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Duplicate route not found",
  });
});

export default router;
