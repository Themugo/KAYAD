// Which e-mail does the backend believe the caller has? EVIDENCE TIER: real protect() middleware with faked persistence.
// Source of truth: users.email of the user id inside the verified token, re-read on every request. Never a JWT claim, header or body field.
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
process.env.JWT_SECRET = "x".repeat(48);
const rows = {
  "u-A": { id: "u-A", email: "mugo.james27@gmail.com", role: "user", status: "approved", isBanned: false, emailVerified: true, name: "A" },
  "u-B": { id: "u-B", email: "someone.else@example.com", role: "user", status: "approved", isBanned: false, emailVerified: true, name: "B" },
};
const chain = (v) => ({ select: () => chain(v), lean: async () => v, then: (r, j) => Promise.resolve(v).then(r, j) });
const findById = jest.fn((id) => chain(rows[id] ? { ...rows[id] } : null));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById, findByIdAndUpdate: jest.fn(() => Promise.resolve()) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: () => chain({ tokenVersion: 0 }) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn() } }));
const { protect } = await import("../../middleware/auth.js");
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const sign = (claims, opts = {}) => jwt.sign({ tokenVersion: 0, ...claims }, process.env.JWT_SECRET, { algorithm: "HS256", ...opts });
const run = async (token, extra = {}) => { const req = { headers: { authorization: `Bearer ${token}` }, cookies: {}, ...extra }; const res = mkRes(); const next = jest.fn(); await protect(req, res, next); return { req, res, next }; };
beforeEach(() => { process.env.REQUIRE_EMAIL_VERIFICATION = "false"; rows["u-A"].email = "mugo.james27@gmail.com"; });

describe("backend identity = fresh users.email of the token's user id", () => {
  test("a forged/stale e-mail claim inside the token is ignored", async () => {
    const { req, next } = await run(sign({ id: "u-A", email: "attacker@example.com" }));
    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe("mugo.james27@gmail.com");
  });
  test("browser-supplied e-mail (body, header, query) is never consulted", async () => {
    const { req } = await run(sign({ id: "u-B" }), { body: { email: "mugo.james27@gmail.com" }, query: { email: "mugo.james27@gmail.com" }, headers: { authorization: `Bearer ${sign({ id: "u-B" })}`, "x-user-email": "mugo.james27@gmail.com" } });
    expect(req.user.id).toBe("u-B");
    expect(req.user.email).toBe("someone.else@example.com");
  });
  test("stale session after switching accounts: the old token still resolves to the OLD account, the new token to the new one", async () => {
    const oldSession = await run(sign({ id: "u-B" }));
    const newSession = await run(sign({ id: "u-A" }));
    expect(oldSession.req.user.email).toBe("someone.else@example.com");
    expect(newSession.req.user.email).toBe("mugo.james27@gmail.com");
  });
  test("an e-mail changed in the database is effective on the very next request (no 20 s cache window for identity)", async () => {
    await run(sign({ id: "u-A" }));
    rows["u-A"].email = "renamed@example.com";
    expect((await run(sign({ id: "u-A" }))).req.user.email).toBe("renamed@example.com");
  });
  test("expired access token is refused with a session-expired answer (the client then refreshes and retries)", async () => {
    const expired = sign({ id: "u-A" }, { expiresIn: -10 });
    const { res, next } = await run(expired);
    expect(res.code).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
    expect(next).not.toHaveBeenCalled();
    const refreshed = await run(sign({ id: "u-A" }));
    expect(refreshed.next).toHaveBeenCalled();
  });
});
