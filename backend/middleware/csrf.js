import { AppError } from "../utils/AppError.js";
import crypto from "crypto";

// Paths that external services call (webhooks) — no CSRF possible
const PUBLIC_WEBHOOKS = [
  "/payments/callback",
  "/payments/b2c/timeout",
  "/payments/b2c/result",
  "/escrow-vault/webhook",
  "/payment-callback",
];

// Generate a CSRF token and set it as a readable cookie
export const setCsrfCookie = (req, res, next) => {
  if (!req.csrfToken) {
    req.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.cookie("csrf-token", req.csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 86400000,
  });
  next();
};

// Validate CSRF on mutating methods
export const csrfProtection = (req, res, next) => {
  const sensitiveMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!sensitiveMethods.includes(req.method)) return next();

  // Skip webhook routes — called by external services, not browsers
  if (PUBLIC_WEBHOOKS.some((p) => req.originalUrl.includes(p))) return next();

  // JWT-authenticated requests carry Authorization: Bearer — immune to CSRF
  if (req.headers.authorization) return next();

  // Custom header check (double-submit cookie pattern)
  const csrfCookie = req.cookies?.["csrf-token"];
  const csrfHeader = req.headers["x-csrf-token"];
  const xsrfHeader  = req.headers["x-xsrf-token"];
  const requestedBy = req.headers["x-requested-by"] === "kayad-app";

  if (csrfCookie && (csrfHeader === csrfCookie || xsrfHeader === csrfCookie)) return next();
  if (requestedBy) return next();

  return next(AppError.forbidden("CSRF validation failed"));
};
