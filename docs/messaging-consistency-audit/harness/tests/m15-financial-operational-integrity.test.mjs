// M15 — financial and operational integrity on a REAL database built only from supabase/migrations (Supabase default
// privileges reproduced) plus the REAL backend for the HTTP checks. No provider sandbox: no money moves anywhere.
// Ledger RPCs are called exactly as the backend calls them (service role = table owner here).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s;
const q = (sql, params) => s.pool.query(sql, params);
const bal = async (code) => Number((await q("select balance from ledger_accounts where code=$1", [code])).rows[0].balance);
const post = (ref, amount, dr = "1000", cr = "4000", source = "m15") =>
  q("select kayad_post_ledger_entry_atomic($1, null, $2, 'KES', $3, 'test', 'm15', '{}'::jsonb, $4, $5) as r", [ref, amount, source, dr, cr]).then((r) => r.rows[0].r);

before(async () => { s = await startStack(); });
after(async () => { await s?.stop(); });

test("ledger: 10 concurrent posts with one external reference create one entry and move balances once", async () => {
  const ref = `m15-${uuid()}`;
  const [b1000, b4000] = [await bal("1000"), await bal("4000")];
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => post(ref, 250)));
  assert.ok(results.every((r) => r.status === "fulfilled"), JSON.stringify(results.filter((r) => r.status === "rejected").map((r) => String(r.reason))));
  const n = Number((await q("select count(*) n from ledger_entries where external_reference=$1 and source='m15'", [ref])).rows[0].n);
  assert.equal(n, 1, "exactly one ledger entry");
  assert.equal((await bal("1000")) - b1000, 250);
  assert.equal(Math.abs((await bal("4000")) - b4000), 250, "credit side moved once");
});

test("ledger: every entry is balanced (sum of debits = sum of credits) and amounts are positive", async () => {
  const bad = await q(`select id from ledger_entries le
    where (select coalesce(sum((x->>'debit')::numeric),0) - coalesce(sum((x->>'credit')::numeric),0) from jsonb_array_elements(le.entries) x) <> 0
       or amount <= 0`);
  assert.equal(bad.rowCount, 0);
});

test("ledger: invalid postings are rejected (zero/negative amount, same account both sides, missing reference)", async () => {
  await assert.rejects(post(`m15-${uuid()}`, 0), /greater than zero/);
  await assert.rejects(post(`m15-${uuid()}`, -5), /greater than zero/);
  await assert.rejects(post(`m15-${uuid()}`, 10, "1000", "1000"), /must differ/);
  await assert.rejects(post("  ", 10), /reference is required/);
});

test("ledger: entries are append-only (UPDATE and DELETE refused by trigger)", async () => {
  const e = await post(`m15-${uuid()}`, 10);
  await assert.rejects(q("update ledger_entries set amount = 1 where id=$1", [e.id]), /append-only/);
  await assert.rejects(q("delete from ledger_entries where id=$1", [e.id]), /append-only/);
});

test("ledger: reversal is a compensating entry, restores balances exactly and is idempotent", async () => {
  const [b1000, b4000] = [await bal("1000"), await bal("4000")];
  const e = await post(`m15-${uuid()}`, 75);
  const r1 = (await q("select kayad_reverse_ledger_entry_atomic($1, null, 'm15 test') r", [e.id])).rows[0].r;
  const r2 = (await q("select kayad_reverse_ledger_entry_atomic($1, null, 'm15 test again') r", [e.id])).rows[0].r;
  assert.equal(r1.idempotent, false); assert.equal(r2.idempotent, true); assert.equal(r2.id, r1.id);
  assert.equal(await bal("1000"), b1000); assert.equal(await bal("4000"), b4000);
});

test("ledger RPCs are not callable by Supabase client roles (anon/authenticated)", async () => {
  for (const role of ["anon", "authenticated"]) {
    const c = await s.pool.connect();
    try {
      await c.query("begin"); await c.query(`set local role ${role}`);
      await assert.rejects(c.query("select kayad_post_ledger_entry_atomic('x', null, 1, 'KES', 'x', 'x', 'x', '{}'::jsonb, '1000', '4000')"), /permission denied/);
      await c.query("rollback");
    } finally { c.release(); }
  }
});

test("KNOWN DEFECT FIN-LEDGER-1: kayad_rebuild_ledger_balances() must reproduce the balances the posting RPC maintains", async () => {
  // Reconciliation after a partial failure is "recompute balances from the journal". In this repository the posting and
  // reversal RPCs keep balances in the signed convention (debit +, credit -; the app's trial balance relies on it) while
  // the rebuild function uses normal-balance signs per account type. This test is expected to FAIL until the owner picks
  // one convention (docs/audits/24-FINANCIAL-AND-OPERATIONAL-INTEGRITY-20261011.md). It runs inside a rolled-back
  // transaction so the shared database is not altered.
  const c = await s.pool.connect();
  try {
    await c.query("begin");
    const before = (await c.query("select code, balance from ledger_accounts order by code")).rows;
    await c.query("select kayad_rebuild_ledger_balances()");
    const afterRows = (await c.query("select code, balance from ledger_accounts order by code")).rows;
    await c.query("rollback");
    const diff = before.filter((b, i) => Number(b.balance) !== Number(afterRows[i].balance)).map((b, i) => `${b.code}: ${b.balance} -> ${afterRows.find((a) => a.code === b.code).balance}`);
    assert.deepEqual(diff, [], "rebuild changed balances");
  } finally { c.release(); }
});

test("configuration statistics: anonymous 401, ordinary user 403 (authorization before any data access)", async () => {
  const anon = await s.client(null).get("/api/config/stats");
  assert.equal(anon.status, 401);
  const u = await s.makeUser("Plain User");
  const r = await s.client(u).get("/api/config/stats");
  assert.equal(r.status, 403);
});

test("ledger reports: ordinary users cannot read the trial balance or balance sheet", async () => {
  const u = await s.makeUser("Ledger Reader");
  for (const p of ["/api/ledger/trial-balance", "/api/ledger/balance-sheet"]) {
    assert.equal((await s.client(null).get(p)).status, 401, `${p} anonymous`);
    assert.equal((await s.client(u).get(p)).status, 403, `${p} ordinary user`);
  }
});
