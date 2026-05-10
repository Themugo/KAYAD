export const authorize = (...roles) => {
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
      // 👑 ADMIN OVERRIDE
      // =============================
      if (req.user.role === "admin") {
        return next();
      }

      // =============================
      // 🚫 ROLE CHECK
      // =============================
      if (!roles.includes(req.user.role)) {
        console.warn("🚫 ACCESS DENIED:", {
          user: req.user.id,
          role: req.user.role,
          allowed: roles,
          path: req.originalUrl,
          requestId: req.requestId,
        });

        return res.status(403).json({
          success: false,
          message: `Access denied for role: ${req.user.role}`,
        });
      }

      next();

    } catch (err) {
      console.error("❌ AUTHORIZE ERROR:", {
        message: err.message,
        path: req.originalUrl,
        user: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Authorization failed",
      });
    }
  };
};