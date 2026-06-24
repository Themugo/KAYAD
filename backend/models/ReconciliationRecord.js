// backend/models/ReconciliationRecord.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Per-record reconciliation item.
// Tracks every individual expected-vs-actual comparison outcome:
//   matched / unmatched / missing / overpaid / underpaid
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const reconciliationRecordSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: "ReconciliationReport", required: true, index: true },

    // ── Source identification ──────────────────────────────────
    source: {
      type: String,
      enum: [
        "mpesa_payment",
        "payment_escrow",
        "escrow_vault",
        "subscription",
        "refund",
        "commission",
        "payout",
        "release",
        "expected_vs_received",
      ],
      required: true,
      index: true,
    },

    // ── Expected side (what should have happened) ───────────────
    expectedType: {
      type: String,
      enum: [
        "stk_push",
        "payment",
        "escrow_deposit",
        "escrow_release",
        "escrow_refund",
        "subscription_charge",
        "commission",
        "payout",
        "vault_funding",
        "vault_release",
        "vault_refund",
      ],
    },
    expectedId: { type: mongoose.Schema.Types.ObjectId },
    expectedModel: { type: String, index: true },
    expectedAmount: { type: Number, default: 0 },
    expectedRef: { type: String }, // checkoutRequestId, mpesaReceipt, bankTransferRef, etc.
    expectedDate: Date,

    // ── Actual side (what actually happened) ────────────────────
    actualType: {
      type: String,
      enum: [
        "stk_push",
        "payment",
        "escrow_deposit",
        "escrow_release",
        "escrow_refund",
        "subscription_charge",
        "commission",
        "payout",
        "vault_funding",
        "vault_release",
        "vault_refund",
      ],
    },
    actualId: { type: mongoose.Schema.Types.ObjectId },
    actualModel: { type: String, index: true },
    actualAmount: { type: Number, default: 0 },
    actualRef: { type: String },
    actualDate: Date,

    // ── Reconciliation outcome ──────────────────────────────────
    outcome: {
      type: String,
      enum: ["matched", "unmatched", "missing", "overpaid", "underpaid"],
      required: true,
      index: true,
    },

    amountDifference: { type: Number, default: 0 }, // signed: positive = overpaid, negative = underpaid

    statusMatch: { type: Boolean, default: true },
    statusExpected: { type: String },
    statusActual: { type: String },

    // ── User / resource links ───────────────────────────────────
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },
    relatedRecords: [{ type: mongoose.Schema.Types.ObjectId }],

    // ── Resolution ──────────────────────────────────────────────
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolutionNotes: String,
  },
  { timestamps: true },
);

reconciliationRecordSchema.index({ report: 1, outcome: 1 });
reconciliationRecordSchema.index({ report: 1, source: 1, outcome: 1 });
reconciliationRecordSchema.index({ expectedId: 1, expectedModel: 1 });
reconciliationRecordSchema.index({ actualId: 1, actualModel: 1 });

const ReconciliationRecord =
  mongoose.models.ReconciliationRecord || mongoose.model("ReconciliationRecord", reconciliationRecordSchema);

export default ReconciliationRecord;
