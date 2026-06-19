// backend/tests/featureFlag.test.js
// ─────────────────────────────────────────────────────────────
// Enterprise Feature Flags tests
// Tests feature flag model, service, and middleware
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import FeatureFlag from "../models/FeatureFlag.js";

describe("FeatureFlag Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new feature flag", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      description: "Test flag description",
      type: "boolean",
      enabled: true,
      category: "general",
    });

    expect(flag).toHaveProperty("key", "test_flag");
    expect(flag).toHaveProperty("name", "Test Flag");
    expect(flag).toHaveProperty("enabled", true);
  });

  it("should enforce unique key", async () => {
    await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
    });

    await expect(
      FeatureFlag.create({
        key: "test_flag",
        name: "Test Flag 2",
        type: "boolean",
      }),
    ).rejects.toThrow();
  });

  it("should enforce type enum", async () => {
    await expect(
      FeatureFlag.create({
        key: "test_flag",
        type: "invalid_type",
      }),
    ).rejects.toThrow();
  });

  it("should enforce category enum", async () => {
    await expect(
      FeatureFlag.create({
        key: "test_flag",
        category: "invalid_category",
      }),
    ).rejects.toThrow();
  });

  it("should check if flag is enabled for boolean flag", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: true,
      environments: ["development", "staging", "production"],
    });

    const user = { role: "admin", _id: mongoose.Types.ObjectId() };
    const enabled = flag.isEnabled(user, null);

    expect(enabled).toBe(true);
  });

  it("should check if flag is disabled", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: false,
    });

    const enabled = flag.isEnabled(null, null);

    expect(enabled).toBe(false);
  });

  it("should check environment targeting", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: true,
      environments: ["production"],
    });

    // Simulate development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const enabled = flag.isEnabled(null, null);

    process.env.NODE_ENV = originalEnv;

    expect(enabled).toBe(false);
  });

  it("should check role targeting", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: true,
      roles: ["admin"],
    });

    const adminUser = { role: "admin", _id: mongoose.Types.ObjectId() };
    const buyerUser = { role: "buyer", _id: mongoose.Types.ObjectId() };

    expect(flag.isEnabled(adminUser, null)).toBe(true);
    expect(flag.isEnabled(buyerUser, null)).toBe(false);
  });

  it("should evaluate percentage rollout", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "percentage",
      enabled: true,
      percentage: 50,
      rolloutStrategy: "random",
    });

    const user = { _id: mongoose.Types.ObjectId() };
    const enabled = flag.evaluate(user, null);

    // With 50% random, should be either true or false
    expect(typeof enabled).toBe("boolean");
  });

  it("should increment evaluation counter", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: true,
    });

    expect(flag.evaluationCount).toBe(0);

    await flag.incrementEvaluation();
    await flag.reload();

    expect(flag.evaluationCount).toBe(1);
  });

  it("should hash string to number 0-100", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
    });

    const hash = flag.hashString("test_string");

    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(100);
  });

  it("should get flag by key", async () => {
    await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
    });

    const flag = await FeatureFlag.getByKey("test_flag");

    expect(flag).toBeDefined();
    expect(flag.key).toBe("test_flag");
  });

  it("should get all enabled flags", async () => {
    await FeatureFlag.create({
      key: "enabled_flag",
      name: "Enabled Flag",
      type: "boolean",
      enabled: true,
    });

    await FeatureFlag.create({
      key: "disabled_flag",
      name: "Disabled Flag",
      type: "boolean",
      enabled: false,
    });

    const flags = await FeatureFlag.getEnabledFlags();

    expect(flags.length).toBe(1);
    expect(flags[0].key).toBe("enabled_flag");
  });

  it("should get flags by category", async () => {
    await FeatureFlag.create({
      key: "auction_flag",
      name: "Auction Flag",
      type: "boolean",
      category: "auctions",
    });

    await FeatureFlag.create({
      key: "general_flag",
      name: "General Flag",
      type: "boolean",
      category: "general",
    });

    const flags = await FeatureFlag.getByCategory("auctions");

    expect(flags.length).toBe(1);
    expect(flags[0].key).toBe("auction_flag");
  });

  it("should toggle flag", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      enabled: true,
    });

    expect(flag.enabled).toBe(true);

    await FeatureFlag.toggle("test_flag");

    const updatedFlag = await FeatureFlag.getByKey("test_flag");
    expect(updatedFlag.enabled).toBe(false);
  });

  it("should evaluate flag with user_id_hash strategy", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "percentage",
      enabled: true,
      percentage: 50,
      rolloutStrategy: "user_id_hash",
    });

    const user = { _id: mongoose.Types.ObjectId() };
    const enabled1 = flag.evaluate(user, null);
    const enabled2 = flag.evaluate(user, null);

    // Same user should get same result
    expect(enabled1).toBe(enabled2);
  });

  it("should return 100% for percentage >= 100", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "percentage",
      enabled: true,
      percentage: 100,
    });

    const enabled = flag.evaluate(null, null);

    expect(enabled).toBe(true);
  });

  it("should return 0% for percentage <= 0", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "percentage",
      enabled: true,
      percentage: 0,
    });

    const enabled = flag.evaluate(null, null);

    expect(enabled).toBe(false);
  });
});

describe("FeatureFlag Schema Validation", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should require key field", async () => {
    const flag = new FeatureFlag({
      name: "Test Flag",
    });

    await expect(flag.save()).rejects.toThrow();
  });

  it("should require name field", async () => {
    const flag = new FeatureFlag({
      key: "test_flag",
    });

    await expect(flag.save()).rejects.toThrow();
  });

  it("should require type field", async () => {
    const flag = new FeatureFlag({
      key: "test_flag",
      name: "Test Flag",
    });

    await expect(flag.save()).rejects.toThrow();
  });

  it("should validate percentage range", async () => {
    const flag = new FeatureFlag({
      key: "test_flag",
      name: "Test Flag",
      type: "percentage",
      percentage: 150,
    });

    await expect(flag.save()).rejects.toThrow();
  });

  it("should accept valid type values", async () => {
    const validTypes = ["boolean", "percentage"];

    for (const type of validTypes) {
      const flag = new FeatureFlag({
        key: `test_flag_${type}`,
        name: "Test Flag",
        type,
      });

      await expect(flag.save()).resolves.toBeDefined();
    }
  });

  it("should accept valid category values", async () => {
    const validCategories = ["auctions", "escrow", "ntsa", "ai_valuation", "crm", "experiments", "general"];

    for (const category of validCategories) {
      const flag = new FeatureFlag({
        key: `test_flag_${category}`,
        name: "Test Flag",
        category,
      });

      await expect(flag.save()).resolves.toBeDefined();
    }
  });

  it("should store dealer targeting", async () => {
    const dealerId = mongoose.Types.ObjectId();
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      dealers: [dealerId],
    });

    expect(flag.dealers).toHaveLength(1);
    expect(flag.dealers[0].toString()).toBe(dealerId.toString());
  });

  it("should store tags array", async () => {
    const flag = await FeatureFlag.create({
      key: "test_flag",
      name: "Test Flag",
      type: "boolean",
      tags: ["beta", "experimental"],
    });

    expect(flag.tags).toHaveLength(2);
    expect(flag.tags).toContain("beta");
  });
});
