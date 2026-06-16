// backend/controllers/auditController.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Admin audit viewer controller for escrow compliance and general audit trail
// Provides audit trail viewing and export functionality
// ─────────────────────────────────────────────────────────────

import EscrowAudit from "../models/EscrowAudit.js";
import Escrow from "../models/Escrow.js";
import AuditLog from "../models/AuditLog.js";
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

// =============================
// 📋 GET ALL GENERAL AUDIT LOGS (ADMIN)
// =============================
export const getAllAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      actorId, 
      targetModel, 
      targetId,
      severity,
      startDate, 
      endDate,
      sessionId 
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (actorId) query.actor = actorId;
    if (targetModel) query.targetModel = targetModel;
    if (targetId) query.target = targetId;
    if (severity) query.severity = severity;
    if (sessionId) query.sessionId = sessionId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actor", "name email role")
        .populate("target")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all audit logs error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
};

// =============================
// 🔍 GET AUDIT LOG BY ID (ADMIN)
// =============================
export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id)
      .populate("actor", "name email role")
      .populate("target")
      .lean();

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (err) {
    logError("Get audit log by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
    });
  }
};

// =============================
// 🎯 GET AUDIT LOGS BY ACTION (ADMIN)
// =============================
export const getAuditLogsByAction = async (req, res) => {
  try {
    const { action } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const query = { action };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actor", "name email role")
        .populate("target")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      action,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get audit logs by action error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs by action",
    });
  }
};

// =============================
// 👤 GET AUDIT LOGS BY ACTOR (ADMIN)
// =============================
export const getAuditLogsByActor = async (req, res) => {
  try {
    const { actorId } = req.params;
    const { page = 1, limit = 50, action } = req.query;

    const query = { actor: actorId };
    if (action) query.action = action;

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actor", "name email role")
        .populate("target")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      actorId,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get audit logs by actor error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs by actor",
    });
  }
};

// =============================
// 🎯 GET AUDIT LOGS BY TARGET (ADMIN)
// =============================
export const getAuditLogsByTarget = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const query = { target: targetId, targetModel };
    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actor", "name email role")
        .populate("target")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      targetId,
      targetModel,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get audit logs by target error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs by target",
    });
  }
};

// =============================
// 📊 GET AUDIT LOG STATISTICS (ADMIN)
// =============================
export const getAuditLogStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [
      totalLogs,
      actionCounts,
      actorCounts,
      severityCounts,
      targetModelCounts,
    ] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$actor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$targetModel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      statistics: {
        totalLogs,
        period: `${days} days`,
        actionCounts,
        topActors: actorCounts,
        severityCounts,
        targetModelCounts,
      },
    });
  } catch (err) {
    logError("Get audit log statistics error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log statistics",
    });
  }
};

// =============================
// 📤 EXPORT AUDIT LOGS (ADMIN)
// =============================
export const exportAuditLogs = async (req, res) => {
  try {
    const { 
      action, 
      actorId, 
      targetModel, 
      targetId,
      severity,
      startDate, 
      endDate,
      format = "json"
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (actorId) query.actor = actorId;
    if (targetModel) query.targetModel = targetModel;
    if (targetId) query.target = targetId;
    if (severity) query.severity = severity;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .populate("actor", "name email role")
      .populate("target")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    if (format === "csv") {
      const headers = [
        "ID",
        "Timestamp",
        "Action",
        "Actor",
        "Actor Role",
        "Target Model",
        "Target ID",
        "Target Name",
        "Severity",
        "IP Address",
        "Session ID",
      ];

      const rows = auditLogs.map(log => [
        log._id,
        log.createdAt,
        log.action,
        log.actorName,
        log.actorRole,
        log.targetModel,
        log.target,
        log.targetName,
        log.severity,
        log.ipAddress,
        log.sessionId,
      ]);

      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.csv`);
      return res.send(csv);
    }

    // Default JSON format
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.json`);
    res.json({
      success: true,
      exportDate: new Date(),
      totalRecords: auditLogs.length,
      data: auditLogs,
    });

    logInfo("Audit logs exported", { 
      exportedBy: req.user.id, 
      recordCount: auditLogs.length,
      format 
    });
  } catch (err) {
    logError("Export audit logs error", err);
    res.status(500).json({
      success: false,
      message: "Failed to export audit logs",
    });
  }
};
