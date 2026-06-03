import jwt from "jsonwebtoken";

const getAccess = () => process.env.JWT_SECRET;
const getRefresh = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

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
// 🔄 GENERATE REFRESH TOKEN
// =============================
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      tokenVersion: user.tokenVersion || 0,
    },
    getRefresh(),
    { expiresIn: REFRESH_EXPIRES }
  );
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
