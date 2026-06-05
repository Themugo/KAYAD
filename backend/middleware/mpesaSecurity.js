// backend/middleware/mpesaSecurity.js
// ─────────────────────────────────────────────────────────────
// Protects the M-Pesa callback endpoint from spoofed requests.
// Safaricom only sends callbacks from their documented IP ranges.
//
// ENV VARS:
//   MPESA_ENV=production   → strict IP whitelist enforced
//   MPESA_ENV=sandbox      → sandbox IPs allowed
//   MPESA_SKIP_IP_CHECK=true → bypass (dev only, never in prod)
// ─────────────────────────────────────────────────────────────

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
  "::1",         // localhost for local dev
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
    console.warn("⚠️ MPESA_SKIP_IP_CHECK=true in production — THIS IS DANGEROUS");
    return next();
  }

  const allowedIps =
    process.env.MPESA_ENV === "production"
      ? SAFARICOM_PRODUCTION_IPS
      : SAFARICOM_SANDBOX_IPS;

  // Add any custom IPs from env (comma-separated)
  const extraIps = (process.env.MPESA_EXTRA_IPS || "").split(",").filter(Boolean);
  const allAllowed = [...allowedIps, ...extraIps];

  const clientIp = getClientIp(req);

  const allowed = allAllowed.some((allowed) =>
    allowed.includes("/") ? ipInCidr(clientIp, allowed) : clientIp === allowed
  );

  if (!allowed) {
    console.error(`🚫 M-Pesa callback blocked from IP: ${clientIp}`);
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
export const validateMpesaCallback = (req, res, next) => {
  // Content-Type must be JSON — reject form data, XML, etc.
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (!ct.includes("application/json")) {
    console.error("❌ M-Pesa callback wrong Content-Type:", ct);
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid content type" });
  }

  const body = req.body;

  // Must have Body.stkCallback
  if (!body?.Body?.stkCallback) {
    console.error("❌ Invalid M-Pesa callback structure:", JSON.stringify(body).slice(0, 200));
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Invalid structure" });
  }

  const cb = body.Body.stkCallback;

  // Must have CheckoutRequestID
  if (!cb.CheckoutRequestID) {
    return res.status(200).json({ ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" });
  }

  // Log all callbacks for audit trail
  console.log(`📱 M-Pesa callback received:`, {
    CheckoutRequestID: cb.CheckoutRequestID,
    ResultCode: cb.ResultCode,
    ip: getClientIp(req),
    ts: new Date().toISOString(),
  });

  next();
};
