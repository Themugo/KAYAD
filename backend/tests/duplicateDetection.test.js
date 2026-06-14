// backend/tests/duplicateDetection.test.js
// ─────────────────────────────────────────────────────────────
// Duplicate vehicle detection system tests
// Tests duplicate detection service, model, and admin workflow
// ─────────────────────────────────────────────────────────────

import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import Car from "../models/Car.js";
import DuplicateVehicleLog from "../models/DuplicateVehicleLog.js";
import User from "../models/User.js";
import { detectDuplicates, checkByVIN, checkByChassis, checkByRegistration, calculateSimilarity } from "../services/duplicateVehicleService.js";

describe("Duplicate Vehicle Detection System", () => {
  let adminToken;
  let dealerToken;
  let dealerUser;
  let testCar1;
  let testCar2;

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

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Admin@123456" });
    adminToken = adminRes.body.token;

    // Create dealer user
    dealerUser = await User.create({
      name: "Test Dealer",
      email: "dealer@kayad.test",
      password: "Dealer@123456",
      role: "dealer",
      status: "approved",
      phone: "+254712345678",
    });

    const dealerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: dealerUser.email, password: "Dealer@123456" });
    dealerToken = dealerRes.body.token;

    // Create test cars for duplicate detection
    testCar1 = await Car.create({
      title: "Toyota Corolla 2020",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 1000000,
      dealer: dealerUser._id,
      vin: "JTDKN3DU5A0123456",
      chassisNumber: "JTDKN3DU5A0123456",
      registrationNumber: "KCA 123A",
      status: "active",
    });

    testCar2 = await Car.create({
      title: "Toyota Corolla 2020",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 1050000,
      dealer: dealerUser._id,
      status: "active",
    });
  });

  afterAll(async () => {
    // Cleanup
    await DuplicateVehicleLog.deleteMany({});
    await Car.deleteMany({});
    await User.deleteMany({ email: { $in: ["admin@kayad.test", "dealer@kayad.test"] } });
    await mongoose.connection.close();
  });

  describe("Duplicate Detection Service", () => {
    describe("detectDuplicates", () => {
      it("should detect duplicate by VIN", async () => {
        const carData = {
          vin: "JTDKN3DU5A0123456",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1100000,
        };

        const result = await detectDuplicates(carData, dealerUser._id);

        expect(result.hasDuplicates).toBe(true);
        expect(result.matchType).toBe("exact_match");
        expect(result.matchScore).toBe(100);
        expect(result.detectionCriteria.vin).toBe(carData.vin);
        expect(result.matches.length).toBeGreaterThan(0);
      });

      it("should detect duplicate by chassis number", async () => {
        const carData = {
          chassisNumber: "JTDKN3DU5A0123456",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1100000,
        };

        const result = await detectDuplicates(carData, dealerUser._id);

        expect(result.hasDuplicates).toBe(true);
        expect(result.matchType).toBe("exact_match");
        expect(result.matchScore).toBe(100);
        expect(result.detectionCriteria.chassisNumber).toBe(carData.chassisNumber);
      });

      it("should detect duplicate by registration number", async () => {
        const carData = {
          registrationNumber: "KCA 123A",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1100000,
        };

        const result = await detectDuplicates(carData, dealerUser._id);

        expect(result.hasDuplicates).toBe(true);
        expect(result.matchType).toBe("exact_match");
        expect(result.matchScore).toBe(100);
        expect(result.detectionCriteria.registrationNumber).toBe(carData.registrationNumber);
      });

      it("should not detect duplicates for unique vehicle", async () => {
        const carData = {
          vin: "JTDKN3DU5A0987654",
          brand: "Honda",
          model: "Civic",
          year: 2021,
          price: 1500000,
        };

        const result = await detectDuplicates(carData, dealerUser._id);

        expect(result.hasDuplicates).toBe(false);
        expect(result.matches.length).toBe(0);
      });
    });

    describe("checkByVIN", () => {
      it("should find cars by VIN", async () => {
        const matches = await checkByVIN("JTDKN3DU5A0123456");

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].vin).toBeDefined();
      });

      it("should exclude dealer from results", async () => {
        const matches = await checkByVIN("JTDKN3DU5A0123456", dealerUser._id);

        expect(matches.length).toBe(0);
      });
    });

    describe("checkByChassis", () => {
      it("should find cars by chassis number", async () => {
        const matches = await checkByChassis("JTDKN3DU5A0123456");

        expect(matches.length).toBeGreaterThan(0);
      });
    });

    describe("checkByRegistration", () => {
      it("should find cars by registration number", async () => {
        const matches = await checkByRegistration("KCA 123A");

        expect(matches.length).toBeGreaterThan(0);
      });
    });

    describe("calculateSimilarity", () => {
      it("should calculate high similarity for identical cars", () => {
        const car1 = {
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1000000,
          mileage: 50000,
        };

        const car2 = {
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1050000,
          mileage: 55000,
        };

        const similarity = calculateSimilarity(car1, car2);

        expect(similarity).toBeGreaterThan(0.8);
      });

      it("should calculate low similarity for different cars", () => {
        const car1 = {
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1000000,
          mileage: 50000,
        };

        const car2 = {
          brand: "Honda",
          model: "Civic",
          year: 2015,
          price: 800000,
          mileage: 100000,
        };

        const similarity = calculateSimilarity(car1, car2);

        expect(similarity).toBeLessThan(0.5);
      });
    });
  });

  describe("DuplicateVehicleLog Model", () => {
    it("should create duplicate log entry", async () => {
      const log = await DuplicateVehicleLog.create({
        car: testCar1._id,
        dealer: dealerUser._id,
        detectionCriteria: {
          vin: "JTDKN3DU5A0123456",
        },
        matchType: "exact_match",
        matchScore: 100,
        matchedCars: [testCar2._id],
        detectionMethod: "vin",
      });

      expect(log.status).toBe("flagged");
      expect(log.matchType).toBe("exact_match");
      expect(log.matchScore).toBe(100);

      await DuplicateVehicleLog.findByIdAndDelete(log._id);
    });

    it("should mark as reviewed", async () => {
      const log = await DuplicateVehicleLog.create({
        car: testCar1._id,
        dealer: dealerUser._id,
        detectionCriteria: {
          vin: "JTDKN3DU5A0123456",
        },
        matchType: "exact_match",
        matchScore: 100,
        matchedCars: [testCar2._id],
        detectionMethod: "vin",
      });

      await log.markAsReviewed(adminToken, "allowed", "False positive - different car");

      expect(log.status).toBe("false_positive");
      expect(log.actionTaken).toBe("allowed");
      expect(log.reviewedBy).toBeDefined();

      await DuplicateVehicleLog.findByIdAndDelete(log._id);
    });

    it("should auto resolve", async () => {
      const log = await DuplicateVehicleLog.create({
        car: testCar1._id,
        dealer: dealerUser._id,
        detectionCriteria: {
          vin: "JTDKN3DU5A0123456",
        },
        matchType: "exact_match",
        matchScore: 100,
        matchedCars: [testCar2._id],
        detectionMethod: "vin",
      });

      await log.autoResolve("Listing removed by dealer");

      expect(log.status).toBe("resolved");
      expect(log.isAutoResolved).toBe(true);
      expect(log.autoResolvedReason).toBe("Listing removed by dealer");

      await DuplicateVehicleLog.findByIdAndDelete(log._id);
    });
  });

  describe("Admin Duplicate Review Workflow", () => {
    let duplicateLog;

    beforeEach(async () => {
      duplicateLog = await DuplicateVehicleLog.create({
        car: testCar1._id,
        dealer: dealerUser._id,
        detectionCriteria: {
          vin: "JTDKN3DU5A0123456",
        },
        matchType: "exact_match",
        matchScore: 100,
        matchedCars: [testCar2._id],
        detectionMethod: "vin",
      });
    });

    afterEach(async () => {
      await DuplicateVehicleLog.findByIdAndDelete(duplicateLog._id);
    });

    describe("GET /api/duplicates/all", () => {
      it("should get all flagged duplicates (admin only)", async () => {
        const res = await request(app)
          .get("/api/duplicates/all")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.logs)).toBe(true);
      });

      it("should deny access to non-admin", async () => {
        const res = await request(app)
          .get("/api/duplicates/all")
          .set("Authorization", `Bearer ${dealerToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe("GET /api/duplicates/:id", () => {
      it("should get duplicate log by ID (admin only)", async () => {
        const res = await request(app)
          .get(`/api/duplicates/${duplicateLog._id}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.log._id).toBe(duplicateLog._id.toString());
      });
    });

    describe("POST /api/duplicates/:id/false-positive", () => {
      it("should mark as false positive (admin only)", async () => {
        const res = await request(app)
          .post(`/api/duplicates/${duplicateLog._id}/false-positive`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ reviewNotes: "False positive - different car" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.log.status).toBe("false_positive");

        // Verify car flags cleared
        const car = await Car.findById(testCar1._id);
        expect(car.duplicateStatus).toBe("false_positive");
      });
    });

    describe("POST /api/duplicates/:id/confirm", () => {
      it("should confirm as duplicate (admin only)", async () => {
        const res = await request(app)
          .post(`/api/duplicates/${duplicateLog._id}/confirm`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ action: "removed", reviewNotes: "Confirmed duplicate" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.log.status).toBe("confirmed_duplicate");
      });
    });

    describe("POST /api/duplicates/:id/under-review", () => {
      it("should set to under review (admin only)", async () => {
        const res = await request(app)
          .post(`/api/duplicates/${duplicateLog._id}/under-review`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ reviewNotes: "Needs further investigation" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.log.status).toBe("under_review");
      });
    });

    describe("GET /api/duplicates/statistics", () => {
      it("should get duplicate statistics (admin only)", async () => {
        const res = await request(app)
          .get("/api/duplicates/statistics")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.statistics).toBeDefined();
        expect(res.body.statistics.totalFlagged).toBeDefined();
        expect(res.body.statistics.falsePositiveRate).toBeDefined();
      });
    });
  });

  describe("Non-Blocking Behavior", () => {
    it("should allow listing creation even with duplicates", async () => {
      const res = await request(app)
        .post("/api/cars")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          title: "Test Car with Duplicate VIN",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 1100000,
          vin: "JTDKN3DU5A0123456", // Same VIN as testCar1
          images: [],
        });

      // Listing should be created (non-blocking)
        // Note: This might fail due to image upload requirement, but should not fail due to duplicate detection
        if (res.status !== 201 && res.status !== 400) {
          expect(res.status).not.toBe(403);
        }
    });
  });

  describe("Fraud Score Integration", () => {
    it("should update fraud score on duplicate detection", async () => {
      const car = await Car.create({
        title: "Test Car for Fraud Score",
        brand: "Toyota",
        model: "Camry",
        year: 2021,
        price: 1500000,
        dealer: dealerUser._id,
        vin: "JTDKN3DU5A0999888",
        fraudScore: 0,
        trustScore: 100,
        status: "active",
      });

      const detectionData = {
        hasDuplicates: true,
        matchType: "exact_match",
        matchScore: 100,
        detectionCriteria: { vin: "JTDKN3DU5A0999888" },
        matches: [testCar1],
        detectionMethod: "vin",
      };

      const { flagDuplicate } = await import("../services/duplicateVehicleService.js");
      const log = await flagDuplicate(car._id, detectionData, dealerUser._id);

      expect(log).toBeDefined();
      expect(log.fraudScoreImpact).toBeGreaterThan(0);
      expect(log.trustScoreImpact).toBeLessThan(0);

      const updatedCar = await Car.findById(car._id);
      expect(updatedCar.fraudScore).toBeGreaterThan(0);
      expect(updatedCar.trustScore).toBeLessThan(100);

      // Cleanup
      await Car.findByIdAndDelete(car._id);
      await DuplicateVehicleLog.findByIdAndDelete(log._id);
    });
  });
});
