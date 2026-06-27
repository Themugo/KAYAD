import { AppError } from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode || 500;

  if (statusCode === 200) statusCode = 500;

  // ─── Logging ───────────────────────────────────────────────
  const requestId = req.requestId || req.headers["x-request-id"] || undefined;
  const logData = {
    requestId,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id || "guest",
    statusCode,
  };

  if (statusCode >= 500) {
    console.error("🔥 ERROR:", logData);
  } else {
    console.warn("⚠️  ERROR:", logData);
  }

  // ─── Mongoose Errors ────────────────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    err.message = "Invalid ID format";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    err.message = `${field} already exists`;
    err = AppError.conflict(err.message);
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((val) => val.message);
    err = AppError.badRequest(messages.join(", "));
  }

  // ─── JWT Errors ─────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    err = AppError.unauthorized("Invalid token");
    statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    err = AppError.unauthorized("Session expired, please login again");
    statusCode = 401;
  }

  // ─── Network / Fetch Errors ─────────────────────────────────
  if (err.name === "AbortError") {
    err = AppError.internal("Request timeout");
    statusCode = 504;
  }

  // ─── Response ────────────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    ...(requestId && { requestId }),
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    }),
  });
};

export default errorHandler;
