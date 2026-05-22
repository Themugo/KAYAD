import jwt from "jsonwebtoken";
import crypto from "crypto";

let ACCESS_SECRET, REFRESH_SECRET;
const getAccess  = () => ACCESS_SECRET  || (ACCESS_SECRET  = process.env.JWT_SECRET);
const getRefresh = () => REFRESH_SECRET || (REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);

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
      tokenVersion: user.tokenVersion || 0,
    },
    getAccess(),
    { expiresIn: ACCESS_EXPIRES }
  );
};

// =============================
// 🔄 GENERATE REFRESH TOKEN (with unique JTI for rotation)
// =============================
export const generateRefreshToken = (user) => {
  const jti = crypto.randomUUID(); // unique token ID for rotation tracking
  return {
    token: jwt.sign(
      {
        id: user._id || user.id,
        tokenVersion: user.tokenVersion || 0,
        jti,
      },
      getRefresh(),
      { expiresIn: REFRESH_EXPIRES }
    ),
    jti, // returned for server-side tracking
  };
};

// =============================
// 🔍 VERIFY TOKEN
// =============================
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret || getAccess());
  } catch {
    return null;
  }
};