/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13I — saved-search notification job against the REAL data layer on a DISPOSABLE database.
// External channels are driven only by a recording test double; the real gateway is used for the in-app channel (delivery ledger).
// Requires: SUPABASE_URL (loopback proxy), SUPABASE_SERVICE_ROLE_KEY, E2E_DB (*_disposable), PGHOST/PGPORT/PGUSER. No provider env is read or set.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "")) { console.error("REFUSING: not a disposable loopback DB"); process.exit(2); }
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.SUPABASE_URL || "")) { console.error("REFUSING: SUPABASE_URL must be loopback"); process.exit(2); }
for (const k of ["BREVO_API_KEY", "AT_API_KEY", "TWILIO_AUTH_TOKEN"]) if (process.env[k]) { console.error(`REFUSING: provider credential ${k} is set in this environment`); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr + "\n" + s.slice(0, 200)); return r.stdout.trim().split("\n")[0]; };
const root = resolve(new URL("../../../backend/", import.meta.url).pathname);
const imp = (p) => import(pathToFileURL(`${root}/${p}`).href);
const { initSupabase } = await imp("utils/supabase.js"); initSupabase();
const { runSavedSearchNotificationJob } = await imp("services/savedSearchNotificationJob.js");
const { emitCommunication } = await imp("services/communicationEvents.service.js");

const T = `j13i${Math.random().toString(36).slice(2, 8)}`;
let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const user = (k, extra = "") => sql(`INSERT INTO users(name,email,role,status,email_verified${extra ? "," + extra.split("=")[0] : ""}) VALUES('${T} ${k}','${T}.${k}@t.example','user','approved',true${extra ? "," + extra.split("=")[1] : ""}) RETURNING id`);
const U = { a: user("a"), b: user("b"), c: user("c", "is_banned=true"), seller: user("seller"), d: user("d", "is_banned=false") };
const search = (uid, name, notify = true, filters = `{"brand":"${T}"}`) => sql(`INSERT INTO saved_searches(user_id,name,filters,notify_on_new_match) VALUES('${uid}','${T} ${name}','${filters}'::jsonb,${notify}) RETURNING id`);
const S = { a: search(U.a, "a"), b: search(U.b, "b-off", false), c: search(U.c, "c-banned"), seller: search(U.seller, "seller-own") };
const car = (t, st, owner = U.seller, extra = "") => sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved${extra ? ",created_at" : ""}) VALUES('${T} ${t}','${T}','m',2020,1000,'${owner}','${st}',true${extra ? "," + extra : ""}) RETURNING id`);
const C = { ok: car("ok", "available"), pend: car("pend", "pending"), draft: car("draft", "draft"), hid: car("hidden", "hidden"), sold: car("sold", "sold"), old: car("old", "available", U.seller, "now() - interval '3 days'") };
const C_DEL = car("deleted", "available"); sql(`UPDATE cars SET deleted_at=now() WHERE id='${C_DEL}'`);
const ledger = () => JSON.parse(sql(`SELECT coalesce(json_agg(json_build_object('u',user_id,'ch',channel,'ids',metadata->'carIds','ss',metadata->>'savedSearchId')),'[]'::json) FROM communication_deliveries WHERE event_type='marketplace.saved_search_match' AND metadata->>'savedSearchId' IN ('${Object.values(S).join("','")}')`));
const STARTED = sql("SELECT now()");
const audits = (mode = "") => Number(sql(`SELECT count(*) FROM audit_logs WHERE action='Saved-search job run' AND created_at >= '${STARTED}'${mode ? ` AND details->>'mode'='${mode}'` : ""}`) || 0);
const doubleCalls = [];
const doubleEmit = async (p) => { doubleCalls.push(`${p.userId}:${p.channels[0]}`); if (p.userId === U.a && p.channels[0] === "email") throw new Error("Communication channel email is disabled for marketing messages"); return [{ id: "double" }]; };
const ENV = (mode, ext) => ({ SAVED_SEARCH_JOB_MODE: mode, ...(ext ? { SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" } : {}), SAVED_SEARCH_LOOKBACK_HOURS: "24" });

// the real saved_searches data-layer calls now succeed (13H-era tick failed at last_notified_at)
const r0 = await runSavedSearchNotificationJob({ env: {} });
rec("J0 default environment (no variables): job does nothing", r0.mode === "off" && r0.searchesConsidered === 0 && ledger().length === 0);
const rBad = await runSavedSearchNotificationJob({ env: { SAVED_SEARCH_JOB_MODE: "TRUE", SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" } });
rec("J0b invalid mode value behaves as off", rBad.mode === "off" && rBad.searchesConsidered === 0 && ledger().length === 0);

const a0 = audits('dry_run');
const r1 = await runSavedSearchNotificationJob({ env: ENV("dry_run", true), deps: { emit: doubleEmit } });
rec("J1 dry_run: plans the buyer's notification, emits nothing, writes no ledger row", r1.mode === "dry_run" && r1.notificationsPlanned === 1 && doubleCalls.length === 0 && ledger().length === 0, JSON.stringify(r1));
rec("J1b dry_run never enables external delivery even when requested", r1.externalDelivery === false);
rec("J1c the dry_run is audited (audit_logs 'Saved-search job run', details carry mode and counts)", audits('dry_run') === a0 + 1, `${a0} -> ${audits('dry_run')}`);

const r2 = await runSavedSearchNotificationJob({ env: ENV("enabled", false) });
const l2 = ledger();
rec("J2 enabled (in-app only): exactly one ledger row, for the opted-in buyer", r2.notificationsPlanned === 1 && l2.length === 1 && l2[0].u === U.a && l2[0].ch === "in_app", JSON.stringify({ r2: { p: r2.notificationsPlanned, d: r2.delivered, f: r2.failed, e: r2.errors }, l2 }));
rec("J2b only the publicly listed, recent, matching car was included (not pending/draft/hidden/sold/deleted/old)", JSON.stringify(l2[0]?.ids) === JSON.stringify([C.ok]), JSON.stringify(l2[0]?.ids));
rec("J2c notify=false search, banned recipient and the seller's own listing produced nothing", !l2.some((x) => [U.b, U.c, U.seller].includes(x.u)));
rec("J2d no provider was configured or called (external flag off)", r2.externalDelivery === false);

const r3 = await runSavedSearchNotificationJob({ env: ENV("enabled", false) });
rec("J3 re-running immediately is idempotent: nothing planned, no new ledger rows", r3.notificationsPlanned === 0 && ledger().length === 1 && r3.deduplicated >= 1, JSON.stringify(r3));

const C2 = car("ok2", "available");
const [p1, p2] = await Promise.all([runSavedSearchNotificationJob({ env: ENV("enabled", false) }), runSavedSearchNotificationJob({ env: ENV("enabled", false) })]);
const l4 = ledger();
rec("J4 two overlapping runs for one new car deliver it exactly once (lock and/or idempotency key)", l4.length === 2 && l4.filter((x) => (x.ids || []).includes(C2)).length === 1, JSON.stringify({ n: l4.length, locks: [p1.lockSkipped, p2.lockSkipped], errs: [p1.errors, p2.errors] }));
rec("J4b the second ledger row contains ONLY the new car (old one not repeated)", JSON.stringify(l4.find((x) => (x.ids || []).includes(C2))?.ids) === JSON.stringify([C2]));

const C3 = car("ok3", "available"); doubleCalls.length = 0;
const r5 = await runSavedSearchNotificationJob({ env: ENV("enabled", true), deps: { emit: async (p) => (p.channels[0] === "in_app" ? emitCommunication(p) : doubleEmit(p)) } });
rec("J5 external delivery enabled: every external channel is attempted separately through the double (never a real provider)", ["email", "sms", "whatsapp"].every((c) => doubleCalls.includes(`${U.a}:${c}`)), doubleCalls.join());
rec("J5b the buyer's disabled email consent (gateway-style refusal) is counted, and does not stop sms/whatsapp", r5.skippedPreference === 1 && r5.failed === 0, JSON.stringify(r5));
rec("J5c in-app ledger row recorded for the third car", ledger().some((x) => (x.ids || []).includes(C3)));

// real gateway with NO provider configured: external channels must be silently skipped (no delivery rows, no network)
const C4 = car("ok4", "available");
const before = Number(sql(`SELECT count(*) FROM communication_deliveries WHERE user_id='${U.a}' AND channel<>'in_app'`));
const r6 = await runSavedSearchNotificationJob({ env: ENV("enabled", true) });
const after = Number(sql(`SELECT count(*) FROM communication_deliveries WHERE user_id='${U.a}' AND channel<>'in_app'`));
rec("J6 REAL gateway, external flag on, no provider credentials: no external delivery row is created and nothing is sent", before === after && r6.delivered >= 1, JSON.stringify({ before, after, d: r6.delivered, s: r6.suppressed }));
rec("J6b the new car is still recorded in-app exactly once", ledger().filter((x) => (x.ids || []).includes(C4)).length === 1);

// hidden-by-policy car never notified
const hid = car("will-hide", "available", U.d); sql(`UPDATE cars SET status='hidden' WHERE id='${hid}'`);
await runSavedSearchNotificationJob({ env: ENV("enabled", false) });
rec("J7 a listing hidden before the run is never announced", !ledger().some((x) => (x.ids || []).includes(hid)));

// ---- K: retry-without-resend, recipient isolation, real consent rows (real gateway; no provider credentials exist in this environment)
U.e = user("e"); S.e = search(U.e, "e-second-buyer");
sql(`INSERT INTO communication_preferences(user_id,email_marketing,sms_marketing,whatsapp_marketing) VALUES('${U.a}',false,false,false),('${U.e}',true,true,true) ON CONFLICT (user_id) DO UPDATE SET email_marketing=EXCLUDED.email_marketing, sms_marketing=EXCLUDED.sms_marketing, whatsapp_marketing=EXCLUDED.whatsapp_marketing`);
const prefsBefore = sql(`SELECT string_agg(user_id::text||':'||email_marketing||sms_marketing||whatsapp_marketing, ',' ORDER BY user_id) FROM communication_preferences WHERE user_id IN ('${U.a}','${U.e}')`);
await runSavedSearchNotificationJob({ env: ENV("enabled", false) });                       // settle: E (new search) receives the backlog once, A is current
const C5 = car("retry", "available"); let boom = 0;
const rFail = await runSavedSearchNotificationJob({ env: ENV("enabled", false), deps: { emit: async (p) => { if (p.userId === U.a) { boom++; throw new Error("simulated delivery-layer failure"); } return emitCommunication(p); } } });
rec("K1 a failed in-app delivery is counted and recorded as failed; the buyer whose delivery worked is unaffected", rFail.failed >= 1 && boom >= 1 && ledger().filter((x) => x.u === U.a && (x.ids || []).includes(C5)).length === 0 && ledger().filter((x) => x.u === U.e && (x.ids || []).includes(C5)).length === 1, JSON.stringify({ f: rFail.failed, errs: rFail.errors }));
const rRetry = await runSavedSearchNotificationJob({ env: ENV("enabled", false) });
rec("K2 the retry delivers the missed notification exactly once and does NOT re-send the one already delivered to the other buyer", ledger().filter((x) => x.u === U.a && (x.ids || []).includes(C5)).length === 1 && ledger().filter((x) => x.u === U.e && (x.ids || []).includes(C5)).length === 1, JSON.stringify(rRetry));
const rAgain = await runSavedSearchNotificationJob({ env: ENV("enabled", false) });
rec("K3 a further run is a no-op (no duplicates after retry)", rAgain.notificationsPlanned === 0 && ledger().filter((x) => (x.ids || []).includes(C5)).length === 2, JSON.stringify(rAgain));
rec("K4 recipient isolation: every ledger row's user owns the saved search it names; no row names another buyer's search", ledger().every((x) => (x.ss === S.a && x.u === U.a) || (x.ss === S.e && x.u === U.e) || ![S.a, S.e].includes(x.ss)), JSON.stringify(ledger().map((x) => [x.u === U.a ? "A" : x.u === U.e ? "E" : "?", x.ss === S.a ? "sA" : x.ss === S.e ? "sE" : "?"])));
const ext0 = Number(sql(`SELECT count(*) FROM communication_deliveries WHERE user_id IN ('${U.a}','${U.e}') AND channel<>'in_app'`));
const C6 = car("realprefs", "available");
const rReal = await runSavedSearchNotificationJob({ env: ENV("enabled", true) });
const ext1 = Number(sql(`SELECT count(*) FROM communication_deliveries WHERE user_id IN ('${U.a}','${U.e}') AND channel<>'in_app' AND status IN ('sent','delivered','queued')`));
rec("K5 REAL gateway + REAL consent rows (A opted out, E opted in) + external flag on: no provider exists, so nothing is sent or queued for either buyer", ext1 === 0 && rReal.delivered >= 2, JSON.stringify({ ext0, ext1, d: rReal.delivered, s: rReal.suppressed, sp: rReal.skippedPreference, f: rReal.failed }));
rec("K6 the job never writes consent rows (preferences unchanged by a run)", sql(`SELECT string_agg(user_id::text||':'||email_marketing||sms_marketing||whatsapp_marketing, ',' ORDER BY user_id) FROM communication_preferences WHERE user_id IN ('${U.a}','${U.e}')`) === prefsBefore);
rec("K7 both buyers still hold their in-app notification for the newest car, each exactly once", ["a", "e"].every((w) => ledger().filter((x) => x.u === U[w] && (x.ids || []).includes(C6)).length === 1));

// cleanup
try {
  sql(`DELETE FROM communication_deliveries WHERE metadata->>'savedSearchId' IN ('${Object.values(S).join("','")}')`);
  sql(`DELETE FROM audit_logs WHERE action='Saved-search job run' AND created_at >= '${STARTED}'`);
  sql(`DELETE FROM saved_searches WHERE name LIKE '${T} %'`);
  sql(`DELETE FROM cars WHERE brand='${T}'`);
  sql(`DELETE FROM communication_preferences WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${T}.%')`);
  sql(`DELETE FROM users WHERE email LIKE '${T}.%'`);
} catch (e) { console.log("cleanup note:", String(e.message).slice(0, 160)); }
const summary = `phase13i_saved_search_job_db: pass=${pass} fail=${fail}`;
console.log(summary);
writeFileSync(new URL("./phase13i_saved_search_job_db.result.txt", import.meta.url), [...lines, summary, ""].join("\n"));
process.exit(fail ? 1 : 0);
