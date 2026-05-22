import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate, validateAuth } from "../middleware/validate.js";
import { resendVerificationSchema } from "../validation/auth.schema.js";

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
  authLimiter,
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
    const ownerEmails = [process.env.WEBHOIST_EMAIL].filter(Boolean).map(e => e.toLowerCase().trim());
    if (ownerEmails.includes(String(user.email || "").toLowerCase().trim())) user.role = "superadmin";
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

// =============================
// 📧 EMAIL VERIFICATION
// =============================
router.get("/verify-email/:token", authLimiter, asyncHandler(verifyEmail));
router.post("/resend-verification", authLimiter, validate(resendVerificationSchema), asyncHandler(resendVerification));

// =============================
// 🔑 PASSWORD RESET (public)
// =============================
router.post("/forgot-password", authLimiter, asyncHandler(forgotPassword));
router.post("/reset-password",  authLimiter, asyncHandler(resetPassword));

export default router;
