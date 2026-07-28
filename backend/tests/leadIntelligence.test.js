// backend/tests/leadIntelligence.test.js
// ─────────────────────────────────────────────────────────────
// Lead Intelligence tests
// Tests lead creation, stage updates, and analytics
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import { createLead, updateLeadStage, getLeadPipeline, calculateConversionRate } from "../services/leadService.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();

describeWithDb("Lead Intelligence Service", () => {
  let mongoServer;
  let testBuyerId;
  let testDealerId;
  let testVehicleId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create test users
    const User = mongoose.model("User");
    const buyer = await User.create({
      name: "Test Buyer",
      email: "buyer@test.com",
      password: "password123",
    });
    const dealer = await User.create({
      name: "Test Dealer",
      email: "dealer@test.com",
      password: "password123",
      role: "dealer",
    });

    testBuyerId = buyer._id;
    testDealerId = dealer._id;

    // Create test vehicle
    const Car = mongoose.model("Car");
    const vehicle = await Car.create({
      title: "Test Car",
      brand: "Toyota",
      model: "Camry",
      year: 2020,
      price: 1000000,
      dealer: testDealerId,
    });

    testVehicleId = vehicle._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describeWithDb("Lead Creation", () => {
    it("should create a new lead", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);

      expect(lead).toHaveProperty("buyer");
      expect(lead).toHaveProperty("dealer");
      expect(lead).toHaveProperty("vehicle");
      expect(lead).toHaveProperty("stage", "new");
      expect(lead).toHaveProperty("source", "chat");
      expect(lead).toHaveProperty("estimatedValue", 1000000);
    });

    it("should not create duplicate lead", async () => {
      const lead1 = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      const lead2 = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);

      expect(lead1._id.toString()).toBe(lead2._id.toString());
    });

    it("should create lead activity on creation", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "auction", null);
      const activities = await LeadActivity.find({ lead: lead._id });

      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0].type).toBe("lead_created");
    });
  });

  describeWithDb("Lead Stage Updates", () => {
    it("should update lead stage", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      const updatedLead = await updateLeadStage(lead._id, "contacted", testDealerId);

      expect(updatedLead.stage).toBe("contacted");
    });

    it("should create activity on stage change", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await updateLeadStage(lead._id, "negotiating", testDealerId);

      const activities = await LeadActivity.find({ lead: lead._id, type: "stage_changed" });
      expect(activities.length).toBeGreaterThan(0);
    });

    it("should set convertedAt when stage is sold", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await updateLeadStage(lead._id, "sold", testDealerId);

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.convertedAt).toBeDefined();
    });

    it("should set lostAt when stage is lost", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await updateLeadStage(lead._id, "lost", testDealerId);

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.lostAt).toBeDefined();
    });
  });

  describeWithDb("Lead Pipeline", () => {
    it("should get lead pipeline", async () => {
      await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await createLead(testBuyerId, testDealerId, testVehicleId, "auction", null);

      const pipeline = await getLeadPipeline(testDealerId);

      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBeGreaterThan(0);
    });

    it("should group leads by stage", async () => {
      const lead1 = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await updateLeadStage(lead1._id, "contacted", testDealerId);

      const lead2 = await createLead(testBuyerId, testDealerId, testVehicleId, "auction", null);

      const pipeline = await getLeadPipeline(testDealerId);
      const newStage = pipeline.find((p) => p._id === "new");
      const contactedStage = pipeline.find((p) => p._id === "contacted");

      expect(newStage).toBeDefined();
      expect(contactedStage).toBeDefined();
    });
  });

  describeWithDb("Conversion Rate", () => {
    it("should calculate conversion rate", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const lead1 = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await updateLeadStage(lead1._id, "sold", testDealerId);

      const lead2 = await createLead(testBuyerId, testDealerId, testVehicleId, "auction", null);

      const metrics = await calculateConversionRate(testDealerId, startDate, endDate);

      expect(metrics).toHaveProperty("totalLeads");
      expect(metrics).toHaveProperty("soldLeads");
      expect(metrics).toHaveProperty("conversionRate");
      expect(metrics.totalLeads).toBeGreaterThanOrEqual(2);
    });

    it("should return 0 conversion rate when no leads", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await calculateConversionRate(testDealerId, startDate, endDate);

      expect(metrics.conversionRate).toBe(0);
    });
  });

  describeWithDb("Lead Model Methods", () => {
    it("should archive lead", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await lead.archive(testDealerId);

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.isArchived).toBe(true);
    });

    it("should mark lead as hot", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await lead.markAsHot(testDealerId);

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.isHot).toBe(true);
    });

    it("should toggle hot status", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await lead.markAsHot(testDealerId);
      await lead.markAsHot(testDealerId);

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.isHot).toBe(false);
    });
  });

  describeWithDb("LeadActivity Model", () => {
    it("should create lead activity", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      const activity = await LeadActivity.createActivity(
        lead._id,
        "message_sent",
        testDealerId,
        "dealer",
        "Test message",
      );

      expect(activity).toHaveProperty("lead");
      expect(activity).toHaveProperty("type", "message_sent");
      expect(activity).toHaveProperty("actor");
    });

    it("should get lead timeline", async () => {
      const lead = await createLead(testBuyerId, testDealerId, testVehicleId, "chat", null);
      await LeadActivity.createActivity(lead._id, "message_sent", testDealerId, "dealer", "Test message");
      await LeadActivity.createActivity(lead._id, "note_added", testDealerId, "dealer", "Test note");

      const timeline = await LeadActivity.getLeadTimeline(lead._id);

      expect(timeline.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describeWithDb("Lead Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new lead", async () => {
    const User = mongoose.model("User");
    const Car = mongoose.model("Car");

    const buyer = await User.create({
      name: "Test Buyer",
      email: "buyer@test.com",
      password: "password123",
    });
    const dealer = await User.create({
      name: "Test Dealer",
      email: "dealer@test.com",
      password: "password123",
      role: "dealer",
    });
    const vehicle = await Car.create({
      title: "Test Car",
      brand: "Toyota",
      model: "Camry",
      year: 2020,
      price: 1000000,
      dealer: dealer._id,
    });

    const lead = await Lead.create({
      buyer: buyer._id,
      dealer: dealer._id,
      vehicle: vehicle._id,
      source: "chat",
      estimatedValue: 1000000,
    });

    expect(lead).toHaveProperty("stage", "new");
    expect(lead).toHaveProperty("source", "chat");
    expect(lead).toHaveProperty("estimatedValue", 1000000);
  });

  it("should enforce stage enum", async () => {
    const User = mongoose.model("User");

    const buyer = await User.create({
      name: "Test Buyer",
      email: "buyer2@test.com",
      password: "password123",
    });
    const dealer = await User.create({
      name: "Test Dealer",
      email: "dealer2@test.com",
      password: "password123",
      role: "dealer",
    });

    await expect(
      Lead.create({
        buyer: buyer._id,
        dealer: dealer._id,
        source: "chat",
        stage: "invalid_stage",
      }),
    ).rejects.toThrow();
  });

  it("should enforce source enum", async () => {
    const User = mongoose.model("User");

    const buyer = await User.create({
      name: "Test Buyer",
      email: "buyer3@test.com",
      password: "password123",
    });
    const dealer = await User.create({
      name: "Test Dealer",
      email: "dealer3@test.com",
      password: "password123",
      role: "dealer",
    });

    await expect(
      Lead.create({
        buyer: buyer._id,
        dealer: dealer._id,
        source: "invalid_source",
      }),
    ).rejects.toThrow();
  });
});
