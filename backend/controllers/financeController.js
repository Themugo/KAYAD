// backend/controllers/financeController.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Admin finance dashboard controller
// Provides reconciliation reporting and management for finance team
// ─────────────────────────────────────────────────────────────

import ReconciliationReport from "../models/ReconciliationReport.js";
import { fetchIssueRows, groupRowsByReport, tallyBy } from "../utils/reconciliationIssues.js";
import { triggerManualReconciliation, getReconciliationCronStatus } from "../services/reconciliationCron.js";
import { resolveIssue as resolveReconciliationIssue } from "../services/reconciliationService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📋 GET ALL RECONCILIATION REPORTS (ADMIN)
// =============================
export const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 50, reportType, status, startDate, endDate } = req.query;

    const query = {};
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      ReconciliationReport.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ReconciliationReport.countDocuments(query),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all reports error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation reports",
    });
  }
};

// =============================
// 🔍 GET REPORT BY ID (ADMIN)
// =============================
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await ReconciliationReport.findById(id).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Reconciliation report not found",
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    logError("Get report by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation report",
    });
  }
};

// =============================
// ⚠️ GET UNRESOLVED ISSUES (ADMIN)
// =============================
export const getUnresolvedIssues = async (req, res) => {
  try {
    const { severity, type, limit = 100 } = req.query;

    // Unresolved findings come from the JSONB `issues` column through the shared database function (limit = most recent reports).
    const reportLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const rows = await fetchIssueRows({ state: "unresolved", severity: severity || null, type: type || null, reportLimit });
    const issues = rows.map((row) => ({
      ...row.issue,
      reportId: row.reportId,
      reportType: row.reportType,
      reportCreatedAt: row.reportCreatedAt,
    }));

    res.json({
      success: true,
      issues,
      total: issues.length,
    });
  } catch (err) {
    logError("Get unresolved issues error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unresolved issues",
    });
  }
};

// =============================
// ✅ RESOLVE ISSUE (ADMIN)
// =============================
export const resolveIssue = async (req, res) => {
  try {
    const { reportId, issueIndex } = req.params;
    const { notes, action } = req.body;

    const report = await resolveReconciliationIssue(
      reportId,
      parseInt(issueIndex),
      {
        notes,
        action,
      },
      req.user.id,
    );

    logInfo("Issue resolved by admin", {
      reportId,
      issueIndex,
      resolvedBy: req.user.id,
      action,
    });

    res.json({
      success: true,
      message: "Issue resolved successfully",
      report,
    });
  } catch (err) {
    logError("Resolve issue error", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to resolve issue",
    });
  }
};

// =============================
// 🔄 TRIGGER MANUAL RECONCILIATION (ADMIN)
// =============================
export const triggerReconciliation = async (req, res) => {
  try {
    const { reportType, startTime, endTime } = req.body;

    if (!reportType || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "reportType, startTime, and endTime are required",
      });
    }

    const report = await triggerManualReconciliation(reportType, {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });

    logInfo("Manual reconciliation triggered by admin", {
      reportType,
      startTime,
      endTime,
      triggeredBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Reconciliation triggered successfully",
      report,
    });
  } catch (err) {
    logError("Trigger reconciliation error", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to trigger reconciliation",
    });
  }
};

// =============================
// 📊 GET RECONCILIATION STATISTICS (ADMIN)
// =============================
export const getReconciliationStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalReports,
      completedReports,
      failedReports,
      byReportType,
      allIssueRows,
      avgSuccessRate,
    ] = await Promise.all([
      ReconciliationReport.countDocuments({ createdAt: { $gte: fromDate } }),
      ReconciliationReport.countDocuments({ createdAt: { $gte: fromDate }, status: "completed" }),
      ReconciliationReport.countDocuments({ createdAt: { $gte: fromDate }, status: "failed" }),
      ReconciliationReport.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$reportType", count: { $sum: 1 } } },
      ]),
      // Every issue of every report in the window (resolved or not), read from the JSONB `issues` column.
      fetchIssueRows({ state: "any", since: fromDate }),
      ReconciliationReport.aggregate([
        { $match: { createdAt: { $gte: fromDate }, status: "completed" } },
        { $group: { _id: null, avgRate: { $avg: "$successRate" } } },
      ]),
    ]);

    const totalIssues = [{ total: allIssueRows.length }];
    const resolvedIssues = [{ resolved: allIssueRows.filter((r) => r.issue?.resolved === true || r.issue?.resolved === "true").length }];
    const toPairs = (obj) => Object.entries(obj).map(([_id, count]) => ({ _id, count }));
    const byIssueType = toPairs(tallyBy(allIssueRows, "type"));
    const byIssueSeverity = toPairs(tallyBy(allIssueRows, "severity"));

    const totalIssuesCount = totalIssues[0]?.total || 0;
    const resolvedIssuesCount = resolvedIssues[0]?.resolved || 0;
    const avgRate = avgSuccessRate[0]?.avgRate || 0;

    res.json({
      success: true,
      statistics: {
        totalReports,
        completedReports,
        failedReports,
        successRate: totalReports > 0 ? (completedReports / totalReports) * 100 : 0,
        byReportType: byReportType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        totalIssues: totalIssuesCount,
        resolvedIssues: resolvedIssuesCount,
        unresolvedIssues: totalIssuesCount - resolvedIssuesCount,
        resolutionRate: totalIssuesCount > 0 ? (resolvedIssuesCount / totalIssuesCount) * 100 : 0,
        byIssueType: byIssueType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byIssueSeverity: byIssueSeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        avgSuccessRate: avgRate,
      },
    });
  } catch (err) {
    logError("Get reconciliation statistics error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation statistics",
    });
  }
};

// =============================
// 📊 GET CRON STATUS (ADMIN)
// =============================
export const getCronStatus = async (req, res) => {
  try {
    const status = getReconciliationCronStatus();

    res.json({
      success: true,
      status,
    });
  } catch (err) {
    logError("Get cron status error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cron status",
    });
  }
};

// =============================
// 📤 EXPORT REPORT DATA (ADMIN)
// =============================
export const exportReportData = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await ReconciliationReport.findById(reportId).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Reconciliation report not found",
      });
    }

    const exportData = {
      reportId: report.reportId,
      reportType: report.reportType,
      startTime: report.startTime,
      endTime: report.endTime,
      summary: {
        totalTransactions: report.totalTransactions,
        reconciled: report.reconciled,
        unreconciled: report.unreconciled,
        successRate: report.successRate,
      },
      issues: report.issues,
      issueDetails: Array.isArray(report.issues) ? report.issues : [], // legacy export key kept for existing consumers; data comes from `issues`
      status: report.status,
      generatedBy: report.generatedBy,
      duration: report.duration,
      exportedAt: new Date(),
      exportedBy: req.user.id,
    };

    logInfo("Report data exported", {
      reportId,
      exportedBy: req.user.id,
    });

    res.json({
      success: true,
      exportData,
    });
  } catch (err) {
    logError("Export report data error", err);
    res.status(500).json({
      success: false,
      message: "Failed to export report data",
    });
  }
};
