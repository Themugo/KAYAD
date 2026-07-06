// backend/src/utils/premiumError.js
import { AppError } from "./AppError.js;

export function formatError(err, req) {
  return {
    success: false,
    error: {
      id: req?.requestId || null,
      type: err.name || "InternalServerError",
      message: err.isOperational ? err.message : (process.env.NODE_ENV === "production" ? "An error occurred" : (err.message || "Internal Server Error")),
    },
    timestamp: new Date().toISOString(),
    path: req?.originalUrl || null,
  };
}