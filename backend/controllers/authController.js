import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { formatPhone } from "../utils/format.js";

// =============================
// 🔐 CONFIG (read at function call time, not import time — dotenv hasn't loaded yet)
// =============================

let ACCESS_SECRET, REFRESH_SECRET;
const getAccess  = () => ACCESS_SECRET  || (ACCESS_SECRET  = process.env.JWT_SECRET);
const getRefresh = () => REFRESH_SECRET || (REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET);

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

// =============================
// 🪙 TOKEN GENERATORS
// =============================
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    getAccess(),
    { expiresIn: ACCESS_EXPIRES }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0,
    },
    getRefresh(),
    { expiresIn: REFRESH_EXPIRES }
  );
};

// =============================
// 🍪 COOKIE CONFIG
// =============================
const sendRefreshToken = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// =============================
// 🧾 RESPONSE FORMAT
// =============================
const sendAuthResponse = (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  sendRefreshToken(res, refreshToken);

  return res.json({
    success: true,
    token: accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

// =============================
// 📝 REGISTER
// =============================
export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    const { role: requestedRole } = req.body;
    const role = ["dealer", "broker"].includes(requestedRole) ? requestedRole : "user";
    const extra = role === "dealer" || role === "broker"
      ? { approved: false, businessName: req.body.businessName || "", location: req.body.location || "" }
      : {};
    const user = await User.create({
      name,
      email,
      password,
      role,
      tokenVersion: 0,
      phone: req.body.phone || "",
      emailVerified: false,
      ...extra,
    });

    // 📧 Generate email verification token
    try {
      const crypto = await import("crypto");
      const verifyToken = crypto.randomBytes(32).toString("hex");
      user.emailVerifyToken  = verifyToken;
      user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await user.save();

      // Send verification email (non-blocking — don't fail registration if email fails)
      const { sendVerificationEmail } = await import("../services/email.service.js").catch(() => ({}));
      if (typeof sendVerificationEmail === "function") {
        sendVerificationEmail(user.email, user.name, verifyToken).catch((e) =>
          console.warn("⚠️  Verification email failed:", e.message)
        );
      }
    } catch (emailErr) {
      console.warn("⚠️  Could not generate verify token:", emailErr.message);
    }

    return sendAuthResponse(res, user);

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// =============================
// 🔑 LOGIN
// =============================
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    return sendAuthResponse(res, user);

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// =============================
// 🔁 REFRESH TOKEN (ROTATING)
// =============================
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, getRefresh());
    } catch {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // ⚠️ MUST select +tokenVersion — field is select:false by default
    const user = await User.findById(decoded.id).select("+tokenVersion");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 TOKEN VERSION CHECK (security)
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(403).json({
        success: false,
        message: "Session invalidated",
      });
    }

    // 🔥 ROTATE TOKEN (VERY IMPORTANT)
    return sendAuthResponse(res, user);

  } catch (err) {
    console.error("❌ REFRESH ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Refresh failed",
    });
  }
};

// =============================
// 🚪 LOGOUT (ALL DEVICES)
// =============================
export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      // 🔥 invalidate all refresh tokens
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { tokenVersion: 1 },
      });
    }

    res.clearCookie("refreshToken", {
      path: "/api/auth/refresh",
    });

    res.json({
      success: true,
      message: "Logged out",
    });

  } catch (err) {
    console.error("❌ LOGOUT ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// =============================
// 👤 PROFILE
// =============================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};
// ============================================================
// PUT /api/auth/profile — update own profile
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, businessName, bio, visibility, mpesaBusiness, mpesaBusinessName, bankName, bankAccount, bankBranch } = req.body;

    const updates = {};
    if (name)              updates.name = name.trim();
    if (phone)             updates.phone = formatPhone(phone) || phone.trim();
    if (location)          updates.location = location.trim();
    if (businessName)      updates.businessName = businessName.trim();
    if (bio !== undefined)  updates.bio = bio.trim();
    if (visibility)        updates.visibility = visibility;
    if (mpesaBusiness !== undefined)     updates.mpesaBusiness = mpesaBusiness.trim();
    if (mpesaBusinessName !== undefined) updates.mpesaBusinessName = mpesaBusinessName.trim();
    if (bankName !== undefined)          updates.bankName = bankName.trim();
    if (bankAccount !== undefined)       updates.bankAccount = bankAccount.trim();
    if (bankBranch !== undefined)        updates.bankBranch = bankBranch.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select("-password");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// PUT /api/auth/change-password — change own password
// ============================================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// POST /api/auth/verify-email — verify email with token
// ============================================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpire: { $gt: Date.now() },
    }).select("+emailVerifyToken +emailVerifyExpire");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link. Request a new one.",
      });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// POST /api/auth/resend-verification — resend verification email
// ============================================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+emailVerifyToken +emailVerifyExpire");

    // Always return 200 to avoid user enumeration
    if (!user || user.emailVerified) {
      return res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
    }

    // Generate new token
    const crypto = await import("crypto");
    const verifyToken = crypto.randomBytes(32).toString("hex");
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();

    // Send verification email
    const { sendVerificationReminderEmail } = await import("../services/email.service.js").catch(() => ({}));
    if (typeof sendVerificationReminderEmail === "function") {
      sendVerificationReminderEmail(user.email, user.name, verifyToken).catch((e) =>
        console.warn("⚠️  Resend verification email failed:", e.message)
      );
    }

    res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
