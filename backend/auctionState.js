// backend/auctionState.js

const auctionState = new Map();

// =============================
// 📦 SET STATE
// =============================
export const setAuctionState = (carId, data) => {
  const existing = auctionState.get(carId) || {};

  auctionState.set(carId, {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  });
};

// =============================
// 📦 GET STATE
// =============================
export const getAuctionState = (carId) => {
  return auctionState.get(carId) || null;
};

// =============================
// 🗑 CLEAR STATE
// =============================
export const clearAuctionState = (carId) => {
  auctionState.delete(carId);
};

// =============================
// 📊 ALL STATES
// =============================
export const getAllAuctionStates = () => {
  return Object.fromEntries(auctionState);
};

// =============================
// 🧹 AUTO CLEANUP (VERY IMPORTANT)
// =============================
export const cleanupAuctionState = () => {
  const now = Date.now();

  for (const [carId, state] of auctionState.entries()) {
    if (state.endTime && state.endTime < now) {
      auctionState.delete(carId);
    }
  }
};

// run cleanup every minute
setInterval(cleanupAuctionState, 60 * 1000);
