import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import Ad from "../models/Ad.js";

describeWithDb("Ad Routes", () => {
  beforeAll(async () => {
    await Ad.create([
      {
        clientName: "Toyota Kenya",
        imageUrl: "https://example.com/toyota-ad.jpg",
        targetLink: "https://toyota.co.ke",
        placement: "homepage_banner",
        isActive: true,
      },
      {
        clientName: "Expired Ad",
        imageUrl: "https://example.com/expired.jpg",
        targetLink: "https://example.com",
        placement: "auction_sidebar",
        isActive: false,
      },
      {
        clientName: "BMW Kenya",
        imageUrl: "https://example.com/bmw-ad.jpg",
        targetLink: "https://bmw.co.ke",
        placement: "auction_sidebar",
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describeWithDb("GET /api/ads/", () => {
    it("returns only active ads", async () => {
      const res = await request(app).get("/api/ads/").expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.ads)).toBe(true);
      expect(res.body.ads.length).toBe(2);
      expect(res.body.ads.every((a) => a.isActive)).toBe(true);
    });

    it("filters by placement", async () => {
      const res = await request(app).get("/api/ads/?placement=auction_sidebar").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ads.length).toBe(1);
      expect(res.body.ads[0].placement).toBe("auction_sidebar");
    });

    it("returns empty array when no active ads match placement", async () => {
      const res = await request(app).get("/api/ads/?placement=bid_modal").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ads.length).toBe(0);
    });
  });
});
