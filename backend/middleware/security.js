// backend/middleware/security.js
// ─────────────────────────────────────────────────────────────
// Drop-in security middleware stack. Add to server.js ONCE.
// All features are ENV-driven — set variable to enable/disable.
// ─────────────────────────────────────────────────────────────

import DOMPurify from "isomorphic-dompurify";

// ── 1. INPUT SANITIZATION ───────────────────────────────────
// Strips $ and . from req.body, req.query, req.params
// Prevents: { "email": { "$gt": "" } } style attacks
export const mongoSanitize = () => (req, res, next) => {
  const clean = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        clean(obj[key]);
      } else if (typeof obj[key] === "string") {
        // Strip null bytes
        obj[key] = obj[key].replace(/\0/g, "");
      }
    }
    return obj;
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

// ── 2. XSS SANITIZATION ───────────────────────────────────────
// Uses DOMPurify to sanitize HTML content
// Prevents: <script>alert(1)</script> stored in DB

// Fields that should NOT be XSS-sanitized (passwords, tokens — NOT user content)
const XSS_SKIP_FIELDS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "refreshToken",
  "checkoutRequestID",
]);

// Fields that allow limited HTML (bold, italic, links) — sanitized with DOMPurify
const RICH_TEXT_FIELDS = new Set(["content", "description", "bio"]);

// Configure DOMPurify for rich text fields
const DOMPurifyConfig = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "u"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onclick", "onerror", "onload", "onmouseover", "onfocus", "onblur"],
};

// Sanitize object recursively with DOMPurify
const sanitizeObject = (obj, depth = 0) => {
  if (depth > 10 || !obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = DOMPurify.sanitize(obj[key]);
    } else if (typeof obj[key] === "object") {
      sanitizeObject(obj[key], depth + 1);
    }
  }
  return obj;
};

const sanitizeStrings = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = DOMPurify.sanitize(obj[key]);
    } else if (typeof obj[key] === "object") {
      sanitizeStrings(obj[key]);
    }
  }
};

export const xssProtection = () => (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (XSS_SKIP_FIELDS.has(key)) continue;
      if (RICH_TEXT_FIELDS.has(key) && typeof req.body[key] === "string") {
        req.body[key] = DOMPurify.sanitize(req.body[key], DOMPurifyConfig);
      } else if (typeof req.body[key] === "string") {
        req.body[key] = DOMPurify.sanitize(req.body[key]);
      } else if (typeof req.body[key] === "object") {
        sanitizeObject(req.body[key]);
      }
    }
  }
  sanitizeStrings(req.query);
  next();
};

// ── 3. PAGINATION CAP ─────────────────────────────────────────
// Enforces max limit on all list queries
// Prevents: ?limit=999999 DoS attacks
const MAX_LIMIT = parseInt(process.env.MAX_QUERY_LIMIT || "100");
const DEFAULT_LIM = parseInt(process.env.DEFAULT_QUERY_LIMIT || "20");

export const paginationCap = () => (req, res, next) => {
  if (req.query.limit !== undefined) {
    const raw = parseInt(req.query.limit);
    req.query.limit = String(isNaN(raw) || raw < 1 ? DEFAULT_LIM : Math.min(raw, MAX_LIMIT));
  }
  if (req.query.page !== undefined) {
    const raw = parseInt(req.query.page);
    req.query.page = String(isNaN(raw) || raw < 1 ? 1 : raw);
  }
  next();
};

// ── 4. SECURITY HEADERS (extra, beyond helmet) ────────────────
export const extraHeaders = () => (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
};

// ── 5. HTTP PARAMETER POLLUTION PROTECTION ──────────────────
// Rejects duplicate query/body parameters to prevent parameter pollution attacks
export const hppProtection = () => (req, res, next) => {
  const checkDuplicates = (obj, source) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && obj[key].length > 1) {
        return res.status(400).json({
          success: false,
          message: `Duplicate parameter detected: ${key} in ${source}`,
        });
      }
    }
  };
  checkDuplicates(req.query, "query");
  checkDuplicates(req.body, "body");
  next();
};

// ── 6. REQUEST SIZE GUARD ─────────────────────────────────────
// Reject abnormally large bodies that aren't file uploads
export const bodyGuard = () => (req, res, next) => {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart")) return next(); // allow file uploads
  const len = parseInt(req.headers["content-length"] || "0");
  const maxBytes = parseInt(process.env.MAX_BODY_BYTES || String(2 * 1024 * 1024)); // 2MB
  if (len > maxBytes) {
    return res.status(413).json({ success: false, message: "Request too large" });
  }
  next();
};
