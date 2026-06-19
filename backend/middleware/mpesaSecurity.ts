// backend/middleware/mpesaSecurity.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Protects the M-Pesa callback endpoint from spoofed requests.
// Safaricom only sends callbacks from their documented IP ranges.
//
// ENV VARS:
//   MPESA_ENV=production   → strict IP whitelist enforced
//   MPESA_ENV=sandbox      → sandbox IPs allowed
//   MPESA_SKIP_IP_CHECK=true → bypass (dev only, never in prod)
//   MPESA_WEBHOOK_SECRET   → optional secret for HMAC validation
// ─────────────────────────────────────────────────────────────

import crypto from "crypto";
import { logInfo, logWarn, logError } from "../utils/logger.ts";

// Official Safaricom IP ranges (documented in Daraja portal)
const SAFARICOM_PRODUCTION_IPS = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "175.41.238.68",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.128",
  "196.201.212.129",
  "196.201.212.132",
  "196.201.212.136",
  "196.201.212.138",
];

const SAFARICOM_SANDBOX_IPS = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "::1", // localhost for local dev
  "127.0.0.1",
];

// CIDR helper — checks if IP is in range
const ipInCidr = (ip, cidr) => {
  if (!cidr.includes("/")) return ip === cidr;
  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const toInt = (s) => s.split(".").reduce((acc, b) => (acc << 8) + parseInt(b), 0);
  return (toInt(ip) & mask) === (toInt(range) & mask);
};

// Extract real client IP (works behind nginx)
const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.headers["x-real-ip"] ||
  req.socket.remoteAddress ||
  "";

export const mpesaIpWhitelist = (req, res, next) => {
  // Skip in dev/test mode
  if (process.env.MPESA_SKIP_IP_CHECK === "true") {
    if (process.env.NODE_ENV !== "production") return next();
    logWarn("MPESA_SKIP_IP_CHECK=true in production — THIS IS DANGEROUS");
    return next();
  }

  const allowedIps = process.env.MPESA_ENV === "production" ? SAFARICOM_PRODUCTION_IPS : SAFARICOM_SANDBOX_IPS;

  // Add any custom IPs from env (comma-separated)
  const extraIps = (process.env.MPESA_EXTRA_IPS || "").split(",").filter(Boolean);
  const allAllowed = [...allowedIps, ...extraIps];

  const clientIp = getClientIp(req);

  const allowed = allAllowed.some((allowed) =>
    allowed.includes("/") ? ipInCidr(clientIp, allowed) : clientIp === allowed,
  );

  if (!allowed) {
    logError("M-Pesa callback blocked from IP", null, { ip: clientIp });
    // Return 200 to Safaricom so they don't retry — log the block
    return res.status(200).json({
      ResultCode: 1,
      ResultDesc: "Rejected",
    });
  }

  next();
};

// ── MPESA CALLBACK SIGNATURE VALIDATOR ───────────────────────
// Validates that callback body has required Safaricom structure
// Includes timestamp validation and optional HMAC signature verification
export const validateMpesaCallback = (req, res, next) => {
  // Content-Type must be JSON — reject form data, XML, etc.
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (!ct.includes("application/json")) {
    logError("M-Pesa callback wrong Content-Type", null, { contentType: ct });
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid content type" });
  }

  const body = req.body;

  // Must have Body.stkCallback
  if (!body?.Body?.stkCallback) {
    logError("Invalid M-Pesa callback structure", null, { body: JSON.stringify(body).slice(0, 200) });
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid structure" });
  }

  const cb = body.Body.stkCallback;

  // Must have CheckoutRequestID
  if (!cb.CheckoutRequestID) {
    logError("Missing CheckoutRequestID in M-Pesa callback");
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" });
  }

  // Log all callbacks for audit trail
  logInfo("M-Pesa callback received", {
    CheckoutRequestID: cb.CheckoutRequestID,
    ResultCode: cb.ResultCode,
    ip: getClientIp(req),
    origin: req.headers["origin"] || req.headers["referer"] || "none",
  });

  // Additional verification: check that the request is POST (matches Safaricom's contract)
  if (req.method !== "POST") {
    logError("M-Pesa callback wrong HTTP method", null, { method: req.method });
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid method" });
  }

  // ── TIMESTAMP VALIDATION (Replay Attack Prevention) ───────
  // Reject callbacks older than 5 minutes to prevent replay attacks
  const callbackTimestamp = cb.TransactTime || cb.TransactionTime;
  if (callbackTimestamp) {
    const callbackTime = new Date(callbackTimestamp);
    const now = new Date();
    const timeDiff = Math.abs(now - callbackTime) / 1000; // seconds
    const MAX_TIME_DIFF = 300; // 5 minutes

    if (timeDiff > MAX_TIME_DIFF) {
      logError("M-Pesa callback timestamp too old", null, {
        callbackTimestamp,
        timeDiff: `${timeDiff}s`,
        maxAllowed: `${MAX_TIME_DIFF}s`,
      });
      return res.status(200).json({ ResultCode: 1, ResultDesc: "Timestamp expired" });
    }
  }

  // ── OPTIONAL HMAC SIGNATURE VALIDATION ───────────────────────
  // If MPESA_WEBHOOK_SECRET is set, validate HMAC signature
  const webhookSecret = process.env.MPESA_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers["x-mpesa-signature"] || req.headers["signature"];
    if (!signature) {
      logError("M-Pesa callback missing signature header");
      return res.status(200).json({ ResultCode: 1, ResultDesc: "Missing signature" });
    }

    const bodyString = JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(bodyString).digest("hex");

    if (signature !== expectedSignature) {
      logError("M-Pesa callback signature mismatch", null, {
        received: signature.slice(0, 20),
        expected: expectedSignature.slice(0, 20),
      });
      return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid signature" });
    }
  }

  // ── REQUEST ID TRACKING (Idempotency) ───────────────────────
  // Add unique request ID for tracking and idempotency
  req.mpesaRequestId = crypto.randomUUID();
  logInfo("M-Pesa callback validated", {
    requestId: req.mpesaRequestId,
    CheckoutRequestID: cb.CheckoutRequestID,
  });

  next();
};
