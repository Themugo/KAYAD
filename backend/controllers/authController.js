import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { formatPhone } from "../utils/format.js";
import * as R from "../utils/response.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { sendNotification } from "../services/notification.service.js";

// =============================
// 🔐 CONFIG (read at function call time, not import time — dotenv hasn't loaded yet)
// =============================

let ACCESS_SECRET, REFRESH_SECRET;
const getAccess  = () => ACCESS_SECRET  || (ACCESS_SECRET  = process.env.JWT_SECRET);
const getRefresh = () => REFRESH_SECRET || (REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRE || "1h";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRE || "7d";

const WEBHOIST_EMAIL = process.env.WEBHOIST_EMAIL || "";
const OWNER_EMAILS = [WEBHOIST_EMAIL, "themugo@kayad.space"].filter(Boolean);
const STAFF_ROLES = ["admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"];
const SELLER_ROLES = ["dealer", "broker", "individual_seller"];

const isOwnerEmail = (email) => OWNER_EMAILS.includes(String(email || "").toLowerCase().trim());

const serializeUser = (user) => {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const role = isOwnerEmail(raw.email) ? "superadmin" : raw.role;
  delete raw.password;
  delete raw.resetToken;
  delete raw.resetTokenExpire;
  delete raw.emailVerifyToken;
  delete raw.emailVerifyExpire;
  delete raw.tokenVersion;
  return {
    ...raw,
    _id: raw._id,
    id: raw._id,
    role,
    approved: raw.approved,
  };
};

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
    path: "/api",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// =============================
// 🧾 RESPONSE FORMAT
// =============================
const sendAuthResponse = (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const safeUser = serializeUser(user);

  sendRefreshToken(res, refreshToken);

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

    await Promise.all(admins.map(admin => sendNotification({
      userId: admin._id,
      title: "New seller approval pending",
      message: `${seller.businessName || seller.name} (${seller.email}) registered as a ${seller.role} and is awaiting approval.`,
      type: "system",
      email: admin.email,
    })));
  } catch (err) {
    console.warn("⚠️  Pending seller admin notification failed:", err.message);
  }
};

// =============================
// 📝 REGISTER
// =============================
export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return R.error(res, "All fields required", 400);
    }

    if (password.length < 8) {
      return R.error(res, "Password must be at least 8 characters", 400);
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return R.error(res, "User already exists", 400);
    }
    const { role: requestedRole, dealerPackage } = req.body;
    const allowedSelfRoles = process.env.NODE_ENV === "test"
      ? ["dealer", "broker", "individual_seller", "admin"]
      : ["dealer", "broker", "individual_seller"];
    const role = allowedSelfRoles.includes(requestedRole) ? requestedRole : "user";
    const isSeller = SELLER_ROLES.includes(role);
    const config = await PlatformConfig.findOne().lean().catch(() => null);
    const needsApproval = isSeller && config?.requireDealerApproval !== false;
    const selectedPackage = isSeller && dealerPackage
      ? (config?.packages || []).find(pkg => pkg.id === dealerPackage && pkg.isActive)
      : null;
    const extra = isSeller
      ? {
          approved: !needsApproval,
          verificationStatus: needsApproval ? "pending" : "verified",
          businessName: req.body.businessName || "",
          location: req.body.location || "",
          dealerPackage: selectedPackage?.id || "none",
          packageListingMax: selectedPackage?.listingMax ?? 0,
          packageFeatures: selectedPackage?.features || [],
          packageExpiresAt: selectedPackage?.durationDays
            ? new Date(Date.now() + Number(selectedPackage.durationDays) * 86400000)
            : null,
          subscriptionStatus: selectedPackage && (selectedPackage.isFree || selectedPackage.priceMonthly === 0) ? "active" : "none",
          trialStartedAt: selectedPackage?.trialDays ? new Date() : null,
        }
      : {};

    // Referral: look up referrer by code
    let referredBy = null;
    const referralCode = req.body.referralCode || req.query.ref;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer && referrer._id.toString() !== req.user?.id) {
        referredBy = referrer._id;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      tokenVersion: 0,
      phone: req.body.phone || "",
      emailVerified: false,
      referredBy,
      ...extra,
    });

    // Credit referrer if valid
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
        const { sendNotification } = await import("../services/notification.service.js");
        sendNotification({
          userId: referredBy,
          title: "🎉 Referral Bonus!",
          message: `You earned KES ${REFERRAL_BONUS.toLocaleString()} for referring ${name}. Thanks for spreading the word!`,
          type: "referral",
        }).catch(() => {});
      } catch (refErr) {
        console.warn("⚠️ Referral credit failed:", refErr.message);
      }
    }

    // 📧 Generate email verification token
    try {
      const crypto = await import("crypto");
      const verifyToken = crypto.randomBytes(32).toString("hex");
      user.emailVerifyToken  = verifyToken;
      user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await user.save();

      // Send verification email (non-blocking — don't fail registration if email fails)
      const { sendVerificationEmail, sendWelcomeEmail } = await import("../services/email.service.js").catch(() => ({}));
      if (typeof sendVerificationEmail === "function") {
        sendVerificationEmail(user.email, user.name, verifyToken).catch((e) =>
          console.warn("⚠️  Verification email failed:", e.message)
        );
      }
      if (typeof sendWelcomeEmail === "function") {
        sendWelcomeEmail(user).catch((e) =>
          console.warn("⚠️  Welcome email failed:", e.message)
        );
      }
    } catch (emailErr) {
      console.warn("⚠️  Could not generate verify token:", emailErr.message);
    }

    if (needsApproval) {
      notifyAdminsOfPendingSeller(user).catch(() => {});
    }

    return sendAuthResponse(res.status(201), user);

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
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

    if (!user || !(await user.matchPassword(password))) {
      return R.unauthorized(res, "Invalid credentials");
    }

    if (user.isBanned) {
      return R.error(res, "Account suspended", 403);
    }
    if (user.deactivatedAt) {
      return R.error(res, "Account deactivated", 403);
    }

    user.lastLogin = new Date();
    await user.save();

    return sendAuthResponse(res, user);

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    R.error(res, "Login failed", 500);
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
    let usedAccessFallback = false;

    try {
      decoded = jwt.verify(token, getRefresh());
    } catch {
      try {
        decoded = jwt.verify(token, getAccess(), { ignoreExpiration: true });
        usedAccessFallback = true;
      } catch {
        return R.error(res, "Invalid refresh token", 403);
      }
    }

    const user = await User.findById(decoded.id).select("+tokenVersion");

    if (!user) {
      return R.notFound(res, "User not found");
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return R.error(res, "Session invalidated", 403);
    }

    if (usedAccessFallback && !req.headers.authorization) {
      return R.error(res, "Refresh cookie required", 403);
    }

    return sendAuthResponse(res, user);

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
      // 🔥 invalidate all refresh tokens
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { tokenVersion: 1 },
      });
    }

    res.clearCookie("refreshToken", {
      path: "/api",
    });

    res.json({
      success: true,
      message: "Logged out",
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
// ============================================================
// PUT /api/auth/profile — update own profile
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, businessName, bio, visibility, mpesaBusiness, mpesaBusinessName, bankName, bankAccount, bankBranch, notifications, paymentDetails, onboardingComplete } = req.body;

    const updates = {};
    if (name !== undefined)              updates.name = String(name).trim();
    if (phone !== undefined)             updates.phone = formatPhone(phone) || String(phone).trim();
    if (location !== undefined)          updates.location = String(location).trim();
    if (businessName !== undefined)      updates.businessName = String(businessName).trim();
    if (bio !== undefined)               updates.bio = String(bio).trim();
    if (visibility && typeof visibility === "object") updates.visibility = visibility;
    if (mpesaBusiness !== undefined)     updates.mpesaBusiness = String(mpesaBusiness).trim();
    if (mpesaBusinessName !== undefined) updates.mpesaBusinessName = String(mpesaBusinessName).trim();
    if (bankName !== undefined)          updates.bankName = String(bankName).trim();
    if (bankAccount !== undefined)       updates.bankAccount = String(bankAccount).trim();
    if (bankBranch !== undefined)        updates.bankBranch = String(bankBranch).trim();
    if (notifications)                   updates.notifications = { sms: notifications.sms };
    if (paymentDetails)                  updates.paymentDetails = paymentDetails;
    if (onboardingComplete !== undefined) updates.onboardingComplete = Boolean(onboardingComplete);

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select("-password");

    if (!user) return R.notFound(res, "User not found");

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    R.error(res, err.message, 500);
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

    const user = await User.findById(req.user.id).select("+password +tokenVersion");
    if (!user) return R.notFound(res, "User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return R.error(res, "Current password is incorrect", 400);

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    // Rotate tokens so session stays valid
    return sendAuthResponse(res, user);
  } catch (err) {
    R.error(res, err.message, 500);
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
    R.error(res, err.message, 500);
  }
};

// ============================================================
// POST /api/auth/resend-verification — resend verification email
// ============================================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return R.error(res, "Email required", 400);

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
    R.error(res, err.message, 500);
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

    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const { sendPasswordResetEmail } = await import("../services/email.service.js").catch(() => ({}));
    if (typeof sendPasswordResetEmail === "function") {
      sendPasswordResetEmail(user, token).catch(e => console.warn("⚠️  Reset email failed:", e.message));
    }

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    R.error(res, err.message, 500);
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
    await user.save();

    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    R.error(res, err.message, 500);
  }
};
