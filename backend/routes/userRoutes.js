// backend/routes/authRoutes.js

import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
// import { validateAuth } from "../middleware/validate.js";

import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

const router = express.Router();

// =============================
// 🔓 PUBLIC ROUTES
// =============================

// 📝 REGISTER
router.post(
  "/register",
  // validateAuth, // enable when stable
  asyncHandler(register)
);

// 🔑 LOGIN
router.post(
  "/login",
  // validateAuth,
  asyncHandler(login)
);

// =============================
// 🔐 PROTECTED ROUTES
// =============================

// 👤 GET PROFILE
router.get(
  "/profile",
  protect,
  asyncHandler(getProfile)
);

// ✏️ UPDATE PROFILE
router.put(
  "/profile",
  protect,
  asyncHandler(updateProfile)
);

// 🔐 CHANGE PASSWORD
router.put(
  "/change-password",
  protect,
  asyncHandler(changePassword)
);

// 🧪 DEBUG (KEEP FOR DEV, REMOVE IN PROD)
router.get(
  "/me",
  protect,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

// =============================
// 🚪 LOGOUT (STATELESS)
// =============================
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out",
  });
});

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Auth route not found",
  });
});

export default router;