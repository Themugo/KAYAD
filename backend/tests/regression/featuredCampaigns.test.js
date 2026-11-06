// ============================================================
// HOMEPAGE FEATURED-VEHICLE CAMPAIGNS (Super Admin): validation, derived status, overlap, scheduling in absolute time,
// public "current" feed, history, admin authorization, and the homepage-never-breaks fallback.
// EVIDENCE TIER: mocked local runtime (in-memory PostgREST fake). The migration has not been run on the hosted database.
// ============================================================
import { describe, test, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import http from "http";
import express from "express";

const { makeCampaignDb } = await import("../helpers/fakeCampaignDb.js");
let fake = makeCampaignDb();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fake }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
const auth = { user: null };
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, res, next) => (auth.user ? ((req.user = auth.user), next()) : res.status(401).json({ success: false, message: "Not authorized" })),
  optionalAuth: (req, res, next) => next(),
}));
jest.unstable_mockModule("../../middleware/role.js", () => ({
  authorize: (...roles) => (req, res, next) => (roles.includes(req.user?.role) ? next() : res.status(403).json({ success: false, message: "Forbidden" })),
}));

const svc = await import("../../services/featuredCampaigns.service.js");
const routes = await import("../../routes/featuredCampaignRoutes.js");

const NOW = new Date("2026-11-10T09:00:00+03:00"); // Tuesday morning, Nairobi
const CAR_A = "11111111-1111-4111-8111-111111111111";
const CAR_B = "22222222-2222-4222-8222-222222222222";
const CAR_SOLD = "33333333-3333-4333-8333-333333333333";
const at = (d, t = "08:00") => `${d}T${t}:00+03:00`;
const seed = () => {
  fake.tables.cars.push(
    { id: CAR_A, title: "Sample SUV", brand: "Toyota", model: "Prado", year: 2020, price: 1, status: "available", images: [{ url: "https://img/a.jpg" }], deleted_at: null },
    { id: CAR_B, title: "Sample sedan", brand: "Honda", model: "Civic", year: 2021, price: 2, status: "available", images: [], deleted_at: null },
    { id: CAR_SOLD, title: "Sold car", brand: "Kia", model: "Rio", year: 2019, price: 3, status: "sold", images: [], deleted_at: null },
  );
};
beforeEach(() => { fake = makeCampaignDb(); seed(); auth.user = null; });

describe("validation", () => {
  test("rejects a time without a zone, an end before the start, an over-long period and an already-ended campaign", async () => {
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: "2026-11-12T08:00", endsAt: at("2026-11-20"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_TIME_INVALID" });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-20"), endsAt: at("2026-11-12"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_PERIOD_INVALID" });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2028-01-01"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_PERIOD_TOO_LONG" });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-10-01"), endsAt: at("2026-10-05"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_ALREADY_ENDED" });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), displayOrder: 0, now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_ORDER_INVALID" });
  });
  test("only available vehicles can be featured", async () => {
    await expect(svc.createCampaign({ carId: CAR_SOLD, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_CAR_UNAVAILABLE" });
    await expect(svc.createCampaign({ carId: "44444444-4444-4444-8444-444444444444", startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_CAR_NOT_FOUND" });
    await expect(svc.createCampaign({ carId: "nope", startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_CAR_INVALID" });
  });
  test("the same vehicle cannot have two overlapping campaigns, but back-to-back is fine", async () => {
    await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-15"), endsAt: at("2026-11-25"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_OVERLAP" });
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-20"), endsAt: at("2026-11-25"), now: NOW })).resolves.toMatchObject({ state: "upcoming" });
  });
});

describe("status is derived from Nairobi-time periods", () => {
  test("upcoming, current, expired and inactive", async () => {
    const mk = (s, e) => ({ starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), paused: false });
    expect(svc.campaignState(mk(at("2026-11-12"), at("2026-11-20")), NOW)).toBe("upcoming");
    expect(svc.campaignState(mk(at("2026-11-01"), at("2026-11-20")), NOW)).toBe("current");
    expect(svc.campaignState(mk(at("2026-11-01"), at("2026-11-10", "09:00")), NOW)).toBe("expired"); // end instant is exclusive
    expect(svc.campaignState({ ...mk(at("2026-11-01"), at("2026-11-20")), paused: true }, NOW)).toBe("inactive");
  });
  test("08:00 Nairobi is 05:00 UTC", async () => {
    const c = await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12", "08:00"), endsAt: at("2026-11-20", "23:59"), now: NOW });
    expect(c.startsAt).toBe("2026-11-12T05:00:00.000Z");
    expect(c.endsAt).toBe("2026-11-20T20:59:00.000Z");
  });
});

describe("management", () => {
  test("list shows counts and vehicle details; pause/resume/end/delete keep a history", async () => {
    const live = await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW });
    fake.tables.featured_vehicle_campaigns[0].starts_at = new Date(at("2026-11-01")).toISOString(); // running now
    const up = await svc.createCampaign({ carId: CAR_B, startsAt: at("2026-11-14"), endsAt: at("2026-11-18"), displayOrder: 2, now: NOW });
    let l = await svc.listCampaigns({ now: NOW });
    expect(l.counts).toEqual({ current: 1, upcoming: 1, expired: 0, inactive: 0 });
    expect(l.timezone).toBe("Africa/Nairobi");
    expect(l.campaigns.find((c) => c.id === live.id).vehicle).toMatchObject({ make: "Toyota", model: "Prado", image: "https://img/a.jpg" });
    await svc.setPaused(up.id, true, { userId: "u1", now: NOW });
    expect((await svc.listCampaigns({ now: NOW })).counts.inactive).toBe(1);
    await svc.setPaused(up.id, false, { userId: "u1", now: NOW });
    await svc.endNow(live.id, { userId: "u1", now: NOW });
    await expect(svc.endNow(up.id, { userId: "u1", now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_NOT_CURRENT" });
    await svc.deleteCampaign(up.id, { userId: "u1" });
    const actions = (await svc.listHistory()).map((h) => h.action);
    expect(actions).toEqual(expect.arrayContaining(["created", "paused", "resumed", "ended", "deleted"]));
    expect((await svc.listCampaigns({ now: NOW })).campaigns).toHaveLength(1);
  });
  test("a failed history write never fails a committed change", async () => {
    fake.state.failHistory = true;
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW })).resolves.toMatchObject({ state: "upcoming" });
    expect(spy).toHaveBeenCalledWith("FEATURED_CAMPAIGN_HISTORY_FAILED", expect.any(Object));
    spy.mockRestore();
  });
  test("editing the period re-checks overlap against other campaigns of the same vehicle only", async () => {
    const a = await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-14"), now: NOW });
    await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-16"), endsAt: at("2026-11-18"), now: NOW });
    await expect(svc.updateCampaign(a.id, { endsAt: at("2026-11-17"), now: NOW })).rejects.toMatchObject({ code: "CAMPAIGN_OVERLAP" });
    await expect(svc.updateCampaign(a.id, { endsAt: at("2026-11-15"), displayOrder: 3, now: NOW })).resolves.toMatchObject({ displayOrder: 3 });
  });
});

describe("public feed", () => {
  test("returns only running, unpaused campaigns of available vehicles, in display order", async () => {
    const mk = async (carId, s, e, order) => { const c = await svc.createCampaign({ carId, startsAt: at(s), endsAt: at(e), displayOrder: order, now: NOW }); return c; };
    const a = await mk(CAR_A, "2026-11-12", "2026-11-20", 2);
    const b = await mk(CAR_B, "2026-11-12", "2026-11-20", 1);
    fake.tables.featured_vehicle_campaigns.forEach((r) => { r.starts_at = new Date(at("2026-11-01")).toISOString(); });
    expect((await svc.currentPublic({ now: NOW })).carIds).toEqual([CAR_B, CAR_A]);
    await svc.setPaused(b.id, true, { userId: "u", now: NOW });
    expect((await svc.currentPublic({ now: NOW })).carIds).toEqual([CAR_A]);
    fake.tables.cars.find((c) => c.id === CAR_A).status = "sold";
    expect((await svc.currentPublic({ now: NOW })).carIds).toEqual([]);
    void a;
  });
  test("an upcoming or expired campaign is never public", async () => {
    await svc.createCampaign({ carId: CAR_A, startsAt: at("2026-11-12"), endsAt: at("2026-11-20"), now: NOW });
    expect((await svc.currentPublic({ now: NOW })).carIds).toEqual([]);
    expect((await svc.currentPublic({ now: new Date(at("2026-11-21")) })).carIds).toEqual([]);
    expect((await svc.currentPublic({ now: new Date(at("2026-11-13")) })).carIds).toEqual([CAR_A]);
  });
});

describe("HTTP", () => {
  let server, base;
  beforeAll(async () => {
    const app = express(); app.use(express.json());
    app.use("/api/admin/featured-campaigns", routes.default);
    app.use("/api/featured-campaigns", routes.publicRouter);
    await new Promise((r) => { server = http.createServer(app).listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  const call = async (method, path, body) => { const r = await fetch(base + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

  test("admin API refuses anonymous visitors and non-admin roles", async () => {
    expect((await call("GET", "/api/admin/featured-campaigns")).status).toBe(401);
    auth.user = { id: "u", role: "buyer" };
    expect((await call("GET", "/api/admin/featured-campaigns")).status).toBe(403);
    expect((await call("POST", "/api/admin/featured-campaigns", { carId: CAR_A, startsAt: at("2030-01-01"), endsAt: at("2030-01-05") })).status).toBe(403);
  });
  test("an administrator can create, list, pause and (with confirmation) delete", async () => {
    auth.user = { id: "u1", role: "superadmin" };
    const c = await call("POST", "/api/admin/featured-campaigns", { carId: CAR_A, startsAt: at("2030-01-01"), endsAt: at("2030-01-05") });
    expect(c.status).toBe(201);
    const id = c.body.campaign.id;
    expect((await call("GET", "/api/admin/featured-campaigns")).body.counts.upcoming).toBe(1);
    expect((await call("POST", `/api/admin/featured-campaigns/${id}/pause`)).body.campaign.state).toBe("inactive");
    expect((await call("DELETE", `/api/admin/featured-campaigns/${id}`, {})).status).toBe(400);
    expect((await call("DELETE", `/api/admin/featured-campaigns/${id}`, { confirm: true })).status).toBe(200);
    expect((await call("POST", "/api/admin/featured-campaigns", { carId: CAR_A })).status).toBe(400);
  });
  test("a missing table gives admins a clear 503 and the public feed an empty list", async () => {
    auth.user = { id: "u1", role: "admin" };
    fake.state.failTable = "featured_vehicle_campaigns";
    const a = await call("GET", "/api/admin/featured-campaigns");
    expect(a.status).toBe(503); expect(a.body.code).toBe("FEATURED_CAMPAIGNS_NOT_SET_UP");
    const p = await call("GET", "/api/featured-campaigns/current");
    expect(p.status).toBe(200); expect(p.body.carIds).toEqual([]);
  });
});
