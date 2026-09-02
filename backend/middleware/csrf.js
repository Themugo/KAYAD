import crypto from "crypto";
import { AppError } from "../utils/AppError.js";

// Generate CSRF token
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// External callbacks are authenticated by their own signature/API-key/IP controls.
// They must never depend on a browser session or CSRF token. Keep this list
// explicit so a newly added public callback does not silently bypass CSRF.
const CSRF_EXEMPT_PATHS = [
  "/api/payments/callback",
  "/api/payments/b2c/callback",
  "/api/payments/b2c/timeout",
  "/api/bids/mpesa/callback",
  "/api/escrow-vault/webhook/",
  "/api/sms-bidding/webhook/",
  "/api/webhooks/",
];

const isCsrfExemptPath = (path = "") =>
  CSRF_EXEMPT_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));

// Validate CSRF token
export const csrfProtection = (req, res, next) => {
  const sensitiveMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!sensitiveMethods.includes(req.method)) return next();

  // External machine-to-machine callbacks use their own authentication.
  if (isCsrfExemptPath(req.path)) return next();

  // Skip if using Authorization header (JWT)
  if (req.headers.authorization) return next();

  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return next(AppError.forbidden("CSRF token validation failed"));
  }

  next();
};

// Middleware to generate and send CSRF token
export const csrfToken = (req, res, next) => {
  const token = generateCsrfToken();
  req.session.csrfToken = token;
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.locals.csrfToken = token;
  next();
};
