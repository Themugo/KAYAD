// utils/env.js

// =============================
// 🧠 CORE GETTER
// =============================
export const getEnv = (
  key,
  {
    required = true,
    defaultValue = null,
    type = "string",
  } = {}
) => {
  let value = process.env[key];

  if (!value) {
    if (required && defaultValue === null) {
      throw new Error(`❌ Missing env variable: ${key}`);
    }
    value = defaultValue;
  }

  if (type === "number") {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`❌ Env ${key} must be a number`);
    }
    return num;
  }

  if (type === "boolean") {
    return value === "true" || value === true;
  }

  return value;
};

// =============================
// ✅ ENV VALIDATION
// =============================

const REQUIRED_VARS = [
  { key: "JWT_SECRET", desc: "JWT signing secret" },
  { key: "MONGO_URI", desc: "MongoDB connection string" },
];

const PRODUCTION_VARS = [
  { key: "FRONTEND_URL", desc: "Production frontend URL for CORS" },
];

const FEATURE_GROUPS = [
  {
    label: "M-Pesa (Safaricom Daraja)",
    vars: [
      "MPESA_CONSUMER_KEY",
      "MPESA_CONSUMER_SECRET",
      "MPESA_SHORTCODE",
      "MPESA_PASSKEY",
    ],
  },
  {
    label: "Cloudinary (image hosting)",
    vars: [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ],
  },
  {
    label: "Africa's Talking (SMS/OTP)",
    vars: ["AT_API_KEY", "AT_USERNAME"],
  },
  {
    label: "Twilio (WhatsApp)",
    vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  },
  {
    label: "SendGrid (email)",
    vars: ["SENDGRID_API_KEY"],
  },
  {
    label: "Redis (caching)",
    vars: ["REDIS_URL"],
  },
  {
    label: "Sentry (error tracking)",
    vars: ["SENTRY_DSN"],
  },
];

export const validateEnv = (opts = { silent: false }) => {
  let hasError = false;

  // ─── CORE REQUIRED ───────────────────────────────────────────
  for (const { key, desc } of REQUIRED_VARS) {
    try {
      getEnv(key, { required: true });
    } catch {
      console.error(`  ❌ Missing required env: ${key} (${desc})`);
      hasError = true;
    }
  }

  // ─── PRODUCTION-ONLY REQUIRED ────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    for (const { key, desc } of PRODUCTION_VARS) {
      try {
        getEnv(key, { required: true });
      } catch {
        console.error(`  ❌ Production env missing: ${key} (${desc})`);
        hasError = true;
      }
    }
  }

  // ─── FEATURE GROUPS (warn if one var is set but others missing) ──
  if (!opts.silent) {
    for (const group of FEATURE_GROUPS) {
      const defined = group.vars.filter((k) => process.env[k]);
      const missing = group.vars.filter((k) => !process.env[k]);
      if (defined.length > 0 && defined.length < group.vars.length) {
        console.warn(`  ⚠️  ${group.label}: partial config — missing: ${missing.join(", ")}`);
      }
    }

    // ─── OPTIONAL RECOMMENDED (single vars) ──────────────────
    if (!process.env.REFERRAL_BONUS_KES) {
      console.warn("  ⚠️  REFERRAL_BONUS_KES not set — defaulting to 500");
    }
    if (!process.env.ESCROW_ACCOUNT_NUMBER) {
      console.warn("  ⚠️  ESCROW_ACCOUNT_NUMBER not set — escrow features limited");
    }
    if (!process.env.WEBHOIST_EMAIL) {
      console.warn("  ⚠️  WEBHOIST_EMAIL not set — superadmin bypass unavailable");
    }
  }

  if (hasError) {
    throw new Error("Environment validation failed — fix missing vars above");
  }

  console.log("  ✅ Env validated");
};