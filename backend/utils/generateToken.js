import jwt from "jsonwebtoken";

// =============================
// 🔐 GENERATE ACCESS TOKEN
// =============================
export const generateAccessToken = (user) => {
  const payload = {
    id: user._id || user.id,
    role: user.role || "user",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m", // 🔥 short-lived
  });
};

// =============================
// 🔄 GENERATE REFRESH TOKEN
// =============================
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// =============================
// 🍪 SET AUTH COOKIES
// =============================
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = (process.env.NODE_ENV || "development") === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// =============================
// 🔍 VERIFY TOKEN
// =============================
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch {
    return null;
  }
};

// =============================
// 🔄 REFRESH ACCESS TOKEN
// =============================
export const refreshAccessToken = (refreshToken) => {
  const decoded = verifyToken(refreshToken);

  if (!decoded) return null;

  return generateAccessToken({ id: decoded.id });
};

// =============================
// ❌ CLEAR TOKENS (LOGOUT)
// =============================
export const clearAuthCookies = (res) => {
  res.cookie("accessToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });
};