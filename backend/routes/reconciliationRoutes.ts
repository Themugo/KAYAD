// backend/routes/reconciliationRoutes.js - Production Hardened v1.0
// ─────────────────────────────────────────────────────────────
// Enterprise payment reconciliation routes
// Provides API endpoints for reconciliation dashboard and reporting
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import {
  getReconciliationDashboard,
  runReconciliationReport,
  getReconciliationReports,
  getReconciliationReportById,
  resolveReconciliationIssue,
  getFinancialIntegrityScore,
  getNegativeBalances,
  getUnreleasedEscrows,
  exportReconciliationReport,
} from "../controllers/reconciliationController.ts";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);
router.use(allowRoles("admin", "superadmin", "finance"));

// =============================
// 📊 DASHBOARD ENDPOINTS
// =============================

// GET /api/reconciliation/dashboard - Get reconciliation dashboard
router.get("/dashboard", asyncHandler(getReconciliationDashboard));

// GET /api/reconciliation/integrity-score - Get financial integrity score
router.get("/integrity-score", asyncHandler(getFinancialIntegrityScore));

// GET /api/reconciliation/negative-balances - Get negative balances
router.get("/negative-balances", asyncHandler(getNegativeBalances));

// GET /api/reconciliation/unreleased-escrows - Get unreleased escrows
router.get("/unreleased-escrows", asyncHandler(getUnreleasedEscrows));

// =============================
// 🔄 RECONCILIATION ENDPOINTS
// =============================

// POST /api/reconciliation/run - Run reconciliation report
router.post("/run", asyncHandler(runReconciliationReport));

// GET /api/reconciliation/reports - Get reconciliation reports
router.get("/reports", asyncHandler(getReconciliationReports));

// GET /api/reconciliation/reports/:id - Get reconciliation report by ID
router.get("/reports/:id", asyncHandler(getReconciliationReportById));

// POST /api/reconciliation/reports/:reportId/resolve - Resolve reconciliation issue
router.post("/reports/:reportId/resolve", asyncHandler(resolveReconciliationIssue));

// =============================
// 📄 EXPORT ENDPOINTS
// =============================

// GET /api/reconciliation/export/:reportId/:format - Export reconciliation report
router.get("/export/:reportId/:format", asyncHandler(exportReconciliationReport));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Reconciliation route not found",
  });
});

export default router;
