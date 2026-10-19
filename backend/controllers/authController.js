import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import Dealer from "../models/Dealer.js";
import RefreshToken from "../models/RefreshToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { formatPhone } from "../utils/format.js";
import * as R from "../utils/response.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { sendNotification } from "../services/notification.service.js";
import { deliver } from "../services/communicationGateway.service.js";
// Email templates are loaded lazily so auth module load does not depend on the mail stack.
const escHtml = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// Building an email must NEVER fail registration/recovery: fall back to a minimal escaped body.
const buildEmail = async (builder, args, fallback) => {
  try {
    return (await import("../services/email.service.js"))[builder](args);
  } catch (e) {
    console.warn("⚠️ Email template build failed, using plain fallback:", e.message);
    return fallback;
  }
};
import { emitCommunication, COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { recordFailedAttempt, recordSuccessfulAttempt } from "../middleware/accountLockout.js";
import { logError, logWarn } from '../infrastructure/logging/index.js';
import { getSupabase } from '../utils/supabase.js';
import { mapRowIn } from '../utils/fieldMap.js';
import { isOwnerUser, isReservedOwnerEmail, isUnverifiedOwner, OWNER_IDENTITY_UNVERIFIED_RESPONSE } from '../config/owners.js'; // STAGE 5A/5B: owner identity gate
import { getOnboardingPolicy, isPolicyTrusted } from '../services/onboardingPolicy.service.js'; // STAGE 5
import { parseReferralCode, referrerEligible } from '../utils/referralGuards.js'; // STAGE 4A (G9): string-only code; self/suspended referrer excluded
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

// Single-use email tokens (verify + password reset) are stored as SHA-256
// hashes so a database leak does not expose usable tokens.
const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
const normalizeEmail = (email) => String(email || "").normalize("NFKC").trim().toLowerCase();

const requiresEmailVerification = () =>
  process.env.REQUIRE_EMAIL_VERIFICATION === "true" ||
  (!process.env.REQUIRE_EMAIL_VERIFICATION && Boolean(process.env.BREVO_API_KEY));

const assertEmailDeliverySucceeded = (delivery, purpose) => {
  if (!delivery || delivery.status !== "sent") {
    const reason = delivery?.lastError || "Brevo did not confirm the email delivery";
    throw new Error(`${purpose} email delivery failed: ${reason}`);
  }
  return delivery;
};

// H-1 FIX: Strip sensitive fields before sending user data in any response.
// Without this, bankAccount, mpesaBusiness, paymentDetails, phoneOTP, emailVerifyToken,
// password reset tokens, and internal flags leak to the client.
const SAFE_USER_FIELDS = [
  "_id", "id", "name", "email", "role", "phone", "avatar", "status",
  "isBanned", "approved", "location", "dealerRating", "bio",
  "businessName", "businessType", "createdAt", "updatedAt",
  "lastLogin", "lastLoginAt", "referralCode", "credits",
  "emailVerified", "phoneVerified", "verificationStatus",
  "mustChangePassword",
  "dealerPackage", "packageListingMax", "packageFeatures", "packageExpiresAt",
  "packageAutoRenew", "subscriptionStatus", "wholesale", "deactivatedAt",
];

export const serializeUser = (user, authState = null) => {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const role = isOwnerUser(raw) ? "superadmin" : raw.role;
  const safe = {};
  for (const field of SAFE_USER_FIELDS) {
    if (raw[field] !== undefined) safe[field] = raw[field];
  }
  if (safe._id === undefined && raw.id !== undefined) {
    safe._id = String(raw.id);
  }
  safe.role = role;
  if (authState && authState.mustChangePassword !== undefined) {
    safe.mustChangePassword = Boolean(authState.mustChangePassword);
  }
  safe.isOwner = isOwnerUser(raw);
  return safe;
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
    path: "/",
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
    path: "/",
    maxAge: ACCESS_COOKIE_MS,
  });
};

// =============================
// 🧾 RESPONSE FORMAT
// =============================
const sendAuthResponse = async (res, user, oldRefreshToken = null, req = null, tokenVersion = 0, authState = null) => {
  const safeUser = serializeUser(user, authState);
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let sessionId = null;
  let familyId = null;
  let newRefreshToken;

  if (oldRefreshToken) {
    // Rotation is atomic in PostgreSQL. The old token is claimed once; a second
    // concurrent use is treated as refresh-token reuse and the family is revoked.
    const existing = await RefreshToken.findByTokenHash(oldRefreshToken);
    if (!existing) throw Object.assign(new Error("Refresh token not found"), { code: "AUTH_REFRESH_INVALID" });
    // IMPORTANT: do not reject a revoked/expired stored token here. The
    // PostgreSQL rotation RPC deliberately receives the historical token so
    // it can atomically classify replay as refresh-token reuse and revoke the
    // entire family. Returning early here would make that security control
    // unreachable for a replayed token.
    familyId = existing.familyId;
    newRefreshToken = generateRefreshToken(user, tokenVersion, familyId);
    const result = await RefreshToken.rotate({
      oldToken: oldRefreshToken, newToken: newRefreshToken, user: user._id, tokenVersion,
      deviceId: req?.body?.deviceId || req?.headers["x-device-id"] || existing.deviceId || "unknown",
      userAgent: req?.headers["user-agent"] || existing.userAgent || "",
      ipAddress: req?.ip || req?.connection?.remoteAddress || existing.ipAddress || "",
      expiresAt: refreshTokenExpiresAt, familyId,
    });
    if (result?.status === "reuse_detected") {
      await UserAuth.findOneAndUpdate({ user: user._id }, { $inc: { tokenVersion: 1 } });
      invalidateUserCache(user._id);
      throw Object.assign(new Error("Refresh token reuse detected. Please sign in again."), { code: "AUTH_REFRESH_REUSED" });
    }
    if (result?.status !== "rotated") throw Object.assign(new Error("Refresh token rotation failed"), { code: "AUTH_REFRESH_INVALID" });
    sessionId = result.session_id;
  } else {
    familyId = crypto.randomUUID();
    newRefreshToken = generateRefreshToken(user, tokenVersion, familyId);
    const session = await RefreshToken.createSession({
      user: user._id, token: newRefreshToken, tokenVersion, familyId,
      deviceId: req?.body?.deviceId || req?.headers["x-device-id"] || "unknown",
      userAgent: req?.headers["user-agent"] || "",
      ipAddress: req?.ip || req?.connection?.remoteAddress || "",
      expiresAt: refreshTokenExpiresAt,
    });
    sessionId = session.sessionId;
  }

  const accessToken = generateAccessToken(user, tokenVersion, sessionId);
  sendRefreshToken(res, newRefreshToken);
  sendAccessToken(res, accessToken);
  return res.json({ success: true, user: safeUser });
};

const notifyAdminsOfPendingSeller = async (seller) => {
  try {
    const admins = await User.find({ role: { $in: STAFF_ROLES } })
      .select("_id email")
      .lean();

    await Promise.all(
      admins.map((admin) =>
        emitCommunication({
          userId: admin._id,
          eventType: COMMUNICATION_EVENTS.DEALER_SUBMITTED,
          category: "system",
          title: "New seller approval pending",
          message: `${seller.businessName || seller.name} (${seller.email}) registered as a ${seller.role} and is awaiting approval.`,
          channels: ["in_app", "email"],
          metadata: { sellerId: seller._id, role: seller.role, sellerType: seller.role, sourceEvent: "seller.approval_pending" },
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

    email = normalizeEmail(email);

    // STAGE 5A (Gate A, finding A1): the owner identity is an EMAIL (config/owners.js). Public sign-up must never be
    // able to create or claim it, whether or not the owner row exists yet, and the answer must not reveal which.
    // Owner accounts are provisioned out of band (backend/seed.js, email_verified=true).
    if (isReservedOwnerEmail(email)) { // STAGE 5B: designated + current owners + pending owner invitations
      logWarn("Public registration attempted with a reserved platform-owner address", { event: "account.owner_identity_reserved", ip: req.ip });
      return res.status(403).json({ success: false, code: "OWNER_IDENTITY_RESERVED", message: "This email address cannot be used for public registration." });
    }

    const requestedRole = req.body.role;
    const role = requestedRole === "dealer" || requestedRole === "individual_seller" ? requestedRole : "user";
    const businessName = String(req.body.businessName || "").trim();
    const location = String(req.body.location || "").trim();

    if (role === "dealer" && !businessName) {
      return R.error(res, "Business name is required for dealer registration", 400);
    }
    if (role === "dealer" && !location) {
      return R.error(res, "Location or city is required for dealer registration", 400);
    }

    // STAGE 5: owner-controlled registration policy, enforced server-side BEFORE any side effect.
    // Untrusted policy (store unavailable/corrupt) never opens seller or dealer registration.
    if (role === "individual_seller" || role === "dealer") {
      const onboarding = await getOnboardingPolicy();
      if (!isPolicyTrusted(onboarding)) {
        return res.status(503).json({ success: false, code: "ONBOARDING_POLICY_UNAVAILABLE", message: "Seller and dealer registration is temporarily unavailable. Please try again shortly." });
      }
      if (role === "individual_seller" && onboarding.policy.privateSellerRegistration !== "enabled") {
        return res.status(403).json({ success: false, code: "SELLER_REGISTRATION_DISABLED", message: "Private seller registration is not open right now." });
      }
      if (role === "dealer" && onboarding.policy.dealerOnboardingMode === "closed") {
        return res.status(403).json({ success: false, code: "DEALER_REGISTRATION_CLOSED", message: "Dealer registration is not open right now." });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return R.error(res, "An account with that email already exists", 409);
    }

    let referredBy = null;
    // STAGE 4A (G9): only a plain string may be used as a referral code. A JSON body such as
    // {"referralCode":{"$ne":null}} previously reached User.findOne as an operator object and could
    // attribute the bonus to an arbitrary account. Self-referral is compared on normalised emails
    // and a suspended/deactivated referrer is never credited.
    const referralCode = parseReferralCode(req.body.referralCode || req.query?.ref);
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrerEligible(referrer, email, normalizeEmail)) referredBy = referrer._id;
    }

    const rawPhone = (phone || "").trim();
    const validPhone = rawPhone ? formatPhone(rawPhone) || rawPhone : "";
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(password, 12);

    // Identity creation is one PostgreSQL transaction: users + the automatic
    // profiles/dealer triggers + user_auth either all commit or all roll back.
    // This removes the historical half-created-account window between two
    // independent Supabase inserts.
    const { data: createdRow, error: identityError } = await getSupabase().rpc("kayad_register_identity_atomic", {
      p_name: String(name).trim(),
      p_email: email,
      p_role: role,
      p_phone: validPhone,
      p_business_name: businessName || null,
      p_location: location || null,
      p_referred_by: referredBy || null,
      p_password_hash: passwordHash,
      p_email_verify_token: hashToken(verifyToken),
      p_email_verify_expire: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (identityError) throw identityError;

    const user = mapRowIn("users", createdRow);
    const userAuth = { tokenVersion: 0, mustChangePassword: false };

    const verifyUrl = `${process.env.FRONTEND_URL || "https://www.kayad.space"}/verify-email?token=${encodeURIComponent(verifyToken)}`;
    const verificationPayload = {
      userId: user.id,
      channel: "email",
      eventType: COMMUNICATION_EVENTS.EMAIL_VERIFICATION,
      templateCode: "account_verification_email",
      recipient: user.email,
      ...(await buildEmail("buildVerificationEmail", { name: user.name, verifyUrl }, {
        subject: "Verify Your Email — KAYAD",
        text: `Hi ${user.name || "there"}, verify your KAYAD email: ${verifyUrl}`,
        html: `<p>Hi ${escHtml(user.name || "there")},</p><p><a href="${escHtml(verifyUrl)}">Verify my email</a></p>`,
      })),
      metadata: { verification: true },
      idempotencyKey: `registration-verification:${user.id}`,
    };

    // Email delivery is external I/O and must never decide whether registration
    // succeeds. The account, credential row and hashed verification token are
    // already committed above; awaiting the provider here held the request open
    // for up to 30s (browser "timeout of 30000ms exceeded") and, on a provider
    // failure, deleted a valid account (see REGISTRATION_TIMEOUT_FIX_20260930.md).
    // If delivery fails the user simply uses "resend verification", which is
    // rate limited and generic by design.
    void deliver(verificationPayload).catch((e) => {
      logError("Verification email dispatch failed", e, { userId: user.id, event: "account.email_verification" });
    });

    if (role === "dealer" || role === "individual_seller") {
      void notifyAdminsOfPendingSeller(user).catch(() => {});
    }

    if (referredBy) {
      void (async () => {
        const REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS_KES) || 500;
        try {
          // STAGE 4A (G9): record first, credit second, and never credit a referee twice. Previously the
          // counter was incremented before the record existed, so a failure in between left a credit with no
          // referral row (and no way to see or reverse it). Now a failed record means no credit.
          const ReferralModel = (await import("../models/Referral.js")).default;
          if (await ReferralModel.findOne({ referee: user.id })) return;
          await ReferralModel.create({
            referrer: referredBy,
            referee: user.id,
            status: "credited",
            bonusAmount: REFERRAL_BONUS,
            creditedAt: new Date(),
          });
          await User.findByIdAndUpdate(referredBy, {
            $inc: { credits: REFERRAL_BONUS, referralEarnings: REFERRAL_BONUS, referralCount: 1 },
          });
        } catch (refErr) {
          console.warn("Referral credit failed:", refErr.message);
        }
      })();
    }

    void deliver({
      userId: user.id,
      channel: "email",
      eventType: COMMUNICATION_EVENTS.REGISTRATION,
      templateCode: "account_welcome_email",
      recipient: user.email,
      ...(await buildEmail("buildWelcomeEmail", { name: user.name, role: user.role }, {
        subject: "Welcome to KAYAD",
        text: (role === "dealer" || role === "individual_seller")
          ? `Welcome to KAYAD, ${user.name || "there"}. Your account has been created; seller access depends on email verification and review.`
          : `Welcome to KAYAD, ${user.name || "there"}. Your account is ready.`,
        html: (role === "dealer" || role === "individual_seller")
          ? `<p>Welcome to KAYAD, ${escHtml(user.name || "there")}.</p><p>Your account has been created. Seller access depends on email verification and review.</p>`
          : `<p>Welcome to KAYAD, ${escHtml(user.name || "there")}.</p><p>Your account is ready.</p>`,
      })),
      metadata: { welcome: true },
      idempotencyKey: `registration-welcome:${user.id}`,
    }).catch((e) => {
      logError("Welcome email dispatch failed", e, { userId: user.id, event: "registration.completed" });
    });

    return res.status(201).json({
      success: true,
      user: serializeUser(user, userAuth),
      message: role === "dealer"
        ? "Dealer application received. Please verify your email. Your dealer account is not approved until our team reviews it, and we will notify you of the decision."
        : role === "individual_seller"
          ? "Seller account created. Please verify your email before using seller features. New listings are reviewed before they are published."
          : "Account created successfully. Please verify your email before signing in.",
    });
  } catch (err) {
    logError("REGISTER ERROR", err);
    // The public message is intentionally generic, so record the real cause
    // (Postgres/PostgREST code + message) where operators can see it.
    console.error("REGISTER ERROR cause:", {
      code: err?.code,
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
    });
    if (String(err?.code) === "23505" || err?.code === 11000) {
      return R.error(res, "An account with that email already exists", 409);
    }
    // PGRST202 / 42883: the kayad_register_identity_atomic function is not in
    // the database, i.e. supabase/migrations were not applied to this project.
    // Say so with a stable code instead of an opaque 500.
    if (err?.code === "PGRST202" || err?.code === "42883") {
      console.error(
        "❌ DATABASE MIGRATION REQUIRED: public.kayad_register_identity_atomic is missing. " +
          "Apply supabase/migrations/20261001090000_registration_onboarding_integrity.sql (supabase db push).",
      );
      return R.errorCode(res, "Registration is temporarily unavailable. Please try again shortly.", 503, "DATABASE_MIGRATION_REQUIRED");
    }
    if (process.env.NODE_ENV === "production") {
      return R.errorCode(res, "Registration could not be completed. Please try again.", 500, "REGISTRATION_FAILED");
    }
    R.error(res, err.message, 500);
  }
};

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: a dummy, lazily-computed
// bcrypt hash used only to equalize login timing for an unknown email (see
// below) — never a real credential, never compared against anything a
// client supplies as a hash, only used as the second argument to
// bcrypt.compare() so an unknown-email request pays the same bcrypt cost a
// known-email request already pays.
let _dummyPasswordHash = null;
async function getDummyPasswordHash() {
  if (!_dummyPasswordHash) {
    // Matches models/_base.js's BCRYPT_ROUNDS (12), kept as a literal here
    // rather than imported, since this is only ever used for its bcrypt
    // cost, never compared against a real credential.
    _dummyPasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);
  }
  return _dummyPasswordHash;
}

// =============================
// 🔑 LOGIN
// =============================
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return R.error(res, "Email and password required", 400);
    }

    email = normalizeEmail(email);

    const user = await User.findOne({ email });

    // Auth fields live in user_auth table (H1 split)
    const userAuth = user ? await UserAuth.findOne({ user: user._id }).select("+password +tokenVersion") : null;

    // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: when `userAuth` is
    // null (unknown email), the credential check below previously read
    // `!userAuth || !(await userAuth.matchPassword(password))` — the `||`
    // short-circuits before ever calling matchPassword/bcrypt.compare, so
    // an unknown-email request returned "Invalid credentials" immediately,
    // while a known-email/wrong-password request paid the full bcrypt
    // cost (BCRYPT_ROUNDS=12) first. Both paths already return the
    // identical response body/message (confirmed below, no enumeration
    // via content), but this created a measurable response-time oracle for
    // account enumeration via timing — inconsistent with this same
    // controller's own explicitly constant-time-shaped forgotPassword/
    // resendVerification flows. Running the same-cost dummy compare here
    // for an unknown email closes that timing gap without changing any
    // response content.
    if (!userAuth) {
      await bcrypt.compare(password, await getDummyPasswordHash());
    }

    // ─── Check lockout BEFORE password verification ──────
    if (userAuth?.lockUntil && userAuth.lockUntil > new Date()) {
      const remaining = Math.ceil((userAuth.lockUntil - new Date()) / 60000);
      return R.error(res, `Account locked. Try again in ${remaining} minute(s).`, 429);
    }

    if (!userAuth || !(await userAuth.matchPassword(password))) {
      // ─── Record failed attempt for IP-based lockout ──────
      recordFailedAttempt(req);

      // ─── Account lockout ────────────────────────────────
      if (userAuth && !user.isBanned) {
        const attempts = (userAuth.loginAttempts || 0) + 1;
        if (attempts >= 5) {
          userAuth.loginAttempts = attempts;
          userAuth.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
          await userAuth.save();
          return R.error(res, "Account locked due to too many attempts. Try again in 15 minutes.", 429);
        }
        userAuth.loginAttempts = attempts;
        await userAuth.save();
      }
      return R.unauthorized(res, "Invalid credentials");
    }

    // ─── Reset lockout on successful login ────────────────
    if (userAuth.loginAttempts || userAuth.lockUntil) {
      userAuth.loginAttempts = 0;
      userAuth.lockUntil = null;
    }

    // ─── Record successful attempt for IP-based lockout ──
    recordSuccessfulAttempt(req);

    // STAGE 4A (G7): same owner exemption as protect() and refresh. Owners are immutable by design
    // (config/owners.js) and must not be locked out at login while an existing session still works.
    if (user.isBanned && !isOwnerUser(user)) {
      return R.error(res, "Account suspended", 403);
    }
    if (user.deactivatedAt && !isOwnerUser(user)) {
      return R.error(res, "Account deactivated", 403);
    }

    // STAGE 5A (Gate A): an owner-email account that was never verified is not a provisioned owner. Refuse regardless of
    // REQUIRE_EMAIL_VERIFICATION / provider state (the general gate below is config-dependent and owner-exempt in protect()).
    if (isUnverifiedOwner(user)) {
      logWarn("Owner-email account is not verified; sign-in refused", { event: "account.owner_identity_unverified", userId: user.id });
      return res.status(403).json(OWNER_IDENTITY_UNVERIFIED_RESPONSE);
    }

    // ─── Email verification gate ────────────────────────────────
    // Only enforce when verification can actually be completed. If Brevo
    // isn't configured there is no way to receive the
    // verification link, so blocking login would lock everyone out.
    // Override explicitly with REQUIRE_EMAIL_VERIFICATION=true|false.
    const emailConfigured = !!process.env.BREVO_API_KEY;
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

    // Fixed (Final Integration Phase 5 - API/database contract
    // certification): removed the redundant `user.lastLogin =
    // new Date()` line that was here - reproduced the real failure
    // directly ("Could not find the 'last_login' column of
    // 'users'"): no such column exists, only last_login_at
    // (which lastLoginAt already correctly maps to). This was a
    // real, blocking defect - user.save() writes every enumerable
    // field, so this alone failed every single successful login.
    user.lastLoginAt = new Date();
    await user.save();
    if (userAuth) await userAuth.save();

    return await sendAuthResponse(res, user, null, req, userAuth?.tokenVersion || 0, userAuth);
  } catch (err) {
    logError("❌ LOGIN ERROR", err);
    R.error(res, "Login failed", 500);
  }
};

// =============================
// 🔁 REFRESH TOKEN (ROTATING)
// =============================
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return R.errorCode(res, "No refresh token", 401, "AUTH_SESSION_EXPIRED");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      return R.errorCode(res, err.name === "TokenExpiredError" ? "Refresh token expired — please login again" : "Invalid refresh token", 403, "AUTH_SESSION_EXPIRED");
    }

    const storedToken = await RefreshToken.findByTokenHash(token);
    if (!storedToken) return R.errorCode(res, "Refresh token not found or revoked", 403, "AUTH_SESSION_EXPIRED");

    const user = await User.findById(decoded.id);
    const userAuth = user ? await UserAuth.findOne({ user: decoded.id }).select("+tokenVersion") : null;
    if (!user || !userAuth) return R.errorCode(res, "Invalid credentials", 403, "AUTH_SESSION_EXPIRED");
    // Same account-state gate as protect(): a suspended or deactivated account must
    // not be issued fresh tokens (owner exempt, as in protect()).
    if ((user.isBanned || user.deactivatedAt) && !isOwnerUser(user)) {
      return R.errorCode(res, user.isBanned ? "Account suspended" : "Account deactivated", 403, "AUTH_FORBIDDEN");
    }
    if (isUnverifiedOwner(user)) return res.status(403).json(OWNER_IDENTITY_UNVERIFIED_RESPONSE); // STAGE 5A (Gate A)
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (userAuth.tokenVersion ?? 0)) {
      return R.errorCode(res, "Session invalidated — please login again", 403, "AUTH_SESSION_EXPIRED");
    }

    return await sendAuthResponse(res, user, token, req, userAuth.tokenVersion || 0, userAuth);
  } catch (err) {
    logError("❌ REFRESH ERROR", err);
    if (err?.code === "AUTH_REFRESH_REUSED") return R.errorCode(res, err.message, 403, "AUTH_REFRESH_REUSED");
    if (err?.code === "AUTH_REFRESH_INVALID") return R.errorCode(res, err.message, 403, "AUTH_SESSION_EXPIRED");
    return R.errorCode(res, "Refresh failed", 500, "AUTH_REFRESH_FAILED");
  }
};

// =============================
// 🚪 LOGOUT (ALL DEVICES)
// =============================
export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      // 🔥 Revoke all refresh tokens for this user
      await RefreshToken.revokeAllForUser(req.user.id, "logout");

      // 🔥 Also increment tokenVersion to invalidate any existing tokens
      await UserAuth.findOneAndUpdate({ user: req.user.id }, {
        $inc: { tokenVersion: 1 },
      });

      // 🔥 Invalidate user cache to prevent stale auth state
      invalidateUserCache(req.user.id);
    }

    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("token", { path: "/" });

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    logError("❌ LOGOUT ERROR", err);
    R.error(res, "Logout failed", 500);
  }
};

// =============================
// 👤 PROFILE
// =============================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return R.notFound(res, "User not found");
    }

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    logError("❌ PROFILE ERROR", err);
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
    logError("❌ SESSIONS ERROR", err);
    R.error(res, "Failed to fetch sessions", 500);
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const sessions = await RefreshToken.getActiveSessions(req.user.id);
    const session = sessions.find((item) => String(item.id) === String(tokenId));
    if (!session) return R.notFound(res, "Session not found");
    await RefreshToken.revokeSessionById(tokenId, req.user.id);
    res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    logError("❌ REVOKE SESSION ERROR", err);
    R.error(res, "Failed to revoke session", 500);
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    await RefreshToken.revokeAllForUser(req.user.id, "logout");

    // Also increment tokenVersion to invalidate any existing tokens
    await UserAuth.findOneAndUpdate({ user: req.user.id }, {
      $inc: { tokenVersion: 1 },
    });

    // 🔥 Invalidate user cache to prevent stale auth state
    invalidateUserCache(req.user.id);

    res.json({ success: true, message: "All sessions revoked" });
  } catch (err) {
    logError("❌ REVOKE ALL SESSIONS ERROR", err);
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

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

    if (!user) return R.notFound(res, "User not found");

    // NOTE: Dealer approval must ONLY come from the admin verification
    // workflow (/api/verification). Never set Dealer.approved here — doing so
    // lets a pending dealer self-approve and bypass requireDealerVerification's
    // legacy-approval grandfather clause.

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
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one special character", 400);
    }

    const user = await User.findById(req.user.id);
    const userAuth = user ? await UserAuth.findOne({ user: req.user.id }).select("+password +tokenVersion") : null;
    if (!user || !userAuth) return R.notFound(res, "User not found");

    const match = await userAuth.matchPassword(currentPassword);
    if (!match) return R.error(res, "Current password is incorrect", 400);

    userAuth.password = await bcrypt.hash(newPassword, 12);
    userAuth.mustChangePassword = false;
    userAuth.tokenVersion = (userAuth.tokenVersion || 0) + 1;
    await userAuth.save();

    // Password changes invalidate every previous refresh family; the current browser
    // receives a fresh session only after the new credential is committed.
    await RefreshToken.revokeAllForUser(req.user.id, "password_changed");
    invalidateUserCache(req.user.id);

    return sendAuthResponse(res, user, null, null, userAuth.tokenVersion || 0, userAuth);
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

    const userAuth = await UserAuth.findOneAndUpdate(
      { emailVerifyToken: hashToken(token), emailVerifyExpire: { $gt: new Date() } },
      { emailVerifyToken: null, emailVerifyExpire: null },
      { new: true },
    );
    if (!userAuth) return R.error(res, "Invalid or expired verification link. Request a new one.", 400);

    const user = await User.findById(userAuth.user);
    if (!user) return R.error(res, "Invalid or expired verification link. Request a new one.", 400);
    user.emailVerified = true;
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

    // STAGE 5A (Gate B): every outcome — unknown address, already verified, no credential row, cooldown, or "sent" — returns the
    // SAME status and body, so the endpoint reveals neither whether an address is registered nor whether it is verified.
    // (It previously answered 200 for unknown/verified addresses and 202 for unverified ones.)
    const GENERIC = { success: true, message: "If that email exists and is unverified, a verification email is being sent." };
    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user || user.emailVerified) {
      return res.status(202).json(GENERIC);
    }

    const userAuth = await UserAuth.findOne({ user: user._id }).select("+emailVerifyToken +emailVerifyExpire");
    if (!userAuth) {
      return res.status(202).json(GENERIC);
    }

    // STAGE 5A (Gate B): per-account resend cooldown. The IP+email rate limiter allows several sends per window; this stops a
    // burst to one mailbox. Stateless on purpose (no migration): the token lifetime is 24h, so "issued at" = expiry − 24h.
    const COOLDOWN_MS = Math.max(0, Number(process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS ?? 60)) * 1000;
    if (COOLDOWN_MS && userAuth.emailVerifyToken && userAuth.emailVerifyExpire) {
      const issuedAt = new Date(userAuth.emailVerifyExpire).getTime() - 24 * 60 * 60 * 1000;
      if (Number.isFinite(issuedAt) && Date.now() - issuedAt < COOLDOWN_MS) {
        return res.status(202).json(GENERIC);
      }
    }

    // Generate the replacement token in memory first. Do not persist it until
    // Brevo has accepted the replacement email; otherwise a process crash between
    // the database write and provider acceptance could invalidate the only usable
    // verification link without delivering the replacement.
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const nextVerifyTokenHash = hashToken(verifyToken);
    const nextVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Resend is also an onboarding-critical path. Do not hold the browser request
    // open while Brevo performs network delivery. The old persisted token remains
    // valid until provider acceptance of this replacement, so a failed or killed
    // delivery cannot strand the account.
    void (async () => {
      try {
        const verifyUrl = `${process.env.FRONTEND_URL || "https://www.kayad.space"}/verify-email?token=${encodeURIComponent(verifyToken)}`;
        const verificationDelivery = await deliver({
          userId: user.id || user._id,
          channel: "email",
          eventType: COMMUNICATION_EVENTS.EMAIL_VERIFICATION,
          templateCode: "account_verification_email",
          recipient: user.email,
          ...(await buildEmail("buildVerificationEmail", { name: user.name, verifyUrl, resend: true }, {
            subject: "Verify Your Email — KAYAD",
            text: `Hi ${user.name || "there"}, verify your KAYAD email: ${verifyUrl}`,
            html: `<p>Hi ${escHtml(user.name || "there")},</p><p><a href="${escHtml(verifyUrl)}">Verify my email</a></p>`,
          })),
          metadata: { verification: true, resend: true },
          idempotencyKey: `verification-resend:${user.id}:${nextVerifyTokenHash.slice(0, 16)}`,
        });
        if (requiresEmailVerification()) assertEmailDeliverySucceeded(verificationDelivery, "Verification");

        // Provider acceptance is the commit point for the replacement token.
        userAuth.emailVerifyToken = nextVerifyTokenHash;
        userAuth.emailVerifyExpire = nextVerifyExpire;
        await userAuth.save();
      } catch (e) {
        logError("Verification resend failed", e, { userId: user.id, event: "account.email_verification" });
        // The persisted token was never changed, so the previous verification link
        // remains valid. The response remains generic to prevent account enumeration.
      }
    })();

    return res.status(202).json(GENERIC);
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

    const user = await User.findOne({ email: normalizeEmail(email) });
    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

    const userAuth = await UserAuth.findOne({ user: user._id });
    if (!userAuth) return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    userAuth.resetToken = hashToken(token);
    userAuth.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userAuth.save();

    // Password-reset email delivery is external I/O and must not hold the HTTP
    // request open. The reset token is already persisted before dispatch, so a
    // provider timeout cannot turn a successful reset request into a browser
    // timeout. Keep the response identical for account-enumeration safety.
    const resetUrl = `${process.env.FRONTEND_URL || "https://www.kayad.space"}/reset-password?token=${encodeURIComponent(token)}`;
    void deliver({
      userId: user.id || user._id,
      channel: "email",
      eventType: COMMUNICATION_EVENTS.PASSWORD_RESET,
      recipient: user.email,
      ...(await buildEmail("buildPasswordResetEmail", { resetUrl }, {
        subject: "Reset Your KAYAD Password",
        text: `Reset your KAYAD password: ${resetUrl}. This link expires in 1 hour.`,
        html: `<p><a href="${escHtml(resetUrl)}">Reset my password</a></p><p>This link expires in 1 hour.</p>`,
      })),
      metadata: { passwordReset: true },
      idempotencyKey: `password-reset:${user.id}:${hashToken(token).slice(0, 16)}`,
    }).catch((e) => logError("Password reset email dispatch failed", e, { userId: user.id, event: "account.password_reset" }));

    return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
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
    if (!/[A-Z]/.test(password)) return R.error(res, "Password must contain at least one uppercase letter", 400);
    if (!/[a-z]/.test(password)) return R.error(res, "Password must contain at least one lowercase letter", 400);
    if (!/\d/.test(password)) return R.error(res, "Password must contain at least one number", 400);
    if (!/[^A-Za-z0-9]/.test(password)) return R.error(res, "Password must contain at least one special character", 400);

    const passwordHash = await bcrypt.hash(password, 12);
    const existingAuth = await UserAuth.findOne({ resetToken: hashToken(token), resetTokenExpire: { $gt: new Date() } }).select("+tokenVersion");
    if (!existingAuth) return R.error(res, "Reset link is invalid or has expired.", 400);

    const userAuth = await UserAuth.findOneAndUpdate(
      { resetToken: hashToken(token), resetTokenExpire: { $gt: new Date() } },
      { password: passwordHash, resetToken: null, resetTokenExpire: null, tokenVersion: (existingAuth.tokenVersion || 0) + 1 },
      { new: true },
    );
    if (!userAuth) return R.error(res, "Reset link is invalid or has expired.", 400);
    await RefreshToken.revokeAllForUser(userAuth.user, "password_reset");
    // STAGE 4A (G7): tokenVersion changed above; drop cached auth state exactly as password change / logout / revoke-all do.
    invalidateUserCache(userAuth.user);

    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};
