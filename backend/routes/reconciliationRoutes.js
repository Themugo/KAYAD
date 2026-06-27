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
/**
 * @swagger
 * /api/reconciliation/directional-breakdown:
 *   get:
 *     summary: Get directional breakdown of reconciliation data
 *     description: Retrieves reconciliation data broken down by direction (inbound/outbound)
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Directional breakdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
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
/**
 * @swagger
 * /api/reconciliation/reports/{reportId}/records:
 *   get:
 *     summary: Get records for a reconciliation report
 *     description: Retrieves detailed records for a specific reconciliation report
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reconciliation report ID
 *     responses:
 *       200:
 *         description: Report records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Report not found
 */
router.get("/reports/:reportId/records", asyncHandler(getReconciliationRecords));

// =============================
// ✅ RESOLVE ISSUE
// =============================
router.post("/reports/:reportId/resolve", asyncHandler(resolveReconciliationIssue));

// =============================
// 🚨 ALERTS
// =============================
/**
 * @swagger
 * /api/reconciliation/alerts:
 *   get:
 *     summary: Get reconciliation alerts
 *     description: Retrieves all active reconciliation alerts
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get("/alerts", asyncHandler(getReconciliationAlerts));

/**
 * @swagger
 * /api/reconciliation/alerts/{id}/read:
 *   post:
 *     summary: Mark reconciliation alert as read
 *     description: Marks a specific reconciliation alert as read
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Alert not found
 */
router.post("/alerts/:id/read", asyncHandler(markAlertRead));

/**
 * @swagger
 * /api/reconciliation/alerts/read-all:
 *   post:
 *     summary: Mark all reconciliation alerts as read
 *     description: Marks all active reconciliation alerts as read
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
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
