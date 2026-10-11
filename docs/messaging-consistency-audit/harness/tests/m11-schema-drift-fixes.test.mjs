// M11 — db-layer queries that failed against the migrated schema (route-schema crawl, 2026-10-11) now run.
// REAL: backend db layer (db/index.js + utils/fieldMap.js) over the PostgREST emulator on a full migration replay.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startEmulator } from "../postgrest-emulator.mjs";
import { BACKEND, uuid } from "../lib/stack.mjs";
import { createRequire } from "node:module";

const require = createRequire(BACKEND + "/package.json");
const jwt = require("jsonwebtoken");
let emu, db, A, B;

before(async () => {
  emu = await startEmulator({ database: process.env.KAYAD_TEST_DB || "msg_chain" });
  process.env.SUPABASE_URL = emu.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = jwt.sign({ role: "service_role" }, "x");
  const sb = await import(path.join(BACKEND, "utils/supabase.js"));
  sb.initSupabase();
  db = await import(path.join(BACKEND, "db/index.js"));
  A = uuid(); B = uuid();
  for (const [id, n] of [[A, "drift-buyer"], [B, "drift-seller"]]) await emu.pool.query("insert into users (id,name,email,role,status) values ($1,$2,$3,'user','approved')", [id, n, `${n}.${id.slice(0, 6)}@example.test`]);
});
after(async () => { await emu.close(); });

test("operations dispute queue (Escrow model, disputeWorkflowStatus / disputePriority filters) reads the real camelCase columns", async () => {
  const Escrow = (await import(path.join(BACKEND, "models/Escrow.js"))).default;
  await emu.pool.query(`insert into escrows (buyer, seller, amount, status, "disputeWorkflowStatus", "disputePriority") values ($1,$2,500,'disputed','open','urgent')`, [A, B]);
  const before = emu.stats.errors.length;
  const n = await Escrow.countDocuments({ status: "disputed", disputeWorkflowStatus: "open", disputePriority: "urgent" });
  assert.deepEqual(emu.stats.errors.slice(before), [], "no PostgREST/PostgreSQL error");
  assert.ok(n >= 1);
});

test("notification unread counts by `isRead` (operations dashboards) hit the real `read` column", async () => {
  await emu.pool.query("insert into notifications (user_id,title,message,type,read) values ($1,'t','m','info',false),($1,'t','m','info',true)", [A]);
  const before = emu.stats.errors.length;
  const n = await db.count("notifications", { user: A, isRead: false });
  assert.deepEqual(emu.stats.errors.slice(before), []);
  assert.equal(n, 1);
});
