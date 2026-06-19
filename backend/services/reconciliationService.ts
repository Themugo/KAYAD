// backend/services/reconciliationService.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Enterprise payment reconciliation service for fintech platform
// Reconciles MpesaTransaction, Payment, Escrow, Subscription, Refund, Commission, Payout
// Detects missing callbacks, duplicate callbacks, amount mismatches, orphan transactions
// Calculates financial integrity score and generates downloadable reports
// ─────────────────────────────────────────────────────────────

import MpesaTransaction from "../models/MpesaTransaction.ts";
import Payment from "../models/Payment.ts";
import Escrow from "../models/Escrow.ts";
import Subscription from "../models/Subscription.ts";
import ReconciliationReport from "../models/ReconciliationReport.ts";
import { sendNotification } from "./notification.service.ts";
import { logInfo, logWarn, logError } from "../utils/logger.ts";

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

    if (reportType === "refund_reconciliation" || reportType === "full_reconciliation") {
      const refundResult = await reconcileRefunds(startTime, endTime, report);
      totalTransactions += refundResult.total;
      reconciled += refundResult.reconciled;
      unreconciled += refundResult.unreconciled;
    }

    if (reportType === "commission_reconciliation" || reportType === "full_reconciliation") {
      const commissionResult = await reconcileCommissions(startTime, endTime, report);
      totalTransactions += commissionResult.total;
      reconciled += commissionResult.reconciled;
      unreconciled += commissionResult.unreconciled;
    }

    if (reportType === "payout_reconciliation" || reportType === "full_reconciliation") {
      const payoutResult = await reconcilePayouts(startTime, endTime, report);
      totalTransactions += payoutResult.total;
      reconciled += payoutResult.reconciled;
      unreconciled += payoutResult.unreconciled;
    }

    // Calculate financial integrity score
    const integrityScore = await calculateFinancialIntegrityScore(startTime, endTime, report);
    report.financialIntegrityScore = integrityScore;

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
      const expectedAmount =
        subscription.billingCycle === "annual" ? subscription.pricing.annual : subscription.pricing.monthly;

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
// � RECONCILE REFUNDS
// =============================
export const reconcileRefunds = async (startDate, endDate, report) => {
  try {
    const refunds = await Payment.find({
      type: "refund",
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let total = refunds.length;
    let reconciled = 0;
    let unreconciled = 0;

    for (const refund of refunds) {
      // Check if refund has corresponding original payment
      const originalPayment = await Payment.findOne({
        _id: refund.referenceId,
      }).lean();

      if (!originalPayment) {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "high",
          description: `Refund without corresponding original payment`,
          transactionId: refund._id,
          transactionModel: "Payment",
          amountDifference: refund.amount,
        });
        unreconciled++;
        continue;
      }

      // Check if refund amount exceeds original payment
      if (refund.amount > originalPayment.amount) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "critical",
          description: `Refund amount exceeds original payment: ${refund.amount} > ${originalPayment.amount}`,
          transactionId: refund._id,
          transactionModel: "Payment",
          relatedTransactionId: originalPayment._id,
          relatedTransactionModel: "Payment",
          amountDifference: refund.amount - originalPayment.amount,
        });
        unreconciled++;
        continue;
      }

      // Check if refund status is pending for too long
      if (refund.status === "pending") {
        const hoursPending = (Date.now() - new Date(refund.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursPending > 48) {
          await report.addIssue({
            type: "stuck_transaction",
            severity: "high",
            description: `Refund pending for ${hoursPending.toFixed(1)} hours`,
            transactionId: refund._id,
            transactionModel: "Payment",
            amountDifference: refund.amount,
          });
          unreconciled++;
          continue;
        }
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("Refund reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// 🔄 RECONCILE COMMISSIONS
// =============================
export const reconcileCommissions = async (startDate, endDate, report) => {
  try {
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      platformFee: { $gt: 0 },
    }).lean();

    let total = payments.length;
    let reconciled = 0;
    let unreconciled = 0;

    for (const payment of payments) {
      // Calculate expected commission (5% of amount)
      const expectedCommission = payment.amount * 0.05;
      const actualCommission = payment.platformFee;

      // Check commission calculation
      if (Math.abs(actualCommission - expectedCommission) > 0.01) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Commission mismatch: Expected ${expectedCommission}, Actual ${actualCommission}`,
          transactionId: payment._id,
          transactionModel: "Payment",
          amountDifference: Math.abs(actualCommission - expectedCommission),
        });
        unreconciled++;
        continue;
      }

      // Check if dealerAmount is correct
      const expectedDealerAmount = payment.amount - actualCommission;
      if (Math.abs(payment.dealerAmount - expectedDealerAmount) > 0.01) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Dealer amount mismatch: Expected ${expectedDealerAmount}, Actual ${payment.dealerAmount}`,
          transactionId: payment._id,
          transactionModel: "Payment",
          amountDifference: Math.abs(payment.dealerAmount - expectedDealerAmount),
        });
        unreconciled++;
        continue;
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("Commission reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYOUTS
// =============================
export const reconcilePayouts = async (startDate, endDate, report) => {
  try {
    const escrows = await Escrow.find({
      status: "released",
      releasedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let total = escrows.length;
    let reconciled = 0;
    let unreconciled = 0;

    for (const escrow of escrows) {
      // Check if payout was processed
      const payment = await Payment.findOne({
        referenceId: escrow._id,
        referenceModel: "Escrow",
        type: "payout",
      }).lean();

      if (!payment) {
        await report.addIssue({
          type: "missing_payout",
          severity: "high",
          description: `Released escrow without corresponding payout`,
          transactionId: escrow._id,
          transactionModel: "Escrow",
          amountDifference: escrow.sellerAmount,
        });
        unreconciled++;
        continue;
      }

      // Check if payout amount matches seller amount
      if (payment.amount !== escrow.sellerAmount) {
        await report.addIssue({
          type: "amount_mismatch",
          severity: "high",
          description: `Payout amount mismatch: Expected ${escrow.sellerAmount}, Actual ${payment.amount}`,
          transactionId: payment._id,
          transactionModel: "Payment",
          relatedTransactionId: escrow._id,
          relatedTransactionModel: "Escrow",
          amountDifference: Math.abs(payment.amount - escrow.sellerAmount),
        });
        unreconciled++;
        continue;
      }

      // Check if payout is still pending for too long
      if (payment.status === "pending") {
        const hoursPending = (Date.now() - new Date(escrow.releasedAt).getTime()) / (1000 * 60 * 60);
        if (hoursPending > 24) {
          await report.addIssue({
            type: "stuck_transaction",
            severity: "high",
            description: `Payout pending for ${hoursPending.toFixed(1)} hours after release`,
            transactionId: payment._id,
            transactionModel: "Payment",
            amountDifference: payment.amount,
          });
          unreconciled++;
          continue;
        }
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled };
  } catch (err) {
    logError("Payout reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0 };
  }
};

// =============================
// � DETECT MISSING CALLBACKS
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

// =============================
// 📊 CALCULATE FINANCIAL INTEGRITY SCORE
// =============================
export const calculateFinancialIntegrityScore = async (startDate, endDate, report) => {
  try {
    let score = 100;
    let issues = 0;

    // Deduct points for each issue based on severity
    for (const issue of report.issues) {
      issues++;
      if (issue.severity === "critical") {
        score -= 25;
      } else if (issue.severity === "high") {
        score -= 10;
      } else if (issue.severity === "medium") {
        score -= 5;
      } else if (issue.severity === "low") {
        score -= 1;
      }
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Additional checks
    const negativeBalances = await detectNegativeBalances(startDate, endDate);
    if (negativeBalances.length > 0) {
      score -= negativeBalances.length * 5;
      for (const balance of negativeBalances) {
        await report.addIssue({
          type: "negative_balance",
          severity: "high",
          description: `Negative balance detected: ${balance.entity} ${balance.entityId}`,
          transactionId: balance.entityId,
          transactionModel: balance.entity,
          amountDifference: balance.amount,
        });
      }
    }

    const unreleasedEscrows = await detectUnreleasedEscrows(startDate, endDate);
    if (unreleasedEscrows.length > 0) {
      score -= unreleasedEscrows.length * 3;
      for (const escrow of unreleasedEscrows) {
        await report.addIssue({
          type: "unreleased_escrow",
          severity: "medium",
          description: `Escrow held for ${escrow.daysHeld} days without release`,
          transactionId: escrow._id,
          transactionModel: "Escrow",
          amountDifference: escrow.amount,
        });
      }
    }

    // Calculate ledger vs gateway balance
    const ledgerGatewayMismatch = await compareLedgerVsGateway(startDate, endDate);
    if (ledgerGatewayMismatch.mismatch > 0) {
      score -= 15;
      await report.addIssue({
        type: "ledger_gateway_mismatch",
        severity: "high",
        description: `Ledger vs gateway mismatch: ${ledgerGatewayMismatch.mismatch}`,
        amountDifference: ledgerGatewayMismatch.mismatch,
      });
    }

    // Calculate escrow balance mismatch
    const escrowBalanceMismatch = await compareEscrowBalances(startDate, endDate);
    if (escrowBalanceMismatch.mismatch > 0) {
      score -= 10;
      await report.addIssue({
        type: "escrow_balance_mismatch",
        severity: "medium",
        description: `Escrow balance mismatch: ${escrowBalanceMismatch.mismatch}`,
        amountDifference: escrowBalanceMismatch.mismatch,
      });
    }

    return Math.max(0, score);
  } catch (err) {
    logError("Calculate financial integrity score failed", err);
    return 50; // Return neutral score on error
  }
};

// =============================
// 🔍 DETECT NEGATIVE BALANCES
// =============================
export const detectNegativeBalances = async (startDate, endDate) => {
  try {
    const negativeBalances = [];

    // Check for negative payment amounts
    const negativePayments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      amount: { $lt: 0 },
    }).lean();

    for (const payment of negativePayments) {
      negativeBalances.push({
        entityId: payment._id,
        entity: "Payment",
        amount: payment.amount,
      });
    }

    // Check for negative escrow amounts
    const negativeEscrows = await Escrow.find({
      createdAt: { $gte: startDate, $lte: endDate },
      amount: { $lt: 0 },
    }).lean();

    for (const escrow of negativeEscrows) {
      negativeBalances.push({
        entityId: escrow._id,
        entity: "Escrow",
        amount: escrow.amount,
      });
    }

    return negativeBalances;
  } catch (err) {
    logError("Detect negative balances failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT UNRELEASED ESCROWS
// =============================
export const detectUnreleasedEscrows = async (startDate, endDate) => {
  try {
    const unreleasedEscrows = [];

    const heldEscrows = await Escrow.find({
      status: "held",
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    for (const escrow of heldEscrows) {
      const daysHeld = (Date.now() - new Date(escrow.createdAt).getTime()) / (1000 * 60 * 60 * 24);

      // Flag escrows held for more than 7 days
      if (daysHeld > 7) {
        unreleasedEscrows.push({
          _id: escrow._id,
          amount: escrow.amount,
          daysHeld: Math.floor(daysHeld),
        });
      }
    }

    return unreleasedEscrows;
  } catch (err) {
    logError("Detect unreleased escrows failed", err);
    return [];
  }
};

// =============================
// 📊 COMPARE LEDGER VS GATEWAY
// =============================
export const compareLedgerVsGateway = async (startDate, endDate) => {
  try {
    // Calculate ledger total from Payment records
    const ledgerResult = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const ledgerTotal = ledgerResult[0]?.total || 0;

    // Calculate gateway total from MpesaTransaction records
    const gatewayResult = await MpesaTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const gatewayTotal = gatewayResult[0]?.total || 0;

    const mismatch = Math.abs(ledgerTotal - gatewayTotal);

    return { ledgerTotal, gatewayTotal, mismatch };
  } catch (err) {
    logError("Compare ledger vs gateway failed", err);
    return { ledgerTotal: 0, gatewayTotal: 0, mismatch: 0 };
  }
};

// =============================
// 📊 COMPARE ESCROW BALANCES
// =============================
export const compareEscrowBalances = async (startDate, endDate) => {
  try {
    // Calculate total held escrow amounts
    const heldResult = await Escrow.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "held",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const heldTotal = heldResult[0]?.total || 0;

    // Calculate total corresponding payment amounts
    const paymentResult = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          referenceModel: "Escrow",
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const paymentTotal = paymentResult[0]?.total || 0;

    const mismatch = Math.abs(heldTotal - paymentTotal);

    return { heldTotal, paymentTotal, mismatch };
  } catch (err) {
    logError("Compare escrow balances failed", err);
    return { heldTotal: 0, paymentTotal: 0, mismatch: 0 };
  }
};
