import GlobalSettings from "../models/GlobalSettings.js";

export const checkSystemStatus = async (req, res, next) => {
  try {
    const settings = await GlobalSettings.findOne();
    if (!settings) return next();

    if (settings.systemStatus?.isMaintenanceMode) {
      return res.status(503).json({
        message: settings.systemStatus.emergencyMessage || "System under scheduled maintenance.",
      });
    }

    if (req.path?.includes("/bid") && !settings.systemStatus?.isAuctionActive) {
      return res.status(403).json({ message: "Auctions are temporarily paused." });
    }

    if (req.path?.includes("/payment") && !settings.systemStatus?.isPaymentsActive) {
      return res.status(403).json({ message: "Payments are temporarily paused." });
    }

    next();
  } catch {
    next();
  }
};
