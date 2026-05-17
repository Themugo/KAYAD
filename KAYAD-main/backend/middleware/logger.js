// middleware/logger.js

import crypto from "crypto";

const logger = (req, res, next) => {
  const start = Date.now();

  // =============================
  // 🧠 UNIQUE REQUEST ID
  // =============================
  const requestId = crypto.randomUUID();

  req.requestId = requestId;

  // =============================
  // 📡 REQUEST LOG
  // =============================
  console.log("📡 REQUEST:", {
    id: requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user?.id || "guest",
    time: new Date().toISOString(),
  });

  // =============================
  // 📤 RESPONSE LOG (AFTER FINISH)
  // =============================
  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log("📤 RESPONSE:", {
      id: requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || "guest",
    });
  });

  next();
};

export default logger;