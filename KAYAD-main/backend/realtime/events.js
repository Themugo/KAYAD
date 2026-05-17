// realtime/events.js

// =============================
// 📡 SAFE SEND (LOW-LEVEL)
// =============================
const safeSend = (client, data) => {
  try {
    if (client && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌ WS SEND ERROR:", err.message);
  }
};

// =============================
// 🧱 BASE EVENT BUILDER
// =============================
const buildEvent = (event, payload = {}, extra = {}) => ({
  event,
  payload,
  timestamp: Date.now(),
  ...extra,
});

// =============================
// 🌍 BROADCAST (ALL USERS)
// =============================
export const broadcast = (wss, event, payload) => {
  const data = buildEvent(event, payload);

  wss.clients.forEach((client) => {
    safeSend(client, data);
  });
};

// =============================
// 🎯 ROOM BROADCAST
// =============================
export const broadcastToRoom = (wss, roomId, event, payload) => {
  const data = buildEvent(event, payload, { roomId });

  wss.clients.forEach((client) => {
    if (
      client.readyState === 1 &&
      client.roomId &&
      client.roomId.toString() === roomId.toString()
    ) {
      safeSend(client, data);
    }
  });
};

// =============================
// 👤 SEND TO USER (NEW 🔥)
// =============================
export const sendToUser = (wss, userId, event, payload) => {
  const data = buildEvent(event, payload, { userId });

  wss.clients.forEach((client) => {
    if (
      client.readyState === 1 &&
      client.userId &&
      client.userId.toString() === userId.toString()
    ) {
      safeSend(client, data);
    }
  });
};

// =============================
// 🚗 BID UPDATE
// =============================
export const emitBidUpdate = (wss, roomId, bidData) => {
  broadcastToRoom(wss, roomId, "BID_UPDATE", bidData);
};

// =============================
// 🏁 AUCTION END
// =============================
export const emitAuctionEnd = (wss, roomId, result = {}) => {
  broadcastToRoom(wss, roomId, "AUCTION_ENDED", {
    ...result,
    endedAt: Date.now(),
  });
};

// =============================
// 💬 CHAT MESSAGE
// =============================
export const emitMessage = (wss, chatId, message) => {
  broadcastToRoom(wss, chatId, "NEW_MESSAGE", message);
};

// =============================
// ✍️ TYPING EVENTS (NEW 🔥)
// =============================
export const emitTyping = (wss, chatId, user) => {
  broadcastToRoom(wss, chatId, "TYPING", { user });
};

export const emitStopTyping = (wss, chatId, userId) => {
  broadcastToRoom(wss, chatId, "STOP_TYPING", { userId });
};

// =============================
// 🚨 ADMIN ALERT
// =============================
export const emitAdminAlert = (wss, message) => {
  broadcast(wss, "ADMIN_ALERT", {
    message,
    level: "info",
  });
};

// =============================
// ⚠️ ERROR EVENT (NEW 🔥)
// =============================
export const emitError = (client, message) => {
  safeSend(client, buildEvent("ERROR", { message }));
};