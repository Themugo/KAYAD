import SecurityLog from "../models/SecurityLog.js";
import AuditLog from "../models/AuditLog.js";
import { logError } from '../infrastructure/logging/index.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// public.security_logs is not created by any repository migration. SecurityLog writes already fall back to canonical audit_logs, and the admin
// list reads that same source. These helpers give the account-level "my activity" feed and the admin summary the same canonical fallback so they
// no longer answer HTTP 500 where the list works. Nothing is invented: figures the audit source cannot supply are returned as null (unavailable),
// never as zero, and the response says which source was read.
const isMissingSecurityLogTable = (err) => /42P01|PGRST205|schema cache|does not exist|Could not find the table/i.test(`${err?.code || ""} ${err?.message || ""}`);
const AUDIT_FALLBACK_SCAN = 2000;
const auditRowToLog = (row) => {
  const details = row.details && typeof row.details === "object" ? row.details : {};
  return {
    ...row,
    timestamp: row.createdAt || row.timestamp || null,
    ip: row.ipAddress || row.ip || null,
    targetModel: row.targetModel || row.entityType || null,
    target: row.target || row.entityId || null,
    severity: details.severity || "info",
    userAgent: details.userAgent || null,
  };
};

export const getSecurityLogs = async (req, res) => {
  // Declared outside `try` so the audit_logs fallback in `catch` can read them
  // (block-scoped consts inside `try` are not visible there).
  const { action, severity, actor, targetModel, page = 1, limit = 50 } = req.query;
  try {
    const filter = {};
    // H-9 FIX: Escape user input to prevent ReDoS.
    if (action) filter.action = { $regex: escapeRegex(action), $options: "i" };
    if (severity) filter.severity = severity;
    if (actor) filter.actor = actor;
    if (targetModel) filter.targetModel = targetModel;

    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    const skip = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .populate("actor", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      SecurityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    const detail = `${err?.code || ""} ${err?.message || ""}`;
    if (/42P01|PGRST205|schema cache|does not exist|Could not find the table/i.test(detail)) {
      // SecurityLog writes intentionally fall back to canonical audit_logs when
      // public.security_logs is absent. Read that same canonical source here.
      try {
        const auditFilter = {};
        if (action) auditFilter.action = { $regex: escapeRegex(action), $options: "i" };
        if (actor) auditFilter.actor = actor;
        if (targetModel) auditFilter.targetModel = targetModel;
        const candidates = await AuditLog.find(auditFilter).sort({ createdAt: -1 }).limit(2000).lean();
        let rows = candidates.map((row) => {
          const details = row.details && typeof row.details === "object" ? row.details : {};
          return {
            ...row,
            timestamp: row.createdAt || row.timestamp || null,
            ip: row.ipAddress || row.ip || null,
            targetModel: row.targetModel || row.entityType || null,
            target: row.target || row.entityId || null,
            severity: details.severity || "info",
            userAgent: details.userAgent || null,
          };
        });
        if (severity) rows = rows.filter((row) => row.severity === severity);
        const total = rows.length;
        const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
        const start = (safePage - 1) * safeLimit;
        return res.json({
          success: true,
          logs: rows.slice(start, start + safeLimit),
          pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
          source: "audit_logs_fallback",
          truncated: candidates.length === 2000,
        });
      } catch (fallbackError) {
        logError("❌ SECURITY LOG FALLBACK READ ERROR:", fallbackError);
      }
    }
    logError("❌ GET SECURITY LOGS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};

export const getMySecurityLogs = async (req, res) => {
  try {
    const { action, page = 1, limit = 30 } = req.query;
    const filter = { actor: req.user.id };
    // H-9 FIX: Escape user input to prevent ReDoS.
    if (action) filter.action = { $regex: escapeRegex(action), $options: "i" };

    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 30, 1), 200);
    const skip = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .populate("actor", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      SecurityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    if (isMissingSecurityLogTable(err)) {
      try {
        const { action, page = 1, limit = 30 } = req.query;
        const auditFilter = { actor: req.user.id };
        if (action) auditFilter.action = { $regex: escapeRegex(action), $options: "i" };
        const candidates = await AuditLog.find(auditFilter).sort({ createdAt: -1 }).limit(AUDIT_FALLBACK_SCAN).lean();
        const rows = candidates.map(auditRowToLog);
        const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 30, 1), 200);
        const start = (safePage - 1) * safeLimit;
        return res.json({
          success: true,
          logs: rows.slice(start, start + safeLimit),
          pagination: { page: safePage, limit: safeLimit, total: rows.length, pages: Math.ceil(rows.length / safeLimit) },
          source: "audit_logs_fallback",
          truncated: candidates.length === AUDIT_FALLBACK_SCAN,
        });
      } catch (fallbackError) {
        logError("❌ MY SECURITY LOG FALLBACK READ ERROR:", fallbackError);
      }
    }
    logError("❌ GET MY SECURITY LOGS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};

export const getSecurityLogSummary = async (req, res) => {
  try {
    const [total, criticalCount, recentActions] = await Promise.all([
      SecurityLog.countDocuments({}),
      SecurityLog.countDocuments({ severity: "critical" }),
      SecurityLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);
    res.json({ success: true, summary: { total, criticalCount, recentActions } });
  } catch (err) {
    if (isMissingSecurityLogTable(err)) {
      try {
        const [total, candidates] = await Promise.all([
          AuditLog.countDocuments({}),
          AuditLog.find({}).sort({ createdAt: -1 }).limit(AUDIT_FALLBACK_SCAN).lean(),
        ]);
        const counts = new Map();
        for (const row of candidates) counts.set(row.action, (counts.get(row.action) || 0) + 1);
        const recentActions = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([action, count]) => ({ _id: action, count }));
        // criticalCount is null: audit_logs does not carry a queryable severity column, so it cannot be counted truthfully.
        return res.json({ success: true, summary: { total, criticalCount: null, recentActions, source: "audit_logs_fallback", sampled: candidates.length === AUDIT_FALLBACK_SCAN } });
      } catch (fallbackError) {
        logError("❌ SECURITY LOG SUMMARY FALLBACK ERROR:", fallbackError);
      }
    }
    logError("❌ SECURITY LOG SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};
