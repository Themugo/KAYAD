import GlobalSettings from "../models/GlobalSettings.ts";

let cachedSettings = null;
let cachedAt = 0;
const SETTINGS_TTL_MS = 10_000;

export const checkSystemStatus = async (req, res, next) => {
  try {
    const now = Date.now();
    if (!cachedSettings || now - cachedAt > SETTINGS_TTL_MS) {
      cachedSettings = await GlobalSettings.findOne().lean();
      cachedAt = now;
    }
    const settings = cachedSettings;
    if (!settings) return next();

    if (settings.systemStatus?.isMaintenanceMode) {
      res.setHeader("Retry-After", "60");
      return res.status(503).json({
        success: false,
        message: settings.systemStatus.emergencyMessage || "System under scheduled maintenance.",
      });
    }

    if (req.path?.includes("/bid") && !settings.systemStatus?.isAuctionActive) {
      return res.status(403).json({ success: false, message: "Auctions are temporarily paused." });
    }

    if (req.path?.includes("/payment") && !settings.systemStatus?.isPaymentsActive) {
      return res.status(403).json({ success: false, message: "Payments are temporarily paused." });
    }

    next();
  } catch (err) {
    console.error("❌ systemCheck error:", err.message);
    next();
  }
};
