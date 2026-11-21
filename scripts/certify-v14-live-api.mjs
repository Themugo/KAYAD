/**
 * V14 live API certification harness.
 *
 * This harness is intentionally read-only after authentication. It verifies that
 * the deployed canonical API can authenticate a real certification account and
 * that the existing marketplace, transaction, inspection, dispute, dealer and
 * finance surfaces are reachable without creating synthetic production data.
 *
 * Required:
 *   KAYAD_CERT_EMAIL
 *   KAYAD_CERT_PASSWORD
 *
 * Optional dealer/admin accounts enable role-specific read certification:
 *   KAYAD_CERT_DEALER_EMAIL / KAYAD_CERT_DEALER_PASSWORD
 *   KAYAD_CERT_ADMIN_EMAIL / KAYAD_CERT_ADMIN_PASSWORD
 *
 * API defaults to https://api.kayad.space. Override with KAYAD_API_URL.
 */

const baseUrl = String(process.env.KAYAD_API_URL || "https://api.kayad.space").replace(/\/$/, "");
const timeoutMs = Number(process.env.KAYAD_CERT_TIMEOUT_MS || 30000);
const requiredEmail = process.env.KAYAD_CERT_EMAIL;
const requiredPassword = process.env.KAYAD_CERT_PASSWORD;

const failures = [];
const warnings = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function record(ok, name, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!ok) failures.push(line);
}

function warn(name, detail) {
  const line = `WARN ${name} — ${detail}`;
  console.log(line);
  warnings.push(line);
}

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: "manual",
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "KAYAD-V14-live-certifier/1.0",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    const cookies = response.headers.getSetCookie?.() || [];
    return { response, body, cookies };
  } finally {
    clearTimeout(timer);
  }
}

function cookieHeader(cookies) {
  return cookies
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

async function checkPublic() {
  const checks = [
    ["health", "/health", (r) => r.response.ok],
    ["readiness", "/health/ready", (r) => r.response.ok],
    ["marketplace cars", "/api/cars?limit=1", (r) => [200, 204].includes(r.response.status)],
    ["auction catalogue", "/api/auctions?limit=1", (r) => [200, 204].includes(r.response.status)],
    ["subscription plans", "/api/subscriptions/plans", (r) => [200, 204].includes(r.response.status)],
  ];

  for (const [name, path, predicate] of checks) {
    try {
      const result = await request(path);
      record(predicate(result), name, `HTTP ${result.response.status}`);
    } catch (error) {
      record(false, name, error.name === "AbortError" ? "timeout" : error.message);
    }
  }
}

async function authenticate(email, password, label) {
  if (!email || !password) return null;
  try {
    const result = await request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const cookie = cookieHeader(result.cookies);
    record(result.response.ok && Boolean(cookie), `${label} authentication`, `HTTP ${result.response.status}`);
    if (!cookie) return null;
    return cookie;
  } catch (error) {
    record(false, `${label} authentication`, error.name === "AbortError" ? "timeout" : error.message);
    return null;
  }
}

async function checkAuthenticated(cookie, label, checks) {
  if (!cookie) return;
  for (const [name, path, allowed = [200, 204]] of checks) {
    try {
      const result = await request(path, { headers: { cookie } });
      record(allowed.includes(result.response.status), `${label}: ${name}`, `HTTP ${result.response.status}`);
    } catch (error) {
      record(false, `${label}: ${name}`, error.name === "AbortError" ? "timeout" : error.message);
    }
  }
}

async function main() {
  console.log("KAYAD V14 live API certification");
  console.log(`API: ${baseUrl}`);

  if (!requiredEmail || !requiredPassword) {
    console.error("BLOCKED live certification: set KAYAD_CERT_EMAIL and KAYAD_CERT_PASSWORD to a real KAYAD certification account.");
    console.error("No production data will be created by this harness.");
    process.exit(2);
  }

  await checkPublic();

  const userCookie = await authenticate(requiredEmail, requiredPassword, "buyer/user");
  await checkAuthenticated(userCookie, "buyer/user", [
    ["profile", "/api/v1/auth/profile"],
    ["my bids", "/api/v1/bids/my"],
    ["my payments", "/api/v1/payments/my"],
    ["my escrows", "/api/v1/escrow/my"],
    ["my disputes", "/api/disputes/my"],
    ["my inspections", "/api/inspections/my"],
    ["my loans", "/api/loans/my"],
    ["my subscription", "/api/subscriptions/my-subscription"],
  ]);

  const dealerCookie = await authenticate(
    process.env.KAYAD_CERT_DEALER_EMAIL,
    process.env.KAYAD_CERT_DEALER_PASSWORD,
    "dealer",
  );
  if (dealerCookie) {
    await checkAuthenticated(dealerCookie, "dealer", [
      ["dashboard", "/api/dealer-platform/dashboard"],
      ["inventory", "/api/dealer-platform/inventory"],
      ["subscription", "/api/dealer-platform/subscription"],
      ["finance", "/api/dealer-platform/finance"],
      ["inspections", "/api/dealer-platform/inspections"],
    ]);
  } else if (process.env.KAYAD_CERT_DEALER_EMAIL || process.env.KAYAD_CERT_DEALER_PASSWORD) {
    warn("dealer certification", "dealer credentials were partially configured or authentication failed");
  }

  const adminCookie = await authenticate(
    process.env.KAYAD_CERT_ADMIN_EMAIL,
    process.env.KAYAD_CERT_ADMIN_PASSWORD,
    "admin",
  );
  if (adminCookie) {
    await checkAuthenticated(adminCookie, "admin", [
      ["all loans", "/api/loans/all"],
      ["all disputes", "/api/disputes"],
      ["all subscriptions", "/api/subscriptions/all"],
      ["all escrows", "/api/escrow"],
    ]);
  } else if (process.env.KAYAD_CERT_ADMIN_EMAIL || process.env.KAYAD_CERT_ADMIN_PASSWORD) {
    warn("admin certification", "admin credentials were partially configured or authentication failed");
  }

  console.log(`\nV14 live API certification: ${failures.length ? "FAILED" : "PASS"}`);
  console.log(`Checks: ${failures.length ? "see failures above" : "all configured checks passed"}; warnings: ${warnings.length}`);
  if (failures.length) process.exit(1);
}

await main();
