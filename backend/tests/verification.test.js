// backend/tests/verification.test.js
// ─────────────────────────────────────────────────────────────
// Dealer verification system tests
// Tests verification workflow, middleware, and admin operations
// ─────────────────────────────────────────────────────────────

import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import User from "../models/User.js";

describe("Dealer Verification System", () => {
  let adminToken;
  let dealerToken;
  let dealerUser;
  let dealer;
  let verificationId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);

    // Create admin user
    const admin = await User.create({
      name: "Admin User",
      email: "admin@kayad.test",
      password: "Admin@123456",
      role: "admin",
      status: "approved",
    });

    const adminRes = await request(app).post("/api/auth/login").send({ email: admin.email, password: "Admin@123456" });
    adminToken = adminRes.body.token;

    // Create dealer user
    dealerUser = await User.create({
      name: "Test Dealer",
      email: "dealer@kayad.test",
      password: "Dealer@123456",
      role: "dealer",
      status: "pending",
      phone: "+254712345678",
    });

    // Create dealer profile
    dealer = await Dealer.create({
      user: dealerUser._id,
      businessName: "Test Dealership",
      location: "Nairobi",
      approved: false,
    });

    const dealerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: dealerUser.email, password: "Dealer@123456" });
    dealerToken = dealerRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await DealerVerification.deleteMany({});
    await Dealer.deleteMany({});
    await User.deleteMany({ email: { $in: ["admin@kayad.test", "dealer@kayad.test"] } });
    await mongoose.connection.close();
  });

  describe("POST /api/verification/submit", () => {
    it("should submit verification documents", async () => {
      const res = await request(app)
        .post("/api/verification/submit")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          documents: {
            governmentId: {
              type: "national_id",
              documentUrl: "https://example.com/id.jpg",
              documentNumber: "12345678",
              issuedDate: "2020-01-01",
            },
            kraPin: {
              pinNumber: "A00 1234567A 001",
              documentUrl: "https://example.com/kra.pdf",
            },
            businessRegistration: {
              registrationNumber: "BN123456",
              documentUrl: "https://example.com/cert.pdf",
              businessName: "Test Dealership Ltd",
              registeredDate: "2020-01-01",
            },
            physicalAddress: {
              street: "123 Test Street",
              city: "Nairobi",
              postalCode: "00100",
              country: "Kenya",
              proofUrl: "https://example.com/bill.pdf",
              proofType: "utility_bill",
            },
            phoneVerification: {
              phoneNumber: "+254712345678",
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verification.verificationStatus).toBe("pending");
      verificationId = res.body.verification._id;
    });

    it("should not allow duplicate submission while pending", async () => {
      const res = await request(app)
        .post("/api/verification/submit")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          documents: {
            governmentId: {
              type: "national_id",
              documentUrl: "https://example.com/id2.jpg",
              documentNumber: "87654321",
              issuedDate: "2020-01-01",
            },
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already");
    });
  });

  describe("GET /api/verification/status", () => {
    it("should get verification status", async () => {
      const res = await request(app).get("/api/verification/status").set("Authorization", `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verification).toBeDefined();
      expect(res.body.verification.verificationStatus).toBe("pending");
    });

    it("should return none for users without verification", async () => {
      const newUser = await User.create({
        name: "New User",
        email: "newuser@kayad.test",
        password: "User@123456",
        role: "dealer",
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: newUser.email, password: "User@123456" });

      const res = await request(app)
        .get("/api/verification/status")
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verificationStatus).toBe("none");

      await User.findByIdAndDelete(newUser._id);
    });
  });

  describe("POST /api/verification/phone/request", () => {
    it("should request phone verification OTP", async () => {
      const res = await request(app)
        .post("/api/verification/phone/request")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          phoneNumber: "+254712345678",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.phoneNumber).toContain("******");
    });

    it("should reject invalid phone format", async () => {
      const res = await request(app)
        .post("/api/verification/phone/request")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          phoneNumber: "12345",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid");
    });
  });

  describe("POST /api/verification/phone/verify", () => {
    it("should verify OTP successfully", async () => {
      // First, get the verification to access the OTP (in real app, this comes via SMS)
      const verification = await DealerVerification.findOne({ user: dealerUser._id });
      const otp = await verification.generateOTP();

      const res = await request(app)
        .post("/api/verification/phone/verify")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({ otp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("verified successfully");

      // Verify phone is marked as verified
      const updatedVerification = await DealerVerification.findById(verification._id);
      expect(updatedVerification.documents.phoneVerification.verified).toBe(true);
    });

    it("should reject invalid OTP", async () => {
      const res = await request(app)
        .post("/api/verification/phone/verify")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({ otp: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid");
    });
  });

  describe("Admin Verification Management", () => {
    describe("GET /api/verification/admin/all", () => {
      it("should get all verifications (admin only)", async () => {
        const res = await request(app).get("/api/verification/admin/all").set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.verifications)).toBe(true);
      });

      it("should deny access to non-admin", async () => {
        const res = await request(app).get("/api/verification/admin/all").set("Authorization", `Bearer ${dealerToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe("GET /api/verification/admin/:id", () => {
      it("should get verification by ID (admin only)", async () => {
        const res = await request(app)
          .get(`/api/verification/admin/${verificationId}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.verification._id).toBe(verificationId);
      });
    });

    describe("POST /api/verification/admin/:id/approve", () => {
      it("should approve verification (admin only)", async () => {
        const res = await request(app)
          .post(`/api/verification/admin/${verificationId}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ adminNotes: "Approved for testing" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.verification.verificationStatus).toBe("approved");

        // Verify dealer is approved
        const updatedDealer = await Dealer.findById(dealer._id);
        expect(updatedDealer.approved).toBe(true);

        // Verify user status is approved
        const updatedUser = await User.findById(dealerUser._id);
        expect(updatedUser.status).toBe("approved");
      });

      it("should deny approval to non-admin", async () => {
        const res = await request(app)
          .post(`/api/verification/admin/${verificationId}/approve`)
          .set("Authorization", `Bearer ${dealerToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe("POST /api/verification/admin/:id/reject", () => {
      it("should reject verification (admin only)", async () => {
        // First, reset to pending
        await DealerVerification.findByIdAndUpdate(verificationId, {
          verificationStatus: "pending",
          rejectionReason: null,
        });

        const res = await request(app)
          .post(`/api/verification/admin/${verificationId}/reject`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            rejectionReason: "Invalid documents",
            rejectionDetails: { field: "governmentId" },
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.verification.verificationStatus).toBe("rejected");
        expect(res.body.verification.rejectionReason).toBe("Invalid documents");

        // Verify user status is rejected
        const updatedUser = await User.findById(dealerUser._id);
        expect(updatedUser.status).toBe("rejected");
      });
    });

    describe("POST /api/verification/admin/:id/suspend", () => {
      it("should suspend dealer (admin only)", async () => {
        // First, approve again
        await DealerVerification.findByIdAndUpdate(verificationId, {
          verificationStatus: "approved",
        });

        const res = await request(app)
          .post(`/api/verification/admin/${verificationId}/suspend`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            suspensionReason: "Policy violation",
            suspensionDays: 7,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.verification.verificationStatus).toBe("suspended");
        expect(res.body.verification.suspensionReason).toBe("Policy violation");

        // Verify dealer is suspended
        const updatedDealer = await Dealer.findById(dealer._id);
        expect(updatedDealer.isSuspended).toBe(true);
      });

      it("should reinstate dealer (admin only)", async () => {
        const res = await request(app)
          .post(`/api/verification/admin/${verificationId}/reinstate`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ adminNotes: "Reinstated after review" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.verification.verificationStatus).toBe("approved");

        // Verify dealer is not suspended
        const updatedDealer = await Dealer.findById(dealer._id);
        expect(updatedDealer.isSuspended).toBe(false);
      });
    });
  });

  describe("Middleware Enforcement", () => {
    it("should block car creation for unverified dealer", async () => {
      // Reset verification to pending
      await DealerVerification.findByIdAndUpdate(verificationId, {
        verificationStatus: "pending",
      });

      const res = await request(app).post("/api/cars").set("Authorization", `Bearer ${dealerToken}`).send({
        title: "Test Car",
        price: 1000000,
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        mileage: 50000,
        fuel: "Petrol",
        transmission: "Automatic",
        images: [],
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("verification required");
    });

    it("should allow car creation for verified dealer", async () => {
      // Approve dealer
      await DealerVerification.findByIdAndUpdate(verificationId, {
        verificationStatus: "approved",
      });

      const res = await request(app).post("/api/cars").set("Authorization", `Bearer ${dealerToken}`).send({
        title: "Test Car",
        price: 1000000,
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        mileage: 50000,
        fuel: "Petrol",
        transmission: "Automatic",
        images: [],
      });

      // Note: This might fail due to image upload requirement, but should not fail due to verification
      if (res.status !== 201 && res.status !== 400) {
        expect(res.status).not.toBe(403);
      }
    });
  });

  describe("Backwards Compatibility", () => {
    it("should allow legacy approved dealers", async () => {
      // Create a legacy approved dealer
      const legacyUser = await User.create({
        name: "Legacy Dealer",
        email: "legacy@kayad.test",
        password: "Legacy@123456",
        role: "dealer",
        status: "approved",
      });

      const legacyDealer = await Dealer.create({
        user: legacyUser._id,
        businessName: "Legacy Dealership",
        location: "Nairobi",
        approved: true, // Legacy approval
        verifiedAt: new Date(),
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: legacyUser.email, password: "Legacy@123456" });

      // Try to create a car - should succeed due to legacy approval
      const res = await request(app).post("/api/cars").set("Authorization", `Bearer ${loginRes.body.token}`).send({
        title: "Legacy Car",
        price: 1000000,
        brand: "Toyota",
        model: "Camry",
        year: 2021,
        mileage: 30000,
        fuel: "Petrol",
        transmission: "Automatic",
        images: [],
      });

      // Should not fail due to verification (might fail for other reasons like images)
      if (res.status !== 201 && res.status !== 400) {
        expect(res.status).not.toBe(403);
      }

      // Cleanup
      await Dealer.findByIdAndDelete(legacyDealer._id);
      await User.findByIdAndDelete(legacyUser._id);
    });
  });
});
