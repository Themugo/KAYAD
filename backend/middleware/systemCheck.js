import { getSupabase, isSupabaseConnected } from "../utils/supabase.js";
import {
  MAINTENANCE_CODE, MAINTENANCE_SCOPES, normalizeSystemStatus, classifyRoute, decide, maintenanceResponse,
} from "../config/maintenancePolicy.js";

export { MAINTENANCE_CODE, maintenanceResponse };

let cachedSettings = null;
let cachedAt = 0;
let lastKnownGood = null; // most recent successfully-read state; used only when the store cannot be read (fail-static)
const SETTINGS_TTL_MS = 10_000;
const RETRY_AFTER_ERROR_MS = 2_000; // do not hammer an unreachable store on every request

const loadSystemStatus = async () => {
  const { data, error } = await getSupabase()
    .from("system_settings")
    .select("value")
    .eq("key", "system_status")
    .maybeSingle();

  if (error) throw error;
  return normalizeSystemStatus(data?.value);
};

const messageFor = (settings) => settings.emergencyMessage || MAINTENANCE_SCOPES[settings.maintenanceScope]?.defaultMessage;

export const checkSystemStatus = async (req, res, next) => {
  // In intentionally degraded/local mode there is no control-plane database
  // to consult. Fail open here; database-backed routes retain their own
  // explicit degraded response contract instead of waiting on this middleware.
  if (!isSupabaseConnected()) return next();

  try {
    const now = Date.now();
    if (!cachedSettings || now - cachedAt > SETTINGS_TTL_MS) {
      try {
        cachedSettings = await loadSystemStatus();
        cachedAt = now;
        lastKnownGood = cachedSettings;
      } catch (readErr) {
        // FAIL-STATIC: if we have ever read the state, keep enforcing the last state we knew (an active shutdown stays active; an
        // inactive platform stays open). Only with no prior knowledge at all do we fail open (see the catch below).
        if (!lastKnownGood) throw readErr;
        console.error("systemCheck: settings unreadable, enforcing last known state:", readErr.message);
        cachedSettings = lastKnownGood;
        cachedAt = now - SETTINGS_TTL_MS + RETRY_AFTER_ERROR_MS;
      }
    }

    const settings = cachedSettings;
    if (settings.isMaintenanceMode) {
      const scope = settings.maintenanceScope;
      const message = messageFor(settings);
      req.maintenance = { active: true, scope, message };
      // Pre-authentication decision (identity unknown): global shutdown refuses everything except the session endpoints and the
      // control plane, which authenticate the caller themselves; scoped maintenance pauses only anonymous registration here.
      // Identity-based decisions are made where identity is known: protect(), login and refresh (middleware/maintenanceEnforcement.js).
      const d = decide({ scope, route: classifyRoute(req.method, req.path), identity: null });
      if (!d.allow) {
        res.setHeader("Retry-After", "60");
        return res.status(503).json(maintenanceResponse(message, scope));
      }
      return next();
    }

    if (req.path?.includes("/bid") && !settings.isAuctionActive) {
      return res.status(403).json({ success: false, message: "Auctions are temporarily paused." });
    }

    if (req.path?.includes("/payment") && !settings.isPaymentsActive) {
      return res.status(403).json({ success: false, message: "Payments are temporarily paused." });
    }

    next();
  } catch (err) {
    console.error("systemCheck error:", err.message);
    // Availability of the control-plane setting must never take the marketplace offline. The control API (GET status) reports an
    // unreadable state honestly instead of pretending the platform is operational.
    next();
  }
};

// Called after every local write. It also drops the last-known-good state: that state is now known to be outdated, and enforcing an
// outdated shutdown (e.g. right after a successful recovery) would be worse than reading afresh.
export const invalidateSystemStatusCache = () => {
  cachedSettings = null;
  cachedAt = 0;
  lastKnownGood = null;
};

/** Test hook: forget everything, including the last-known-good state. */
export const __resetSystemStatusState = () => {
  cachedSettings = null;
  cachedAt = 0;
  lastKnownGood = null;
};
