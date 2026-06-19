// backend/tests/escrowAudit.test.js
// ─────────────────────────────────────────────────────────────
// Escrow audit tracking system tests
// Tests immutable audit trail for escrow compliance
// ─────────────────────────────────────────────────────────────

import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import Escrow from "../models/Escrow.js";
import EscrowAudit from "../models/EscrowAudit.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import { logEscrowAction, captureState, calculateStateDiff } from "../services/escrowAuditService.js";

describe("Escrow Audit Tracking System", () => {
  let adminToken;
  let buyerToken;
  let sellerToken;
  let adminUser;
  let buyerUser;
  let sellerUser;
  let testCar;
  let testEscrow;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);

    // Create admin user
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@kayad.test",
      password: "Admin@123456",
      role: "admin",
      status: "approved",
    });

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: adminUser.email, password: "Admin@123456" });
    adminToken = adminRes.body.token;

    // Create seller (dealer) user
    sellerUser = await User.create({
      name: "Test Seller",
      email: "seller@kayad.test",
      password: "Seller@123456",
      role: "dealer",
      status: "approved",
      phone: "+254712345678",
    });

    const sellerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: sellerUser.email, password: "Seller@123456" });
    sellerToken = sellerRes.body.token;

    // Create buyer user
    buyerUser = await User.create({
      name: "Test Buyer",
      email: "buyer@kayad.test",
      password: "Buyer@123456",
      role: "user",
      status: "approved",
      phone: "+254723456789",
    });

    const buyerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: buyerUser.email, password: "Buyer@123456" });
    buyerToken = buyerRes.body.token;

    // Create test car
    testCar = await Car.create({
      title: "Toyota Corolla 2020",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 1000000,
      dealer: sellerUser._id,
      status: "active",
    });

    // Create test escrow
    testEscrow = await Escrow.create({
      car: testCar._id,
      buyer: buyerUser._id,
      seller: sellerUser._id,
      amount: 1000000,
      payment: new mongoose.Types.ObjectId(),
      status: "held",
      fundedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Cleanup
    await EscrowAudit.deleteMany({});
    await Escrow.deleteMany({});
    await Car.deleteMany({});
    await User.deleteMany({ email: { $in: ["admin@kayad.test", "seller@kayad.test", "buyer@kayad.test"] } });
    await mongoose.connection.close();
  });

  describe("EscrowAudit Model", () => {
    it("should create audit record", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "confirm_delivery",
        performedBy: buyerUser._id,
        performedByRole: buyerUser.role,
        performedByName: buyerUser.name,
        performedByEmail: buyerUser.email,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        timestamp: new Date(),
        previousState: { status: "held" },
        newState: { status: "held", deliveryConfirmed: true },
        stateChanges: { deliveryConfirmed: { previous: false, current: true, changed: true } },
        notes: "Buyer confirmed delivery",
      });

      expect(audit.isImmutable).toBe(true);
      expect(audit.action).toBe("confirm_delivery");
      expect(audit.performedBy).toBe(buyerUser._id);
      expect(audit.ipAddress).toBe("127.0.0.1");

      await EscrowAudit.findByIdAndDelete(audit._id);
    });

    it("should prevent updates to audit records", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "127.0.0.1",
        timestamp: new Date(),
        previousState: {},
        newState: {},
        stateChanges: {},
      });

      // Try to update (should fail)
      try {
        audit.notes = "Updated notes";
        await audit.save();
        fail("Should have thrown error");
      } catch (err) {
        expect(err.message).toContain("immutable");
      }

      await EscrowAudit.findByIdAndDelete(audit._id);
    });

    it("should prevent deletes to audit records", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "127.0.0.1",
        timestamp: new Date(),
        previousState: {},
        newState: {},
        stateChanges: {},
      });

      // Try to delete (should fail)
      try {
        await EscrowAudit.findByIdAndDelete(audit._id);
        fail("Should have thrown error");
      } catch (err) {
        expect(err.message).toContain("cannot be deleted");
      }

      // Cleanup via direct database delete for test
      await EscrowAudit.deleteOne({ _id: audit._id });
    });
  });

  describe("escrowAuditService", () => {
    describe("logEscrowAction", () => {
      it("should log escrow action", async () => {
        const mockReq = {
          ip: "127.0.0.1",
          get: (header) => (header === "user-agent" ? "test-agent" : undefined),
          id: "test-request-id",
        };

        const audit = await logEscrowAction(testEscrow._id, "confirm_delivery", buyerUser._id, mockReq, {
          notes: "Test action",
        });

        expect(audit).toBeDefined();
        expect(audit.action).toBe("confirm_delivery");
        expect(audit.performedBy).toBe(buyerUser._id);
        expect(audit.ipAddress).toBe("127.0.0.1");

        await EscrowAudit.findByIdAndDelete(audit._id);
      });
    });

    describe("captureState", () => {
      it("should capture escrow state", async () => {
        const state = await captureState(testEscrow._id);

        expect(state).toBeDefined();
        expect(state.status).toBe("held");
        expect(state.amount).toBe(1000000);
        expect(state.buyer).toBeDefined();
        expect(state.seller).toBeDefined();
      });
    });

    describe("calculateStateDiff", () => {
      it("should calculate state differences", async () => {
        const previous = {
          status: "held",
          deliveryConfirmed: false,
          amount: 1000000,
        };

        const current = {
          status: "held",
          deliveryConfirmed: true,
          amount: 1000000,
        };

        const diff = calculateStateDiff(previous, current);

        expect(diff).toBeDefined();
        expect(diff.deliveryConfirmed).toBeDefined();
        expect(diff.deliveryConfirmed.previous).toBe(false);
        expect(diff.deliveryConfirmed.current).toBe(true);
        expect(diff.deliveryConfirmed.changed).toBe(true);
      });
    });
  });

  describe("Admin Audit Viewer", () => {
    let testAudit;

    beforeEach(async () => {
      testAudit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "127.0.0.1",
        timestamp: new Date(),
        previousState: { status: "held" },
        newState: { status: "held" },
        stateChanges: {},
      });
    });

    afterEach(async () => {
      await EscrowAudit.deleteOne({ _id: testAudit._id });
    });

    describe("GET /api/audit/all", () => {
      it("should get all audit records (admin only)", async () => {
        const res = await request(app).get("/api/audit/all").set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.audits)).toBe(true);
      });

      it("should deny access to non-admin", async () => {
        const res = await request(app).get("/api/audit/all").set("Authorization", `Bearer ${buyerToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe("GET /api/audit/escrow/:id", () => {
      it("should get audit trail for escrow (admin only)", async () => {
        const res = await request(app)
          .get(`/api/audit/escrow/${testEscrow._id}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.escrowId).toBe(testEscrow._id.toString());
        expect(Array.isArray(res.body.audits)).toBe(true);
      });
    });

    describe("GET /api/audit/statistics", () => {
      it("should get audit statistics (admin only)", async () => {
        const res = await request(app).get("/api/audit/statistics").set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.statistics).toBeDefined();
        expect(res.body.statistics.totalAudits).toBeDefined();
      });
    });

    describe("GET /api/audit/:id", () => {
      it("should get single audit record (admin only)", async () => {
        const res = await request(app).get(`/api/audit/${testAudit._id}`).set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.audit._id).toBe(testAudit._id.toString());
      });
    });
  });

  describe("Escrow Model Integration", () => {
    it("should log audit when confirmDelivery is called", async () => {
      const mockReq = {
        ip: "127.0.0.1",
        get: (header) => (header === "user-agent" ? "test-agent" : undefined),
        id: "test-request-id",
      };

      await testEscrow.confirmDelivery(buyerUser._id, mockReq);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const audits = await EscrowAudit.find({ escrow: testEscrow._id, action: "confirm_delivery" });
      expect(audits.length).toBeGreaterThan(0);

      // Cleanup
      await EscrowAudit.deleteMany({ escrow: testEscrow._id });
    }, 10000);
  });

  describe("Compliance Features", () => {
    it("should track IP address in audit records", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "192.168.1.1",
        timestamp: new Date(),
        previousState: {},
        newState: {},
        stateChanges: {},
      });

      expect(audit.ipAddress).toBe("192.168.1.1");

      await EscrowAudit.deleteOne({ _id: audit._id });
    });

    it("should track user agent in audit records", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 Test Browser",
        timestamp: new Date(),
        previousState: {},
        newState: {},
        stateChanges: {},
      });

      expect(audit.userAgent).toBe("Mozilla/5.0 Test Browser");

      await EscrowAudit.deleteOne({ _id: audit._id });
    });

    it("should track state changes in audit records", async () => {
      const audit = await EscrowAudit.create({
        escrow: testEscrow._id,
        action: "test_action",
        performedBy: adminUser._id,
        performedByRole: adminUser.role,
        performedByName: adminUser.name,
        ipAddress: "127.0.0.1",
        timestamp: new Date(),
        previousState: { status: "held", deliveryConfirmed: false },
        newState: { status: "held", deliveryConfirmed: true },
        stateChanges: { deliveryConfirmed: { previous: false, current: true, changed: true } },
      });

      expect(audit.stateChanges).toBeDefined();
      expect(audit.stateChanges.deliveryConfirmed).toBeDefined();

      await EscrowAudit.deleteOne({ _id: audit._id });
    });
  });
});
