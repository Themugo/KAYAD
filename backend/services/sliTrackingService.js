// backend/services/sliTrackingService.js
// Computes SLIs from metrics, evaluates SLO compliance, manages error budgets

import { SLIS, SLOS, ERROR_BUDGET_CONFIG } from "../config/reliability.js";
import {
  getCounter, getHistogram, getAllMetrics,
} from "../config/metrics.js";
import ErrorBudget from "../models/ErrorBudget.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 📐 SLI COMPUTATION
// =============================

function computeAvailabilitySli(sliDef) {
  const total = getCounter(sliDef.metric.denominator.counter);
  const good = getCounter(sliDef.metric.numerator.counter);
  return total > 0 ? (good / total) * 100 : 100;
}

function computeErrorRateSli(sliDef) {
  const total = getCounter(sliDef.metric.denominator.counter);
  const badTagged = Object.entries(getAllMetrics().counters || {})
    .filter(([key]) => key.startsWith("http_requests_total:") && /"status":"5/.test(key))
    .reduce((sum, [, val]) => sum + val, 0);
  return total > 0 ? (badTagged / total) * 100 : 0;
}

function computeHistogramQuantileSli(sliDef) {
  const h = getHistogram(sliDef.metric.histogram);
  const q = sliDef.metric.quantile || 0.95;
  const sorted = [];
  const raw = getAllMetrics().histograms;
  for (const [key, val] of Object.entries(raw)) {
    if (key.startsWith(sliDef.metric.histogram)) {
      sorted.push(...(Array.isArray(val) ? val : []));
    }
  }
  if (sorted.length === 0) return 0;
  sorted.sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * q);
  return sorted[Math.min(idx, sorted.length - 1)] || 0;
}

function computeCacheHitRateSli(sliDef) {
  const hits = getCounter(sliDef.metric.numerator.counter);
  const misses = getCounter(sliDef.metric.other.other.counter);
  const total = hits + misses;
  return total > 0 ? (hits / total) * 100 : 0;
}

function computeRatioSli(sliDef) {
  const numeratorKey = sliDef.metric.numerator.counter;
  const denominatorKey = sliDef.metric.denominator.counter;
  const numFilter = sliDef.metric.numerator.filter || {};
  let numerator = 0;
  let denominator = 0;

  if (numFilter.status) {
    const counters = getAllMetrics().counters || {};
    const pattern = typeof numFilter.status === "string"
      ? new RegExp(numFilter.status)
      : numFilter.status;
    for (const [key, val] of Object.entries(counters)) {
      if (key.startsWith(numeratorKey) && pattern.test(key)) {
        numerator += val;
      }
      if (key.startsWith(denominatorKey)) {
        denominator += val;
      }
    }
  } else {
    numerator = getCounter(sliDef.metric.numerator.counter);
    denominator = getCounter(sliDef.metric.denominator.counter);
  }

  return denominator > 0 ? (numerator / denominator) * 100 : 100;
}

function computeQueueBacklogSli() {
  const counters = getAllMetrics().counters || {};
  let maxDepth = 0;
  for (const [key, val] of Object.entries(counters)) {
    if (key.startsWith("queue_depth")) {
      maxDepth = Math.max(maxDepth, val);
    }
  }
  return maxDepth;
}

const SLI_COMPUTORS = {
  availability: computeAvailabilitySli,
  error_rate: computeErrorRateSli,
  latency_p95: computeHistogramQuantileSli,
  latency_p99: (d) => computeHistogramQuantileSli({ ...d, metric: { ...d.metric, quantile: 0.99 } }),
  db_query_latency_p95: computeHistogramQuantileSli,
  cache_hit_rate: computeCacheHitRateSli,
  queue_processing_success_rate: computeRatioSli,
  queue_backlog: computeQueueBacklogSli,
  payment_success_rate: computeRatioSli,
  auction_event_latency_p95: computeHistogramQuantileSli,
};

export function computeSli(sliId) {
  const sliDef = SLIS[sliId];
  if (!sliDef) return null;
  const computor = SLI_COMPUTORS[sliId];
  if (!computor) return null;
  try {
    return computor(sliDef);
  } catch (err) {
    logError("SLI computation failed", { sliId, error: err.message });
    return null;
  }
}

export function computeAllSlis() {
  const results = {};
  for (const sliId of Object.keys(SLIS)) {
    const value = computeSli(sliId);
    if (value !== null) results[sliId] = value;
  }
  return results;
}

// =============================
// 🎯 SLO COMPLIANCE
// =============================

export function evaluateSlo(slo, sliValue) {
  if (sliValue === null || sliValue === undefined) return { compliant: false, error: "no_data" };

  let compliant;
  const op = slo.operator || "gte";
  const target = slo.target;

  switch (op) {
    case "gte": compliant = sliValue >= target; break;
    case "lte": compliant = sliValue <= target; break;
    case "eq": compliant = sliValue === target; break;
    default: compliant = false;
  }

  return {
    compliant,
    sliValue,
    target,
    operator: op,
    gap: op === "lte" ? Math.max(0, sliValue - target) : Math.max(0, target - sliValue),
    unit: SLIS[slo.sliId]?.unit || "",
    direction: SLIS[slo.sliId]?.direction || "",
  };
}

export function evaluateAllSlos(sliValues) {
  return SLOS.map(slo => ({
    ...slo,
    evaluation: evaluateSlo(slo, sliValues[slo.sliId]),
  }));
}

// =============================
// 💰 ERROR BUDGET MANAGEMENT
// =============================

export async function updateErrorBudgets(sliValues) {
  const results = [];

  for (const slo of SLOS) {
    const config = ERROR_BUDGET_CONFIG[slo.id];
    if (!config) continue;

    const sliValue = sliValues[slo.sliId];
    if (sliValue === null || sliValue === undefined) continue;

    try {
      let budget = await ErrorBudget.findOne({ sloId: slo.id });
      const now = new Date();
      const periodStart = new Date(now.getTime() - slo.windowDays * 86400000);

      if (!budget) {
        budget = new ErrorBudget({
          sloId: slo.id,
          sloName: slo.name,
          totalBudget: config.totalBudget,
          unit: config.unit,
          consumedBudget: 0,
          remainingBudget: config.totalBudget,
          consumedPercent: 0,
          remainingPercent: 100,
          status: "healthy",
          periodStart,
          periodEnd: now,
        });
      }

      const evaluation = evaluateSlo(slo, sliValue);
      budget.currentSliValue = sliValue;

      if (!evaluation.compliant) {
        const consumption = config.unit === "percentage"
          ? evaluation.gap
          : evaluation.gap;
        budget.consume(consumption, sliValue);
      }

      budget.periodEnd = now;
      if (!budget.periodStart) budget.periodStart = periodStart;

      budget.addSnapshot();
      await budget.save();
      results.push({ sloId: slo.id, status: budget.status, consumedPercent: budget.consumedPercent });
    } catch (err) {
      logError("Error budget update failed", { sloId: slo.id, error: err.message });
    }
  }

  return results;
}

export async function getErrorBudgetBySloId(sloId) {
  return ErrorBudget.findOne({ sloId });
}

export async function getAllErrorBudgets() {
  return ErrorBudget.find().sort({ sloId: 1 });
}

// =============================
// 📊 RELIABILITY REPORT
// =============================

export async function generateReliabilityReport() {
  const sliValues = computeAllSlis();
  const sloEvaluations = evaluateAllSlos(sliValues);
  const errorBudgets = await getAllErrorBudgets();

  const compliantCount = sloEvaluations.filter(s => s.evaluation.compliant).length;
  const totalSloCount = sloEvaluations.length;

  return {
    generated: new Date().toISOString(),
    slis: sliValues,
    slos: sloEvaluations.map(s => ({
      id: s.id,
      name: s.name,
      target: s.target,
      operator: s.operator,
      tier: s.tier,
      severity: s.severity,
      compliant: s.evaluation.compliant,
      sliValue: s.evaluation.sliValue,
      gap: s.evaluation.gap,
      unit: s.evaluation.unit,
    })),
    errorBudgets: errorBudgets.map(eb => ({
      sloId: eb.sloId,
      sloName: eb.sloName,
      totalBudget: eb.totalBudget,
      consumedPercent: eb.consumedPercent,
      remainingPercent: eb.remainingPercent,
      status: eb.status,
      currentSliValue: eb.currentSliValue,
    })),
    summary: {
      totalSlos: totalSloCount,
      compliantSlos: compliantCount,
      nonCompliantSlos: totalSloCount - compliantCount,
      overallCompliancePercent: totalSloCount > 0
        ? Math.round((compliantCount / totalSloCount) * 100)
        : 100,
      healthyBudgets: errorBudgets.filter(eb => eb.status === "healthy").length,
      warningBudgets: errorBudgets.filter(eb => eb.status === "warning").length,
      criticalBudgets: errorBudgets.filter(eb => eb.status === "critical").length,
      exhaustedBudgets: errorBudgets.filter(eb => eb.status === "exhausted").length,
    },
  };
}

export default {
  computeSli,
  computeAllSlis,
  evaluateSlo,
  evaluateAllSlos,
  updateErrorBudgets,
  getErrorBudgetBySloId,
  getAllErrorBudgets,
  generateReliabilityReport,
};
