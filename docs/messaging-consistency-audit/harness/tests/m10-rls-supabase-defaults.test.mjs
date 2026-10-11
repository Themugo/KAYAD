// M10 — RLS / least privilege under SUPABASE DEFAULT PRIVILEGES.
// Database: the full migration chain replayed with `SUPABASE_DEFAULT_PRIVILEGES=1 apply_chain.sh` (anon/authenticated/
// service_role receive ALL on every new table/sequence/function, exactly like a hosted project), so the ONLY barrier left for
// client roles is what the migrations themselves revoke + RLS. Run with KAYAD_RLS_DB=<that database>.
// Client roles are exercised directly in PostgreSQL (SET LOCAL ROLE + request.jwt.claims, the same mechanism PostgREST uses).
// This is local PostgreSQL evidence — NOT hosted Supabase evidence (no GoTrue, no PostgREST, no Realtime).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const DB = process.env.KAYAD_RLS_DB || "kayad_supa";
const uuid = () => crypto.randomUUID();
let pool, A, B, chat;

// Policies an anonymous visitor may legitimately satisfy without being signed in: published marketing / CMS content.
// Every entry was reviewed against its predicate (status/is_active/visibility gates, no personal data).
const PUBLIC_CONTENT = new Set([
  "ad_slots.ad_slots_public_read", "cms_announcements.cms_announcements_public_read", "cms_banners.cms_banners_public_read",
  "cms_car_card_configs.cms_car_card_configs_public_read", "cms_content_blocks.cms_content_blocks_public_read",
  "cms_contents.cms_contents_public_read", "cms_faqs.cms_faqs_public_read", "cms_footer_configs.cms_footer_configs_public_read",
  "cms_forms.cms_forms_public_read", "cms_hero_sections.cms_hero_sections_public_read", "cms_media.cms_media_public_read",
  "cms_nav_items.cms_nav_items_public_read", "cms_navigation.cms_navigation_public_read",
  "cms_page_sections.cms_page_sections_public_read", "cms_pages.cms_pages_public_read", "cms_popups.cms_popups_public_read",
  "cms_seo_configs.cms_seo_configs_public_read", "cms_theme_configs.cms_theme_configs_public_read",
  "cms_website_settings.cms_website_settings_public_read", "hero_placements.hero_placements_public_active",
  "website_settings.website_settings_public_read",
]);
const IDENTITY_BOUND = /auth\.uid\(\)|is_admin\(\)|^false$/;

const asRole = async (role, sub, fn) => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE ${role}`);
    await c.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(sub ? { role, sub } : { role })]);
    return await fn(c);
  } finally { await c.query("ROLLBACK").catch(() => {}); c.release(); }
};
const tryQ = async (c, sql, p = []) => { await c.query("SAVEPOINT s"); try { const r = await c.query(sql, p); await c.query("RELEASE SAVEPOINT s"); return { ok: true, rowCount: r.rowCount, rows: r.rows }; } catch (e) { await c.query("ROLLBACK TO SAVEPOINT s"); return { ok: false, code: e.code, message: e.message }; } };

before(async () => {
  pool = new Pool({ host: "/var/run/postgresql", user: "postgres", database: DB, max: 4 });
  const d = (await pool.query("select has_table_privilege('anon','public.users','SELECT') a")).rows[0].a;
  assert.equal(d, true, `${DB} must be built with SUPABASE_DEFAULT_PRIVILEGES=1 (anon has table privileges on hosted Supabase)`);
  A = uuid(); B = uuid();
  for (const [id, n] of [[A, "rls-a"], [B, "rls-b"]]) {
    await pool.query("insert into users (id,name,email,role,status) values ($1,$2,$3,'user','approved')", [id, n, `${n}.${id.slice(0, 6)}@example.test`]);
    await pool.query("insert into user_auth (user_id,password) values ($1,'$2a$12$notarealhashnotarealhashnotarealhashnotarealhash12')", [id]);
    await pool.query(`insert into refresh_tokens ("user", expires_at, token_hash) values ($1, now()+interval '1 day', $2)`, [id, "h" + id]);
  }
  chat = (await pool.query(`insert into chats (participants, messages) values ($1::uuid[], $2::jsonb) returning id`,
    [[A, B].sort(), JSON.stringify([{ id: uuid(), sender: A, text: "private text", createdAt: new Date().toISOString(), seenBy: [], attachments: [] }])])).rows[0].id;
  await pool.query("insert into notifications (user_id,title,message,type) values ($1,'New message','private text','chat')", [B]);
  await pool.query("insert into chat_message_outbox (event_id,chat_id,sender_id) values ($1,$2,$3)", [uuid(), chat, A]);
  await pool.query("insert into payments (user_id, amount) values ($1, 1000)", [A]);
  await pool.query("insert into ledger_entries (transaction_id, external_reference, amount, source, destination, user_id) values ($1,$1,10,'a','b',$2)", ["t" + A, A]);
  await pool.query("insert into mpesa_transactions (amount) values (5)");
  await pool.query("insert into idempotency_audit_logs (key,status) values ('k','attempted')");
  await pool.query("insert into governance_policies (name, description) values ('internal policy', 'internal')");
  await pool.query("insert into risk_assessments (title, severity) values ('internal risk', 'high')");
});
after(async () => { await pool.end(); });

test("catalog: every public table has RLS enabled", async () => {
  const r = await pool.query("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity order by 1");
  assert.deepEqual(r.rows.map((x) => x.relname), []);
});

test("catalog: no non-trigger SECURITY DEFINER function is executable by anon/authenticated (is_admin() excepted: boolean helper used inside policies)", async () => {
  const r = await pool.query(`select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.prorettype <> 'trigger'::regtype and p.proname <> 'is_admin'
      and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')) order by 1`);
  assert.deepEqual(r.rows.map((x) => x.sig), []);
});

test("catalog: client roles cannot EXECUTE any public function directly, except is_admin() for authenticated", async () => {
  const r = await pool.query(`select p.oid::regprocedure::text sig,
      has_function_privilege('anon',p.oid,'EXECUTE') anon, has_function_privilege('authenticated',p.oid,'EXECUTE') auth
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
      and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')) order by 1`);
  const bad = r.rows.filter((x) => !(x.sig === "is_admin()" && !x.anon));
  assert.deepEqual(bad.map((x) => x.sig), []);
});

test("catalog: every policy reachable by anon (roles public/anon) is identity-bound, deny-all, or reviewed public content", async () => {
  const r = await pool.query(`select c.relname t, p.polname n, pg_get_expr(p.polqual,p.polrelid) u, pg_get_expr(p.polwithcheck,p.polrelid) w
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace s on s.oid=c.relnamespace
    where s.nspname='public' and (0 = any(p.polroles) or 'anon'::regrole::oid = any(p.polroles))`);
  const bad = r.rows.filter((x) => !PUBLIC_CONTENT.has(`${x.t}.${x.n}`) && !(IDENTITY_BOUND.test(x.u || "false") && IDENTITY_BOUND.test(x.w || "false")));
  assert.deepEqual(bad.map((x) => `${x.t}.${x.n}: USING ${x.u} CHECK ${x.w}`), []);
});

test("catalog: no policy grants `authenticated` unconditional access (USING/CHECK true)", async () => {
  const r = await pool.query(`select c.relname||'.'||p.polname x from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace s on s.oid=c.relnamespace
    where s.nspname='public' and 'authenticated'::regrole::oid = any(p.polroles)
      and (pg_get_expr(p.polqual,p.polrelid) = 'true' or pg_get_expr(p.polwithcheck,p.polrelid) = 'true') order by 1`);
  assert.deepEqual(r.rows.map((x) => x.x), []);
});

const SENSITIVE = ["users", "user_auth", "refresh_tokens", "chats", "notifications", "chat_message_outbox", "chat_message_idempotency",
  "payments", "ledger_entries", "mpesa_transactions", "escrows", "dealer_payouts", "refunds", "bids", "auction_registrations",
  "auction_security_holds", "idempotency_audit_logs", "audit_logs", "otp_challenges", "support_tickets", "provider_credentials",
  "governance_policies", "risk_assessments"];

for (const [label, role, subFn] of [["anon", "anon", () => null], ["authenticated (foreign sub)", "authenticated", () => uuid()], ["authenticated as user A", "authenticated", () => A]]) {
  test(`dynamic, ${label}: cannot read, insert, update or delete sensitive rows`, async () => {
    const leaks = [];
    await asRole(role, subFn(), async (c) => {
      for (const t of SENSITIVE) {
        const sel = await tryQ(c, `select count(*)::int n from public.${t}`);
        if (sel.ok && sel.rows[0].n > 0) leaks.push(`${t}: SELECT sees ${sel.rows[0].n} row(s)`);
        const upd = await tryQ(c, `update public.${t} set ${t === "chats" ? "participants = participants" : "id = id"}`);
        if (upd.ok && upd.rowCount > 0) leaks.push(`${t}: UPDATE touched ${upd.rowCount}`);
        const del = await tryQ(c, `delete from public.${t}`);
        if (del.ok && del.rowCount > 0) leaks.push(`${t}: DELETE removed ${del.rowCount}`);
      }
      const ins = [
        ["chats", "insert into public.chats (participants) values ($1::uuid[])", [[A, uuid()]]],
        ["notifications", "insert into public.notifications (user_id,title,message) values ($1,'x','x')", [B]],
        ["payments", "insert into public.payments (user_id, amount) values ($1, 1)", [A]],
        ["ledger_entries", "insert into public.ledger_entries (transaction_id, external_reference, amount, source, destination) values ('x','x',1,'a','b')", []],
        ["chat_message_outbox", "insert into public.chat_message_outbox (event_id,chat_id,sender_id) values ($1,$2,$3)", [uuid(), chat, A]],
        ["users", "insert into public.users (name,email,role) values ('evil','evil@example.test','admin')", []],
      ];
      for (const [t, sql, p] of ins) { const r = await tryQ(c, sql, p); if (r.ok) leaks.push(`${t}: INSERT succeeded`); }
    });
    assert.deepEqual(leaks, []);
  });
}

test("dynamic: privileged RPCs cannot be invoked by client roles (send message as another user, claim outbox, place bid)", async () => {
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, role === "anon" ? null : B, async (c) => {
      for (const sql of [
        `select kayad_append_chat_message_idempotent('${chat}','${A}','forged','[]'::jsonb,'${uuid()}')`,
        "select * from kayad_claim_chat_outbox(10,60,0)",
        `select kayad_place_bid_atomic('${uuid()}','${A}',100)`,
        `select kayad_rotate_refresh_token('x','y')`,
      ]) {
        const r = await tryQ(c, sql);
        assert.equal(r.ok, false, `${role} executed: ${sql}`);
        assert.match(r.code, /^(42501|42883)$/, `${role}: ${sql} -> ${r.code} ${r.message}`);
      }
    });
  }
});

test("after the least-privilege revoke, triggers still fire for the service role (immutability + updated_at)", async () => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN"); await c.query("SET LOCAL ROLE service_role");
    const id = (await c.query("insert into ledger_entries (transaction_id, external_reference, amount, source, destination) values ($1,$1,1,'a','b') returning id", ["trg-" + uuid()])).rows[0].id;
    await c.query("SAVEPOINT s");
    const upd = await c.query("update ledger_entries set amount = 2 where id = $1", [id]).then(() => "updated", (e) => e.message);
    assert.match(upd, /immutable|append-only|cannot|not allowed/i, `ledger immutability trigger must still fire, got: ${upd}`);
    await c.query("ROLLBACK TO SAVEPOINT s");
    const before = (await c.query("select updated_at from users where id = $1", [A])).rows[0].updated_at;
    await new Promise((r) => setTimeout(r, 20));
    await c.query("update users set name = name || '' where id = $1", [A]);
    const afterTs = (await c.query("select updated_at from users where id = $1", [A])).rows[0].updated_at;
    assert.ok(new Date(afterTs) >= new Date(before), "updated_at trigger ran");
  } finally { await c.query("ROLLBACK").catch(() => {}); c.release(); }
});

test("Supabase-Auth administrators keep read access to governance tables (is_admin() gate), ordinary users do not", async () => {
  const adminId = uuid();
  await pool.query("insert into users (id,name,email,role,status) values ($1,'gov-admin',$2,'admin','approved')", [adminId, `gov.${adminId.slice(0, 6)}@example.test`]);
  const seen = await asRole("authenticated", adminId, async (c) => (await c.query("select count(*)::int n from governance_policies")).rows[0].n);
  assert.ok(seen > 0, "admin sees governance rows");
  const notSeen = await asRole("authenticated", A, async (c) => (await c.query("select count(*)::int n from governance_policies")).rows[0].n);
  assert.equal(notSeen, 0);
});

test("profiles.role follows users.role (promotion and demotion) and profiles rows are updatable", async () => {
  const id = uuid();
  await pool.query("insert into users (id,name,email,role,status) values ($1,'promo',$2,'user','approved')", [id, `promo.${id.slice(0, 6)}@example.test`]);
  const isAdmin = () => asRole("authenticated", id, async (c) => (await c.query("select public.is_admin() a")).rows[0].a);
  assert.equal(await isAdmin(), false);
  await pool.query("update users set role='admin' where id=$1", [id]);
  assert.equal((await pool.query("select role from profiles where id=$1", [id])).rows[0].role, "admin");
  assert.equal(await isAdmin(), true, "promotion reaches RLS");
  await pool.query("update users set role='user' where id=$1", [id]);
  assert.equal(await isAdmin(), false, "demotion reaches RLS (stale admin privilege removed)");
  await pool.query("update profiles set last_login_at = now() where id=$1", [id]); // previously: record "new" has no field "updated_at"
});

test("client roles hold no TRUNCATE / REFERENCES / TRIGGER on any public table (TRUNCATE bypasses RLS)", async () => {
  const r = await pool.query(`select c.relname t from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and (
      has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE') or
      has_table_privilege('anon',c.oid,'REFERENCES') or has_table_privilege('authenticated',c.oid,'REFERENCES') or
      has_table_privilege('anon',c.oid,'TRIGGER') or has_table_privilege('authenticated',c.oid,'TRIGGER')) order by 1`);
  assert.deepEqual(r.rows.map((x) => x.t), []);
});
