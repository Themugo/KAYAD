// backend/services/reconciliationService.js - Production Hardened v5.0
// ─────────────────────────────────────────────────────────────
// Payment reconciliation service for fintech platform
// Reconciles MpesaTransaction, Payment, Escrow, and Subscription
// Detects missing callbacks, duplicate callbacks, amount mismatches, orphan transactions
// ─────────────────────────────────────────────────────────────

import MpesaTransaction from "../models/MpesaTransaction.js";
import Payment from "../models/Payment.js";
import Escrow from "../models/Escrow.js";
import Subscription from "../models/Subscription.js";
import ReconciliationReport from "../models/ReconciliationReport.js";
import { sendNotification } from "./notification.service.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 🔄 RUN RECONCILIATION
// =============================
export const runReconciliation = async (reportType, timeRange) => {
  const startTime = new Date(timeRange.startTime);
  const endTime = new Date(timeRange.endTime);

  const reportId = ReconciliationReport.generateReportId();
  const report = await ReconciliationReport.create({
    reportId,
    reportType,
    startTime,
    endTime,
    status: "in_progress",
    generatedBy: "system",
  });

  const reconciliationStartTime = Date.now();

  try {
    let totalTransactions = 0;
    let reconciled = 0;
    let unreconciled = 0;

    if (reportType === "mpesa_payment" || reportType === "full_reconciliation") {
      const mpesaResult = await reconcileMpesaPayments(startTime, endTime, report);
      totalTransactions += mpesaResult.total;
      reconciled += mpesaResult.reconciled;
      unreconciled += mpesaResult.unreconciled;
    }

    if (reportType === "payment_escrow" || reportType === "full_reconciliation") {
      const escrowResult = await reconcilePaymentEscrow(startTime, endTime, report);
      totalTransactions += escrowResult.total;
      reconciled += escrowResult.reconciled;
      unreconciled += escrowResult.unreconciled;
    }

    if (reportType === "payment_subscription" || reportType === "full_reconciliation") {
      const subscriptionResult = await reconcilePaymentSubscription(startTime, endTime, report);
      totalTransactions += subscriptionResult.total;
      reconciled += subscriptionResult.reconciled;
      unreconciled += subscriptionResult.unreconciled;
    }

    report.totalTransactions = totalTransactions;
    report.reconciled = reconciled;
    report.unreconciled = unreconciled;
    await report.calculateSuccessRate();
    report.status = "completed";
    report.duration = Date.now() - reconciliationStartTime;

    await report.save();

    // Send alerts for critical issues
    const criticalIssues = report.getCriticalIssues();
    if (criticalIssues.length > 0) {
      await sendAlerts(criticalIssues, report);
    }

    logInfo("Reconciliation completed", {
      reportId,
      reportType,
      totalTransactions,
      reconciled,
      unreconciled,
      successRate: report.successRate,
    });

    return report;
  } catch (err) {
    logError("Reconciliation failed", err, { reportId, reportType });
    report.status = "failed";
    report.errorMessage = err.message;
    report.duration = Date.now() - reconciliationStartTime;
    await report.save();
    throw err;
  }
};

// =============================
// 🔄 RECONCILE MPESA ↔ PAYMENT
// =============================
export const reconcileMpesaPayments = async (startDate, endDate, report) => {
  try {
    const mpesaTransactions = await MpesaTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      mode: "mpesa",
    }).lean();

    let total = mpesaTransactions.length + payments.length;
    let reconciled = 0;
    let unreconciled = 0;

    // Detect missing callbacks
    const missingCallbacks = await detectMissingCallbacks(startDate, endDate);
    for (const missing of missingCallbacks) {
      await report.addIssue({
        type: "missing_callback",
        severity: "high",
        description: `M-Pesa transaction pending for ${missing.createdAt.toISOString()}`,
        transactionId: missing._id,
        transactionModel: "MpesaTransaction",
        amountDifference: missing.amount,
      });
      unreconciled++;
    }

    // Detect duplicate callbacks
    const duplicateCallbacks = await detectDuplicateCallbacks(startDate, endDate);
    for (const duplicate of duplicateCallbacks) {
      await report.addIssue({
        type: "duplicate_callback",
        severity: "medium",
        description: `Duplicate checkoutRequestID: ${duplicate.checkoutRequestID}`,
        transactionId: duplicate._id,
        transactionModel: "Payment",
        amountDifference: duplicate.amount,
      });
      unreconciled++;
    }

    // Detect amount mismatches
    const amountMismatches = await detectAmountMismatches(startDate, endDate);
    for (const mismatch of amountMismatches) {
      await report.addIssue({
        type: "amount_mismatch",
        severity: "high",
        description: `Amount mismatch: M-Pesa ${mismatch.mpesaAmount} vs Payment ${mismatch.paymentAmount}`,
        transactionId: mismatch.mpesaId,
        transactionModel: "MpesaTransaction",
        relatedTransactionId: mismatch.paymentId,
        relatedTransactionModel: "Payment",
        amountDifference: Math.abs(mismatch.mpesaAmount - mismatch.paymentAmount),
      });
      unreconciled++;
    }

    // Detect orphan transactions
    const orphanTransactions = await detectOrphanTransactions(startDate, endDate);
    for (const orphan of orphanTransactions) {
      await report.addIssue({
        type: "orphan_transaction",
        severity: "medium",
        description: `Orphan ${orphan.model} without corresponding record`,
        transactionId: orphan._id,
        transactionModel: orphan.model,
        amountDifference: orphan.amount,
      });
      unreconciled++;
    }

    // Count reconciled transactions
    reconciled = total - unreconciled;

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("M-Pesa reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYMENT ↔ ESCROW
// =============================
export const reconcilePaymentEscrow = async (startDate, endDate, report) => {
  try {
    const escrows = await Escrow.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let total = escrows.length;
    let reconciled = 0;
    let unreconciled = 0;

    for (const escrow of escrows) {
      const payment = await Payment.findOne({
        _id: escrow.payment,
      }).lean();

      if (!payment) {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "high",
          description: `Escrow without corresponding payment`,
          transactionId: escrow._id,
          transactionModel: "Escrow",
          amountDifference: escrow.amount,
        });
        unreconciled++;
        continue;
      }

      // Check amount mismatch
      if (payment.amount !== escrow.amount) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "high",
          description: `Amount mismatch: Payment ${payment.amount} vs Escrow ${escrow.amount}`,
          transactionId: payment._id,
          transactionModel: "Payment",
          relatedTransactionId: escrow._id,
          relatedTransactionModel: "Escrow",
          amountDifference: Math.abs(payment.amount - escrow.amount),
        });
        unreconciled++;
        continue;
      }

      // Check status mismatch
      if (payment.status === "success" && escrow.status === "pending") {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "medium",
          description: `Payment successful but escrow still pending`,
          transactionId: payment._id,
          transactionModel: "Payment",
          relatedTransactionId: escrow._id,
          relatedTransactionModel: "Escrow",
          amountDifference: 0,
        });
        unreconciled++;
        continue;
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("Escrow reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYMENT ↔ SUBSCRIPTION
// =============================
export const reconcilePaymentSubscription = async (startDate, endDate, report) => {
  try {
    const subscriptions = await Subscription.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let total = subscriptions.length;
    let reconciled = 0;
    let unreconciled = 0;

    for (const subscription of subscriptions) {
      const payment = await Payment.findOne({
        referenceId: subscription.dealer,
        referenceModel: "User",
        type: "subscription",
        createdAt: { $gte: startDate, $lte: endDate },
      }).lean();

      if (!payment) {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "medium",
          description: `Subscription without corresponding payment`,
          transactionId: subscription._id,
          transactionModel: "Subscription",
          amountDifference: subscription.pricing.monthly,
        });
        unreconciled++;
        continue;
      }

      // Check amount mismatch
      const expectedAmount = subscription.billingCycle === "annual" 
        ? subscription.pricing.annual 
        : subscription.pricing.monthly;

      if (payment.amount !== expectedAmount) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Amount mismatch: Payment ${payment.amount} vs Subscription ${expectedAmount}`,
          transactionId: payment._id,
          transactionModel: "Payment",
          relatedTransactionId: subscription._id,
          relatedTransactionModel: "Subscription",
          amountDifference: Math.abs(payment.amount - expectedAmount),
        });
        unreconciled++;
        continue;
      }

      // Check status mismatch
      if (payment.status === "success" && subscription.status === "past_due") {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "low",
          description: `Payment successful but subscription past due`,
          transactionId: payment._id,
          transactionModel: "Payment",
          relatedTransactionId: subscription._id,
          relatedTransactionModel: "Subscription",
          amountDifference: 0,
        });
        unreconciled++;
        continue;
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("Subscription reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// 🔍 DETECT MISSING CALLBACKS
// =============================
export const detectMissingCallbacks = async (startDate, endDate) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const missingCallbacks = await MpesaTransaction.find({
      status: "pending",
      createdAt: { $lte: thirtyMinutesAgo },
    }).lean();

    return missingCallbacks;
  } catch (err) {
    logError("Detect missing callbacks failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT DUPLICATE CALLBACKS
// =============================
export const detectDuplicateCallbacks = async (startDate, endDate) => {
  try {
    // Find duplicate checkoutRequestIDs
    const duplicateCheckoutIds = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          checkoutRequestId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$checkoutRequestId",
          count: { $sum: 1 },
          payments: { $push: "$_id" },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    // Find duplicate mpesaReceipts
    const duplicateReceipts = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          mpesaReceipt: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$mpesaReceipt",
          count: { $sum: 1 },
          payments: { $push: "$_id" },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    const duplicates = [];

    for (const dup of duplicateCheckoutIds) {
      const payment = await Payment.findById(dup.payments[0]).lean();
      duplicates.push({
        _id: payment._id,
        checkoutRequestID: dup._id,
        amount: payment.amount,
      });
    }

    for (const dup of duplicateReceipts) {
      const payment = await Payment.findById(dup.payments[0]).lean();
      duplicates.push({
        _id: payment._id,
        mpesaReceipt: dup._id,
        amount: payment.amount,
      });
    }

    return duplicates;
  } catch (err) {
    logError("Detect duplicate callbacks failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT AMOUNT MISMATCHES
// =============================
export const detectAmountMismatches = async (startDate, endDate) => {
  try {
    const mismatches = [];

    // Match MpesaTransaction with Payment by checkoutRequestID
    const mpesaTransactions = await MpesaTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    }).lean();

    for (const mpesa of mpesaTransactions) {
      const payment = await Payment.findOne({
        checkoutRequestId: mpesa.checkoutRequestID,
      }).lean();

      if (payment && payment.amount !== mpesa.amount) {
        mismatches.push({
          mpesaId: mpesa._id,
          paymentId: payment._id,
          mpesaAmount: mpesa.amount,
          paymentAmount: payment.amount,
        });
      }
    }

    return mismatches;
  } catch (err) {
    logError("Detect amount mismatches failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT ORPHAN TRANSACTIONS
// =============================
export const detectOrphanTransactions = async (startDate, endDate) => {
  try {
    const orphans = [];

    // Find Payments without corresponding MpesaTransaction
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      mode: "mpesa",
      status: "success",
    }).lean();

    for (const payment of payments) {
      const mpesa = await MpesaTransaction.findOne({
        checkoutRequestID: payment.checkoutRequestId,
      }).lean();

      if (!mpesa) {
        orphans.push({
          _id: payment._id,
          model: "Payment",
          amount: payment.amount,
        });
      }
    }

    // Find MpesaTransactions without corresponding Payment
    const mpesaTransactions = await MpesaTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    }).lean();

    for (const mpesa of mpesaTransactions) {
      const payment = await Payment.findOne({
        checkoutRequestId: mpesa.checkoutRequestID,
      }).lean();

      if (!payment) {
        orphans.push({
          _id: mpesa._id,
          model: "MpesaTransaction",
          amount: mpesa.amount,
        });
      }
    }

    return orphans;
  } catch (err) {
    logError("Detect orphan transactions failed", err);
    return [];
  }
};

// =============================
// 📢 SEND ALERTS
// =============================
export const sendAlerts = async (issues, report) => {
  try {
    const criticalIssues = issues.filter((issue) => issue.severity === "critical");
    const highIssues = issues.filter((issue) => issue.severity === "high");

    // Send in-app notifications to finance team
    for (const issue of criticalIssues) {
      await sendNotification({
        title: "Critical Reconciliation Issue",
        message: `${issue.type}: ${issue.description}`,
        type: "finance_alert",
      }).catch((e) => logWarn("Failed to send notification", { error: e.message }));
    }

    // Log alerts
    logInfo("Reconciliation alerts sent", {
      reportId: report.reportId,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
    });

    return { sent: criticalIssues.length + highIssues.length };
  } catch (err) {
    logError("Send alerts failed", err);
    return { sent: 0 };
  }
};

// =============================
// ✅ RESOLVE ISSUE
// =============================
export const resolveIssue = async (reportId, issueIndex, resolution, userId) => {
  try {
    const report = await ReconciliationReport.findOne({ reportId });
    if (!report) {
      throw new Error("Report not found");
    }

    await report.resolveIssue(issueIndex, userId, resolution.notes);

    logInfo("Reconciliation issue resolved", {
      reportId,
      issueIndex,
      resolvedBy: userId,
    });

    return report;
  } catch (err) {
    logError("Resolve issue failed", err);
    throw err;
  }
};
