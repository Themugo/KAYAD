// backend/routes/reliabilityRoutes.js
// REST API for SLI/SLO/Error Budget / reliability data

import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  computeSli,
  computeAllSlis,
  evaluateAllSlos,
  updateErrorBudgets,
  getErrorBudgetBySloId,
  getAllErrorBudgets,
  generateReliabilityReport,
} from "../services/sliTrackingService.js";
import { evaluateAllAlertPolicies } from "../config/alertPolicies.js";
import { SLIS, SLOS } from "../config/reliability.js";

const router = Router();

// GET /api/reliability/slis — list all SLI definitions and current values
router.get("/slis", asyncHandler(async (req, res) => {
  const values = computeAllSlis();
  const definitions = Object.entries(SLIS).map(([id, def]) => ({
    id,
    name: def.name,
    description: def.description,
    unit: def.unit,
    direction: def.direction,
    currentValue: values[id] ?? null,
  }));

  res.json({ success: true, data: definitions });
}));

// GET /api/reliability/slis/:sliId — specific SLI
router.get("/slis/:sliId", asyncHandler(async (req, res) => {
  const sliDef = SLIS[req.params.sliId];
  if (!sliDef) {
    return res.status(404).json({ success: false, message: "SLI not found" });
  }
  const value = computeSli(req.params.sliId);
  res.json({ success: true, data: { ...sliDef, currentValue: value } });
}));

// GET /api/reliability/slos — list all SLO definitions and compliance
router.get("/slos", asyncHandler(async (req, res) => {
  const sliValues = computeAllSlis();
  const evaluations = evaluateAllSlos(sliValues);
  res.json({ success: true, data: evaluations });
}));

// GET /api/reliability/slos/:sloId — specific SLO
router.get("/slos/:sloId", asyncHandler(async (req, res) => {
  const slo = SLOS.find(s => s.id === req.params.sloId);
  if (!slo) {
    return res.status(404).json({ success: false, message: "SLO not found" });
  }
  const sliValues = computeAllSlis();
  const evaluation = (await import("../services/sliTrackingService.js")).evaluateSlo(slo, sliValues[slo.sliId]);
  res.json({ success: true, data: { ...slo, evaluation } });
}));

// GET /api/reliability/error-budgets — all error budgets
router.get("/error-budgets", protect, adminOnly, asyncHandler(async (req, res) => {
  const budgets = await getAllErrorBudgets();
  res.json({ success: true, data: budgets });
}));

// GET /api/reliability/error-budgets/:sloId — specific error budget
router.get("/error-budgets/:sloId", protect, adminOnly, asyncHandler(async (req, res) => {
  const budget = await getErrorBudgetBySloId(req.params.sloId);
  if (!budget) {
    return res.status(404).json({ success: false, message: "Error budget not found" });
  }
  res.json({ success: true, data: budget });
}));

// POST /api/reliability/error-budgets/refresh — manually trigger budget update
router.post("/error-budgets/refresh", protect, adminOnly, asyncHandler(async (req, res) => {
  const sliValues = computeAllSlis();
  const results = await updateErrorBudgets(sliValues);
  res.json({ success: true, data: results });
}));

// POST /api/reliability/alerts/evaluate — manually trigger alert policy evaluation
router.post("/alerts/evaluate", protect, adminOnly, asyncHandler(async (req, res) => {
  const results = await evaluateAllAlertPolicies();
  res.json({ success: true, data: results });
}));

// GET /api/reliability/report — full reliability report
router.get("/report", protect, adminOnly, asyncHandler(async (req, res) => {
  const report = await generateReliabilityReport();
  res.json({ success: true, data: report });
}));

// GET /api/reliability/health — quick reliability health summary
router.get("/health", asyncHandler(async (req, res) => {
  const sliValues = computeAllSlis();
  const sloEvals = evaluateAllSlos(sliValues);
  const budgets = await getAllErrorBudgets();

  const criticalSlo = sloEvals.filter(s => s.severity === "critical");
  const failingCritical = criticalSlo.filter(s => !s.evaluation.compliant);

  res.json({
    success: true,
    data: {
      status: failingCritical.length === 0 ? "healthy" : "degraded",
      criticalSloCompliant: failingCritical.length === 0,
      failingCriticalSloCount: failingCritical.length,
      totalSloCount: sloEvals.length,
      compliantCount: sloEvals.filter(s => s.evaluation.compliant).length,
      errorBudgetStatus: budgets.reduce((acc, eb) => {
        acc[eb.sloId] = eb.status;
        return acc;
      }, {}),
      sliSummary: sliValues,
    },
  });
}));

export default router;
