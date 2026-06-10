import Event from "../models/Event.js";

// =============================
// 📊 TRACK EVENT
// =============================

export const trackEvent = async ({
  userId,
  sessionId,
  eventType,
  targetType,
  targetId,
  data = {},
  ipAddress,
  userAgent,
  referrer,
  url,
  deviceType,
  browser,
  os,
}) => {
  try {
    await Event.create({
      user: userId,
      sessionId,
      eventType,
      targetType,
      targetId,
      data,
      ipAddress,
      userAgent,
      referrer,
      url,
      deviceType,
      browser,
      os,
    });
  } catch (error) {
    console.error("Error tracking event:", error);
  }
};

// =============================
// 🔍 SEARCH EVENTS
// =============================

export const trackSearch = async (userId, sessionId, searchData, ipAddress, userAgent) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "search_performed",
    targetType: "search",
    data: searchData,
    ipAddress,
    userAgent,
  });
};

// =============================
// 🚗 VEHICLE EVENTS
// =============================

export const trackVehicleView = async (userId, sessionId, carId, ipAddress, userAgent, url) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "vehicle_viewed",
    targetType: "car",
    targetId: carId,
    data: { carId },
    ipAddress,
    userAgent,
    url,
  });
};

export const trackFavoriteAdded = async (userId, sessionId, carId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "vehicle_favorite_added",
    targetType: "car",
    targetId: carId,
    data: { carId },
  });
};

export const trackFavoriteRemoved = async (userId, sessionId, carId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "vehicle_favorite_removed",
    targetType: "car",
    targetId: carId,
    data: { carId },
  });
};

// =============================
// 💰 LEAD EVENTS
// =============================

export const trackLeadCreated = async (userId, sessionId, carId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "lead_created",
    targetType: "car",
    targetId: carId,
    data: { carId },
  });
};

export const trackOfferSent = async (userId, sessionId, carId, amount) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "offer_sent",
    targetType: "car",
    targetId: carId,
    data: { carId, amount },
  });
};

// =============================
// 🎯 AUCTION EVENTS
// =============================

export const trackAuctionJoined = async (userId, sessionId, carId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "auction_joined",
    targetType: "auction",
    targetId: carId,
    data: { carId },
  });
};

export const trackBidPlaced = async (userId, sessionId, carId, amount) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "bid_placed",
    targetType: "auction",
    targetId: carId,
    data: { carId, amount },
  });
};

export const trackOutbid = async (userId, sessionId, carId, currentBid) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "outbid",
    targetType: "auction",
    targetId: carId,
    data: { carId, currentBid },
  });
};

// =============================
// 🔒 ESCROW EVENTS
// =============================

export const trackEscrowStarted = async (userId, sessionId, escrowId, amount) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "escrow_started",
    targetType: "escrow",
    targetId: escrowId,
    data: { escrowId, amount },
  });
};

export const trackEscrowFunded = async (userId, sessionId, escrowId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "escrow_funded",
    targetType: "escrow",
    targetId: escrowId,
    data: { escrowId },
  });
};

export const trackEscrowReleased = async (userId, sessionId, escrowId) => {
  return await trackEvent({
    userId,
    sessionId,
    eventType: "escrow_released",
    targetType: "escrow",
    targetId: escrowId,
    data: { escrowId },
  });
};

// =============================
// 📊 EVENT ANALYTICS
// =============================

export const getEventAnalytics = async (startDate, endDate, eventType = null) => {
  const filter = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (eventType) {
    filter.eventType = eventType;
  }

  const events = await Event.find(filter).sort({ createdAt: -1 });

  // Group by event type
  const byEventType = {};
  events.forEach(event => {
    if (!byEventType[event.eventType]) {
      byEventType[event.eventType] = 0;
    }
    byEventType[event.eventType]++;
  });

  // Group by user
  const byUser = {};
  events.forEach(event => {
    if (event.user) {
      if (!byUser[event.user.toString()]) {
        byUser[event.user.toString()] = 0;
      }
      byUser[event.user.toString()]++;
    }
  });

  return {
    totalEvents: events.length,
    byEventType,
    uniqueUsers: Object.keys(byUser).length,
    byUser,
  };
};
