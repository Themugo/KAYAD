import Event from "../models/Event.js";
import {
  trackEvent,
  trackSearch,
  trackVehicleView,
  trackFavoriteAdded,
  trackFavoriteRemoved,
  trackLeadCreated,
  trackOfferSent,
  trackAuctionJoined,
  trackBidPlaced,
  trackOutbid,
  trackEscrowStarted,
  trackEscrowFunded,
  trackEscrowReleased,
  getEventAnalytics,
} from "../services/eventTrackingService.js";

// =============================
// 📊 TRACK EVENT
// =============================

export const track = async (req, res) => {
  try {
    const { eventType, targetType, targetId, data } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    await trackEvent({
      userId,
      sessionId,
      eventType,
      targetType,
      targetId,
      data,
      ipAddress: req.ip,
      userAgent: req.headers?.["user-agent"],
      referrer: req.headers?.["referer"],
      url: req.originalUrl,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking event:", error);
    res.status(500).json({ success: false, message: "Failed to track event" });
  }
};

// =============================
// 🔍 TRACK SEARCH
// =============================

export const trackSearchEvent = async (req, res) => {
  try {
    const { searchData } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    await trackSearch(userId, sessionId, searchData, req.ip, req.headers?.["user-agent"]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking search:", error);
    res.status(500).json({ success: false, message: "Failed to track search" });
  }
};

// =============================
// 🚗 TRACK VEHICLE VIEW
// =============================

export const trackVehicleViewEvent = async (req, res) => {
  try {
    const { carId } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    await trackVehicleView(userId, sessionId, carId, req.ip, req.headers?.["user-agent"], req.originalUrl);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking vehicle view:", error);
    res.status(500).json({ success: false, message: "Failed to track vehicle view" });
  }
};

// =============================
// 💰 TRACK OFFER
// =============================

export const trackOfferEvent = async (req, res) => {
  try {
    const { carId, amount } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    await trackOfferSent(userId, sessionId, carId, amount);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking offer:", error);
    res.status(500).json({ success: false, message: "Failed to track offer" });
  }
};

// =============================
// 🎯 TRACK BID
// =============================

export const trackBidEvent = async (req, res) => {
  try {
    const { carId, amount } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    await trackBidPlaced(userId, sessionId, carId, amount);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking bid:", error);
    res.status(500).json({ success: false, message: "Failed to track bid" });
  }
};

// =============================
// 🔒 TRACK ESCROW
// =============================

export const trackEscrowEvent = async (req, res) => {
  try {
    const { escrowId, amount, status } = req.body;
    const userId = req.user?.id || req.user?._id;
    const sessionId = req.sessionID;

    if (status === "started") {
      await trackEscrowStarted(userId, sessionId, escrowId, amount);
    } else if (status === "funded") {
      await trackEscrowFunded(userId, sessionId, escrowId);
    } else if (status === "released") {
      await trackEscrowReleased(userId, sessionId, escrowId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking escrow:", error);
    res.status(500).json({ success: false, message: "Failed to track escrow" });
  }
};

// =============================
// 📊 GET EVENT ANALYTICS
// =============================

export const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, eventType } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await getEventAnalytics(start, end, eventType);

    res.json({ success: true, analytics });
  } catch (error) {
    console.error("Error getting event analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get event analytics" });
  }
};

// =============================
// 📋 GET USER EVENTS
// =============================

export const getUserEvents = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { eventType, limit = 50 } = req.query;

    const filter = { user: userId };
    if (eventType) filter.eventType = eventType;

    const events = await Event.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));

    res.json({ success: true, events });
  } catch (error) {
    console.error("Error getting user events:", error);
    res.status(500).json({ success: false, message: "Failed to get user events" });
  }
};
