// HTTP boundary of PATCH /api/cars/:id/lifecycle: authentication, personal-only access, server-side identity, input validation, error mapping.
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import express from "express";

const auth = { user: null };
const transition = jest.fn();
const audit = jest.fn(async () => {});
const pass = (req, res, next) => next();
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, res, next) => (auth.user ? ((req.user = { ...auth.user }), next()) : res.status(401).json({ success: false })),
  dealerOnly: pass, adminOnly: pass, optionalAuth: pass,
}));
jest.unstable_mockModule("../../middleware/sellerCapability.js", () => ({ sellerListingAccess: () => pass }));
jest.unstable_mockModule("../../middleware/rateLimiter.js", () => ({ createLimiter: pass, uploadLimiter: pass }));
jest.unstable_mockModule("../../middleware/cacheMiddleware.js", () => ({ cacheResponse: () => pass, cacheResponseAnonymous: () => pass, invalidateCache: () => pass }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: audit }));
jest.unstable_mockModule("../../services/personalListingLifecycle.service.js", () => ({ transitionPersonalListing: transition }));
// Server-side ownership read performed before any status change (the route no longer relies on the status function to check ownership).
const ownership = { row: null, error: null };
const actualSupabase = await import("../../utils/supabase.js");
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  ...actualSupabase,
  getSupabase: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ownership.row, error: ownership.error }) }) }) }) }),
}));

const routes = await import("../../routes/carRoutes.js");
const ID = "123e4567-e89b-42d3-a456-426614174000";

describe("PATCH /api/cars/:id/lifecycle", () => {
  let server, base;
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use("/api/cars", routes.default);
    await new Promise((r) => { server = http.createServer(app).listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  beforeEach(() => { auth.user = null; transition.mockReset(); audit.mockClear(); ownership.row = null; ownership.error = null; });
  const patch = async (body, id = ID) => { const r = await fetch(`${base}/api/cars/${id}/lifecycle`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

  test("anonymous callers are rejected before any service call", async () => {
    expect((await patch({ action: "hide" })).status).toBe(401); expect(transition).not.toHaveBeenCalled();
  });
  test.each(["dealer", "admin", "superadmin", "inspector", "garage"])("%s accounts cannot use the personal lifecycle route", async (role) => {
    auth.user = { id: "x1", role };
    const r = await patch({ action: "hide" });
    expect(r.status).toBe(403); expect(r.body.code).toBe("PERSONAL_ACCOUNT_REQUIRED"); expect(transition).not.toHaveBeenCalled();
  });
  test.each(["user", "individual_seller"])("%s uses their authenticated identity, never a client-supplied owner", async (role) => {
    auth.user = { id: "owner-1", role };
    ownership.row = { id: ID, dealer_id: "owner-1", deleted_at: null };
    transition.mockResolvedValue({ id: ID, status: "hidden", action: "hide" });
    const r = await patch({ action: "hide", ownerId: "someone-else", userId: "someone-else", dealer: "someone-else" });
    expect(r.status).toBe(200);
    expect(transition).toHaveBeenCalledWith({ carId: ID, ownerId: "owner-1", action: "hide" });
    expect(audit).toHaveBeenCalledWith(expect.anything(), "personal_listing_hide", expect.objectContaining({ target: ID }));
  });
  test("unsupported actions are rejected", async () => {
    auth.user = { id: "owner-1", role: "user" };
    for (const action of ["delete", "approve", "", undefined]) expect((await patch({ action })).status).toBe(400);
    expect(transition).not.toHaveBeenCalled();
  });
  test("malformed listing ids are rejected before the service", async () => {
    auth.user = { id: "owner-1", role: "user" };
    expect((await patch({ action: "hide" }, "not-a-uuid")).status).toBe(400); expect(transition).not.toHaveBeenCalled();
  });
  test("a locked listing returns the safe conflict message and writes no audit entry", async () => {
    auth.user = { id: "owner-1", role: "user" };
    ownership.row = { id: ID, dealer_id: "owner-1", deleted_at: null };
    transition.mockRejectedValue(Object.assign(new Error("An active purchase or escrow transaction protects this listing."), { status: 409, code: "TRANSACTION_LOCK", expose: true }));
    const r = await patch({ action: "mark_sold" });
    expect(r.status).toBe(409); expect(r.body.code).toBe("TRANSACTION_LOCK"); expect(audit).not.toHaveBeenCalled();
  });
  test("another account's listing is reported as not found and never reaches the status service", async () => {
    auth.user = { id: "intruder", role: "user" };
    ownership.row = { id: ID, dealer_id: "owner-1", deleted_at: null };
    const r = await patch({ action: "mark_sold" });
    expect(r.status).toBe(404); expect(r.body.code).toBe("LISTING_NOT_FOUND");
    expect(transition).not.toHaveBeenCalled(); expect(audit).not.toHaveBeenCalled();
  });
  test("a missing or removed listing is reported identically and never reaches the status service", async () => {
    auth.user = { id: "owner-1", role: "user" };
    ownership.row = null;
    expect((await patch({ action: "hide" })).status).toBe(404);
    ownership.row = { id: ID, dealer_id: "owner-1", deleted_at: "2026-11-01T00:00:00Z" };
    expect((await patch({ action: "hide" })).status).toBe(404);
    expect(transition).not.toHaveBeenCalled();
  });
  test("an unreadable ownership record fails closed (5xx) without calling the status service", async () => {
    auth.user = { id: "owner-1", role: "user" };
    ownership.error = Object.assign(new Error("db down"), { code: "57014" });
    const r = await patch({ action: "hide" });
    expect(r.status).toBeGreaterThanOrEqual(500); expect(transition).not.toHaveBeenCalled();
  });
});
