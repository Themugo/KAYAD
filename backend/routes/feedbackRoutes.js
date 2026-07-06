// backend/routes/feedbackRoutes.js - Feedback System
// ─────────────────────────────────────────────────────────────
// Feedback API routes
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
} from "../controllers/feedbackController.js";

const router = express.Router();

// =============================
// 📝 FEEDBACK ENDPOINTS
// =============================

// POST /api/feedback/submit - Submit feedback (optional auth)
router.post(
  "/submit",
  (req, res, next) => {
    // Attempt to authenticate but don't block if not authenticated
    if (req.headers.authorization) {
      return protect(req, res, () => {
        req.isAuthenticated = true;
        next();
      });
    }
    next();
  },
  asyncHandler(submitFeedback),
);

// =============================
// 👮 ADMIN FEEDBACK ENDPOINTS
// =============================

// GET /api/feedback/admin/all - Get all feedback (admin/superadmin)
router.get(
  "/admin/all",
  protect,
  allowRoles("admin", "superadmin"),
  asyncHandler(getAllFeedback),
);

// PATCH /api/feedback/admin/:id/status - Update feedback status (admin/superadmin)
router.patch(
  "/admin/:id/status",
  protect,
  allowRoles("admin", "superadmin"),
  validateObjectId,
  asyncHandler(updateFeedbackStatus),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Feedback route not found",
  });
});

export default router;
