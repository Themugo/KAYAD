import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";

const routes = fs.readFileSync(new URL("../../routes/dealerPlatformRoutes.js", import.meta.url), "utf8");
const controller = fs.readFileSync(new URL("../../controllers/dealerPlatformController.js", import.meta.url), "utf8");
const chat = fs.readFileSync(new URL("../../controllers/chatController.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../../../supabase/migrations/20261123210000_lead_create_find_before_insert.sql", import.meta.url), "utf8");
const line = (re) => routes.split("\n").find((l) => re.test(l)) || "";

describe("dealer launch flows: route guards and invariants (the behaviour is proven by ci/db-journeys/23_dealer_launch_flows.mjs)", () => {
  test("lead conversation routes require the buyer-chat permission and authentication; sending is rate limited and freeze-covered", () => {
    for (const re of [/router\.get\("\/leads\/:leadId\/messages"/, /router\.post\("\/leads\/:leadId\/messages"/]) {
      const l = line(re);
      expect(l).toContain("protect");
      expect(l).toContain('dealerWorkspaceAccess(["canChatBuyers"])');
    }
    expect(line(/router\.post\("\/leads\/:leadId\/messages"/)).toContain("chatLimiter");
  });
  test("vehicle request routes require a vehicle permission, never owner-only and never open to Basic Staff Access", () => {
    for (const re of [/router\.get\("\/vehicle-requests"/, /router\.post\("\/vehicle-requests"/]) {
      const l = line(re);
      expect(l).toContain('dealerWorkspaceAccess(["canListCars","canEditCars"])');
    }
    expect(line(/router\.post\("\/vehicle-requests"/)).toContain("createLimiter");
  });
  test("the conversation is resolved from the lead owned by the caller, never from the request", () => {
    expect(controller).toMatch(/String\(lead\.dealer\) !== String\(req\.user\.id\)\) \{ res\.status\(404\)/);
    expect(controller).toContain("req.params.chatId = ctx.chatId");
    expect(controller).not.toMatch(/req\.(body|query)\??\.chatId/);
  });
  test("a vehicle request is a support case that cannot carry status, priority or pricing, and checks vehicle ownership", () => {
    expect(controller).toContain('category: "seller"');
    expect(controller).toMatch(/String\(car\.dealer\) !== String\(req\.user\.id\)/);
    expect(controller).not.toMatch(/createSupportCase\([^)]*(priority|status|price)/s);
  });
  test("a dealer reply moves a new lead to contacted by comparing the sender with the lead's dealership (not with the other participant)", () => {
    expect(chat).toContain("lead.dealer ?? lead.dealer_id ?? lead.dealerId");
    expect(chat).not.toMatch(/const dealerId = chat\.participants\.find\(\(p\) => p\.toString\(\) !== req\.user\.id\.toString\(\)\);\s*\n\s*if \(dealerId && req\.user\.id/);
  });
  test("lead creation finds before it inserts (the business-identity index is not unique, so ON CONFLICT never fired)", () => {
    const sql = migration.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(sql).toMatch(/SELECT \* INTO v_lead FROM leads/);
    expect(sql).not.toMatch(/ON CONFLICT/i);
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
  });
});
