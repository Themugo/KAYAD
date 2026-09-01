// backend/seed.js
// Production-safe bootstrap: provisions only explicitly configured platform owners.
// No demo users, dealers, staff accounts, vehicles, bids, payments, or escrow records are created.

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";
import { logInfo, logError } from "./utils/logger.js";
import { initSupabase } from "./utils/supabase.js";
import { upsert } from "./db/index.js";

dotenv.config();

const connectDB = () => {
  initSupabase();
};

const hashPw = (pw) => bcrypt.hashSync(pw, 12);

async function upsertUser(userData) {
  const { password, must_change_password, ...profileData } = userData;
  const rows = await upsert("users", profileData, "email");
  const user = rows?.[0];

  if (user && password) {
    await upsert("user_auth", {
      user_id: user.id,
      password,
      must_change_password: Boolean(must_change_password),
    }, "user_id");
  }

  return rows;
}

export async function reseed() {
  connectDB();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required for owner bootstrap");
  }

  const { OWNER_EMAILS } = await import("./config/owners.js");
  const configuredEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const ownerEmails = [...new Set([
    ...(OWNER_EMAILS || []).map((email) => String(email).trim().toLowerCase()),
    ...(configuredEmail ? [configuredEmail] : []),
  ].filter(Boolean))];

  if (ownerEmails.length === 0) {
    throw new Error("No platform owner email configured. Set OWNER_EMAILS or SEED_ADMIN_EMAIL.");
  }

  const passwordHash = hashPw(adminPassword);
  const ownerName = process.env.SEED_ADMIN_NAME || "Platform Owner";
  const created = [];

  for (const email of ownerEmails) {
    await upsertUser({
      name: ownerName,
      email,
      password: passwordHash,
      role: "superadmin",
      email_verified: true,
      must_change_password: true,
    });
    created.push(email);
  }

  return { owners: created };
}

const seed = async () => {
  try {
    const result = await reseed();
    logInfo("KAYAD — OWNER BOOTSTRAP COMPLETE", result);
    process.exit(0);
  } catch (err) {
    logError("Owner bootstrap error", err);
    process.exit(1);
  }
};

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && (
  path.resolve(process.argv[1]) === __filename ||
  process.argv[1] === path.basename(__filename)
);

if (isMain) seed();
