// backend/services/escrowAnomalyCron.js - Escrow anomaly scan cron
// ─────────────────────────────────────────────────────────────
// Runs every 4 hours. Scans recent escrows for anomaly patterns
// and generates risk score updates. Also runs a deep daily scan
// with 7-day window every midnight.
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "../utils/logger.js";
import { runAnomalyDetection } from "./escrowAnomalyDetectionService.js";

const ENABLED = process.env.ANOMALY_CRON_ENABLED !== "false";
const SCAN_INTERVAL_HOURS = parseInt(process.env.ANOMALY_SCAN_INTERVAL_HOURS || "4");
const DEEP_SCAN_DAYS = parseInt(process.env.ANOMALY_DEEP_SCAN_DAYS || "7");

let _cronHandle = null;
let _deepCronHandle = null;

const runStandardScan = async () => {
  try {
    const results = await runAnomalyDetection({ scanWindowHours: SCAN_INTERVAL_HOURS });
    logInfo("AnomalyCron: standard scan complete", results);
  } catch (err) {
    logError("AnomalyCron: standard scan failed", err);
  }
};

const runDeepScan = async () => {
  try {
    const results = await runAnomalyDetection({ scanWindowHours: DEEP_SCAN_DAYS * 24 });
    logInfo("AnomalyCron: deep scan complete", results);
  } catch (err) {
    logError("AnomalyCron: deep scan failed", err);
  }
};

export const startAnomalyCron = () => {
  if (!ENABLED) {
    logWarn("AnomalyCron disabled (ANOMALY_CRON_ENABLED=false)");
    return;
  }

  const INTERVAL_MS = SCAN_INTERVAL_HOURS * 3600000;

  runStandardScan();
  _cronHandle = setInterval(runStandardScan, INTERVAL_MS);
  logInfo("AnomalyCron started", { intervalHours: SCAN_INTERVAL_HOURS });

  const DEEP_INTERVAL_MS = 24 * 3600000;
  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  };

  setTimeout(() => {
    runDeepScan();
    _deepCronHandle = setInterval(runDeepScan, DEEP_INTERVAL_MS);
  }, msUntilMidnight());

  logInfo("AnomalyCron: deep scan scheduled for midnight", { lookbackDays: DEEP_SCAN_DAYS });
};

export const stopAnomalyCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
  if (_deepCronHandle) clearInterval(_deepCronHandle);
};
