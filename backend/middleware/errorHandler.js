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
