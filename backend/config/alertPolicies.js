// backend/config/alertPolicies.js
// SLO-burn-rate alert policies tied to the reliability engineering framework

import { BURN_RATE_POLICIES, ERROR_BUDGET_CONFIG } from "./reliability.js";
import { triggerAlert, ALERT_LEVELS, ALERT_CHANNELS } from "./alerting.js";
import ErrorBudget from "../models/ErrorBudget.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🔥 BURN RATE EVALUATION
// =============================
// Burn rate = how fast error budget is consumed vs expected rate.
// Rate of 1 = consuming at exactly the budgeted rate.
// Rate of 6 = consuming 6x faster than budgeted → will exhaust in window/6.

export async function evaluateBurnRateAlerts() {
  const alerts = [];

  for (const policy of BURN_RATE_POLICIES) {
    try {
      for (const sloId of policy.sloIds) {
        const budget = await ErrorBudget.findOne({ sloId });
        if (!budget) continue;

        const config = ERROR_BUDGET_CONFIG[sloId];
        if (!config) continue;

        const expectedConsumptionRate = budget.totalBudget / (30 * 24 * 60); // per minute
        if (expectedConsumptionRate <= 0) continue;

        const snapshots = budget.history;
        if (snapshots.length < 2) continue;

        const windowMs = policy.windowMinutes * 60 * 1000;
        const cutoff = new Date(Date.now() - windowMs);
        const recentSnapshots = snapshots.filter(s => new Date(s.timestamp) >= cutoff);

        if (recentSnapshots.length < 2) continue;

        const first = recentSnapshots[0];
        const last = recentSnapshots[recentSnapshots.length - 1];
        const consumptionDelta = last.consumedPercent - first.consumedPercent;
        const expectedDelta = (policy.windowMinutes / (30 * 24 * 60)) * 100;
        const actualBurnRate = expectedDelta > 0 ? consumptionDelta / expectedDelta : 0;

        logInfo("Burn rate check", {
          policyId: policy.id,
          sloId,
          consumptionDelta: consumptionDelta.toFixed(2),
          expectedDelta: expectedDelta.toFixed(4),
          actualBurnRate: actualBurnRate.toFixed(2),
          threshold: policy.burnRate,
        });

        const isFiring = recentSnapshots.length >= 2
          && actualBurnRate >= policy.burnRate;

        const existingAlert = budget.alertEvents.find(
          a => a.policyId === policy.id && !a.acknowledged
        );

        if (isFiring && !existingAlert) {
          const severity = policy.severity === "critical" ? ALERT_LEVELS.CRITICAL
            : policy.severity === "high" ? ALERT_LEVELS.HIGH
            : ALERT_LEVELS.MEDIUM;

          const title = `[Burn Rate] ${policy.name} — ${budget.sloName}`;
          const msg = `Error budget consumed ${consumptionDelta.toFixed(1)}% in ${policy.windowMinutes}min `
            + `(${actualBurnRate.toFixed(1)}x burn rate, threshold ${policy.burnRate}x). `
            + `Status: ${budget.status}, consumed: ${budget.consumedPercent.toFixed(1)}%`;

          const alert = await triggerAlert(title, msg, severity, {
            sloId,
            policyId: policy.id,
            burnRate: Math.round(actualBurnRate * 10) / 10,
            consumptionPercent: Math.round(consumptionDelta * 10) / 10,
            windowMinutes: policy.windowMinutes,
          });

          budget.alertEvents.push({
            timestamp: new Date(),
            policyId: policy.id,
            severity,
            message: msg,
            burnRate: Math.round(actualBurnRate * 10) / 10,
          });
          await budget.save();

          alerts.push({ policyId: policy.id, sloId, title, fired: true });
        } else if (!isFiring && existingAlert) {
          existingAlert.acknowledged = true;
          existingAlert.acknowledgedAt = new Date();
          await budget.save();
        }
      }
    } catch (err) {
      logError("Burn rate evaluation failed", { policyId: policy.id, error: err.message });
    }
  }

  return alerts;
}

// =============================
// 💰 ERROR BUDGET STATUS ALERTS
// =============================

export async function evaluateErrorBudgetStatusAlerts() {
  const budgets = await ErrorBudget.find();
  const alerts = [];

  for (const budget of budgets) {
    try {
      const config = ERROR_BUDGET_CONFIG[budget.sloId];
      if (!config) continue;
      const thresholds = config.alertThresholds;

      let shouldAlert = false;
      let level = ALERT_LEVELS.MEDIUM;
      let reason = "";

      if (budget.consumedPercent >= thresholds.exhausted) {
        if (!budget.alertEvents.some(a => a.policyId === "budget-exhausted" && !a.acknowledged)) {
          shouldAlert = true;
          level = ALERT_LEVELS.CRITICAL;
          reason = "Error budget exhausted";
        }
      } else if (budget.consumedPercent >= thresholds.critical) {
        if (!budget.alertEvents.some(a => a.policyId === "budget-critical" && !a.acknowledged)) {
          shouldAlert = true;
          level = ALERT_LEVELS.CRITICAL;
          reason = `Error budget critical (${budget.consumedPercent.toFixed(1)}%)`;
        }
      } else if (budget.consumedPercent >= thresholds.warning) {
        if (!budget.alertEvents.some(a => a.policyId === "budget-warning" && !a.acknowledged)) {
          shouldAlert = true;
          level = ALERT_LEVELS.HIGH;
          reason = `Error budget warning (${budget.consumedPercent.toFixed(1)}%)`;
        }
      }

      if (shouldAlert) {
        const title = `[Error Budget] ${budget.sloName}`;
        const msg = `${reason}. Consumed: ${budget.consumedPercent.toFixed(1)}%, Remaining: ${budget.remainingPercent.toFixed(1)}%`;

        await triggerAlert(title, msg, level, {
          sloId: budget.sloId,
          consumedPercent: budget.consumedPercent,
          remainingPercent: budget.remainingPercent,
          status: budget.status,
        });

        const policyId = reason.includes("exhausted") ? "budget-exhausted"
          : reason.includes("critical") ? "budget-critical"
          : "budget-warning";

        budget.alertEvents.push({
          timestamp: new Date(),
          policyId,
          severity: level,
          message: msg,
        });
        await budget.save();
        alerts.push({ sloId: budget.sloId, policyId, level, fired: true });
      }
    } catch (err) {
      logError("Error budget status evaluation failed", { sloId: budget.sloId, error: err.message });
    }
  }

  return alerts;
}

// =============================
// 🏃 RUN ALL ALERT POLICIES
// =============================

export async function evaluateAllAlertPolicies() {
  const burnRateAlerts = await evaluateBurnRateAlerts();
  const budgetAlerts = await evaluateErrorBudgetStatusAlerts();

  return {
    burnRateAlerts,
    budgetAlerts,
    totalFired: burnRateAlerts.length + budgetAlerts.length,
    timestamp: new Date().toISOString(),
  };
}

export default {
  evaluateBurnRateAlerts,
  evaluateErrorBudgetStatusAlerts,
  evaluateAllAlertPolicies,
};
