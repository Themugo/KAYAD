// backend/tests/ledger.test.js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import LedgerEntry from "../models/LedgerEntry.js";
import LedgerAccount from "../models/LedgerAccount.js";

describeWithDb("Ledger System", () => {
  let adminToken, userToken, adminId, userId, entryId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ledger Admin", email: `ledger-admin-${ts}@test.com`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ledger User", email: `ledger-user-${ts}@test.com`, password: "Test@12345" });
    userToken = userRes.body.token;
    userId = userRes.body.user._id;
  });

  beforeEach(async () => {
    await LedgerAccount.deleteMany({});
    await LedgerEntry.deleteMany({});
    const seed = [
      { code: "1000", name: "Cash - M-Pesa", type: "asset", category: "cash" },
      { code: "1100", name: "Escrow Holdings", type: "asset", category: "escrow" },
      { code: "2000", name: "Escrow Payable", type: "liability", category: "escrow" },
      { code: "2100", name: "Refund Payable", type: "liability", category: "refund" },
      { code: "3000", name: "Retained Earnings", type: "equity", category: "reserve" },
      { code: "4000", name: "Commission Revenue", type: "revenue", category: "commission" },
      { code: "4100", name: "Subscription Revenue", type: "revenue", category: "subscription" },
      { code: "5000", name: "B2C Disbursement Payable", type: "liability", category: "payable" },
    ];
    await LedgerAccount.insertMany(seed);
  });

  afterAll(async () => {
    await clearTestDB();
  });

  // ──────────── AUTH ────────────
  test("GET /api/ledger — requires admin auth", async () => {
    await request(app).get("/api/ledger").expect(401);
  });

  test("GET /api/ledger — non-admin gets 403", async () => {
    await request(app).get("/api/ledger").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  // ──────────── SEED ────────────
  test("GET /api/ledger/seed — admin can seed", async () => {
    const res = await request(app).get("/api/ledger/seed").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ──────────── RECORD ENTRY ────────────
  test("POST /api/ledger — admin can record entry", async () => {
    const res = await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 100000,
        source: "escrow_deposit",
        destination: "buyer",
        debitAccountCode: "1100",
        creditAccountCode: "2000",
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction_id).toMatch(/^LGR-/);
    expect(res.body.data.status).toBe("completed");
    entryId = res.body.data._id;
  });

  test("POST /api/ledger — requires valid source", async () => {
    await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 100000,
        source: "invalid_source",
        destination: "buyer",
      })
      .expect(400);
  });

  test("POST /api/ledger — requires positive amount", async () => {
    await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: -100,
        source: "escrow_deposit",
        destination: "buyer",
      })
      .expect(400);
  });

  // ──────────── LIST ENTRIES ────────────
  test("GET /api/ledger — admin can list", async () => {
    // Create entry first
    const createRes = await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 50000,
        source: "subscription",
        destination: "platform",
        debitAccountCode: "1000",
        creditAccountCode: "4100",
      });
    expect(createRes.status).toBe(201);
    entryId = createRes.body.data._id;

    const res = await request(app).get("/api/ledger").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entries).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });

  test("GET /api/ledger — can filter by source", async () => {
    await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 75000,
        source: "inspection_fee",
        destination: "platform",
        debitAccountCode: "1000",
        creditAccountCode: "4200",
      });

    const res = await request(app)
      .get("/api/ledger?source=inspection_fee")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.entries.length).toBe(1);
    expect(res.body.entries[0].source).toBe("inspection_fee");
  });

  // ──────────── GET SINGLE ENTRY ────────────
  test("GET /api/ledger/:id — returns entry", async () => {
    const createRes = await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 200000,
        source: "escrow_deposit",
        destination: "buyer",
        debitAccountCode: "1100",
        creditAccountCode: "2000",
      });
    const id = createRes.body.data._id;

    const res = await request(app).get(`/api/ledger/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.transaction_id).toMatch(/^LGR-/);
  });

  test("GET /api/ledger/:id — 404 for nonexistent", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await request(app).get(`/api/ledger/${fakeId}`).set("Authorization", `Bearer ${adminToken}`).expect(404);
  });

  // ──────────── BALANCE SHEET ────────────
  test("GET /api/ledger/balance-sheet — returns accounts and totals", async () => {
    const res = await request(app)
      .get("/api/ledger/balance-sheet")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accounts).toBeDefined();
    expect(res.body.data.totals).toBeDefined();
  });

  // ──────────── TRIAL BALANCE ────────────
  test("GET /api/ledger/trial-balance — returns balances", async () => {
    const res = await request(app)
      .get("/api/ledger/trial-balance")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accounts).toBeDefined();
    expect(typeof res.body.data.totalDebit).toBe("number");
  });

  // ──────────── RECONCILIATION ────────────
  test("GET /api/ledger/reconciliation — returns report", async () => {
    const res = await request(app)
      .get("/api/ledger/reconciliation")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.entries).toBeDefined();
  });

  // ──────────── REVERSE ────────────
  test("POST /api/ledger/:id/reverse — reverses entry", async () => {
    const createRes = await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 300000,
        source: "escrow_deposit",
        destination: "buyer",
        debitAccountCode: "1100",
        creditAccountCode: "2000",
      });
    const id = createRes.body.data._id;

    const res = await request(app)
      .post(`/api/ledger/${id}/reverse`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Test reversal" })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.metadata.reason).toBe("Test reversal");
  });

  test("POST /api/ledger/:id/reverse — requires reason", async () => {
    const createRes = await request(app)
      .post("/api/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user_id: userId,
        amount: 300000,
        source: "escrow_deposit",
        destination: "buyer",
        debitAccountCode: "1100",
        creditAccountCode: "2000",
      });
    const id = createRes.body.data._id;

    await request(app)
      .post(`/api/ledger/${id}/reverse`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });
});
