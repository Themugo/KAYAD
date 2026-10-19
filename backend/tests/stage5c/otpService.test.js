// STAGE 5C — one-time-code security: length, truthful delivery, resend invalidation, rate-limit codes, no secret in the ledger.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const created = []; const updates = []; const supaUpdates = [];
const deliver = jest.fn();
const counts = { recent15: 0, recent24: 0 };
const supa = () => ({
  from: (t) => {
    const q = { _t: t, _filters: [] };
    q.select = () => { q._sel = true; return q; };
    q.eq = (...a) => { q._filters.push(["eq", ...a]); return q; };
    q.gte = (c, v) => { q._filters.push(["gte", c, v]); return q; };
    q.neq = (...a) => { q._filters.push(["neq", ...a]); return q; };
    q.update = (patch) => { q._patch = patch; return q; };
    q.then = (res) => {
      if (q._patch) { supaUpdates.push({ t: q._t, patch: q._patch, f: q._filters }); return Promise.resolve({ data: [], error: null }).then(res); }
      const is15 = q._filters.some((f) => f[0] === "gte" && Date.now() - new Date(f[2]).getTime() < 16 * 60 * 1000 && Date.now() - new Date(f[2]).getTime() > 14 * 60 * 1000);
      return Promise.resolve({ count: is15 ? counts.recent15 : counts.recent24, error: null }).then(res);
    };
    return q;
  },
});
jest.unstable_mockModule("../../db/index.js", () => ({ create: jest.fn(async (t, d) => { const row = { id: "ch-" + (created.length + 1), ...d }; created.push({ t, d }); return row; }), findAll: jest.fn(async () => []), findById: jest.fn(async () => null), findOne: jest.fn(async () => null), update: jest.fn(async (t, id, p) => { updates.push({ t, id, p }); return { id, ...p }; }) }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver, sendUserCommunication: jest.fn(), recordDelivery: jest.fn(), updateDelivery: jest.fn(), handleProviderStatus: jest.fn(), default: {} }));
jest.unstable_mockModule("../../services/communicationControl.service.js", () => ({ getTemplate: jest.fn(async () => null), renderTemplate: jest.fn(() => null) }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: supa }));
const { createOtpChallenge, OTP_LENGTH } = await import("../../services/otpService.js");

beforeEach(() => { created.length = 0; updates.length = 0; supaUpdates.length = 0; deliver.mockReset(); counts.recent15 = 0; counts.recent24 = 0; });
const base = { userId: "u1", purpose: "phone_verification", channel: "sms", recipient: "0712345678" };

describe("createOtpChallenge", () => {
  test("codes are 6 digits", async () => {
    expect(OTP_LENGTH).toBe(6);
    const seen = new Set();
    for (let i = 0; i < 40; i++) { deliver.mockResolvedValueOnce({ status: "sent" }); await createOtpChallenge(base); const body = deliver.mock.calls.at(-1)[0].message; const m = /(\d{6})/.exec(body); expect(m).toBeTruthy(); seen.add(m[1]); }
    expect(seen.size).toBeGreaterThan(30);
  });
  test("only the hash is stored, never the code", async () => {
    deliver.mockResolvedValueOnce({ status: "sent" });
    await createOtpChallenge(base);
    const code = /(\d{6})/.exec(deliver.mock.calls[0][0].message)[1];
    const row = created[0].d;
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/); expect(JSON.stringify(row)).not.toContain(code);
  });
  test("uses the namespaced, rollout-controlled event and the otp category (legacy bare names are normalised)", async () => {
    deliver.mockResolvedValue({ status: "sent" });
    await createOtpChallenge({ ...base, eventType: "phone_verification" });
    await createOtpChallenge({ ...base, eventType: "otp" });
    await createOtpChallenge(base);
    for (const c of deliver.mock.calls) { expect(c[0].eventType).toBe("account.phone_verification"); expect(c[0].category).toBe("otp"); }
  });
  test("a suppressed delivery (gateway returned null) is NOT reported as sent", async () => {
    deliver.mockResolvedValueOnce(null);
    await expect(createOtpChallenge(base)).rejects.toMatchObject({ code: "OTP_DELIVERY_UNAVAILABLE", statusCode: 503 });
    expect(updates.find((u) => u.p.status === "delivery_failed")).toBeTruthy();
  });
  test.each(["failed", "dead_letter"])("a %s delivery is NOT reported as sent", async (status) => {
    deliver.mockResolvedValueOnce({ status });
    await expect(createOtpChallenge(base)).rejects.toMatchObject({ code: "OTP_DELIVERY_UNAVAILABLE" });
  });
  test("a provider-accepted code invalidates every OTHER pending challenge for the same user and purpose", async () => {
    deliver.mockResolvedValueOnce({ status: "sent" });
    const r = await createOtpChallenge(base);
    const inv = supaUpdates.find((u) => u.t === "otp_challenges" && u.patch.status === "expired");
    expect(inv).toBeTruthy();
    const f = JSON.stringify(inv.f);
    expect(f).toContain('"user_id","u1"'); expect(f).toContain('"purpose","phone_verification"'); expect(f).toContain('"status","pending"'); expect(f).toContain(`"neq","id","${r.challengeId}"`);
  });
  test("a failed delivery does not invalidate the user's earlier valid code", async () => {
    deliver.mockResolvedValueOnce({ status: "failed" });
    await expect(createOtpChallenge(base)).rejects.toBeTruthy();
    expect(supaUpdates.find((u) => u.patch.status === "expired")).toBeFalsy();
  });
  test("rate limits carry a stable code (mapped to HTTP 429)", async () => {
    counts.recent15 = 3;
    await expect(createOtpChallenge(base)).rejects.toMatchObject({ code: "OTP_RATE_LIMITED", statusCode: 429 });
    expect(deliver).not.toHaveBeenCalled();
  });
});
