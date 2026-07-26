import jwt from "jsonwebtoken";

// M-14 FIX: Validate JWT_SECRET at module load time. Previously, if JWT_SECRET
// was missing, the first auth request would fail with a cryptic 500 error.
// Now we fail fast at startup with a clear error message.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("❌ FATAL: JWT_SECRET is missing or too short (minimum 32 characters).");
  console.error("   Set JWT_SECRET in your environment variables before starting the server.");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

// M-2 FIX: Validate REFRESH_TOKEN_SECRET exists in production.
// Previously it silently fell back to JWT_SECRET, meaning access and refresh
// tokens shared the same signing key — a critical vulnerability.
if (process.env.NODE_ENV === "production" && !process.env.REFRESH_TOKEN_SECRET) {
  console.error("❌ FATAL: REFRESH_TOKEN_SECRET is required in production.");
  console.error("   Access and refresh tokens must use separate signing keys.");
  process.exit(1);
}

const getAccess = () => process.env.JWT_SECRET;
const getRefresh = () => {
  if (process.env.NODE_ENV === "production" && !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is required in production");
  }
  return process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
};

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRE || "1h";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRE || "7d";

// =============================
// 🔐 GENERATE ACCESS TOKEN
// =============================
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role || "user",
      status: user.status || "approved",
      tokenVersion: user.tokenVersion || 0,
    },
    getAccess(),
    { expiresIn: ACCESS_EXPIRES },
  );
};

// =============================
// 🔄 GENERATE REFRESH TOKEN
// =============================
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      tokenVersion: user.tokenVersion || 0,
    },
    getRefresh(),
    { expiresIn: REFRESH_EXPIRES },
  );
};

// =============================
// 🔍 VERIFY TOKEN
// =============================
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret || getAccess(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
};
