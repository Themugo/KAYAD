// backend/routes/reconciliationRoutes.js - Production v2.0
// ─────────────────────────────────────────────────────────────
// Enterprise reconciliation API routes.
// Full admin dashboard, per-record drill-down, directional
// breakdowns, alerting, and export endpoints.
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  getReconciliationDashboard,
  runReconciliationReport,
  getReconciliationReports,
  getReconciliationReportById,
  getReconciliationRecords,
  getDirectionalBreakdown,
  resolveReconciliationIssue,
  getFinancialIntegrityScore,
  getNegativeBalances,
  getUnreleasedEscrows,
  getReconciliationAlerts,
  markAlertRead,
  markAllAlertsRead,
  exportReconciliationReport,
} from "../controllers/reconciliationController.js";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);
router.use(allowRoles("admin", "superadmin", "finance", "accounts"));

// =============================
// 📊 DASHBOARD
// =============================
router.get("/dashboard", asyncHandler(getReconciliationDashboard));
router.get("/integrity-score", asyncHandler(getFinancialIntegrityScore));
router.get("/negative-balances", asyncHandler(getNegativeBalances));
router.get("/unreleased-escrows", asyncHandler(getUnreleasedEscrows));

// =============================
// 📊 DIRECTIONAL BREAKDOWN
// =============================
router.get("/directional-breakdown", asyncHandler(getDirectionalBreakdown));

// =============================
// 🔄 RUN
// =============================
router.post("/run", asyncHandler(runReconciliationReport));

// =============================
// 📄 REPORTS
// =============================
router.get("/reports", asyncHandler(getReconciliationReports));
router.get("/reports/:id", validateObjectId, asyncHandler(getReconciliationReportById));

// =============================
// 📄 PER-RECORD DRILL-DOWN
// =============================
router.get("/reports/:reportId/records", asyncHandler(getReconciliationRecords));

// =============================
// ✅ RESOLVE ISSUE
// =============================
router.post("/reports/:reportId/resolve", asyncHandler(resolveReconciliationIssue));

// =============================
// 🚨 ALERTS
// =============================
router.get("/alerts", asyncHandler(getReconciliationAlerts));
router.post("/alerts/:id/read", asyncHandler(markAlertRead));
router.post("/alerts/read-all", asyncHandler(markAllAlertsRead));

// =============================
// 📄 EXPORT
// =============================
router.get("/export/:reportId/:format", asyncHandler(exportReconciliationReport));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({ success: false, message: "Reconciliation route not found" });
});

export default router;
