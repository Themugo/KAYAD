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

  // Bearer Authorization is NOT a CSRF bypass. A browser attacker can add an
  // Authorization header, so authentication scheme alone is insufficient.
  // Explicit machine-to-machine routes may set req.kayadMachineAuthenticated
  // after validating their own non-browser credential. Provider callbacks are
  // already handled by the explicit path allowlist above.
  if (req.kayadMachineAuthenticated === true) return next();

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
  const hostname = String(req.hostname || req.headers?.host || "").split(":")[0].toLowerCase();
  const isKayadSubdomain = hostname.endsWith(".kayad.space");
  const cookieDomain = isKayadSubdomain ? ".kayad.space" : undefined;

  // The browser UI and API are separate subdomains in production (for example
  // www.kayad.space -> api.kayad.space). A host-only cookie issued by the API
  // is invisible to document.cookie on www.kayad.space, so the frontend cannot
  // echo the double-submit token. Scope the CSRF cookie to the KAYAD site in
  // production while keeping localhost/dev cookies host-only.
  if (cookieDomain && typeof res.clearCookie === "function") {
    // Remove any legacy host-only token first; otherwise browsers can retain
    // two cookies with the same name and produce ambiguous request headers.
    res.clearCookie("XSRF-TOKEN", { path: "/" });
  }

  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    domain: cookieDomain,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.setHeader("Cache-Control", "no-store");
  res.locals.csrfToken = token;
  next();
};
