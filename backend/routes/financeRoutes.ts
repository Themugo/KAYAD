// backend/routes/financeRoutes.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Admin finance dashboard routes
// Provides reconciliation reporting and management for finance team
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { logActionFromReq } from "../utils/securityLogger.ts";

import {
  getAllReports,
  getReportById,
  getUnresolvedIssues,
  resolveIssue,
  triggerReconciliation,
  getReconciliationStatistics,
  getCronStatus,
  exportReportData,
} from "../controllers/financeController.ts";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);
router.use(allowRoles("admin", "superadmin"));

// =============================
// 📋 FINANCE DASHBOARD ENDPOINTS
// =============================

// GET /api/finance/reports - Get all reconciliation reports (admin only)
router.get("/reports", asyncHandler(getAllReports));

// GET /api/finance/reports/:id - Get specific reconciliation report (admin only)
router.get("/reports/:id", asyncHandler(getReportById));

// GET /api/finance/issues - Get unresolved reconciliation issues (admin only)
router.get("/issues", asyncHandler(getUnresolvedIssues));

// POST /api/finance/reports/:reportId/issues/:issueIndex/resolve - Resolve reconciliation issue (admin only)
router.post(
  "/reports/:reportId/issues/:issueIndex/resolve",
  asyncHandler(async (req, res) => {
    const result = await resolveIssue(req, res);
    await logActionFromReq(req, "finance_issue_resolved", {
      target: req.params.reportId,
      targetModel: "ReconciliationReport",
      details: { issueIndex: req.params.issueIndex, action: req.body.action },
    });
  }),
);

// POST /api/finance/reconcile - Trigger manual reconciliation (admin only)
router.post(
  "/reconcile",
  asyncHandler(async (req, res) => {
    const result = await triggerReconciliation(req, res);
    await logActionFromReq(req, "finance_manual_reconciliation", {
      details: { reportType: req.body.reportType, timeRange: req.body },
    });
  }),
);

// GET /api/finance/statistics - Get reconciliation statistics (admin only)
router.get("/statistics", asyncHandler(getReconciliationStatistics));

// GET /api/finance/cron-status - Get reconciliation cron status (admin only)
router.get("/cron-status", asyncHandler(getCronStatus));

// GET /api/finance/export/:reportId - Export report data (admin only)
router.get("/export/:reportId", asyncHandler(exportReportData));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Finance route not found",
  });
});

export default router;
