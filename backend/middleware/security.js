// backend/middleware/security.js
// ─────────────────────────────────────────────────────────────
// Drop-in security middleware stack. Add to server.js ONCE.
// All features are ENV-driven — set variable to enable/disable.
// ─────────────────────────────────────────────────────────────

// ── 1. MONGO INJECTION PROTECTION ────────────────────────────
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
// Escapes HTML special chars in all string fields
// Prevents: <script>alert(1)</script> stored in DB
const escapeHtml = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

const xssClean = (obj, depth = 0) => {
  if (depth > 10 || !obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = escapeHtml(obj[key]);
    } else if (typeof obj[key] === "object") {
      xssClean(obj[key], depth + 1);
    }
  }
  return obj;
};

// Fields that should NOT be XSS-escaped (passwords, tokens — NOT user content)
const XSS_SKIP_FIELDS = new Set([
  "password", "currentPassword", "newPassword",
  "token", "refreshToken", "checkoutRequestID",
]);

// Fields that allow limited HTML (bold, italic, links) — sanitized, not skipped
const RICH_TEXT_FIELDS = new Set(["content", "description", "bio"]);

// Strip dangerous tags/attributes but allow safe formatting
const sanitizeRichText = (str) => {
  return str
    // Remove script/style/iframe/object/embed tags and their content
    .replace(/<\s*(script|style|iframe|object|embed|form|input|textarea|button|link|meta|base)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|textarea|button|link|meta|base)[^>]*\/?>/gi, "")
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*\S+/gi, "")
    // Remove javascript: and data: URIs in href/src attributes
    .replace(/(href|src|action)\s*=\s*["']\s*(javascript|data|vbscript)\s*:/gi, '$1="')
    // Remove style attributes (can be used for CSS injection/exfil)
    .replace(/\s+style\s*=\s*["'][^"']*["']/gi, "")
    // Strip null bytes
    .replace(/\0/g, "");
};

export const xssProtection = () => (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (XSS_SKIP_FIELDS.has(key)) continue;
      if (RICH_TEXT_FIELDS.has(key) && typeof req.body[key] === "string") {
        req.body[key] = sanitizeRichText(req.body[key]);
      } else if (typeof req.body[key] === "string") {
        req.body[key] = escapeHtml(req.body[key]);
      } else if (typeof req.body[key] === "object") {
        xssClean(req.body[key]);
      }
    }
  }
  next();
};

// ── 3. PAGINATION CAP ─────────────────────────────────────────
// Enforces max limit on all list queries
// Prevents: ?limit=999999 DoS attacks
const MAX_LIMIT   = parseInt(process.env.MAX_QUERY_LIMIT || "100");
const DEFAULT_LIM = parseInt(process.env.DEFAULT_QUERY_LIMIT || "20");

export const paginationCap = () => (req, res, next) => {
  if (req.query.limit !== undefined) {
    const raw = parseInt(req.query.limit);
    req.query.limit = String(
      isNaN(raw) || raw < 1 ? DEFAULT_LIM : Math.min(raw, MAX_LIMIT)
    );
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

// ── 5. REQUEST SIZE GUARD ─────────────────────────────────────
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
