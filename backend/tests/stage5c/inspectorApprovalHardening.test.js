// STAGE 5C — inspector approval cannot mint a verified inspector from an unverified squatter and never stores the set-password token.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
const APP = "55555555-5555-4555-8555-555555555555", ADMIN = "99999999-9999-4999-8999-999999999999", UID = "11111111-1111-4111-8111-111111111111";
const userModel = { findOne: jest.fn(), create: jest.fn(async (d) => ({ id: UID, _id: UID, ...d })) };
const userAuthModel = { create: jest.fn(async (d) => d) };
const appModel = { findById: jest.fn() };
const sendNotification = jest.fn(async () => ({}));
const deliver = jest.fn(async () => ({ status: "sent" }));
const sb = () => { const c = { select: () => c, eq: () => c, is: () => c, insert: () => c, update: () => c, maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: { id: "prov-1" }, error: null }) }; return c; };
jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: userAuthModel }));
jest.unstable_mockModule("../../models/InspectorApplication.js", () => ({ default: appModel }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver, sendUserCommunication: jest.fn(), recordDelivery: jest.fn(), updateDelivery: jest.fn(), handleProviderStatus: jest.fn(), default: {} }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: () => sb() }) }));
const { approveApplication } = await import("../../controllers/inspectorApplicationController.js");
const res = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const application = () => ({ id: "a1", status: "pending", email: "ivy@example.com", fullName: "Ivy", phone: "0722000111", location: "Nairobi", specialties: ["x"], user: null, save: jest.fn(async () => {}) });
const call = async () => { const r = res(); await approveApplication({ params: { id: "a1" }, body: {}, user: { id: ADMIN } }, r); await new Promise((x) => setImmediate(x)); return r; };
beforeEach(() => { jest.clearAllMocks(); appModel.findById.mockResolvedValue(application()); });

describe("approveApplication", () => {
  test("existing UNVERIFIED buyer row → 409 INSPECTOR_EMAIL_UNVERIFIED, nothing promoted, nothing verified", async () => {
    const u = { id: UID, role: "user", emailVerified: false, status: "approved", save: jest.fn() };
    userModel.findOne.mockResolvedValue(u);
    const r = await call();
    expect(r.code).toBe(409); expect(r.body.code).toBe("INSPECTOR_EMAIL_UNVERIFIED");
    expect(u.role).toBe("user"); expect(u.emailVerified).toBe(false); expect(u.save).not.toHaveBeenCalled();
    expect(userAuthModel.create).not.toHaveBeenCalled();
  });
  test("existing VERIFIED buyer is promoted, credentials kept, e-mail flag untouched", async () => {
    const u = { id: UID, _id: UID, email: "ivy@example.com", role: "user", emailVerified: true, status: "approved", save: jest.fn() };
    userModel.findOne.mockResolvedValue(u);
    const r = await call();
    expect(r.code).toBe(200); expect(u.role).toBe("ghost_checker"); expect(u.emailVerified).toBe(true); expect(userAuthModel.create).not.toHaveBeenCalled();
    expect(r.body.invitation).toBe("not_required"); expect(deliver).not.toHaveBeenCalled();
  });
  test("dealer / seller / staff accounts sharing the address are never converted", async () => {
    for (const role of ["dealer", "individual_seller", "admin"]) { userModel.findOne.mockResolvedValue({ id: UID, role, emailVerified: true, save: jest.fn() }); appModel.findById.mockResolvedValue(application()); expect((await call()).code).toBe(409); }
  });
  test("new account: the set-password link goes ONLY to the e-mail body — not into the in-app notification, socket payload or response", async () => {
    userModel.findOne.mockResolvedValue(null);
    const r = await call();
    expect(r.code).toBe(200); expect(r.body.invitation).toBe("queued");
    const note = sendNotification.mock.calls[0][0];
    expect(note.message).not.toMatch(/reset-password|token=|[0-9a-f]{64}/); expect(note.email).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toMatch(/reset-password|[0-9a-f]{64}/);
    const mail = deliver.mock.calls[0][0];
    expect(mail.channel).toBe("email"); expect(mail.recipient).toBe("ivy@example.com"); expect(mail.eventType).toBe("account.password_reset");
    expect(mail.text).toMatch(/reset-password\?token=[0-9a-f]{64}/); expect(mail.idempotencyKey).toMatch(/^inspector-invite:/);
    const stored = userAuthModel.create.mock.calls[0][0];
    expect(stored.resetToken).toMatch(/^[0-9a-f]{64}$/); expect(mail.text).not.toContain(stored.resetToken); // hashed at rest
  });
});
