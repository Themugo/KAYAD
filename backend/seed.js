// backend/seed.js
// Run: node seed.js
// Explicit CLI provisioning for configured platform owners only.

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";
import { logInfo, logWarn, logError } from "./utils/logger.js";
import { initSupabase, getSupabase } from "./utils/supabase.js";
import { upsert } from "./db/index.js";
import UserAuth from "./models/UserAuth.js";

dotenv.config();

const connectDB = () => {
  initSupabase();
};

export async function provisionOwners() {
  if (process.env.SEED_PROVISIONING_ENABLED !== "true") {
    throw new Error("Seed provisioning is disabled. Set SEED_PROVISIONING_ENABLED=true explicitly to provision configured platform owners.");
  }
  connectDB();
  const sb = getSupabase();

  const created = { webhost: [], admin: [] };

  const isProd = process.env.NODE_ENV === "production";
  const { randomBytes } = await import("crypto");
  const devFallback = (label) => {
    if (isProd) throw new Error(`Seed password required via env var (${label}) in production`);
    const pw = randomBytes(16).toString("base64url") + "!A1";
    logWarn(`Generated random dev password for ${label} — set SEED_* env vars for production`);
    return pw;
  };

  // 🚨 CRITICAL: Fail fast in production if using insecure fallback passwords
  const INSECURE_FALLBACK_PATTERNS = ['changeme', 'changeme123', 'demo', 'test', 'password', '123456', 'admin'];
  const validateProductionPassword = (pw, label) => {
    if (!isProd) return;
    const lowerPw = pw.toLowerCase();
    if (INSECURE_FALLBACK_PATTERNS.some(p => lowerPw.includes(p))) {
      throw new Error(`INSECURE: ${label} uses a weak fallback password in production. Set SEED_${label}_PW env var.`);
    }
  };

  const hashPw = (pw) => bcrypt.hashSync(pw, 12);

  // Helper: upsert user + auth (H1 split)
  const upsertUser = async (userData) => {
    const { password, must_change_password, ...profileData } = userData;
    const rows = await upsert("users", profileData, "email");
    const user = rows?.[0];
    if (user && password) {
      await upsert("user_auth", {
        user_id: user.id,
        password,
        must_change_password: must_change_password || false,
      }, "user_id");
    }
    return rows;
  };

  // 1. WEBHOST (SUPERADMIN)
  const webhostEmail = process.env.SEED_ADMIN_EMAIL;
  const webhostPlainPassword = process.env.SEED_ADMIN_PASSWORD || devFallback("SEED_ADMIN_PASSWORD");
  validateProductionPassword(webhostPlainPassword, "SEED_ADMIN_PASSWORD");
  const webhostPassword = hashPw(webhostPlainPassword);
  const webhostName = process.env.SEED_ADMIN_NAME || "Platform Owner";

  const { OWNER_EMAILS } = await import("./config/owners.js");
  const ownerList = OWNER_EMAILS.length ? OWNER_EMAILS : webhostEmail ? [webhostEmail.toLowerCase()] : [];
  if (!ownerList.length) {
    throw new Error("No platform owner configured. Set OWNER_EMAILS or SEED_ADMIN_EMAIL before running seed provisioning.");
  }

  for (const ownerEmail of ownerList) {
    const isPrimary = ownerEmail === (webhostEmail || ownerList[0])?.toLowerCase();
    let pw;
    if (isPrimary) {
      pw = webhostPassword;
    } else {
      const secondaryPlainPassword = process.env.SEED_WEBHOST_PW || devFallback("SEED_WEBHOST_PW");
      validateProductionPassword(secondaryPlainPassword, "SEED_WEBHOST_PW");
      pw = hashPw(secondaryPlainPassword);
    }
    const name = isPrimary ? webhostName : "KAYAD Webhost";
    try {
      await upsertUser({
        name,
        email: ownerEmail,
        password: pw,
        role: "superadmin",
        email_verified: true,
      });
      created.webhost.push(ownerEmail);
    } catch (err) {
      logError("Failed to upsert webhost", { email: ownerEmail, error: err.message });
    }
  }

  // 2. PLATFORM ADMIN
  // No demo users, sample dealers, sample staff, or sample vehicles are
  // created here. Production identity provisioning must be explicit and
  // environment-driven through OWNER_EMAILS / SEED_* credentials above.

  return created;
}

const seed = async () => {
  dotenv.config();
  try {
    connectDB();
    const result = await provisionOwners();
    logInfo("KAYAD — SEED COMPLETE", {
      webhost: result.webhost,
      admin: result.admin,
    });
    process.exit();
  } catch (err) {
    logError("Seed error", err);
    process.exit(1);
  }
};

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === __filename || process.argv[1] === path.basename(__filename));
if (isMain) seed();
