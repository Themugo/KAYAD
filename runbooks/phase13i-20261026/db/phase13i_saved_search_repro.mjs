/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13I — reproduces the 13H-era saved-search cron on the REAL data layer against a DISPOSABLE database.
// It replays the exact data-layer calls made by the old tick (backend/services/savedSearchCron.js @ 13H) and reports which fail.
// Requires: SUPABASE_URL (loopback proxy), SUPABASE_SERVICE_ROLE_KEY, E2E_DB (*_disposable), PGHOST/PGPORT/PGUSER.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "")) { console.error("REFUSING: not a disposable loopback DB"); process.exit(2); }
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.SUPABASE_URL || "")) { console.error("REFUSING: SUPABASE_URL must be loopback"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim(); };
const root = resolve(new URL("../../../backend/", import.meta.url).pathname);
const { initSupabase } = await import(pathToFileURL(`${root}/utils/supabase.js`).href);
initSupabase();
const db = await import(pathToFileURL(`${root}/db/index.js`).href);
const tag = `r13i${Math.random().toString(36).slice(2, 8)}`;
const uid = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${tag}','${tag}@t.example','user','approved',true) RETURNING id`);
const ss = sql(`INSERT INTO saved_searches(user_id,name,filters,notify_on_new_match) VALUES('${uid}','${tag} search','{"brand":"${tag}"}'::jsonb,true) RETURNING id`);
const carIds = {};
for (const st of ["available", "pending", "hidden", "draft"]) carIds[st] = sql(`INSERT INTO cars(title,brand,model,year,price,status,approved) VALUES('${tag} ${st}','${tag}','m',2020,1000,'${st}',true) RETURNING id`);
const out = [];
const step = async (name, fn) => { try { const r = await fn(); out.push({ name, ok: true, detail: r }); } catch (e) { out.push({ name, ok: false, detail: `${e.code || ""} ${e.message}`.trim() }); } };
await step("1 find searches {notify:true}", async () => (await db.findAll("saved_searches", { filters: { notify: true } })).length >= 1);
let cars = [];
await step("2 find new cars with the 13H select list (as the old tick did)", async () => {
  cars = await db.findAll("cars", { filters: { createdAt: { $gte: new Date(Date.now() - 600000).toISOString() } }, select: "title,brand,model,price,year,mileage,fuel,transmission,bodyType,color,city,auctionStatus,allowBid,isVerifiedDealer,createdAt" });
  return `${cars.filter((c) => c.brand === tag).length} of my 4 fixture cars returned (statuses unfiltered: old tick had no status filter); id present on rows: ${cars.some((c) => c.id !== undefined)}`;
});
await step("3 old tick: update saved_searches.lastNotifiedAt (column does not exist)", async () => { await db.update("saved_searches", ss, { lastNotifiedAt: new Date().toISOString() }); return "updated"; });
out.push({ name: "4 information: saved_searches columns", ok: true, detail: sql(`SELECT string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='saved_searches'`) });
sql(`DELETE FROM saved_searches WHERE id='${ss}'`); sql(`DELETE FROM cars WHERE brand='${tag}'`); sql(`DELETE FROM users WHERE id='${uid}'`);
for (const o of out) console.log(`${o.ok ? "OK  " : "FAIL"} ${o.name} :: ${o.detail}`);
process.exit(0);
