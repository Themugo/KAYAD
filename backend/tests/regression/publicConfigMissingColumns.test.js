// Production schema reality: public.platform_config on the hosted database has NO hero_* / navigation columns (later migrations unapplied).
// The public config used to select them by name, so PostgREST rejected the whole request and the site never received saved branding.
// REAL PlatformConfig model + REAL route; the fake PostgREST rejects any select that names a column the table does not have.
import { describe, test, expect, beforeAll, afterAll, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
const HOSTED_COLUMNS = ["id", "dealer_commission", "created_at", "updated_at", "packages", "free_market", "waive_payments", "platform_name", "support_email", "support_phone", "gallery_title", "gallery_subtitle", "bid_commitment_pct", "escrow_release_days", "max_listing_images", "allow_guest_browsing", "require_dealer_approval", "dealer_trial_days", "font_display", "font_body", "font_size_pct", "base_font_size", "line_height", "listing_fee", "auction_registration_fee", "ghost_check_fee", "commission_percentage", "platform_vat", "buyer_premium_pct", "active_promos", "daraja", "bank", "reconciliation", "branding", "escrow_rules"];
const row = { id: "5c3f7898-5995-43fa-8858-10a7c03bf059", branding: { logoType: "image", logoUrl: "/api/admin/public/logo/0123456789abcdef.png", primaryColor: "#112233" }, platform_name: "KAYAD", allow_guest_browsing: true, daraja: { consumerSecret: "TOP-SECRET" }, bank: {}, reconciliation: {} };
let updates = [];
const table = () => {
  const q = { _cols: "*" };
  q.select = (c = "*") => { q._cols = c; return q; };
  q.limit = () => q; q.eq = () => q; q.order = () => q; q.range = () => q;
  q.update = (p) => { updates.push(p); const bad = Object.keys(p).filter((k) => !HOSTED_COLUMNS.includes(k)); q._err = bad.length ? { code: "PGRST204", message: `Could not find the '${bad[0]}' column of 'platform_config' in the schema cache` } : null; return q; };
  q.single = async () => (q._err ? { data: null, error: q._err } : { data: { ...row }, error: null });
  q.maybeSingle = async () => ({ data: { ...row }, error: null });
  q.then = (res, rej) => {
    if (q._cols !== "*") {
      const bad = String(q._cols).split(",").map((s) => s.trim()).filter((c) => c && !HOSTED_COLUMNS.includes(c));
      if (bad.length) return Promise.resolve({ data: null, error: { code: "42703", message: `column platform_config.${bad[0]} does not exist` } }).then(res, rej);
    }
    return Promise.resolve(q._err ? { data: null, error: q._err } : { data: [{ ...row }], error: null }).then(res, rej);
  };
  return q;
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc: jest.fn(), from: () => table() }),
}));
const chain = (v) => { const q = { select: () => q, lean: () => q, catch: () => q, then: (r, j) => Promise.resolve(v).then(r, j) }; return q; };
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(() => chain({ _id: "a1", id: "a1", email: "a@x.test", name: "A", role: "admin", status: "approved", emailVerified: true })), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: jest.fn(async (d) => d) } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/admin", adminRoutes);
  app.use((err, req, res, _n) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
const tok = jwt.sign({ id: "a1", tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("hosted schema without the later columns", () => {
  test("GET /public/config succeeds and carries the saved branding (the visitor-facing fix)", async () => {
    const r = await fetch(`${base}/api/admin/public/config`);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.config.branding).toMatchObject({ primaryColor: "#112233", logoUrl: "/api/admin/public/logo/0123456789abcdef.png" });
    expect(j.config.platformName).toBe("KAYAD");
    expect(JSON.stringify(j)).not.toMatch(/TOP-SECRET|daraja/); // still only public fields
    expect(j.config.navigation).toBeDefined(); // normalised default
  });
  test("saving branding writes only existing columns and succeeds", async () => {
    updates = [];
    const r = await fetch(`${base}/api/admin/config`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify({ branding: { primaryColor: "#445566" } }) });
    expect(r.status).toBe(200);
    expect(updates.length).toBeGreaterThan(0);
    for (const u of updates) for (const k of Object.keys(u)) expect(HOSTED_COLUMNS).toContain(k);
  });
  test("a setting whose column is missing gets a clear 503 DATABASE_MIGRATION_REQUIRED, not a 500, and is not reported as saved", async () => {
    const r = await fetch(`${base}/api/admin/config`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify({ heroFeaturedMode: "selected" }) });
    expect(r.status).toBe(503);
    const j = await r.json();
    expect(j.success).toBe(false); expect(j.code).toBe("DATABASE_MIGRATION_REQUIRED");
  });
});
