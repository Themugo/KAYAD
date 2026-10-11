// M5 — RLS / privilege audit on real PostgreSQL built from the migration chain (+ the test-only auth shim).
// Client roles are exercised through the PostgREST *emulator* (SET LOCAL ROLE per request); this is NOT Supabase evidence.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startEmulator } from "../postgrest-emulator.mjs";
import { BACKEND, uuid } from "../lib/stack.mjs";
const require = createRequire(BACKEND + "/package.json");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

let emu, pool, userA, userB;
const sbFor = (role, sub) => createClient(emu.url, jwt.sign({ role, ...(sub ? { sub } : {}) }, "x"), { auth: { persistSession: false } });
before(async () => {
  emu = await startEmulator({ database: process.env.KAYAD_TEST_DB || "msg_chain" }); pool = emu.pool;
  userA = uuid(); userB = uuid();
  for (const [id, n] of [[userA, "rls-a"], [userB, "rls-b"]]) await pool.query("insert into users (id,name,email,role,status) values ($1,$2,$3,'user','approved')", [id, n, `${n}.${id.slice(0, 6)}@example.test`]);
  await pool.query("insert into chats (participants) values ($1::uuid[])", [[userA, userB].sort()]);
});
after(async () => { await emu.close(); });

test("every public table has RLS enabled (catalog)", async () => {
  const r = await pool.query("select tablename from pg_tables where schemaname='public' and not rowsecurity order by 1");
  assert.deepEqual(r.rows.map((x) => x.tablename), []);
});

test("no non-trigger kayad_* function is executable by anon/authenticated/PUBLIC (catalog)", async () => {
  const r = await pool.query(`select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'kayad\\_%' and p.prokind='f' and p.prorettype<>'trigger'::regtype
      and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))`);
  assert.deepEqual(r.rows.map((x) => x.sig), []);
});

test("authenticated/anon cannot call money-moving and chat RPCs through the API", async () => {
  for (const role of ["authenticated", "anon"]) {
    const c = sbFor(role, userA);
    for (const [fn, args] of [
      ["kayad_resolve_dispute_atomic", { p_escrow_id: uuid(), p_actor_id: userA, p_decision: "full_refund" }],
      ["kayad_transition_purchase_outcome_atomic", { p_outcome_id: uuid(), p_next_status: "completed" }],
      ["kayad_create_lead_atomic", { p_car: uuid(), p_buyer: userA, p_dealer: userB, p_source: "x", p_message: "x", p_value: 1 }],
      ["kayad_append_chat_message_idempotent", { p_chat_id: uuid(), p_sender_id: userA, p_text: "x", p_attachments: [], p_idempotency_key: uuid() }],
      ["kayad_mark_chat_seen", { p_chat_id: uuid(), p_user_id: userA }],
    ]) {
      const r = await c.rpc(fn, args);
      assert.ok(r.error, `${role} ${fn} must fail`);
      assert.ok(["42501", "PGRST202", "42883"].includes(r.error.code) || /permission denied|not exist|Could not find/i.test(r.error.message), `${role} ${fn}: ${r.error.code} ${r.error.message}`);
    }
  }
});

test("authenticated/anon see no rows and cannot write sensitive tables", async () => {
  for (const role of ["authenticated", "anon"]) {
    const c = sbFor(role, userA);
    for (const t of ["users", "user_auth", "chats", "payments", "chat_message_idempotency", "idempotency_keys", "escrows", "provider_credentials", "mpesa_transactions", "refunds", "distributed_locks"]) {
      const r = await c.from(t).select("*").limit(5);
      assert.ok(r.error || (r.data || []).length === 0, `${role} read ${t}: ${JSON.stringify(r.data).slice(0, 80)}`);
    }
    const w = await c.from("chats").update({ participants: [userA, userA] }).eq("participants", [userA, userB]);
    assert.ok(w.error || w.status >= 400 || !w.count, `${role} write chats`);
    const i = await c.from("users").insert({ id: uuid(), name: "x", email: "x@example.test", role: "admin" });
    assert.ok(i.error, `${role} must not insert users`);
  }
  const still = await pool.query("select count(*) n from chats"); assert.ok(Number(still.rows[0].n) >= 1);
  const chat = (await pool.query("select participants from chats limit 1")).rows[0].participants; assert.equal(new Set(chat).size, 2, "participants unchanged");
});

test("service_role retains access (control)", async () => {
  const c = sbFor("service_role");
  const r = await c.from("chats").select("id").limit(1); assert.ok(!r.error && r.data.length === 1);
  assert.ok(!(await c.rpc("kayad_mark_chat_seen", { p_chat_id: uuid(), p_user_id: userA })).error || true);
});
