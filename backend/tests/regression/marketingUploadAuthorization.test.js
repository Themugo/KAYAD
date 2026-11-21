import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import express from "express";

const auth = { user: null };
const uploads = { single: jest.fn(), multiple: jest.fn() };
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, res, next) => (auth.user ? ((req.user = auth.user), next()) : res.status(401).json({ success: false })),
}));
jest.unstable_mockModule("../../middleware/role.js", () => ({
  requirePermission: (...permissions) => (req, res, next) => {
    const grants = {
      marketing: ["manage_ads"],
      ad_manager: ["manage_ads"],
      admin: ["manage_ads"],
      superadmin: ["manage_ads"],
    };
    const effective = new Set([...(grants[req.user?.role] || []), ...(req.user?.grantedPermissions || [])]);
    return permissions.every((permission) => effective.has(permission))
      ? next()
      : res.status(403).json({ success: false, code: "MISSING_PERMISSION", message: "Forbidden" });
  },
}));
jest.unstable_mockModule("../../middleware/upload.js", () => ({
  uploadMemory: {
    single: () => (req, res, next) => { req.file = { buffer: Buffer.from("test"), mimetype: "image/png" }; next(); },
    array: () => (req, res, next) => { req.files = [{ buffer: Buffer.from("test"), mimetype: "image/png" }]; next(); },
  },
  handleUploadError: (err, req, res, next) => next(err),
}));
jest.unstable_mockModule("../../middleware/rateLimiter.js", () => ({ uploadLimiter: (req, res, next) => next() }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({
  uploadImage: jest.fn(async () => ({ url: "https://cdn.example/creative.png", public_id: "creative", thumb: null, card: null })),
  uploadMultiple: jest.fn(async () => [{ url: "https://cdn.example/creative.png", public_id: "creative" }]),
  deleteImage: jest.fn(),
}));
jest.unstable_mockModule("../../services/sqlUploadStore.js", () => ({
  getUploadRecord: jest.fn(), getUploadRecordByPublicId: jest.fn(),
}));
jest.unstable_mockModule("../../services/chatAttachments.js", () => ({
  bareFolder: (value) => value,
  hasImageSignature: () => true,
  parseMetadata: () => ({}),
  CHAT_UPLOAD_FOLDER: "chat",
}));

const routes = await import("../../routes/uploadRoutes.js");

describe("marketing upload authorization", () => {
  let server, base;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/upload", routes.default);
    await new Promise((resolve) => { server = http.createServer(app).listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));
  beforeEach(() => { auth.user = null; });

  const call = async (path, body, method = "POST") => {
    const response = await fetch(base + "/api/upload" + (path === "/" ? "" : path), {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  };

  test("marketing folder is denied without MANAGE_ADS", async () => {
    auth.user = { id: "buyer", role: "user" };
    expect((await call("/", { folder: "marketing" })).status).toBe(403);
    expect((await call("/multiple", { folder: "marketing" })).status).toBe(403);
  });

  test("marketing and ad-manager roles can upload marketing creatives", async () => {
    auth.user = { id: "marketing", role: "marketing" };
    expect((await call("/", { folder: "marketing" })).status).toBe(200);
    auth.user = { id: "ads", role: "ad_manager" };
    expect((await call("/multiple", { folder: "marketing" })).status).toBe(200);
  });

  test("other authenticated upload folders keep their existing authorization", async () => {
    auth.user = { id: "buyer", role: "user" };
    expect((await call("/", { folder: "vehicles" })).status).toBe(200);
  });

  test("anonymous uploads remain denied", async () => {
    expect((await call("/", { folder: "marketing" })).status).toBe(401);
  });
});
