// middleware/notFound.js
import { logWarn } from "../utils/logger.js";

const notFound = (req, res, next) => {
  const message = `Route not found: ${req.originalUrl}`;

  logWarn("Route not found", {
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId || "N/A",
    user: req.user?.id || "guest",
  });

  // =============================
  // 📦 RESPONSE (DIRECT - NO NEXT)
  // =============================
  res.status(404).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && {
      path: req.originalUrl,
      method: req.method,
    }),
  });
};

export default notFound;
