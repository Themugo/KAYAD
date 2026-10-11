// M9 — /api/config administrative reads. REAL server + real auth middleware + real PostgreSQL via the emulator.
// NOTE: the config tables (config_entries, feature flags...) are absent from the migration chain (D-SCHEMA-2), so an AUTHORISED caller gets a 5xx
// from the data layer; this test proves the authorisation boundary (401/403 vs reaching the handler), not the data.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "../lib/stack.mjs";

let s; const clients = {};
before(async () => {
  s = await startStack();
  for (const role of ["user", "individual_seller", "dealer", "technical_support", "moderator", "accounts", "admin", "superadmin"]) clients[role] = s.client(await s.makeUser("R " + role, { role }));
  clients.anon = s.client(null);
});
after(async () => { await s.stop(); });

const RESTRICTED = ["/api/config/stats", "/api/config/entries", "/api/config/features"];
const ADMIN = new Set(["admin", "superadmin"]);

for (const path of RESTRICTED) {
  test(`${path}: anonymous 401; every non-administrator 403; admin/superadmin reach the handler`, async () => {
    assert.equal((await clients.anon.get(path)).status, 401);
    for (const [role, c] of Object.entries(clients)) {
      if (role === "anon") continue;
      const r = await c.get(path);
      if (ADMIN.has(role)) assert.ok(r.status !== 401 && r.status !== 403, `${role} reaches handler (got ${r.status}; 5xx = D-SCHEMA-2 missing tables)`);
      else assert.equal(r.status, 403, `${role} must be denied`);
    }
  });
}

test("a request cannot elevate itself with client-supplied role hints", async () => {
  const r = await clients.user.get("/api/config/stats", { "x-user-role": "admin", "x-role": "superadmin" });
  assert.equal(r.status, 403);
  assert.equal((await clients.user.get("/api/config/stats?role=admin&isAdmin=true")).status, 403);
});

test("master data that the product reads stays available to ordinary signed-in users and still requires a session", async () => {
  assert.equal((await clients.anon.get("/api/config/vehicle/makes")).status, 401, "unchanged: session required");
  const r = await clients.user.get("/api/config/vehicle/makes");
  assert.ok(r.status !== 401 && r.status !== 403, `signed-in user not denied (got ${r.status})`);
});
