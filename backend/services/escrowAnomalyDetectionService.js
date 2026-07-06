// backend/services/escrowAnomalyDetectionService.js - Escrow Anomaly Detection Engine
// ─────────────────────────────────────────────────────────────
// Detects 5 escrow anomaly patterns with configurable thresholds:
//   1) LargeTransaction  - escrow amount > threshold
//   2) RapidRefund       - escrow refunded shortly after funding
//   3) MultipleDisputes  - user involved in many disputes
//   4) RepeatOffender    - user with repeated fraud/anomaly flags
//   5) EscrowAbuse       - pattern: fund → never deliver → auto-release
//
// Each detection generates a risk score (0-100) with severity
// tier and evidence snapshot for admin review.
// ─────────────────────────────────────────────────────────────

import crypto from "crypto";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";
import Dispute from "../models/Dispute.js";
import EscrowAnomaly from "../models/EscrowAnomaly.js";
import EscrowRiskScore from "../models/EscrowRiskScore.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// ⚙️ CONFIGURABLE THRESHOLDS
// =============================
const THRESHOLDS = {
  LARGE_TRANSACTION_MIN: parseFloat(process.env.ANOMALY_LARGE_TX_MIN || "500000"),
  LARGE_TRANSACTION_CRITICAL: parseFloat(process.env.ANOMALY_LARGE_TX_CRITICAL || "2000000"),
  RAPID_REFUND_HOURS: parseInt(process.env.ANOMALY_RAPID_REFUND_HOURS || "24"),
  MULTIPLE_DISPUTES_COUNT: parseInt(process.env.ANOMALY_MULTI_DISPUTE_COUNT || "2"),
  REPEAT_OFFENDER_DAYS: parseInt(process.env.ANOMALY_REPEAT_DAYS || "90"),
  ESCROW_ABUSE_MIN_AMOUNT: parseFloat(process.env.ANOMALY_ABUSE_MIN_AMOUNT || "50000"),
  ESCROW_ABUSE_AUTO_RELEASE_HOURS: parseInt(process.env.ANOMALY_ABUSE_AUTO_RELEASE_HOURS || "48"),
};

const SCORE_WEIGHTS = {
  large_transaction: { low: 20, medium: 40, high: 60, critical: 85 },
  rapid_refund: { low: 25, medium: 45, high: 65, critical: 90 },
  multiple_disputes: { low: 15, medium: 35, high: 55, critical: 75 },
  repeat_offender: { low: 30, medium: 50, high: 70, critical: 95 },
  escrow_abuse: { low: 20, medium: 40, high: 60, critical: 80 },
};

const SEVERITY_THRESHOLDS = {
  low: { min: 0, max: 25 },
  medium: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
};

const resolveSeverity = (score) => {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
};

const generateAnomalyId = (category) => {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `anomaly-${category}-${suffix}`;
};

const upsertRiskScore = async (userId, role, updates) => {
  try {
    const existing = await EscrowRiskScore.findOne({ user: userId, role });
    if (!existing) {
      await EscrowRiskScore.create({ user: userId, role, ...updates, lastScoreUpdate: new Date() });
      return;
    }
    await EscrowRiskScore.findOneAndUpdate(
      { user: userId, role },
      { $inc: updates, lastScoreUpdate: new Date() },
      { upsert: true },
    );
  } catch (err) {
    logWarn("Risk score upsert failed", { userId, role, error: err.message });
  }
};

const recalculateRiskScore = async (userId, role) => {
  try {
    const profile = await EscrowRiskScore.findOne({ user: userId, role });
    if (!profile) return;

    const disputeWeight = profile.disputeInitiatorCount * 15;
    const refundWeight = profile.rapidRefundCount * 20;
    const largeTxWeight = profile.largeTransactionCount * 10;
    const abuseWeight = profile.abusePatternCount * 25;
    const disputeRatio = profile.totalEscrows > 0
      ? (profile.disputedEscrows / profile.totalEscrows) * 30
      : 0;
    const refundRatio = profile.totalEscrows > 0
      ? (profile.refundedEscrows / profile.totalEscrows) * 20
      : 0;

    let score = Math.min(
      disputeWeight + refundWeight + largeTxWeight + abuseWeight + disputeRatio + refundRatio,
      100,
    );

    const tier = resolveSeverity(score);
    await EscrowRiskScore.findOneAndUpdate(
      { user: userId, role },
      { riskScore: Math.round(score), riskTier: tier, lastScoreUpdate: new Date() },
    );
  } catch (err) {
    logWarn("Risk score recalc failed", { userId, role, error: err.message });
  }
};

// =============================
// 🔍 DETECTION: LARGE TRANSACTION
// =============================
const detectLargeTransactions = async (scanUntil) => {
  const anomalies = [];
  const minAmount = THRESHOLDS.LARGE_TRANSACTION_MIN;

  const largeEscrows = await Escrow.find({
    amount: { $gte: minAmount },
    createdAt: { $gte: scanUntil },
  }).populate("buyer seller payment");

  for (const escrow of largeEscrows) {
    const amount = escrow.amount;
    let severity = "medium";
    if (amount >= THRESHOLDS.LARGE_TRANSACTION_CRITICAL) severity = "critical";
    else if (amount >= minAmount * 3) severity = "high";

    const score = SCORE_WEIGHTS.large_transaction[severity];
    const tier = resolveSeverity(score);

    const existing = await EscrowAnomaly.findOne({ escrow: escrow._id, category: "large_transaction" });
    if (existing) continue;

    anomalies.push({
      anomalyId: generateAnomalyId("large_transaction"),
      category: "large_transaction",
      severity: tier,
      riskScore: score,
      status: "detected",
      targetUser: escrow.buyer,
      targetUserRole: "buyer",
      escrow: escrow._id,
      summary: `Large escrow of KES ${amount.toLocaleString("en-KE")} — ${severity} risk`,
      evidence: {
        amount,
        carModel: escrow.car?.toString() || "unknown",
        paymentMethod: escrow.payment?.mode || "unknown",
        threshold: minAmount,
        multiplier: (amount / minAmount).toFixed(1),
      },
      riskFactors: [
        { factor: "amount_vs_threshold", score, detail: `KES ${amount.toLocaleString("en-KE")} vs threshold KES ${minAmount.toLocaleString("en-KE")}` },
      ],
      detectionRules: ["large_transaction_amount_check"],
    });

    await upsertRiskScore(escrow.buyer, "buyer", { largeTransactionCount: 1 });
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: RAPID REFUND
// =============================
const detectRapidRefunds = async (scanUntil) => {
  const anomalies = [];
  const maxHours = THRESHOLDS.RAPID_REFUND_HOURS;
  const refundCutoff = new Date(Date.now() - maxHours * 3600000);

  const refundedEscrows = await Escrow.find({
    status: { $in: ["refunded"] },
    fundedAt: { $gte: scanUntil },
    refundedAt: { $ne: null },
  }).populate("buyer seller");

  for (const escrow of refundedEscrows) {
    if (!escrow.fundedAt || !escrow.refundedAt) continue;
    const hoursToRefund = (escrow.refundedAt - escrow.fundedAt) / 3600000;
    if (hoursToRefund > maxHours) continue;

    let severity = "medium";
    if (hoursToRefund <= 1) severity = "critical";
    else if (hoursToRefund <= 6) severity = "high";
    else if (hoursToRefund <= 12) severity = "medium";

    const score = SCORE_WEIGHTS.rapid_refund[severity];
    const tier = resolveSeverity(score);

    const existing = await EscrowAnomaly.findOne({ escrow: escrow._id, category: "rapid_refund" });
    if (existing) continue;

    anomalies.push({
      anomalyId: generateAnomalyId("rapid_refund"),
      category: "rapid_refund",
      severity: tier,
      riskScore: score,
      status: "detected",
      targetUser: escrow.buyer || escrow.seller,
      targetUserRole: escrow.buyer ? "buyer" : "seller",
      escrow: escrow._id,
      relatedEscrows: [],
      summary: `Rapid refund in ${hoursToRefund.toFixed(1)}h of funding — KES ${escrow.amount.toLocaleString("en-KE")}`,
      evidence: {
        fundedAt: escrow.fundedAt,
        refundedAt: escrow.refundedAt,
        hoursToRefund: Math.round(hoursToRefund * 10) / 10,
        amount: escrow.amount,
        refundReason: escrow.disputeReason || "unknown",
      },
      riskFactors: [
        { factor: "hours_to_refund", score, detail: `${hoursToRefund.toFixed(1)}h vs ${maxHours}h threshold` },
      ],
      detectionRules: ["rapid_refund_time_window_check"],
    });

    await upsertRiskScore(escrow.buyer, "buyer", { rapidRefundCount: 1, recentRefunds30d: 1, refundedEscrows: 1 });
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: MULTIPLE DISPUTES
// =============================
const detectMultipleDisputes = async (scanUntil) => {
  const anomalies = [];
  const minDisputes = THRESHOLDS.MULTIPLE_DISPUTES_COUNT;

  const disputeCounts = await Dispute.aggregate([
    { $match: { createdAt: { $gte: scanUntil } } },
    {
      $group: {
        _id: "$openedBy",
        count: { $sum: 1 },
        escrows: { $addToSet: "$escrow" },
        disputeIds: { $addToSet: "$_id" },
      },
    },
    { $match: { count: { $gte: minDisputes } } },
  ]);

  for (const group of disputeCounts) {
    let severity = "medium";
    if (group.count >= 5) severity = "critical";
    else if (group.count >= 3) severity = "high";

    const score = SCORE_WEIGHTS.multiple_disputes[severity];
    const tier = resolveSeverity(score);

    const existing = await EscrowAnomaly.findOne({
      targetUser: group._id,
      category: "multiple_disputes",
      status: { $in: ["detected", "under_review", "confirmed"] },
    });
    if (existing) continue;

    anomalies.push({
      anomalyId: generateAnomalyId("multiple_disputes"),
      category: "multiple_disputes",
      severity: tier,
      riskScore: score,
      status: "detected",
      targetUser: group._id,
      targetUserRole: "buyer",
      summary: `User initiated ${group.count} disputes in scan period`,
      evidence: {
        disputeCount: group.count,
        disputeIds: group.disputeIds,
        escrowIds: group.escrows,
      },
      riskFactors: [
        { factor: "dispute_count", score, detail: `${group.count} disputes (threshold: ${minDisputes})` },
      ],
      detectionRules: ["multiple_disputes_count_check"],
    });

    await upsertRiskScore(group._id, "buyer", { disputeInitiatorCount: group.count, recentDisputes30d: group.count, disputedEscrows: group.count });
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: REPEAT OFFENDER
// =============================
const detectRepeatOffenders = async (scanUntil) => {
  const anomalies = [];
  const lookbackDays = THRESHOLDS.REPEAT_OFFENDER_DAYS;
  const lookback = new Date(Date.now() - lookbackDays * 86400000);

  const repeatUsers = await EscrowAnomaly.aggregate([
    { $match: { createdAt: { $gte: lookback }, status: { $in: ["confirmed", "action_taken"] } } },
    { $group: { _id: "$targetUser", count: { $sum: 1 }, categories: { $addToSet: "$category" }, anomalyIds: { $addToSet: "$anomalyId" } } },
    { $match: { count: { $gte: 2 } } },
  ]);

  for (const group of repeatUsers) {
    let severity = "medium";
    if (group.count >= 5) severity = "critical";
    else if (group.count >= 3) severity = "high";

    const score = SCORE_WEIGHTS.repeat_offender[severity];
    const tier = resolveSeverity(score);

    const existing = await EscrowAnomaly.findOne({
      targetUser: group._id,
      category: "repeat_offender",
      status: { $in: ["detected", "under_review", "confirmed"] },
    });
    if (existing) continue;

    const user = await (await import("../models/User.js")).default.findById(group._id).select("name email phone").lean();

    anomalies.push({
      anomalyId: generateAnomalyId("repeat_offender"),
      category: "repeat_offender",
      severity: tier,
      riskScore: score,
      status: "detected",
      targetUser: group._id,
      summary: `${user?.name || "User"} has ${group.count} confirmed anomalies across ${group.categories.length} categories`,
      evidence: {
        totalAnomalies: group.count,
        categories: group.categories,
        anomalyIds: group.anomalyIds,
        userName: user?.name,
        userEmail: user?.email,
      },
      riskFactors: [
        { factor: "repeat_anomaly_count", score, detail: `${group.count} confirmed anomalies in ${lookbackDays}d` },
      ],
      detectionRules: ["repeat_offender_anomaly_count_check"],
    });

    await upsertRiskScore(group._id, "buyer", { abusePatternCount: 1 });
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: ESCROW ABUSE
// =============================
const detectEscrowAbuse = async (scanUntil) => {
  const anomalies = [];
  const minAmount = THRESHOLDS.ESCROW_ABUSE_MIN_AMOUNT;
  const autoReleaseMinHours = THRESHOLDS.ESCROW_ABUSE_AUTO_RELEASE_HOURS;

  const sellerAbuse = await Escrow.aggregate([
    {
      $match: {
        amount: { $gte: minAmount },
        createdAt: { $gte: scanUntil },
        status: { $in: ["funded", "vehicle_confirmed", "released"] },
        seller: { $exists: true },
      },
    },
    {
      $group: {
        _id: "$seller",
        escrowCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        escrowIds: { $addToSet: "$_id" },
        avgAutoReleaseTime: { $avg: { $ifNull: ["$autoReleaseEligibleAt", null] } },
        statuses: { $addToSet: "$status" },
      },
    },
    { $match: { escrowCount: { $gte: 3 } } },
  ]);

  for (const group of sellerAbuse) {
    const hasHighAutoRelease = group.statuses.includes("released") || group.statuses.includes("vehicle_confirmed");
    let severity = "medium";
    let abuseScore = 30;

    if (group.escrowCount >= 8) { severity = "critical"; abuseScore = 80; }
    else if (group.escrowCount >= 5) { severity = "high"; abuseScore = 60; }
    else if (hasHighAutoRelease) { severity = "high"; abuseScore = 55; }

    const score = SCORE_WEIGHTS.escrow_abuse[severity] || abuseScore;
    const tier = resolveSeverity(score);

    const existing = await EscrowAnomaly.findOne({
      targetUser: group._id,
      category: "escrow_abuse",
      status: { $in: ["detected", "under_review", "confirmed"] },
    });
    if (existing) continue;

    anomalies.push({
      anomalyId: generateAnomalyId("escrow_abuse"),
      category: "escrow_abuse",
      severity: tier,
      riskScore: score,
      status: "detected",
      targetUser: group._id,
      targetUserRole: "seller",
      relatedEscrows: group.escrowIds,
      summary: `Seller has ${group.escrowCount} escrows totaling KES ${group.totalAmount.toLocaleString("en-KE")} — high volume pattern`,
      evidence: {
        escrowCount: group.escrowCount,
        totalAmount: group.totalAmount,
        escrowIds: group.escrowIds,
        statuses: group.statuses,
      },
      riskFactors: [
        { factor: "high_escrow_volume", score, detail: `${group.escrowCount} escrows (threshold: 3)` },
        { factor: "total_volume", score: Math.min(20, group.totalAmount / 1000000), detail: `KES ${group.totalAmount.toLocaleString("en-KE")} total` },
      ],
      detectionRules: ["escrow_abuse_high_volume_check"],
    });

    await upsertRiskScore(group._id, "seller", { abusePatternCount: 1, totalEscrows: group.escrowCount });
  }

  return anomalies;
};

// =============================
// 🚀 RUN ALL DETECTIONS
// =============================
export const runAnomalyDetection = async ({ scanWindowHours = 24, saveResults = true } = {}) => {
  const scanUntil = new Date(Date.now() - scanWindowHours * 3600000);
  const allAnomalies = [];
  const results = { detected: 0, categories: {} };

  logInfo("Anomaly detection started", { scanWindowHours, from: scanUntil.toISOString() });

  try {
    const detections = await Promise.allSettled([
      detectLargeTransactions(scanUntil),
      detectRapidRefunds(scanUntil),
      detectMultipleDisputes(scanUntil),
      detectRepeatOffenders(scanUntil),
      detectEscrowAbuse(scanUntil),
    ]);

    for (const result of detections) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allAnomalies.push(...result.value);
      }
    }

    if (saveResults && allAnomalies.length > 0) {
      await EscrowAnomaly.insertMany(allAnomalies, { ordered: false });
    }

    for (const anomaly of allAnomalies) {
      results.categories[anomaly.category] = (results.categories[anomaly.category] || 0) + 1;
      await recalculateRiskScore(anomaly.targetUser, anomaly.targetUserRole || "buyer");
    }

    results.detected = allAnomalies.length;
    logInfo("Anomaly detection complete", { detected: results.detected, categories: results.categories });
    return results;
  } catch (err) {
    logError("Anomaly detection engine failed", err);
    throw err;
  }
};

// =============================
// 🔍 RUN SINGLE CHECK ON ESCROW
// =============================
export const checkEscrowForAnomalies = async (escrowId) => {
  const escrow = await Escrow.findById(escrowId).populate("buyer seller");
  if (!escrow) throw new Error("Escrow not found");

  const anomalies = [];

  const existingLarge = await EscrowAnomaly.findOne({ escrow: escrowId, category: "large_transaction" });
  if (!existingLarge && escrow.amount >= THRESHOLDS.LARGE_TRANSACTION_MIN) {
    let severity = escrow.amount >= THRESHOLDS.LARGE_TRANSACTION_CRITICAL ? "critical" : "high";
    anomalies.push({
      anomalyId: generateAnomalyId("large_transaction"),
      category: "large_transaction",
      severity: resolveSeverity(SCORE_WEIGHTS.large_transaction[severity]),
      riskScore: SCORE_WEIGHTS.large_transaction[severity],
      targetUser: escrow.buyer._id,
      targetUserRole: "buyer",
      escrow: escrowId,
      summary: `Large escrow of KES ${escrow.amount.toLocaleString("en-KE")}`,
      evidence: { amount: escrow.amount },
      riskFactors: [{ factor: "amount", score: SCORE_WEIGHTS.large_transaction[severity], detail: `KES ${escrow.amount}` }],
      detectionRules: ["realtime_large_transaction_check"],
    });
  }

  const disputeCount = await Dispute.countDocuments({ openedBy: escrow.buyer._id });
  if (disputeCount >= THRESHOLDS.MULTIPLE_DISPUTES_COUNT) {
    const existingMulti = await EscrowAnomaly.findOne({ targetUser: escrow.buyer._id, category: "multiple_disputes", status: { $in: ["detected", "under_review", "confirmed"] } });
    if (!existingMulti) {
      anomalies.push({
        anomalyId: generateAnomalyId("multiple_disputes"),
        category: "multiple_disputes",
        severity: "medium",
        riskScore: SCORE_WEIGHTS.multiple_disputes.medium,
        targetUser: escrow.buyer._id,
        targetUserRole: "buyer",
        summary: `Buyer has ${disputeCount} total disputes`,
        evidence: { disputeCount },
        riskFactors: [{ factor: "dispute_count", score: SCORE_WEIGHTS.multiple_disputes.medium, detail: `${disputeCount} disputes` }],
        detectionRules: ["realtime_dispute_count_check"],
      });
    }
  }

  if (anomalies.length > 0) {
    await EscrowAnomaly.insertMany(anomalies, { ordered: false });
    for (const a of anomalies) {
      await recalculateRiskScore(a.targetUser, a.targetUserRole || "buyer");
    }
  }

  return anomalies;
};

// =============================
// 📊 GET DASHBOARD METRICS
// =============================
export const getAnomalyDashboard = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000);

  const [
    totalAnomalies,
    byStatus,
    byCategory,
    bySeverity,
    recentAnomalies,
    topRiskUsers,
    recentActivity,
  ] = await Promise.all([
    EscrowAnomaly.countDocuments({}),
    EscrowAnomaly.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    EscrowAnomaly.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    EscrowAnomaly.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }]),
    EscrowAnomaly.find({ createdAt: { $gte: thirtyDaysAgo } }).sort({ createdAt: -1 }).limit(10).populate("targetUser", "name email phone").lean(),
    EscrowRiskScore.find({}).sort({ riskScore: -1 }).limit(10).populate("user", "name email phone").lean(),
    EscrowAnomaly.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const openCount = (byStatus.find((s) => s._id === "detected")?.count || 0) +
    (byStatus.find((s) => s._id === "under_review")?.count || 0);

  return {
    totalAnomalies,
    openAnomalies: openCount,
    resolvedAnomalies: byStatus.find((s) => s._id === "action_taken")?.count || 0,
    dismissedAnomalies: byStatus.find((s) => s._id === "dismissed")?.count || 0,
    statusBreakdown: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    categoryBreakdown: Object.fromEntries(byCategory.map((c) => [c._id, c.count])),
    severityBreakdown: Object.fromEntries(bySeverity.map((s) => [s._id, s.count])),
    recentAnomalies,
    topRiskUsers,
    activityTrend: recentActivity.map((d) => ({ date: d._id, count: d.count })),
  };
};
