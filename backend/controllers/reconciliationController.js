// backend/controllers/reconciliationController.js - Production Hardened v1.0
// ─────────────────────────────────────────────────────────────
// Enterprise payment reconciliation controller
// Provides API endpoints for reconciliation dashboard and reporting
// ─────────────────────────────────────────────────────────────

import ReconciliationReport from "../models/ReconciliationReport.js";
import {
  runReconciliation,
  resolveIssue,
  calculateFinancialIntegrityScore,
  detectNegativeBalances,
  detectUnreleasedEscrows,
  compareLedgerVsGateway,
  compareEscrowBalances,
} from "../services/reconciliationService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📊 GET RECONCILIATION DASHBOARD
// =============================
export const getReconciliationDashboard = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get recent reconciliation reports
    const recentReports = await ReconciliationReport.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate current financial integrity score
    const latestReport = recentReports[0];
    let integrityScore = 100;
    if (latestReport && latestReport.financialIntegrityScore) {
      integrityScore = latestReport.financialIntegrityScore;
    } else {
      // Calculate fresh score if no recent report
      const tempReport = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "dashboard",
        startTime: startDate,
        endTime: endDate,
        status: "in_progress",
        generatedBy: "system",
      });
      integrityScore = await calculateFinancialIntegrityScore(startDate, endDate, tempReport);
      await tempReport.deleteOne();
    }

    // Get unresolved issues count
    const unresolvedIssues = await ReconciliationReport.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          "issues.resolved": false,
        },
      },
      {
        $unwind: "$issues",
      },
      {
        $match: { "issues.resolved": false },
      },
      {
        $count: "total",
      },
    ]);

    // Get issue breakdown by severity
    const issueBreakdown = await ReconciliationReport.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $unwind: "$issues",
      },
      {
        $match: { "issues.resolved": false },
      },
      {
        $group: {
          _id: "$issues.severity",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get issue breakdown by type
    const issueTypeBreakdown = await ReconciliationReport.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $unwind: "$issues",
      },
      {
        $match: { "issues.resolved": false },
      },
      {
        $group: {
          _id: "$issues.type",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get ledger vs gateway comparison
    const ledgerGateway = await compareLedgerVsGateway(startDate, endDate);

    // Get escrow balance comparison
    const escrowBalances = await compareEscrowBalances(startDate, endDate);

    res.json({
      success: true,
      data: {
        integrityScore,
        unresolvedIssues: unresolvedIssues[0]?.total || 0,
        recentReports,
        issueBreakdown: issueBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        issueTypeBreakdown,
        ledgerGateway,
        escrowBalances,
      },
    });
  } catch (err) {
    logError("Get reconciliation dashboard failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation dashboard",
    });
  }
};

// =============================
// 🔄 RUN RECONCILIATION
// =============================
export const runReconciliationReport = async (req, res) => {
  try {
    const { reportType = "full_reconciliation", days = 1 } = req.body;
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endTime = new Date();

    const report = await runReconciliation(reportType, { startTime, endTime });

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Run reconciliation failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to run reconciliation",
    });
  }
};

// =============================
// 📄 GET RECONCILIATION REPORTS
// =============================
export const getReconciliationReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, reportType } = req.query;
    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;

    const reports = await ReconciliationReport.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ReconciliationReport.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get reconciliation reports failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation reports",
    });
  }
};

// =============================
// 📄 GET RECONCILIATION REPORT BY ID
// =============================
export const getReconciliationReportById = async (req, res) => {
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
      data: report,
    });
  } catch (err) {
    logError("Get reconciliation report by ID failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reconciliation report",
    });
  }
};

// =============================
// ✅ RESOLVE RECONCILIATION ISSUE
// =============================
export const resolveReconciliationIssue = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { issueIndex, resolution } = req.body;
    const userId = req.user.id;

    const report = await resolveIssue(reportId, issueIndex, resolution, userId);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Resolve reconciliation issue failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to resolve reconciliation issue",
    });
  }
};

// =============================
// 📊 GET FINANCIAL INTEGRITY SCORE
// =============================
export const getFinancialIntegrityScore = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const tempReport = await ReconciliationReport.create({
      reportId: ReconciliationReport.generateReportId(),
      reportType: "integrity_score",
      startTime: startDate,
      endTime: endDate,
      status: "in_progress",
      generatedBy: "system",
    });

    const score = await calculateFinancialIntegrityScore(startDate, endDate, tempReport);

    await tempReport.deleteOne();

    res.json({
      success: true,
      data: {
        score,
        issues: tempReport.issues,
      },
    });
  } catch (err) {
    logError("Get financial integrity score failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to calculate financial integrity score",
    });
  }
};

// =============================
// 🔍 GET NEGATIVE BALANCES
// =============================
export const getNegativeBalances = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const negativeBalances = await detectNegativeBalances(startDate, endDate);

    res.json({
      success: true,
      data: negativeBalances,
    });
  } catch (err) {
    logError("Get negative balances failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch negative balances",
    });
  }
};

// =============================
// 🔍 GET UNRELEASED ESCROWS
// =============================
export const getUnreleasedEscrows = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const unreleasedEscrows = await detectUnreleasedEscrows(startDate, endDate);

    res.json({
      success: true,
      data: unreleasedEscrows,
    });
  } catch (err) {
    logError("Get unreleased escrows failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unreleased escrows",
    });
  }
};

// =============================
// 📊 EXPORT RECONCILIATION REPORT
// =============================
export const exportReconciliationReport = async (req, res) => {
  try {
    const { reportId, format = "json" } = req.params;
    const report = await ReconciliationReport.findById(reportId).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Reconciliation report not found",
      });
    }

    if (format === "csv") {
      // Generate CSV
      const csvHeaders = "Type,Severity,Description,Transaction ID,Model,Amount Difference,Resolved,Resolved At,Resolved By\n";
      const csvRows = report.issues.map((issue) => {
        return [
          issue.type,
          issue.severity,
          `"${issue.description.replace(/"/g, '""')}"`,
          issue.transactionId || "",
          issue.transactionModel || "",
          issue.amountDifference || 0,
          issue.resolved ? "Yes" : "No",
          issue.resolvedAt || "",
          issue.resolvedBy || "",
        ].join(",");
      }).join("\n");

      const csv = csvHeaders + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=reconciliation-${report.reportId}.csv`);
      res.send(csv);
    } else {
      // Return JSON
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=reconciliation-${report.reportId}.json`);
      res.json(report);
    }
  } catch (err) {
    logError("Export reconciliation report failed", err);
    res.status(500).json({
      success: false,
      message: "Failed to export reconciliation report",
    });
  }
};
