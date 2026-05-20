// backend/middleware/isAdmin.js

// =============================
// 🧠 FLEXIBLE ROLE CHECK (UPGRADED)
// =============================
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    try {
      // =============================
      // 🔐 AUTH CHECK
      // =============================
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - login required",
        });
      }

      // =============================
      // 👑 SUPER ADMIN OVERRIDE
      // =============================
      if (req.user.role === "admin") {
        return next();
      }

      // =============================
      // 🚫 ROLE CHECK
      // =============================
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied for role: ${req.user.role}`,
        });
      }

      next();

    } catch (err) {
      console.error("❌ ROLE MIDDLEWARE ERROR:", {
        message: err.message,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.id || "guest",
      });

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};

// =============================
// 👑 ADMIN ONLY (CLEAN SHORTCUT)
// =============================
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

// =============================
// 🧑‍💼 DEALER ONLY (ADMIN INCLUDED)
// =============================
export const isDealer = (req, res, next) => {
  if (!req.user || !["dealer", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Dealer access only",
    });
  }

  next();
};