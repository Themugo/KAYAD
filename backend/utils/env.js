// utils/env.js

// =============================
// 🧠 CORE GETTER
// =============================
export const getEnv = (key, { required = true, defaultValue = null, type = "string" } = {}) => {
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
    return value === "true" || value === true || value === "TRUE" || value === "1" || value === "yes";
  }

  return value;
};

// =============================
// ✅ ENV VALIDATION
// =============================

// These are always required - server cannot function without them
const ALWAYS_REQUIRED_VARS = [
  { key: "PORT", desc: "Server port" },
];

const FEATURE_GROUPS = [
  {
    label: "M-Pesa (Safaricom Daraja)",
    vars: ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY"],
  },
  {
    label: "Cloudinary (image hosting)",
    vars: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
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
    label: "PostHog (error tracking)",
    vars: ["POSTHOG_API_KEY", "POSTHOG_HOST"],
  },
];

// Warn about missing secrets (but never fail - server can run with fallbacks)
const warnMissingSecrets = () => {
  const secrets = [
    { key: "JWT_SECRET", desc: "JWT signing secret" },
    { key: "SUPABASE_URL", desc: "Supabase project URL" },
    { key: "SUPABASE_SERVICE_KEY", desc: "Supabase service_role key (not anon)" },
    { key: "SESSION_SECRET", desc: "Express session secret for secure cookies" },
    { key: "REFRESH_TOKEN_SECRET", desc: "Refresh token secret" },
    { key: "FRONTEND_URL", desc: "Frontend URL for CORS" },
    { key: "BACKEND_URL", desc: "Backend URL for callbacks" },
  ];

  for (const { key, desc } of secrets) {
    if (!process.env[key]) {
      console.warn(`  ⚠️  ${key} not set — using fallback for ${desc}`);
    }
  }
};

export const validateEnv = (opts = { silent: false }) => {
  let hasError = false;

  // ─── ALWAYS REQUIRED ─────────────────────────────────────────
  for (const { key, desc } of ALWAYS_REQUIRED_VARS) {
    try {
      getEnv(key, { required: true });
    } catch {
      console.error(`  ❌ Missing required env: ${key} (${desc})`);
      hasError = true;
    }
  }

  // ─── WARN ABOUT MISSING SECRETS (never fail) ────────────────
  warnMissingSecrets();

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
