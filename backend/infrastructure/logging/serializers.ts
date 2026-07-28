// backend/infrastructure/logging/serializers.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Custom serializers for Pino
// Error, request, response, and custom object serialization
// ─────────────────────────────────────────────────────────────

// =============================
// 🔴 ERROR SERIALIZER
// =============================
export const errorSerializer = (err) => {
  if (!err) return null;

  return {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    ...(err.statusCode && { statusCode: err.statusCode }),
    ...(err.status && { status: err.status }),
  };
};

// =============================
// 📋 REQUEST SERIALIZER
// =============================
export const requestSerializer = (req) => {
  if (!req) return null;

  return {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
    requestId: req.requestId,
    ...(req.user && { userId: req.user.id }),
  };
};

// =============================
// 📤 RESPONSE SERIALIZER
// =============================
export const responseSerializer = (res) => {
  if (!res) return null;

  return {
    statusCode: res.statusCode,
    ...(res.statusMessage && { statusMessage: res.statusMessage }),
  };
};

// =============================
// 🔑 CUSTOM OBJECT SERIALIZER
// =============================
export const objectSerializer = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  // Remove sensitive fields
  const sensitiveKeys = ["password", "token", "secret", "apiKey", "apiSecret"];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
};

// =============================
// 📦 EXPORT ALL SERIALIZERS
// =============================
export const serializers = {
  err: errorSerializer,
  req: requestSerializer,
  res: responseSerializer,
  obj: objectSerializer,
};
