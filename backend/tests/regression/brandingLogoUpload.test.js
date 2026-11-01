// Platform logo: upload, persistence, validation, authorization, failure handling. REAL routes/adminRoutes.js, real protect / authorize,
// real multer + magic-byte middleware; only the image host (config/cloudinary.js) and persistence are faked.
// ROOT CAUSE (client): see src/__tests__/api/multipartUpload.test.ts - the JSON default Content-Type turned the file into {"logo":{}}.
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;
const SECRET = process.env.JWT_SECRET;
const setStorageEnv = () => { process.env.CLOUDINARY_CLOUD_NAME = "kayadcloud"; process.env.CLOUDINARY_API_KEY = "k"; process.env.CLOUDINARY_API_SECRET = "SUPER-SECRET-VALUE"; };

const chain = (value) => { const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) }; return q; };
const users = {};
let stored = null; let saves = 0;
class FakeConfig {
  constructor() { this.branding = {}; }
  async save() { saves += 1; stored = { ...this }; return this; }
  static findOne() { return chain(stored ? Object.assign(new FakeConfig(), stored) : null); }
}
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: FakeConfig }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn((id) => chain(users[id] || null)), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)), find: jest.fn(() => chain([])), countDocuments: jest.fn(() => chain(0)) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
const auditCreate = jest.fn(async (d) => ({ ...d }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc: jest.fn(), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));
let uploadBehaviour = async () => ({ url: "https://res.cloudinary.com/kayadcloud/image/upload/v1/kayad/branding/new.png", thumb: "t" });
const uploadImage = jest.fn((...a) => uploadBehaviour(...a));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadImage, default: {} }));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { isAllowedLogoUrl, validateBranding } = await import("../../utils/brandingValidation.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
for (const role of ["admin", "superadmin", "moderator", "marketing", "hr", "technical_support", "ad_manager", "accounts", "dealer", "user"]) {
  users[`u-${role}`] = { _id: `u-${role}`, id: `u-${role}`, email: `${role}@example.test`, name: role, role, status: "approved", emailVerified: true };
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const OLD = "/branding/kayad-road-mark.svg";

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  setStorageEnv();
  stored = { platformName: "KAYAD", branding: { logoType: "image", logoUrl: OLD, logoText: "KAYAD" } }; saves = 0;
  uploadImage.mockClear(); auditCreate.mockClear();
  uploadBehaviour = async () => ({ url: "https://res.cloudinary.com/kayadcloud/image/upload/v1/kayad/branding/new.png", thumb: "t" });
});

const upload = async (as, { bytes = PNG, name = "logo.png", type = "image/png", field = "logo" } = {}) => {
  const form = new FormData();
  if (bytes) form.append(field, new Blob([bytes], { type }), name);
  const r = await fetch(`${base}/api/admin/upload-logo`, { method: "POST", headers: as ? { authorization: `Bearer ${token(as)}` } : {}, body: form });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const publicBranding = async () => (await (await fetch(`${base}/api/admin/public/config`)).json()).config.branding;

describe("upload and persistence", () => {
  test.each(["admin", "superadmin"])("%s uploads a PNG: stored, persisted, audited with the previous logo, and served by the public config", async (as) => {
    const r = await upload(`u-${as}`);
    expect(r.status).toBe(200);
    expect(r.body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/kayadcloud\//);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(stored.branding).toMatchObject({ logoType: "image", logoUrl: r.body.url, logoText: "KAYAD" });
    expect((await publicBranding()).logoUrl).toBe(r.body.url); // what every page renders after refresh / re-login
    const audit = auditCreate.mock.calls.map(([e]) => e).find((e) => e.action === "Platform logo updated");
    expect(audit.details).toMatchObject({ previousLogoUrl: OLD, logoUrl: r.body.url });
  });
  test("the upload does not wipe other branding fields", async () => {
    stored.branding = { ...stored.branding, primaryColor: "#112233", brandTagline: "Cars" };
    await upload("u-admin");
    expect(stored.branding).toMatchObject({ primaryColor: "#112233", brandTagline: "Cars" });
  });
});

describe("authorization", () => {
  test.each(["moderator", "marketing", "hr", "technical_support", "ad_manager", "accounts", "dealer", "user"])("%s cannot change the logo", async (role) => {
    const before = JSON.stringify(stored);
    const r = await upload(`u-${role}`);
    expect(r.status).toBe(403);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(JSON.stringify(stored)).toBe(before);
    expect(saves).toBe(0);
  });
  test("unauthenticated ⇒ 401", async () => {
    expect((await upload(null)).status).toBe(401);
    expect(uploadImage).not.toHaveBeenCalled();
  });
});

describe("validation: invalid files change nothing", () => {
  const unchanged = () => { expect(stored.branding.logoUrl).toBe(OLD); expect(saves).toBe(0); expect(uploadImage).not.toHaveBeenCalled(); };
  test("what the broken client sent ({\"logo\":{}} as JSON) is refused with a clear code", async () => {
    const r = await fetch(`${base}/api/admin/upload-logo`, { method: "POST", headers: { authorization: `Bearer ${token("u-admin")}`, "content-type": "application/json" }, body: JSON.stringify({ logo: {} }) });
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe("LOGO_FILE_MISSING");
    unchanged();
  });
  test("no file field ⇒ 400", async () => { const r = await upload("u-admin", { bytes: null }); expect(r.status).toBe(400); unchanged(); });
  test.each([
    ["SVG", { bytes: Buffer.from("<svg/>"), name: "l.svg", type: "image/svg+xml" }],
    ["GIF", { bytes: Buffer.from("GIF89a000000"), name: "l.gif", type: "image/gif" }],
    ["PDF", { bytes: Buffer.from("%PDF-1.4"), name: "l.pdf", type: "application/pdf" }],
    ["text disguised as .png", { bytes: Buffer.from("not an image at all"), name: "l.png", type: "image/png" }],
    ["wrong extension", { bytes: PNG, name: "l.exe", type: "image/png" }],
  ])("%s is rejected", async (_n, file) => { const r = await upload("u-admin", file); expect(r.status).toBe(400); unchanged(); });
  test("over 5 MB is rejected", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10, 2)]);
    const r = await upload("u-admin", { bytes: big });
    expect(r.status).toBe(400);
    unchanged();
  });
});

describe("failures leave the current logo in place", () => {
  test("storage not configured ⇒ 503 LOGO_STORAGE_NOT_CONFIGURED, no secret in the response", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    const r = await upload("u-admin");
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("LOGO_STORAGE_NOT_CONFIGURED");
    expect(r.body.message).not.toMatch(/CLOUDINARY_API_SECRET|SUPER-SECRET/);
    expect(stored.branding.logoUrl).toBe(OLD);
    expect(saves).toBe(0);
  });
  test("provider failure (interrupted upload) ⇒ 502, current logo kept, provider text and credentials not echoed", async () => {
    uploadBehaviour = async () => { throw new Error("connect ETIMEDOUT api_key=k SUPER-SECRET-VALUE"); };
    const r = await upload("u-admin");
    expect(r.status).toBe(502);
    expect(r.body.code).toBe("LOGO_UPLOAD_FAILED");
    expect(JSON.stringify(r.body)).not.toMatch(/SUPER-SECRET|ETIMEDOUT|api_key/);
    expect(stored.branding.logoUrl).toBe(OLD);
    expect(saves).toBe(0);
  });
  test.each([[undefined], ["http://evil.example/x.png"], ["https://res.cloudinary.com/othercloud/image/upload/x.png"], ["javascript:alert(1)"]])("provider returning an unusable URL (%s) is not stored", async (url) => {
    uploadBehaviour = async () => ({ url });
    const r = await upload("u-admin");
    expect(r.status).toBe(502);
    expect(stored.branding.logoUrl).toBe(OLD);
    expect(saves).toBe(0);
  });
});

describe("branding saved through PUT /config is validated on the server", () => {
  const put = (branding, as = "u-admin") => fetch(`${base}/api/admin/config`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token(as)}` }, body: JSON.stringify({ branding }) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  test.each([["javascript:alert(1)"], ["http://evil.example/logo.png"], ["//evil.example/logo.png"], ["/branding/../../etc/passwd"], [123]])("logoUrl %s ⇒ 400 BRANDING_INVALID, nothing saved", async (logoUrl) => {
    const r = await put({ logoType: "image", logoUrl });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("BRANDING_INVALID");
    expect(stored.branding.logoUrl).toBe(OLD);
  });
  test("bad logo type / colour / over-long text ⇒ 400", async () => {
    for (const b of [{ logoType: "video" }, { primaryColor: "red; background:url(x)" }, { logoText: "x".repeat(41) }]) expect((await put(b)).status).toBe(400);
  });
  test("a valid branding object saves and is returned by the public config", async () => {
    const r = await put({ logoType: "image", logoUrl: "https://res.cloudinary.com/kayadcloud/image/upload/v2/a.png", logoText: "KAYAD", primaryColor: "#0A3340" });
    expect(r.status).toBeLessThan(300);
    expect((await publicBranding()).logoUrl).toBe("https://res.cloudinary.com/kayadcloud/image/upload/v2/a.png");
  });
  test("a moderator cannot save branding", async () => { expect((await put({ logoText: "X" }, "u-moderator")).status).toBe(403); });
});

describe("isAllowedLogoUrl / validateBranding units", () => {
  test("allow-list", () => {
    expect(isAllowedLogoUrl("/branding/kayad-road-mark.svg")).toBe(true);
    expect(isAllowedLogoUrl("")).toBe(true);
    expect(isAllowedLogoUrl("https://res.cloudinary.com/kayadcloud/a.png", { CLOUDINARY_CLOUD_NAME: "kayadcloud" })).toBe(true);
    expect(isAllowedLogoUrl("https://res.cloudinary.com/other/a.png", { CLOUDINARY_CLOUD_NAME: "kayadcloud" })).toBe(false);
    expect(isAllowedLogoUrl("https://user:pw@res.cloudinary.com/kayadcloud/a.png", {})).toBe(false);
    expect(validateBranding(null).ok).toBe(false);
  });
});
