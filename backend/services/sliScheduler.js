// backend/services/sliScheduler.js
// Periodically computes SLIs, updates error budgets, evaluates alert policies

import { computeAllSlis } from "./sliTrackingService.js";
import { updateErrorBudgets } from "./sliTrackingService.js";
import { evaluateAllAlertPolicies } from "../config/alertPolicies.js";
import { logInfo, logError } from "../utils/logger.js";

let intervalHandle = null;

const SLI_COMPUTE_INTERVAL_MS = 60000;  // every 1 minute
const BUDGET_UPDATE_INTERVAL_MS = 300000;  // every 5 minutes
const ALERT_EVAL_INTERVAL_MS = 60000;  // every 1 minute

async function computeSliCycle() {
  try {
    const sliValues = computeAllSlis();
    logInfo("SLI computation cycle complete", {
      slis: Object.keys(sliValues).length,
    });
    return sliValues;
  } catch (err) {
    logError("SLI computation cycle failed", { error: err.message });
    return null;
  }
}

async function budgetUpdateCycle() {
  try {
    const sliValues = computeAllSlis();
    if (!sliValues) return;
    const results = await updateErrorBudgets(sliValues);
    const statuses = results.map(r => `${r.sloId}=${r.status}`);
    logInfo("Error budget update cycle complete", {
      updated: results.length,
      statuses: statuses.join(", "),
    });
  } catch (err) {
    logError("Error budget update cycle failed", { error: err.message });
  }
}

async function alertEvalCycle() {
  try {
    const results = await evaluateAllAlertPolicies();
    if (results.totalFired > 0) {
      logInfo("Alert policies triggered", {
        fired: results.totalFired,
        burnRate: results.burnRateAlerts.length,
        budget: results.budgetAlerts.length,
      });
    }
  } catch (err) {
    logError("Alert policy evaluation cycle failed", { error: err.message });
  }
}

export function startSliScheduler() {
  if (intervalHandle) {
    logInfo("SLI scheduler already running");
    return;
  }

  logInfo("Starting SLI scheduler", {
    sliIntervalMs: SLI_COMPUTE_INTERVAL_MS,
    budgetIntervalMs: BUDGET_UPDATE_INTERVAL_MS,
    alertIntervalMs: ALERT_EVAL_INTERVAL_MS,
  });

  // Immediate first run
  computeSliCycle().then(sliValues => {
    if (sliValues) {
      updateErrorBudgets(sliValues).then(() => {
        evaluateAllAlertPolicies();
      });
    }
  });

  // Periodic SLI computation
  setInterval(computeSliCycle, SLI_COMPUTE_INTERVAL_MS);

  // Periodic error budget updates
  setInterval(budgetUpdateCycle, BUDGET_UPDATE_INTERVAL_MS);

  // Periodic alert policy evaluation
  setInterval(alertEvalCycle, ALERT_EVAL_INTERVAL_MS);

  intervalHandle = true; // track that we started
}

export function stopSliScheduler() {
  if (intervalHandle) {
    intervalHandle = null;
    logInfo("SLI scheduler stopped");
  }
}

export default { startSliScheduler, stopSliScheduler };
