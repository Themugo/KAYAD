// backend/routes/auditRoutes.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Admin audit viewer routes for escrow compliance and general audit trail
// Provides audit trail viewing and export functionality
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";

import {
  getAllAudits,
  getEscrowAuditTrail,
  getUserAudits,
  getActionAudits,
  getDateRangeAudits,
  exportEscrowAudit,
  getAuditStats,
  getAuditById,
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByAction,
  getAuditLogsByActor,
  getAuditLogsByTarget,
  getAuditLogStatistics,
  exportAuditLogs,
} from "../controllers/auditController.js";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect);
router.use(allowRoles("admin", "superadmin"));

// =============================
// 📋 AUDIT VIEWER ENDPOINTS
// =============================

// GET /api/audit/all - Get all audit records (admin only)
router.get("/all", asyncHandler(getAllAudits));

// GET /api/audit/escrow/:id - Get audit trail for escrow (admin only)
router.get("/escrow/:id", asyncHandler(getEscrowAuditTrail));

// GET /api/audit/user/:userId - Get audits by user (admin only)
router.get("/user/:userId", asyncHandler(getUserAudits));

// GET /api/audit/action/:action - Get audits by action type (admin only)
router.get("/action/:action", asyncHandler(getActionAudits));

// GET /api/audit/date-range - Get audits by date range (admin only)
router.get("/date-range", asyncHandler(getDateRangeAudits));

// GET /api/audit/export/:escrowId - Export audit trail (admin only)
router.get("/export/:escrowId", asyncHandler(async (req, res) => {
  const result = await exportEscrowAudit(req, res);
  await logActionFromReq(req, "audit_export", {
    target: req.params.escrowId,
    targetModel: "Escrow",
    details: { exportedBy: req.user.id },
  });
}));

// GET /api/audit/statistics - Get audit statistics (admin only)
router.get("/statistics", asyncHandler(getAuditStats));

// GET /api/audit/:id - Get single audit record (admin only)
router.get("/:id", asyncHandler(getAuditById));

// =============================
// � GENERAL AUDIT LOG ENDPOINTS
// =============================

// GET /api/audit/logs - Get all general audit logs (admin only)
router.get("/logs", asyncHandler(getAllAuditLogs));

// GET /api/audit/logs/:id - Get single audit log by ID (admin only)
router.get("/logs/:id", asyncHandler(getAuditLogById));

// GET /api/audit/logs/action/:action - Get audit logs by action (admin only)
router.get("/logs/action/:action", asyncHandler(getAuditLogsByAction));

// GET /api/audit/logs/actor/:actorId - Get audit logs by actor (admin only)
router.get("/logs/actor/:actorId", asyncHandler(getAuditLogsByActor));

// GET /api/audit/logs/target/:targetId/:targetModel - Get audit logs by target (admin only)
router.get("/logs/target/:targetId/:targetModel", asyncHandler(getAuditLogsByTarget));

// GET /api/audit/logs/statistics - Get audit log statistics (admin only)
router.get("/logs/statistics", asyncHandler(getAuditLogStatistics));

// GET /api/audit/logs/export - Export audit logs (admin only)
router.get("/logs/export", asyncHandler(async (req, res) => {
  const result = await exportAuditLogs(req, res);
  await logActionFromReq(req, "audit_logs_export", {
    details: { exportedBy: req.user.id },
  });
}));

// =============================
// �🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Audit route not found",
  });
});

export default router;
