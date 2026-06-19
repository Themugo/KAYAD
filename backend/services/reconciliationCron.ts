// backend/services/reconciliationCron.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Scheduled payment reconciliation job
// Runs every 15 minutes to reconcile payment systems
// ─────────────────────────────────────────────────────────────

import cron from "node-cron";
import { runReconciliation } from "./reconciliationService.ts";
import { logInfo, logWarn, logError } from "../utils/logger.ts";

let reconciliationJob = null;
let isRunning = false;

// =============================
// ⏰ START RECONCILIATION CRON
// =============================
export const startReconciliationCron = () => {
  if (reconciliationJob) {
    logWarn("Reconciliation cron already running");
    return;
  }

  // Run every 15 minutes: */15 * * * *
  reconciliationJob = cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      logWarn("Reconciliation job already running, skipping");
      return;
    }

    isRunning = true;

    try {
      logInfo("Starting scheduled reconciliation");

      // Calculate time range (last 15 minutes)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 15 * 60 * 1000);

      // Run full reconciliation
      const report = await runReconciliation("full_reconciliation", {
        startTime,
        endTime,
      });

      logInfo("Scheduled reconciliation completed", {
        reportId: report.reportId,
        totalTransactions: report.totalTransactions,
        reconciled: report.reconciled,
        unreconciled: report.unreconciled,
        successRate: report.successRate,
        duration: report.duration,
      });
    } catch (err) {
      logError("Scheduled reconciliation failed", err);
    } finally {
      isRunning = false;
    }
  });

  logInfo("Reconciliation cron started", { schedule: "*/15 * * * *" });
};

// =============================
// ⏹ STOP RECONCILIATION CRON
// =============================
export const stopReconciliationCron = () => {
  if (reconciliationJob) {
    reconciliationJob.stop();
    reconciliationJob = null;
    logInfo("Reconciliation cron stopped");
  }
};

// =============================
// 🔄 MANUAL TRIGGER
// =============================
export const triggerManualReconciliation = async (reportType, timeRange) => {
  try {
    if (isRunning) {
      throw new Error("Reconciliation job already running");
    }

    isRunning = true;

    logInfo("Starting manual reconciliation", { reportType, timeRange });

    const report = await runReconciliation(reportType, timeRange);

    logInfo("Manual reconciliation completed", {
      reportId: report.reportId,
      totalTransactions: report.totalTransactions,
      reconciled: report.reconciled,
      unreconciled: report.unreconciled,
      successRate: report.successRate,
    });

    return report;
  } catch (err) {
    logError("Manual reconciliation failed", err);
    throw err;
  } finally {
    isRunning = false;
  }
};

// =============================
// 📊 GET CRON STATUS
// =============================
export const getReconciliationCronStatus = () => {
  return {
    isRunning,
    isScheduled: !!reconciliationJob,
    schedule: reconciliationJob ? "*/15 * * * *" : null,
  };
};
