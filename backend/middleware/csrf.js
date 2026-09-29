import crypto from "crypto";
import { AppError } from "../utils/AppError.js";

// Generate CSRF token. The token is deliberately independent of express-session
// so anonymous API requests never require a Redis-backed session write just to
// obtain browser CSRF state.
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// External callbacks are authenticated by their own signature/API-key/IP controls.
// They must never depend on a browser session or CSRF token. Keep this list
// explicit so a newly added public callback does not silently bypass CSRF.
const CSRF_EXEMPT_PATHS = [
  "/api/payments/callback",
  "/api/payments/b2c/callback",
  "/api/payments/b2c/timeout",
  "/api/bids/mpesa/callback",
  // Legacy escrow-vault callback namespace retained for deployments that
  // still route this provider callback through the shared /api middleware.
  "/api/escrow-vault/webhook/",
  "/api/sms-bidding/webhook/",
  "/api/webhooks/",
];

const isCsrfExemptPath = (path = "") =>
  CSRF_EXEMPT_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));

// Validate CSRF token using the stateless double-submit-cookie contract.
// Browser state-changing requests must present the same unpredictable token in
// both the XSRF cookie and request header/body. JWT requests remain exempt.
export const csrfProtection = (req, res, next) => {
  const sensitiveMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!sensitiveMethods.includes(req.method)) return next();

  // External machine-to-machine callbacks use their own authentication.
  if (isCsrfExemptPath(req.path)) return next();

  // Skip if using Authorization header (JWT)
  if (req.headers.authorization) return next();

  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  const cookieToken = req.cookies?.["XSRF-TOKEN"];

  if (!token || !cookieToken || token !== cookieToken) {
    return next(AppError.forbidden("CSRF token validation failed"));
  }

  next();
};

// Middleware to generate and send a CSRF token.
//
// This is intentionally a stateless double-submit-cookie implementation. CSRF
// protection must not turn anonymous API availability into a Redis/session
// dependency. express-session remains available for workflows that explicitly
// need a server-side session, while ordinary browser/API requests do not create
// or persist a session merely to obtain a CSRF token.
export const csrfToken = (req, res, next) => {
  const cookieToken = req.cookies?.["XSRF-TOKEN"];
  const token = cookieToken || generateCsrfToken();

  if (cookieToken !== token) {
    res.cookie("XSRF-TOKEN", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.locals.csrfToken = token;
  next();
};
