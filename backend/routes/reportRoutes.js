// backend/routes/reportRoutes.js - Report & Feedback System
// ─────────────────────────────────────────────────────────────
// Report moderation API routes
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { logActionFromReq } from "../utils/securityLogger.js";

import {
  submitReport,
  getMyReports,
  getAllReports,
  getReportById,
  updateReportStatus,
} from "../controllers/reportController.js";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);

// =============================
// 📝 REPORT ENDPOINTS
// =============================

// POST /api/reports/submit - Submit a report (idempotent)
router.post(
  "/submit",
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await submitReport(req, res);
    await logActionFromReq(req, "report_submit", {
      target: result.report?._id,
      targetModel: "Report",
    });
  }),
);

// GET /api/reports/my - Get current user's reports
router.get("/my", asyncHandler(getMyReports));

// =============================
// 👮 ADMIN REPORT ENDPOINTS
// =============================

// GET /api/reports/admin/all - Get all reports (admin/superadmin/moderator)
router.get(
  "/admin/all",
  allowRoles("admin", "superadmin", "moderator"),
  asyncHandler(getAllReports),
);

// GET /api/reports/admin/:id - Get report by ID (admin/superadmin/moderator)
router.get(
  "/admin/:id",
  allowRoles("admin", "superadmin", "moderator"),
  validateObjectId,
  asyncHandler(getReportById),
);

// PATCH /api/reports/admin/:id/status - Update report status (admin/superadmin/moderator, idempotent)
router.patch(
  "/admin/:id/status",
  allowRoles("admin", "superadmin", "moderator"),
  validateObjectId,
  idempotencyCheck,
  asyncHandler(async (req, res) => {
    const result = await updateReportStatus(req, res);
    await logActionFromReq(req, "report_status_update", {
      target: req.params.id,
      targetModel: "Report",
      details: { status: req.body.status, actionTaken: req.body.actionTaken },
    });
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Report route not found",
  });
});

export default router;
