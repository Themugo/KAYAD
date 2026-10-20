// ============================================================
// STAGE 5E.1 — repeated resend / verify requests are rate-limited by the REAL verificationLimiter (real Express, loopback only).
// The limiter keys on caller-IP + normalised email, so the 429 is not an account-existence oracle. EVIDENCE TIER: M (no mail, no DB).
// ============================================================
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import express from "express";

process.env.NODE_ENV = "test";
delete process.env.VERIFICATION_RATE_LIMIT_MAX;
const { verificationLimiter } = await import("../../middleware/rateLimiter.js");

let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.post("/resend-verification", verificationLimiter, (_req, res) => res.status(202).json({ success: true }));
  app.get("/verify-email/:token", verificationLimiter, (_req, res) => res.status(400).json({ success: false }));
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
const post = (email) => fetch(`${base}/resend-verification`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });

describe("RL — verification limiter", () => {
  test("the 9th resend for one address inside the window is refused with 429 AUTH_RATE_LIMITED and Retry-After", async () => {
    const codes = []; for (let i = 0; i < 9; i++) codes.push((await post("flood@example.test")).status);
    expect(codes.slice(0, 8)).toEqual(Array(8).fill(202)); expect(codes[8]).toBe(429);
    const r = await post("flood@example.test"); expect(r.status).toBe(429); expect(r.headers.get("retry-after")).toBe("900");
    expect((await r.json()).code).toBe("AUTH_RATE_LIMITED");
  });
  test("another address from the same caller is not blocked by the first one's budget", async () => {
    expect((await post("other@example.test")).status).toBe(202);
  });
  test("address case/whitespace variants share one budget (no bypass by re-casing)", async () => {
    const codes = []; for (let i = 0; i < 9; i++) codes.push((await post(i % 2 ? "  CasE@Example.Test " : "case@example.test")).status);
    expect(codes[8]).toBe(429);
  });
  test("the limiter answers identically for a registered and an unregistered address (budget is per address string, not per account)", async () => {
    const a = []; const b = []; for (let i = 0; i < 9; i++) { a.push((await post("known@example.test")).status); b.push((await post("unknown-zz@example.test")).status); }
    expect(a).toEqual(b);
  });
  test("verify-link attempts are throttled too (token guessing)", async () => {
    const codes = []; for (let i = 0; i < 10; i++) codes.push((await fetch(`${base}/verify-email/${"a".repeat(64)}`)).status);
    expect(codes.slice(0, 8)).toEqual(Array(8).fill(400)); expect(codes[8]).toBe(429);
  });
});
