// Stage 3 (2026-10-13) — POST /api/leads (createLeadManual) and POST /api/leads/:leadId/notes (addNote).
// Mounts the REAL backend/routes/leadRoutes.js router (real protect → dealerOnly → zod validate → controller → leadService)
// on an ephemeral HTTP server. Only the data layer is faked: models used by protect(), db/index.js and the Supabase RPC.
// The fake RPC implements create-or-find on the documented business key (buyer, dealer, vehicle, source, source_reference),
// i.e. the behaviour of runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql; the SQL itself is exercised
// against real PostgreSQL by scripts/rehearse-stage3-lead-privileges-local.sh.
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = "s".repeat(48);
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

const ID = {
  dealer: "a0000000-0000-4000-8000-000000000001",
  dealer2: "a0000000-0000-4000-8000-000000000002",
  seller: "a0000000-0000-4000-8000-000000000003",
  buyer: "a0000000-0000-4000-8000-000000000004",
  admin: "a0000000-0000-4000-8000-000000000005",
  inspector: "a0000000-0000-4000-8000-000000000006",
  carOwn: "c0000000-0000-4000-8000-000000000001",
  carForeign: "c0000000-0000-4000-8000-000000000002",
  missing: "f0000000-0000-4000-8000-000000000009",
};
const USERS = {
  [ID.dealer]: { id: ID.dealer, email: "d@example.test", role: "dealer" },
  [ID.dealer2]: { id: ID.dealer2, email: "d2@example.test", role: "dealer" },
  [ID.seller]: { id: ID.seller, email: "s@example.test", role: "individual_seller" },
  [ID.buyer]: { id: ID.buyer, email: "b@example.test", role: "user" },
  [ID.admin]: { id: ID.admin, email: "a@example.test", role: "admin" },
  [ID.inspector]: { id: ID.inspector, email: "i@example.test", role: "inspector" },
};
const CARS = {
  [ID.carOwn]: { id: ID.carOwn, dealer: ID.dealer, price: 2500000 },
  [ID.carForeign]: { id: ID.carForeign, dealer: ID.dealer2, price: 900000 },
};

// ── fake persistence ───────────────────────────────────────────────────────────────────────────────────────────────
let leads; let activities; let failNotesWrite;
const key = (b, d, v, s, r) => [b || "", d || "", v || "", s || "", r || ""].join("|");
const rpc = jest.fn(async (name, p) => {
  if (name !== "kayad_create_lead_atomic") return { data: null, error: { message: "unexpected rpc" } };
  const k = key(p.p_buyer, p.p_dealer, p.p_vehicle, p.p_source, p.p_source_reference);
  const existing = leads.find((l) => l._key === k);
  if (existing) return { data: { lead: { ...existing }, created: false }, error: null };
  const lead = { id: `lead-${leads.length + 1}`, _key: k, buyer: p.p_buyer, dealer: p.p_dealer, vehicle: p.p_vehicle, source: p.p_source, sourceReference: p.p_source_reference, estimatedValue: p.p_estimated_value, notes: null, stage: "new" };
  leads.push(lead);
  return { data: { lead: { ...lead }, created: true }, error: null };
});
const findById = jest.fn(async (table, id) => {
  if (table === "users") return USERS[id] ? { ...USERS[id] } : null;
  if (table === "cars") return CARS[id] ? { ...CARS[id] } : null;
  if (table === "leads") { const l = leads.find((x) => x.id === id); return l ? { ...l } : null; }
  return null;
});
const update = jest.fn(async (table, id, data) => {
  if (table === "leads" && "notes" in data && failNotesWrite) throw new Error("db write failed: secret-internal-detail");
  const l = leads.find((x) => x.id === id);
  if (!l) throw Object.assign(new Error("Lead not found"), { statusCode: 404 });
  Object.assign(l, data);
  return { ...l };
});
const create = jest.fn(async (table, row) => { activities.push({ table, ...row }); return { id: `act-${activities.length}`, ...row }; });
const noop = jest.fn(async () => []);

jest.unstable_mockModule("../../db/index.js", () => ({ findAll: noop, findById, findOne: jest.fn(async () => null), create, update, updateMany: noop, count: jest.fn(async () => 0), aggregate: noop }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));
jest.unstable_mockModule("../../services/leadTimelineService.js", () => ({ addTimelineEvent: jest.fn(async () => ({})), getLeadTimeline: jest.fn(async () => []) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const chain = (get) => ({ select: () => chain(get), lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) });
jest.unstable_mockModule("../../models/User.js", () => ({ default: {
  findById: (id) => chain(() => (USERS[id] ? { ...USERS[id], status: "approved", isBanned: false, emailVerified: true, grantedPermissions: [], revokedPermissions: [] } : null)),
  findByIdAndUpdate: () => Promise.resolve(),
} }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: () => chain(() => ({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: async () => ({ id: "s" }) } }));

const { default: leadRoutes } = await import("../../routes/leadRoutes.js");

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/leads", leadRoutes);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => { await new Promise((r) => server.close(r)); });
beforeEach(() => { leads = []; activities = []; failNotesWrite = false; rpc.mockClear(); update.mockClear(); create.mockClear(); });

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET, { algorithm: "HS256" });
const post = async (path, body, as) => {
  const headers = { "content-type": "application/json" };
  if (as) headers.authorization = `Bearer ${token(as)}`;
  const r = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const valid = (extra = {}) => ({ buyerId: ID.buyer, source: "walk-in", ...extra });
const expectNoMutation = () => { expect(rpc).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled(); expect(leads).toHaveLength(0); };

describe("POST /api/leads — authorization (checked before any write)", () => {
  test("unauthenticated → 401, nothing written", async () => {
    const r = await post("/api/leads", valid());
    expect(r.status).toBe(401);
    expect(r.body.success).toBe(false);
    expectNoMutation();
  });
  test("invalid bearer token → 401, nothing written", async () => {
    const r = await fetch(`${base}/api/leads`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer not-a-jwt" }, body: JSON.stringify(valid()) });
    expect(r.status).toBe(401);
    expectNoMutation();
  });
  test.each([["buyer (role user)", ID.buyer], ["inspector", ID.inspector]])("authenticated %s → 403, nothing written", async (_n, who) => {
    const r = await post("/api/leads", valid({ buyerId: ID.dealer }), who);
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ success: false, message: "Dealer or seller access only" });
    expectNoMutation();
  });
  test("an unauthorized caller with an invalid payload still gets 403 (authorization precedes validation)", async () => {
    const r = await post("/api/leads", { nonsense: true }, ID.buyer);
    expect(r.status).toBe(403);
    expectNoMutation();
  });
  test("dealer creating a lead on another dealer's vehicle → 403, nothing written", async () => {
    const r = await post("/api/leads", valid({ vehicleId: ID.carForeign }), ID.dealer);
    expect(r.status).toBe(403);
    expect(r.body.message).toMatch(/not authorized/i);
    expectNoMutation();
  });
});

describe("POST /api/leads — authorized creation and response contract", () => {
  test.each([["dealer", ID.dealer], ["individual_seller", ID.seller], ["admin (staff, existing dealerOnly convention)", ID.admin]])("%s → 201 with {success, created, lead}", async (_n, who) => {
    const r = await post("/api/leads", valid(), who);
    expect(r.status).toBe(201);
    expect(Object.keys(r.body).sort()).toEqual(["created", "lead", "success"]);
    expect(r.body.success).toBe(true);
    expect(r.body.created).toBe(true);
    expect(r.body.lead).toMatchObject({ id: expect.any(String), buyer: ID.buyer, dealer: who, source: "walk-in", sourceReference: null });
    expect(leads).toHaveLength(1);
  });
  test("the lead's dealer is always the caller; a spoofed dealerId in the body is ignored", async () => {
    const r = await post("/api/leads", valid({ dealerId: ID.dealer2, dealer: ID.dealer2 }), ID.dealer);
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("kayad_create_lead_atomic", expect.objectContaining({ p_dealer: ID.dealer, p_buyer: ID.buyer }));
    expect(r.body.lead.dealer).toBe(ID.dealer);
  });
  test("own vehicle → 201, vehicle and estimated value carried", async () => {
    const r = await post("/api/leads", valid({ vehicleId: ID.carOwn }), ID.dealer);
    expect(r.status).toBe(201);
    expect(r.body.lead).toMatchObject({ vehicle: ID.carOwn, estimatedValue: 2500000 });
  });
  test("source is trimmed; notes are persisted through update() — no .save() on a plain row", async () => {
    const r = await post("/api/leads", valid({ source: "  phone  ", notes: "  call after 5pm " }), ID.dealer);
    expect(r.status).toBe(201);
    expect(r.body.lead.source).toBe("phone");
    expect(r.body.lead.notes).toBe("call after 5pm");
    expect(update).toHaveBeenCalledWith("leads", r.body.lead.id, expect.objectContaining({ notes: "call after 5pm" }));
    expect(leads[0].notes).toBe("call after 5pm");
  });
});

describe("POST /api/leads — invalid payloads are rejected before any write", () => {
  test.each([
    ["missing buyerId", { source: "walk-in" }],
    ["missing source", { buyerId: ID.buyer }],
    ["buyerId not a UUID", { buyerId: "123", source: "walk-in" }],
    ["vehicleId not a UUID", { buyerId: ID.buyer, source: "walk-in", vehicleId: "car-1" }],
    ["blank source", { buyerId: ID.buyer, source: "   " }],
    ["source too long", { buyerId: ID.buyer, source: "x".repeat(51) }],
    ["notes too long", { buyerId: ID.buyer, source: "walk-in", notes: "n".repeat(4001) }],
  ])("%s → 400 Validation failed", async (_n, body) => {
    const r = await post("/api/leads", body, ID.dealer);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ success: false, message: "Validation failed" });
    expectNoMutation();
  });
  test("buyer equal to the dealer → 400", async () => {
    const r = await post("/api/leads", valid({ buyerId: ID.dealer }), ID.dealer);
    expect(r.status).toBe(400);
    expectNoMutation();
  });
  test("unknown buyer → 400", async () => {
    const r = await post("/api/leads", valid({ buyerId: ID.missing }), ID.dealer);
    expect(r.status).toBe(400);
    expect(r.body.message).toBe("Buyer not found");
    expectNoMutation();
  });
  test("unknown vehicle → 400", async () => {
    const r = await post("/api/leads", valid({ vehicleId: ID.missing }), ID.dealer);
    expect(r.status).toBe(400);
    expect(r.body.message).toBe("Vehicle not found");
    expectNoMutation();
  });
});

describe("POST /api/leads — repeated submission and persistence failure", () => {
  test("identical repeat → 200 created:false, same lead, one row, notes not overwritten", async () => {
    const a = await post("/api/leads", valid({ notes: "first" }), ID.dealer);
    update.mockClear();
    const b = await post("/api/leads", valid({ notes: "second" }), ID.dealer);
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.created).toBe(false);
    expect(b.body.lead.id).toBe(a.body.lead.id);
    expect(b.body.lead.notes).toBe("first");
    expect(update).not.toHaveBeenCalled();
    expect(leads).toHaveLength(1);
  });
  test("a different business key (other vehicle/source) is a genuinely new lead", async () => {
    await post("/api/leads", valid(), ID.dealer);
    const r = await post("/api/leads", valid({ source: "phone" }), ID.dealer);
    expect(r.status).toBe(201);
    expect(leads).toHaveLength(2);
  });
  test("notes write failure → 500 with a safe message (no internal detail)", async () => {
    failNotesWrite = true;
    const r = await post("/api/leads", valid({ notes: "x" }), ID.dealer);
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ success: false, message: "Failed to create lead" });
    expect(JSON.stringify(r.body)).not.toMatch(/secret-internal-detail/);
  });
  test("retry after a failed notes write completes the notes on the existing lead (no duplicate)", async () => {
    failNotesWrite = true;
    await post("/api/leads", valid({ notes: "retry me" }), ID.dealer);
    failNotesWrite = false;
    const r = await post("/api/leads", valid({ notes: "retry me" }), ID.dealer);
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(false);
    expect(r.body.lead.notes).toBe("retry me");
    expect(leads).toHaveLength(1);
  });
  test("RPC failure → 500 with a safe message", async () => {
    rpc.mockImplementationOnce(async () => ({ data: null, error: { message: "permission denied for table leads" } }));
    const r = await post("/api/leads", valid(), ID.dealer);
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ success: false, message: "Failed to create lead" });
  });
});

describe("POST /api/leads/:leadId/notes — addNote no longer calls .save() on a plain row", () => {
  const seed = () => { leads.push({ id: "lead-x", dealer: ID.dealer, buyer: ID.buyer, notes: null }); };
  test("owning dealer → 200, note persisted and activity recorded", async () => {
    seed();
    const r = await post("/api/leads/lead-x/notes", { note: " follow up Monday " }, ID.dealer);
    expect(r.status).toBe(200);
    expect(r.body.lead.notes).toBe("follow up Monday");
    expect(leads[0].notes).toBe("follow up Monday");
    expect(activities).toHaveLength(1);
  });
  test("non-owner dealer → 403, nothing written", async () => {
    seed();
    const r = await post("/api/leads/lead-x/notes", { note: "hijack" }, ID.dealer2);
    expect(r.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
    expect(leads[0].notes).toBeNull();
  });
  test("empty note → 400, nothing written", async () => {
    seed();
    const r = await post("/api/leads/lead-x/notes", { note: "  " }, ID.dealer);
    expect(r.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
