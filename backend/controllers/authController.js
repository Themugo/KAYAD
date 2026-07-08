import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import RefreshToken from "../models/RefreshToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { formatPhone } from "../utils/format.js";
import * as R from "../utils/response.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { sendNotification } from "../services/notification.service.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { recordFailedAttempt, recordSuccessfulAttempt } from "../middleware/accountLockout.js";

// Email service — imported once at module level. Functions are no-ops
// if the email transport isn't configured (EMAIL_HOST not set).
let emailService = {};
try {
  emailService = await import("../services/email.service.js");
} catch (e) {
  console.warn("⚠️  Email service unavailable:", e.message);
}

const WEBHOIST_EMAIL = process.env.WEBHOIST_EMAIL || "";
const OWNER_EMAILS = WEBHOIST_EMAIL.split(",").map(e => e.trim()).filter(Boolean);
const STAFF_ROLES = [
  "admin",
  "superadmin",
  "marketing",
  "technical_support",
  "hr",
  "accounts",
  "escrow_officer",
  "ad_manager",
  "moderator",
];
const SELLER_ROLES = ["dealer", "individual_seller"];

const isOwnerEmail = (email) =>
  OWNER_EMAILS.includes(
    String(email || "")
      .toLowerCase()
      .trim(),
  );

const serializeUser = (user) => {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const role = isOwnerEmail(raw.email) ? "superadmin" : raw.role;
  delete raw.password;
  delete raw.resetToken;
  delete raw.resetTokenExpire;
  delete raw.emailVerifyToken;
  delete raw.emailVerifyExpire;
  delete raw.tokenVersion;
  return { ...raw, role, isOwner: isOwnerEmail(raw.email) };
};

// =============================
// 🍪 COOKIE CONFIG
// =============================
// NOTE: Using sameSite: "lax" for production to work with Vercel+Render setup.
// Vercel rewrite makes API appear same-origin, so "lax" is appropriate.
// "none" is only needed for truly separate cross-origin domains.
const sendRefreshToken = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sendAccessToken = (res, token) => {
  // FIX: Access token cookie maxAge was 7 days — identical to the refresh token.
  // This meant the access token never effectively expired in the browser even though
  // the JWT payload had a 1h expiry, widening the token-theft window.
  // Now set to 1 hour to match ACCESS_EXPIRES in generateToken.js.
  const ACCESS_COOKIE_MS = parseInt(process.env.ACCESS_COOKIE_MS || "") || 60 * 60 * 1000; // default 1h
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: ACCESS_COOKIE_MS,
  });
};

// =============================
// 🧾 RESPONSE FORMAT
// =============================
const sendAuthResponse = async (res, user, oldRefreshToken = null, req = null) => {
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const safeUser = serializeUser(user);

  // Store new refresh token in database with rotation
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await RefreshToken.create({
    user: user._id,
    token: newRefreshToken,
    tokenVersion: user.tokenVersion || 0,
    deviceId: req?.body?.deviceId || req?.headers["x-device-id"] || "unknown",
    userAgent: req?.headers["user-agent"] || "",
    ipAddress: req?.ip || req?.connection?.remoteAddress || "",
    expiresAt: refreshTokenExpiresAt,
  });

  // Revoke old refresh token if provided (rotation)
  if (oldRefreshToken) {
    await RefreshToken.revokeToken(oldRefreshToken, user._id);
  }

  sendRefreshToken(res, newRefreshToken);
  sendAccessToken(res, accessToken);

  return res.json({
    success: true,
    token: accessToken,
    user: safeUser,
  });
};

const notifyAdminsOfPendingSeller = async (seller) => {
  try {
    const admins = await User.find({ role: { $in: STAFF_ROLES } })
      .select("_id email")
      .lean();

    await Promise.all(
      admins.map((admin) =>
        sendNotification({
          userId: admin._id,
          title: "New seller approval pending",
          message: `${seller.businessName || seller.name} (${seller.email}) registered as a ${seller.role} and is awaiting approval.`,
          type: "system",
          email: admin.email,
        }),
      ),
    );
  } catch (err) {
    console.warn("⚠️  Pending seller admin notification failed:", err.message);
  }
};

// =============================
// 📝 REGISTER
// =============================
export const register = async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return R.error(res, "Name, email, and password are required", 400);
    }
    if (password.length < 8) {
      return R.error(res, "Password must be at least 8 characters", 400);
    }
    if (!/[A-Z]/.test(password)) {
      return R.error(res, "Password must contain at least one uppercase letter", 400);
    }
    if (!/[a-z]/.test(password)) {
      return R.error(res, "Password must contain at least one lowercase letter", 400);
    }
    if (!/\d/.test(password)) {
      return R.error(res, "Password must contain at least one number", 400);
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return R.error(res, "Password must contain at least one special character", 400);
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return R.error(res, "User already exists", 400);
    }

    const rawPhone = (phone || "").trim();
    const validPhone = rawPhone ? formatPhone(rawPhone) || rawPhone : "";

    let referredBy = null;
    const referralCode = req.body.referralCode || req.query.ref;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer && referrer.email !== email) {
        referredBy = referrer._id;
      }
    }

    const requestedRole = req.body.role;
    const role = requestedRole === "dealer" || requestedRole === "individual_seller" ? requestedRole : "user";
    const status = role === "user" ? "approved" : "pending";

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: validPhone,
      status,
      emailVerified: true,
      tokenVersion: 0,
      referredBy,
    });

    if (referredBy) {
      const REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS_KES) || 500;
      try {
        await User.findByIdAndUpdate(referredBy, {
          $inc: { credits: REFERRAL_BONUS, referralEarnings: REFERRAL_BONUS, referralCount: 1 },
        });
        await (await import("../models/Referral.js")).default.create({
          referrer: referredBy,
          referee: user._id,
          status: "credited",
          bonusAmount: REFERRAL_BONUS,
          creditedAt: new Date(),
        });
      } catch (refErr) {
        console.warn("Referral credit failed:", refErr.message);
      }
    }

    try {
      const { sendWelcomeEmail } = emailService;
      if (typeof sendWelcomeEmail === "function") {
        sendWelcomeEmail(user).catch(() => {});
      }
    } catch {
      // non-blocking
    }

    return sendAuthResponse(res.status(201), user);
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    R.error(res, "Registration failed", 500);
  }
};

// =============================
// 🔑 LOGIN
// =============================
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return R.error(res, "Email and password required", 400);
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password +tokenVersion");

    // ─── Check lockout BEFORE password verification ──────
    if (user?.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil((user.lockUntil - new Date()) / 60000);
      return R.error(res, `Account locked. Try again in ${remaining} minute(s).`, 429);
    }

    if (!user || !(await user.matchPassword(password))) {
      // ─── Record failed attempt for IP-based lockout ──────
      recordFailedAttempt(req);

      // ─── Account lockout ────────────────────────────────
      if (user && !user.isBanned) {
        const attempts = (user.loginAttempts || 0) + 1;
        if (attempts >= 5) {
          user.loginAttempts = attempts;
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
          await user.save();
          return R.error(res, "Account locked due to too many attempts. Try again in 15 minutes.", 429);
        }
        user.loginAttempts = attempts;
        await user.save();
      }
      return R.unauthorized(res, "Invalid credentials");
    }

    // ─── Reset lockout on successful login ────────────────
    if (user.loginAttempts || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = null;
    }

    // ─── Record successful attempt for IP-based lockout ──
    recordSuccessfulAttempt(req);

    if (user.isBanned) {
      return R.error(res, "Account suspended", 403);
    }
    if (user.deactivatedAt) {
      return R.error(res, "Account deactivated", 403);
    }

    // ─── Email verification gate ────────────────────────────────
    // Only enforce when verification can actually be completed. If SMTP
    // isn't configured (no EMAIL_HOST) there's no way to receive the
    // verification link, so blocking login would lock everyone out.
    // Override explicitly with REQUIRE_EMAIL_VERIFICATION=true|false.
    const emailConfigured = !!process.env.EMAIL_HOST;
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION
      ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
      : emailConfigured;
    if (requireVerification && !user.emailVerified) {
      return R.error(
        res,
        "Please verify your email before logging in. Check your inbox or request a new verification link.",
        403,
      );
    }

    user.lastLogin = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    return await sendAuthResponse(res, user, null, req);
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    R.error(res, "Login failed", 500);
  }
};

// =============================
// 👤 DEMO LOGIN (one-click, no password)
// =============================
const DEMO_ACCOUNTS = {
  admin:  { email: "admin@kayad.space",  role: "admin" },
  dealer: { email: "dealer@kayad.space", role: "dealer" },
  seller: { email: "seller@kayad.space", role: "individual_seller" },
  buyer:  { email: "buyer@kayad.space",  role: "user" },
};

export const demoLogin = async (req, res) => {
  try {
    const { role } = req.body;
    const demo = DEMO_ACCOUNTS[role];
    if (!demo) {
      return res.status(400).json({ success: false, message: "Invalid demo account" });
    }

    const user = await User.findOne({ email: demo.email, isDemo: true })
      .select("+password +tokenVersion");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Demo account not found. Run seed first.",
      });
    }

    user.lastLogin = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    return await sendAuthResponse(res, user, null, req);
  } catch (err) {
    console.error("❌ DEMO LOGIN ERROR:", err);
    R.error(res, "Demo login failed", 500);
  }
};

// =============================
// 🔁 REFRESH TOKEN (ROTATING)
// =============================
export const refreshToken = async (req, res) => {
  try {
    // Try cookie first, then fall back to Authorization header
    let token = req.cookies.refreshToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return R.unauthorized(res, "No refresh token");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      // Expired or invalid refresh tokens are rejected — no fallback
      const msg =
        err.name === "TokenExpiredError" ? "Refresh token expired — please login again" : "Invalid refresh token";
      return R.error(res, msg, 403);
    }

    // Check if token exists in database and is not revoked
    const storedToken = await RefreshToken.findOne({ token, isRevoked: false });
    if (!storedToken) {
      return R.error(res, "Refresh token not found or revoked", 403);
    }

    const user = await User.findById(decoded.id).select("+tokenVersion");

    if (!user) {
      return R.error(res, "Invalid credentials", 403);
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return R.error(res, "Session invalidated — please login again", 403);
    }

    // Update last used timestamp
    storedToken.lastUsedAt = new Date();
    await storedToken.save();

    // Issue new tokens with rotation (old token is revoked in sendAuthResponse)
    return await sendAuthResponse(res, user, token, req);
  } catch (err) {
    console.error("❌ REFRESH ERROR:", err);
    R.error(res, "Refresh failed", 500);
  }
};

// =============================
// 🚪 LOGOUT (ALL DEVICES)
// =============================
export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      // 🔥 Revoke all refresh tokens for this user
      await RefreshToken.revokeAllForUser(req.user.id, req.user.id);

      // 🔥 Also increment tokenVersion to invalidate any existing tokens
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { tokenVersion: 1 },
      });

      // 🔥 Invalidate user cache to prevent stale auth state
      invalidateUserCache(req.user.id);
    }

    res.clearCookie("refreshToken", { path: "/api" });
    res.clearCookie("token", { path: "/api" });

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    console.error("❌ LOGOUT ERROR:", err);
    R.error(res, "Logout failed", 500);
  }
};

// =============================
// 👤 PROFILE
// =============================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return R.notFound(res, "User not found");
    }

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    R.error(res, "Failed to fetch profile", 500);
  }
};

// =============================
// 🔐 SESSIONS (DASHBOARD)
// =============================
export const getSessions = async (req, res) => {
  try {
    const sessions = await RefreshToken.getActiveSessions(req.user.id);
    res.json({ success: true, sessions, data: sessions });
  } catch (err) {
    console.error("❌ SESSIONS ERROR:", err);
    R.error(res, "Failed to fetch sessions", 500);
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const session = await RefreshToken.findOne({ _id: tokenId, user: req.user.id, isRevoked: false });

    if (!session) {
      return R.notFound(res, "Session not found");
    }

    await RefreshToken.revokeToken(session.token, req.user.id);
    res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    console.error("❌ REVOKE SESSION ERROR:", err);
    R.error(res, "Failed to revoke session", 500);
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    await RefreshToken.revokeAllForUser(req.user.id, req.user.id);

    // Also increment tokenVersion to invalidate any existing tokens
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 },
    });

    // 🔥 Invalidate user cache to prevent stale auth state
    invalidateUserCache(req.user.id);

    res.json({ success: true, message: "All sessions revoked" });
  } catch (err) {
    console.error("❌ REVOKE ALL SESSIONS ERROR:", err);
    R.error(res, "Failed to revoke all sessions", 500);
  }
};
// ============================================================
// PUT /api/auth/profile — update own profile
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      businessName,
      bio,
      visibility,
      mpesaBusiness,
      mpesaBusinessName,
      bankName,
      bankAccount,
      bankBranch,
      notifications,
      paymentDetails,
      onboardingComplete,
      avatar,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = formatPhone(phone) || String(phone).trim();
    if (location !== undefined) updates.location = String(location).trim();
    if (businessName !== undefined) updates.businessName = String(businessName).trim();
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (visibility && typeof visibility === "object") updates.visibility = visibility;
    if (mpesaBusiness !== undefined) updates.mpesaBusiness = String(mpesaBusiness).trim();
    if (mpesaBusinessName !== undefined) updates.mpesaBusinessName = String(mpesaBusinessName).trim();
    if (bankName !== undefined) updates.bankName = String(bankName).trim();
    if (bankAccount !== undefined) updates.bankAccount = String(bankAccount).trim();
    if (bankBranch !== undefined) updates.bankBranch = String(bankBranch).trim();
    if (notifications) updates.notifications = { sms: notifications.sms };
    if (paymentDetails) updates.paymentDetails = paymentDetails;
    if (onboardingComplete !== undefined) updates.onboardingComplete = Boolean(onboardingComplete);
    if (avatar !== undefined) updates.avatar = String(avatar);

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select(
      "-password",
    );

    if (!user) return R.notFound(res, "User not found");

    // Auto-approve dealer when onboarding is completed
    if (onboardingComplete && (user.role === "dealer" || user.role === "individual_seller")) {
      await Dealer.findOneAndUpdate(
        { user: req.user.id },
        { approved: true, verifiedAt: new Date() },
        { upsert: true },
      );
    }

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// PUT /api/auth/change-password — change own password
// ============================================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return R.error(res, "Both passwords required", 400);
    }
    if (newPassword.length < 8) {
      return R.error(res, "New password must be at least 8 characters", 400);
    }
    if (!/[a-z]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one lowercase letter", 400);
    }
    if (!/[A-Z]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one uppercase letter", 400);
    }
    if (!/\d/.test(newPassword)) {
      return R.error(res, "New password must contain at least one number", 400);
    }
    if (!/[@$!%*?&]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one special character (@$!%*?&)", 400);
    }

    const user = await User.findById(req.user.id).select("+password +tokenVersion");
    if (!user) return R.notFound(res, "User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return R.error(res, "Current password is incorrect", 400);

    user.password = newPassword; // pre-save hook will hash this
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // 🔥 Invalidate user cache to prevent stale auth state after password change
    invalidateUserCache(req.user.id);

    return sendAuthResponse(res, user);
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/verify-email — verify email with token
// ============================================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return R.error(res, "Token required", 400);

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpire: { $gt: Date.now() },
    }).select("+emailVerifyToken +emailVerifyExpire");

    if (!user) {
      return R.error(res, "Invalid or expired verification link. Request a new one.", 400);
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/resend-verification — resend verification email
// ============================================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return R.error(res, "Email required", 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+emailVerifyToken +emailVerifyExpire",
    );

    // Always return 200 to avoid user enumeration
    if (!user || user.emailVerified) {
      return res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
    }

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();

    // Send verification email
    const { sendVerificationReminderEmail } = emailService;
    if (typeof sendVerificationReminderEmail === "function") {
      sendVerificationReminderEmail(user.email, user.name, verifyToken).catch((e) =>
        console.warn("⚠️  Resend verification email failed:", e.message),
      );
    }

    res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return R.error(res, "Email required", 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const { sendPasswordResetEmail } = emailService;
    if (typeof sendPasswordResetEmail === "function") {
      sendPasswordResetEmail(user, token).catch((e) => console.warn("⚠️  Reset email failed:", e.message));
    }

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/reset-password
// ============================================================
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return R.error(res, "Token and password required", 400);
    if (password.length < 8) return R.error(res, "Password must be at least 8 characters", 400);

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) return R.error(res, "Reset link is invalid or has expired.", 400);

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions
    await user.save();

    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};
