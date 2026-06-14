// backend/tests/reconciliation.test.js
// ─────────────────────────────────────────────────────────────
// Payment reconciliation system tests
// Tests reconciliation logic, detection rules, and admin workflow
// ─────────────────────────────────────────────────────────────

import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import ReconciliationReport from "../models/ReconciliationReport.js";
import MpesaTransaction from "../models/MpesaTransaction.js";
import Payment from "../models/Payment.js";
import Escrow from "../models/Escrow.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { runReconciliation, detectMissingCallbacks, detectDuplicateCallbacks, detectAmountMismatches, detectOrphanTransactions } from "../services/reconciliationService.js";

describe("Payment Reconciliation System", () => {
  let adminToken;
  let adminUser;
  let testMpesaTransaction;
  let testPayment;
  let testEscrow;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);

    // Create admin user
    adminUser = await User.create({
      name: "Finance Admin",
      email: "finance@kayad.test",
      password: "Admin@123456",
      role: "admin",
      status: "approved",
    });

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: adminUser.email, password: "Admin@123456" });
    adminToken = adminRes.body.token;

    // Create test M-Pesa transaction
    testMpesaTransaction = await MpesaTransaction.create({
      phone: "+254712345678",
      amount: 1000000,
      checkoutRequestID: "test_checkout_123",
      merchantRequestID: "test_merchant_123",
      status: "success",
      mpesaReceipt: "ABC123XYZ",
      user: adminUser._id,
    });

    // Create test payment
    testPayment = await Payment.create({
      user: adminUser._id,
      referenceId: adminUser._id,
      referenceModel: "User",
      type: "subscription",
      amount: 1000000,
      phone: "+254712345678",
      status: "success",
      mpesaReceipt: "ABC123XYZ",
      checkoutRequestId: "test_checkout_123",
      merchantRequestId: "test_merchant_123",
      mode: "mpesa",
      processed: true,
    });

    // Create test escrow
    testEscrow = await Escrow.create({
      car: new mongoose.Types.ObjectId(),
      buyer: adminUser._id,
      seller: new mongoose.Types.ObjectId(),
      amount: 1000000,
      payment: testPayment._id,
      status: "held",
    });
  });

  afterAll(async () => {
    // Cleanup
    await ReconciliationReport.deleteMany({});
    await MpesaTransaction.deleteMany({});
    await Payment.deleteMany({});
    await Escrow.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({ email: "finance@kayad.test" });
    await mongoose.connection.close();
  });

  describe("ReconciliationReport Model", () => {
    it("should create reconciliation report", async () => {
      const report = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "mpesa_payment",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalTransactions: 100,
        reconciled: 95,
        unreconciled: 5,
        successRate: 95,
        issues: {
          missingCallbacks: 2,
          duplicateCallbacks: 1,
          amountMismatches: 1,
          orphanTransactions: 1,
        },
        status: "completed",
        generatedBy: "system",
        duration: 5000,
      });

      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe("mpesa_payment");
      expect(report.successRate).toBe(95);
      expect(report.status).toBe("completed");

      await ReconciliationReport.findByIdAndDelete(report._id);
    });

    it("should calculate success rate", async () => {
      const report = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "full_reconciliation",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalTransactions: 100,
        reconciled: 80,
        unreconciled: 20,
        status: "completed",
        generatedBy: "system",
      });

      await report.calculateSuccessRate();

      expect(report.successRate).toBe(80);

      await ReconciliationReport.findByIdAndDelete(report._id);
    });

    it("should add issue to report", async () => {
      const report = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "mpesa_payment",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        status: "in_progress",
        generatedBy: "system",
      });

      await report.addIssue({
        type: "missing_callback",
        severity: "high",
        description: "Test missing callback",
        transactionId: testMpesaTransaction._id,
        transactionModel: "MpesaTransaction",
        amountDifference: 1000000,
      });

      expect(report.issueDetails.length).toBe(1);
      expect(report.issues.missingCallbacks).toBe(1);

      await ReconciliationReport.findByIdAndDelete(report._id);
    });

    it("should resolve issue", async () => {
      const report = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "mpesa_payment",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        status: "completed",
        generatedBy: "system",
      });

      await report.addIssue({
        type: "amount_mismatch",
        severity: "medium",
        description: "Test amount mismatch",
        transactionId: testPayment._id,
        transactionModel: "Payment",
      });

      await report.resolveIssue(0, adminUser._id, "Resolved as false positive");

      expect(report.issueDetails[0].resolved).toBe(true);
      expect(report.issueDetails[0].resolvedBy).toBe(adminUser._id);
      expect(report.issueDetails[0].resolutionNotes).toBe("Resolved as false positive");

      await ReconciliationReport.findByIdAndDelete(report._id);
    });

    it("should get unresolved issues", async () => {
      const report = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "full_reconciliation",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        status: "completed",
        generatedBy: "system",
      });

      await report.addIssue({
        type: "missing_callback",
        severity: "high",
        description: "Unresolved issue",
        transactionId: testMpesaTransaction._id,
        transactionModel: "MpesaTransaction",
      });

      await report.addIssue({
        type: "amount_mismatch",
        severity: "medium",
        description: "Resolved issue",
        transactionId: testPayment._id,
        transactionModel: "Payment",
      });

      await report.resolveIssue(1, adminUser._id, "Resolved");

      const unresolvedIssues = report.getUnresolvedIssues();

      expect(unresolvedIssues.length).toBe(1);
      expect(unresolvedIssues[0].type).toBe("missing_callback");

      await ReconciliationReport.findByIdAndDelete(report._id);
    });
  });

  describe("reconciliationService", () => {
    describe("detectMissingCallbacks", () => {
      it("should detect missing callbacks", async () => {
        // Create pending M-Pesa transaction older than 30 minutes
        const oldTransaction = await MpesaTransaction.create({
          phone: "+254712345679",
          amount: 500000,
          checkoutRequestID: "old_checkout_123",
          status: "pending",
          createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
          user: adminUser._id,
        });

        const missingCallbacks = await detectMissingCallbacks(
          new Date(Date.now() - 3600000),
          new Date(),
        );

        expect(missingCallbacks.length).toBeGreaterThan(0);

        await MpesaTransaction.findByIdAndDelete(oldTransaction._id);
      });
    });

    describe("detectDuplicateCallbacks", () => {
      it("should detect duplicate callbacks", async () => {
        // Create payments with same checkoutRequestID
        await Payment.create({
          user: adminUser._id,
          referenceId: adminUser._id,
          referenceModel: "User",
          type: "subscription",
          amount: 1000000,
          phone: "+254712345678",
          status: "success",
          checkoutRequestId: "duplicate_checkout_123",
          mode: "mpesa",
          processed: true,
        });

        await Payment.create({
          user: adminUser._id,
          referenceId: adminUser._id,
          referenceModel: "User",
          type: "subscription",
          amount: 1000000,
          phone: "+254712345678",
          status: "success",
          checkoutRequestId: "duplicate_checkout_123",
          mode: "mpesa",
          processed: true,
        });

        const duplicateCallbacks = await detectDuplicateCallbacks(
          new Date(Date.now() - 3600000),
          new Date(),
        );

        expect(duplicateCallbacks.length).toBeGreaterThan(0);

        await Payment.deleteMany({ checkoutRequestId: "duplicate_checkout_123" });
      });
    });

    describe("detectAmountMismatches", () => {
      it("should detect amount mismatches", async () => {
        // Create M-Pesa transaction and payment with different amounts
        const mpesa = await MpesaTransaction.create({
          phone: "+254712345680",
          amount: 1000000,
          checkoutRequestID: "mismatch_checkout_123",
          status: "success",
          mpesaReceipt: "MISMATCH123",
          user: adminUser._id,
        });

        await Payment.create({
          user: adminUser._id,
          referenceId: adminUser._id,
          referenceModel: "User",
          type: "subscription",
          amount: 900000, // Different amount
          phone: "+254712345680",
          status: "success",
          checkoutRequestId: "mismatch_checkout_123",
          mpesaReceipt: "MISMATCH123",
          mode: "mpesa",
          processed: true,
        });

        const mismatches = await detectAmountMismatches(
          new Date(Date.now() - 3600000),
          new Date(),
        );

        expect(mismatches.length).toBeGreaterThan(0);

        await MpesaTransaction.findByIdAndDelete(mpesa._id);
        await Payment.deleteMany({ checkoutRequestId: "mismatch_checkout_123" });
      });
    });

    describe("detectOrphanTransactions", () => {
      it("should detect orphan transactions", async () => {
        // Create payment without corresponding M-Pesa transaction
        await Payment.create({
          user: adminUser._id,
          referenceId: adminUser._id,
          referenceModel: "User",
          type: "subscription",
          amount: 1000000,
          phone: "+254712345681",
          status: "success",
          checkoutRequestId: "orphan_checkout_123",
          mode: "mpesa",
          processed: true,
        });

        const orphans = await detectOrphanTransactions(
          new Date(Date.now() - 3600000),
          new Date(),
        );

        expect(orphans.length).toBeGreaterThan(0);

        await Payment.deleteMany({ checkoutRequestId: "orphan_checkout_123" });
      });
    });
  });

  describe("Admin Finance Dashboard", () => {
    let testReport;

    beforeEach(async () => {
      testReport = await ReconciliationReport.create({
        reportId: ReconciliationReport.generateReportId(),
        reportType: "full_reconciliation",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalTransactions: 100,
        reconciled: 95,
        unreconciled: 5,
        successRate: 95,
        status: "completed",
        generatedBy: "system",
        duration: 5000,
      });
    });

    afterEach(async () => {
      await ReconciliationReport.findByIdAndDelete(testReport._id);
    });

    describe("GET /api/finance/reports", () => {
      it("should get all reconciliation reports (admin only)", async () => {
        const res = await request(app)
          .get("/api/finance/reports")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.reports)).toBe(true);
      });

      it("should deny access to non-admin", async () => {
        const res = await request(app)
          .get("/api/finance/reports")
          .set("Authorization", "Bearer invalid_token");

        expect(res.status).toBe(401);
      });
    });

    describe("GET /api/finance/reports/:id", () => {
      it("should get specific reconciliation report (admin only)", async () => {
        const res = await request(app)
          .get(`/api/finance/reports/${testReport._id}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.report._id).toBe(testReport._id.toString());
      });
    });

    describe("GET /api/finance/statistics", () => {
      it("should get reconciliation statistics (admin only)", async () => {
        const res = await request(app)
          .get("/api/finance/statistics")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.statistics).toBeDefined();
        expect(res.body.statistics.totalReports).toBeDefined();
      });
    });

    describe("GET /api/finance/cron-status", () => {
      it("should get cron status (admin only)", async () => {
        const res = await request(app)
          .get("/api/finance/cron-status")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBeDefined();
      });
    });
  });

  describe("Integration Tests", () => {
    it("should run full reconciliation", async () => {
      const report = await runReconciliation("full_reconciliation", {
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe("full_reconciliation");
      expect(report.status).toBe("completed");
      expect(report.totalTransactions).toBeDefined();

      await ReconciliationReport.findByIdAndDelete(report._id);
    }, 30000);
  });
});
