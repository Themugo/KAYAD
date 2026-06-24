// backend/models/ReconciliationReport.js - Production v6.0
// ─────────────────────────────────────────────────────────────
// Aggregated reconciliation report snapshot.
// Tracks summary stats, directional breakdowns (overpaid/underpaid),
// and detailed issues across all payment/escrow/financial systems.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const reconciliationReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    reportType: {
      type: String,
      enum: [
        "mpesa_payment",
        "payment_escrow",
        "payment_subscription",
        "escrow_vault",
        "refund_reconciliation",
        "commission_reconciliation",
        "payout_reconciliation",
        "release_reconciliation",
        "expected_vs_received",
        "full_reconciliation",
        "dashboard",
        "integrity_score",
      ],
      required: true,
      index: true,
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    // ── Summary counts ──────────────────────────────────────────
    totalTransactions: { type: Number, default: 0 },
    reconciled: { type: Number, default: 0 },
    unreconciled: { type: Number, default: 0 },
    successRate: { type: Number, default: 0, min: 0, max: 100 },

    // ── Directional breakdown ──────────────────────────────────
    matched: { type: Number, default: 0 },
    unmatched: { type: Number, default: 0 },
    missing: { type: Number, default: 0 },
    overpaid: { type: Number, default: 0 },
    underpaid: { type: Number, default: 0 },

    // ── Legacy issue counters ───────────────────────────────────
    issues: {
      missingCallbacks: { type: Number, default: 0 },
      duplicateCallbacks: { type: Number, default: 0 },
      amountMismatches: { type: Number, default: 0 },
      orphanTransactions: { type: Number, default: 0 },
    },

    // ── Directional financial totals ──────────────────────────
    financials: {
      expectedTotal: { type: Number, default: 0 },
      actualTotal: { type: Number, default: 0 },
      overpaidTotal: { type: Number, default: 0 },
      underpaidTotal: { type: Number, default: 0 },
      missingTotal: { type: Number, default: 0 },
      feeMismatchTotal: { type: Number, default: 0 },
    },

    // ── Detailed issues ─────────────────────────────────────────
    issueDetails: [
      {
        type: {
          type: String,
          enum: [
            "missing_callback",
            "duplicate_callback",
            "amount_mismatch",
            "orphan_transaction",
            "stuck_transaction",
            "missing_payout",
            "negative_balance",
            "unreleased_escrow",
            "ledger_gateway_mismatch",
            "escrow_balance_mismatch",
            "vault_balance_mismatch",
            "release_mismatch",
            "refund_exceeds_original",
            "overpaid",
            "underpaid",
          ],
          required: true,
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          required: true,
        },
        description: { type: String, required: true },
        transactionId: { type: mongoose.Schema.Types.ObjectId },
        transactionModel: {
          type: String,
          enum: [
            "MpesaTransaction",
            "Payment",
            "Escrow",
            "EscrowVault",
            "Subscription",
            "Bid",
            "LedgerEntry",
            "Transaction",
            "User",
          ],
        },
        relatedTransactionId: { type: mongoose.Schema.Types.ObjectId },
        relatedTransactionModel: String,
        amountDifference: Number,
        detectedAt: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
        resolvedAt: Date,
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolutionNotes: String,
      },
    ],

    // ── Status ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending",
      index: true,
    },

    // ── Metadata ────────────────────────────────────────────────
    generatedBy: {
      type: String,
      enum: ["system", "manual"],
      default: "system",
    },
    generatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    duration: { type: Number, default: 0 },
    errorMessage: String,
    financialIntegrityScore: { type: Number, default: 100, min: 0, max: 100 },

    // ── Reconciliation data blob ────────────────────────────────
    reconciliationData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES
// =============================
reconciliationReportSchema.index({ reportId: 1 });
reconciliationReportSchema.index({ reportType: 1, createdAt: -1 });
reconciliationReportSchema.index({ status: 1, createdAt: -1 });
reconciliationReportSchema.index({ startTime: 1, endTime: 1 });
reconciliationReportSchema.index({ "issueDetails.resolved": 1 });
reconciliationReportSchema.index({ "issueDetails.severity": 1 });

// =============================
// ⚡ GENERATE REPORT ID
// =============================
reconciliationReportSchema.statics.generateReportId = function () {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `RECON_${timestamp}_${random}`;
};

// =============================
// ⚡ CALCULATE SUCCESS RATE
// =============================
reconciliationReportSchema.methods.calculateSuccessRate = function () {
  if (this.totalTransactions === 0) {
    this.successRate = 0;
  } else {
    this.successRate = (this.reconciled / this.totalTransactions) * 100;
  }
  return this.save();
};

// =============================
// ⚡ ADD ISSUE
// =============================
reconciliationReportSchema.methods.addIssue = function (issue) {
  this.issueDetails.push({
    ...issue,
    detectedAt: new Date(),
    resolved: false,
  });

  if (issue.type === "missing_callback") this.issues.missingCallbacks++;
  if (issue.type === "duplicate_callback") this.issues.duplicateCallbacks++;
  if (issue.type === "amount_mismatch") this.issues.amountMismatches++;
  if (["orphan_transaction", "missing_payout"].includes(issue.type)) this.issues.orphanTransactions++;

  return this.save();
};

// =============================
// ⚡ RESOLVE ISSUE
// =============================
reconciliationReportSchema.methods.resolveIssue = function (issueIndex, userId, notes) {
  if (issueIndex < 0 || issueIndex >= this.issueDetails.length) {
    throw new Error("Invalid issue index");
  }

  const issue = this.issueDetails[issueIndex];
  issue.resolved = true;
  issue.resolvedAt = new Date();
  issue.resolvedBy = userId;
  issue.resolutionNotes = notes;

  return this.save();
};

// =============================
// ⚡ GET UNRESOLVED ISSUES
// =============================
reconciliationReportSchema.methods.getUnresolvedIssues = function () {
  return this.issueDetails.filter((issue) => !issue.resolved);
};

// =============================
// ⚡ GET CRITICAL ISSUES
// =============================
reconciliationReportSchema.methods.getCriticalIssues = function () {
  return this.issueDetails.filter((issue) => issue.severity === "critical" && !issue.resolved);
};

// =============================
// ⚡ GET SUMMARY
// =============================
reconciliationReportSchema.methods.getSummary = function () {
  return {
    reportId: this.reportId,
    reportType: this.reportType,
    startTime: this.startTime,
    endTime: this.endTime,
    totalTransactions: this.totalTransactions,
    reconciled: this.reconciled,
    unreconciled: this.unreconciled,
    matched: this.matched,
    unmatched: this.unmatched,
    missing: this.missing,
    overpaid: this.overpaid,
    underpaid: this.underpaid,
    successRate: this.successRate,
    financials: this.financials,
    issues: this.issues,
    financialIntegrityScore: this.financialIntegrityScore,
    status: this.status,
    generatedBy: this.generatedBy,
    duration: this.duration,
  };
};

const ReconciliationReport =
  mongoose.models.ReconciliationReport || mongoose.model("ReconciliationReport", reconciliationReportSchema);

export default ReconciliationReport;
