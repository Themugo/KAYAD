import GlobalSettings from "../models/GlobalSettings.js";

export const checkSystemStatus = async (req, res, next) => {
  try {
    const settings = await GlobalSettings.findOne();
    if (!settings) return next();

    if (settings.systemStatus?.isMaintenanceMode) {
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
