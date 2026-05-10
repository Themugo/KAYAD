import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
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

// ⚡ LIGHTWEIGHT USER (FROM TOKEN)
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: req.user,
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