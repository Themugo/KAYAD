// PHASE 13I — saved-search cron entry point.
// The old tick lived here; it is replaced by savedSearchNotificationJob.js (gated, visibility-aware, consent-aware, idempotent,
// auditable). This file keeps the public exports (`matches`, `startSavedSearchCron`) so existing imports keep working.
import { logInfo, logWarn } from "../utils/logger.js";
import { isSupabaseConnected } from "../utils/supabase.js";
import { matches } from "./savedSearchMatching.js";
import { resolveSavedSearchConfig, runSavedSearchNotificationJob } from "./savedSearchNotificationJob.js";

export { matches };

const CHECK_INTERVAL = 10 * 60 * 1000;

/** Returns { mode } describing what was started. With SAVED_SEARCH_JOB_MODE absent/invalid/off NOTHING is scheduled. */
export const startSavedSearchCron = () => {
  const cfg = resolveSavedSearchConfig();
  if (!cfg.modeValid) logWarn(`SavedSearchCron: SAVED_SEARCH_JOB_MODE="${cfg.rawMode}" is not valid (off|dry_run|enabled); treating as off`);
  if (cfg.mode === "off") {
    logInfo("SavedSearchCron disabled (SAVED_SEARCH_JOB_MODE is off or unset); no saved-search message will be processed or sent");
    return { mode: "off" };
  }
  if (!isSupabaseConnected()) {
    logWarn("SavedSearchCron skipped: Supabase not connected");
    return { mode: "off" };
  }
  const tick = () => runSavedSearchNotificationJob().catch((err) => console.error("❌ SavedSearchCron error:", err.message));
  tick();
  setInterval(tick, CHECK_INTERVAL).unref?.();
  logInfo(`SavedSearchCron: mode=${cfg.mode}, external delivery ${cfg.externalDelivery ? "ENABLED" : "disabled (in-app only)"}, ${CHECK_INTERVAL / 60000}-min cycle`);
  return { mode: cfg.mode, externalDelivery: cfg.externalDelivery };
};
