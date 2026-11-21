import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Phase 10 operational data contract", () => {
  test("defines the backing tables and reminder columns", () => {
    const sql = read("supabase/migrations/20260902090000_phase10_operational_data_contract.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS search_analytics");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS vehicle_market_analytics");
    expect(sql).toContain("reminder_sent_5min");
    expect(sql).toContain("idx_escrows_payment_unique");
  });

  test("uses atomic payment settlement RPCs", () => {
    const source = read("backend/services/paymentCallback.service.js");
    expect(source).toContain("atomicSettleBidPayment");
    expect(source).toContain("atomicSettlePurchasePayment");
    expect(source).not.toContain('update("bids", bid.id');
    expect(source).not.toContain('create("escrows"');
  });

  test("does not bypass the field-mapped data layer with direct Supabase table queries", () => {
    const files = [
      "backend/services/recommendationService.js",
      "backend/services/searchInsightsService.js",
      "backend/services/vehicleAnalyticsService.js",
      "backend/services/auctionReminderCron.js",
      "backend/services/ledgerService.js",
    ];
    for (const file of files) {
      expect(read(file)).not.toContain("getSupabase().from");
    }
  });
});
