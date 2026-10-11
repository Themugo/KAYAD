import { logError, logWarn } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  // Once headers are committed, delegate to Express instead of sending again.
  if (res.headersSent || res.writableEnded) return next(err);
  // Same .status fallback as asyncHandler.js, for any error that reaches this
  // handler without passing through asyncHandler first (e.g. next(err) called
  // directly). See the comment there for why this fallback exists.
  let statusCode = err.statusCode || err.status || res.statusCode || 500;
  if (statusCode === 200) statusCode = 500;

  // Error classification (route-schema triage, docs/audits/21): two database errors are caused by the request, not by the
  // server, when nothing upstream assigned a status. They used to surface as 500 and hide real server faults in the crawl.
  //   22P02 invalid_text_representation — a malformed id (e.g. "my-tasks" where a UUID is expected) → 400
  //   PGRST116 — `.single()` matched no row for the requested id → 404
  // Missing tables/columns (42P01/42703/PGRST205) deliberately stay 500: they are deployment/schema defects.
  const dbCode = err?.code || err?.cause?.code;
  if (statusCode === 500 && !err.statusCode && !err.status) {
    if (dbCode === "22P02") { err = Object.assign(new Error("Invalid identifier"), { details: undefined }); statusCode = 400; }
    else if (dbCode === "PGRST116") { err = Object.assign(new Error("Not found"), { details: undefined }); statusCode = 404; }
  }

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
  const isNonProduction = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const clientMessage =
    statusCode >= 500 ? (isNonProduction ? err.message || "Server Error" : "Internal server error") : err.message || "Error";

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(requestId && { requestId }),
    ...(err.details && { details: err.details }),
    // M-8 FIX: Default to production behavior (no stack traces) when NODE_ENV is unset.
    // Previously the default was "development", which would leak stack traces in production.
    ...(isNonProduction ? {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    } : {}),
  });
};

export default errorHandler;
