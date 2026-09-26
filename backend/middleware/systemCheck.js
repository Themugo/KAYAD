import { getSupabase, isSupabaseConnected } from "../utils/supabase.js";

let cachedSettings = null;
let cachedAt = 0;
const SETTINGS_TTL_MS = 10_000;
const DEFAULT_SYSTEM_STATUS = {
  isAuctionActive: true,
  isPaymentsActive: true,
  isGhostCheckActive: true,
  isMaintenanceMode: false,
  emergencyMessage: "System under scheduled maintenance.",
};

const loadSystemStatus = async () => {
  const { data, error } = await getSupabase()
    .from("system_settings")
    .select("value")
    .eq("key", "system_status")
    .maybeSingle();

  if (error) throw error;
  return { ...DEFAULT_SYSTEM_STATUS, ...(data?.value || {}) };
};

export const checkSystemStatus = async (req, res, next) => {
  // In intentionally degraded/local mode there is no control-plane database
  // to consult. Fail open here; database-backed routes retain their own
  // explicit degraded response contract instead of waiting on this middleware.
  if (!isSupabaseConnected()) return next();

  try {
    const now = Date.now();
    if (!cachedSettings || now - cachedAt > SETTINGS_TTL_MS) {
      cachedSettings = await loadSystemStatus();
      cachedAt = now;
    }

    const settings = cachedSettings;
    if (settings.isMaintenanceMode) {
      res.setHeader("Retry-After", "60");
      return res.status(503).json({
        success: false,
        message: settings.emergencyMessage || DEFAULT_SYSTEM_STATUS.emergencyMessage,
      });
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
    // Availability of the control-plane setting must never take the marketplace offline.
    next();
  }
};

export const invalidateSystemStatusCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};
