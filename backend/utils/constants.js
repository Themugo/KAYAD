// utils/constants.js

// =============================
// 👤 USER ROLES
// =============================
export const ROLES = Object.freeze({
  USER: "user",
  DEALER: "dealer",
  ADMIN: "admin",
});

// =============================
// 🏷 BID STATUS
// =============================
export const BID_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  OUTBID: "outbid",
  FAILED: "failed",
});

// =============================
// 💳 PAYMENT STATUS
// =============================
export const PAYMENT_STATUS = Object.freeze({
  INITIATED: "initiated",
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  TIMEOUT: "timeout",
});

// =============================
// 💰 PAYMENT TYPES
// =============================
export const PAYMENT_TYPE = Object.freeze({
  BID: "bid",
  PURCHASE: "purchase",
});

// =============================
// 🚗 AUCTION STATUS
// =============================
export const AUCTION_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  LIVE: "live",
  ENDED: "ended",
  CANCELLED: "cancelled",
});

// =============================
// 🏦 ESCROW STATUS
// =============================
export const ESCROW_STATUS = Object.freeze({
  HELD: "held",
  RELEASED: "released",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
});

// =============================
// 🔔 NOTIFICATION TYPES
// =============================
export const NOTIFICATION_TYPE = Object.freeze({
  GENERAL: "general",
  AUCTION: "auction",
  PAYMENT: "payment",
  SYSTEM: "system",
});

// =============================
// 🚨 ALERT TYPES
// =============================
export const ALERT_TYPE = Object.freeze({
  PAYMENT: "payment",
  FRAUD: "fraud",
  AUCTION: "auction",
  SYSTEM: "system",
});

// =============================
// 🚨 ALERT SEVERITY
// =============================
export const ALERT_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
});