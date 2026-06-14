// backend/routes/auditRoutes.js - Production Hardened v4.0
// ─────────────────────────────────────────────────────────────
// Admin audit viewer routes for escrow compliance
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
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Audit route not found",
  });
});

export default router;
