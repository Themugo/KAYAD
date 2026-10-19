// STAGE 5C — client-IP keying for the rate limiters / account lockout, and the burst limiters, exercised through a real HTTP stack.
import { describe, test, expect, beforeAll, afterAll, jest } from "@jest/globals";
import http from "node:http";
import express from "express";

jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn() }));
process.env.AUTH_RATE_LIMIT_MAX = "3";
process.env.OTP_RATE_LIMIT_MAX = "3";
const { clientIp, authLimiter, otpLimiter } = await import("../../middleware/rateLimiter.js");
const lockout = await import("../../middleware/accountLockout.js");

describe("clientIp()", () => {
  test("never throws on a request object (the old ipKeyGenerator(req) call did, which disabled every limiter)", () => {
    expect(() => clientIp({ ip: "203.0.113.5" })).not.toThrow();
    expect(() => clientIp({})).not.toThrow();
    expect(() => clientIp(undefined)).not.toThrow();
  });
  test("different clients get different keys; the same client the same key", () => {
    expect(clientIp({ ip: "203.0.113.5" })).toBe(clientIp({ ip: "203.0.113.5" }));
    expect(clientIp({ ip: "203.0.113.5" })).not.toBe(clientIp({ ip: "203.0.113.6" }));
  });
  test("falls back to the socket address and then a constant", () => {
    expect(clientIp({ socket: { remoteAddress: "198.51.100.7" } })).toBe(clientIp({ ip: "198.51.100.7" }));
    expect(typeof clientIp({})).toBe("string");
  });
  test("IPv6 clients are bucketed by prefix, not collapsed together", () => {
    expect(clientIp({ ip: "2001:db8:1::1" })).not.toBe(clientIp({ ip: "2001:db8:2::1" }));
  });
});

describe("accountLockout is per client address", () => {
  beforeAll(() => lockout.clearAllAttempts());
  test("five failures lock the offending address only", () => {
    const a = { ip: "203.0.113.10" }, b = { ip: "203.0.113.11" };
    for (let i = 0; i < 5; i++) lockout.recordFailedAttempt(a);
    const resA = { code: 0, status(c) { this.code = c; return this; }, json() { return this; } }; let nextA = false;
    lockout.accountLockout(a, resA, () => { nextA = true; });
    expect(resA.code).toBe(429); expect(nextA).toBe(false);
    let nextB = false; lockout.accountLockout(b, { status() { return this; }, json() { return this; } }, () => { nextB = true; });
    expect(nextB).toBe(true);
  });
  test("a success clears the counter", () => {
    const c = { ip: "203.0.113.12" };
    for (let i = 0; i < 3; i++) lockout.recordFailedAttempt(c);
    lockout.recordSuccessfulAttempt(c);
    let next = false; lockout.accountLockout(c, { status() { return this; }, json() { return this; } }, () => { next = true; });
    expect(next).toBe(true);
  });
});

const start = (app) => new Promise((r) => { const s = http.createServer(app).listen(0, "127.0.0.1", () => r(s)); });
const hit = (port, method, path, ip, headers = {}) => fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { "x-forwarded-for": ip, "content-type": "application/json", ...headers }, body: method === "POST" ? "{}" : undefined });

describe("authLimiter / otpLimiter through HTTP", () => {
  let server, port;
  beforeAll(async () => {
    const app = express(); app.set("trust proxy", 1); app.use(express.json());
    const auth = express.Router(); auth.use(authLimiter);
    auth.post("/login", (_q, r) => r.json({ ok: 1 })); auth.get("/csrf", (_q, r) => r.json({ ok: 1 })); auth.get("/profile", (_q, r) => r.json({ ok: 1 })); auth.post("/refresh", (_q, r) => r.json({ ok: 1 }));
    app.use("/auth", auth);
    app.post("/otp", (q, _r, n) => { q.user = q.headers["x-user"] ? { id: q.headers["x-user"] } : undefined; n(); }, otpLimiter, (_q, r) => r.json({ ok: 1 }));
    server = await start(app); port = server.address().port;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  test("credential endpoint: the limiter is enforced per client address (4th request from one address is 429; another address is unaffected)", async () => {
    const codes = []; for (let i = 0; i < 4; i++) codes.push((await hit(port, "POST", "/auth/login", "203.0.113.20")).status);
    expect(codes).toEqual([200, 200, 200, 429]);
    expect((await hit(port, "POST", "/auth/login", "203.0.113.21")).status).toBe(200);
  });
  test("session plumbing (csrf, profile, refresh) is exempt so normal SPA traffic cannot lock a user out", async () => {
    for (let i = 0; i < 12; i++) {
      expect((await hit(port, "GET", "/auth/csrf", "203.0.113.30")).status).toBe(200);
      expect((await hit(port, "GET", "/auth/profile", "203.0.113.30")).status).toBe(200);
      expect((await hit(port, "POST", "/auth/refresh", "203.0.113.30")).status).toBe(200);
    }
  });
  test("OTP burst guard is keyed by the signed-in user, not the shared address", async () => {
    const same = "203.0.113.40";
    const u1 = []; for (let i = 0; i < 4; i++) u1.push((await hit(port, "POST", "/otp", same, { "x-user": "user-1" })).status);
    expect(u1).toEqual([200, 200, 200, 429]);
    // a different subscriber behind the SAME carrier address is not throttled by user-1's traffic
    expect((await hit(port, "POST", "/otp", same, { "x-user": "user-2" })).status).toBe(200);
  });
});
