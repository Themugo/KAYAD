import User from "../models/User.js";
import jwt from "jsonwebtoken";

// =============================
// 🔐 CONFIG
// =============================
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
if (!process.env.REFRESH_TOKEN_SECRET) throw new Error("REFRESH_TOKEN_SECRET is required");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

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
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0,
    },
    REFRESH_SECRET,
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

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
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

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      tokenVersion: 0,
    });

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
      decoded = jwt.verify(token, REFRESH_SECRET);
    } catch {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.id);

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
    const { name, phone, location, businessName, bio } = req.body;

    const allowedUpdates = {};
    if (name)         allowedUpdates.name = name.trim();
    if (phone)        allowedUpdates.phone = phone.trim();
    if (location)     allowedUpdates.location = location.trim();
    if (businessName) allowedUpdates.businessName = businessName.trim();
    if (bio !== undefined) allowedUpdates.bio = bio.trim();

    const user = await (await import("../models/User.js")).default
      .findByIdAndUpdate(req.user.id, allowedUpdates, { new: true, runValidators: true })
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
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const User = (await import("../models/User.js")).default;
    const bcrypt = (await import("bcryptjs")).default;

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
