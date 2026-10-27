// Phase 14.6 — PUT /api/auth/profile phone-verification contract. Persistence is an in-memory stub; the REAL authController.updateProfile runs.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);

let row; let writes; let failWrite; let missing;
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
const User = {
  findById: () => thenable(() => (missing ? null : { ...row })),
  findByIdAndUpdate: jest.fn(async (id, upd) => {
    if (failWrite) throw new Error("db down");
    if (missing) return null;
    writes.push({ ...upd }); row = { ...row, ...upd }; return { ...row };
  }),
  findOne: () => thenable(() => null),
};
for (const m of ["UserAuth", "RefreshToken", "Dealer", "PlatformConfig"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: jest.fn() }));

const { updateProfile } = await import("../../controllers/authController.js");
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const put = async (body, user = { id: "u1" }) => { const res = mkRes(); await updateProfile({ user, body, headers: {} }, res); return res; };

beforeEach(() => {
  row = { id: "u1", _id: "u1", name: "Old", email: "a@b.co", role: "buyer", phone: "254712345678", phoneVerified: true, password: "HASH" };
  writes = []; failWrite = false; missing = false; User.findByIdAndUpdate.mockClear();
});

describe("PUT /auth/profile — phone verification", () => {
  test("unrelated update leaves phoneVerified alone", async () => {
    const r = await put({ name: "New Name" });
    expect(r.code).toBe(200);
    expect(writes[0]).toEqual({ name: "New Name" });
    expect(row.phoneVerified).toBe(true);
  });
  test("omitted phone is not erased", async () => {
    await put({ bio: "hi" });
    expect(writes[0]).not.toHaveProperty("phone");
    expect(row.phone).toBe("254712345678");
  });
  test("same phone in another format keeps verification", async () => {
    const r = await put({ phone: "0712 345 678" });
    expect(r.code).toBe(200);
    expect(row.phoneVerified).toBe(true);
    expect(writes[0]).not.toHaveProperty("phoneVerified");
  });
  test("changed phone invalidates verification in the same single write", async () => {
    const r = await put({ phone: "0722000111", name: "X" });
    expect(r.code).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(writes[0]).toMatchObject({ phone: "254722000111", phoneVerified: false, name: "X" });
  });
  test("invalid or empty phone is rejected with no write", async () => {
    for (const phone of ["abc", "12345", "", "+1 202 555 0100"]) {
      const r = await put({ phone });
      expect(r.code).toBe(400);
      expect(r.body.code).toBe("VALIDATION_FAILED");
    }
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  test("unknown user -> 404 and no write", async () => {
    missing = true;
    const r = await put({ phone: "0722000111" });
    expect(r.code).toBe(404);
    expect(writes).toHaveLength(0);
  });
  test("failed write -> 500, nothing partially applied", async () => {
    failWrite = true;
    const r = await put({ phone: "0722000111" });
    expect(r.code).toBe(500);
    expect(row.phone).toBe("254712345678");
    expect(row.phoneVerified).toBe(true);
  });
  test("payout/protected fields still refused; no write", async () => {
    const r = await put({ bankName: "X", phone: "0722000111" });
    expect(r.code).toBe(400);
    expect(r.body.code).toBe("PROFILE_FIELD_NOT_SUPPORTED");
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  test("response never exposes sensitive fields", async () => {
    const r = await put({ phone: "0722000111" });
    const s = JSON.stringify(r.body);
    expect(s).not.toMatch(/HASH|password|tokenHash/i);
    expect(r.body.user.phoneVerified).toBe(false);
  });
});
