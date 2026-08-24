import { logError, logWarn } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode || 500;
  if (statusCode === 200) statusCode = 500;

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
    logError("Server error", logData);
  } else {
    logWarn("Client error", logData);
  }

  if (err.name === "JsonWebTokenError") {
    err = AppError.unauthorized("Invalid token");
    statusCode = 401;
  } else if (err.name === "TokenExpiredError") {
    err = AppError.unauthorized("Session expired, please login again");
    statusCode = 401;
  } else if (err.name === "AbortError") {
    err = AppError.internal("Request timeout");
    statusCode = 504;
  }

  // Never leak internal error messages on 5xx — a Mongoose/Supabase/Redis
  // error message can disclose schema names, connection details, or query
  // internals. 4xx messages are intentional client feedback and pass through.
  const isProd = process.env.NODE_ENV === "production";
  const clientMessage =
    statusCode >= 500 ? (isProd ? "Internal server error" : err.message || "Server Error") : err.message || "Error";

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(requestId && { requestId }),
    ...(err.details && { details: err.details }),
    // M-8 FIX: Default to production behavior (no stack traces) when NODE_ENV is unset.
    // Previously the default was "development", which would leak stack traces in production.
    ...(isProd ? {} : {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    }),
  });
};

export default errorHandler;
