// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  // =============================
  // 🧠 DEFAULT STATUS
  // =============================
  let statusCode = err.statusCode || res.statusCode || 500;

  if (statusCode === 200) statusCode = 500;

  // =============================
  // 🔥 LOGGING (VERY IMPORTANT)
  // =============================
  console.error("🔥 ERROR:", {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id || "guest",
    statusCode,
  });

  // =============================
  // 🧾 MONGOOSE ERRORS
  // =============================

  // Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    err.message = "Invalid ID format";
  }

  // Duplicate key
  if (err.code === 11000) {
    statusCode = 400;

    const field = Object.keys(err.keyValue || {})[0];
    err.message = `${field} already exists`;
  }

  // Validation error
  if (err.name === "ValidationError") {
    statusCode = 400;

    const messages = Object.values(err.errors).map(
      (val) => val.message
    );

    err.message = messages.join(", ");
  }

  // =============================
  // 🔐 JWT ERRORS
  // =============================
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    err.message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    err.message = "Session expired, please login again";
  }

  // =============================
  // 🌐 NETWORK / FETCH ERRORS
  // =============================
  if (err.name === "AbortError") {
    statusCode = 504;
    err.message = "Request timeout";
  }

  // =============================
  // 📦 RESPONSE
  // =============================
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",

    // 🔍 only show stack in dev
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),

    // 🧠 useful debug metadata (dev only)
    ...(process.env.NODE_ENV !== "production" && {
      path: req.originalUrl,
      method: req.method,
    }),
  });
};

export default errorHandler;