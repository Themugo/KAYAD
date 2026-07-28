// backend/infrastructure/logging/child-logger.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Child logger factory for request-scoped logging
// Context injection and request tracking
// ─────────────────────────────────────────────────────────────

// =============================
// 👶 CHILD LOGGER FACTORY
// =============================
export const createChildLogger = (parentLogger, context = {}) => {
  return parentLogger.child(context);
};

// =============================
// 📋 REQUEST-SCOPED LOGGER
// =============================
export const createRequestLogger = (parentLogger, req) => {
  const context = {
    requestId: req.requestId || "unknown",
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
  };

  if (req.user) {
    context.userId = req.user.id;
    context.userRole = req.user.role;
  }

  return parentLogger.child(context);
};

// =============================
// 🔍 TRANSACTION LOGGER
// =============================
export const createTransactionLogger = (parentLogger, transactionId) => {
  return parentLogger.child({ transactionId });
};

// =============================
// 🎯 FEATURE LOGGER
// =============================
export const createFeatureLogger = (parentLogger, featureName) => {
  return parentLogger.child({ feature: featureName });
};
