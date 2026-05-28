// utils/helpers.js

import crypto from "crypto";

// =============================
// 🔢 SECURE RANDOM ID
// =============================
export const generateId = (length = 16) => {
  return crypto.randomBytes(length).toString("hex");
};

// =============================
// 🔥 UNIQUE BIDDER TAG
// =============================
export const generateBidderTag = () => {
  const random = crypto.randomBytes(2).toString("hex"); // 4 chars
  const number = Math.floor(1000 + Math.random() * 9000);
  return `Bidder-${number}-${random}`;
};

// =============================
// ⏱ TIME LEFT (RAW)
// =============================
export const getTimeLeft = (endTime) => {
  if (!endTime) return 0;
  return Math.max(new Date(endTime).getTime() - Date.now(), 0);
};

// =============================
// ⏱ FORMAT TIME LEFT (UX)
// =============================
export const formatTimeLeft = (ms) => {
  if (ms <= 0) return "Ended";

  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};