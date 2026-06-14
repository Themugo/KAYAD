// backend/controllers/auditController.js - Production Hardened v4.0
// ─────────────────────────────────────────────────────────────
// Admin audit viewer controller for escrow compliance
// Provides audit trail viewing and export functionality
// ─────────────────────────────────────────────────────────────

import EscrowAudit from "../models/EscrowAudit.js";
import Escrow from "../models/Escrow.js";
import { getAuditTrail, getAuditByUser, getAuditByAction, getAuditByDateRange, exportAuditTrail, getAuditStatistics } from "../services/escrowAuditService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📋 GET ALL AUDIT RECORDS (ADMIN)
// =============================
export const getAllAudits = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate, escrowId } = req.query;

    const query = {};
    if (action) query.action = action;
    if (escrowId) query.escrow = escrowId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [audits, total] = await Promise.all([
      EscrowAudit.find(query)
        .populate("escrow", "amount status")
        .populate("performedBy", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EscrowAudit.countDocuments(query),
    ]);

    res.json({
      success: true,
      audits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all audits error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit records",
    });
  }
};

// =============================
// 🔍 GET AUDIT TRAIL FOR ESCROW (ADMIN)
// =============================
export const getEscrowAuditTrail = async (req, res) => {
  try {
    const { escrowId } = req.params;

    const audits = await getAuditTrail(escrowId);

    res.json({
      success: true,
      escrowId,
      audits,
      totalRecords: audits.length,
    });
  } catch (err) {
    logError("Get escrow audit trail error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit trail",
    });
  }
};

// =============================
// 👤 GET AUDITS BY USER (ADMIN)
// =============================
export const getUserAudits = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, skip = 0, action } = req.query;

    const audits = await getAuditByUser(userId, { limit, skip, action });

    res.json({
      success: true,
      userId,
      audits,
      totalRecords: audits.length,
    });
  } catch (err) {
    logError("Get user audits error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user audits",
    });
  }
};

// =============================
// 🎯 GET AUDITS BY ACTION (ADMIN)
// =============================
export const getActionAudits = async (req, res) => {
  try {
    const { action } = req.params;
    const { limit = 100, skip = 0, startDate, endDate } = req.query;

    const audits = await getAuditByAction(action, { limit, skip, startDate, endDate });

    res.json({
      success: true,
      action,
      audits,
      totalRecords: audits.length,
    });
  } catch (err) {
    logError("Get action audits error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch action audits",
    });
  }
};

// =============================
// 📅 GET AUDITS BY DATE RANGE (ADMIN)
// =============================
export const getDateRangeAudits = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { limit = 100, skip = 0, action, escrowId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const audits = await getAuditByDateRange(startDate, endDate, { limit, skip, action, escrowId });

    res.json({
      success: true,
      startDate,
      endDate,
      audits,
      totalRecords: audits.length,
    });
  } catch (err) {
    logError("Get date range audits error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch date range audits",
    });
  }
};

// =============================
// 📤 EXPORT AUDIT TRAIL (ADMIN)
// =============================
export const exportEscrowAudit = async (req, res) => {
  try {
    const { escrowId } = req.params;

    const exportData = await exportAuditTrail(escrowId);

    if (!exportData) {
      return res.status(404).json({
        success: false,
        message: "Failed to export audit trail",
      });
    }

    logInfo("Audit trail exported", { escrowId, exportedBy: req.user.id });

    res.json({
      success: true,
      exportData,
    });
  } catch (err) {
    logError("Export audit trail error", err);
    res.status(500).json({
      success: false,
      message: "Failed to export audit trail",
    });
  }
};

// =============================
// 📊 GET AUDIT STATISTICS (ADMIN)
// =============================
export const getAuditStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const stats = await getAuditStatistics({ days });

    if (!stats) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch audit statistics",
      });
    }

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (err) {
    logError("Get audit statistics error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit statistics",
    });
  }
};

// =============================
// 🔍 GET SINGLE AUDIT RECORD (ADMIN)
// =============================
export const getAuditById = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await EscrowAudit.findById(id)
      .populate("escrow", "amount status buyer seller")
      .populate("performedBy", "name email role")
      .lean();

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit record not found",
      });
    }

    res.json({
      success: true,
      audit,
    });
  } catch (err) {
    logError("Get audit by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit record",
    });
  }
};
