// =============================
// 📡 SOCKET EMITTERS (FULL SAFE)
// =============================

// 🔥 SAFE EMIT
const emit = (room, event, data) => {
  try {
    if (!global.io) {
      console.warn("⚠️ Socket not initialized");
      return;
    }

    global.io.to(room).emit(event, data);

  } catch (err) {
    console.error("❌ SOCKET EMIT ERROR:", err.message);
  }
};

// =============================
// 💰 BID UPDATE
// =============================
export const emitBidUpdate = (roomId, payload) => {
  emit(`car_${roomId}`, "bidUpdate", {
    roomId,
    ...payload,
  });
};

// =============================
// 🏁 AUCTION END
// =============================
export const emitAuctionEnd = (roomId, payload) => {
  emit(`car_${roomId}`, "auctionEnded", {
    roomId,
    ...payload,
  });
};

// =============================
// ⏱ AUCTION EXTENDED (🔥 FIXED)
// =============================
export const emitAuctionExtended = (roomId, newEndTime) => {
  emit(`car_${roomId}`, "auctionExtended", {
    roomId,
    newEndTime,
    timeLeft: newEndTime - Date.now(),
  });
};

// =============================
// ⏱ TIMER UPDATE
// =============================
export const emitTimerUpdate = (roomId, timeLeft) => {
  emit(`car_${roomId}`, "auctionTimer", {
    roomId,
    timeLeft,
  });
};

// =============================
// 🔄 LISTING UPDATE (SHOWROOM)
// =============================
export const emitListingUpdate = (carId, data) => {
  try {
    if (!global.io) return;
    global.io.to("showroom").emit("listingUpdate", { carId, ...data });
  } catch (err) {
    console.error("❌ LISTING UPDATE EMIT ERROR:", err.message);
  }
};