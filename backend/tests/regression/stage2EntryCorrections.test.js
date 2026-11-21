// ============================================================
// 2026-10-18 STAGE 2 ENTRY CORRECTIONS — behavioural regressions.
//
//   S2-ESC-01  Auction fulfilment let the ORGANIZER (seller) release buyer escrow:
//              it called escrow.service.releaseEscrow(), which transitions with
//              role "admin", bypassing APPROVE_ESCROW_RELEASE governance and
//              (DB rules) allowing admin release of a `disputed` escrow.
//   S2-AUTH-08 disputeController derived role as effectiveRole||role: the owner
//              ("webhoist") was denied and 'webhoist' would be sent as p_role.
//   S2-FIN-01  Ledger writes (create / reverse / seed) were adminOnly = any staff
//              role; now require MANAGE_FINANCE (documented finance permission).
//   S2-FIN-02  reverseLedgerEntry passed req.user._id (always undefined).
//   S2-SCOPE-01 /market/dealer/insights used req.user._id → undefined filter →
//              db layer skipped it → dealer saw insights over ALL dealers' cars.
// Real middleware (protect/adminOnly/requirePermission/requireRole) and real
// route/controller/service code; only persistence and side-effect services mocked.
// ============================================================
import { describe, test, expect, beforeEach, afterAll, jest } from "@jest/globals";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "s2".repeat(24);
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

// ── identity persistence (real protect) ──────────────────────
const users = {};
const q = (get) => { const c = { select: () => c, lean: () => c, then: (r, j) => Promise.resolve(get()).then(r, j), catch: () => c }; return c; };
jest.unstable_mockModule("../../models/User.js", () => ({
  default: { findById: jest.fn((id) => q(() => (users[id] ? { ...users[id] } : null))), findByIdAndUpdate: jest.fn(() => Promise.resolve()) },
}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => q(() => ({ tokenVersion: 0 }))) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({ id: "s" })) } }));
const auditCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));

// ── auction fulfilment persistence ───────────────────────────
const rows = {};
const dbUpdate = jest.fn(async (table, id, patch) => ({ ...(rows[table]?.[id] || {}), ...patch }));
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: jest.fn(async (table, id) => rows[table]?.[id] ?? null),
  findOne: jest.fn(async () => null), findAll: jest.fn(async () => []),
  create: jest.fn(async () => ({})), update: dbUpdate, updateMany: jest.fn(async () => ({})),
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(async () => {}), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../services/auctionPlatformPolicy.service.js", () => ({ getAuctionPlatformPolicy: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../ownership/services/ownershipService.js", () => ({ ownershipService: {} }));
jest.unstable_mockModule("../../services/dispute.service.js", () => ({ openDispute: jest.fn() }));
jest.unstable_mockModule("../../governance/services/governanceService.js", () => ({ governanceService: {} }));
const serviceRelease = jest.fn(async () => ({}));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({ releaseEscrow: serviceRelease }));

// ── dispute controller deps ──────────────────────────────────
let escrowRow;
const rpc = jest.fn(async () => ({ data: { escrow: { id: "esc-1" } }, error: null }));
const sbClient = {
  rpc,
  from: () => { const c = { select: () => c, eq: () => c, update: () => c, single: async () => ({ data: escrowRow, error: escrowRow ? null : { message: "nf" } }) }; return c; },
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => sbClient, isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../middleware/evidenceUpload.js", () => ({ uploadEvidenceToCloudinary: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async () => {}) }));

// ── ledger + market services ─────────────────────────────────
const ledger = {
  recordLedgerEntry: jest.fn(async (b) => ({ id: "le-1", ...b })),
  reverseLedgerEntry: jest.fn(async (id, by) => ({ id, reversedBy: by })),
  seedAccounts: jest.fn(async () => []),
  listLedgerEntries: jest.fn(async () => []), getLedgerEntry: jest.fn(), getBalanceSheet: jest.fn(), getTrialBalance: jest.fn(), getReconciliationReport: jest.fn(),
};
jest.unstable_mockModule("../../services/ledgerService.js", () => ledger);
const getDealerInsights = jest.fn(async (dealerId) => ({ dealerId }));
jest.unstable_mockModule("../../services/marketIntel.service.js", () => ({ getMarketPulse: jest.fn(async () => ({})), getDealerInsights }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: {} }));

const { releaseAuctionEscrowAndComplete } = await import("../../services/auctionFulfilment.service.js");
const dispute = await import("../../controllers/disputeController.js");
const ledgerRoutes = (await import("../../routes/ledgerRoutes.js")).default;
const marketRoutes = (await import("../../routes/marketRoutes.js")).default;

const UID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const mk = (n, role, email) => { const id = UID(n); users[id] = { id, email: email || `u${n}@example.test`, role, status: "approved", name: `U${n}`, emailVerified: true, grantedPermissions: [], revokedPermissions: [] }; return id; };
const tok = (id) => jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET, { algorithm: "HS256" });
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

let server; let base;
const ensureServer = async () => {
  if (server) return;
  const app = express();
  app.use(express.json());
  app.use("/api/ledger", ledgerRoutes);
  app.use("/api/market", marketRoutes);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ success: false, message: err.message }));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
};
afterAll(() => server && server.close());
const call = async (method, path, id, body) => {
  await ensureServer();
  const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${tok(id)}` }, body: body ? JSON.stringify(body) : undefined });
  return { code: r.status, body: await r.json().catch(() => null) };
};

// ─────────────────────────────────────────────────────────────
describe("S2-ESC-01 organizer cannot release auction escrow", () => {
  const SELLER = "seller-1";
  beforeEach(() => {
    serviceRelease.mockClear(); dbUpdate.mockClear();
    rows.auction_outcomes = { "o-1": { id: "o-1", car_id: "car-1", auction_setup_id: "set-1", settlement_mode: "escrow", escrow_id: "esc-1", collection_status: "collected", status: "payment_pending", transfer_status: "pending" } };
    rows.auction_setups = { "set-1": { id: "set-1", organizer_id: SELLER } };
    rows.cars = { "car-1": { id: "car-1" } };
  });
  test.each(["delivered", "disputed", "funded", "vehicle_confirmed"])("escrow '%s' → 409 ESCROW_RELEASE_REQUIRES_APPROVAL, no release, no outcome write", async (status) => {
    rows.escrows = { "esc-1": { id: "esc-1", status } };
    await expect(releaseAuctionEscrowAndComplete({ outcomeId: "o-1", actorId: SELLER })).rejects.toMatchObject({ status: 409, code: "ESCROW_RELEASE_REQUIRES_APPROVAL" });
    expect(serviceRelease).not.toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });
  test("after a governed release the organizer can complete the outcome", async () => {
    rows.escrows = { "esc-1": { id: "esc-1", status: "released" } };
    const out = await releaseAuctionEscrowAndComplete({ outcomeId: "o-1", actorId: SELLER });
    expect(serviceRelease).not.toHaveBeenCalled();
    expect(out).toMatchObject({ payment_status: "paid" });
  });
  test("a non-organizer is still refused 403", async () => {
    rows.escrows = { "esc-1": { id: "esc-1", status: "released" } };
    await expect(releaseAuctionEscrowAndComplete({ outcomeId: "o-1", actorId: "someone-else" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("S2-AUTH-08 dispute controller uses the canonical role", () => {
  beforeEach(() => { rpc.mockClear(); escrowRow = { id: "esc-1", buyer: "b", seller: "s", status: "disputed", disputeAppeal: { status: "pending" } }; });
  const OWNER = { id: "own", role: "superadmin", effectiveRole: "webhoist" };
  test("owner can resolve a dispute", async () => {
    const res = mkRes();
    await dispute.resolveDispute({ params: { id: "esc-1" }, user: OWNER, body: { decision: "refund" }, get: () => null }, res);
    expect(res.body?.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("kayad_resolve_dispute_atomic", expect.any(Object));
  });
  test("owner's appeal review sends p_role 'superadmin' (a role the DB accepts), never 'webhoist'", async () => {
    const res = mkRes();
    await dispute.reviewAppeal({ params: { id: "esc-1" }, user: OWNER, body: { decision: "approve" } }, res);
    const call = rpc.mock.calls.find(([fn]) => fn === "kayad_transition_dispute_atomic");
    expect(call[1].p_role).toBe("superadmin");
  });
  test("ghost_checker is denied and nothing reaches the database", async () => {
    const res = mkRes();
    await dispute.resolveDispute({ params: { id: "esc-1" }, user: { id: "g", role: "ghost_checker", effectiveRole: "ghost_checker" }, body: { decision: "refund" }, get: () => null }, res);
    expect(res.code).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("S2-FIN-01/02 ledger writes require MANAGE_FINANCE; reversal records the actor", () => {
  let ghost; let marketing; let accounts; let admin; let owner;
  beforeEach(() => {
    ghost = mk(11, "ghost_checker"); marketing = mk(12, "marketing"); accounts = mk(13, "accounts"); admin = mk(14, "admin");
    owner = mk(15, "user", "owner@example.test");
    Object.values(ledger).forEach((f) => f.mockClear?.());
  });
  const entry = { account: "cash", amount: 100, type: "debit" };
  test.each([["ghost_checker", () => ghost], ["marketing", () => marketing]])("%s cannot create, reverse or seed", async (_n, who) => {
    expect((await call("POST", "/api/ledger", who(), entry)).code).toBe(403);
    expect((await call("POST", `/api/ledger/${UID(99)}/reverse`, who(), { reason: "x" })).code).toBe(403);
    expect((await call("POST", "/api/ledger/seed", who())).code).toBe(403);
    expect(ledger.recordLedgerEntry).not.toHaveBeenCalled();
    expect(ledger.reverseLedgerEntry).not.toHaveBeenCalled();
    expect(ledger.seedAccounts).not.toHaveBeenCalled();
  });
  test("accounts (MANAGE_FINANCE) may seed; reversal is attributed to the real user id", async () => {
    expect((await call("POST", "/api/ledger/seed", accounts)).code).toBe(200);
    const r = await call("POST", `/api/ledger/${UID(99)}/reverse`, accounts, { reason: "duplicate posting" });
    expect(r.code).toBe(200);
    expect(ledger.reverseLedgerEntry).toHaveBeenCalledWith(UID(99), accounts, "duplicate posting");
  });
  test("admin and the platform owner pass the finance gate", async () => {
    expect((await call("POST", "/api/ledger/seed", admin)).code).toBe(200);
    expect((await call("POST", "/api/ledger/seed", owner)).code).toBe(200);
  });
  test("PHASE 16: ledger reads now need MANAGE_FINANCE (was adminOnly): ghost_checker is refused, accounts can list", async () => {
    expect((await call("GET", "/api/ledger", ghost)).code).toBe(403);
    expect((await call("GET", "/api/ledger", accounts)).code).not.toBe(403);
  });
});

describe("S2-SCOPE-01 dealer insights are scoped to the caller", () => {
  test("a dealer receives insights for their own id, never an unfiltered set", async () => {
    const dealer = mk(21, "dealer");
    getDealerInsights.mockClear();
    const r = await call("GET", "/api/market/dealer/insights?dealerId=someone-else", dealer);
    expect(r.code).toBe(200);
    expect(getDealerInsights).toHaveBeenCalledWith(dealer);
  });
  test("admin may target a dealer explicitly, else defaults to self", async () => {
    const admin = mk(22, "admin");
    getDealerInsights.mockClear();
    await call("GET", `/api/market/dealer/insights`, admin);
    expect(getDealerInsights).toHaveBeenLastCalledWith(admin);
  });
});
