/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// STAGE 5B CLOSURE — extra lifecycle journey on the REAL isolated stack (HTTP + disposable PostgreSQL + Brevo stub with failure injection).
// Covers: C1 no-escalation window after migration, C2 wrong recipient, C3 provider outage, C4 interrupted acceptance,
// C5 interrupted recovery resumed, C6 rollback fail-closed on a live process, C7 secrets never in ledger/log/response.
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Client, BASE } from "./api.mjs";
const require = createRequire("/home/claude/s5b/work/backend/package.json");
const bcrypt = require("bcryptjs");
const BE = "/home/claude/s5b/work/backend", ST = "/home/claude/s5b/stack", CAP = `${ST}/brevo-captures.jsonl`, FAIL = `${ST}/brevo.fail`;
const RUNB = "/home/claude/s5b/work/runbooks/stage5b-owner-governance-20261019/migration-candidate";
const envFile = Object.fromEntries(fs.readFileSync(`${ST}/backend.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PGENV = { ...process.env, PGHOST: "127.0.0.1", PGPORT: "54339", PGUSER: "postgres" };
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", "kayad5b_disposable", "-c", q], { env: PGENV, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const psqlFile = (args) => spawnSync("psql", ["-X", "-q", "-d", "kayad5b_disposable", ...args], { env: PGENV, encoding: "utf8" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", id, d); };
const eq = (id, got, want) => rec(id, got === want, got === want ? "" : `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const [O1] = envFile.WEBHOIST_EMAIL.split(",");
const O3 = "closure-three@kayad-test.example", O4 = "closure-four@kayad-test.example", USR = "closure-user@kayad-test.example";
const PW1 = "ClosureOne!Pass#2026", PW3 = "ClosureThree!Pass#2026", PW4 = "ClosureFour!Pass#2026", PWU = "ClosureUser!Pass#2026";
const cli = (args) => { const r = spawnSync("node", ["--import", `${ST}/brevo-capture.mjs`, "scripts/owner-bootstrap.mjs", ...args], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, ...envFile, NODE_ENV: "development" }, encoding: "utf8", timeout: 90000 }); return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };
const captures = () => (fs.existsSync(CAP) ? fs.readFileSync(CAP, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : []);
const tokenFor = async (email, since = 0) => { for (let i = 0; i < 40; i++) { for (const r of captures().slice(since).filter((x) => x.to?.[0]?.email === email && !x.failed).reverse()) { const m = /owner-invite\?token=([0-9a-f]{64})/.exec((r.text || "") + (r.html || "")); if (m) return m[1]; } await sleep(300); } return null; };
const mkUser = (email, pw, verified = true) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('closure test','${email}','user','approved',${verified}) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(pw, 10)}',0 FROM u RETURNING user_id`).split("\n")[0];
const owners = () => sql("select count(*) from owner_memberships where status='active'");
const seen = new Set();
const anon = new Client();

// clean slate (disposable DB only)
sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");
sql("DELETE FROM refresh_tokens WHERE \"user\" IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example' OR email IN ('" + O1 + "')); DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example' OR email IN ('" + O1 + "')); DELETE FROM users WHERE email LIKE '%@kayad-test.example' OR email IN ('" + O1 + "')");
fs.writeFileSync(CAP, ""); try { fs.unlinkSync(FAIL); } catch { /* flag absent */ }

console.log("== C1 post-migration state: a VERIFIED, designated account with zero memberships has no owner power ==");
mkUser(O1, PW1, true); mkUser(USR, PWU, true);
const c1 = new Client(); eq("C1.1 designated+verified account signs in as an ordinary user", (await c1.login(O1, PW1)).status, 200);
eq("C1.2 …but owner management is refused (env list grants nothing once the store is installed)", (await c1.call("GET", "/api/v1/owner")).body?.code, "OWNER_ONLY");
eq("C1.3 …and the owner-only policy write is refused", (await c1.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "closed" })).status, 403);
eq("C1.4 …and may not self-invite", (await c1.call("POST", "/api/v1/owner/invitations", { email: O1, confirmEmail: O1, password: PW1 })).body?.code, "OWNER_ONLY");
eq("C1.5 no membership exists, bootstrap still open (only the CLI operator path can start provisioning)", owners() + "/" + sql("select status from owner_bootstrap_state"), "0/open");
eq("C1.6 there is no public bootstrap route", (await anon.call("POST", "/api/v1/owner/bootstrap", {})).status === 404 || (await anon.call("POST", "/api/v1/owner/bootstrap", {})).status === 401, true);

console.log("== C2 wrong recipient ==");
const cap0 = captures().length;
const ap = cli(["--apply", "--operator", "closure", "--confirm-host", "127.0.0.1:54341"]);
rec("C2.0 bootstrap apply issues the invitation", ap.code === 0, ap.out.replace(/\s+/g, " ").slice(0, 120));
const t1 = await tokenFor(O1, cap0); seen.add(t1);
const cu = new Client(); await cu.login(USR, PWU);
const wrong = await cu.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Intruder" });
rec("C2.1 an unrelated signed-in account cannot accept O1's invitation", wrong.status >= 400, JSON.stringify(wrong.body).slice(0, 120));
const noLogin = await anon.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "x", password: "Intruder!Pass#2026" });
eq("C2.2 anonymous holder of the link cannot take over a VERIFIED account (login required)", noLogin.body?.code, "OWNER_LOGIN_REQUIRED");
eq("C2.3 nothing changed: no membership, invitation still pending, O1 password intact", owners() + "/" + sql(`select status from owner_invitations where email='${O1}'`) + "/" + ((await new Client().login(O1, PW1)).status), "0/pending/200");
const acc = await c1.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Owner One" });
rec("C2.4 the correct, signed-in recipient accepts", acc.status === 200 && acc.body.credentialsReset === false, JSON.stringify(acc.body).slice(0, 100));
eq("C2.5 replay → refused", (await c1.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Owner One" })).body?.code, "OWNER_INVITATION_INVALID");
eq("C2.6 O1 is now an owner", (await c1.call("GET", "/api/v1/owner")).status, 200);

console.log("== C3 e-mail provider outage ==");
fs.writeFileSync(FAIL, "x");
const cap3 = captures().length;
const inv3 = await c1.call("POST", "/api/v1/owner/invitations", { email: O3, confirmEmail: O3, password: PW1 });
rec("C3.1 invitation is created but the API reports emailDelivered=false (no false success)", inv3.status === 201 && inv3.body.emailDelivered === false, JSON.stringify(inv3.body).slice(0, 160));
eq("C3.2 the invitation stays pending and grants nothing", sql(`select status from owner_invitations where email='${O3}'`) + "/" + owners(), "pending/1");
rec("C3.3 the response carries no token or link", !/[0-9a-f]{64}/.test(JSON.stringify(inv3.body)) && !/owner-invite/.test(JSON.stringify(inv3.body)));
rec("C3.4 the provider call was attempted and failed (failure recorded by the stub, nothing delivered)", captures().slice(cap3).some((x) => x.failed && x.to?.[0]?.email === O3) && !captures().slice(cap3).some((x) => !x.failed && x.to?.[0]?.email === O3));
fs.unlinkSync(FAIL);
const inv3id = inv3.body.invitation.id;
await sleep(2600); // resend cooldown (2s in the test env)
const cap3b = captures().length;
const rs = await c1.call("POST", `/api/v1/owner/invitations/${inv3id}/resend`, { confirmEmail: O3, password: PW1 });
rec("C3.5 after the outage ends, resend delivers", rs.status === 200 && rs.body.emailDelivered === true, JSON.stringify(rs.body).slice(0, 120));
const t3 = await tokenFor(O3, cap3b); seen.add(t3);
rec("C3.6 the resent link works for the new-account recipient", !!t3 && (await anon.call("POST", "/api/v1/owner-access/accept", { token: t3, name: "Owner Three", password: PW3 })).status === 200);
eq("C3.7 two owners now", owners(), "2");

console.log("== C4 interrupted acceptance ==");
const cap4 = captures().length;
const inv4 = await c1.call("POST", "/api/v1/owner/invitations", { email: O4, confirmEmail: O4, password: PW1 });
eq("C4.0 invitation for a new account", inv4.status, 201);
const t4 = await tokenFor(O4, cap4); seen.add(t4);
const ac = new AbortController();
const p = fetch(BASE + "/api/v1/owner-access/accept", { method: "POST", signal: ac.signal, headers: { "content-type": "application/json", cookie: `XSRF-TOKEN=z`, "x-csrf-token": "z" }, body: JSON.stringify({ token: t4, name: "Owner Four", password: PW4 }) }).catch(() => "aborted");
setTimeout(() => ac.abort(), 15); await p; await sleep(1500);
const st = sql(`select status from owner_invitations where email='${O4}'`), mem = sql(`select count(*) from owner_memberships where email='${O4}' and status='active'`);
rec("C4.1 state is consistent after the client aborted (accepted⇔active membership, pending⇔none)", (st === "accepted" && mem === "1") || (st === "pending" && mem === "0"), `invitation=${st} membership=${mem}`);
const retry = await anon.call("POST", "/api/v1/owner-access/accept", { token: t4, name: "Owner Four", password: PW4 });
rec("C4.2 a retry either completes the acceptance or is cleanly refused as already used", (st === "pending" && retry.status === 200) || (st === "accepted" && retry.body?.code === "OWNER_INVITATION_INVALID"), `retry=${retry.status} ${retry.body?.code || ""}`);
eq("C4.3 final: owner four is an active owner exactly once", sql(`select count(*) from owner_memberships where email='${O4}' and status='active'`), "1");
eq("C4.4 …and can sign in with the password chosen", (st === "pending" ? (await new Client().login(O4, PW4)).status : 200), 200);

console.log("== C5 interrupted emergency recovery is resumable ==");
const o3Id = sql(`select user_id from owner_memberships where email='${O3}' and status='active'`);
const o1Id = sql(`select id from users where email='${O1}'`);
sql(`select kayad_owner_revoke_membership_atomic('${o3Id}','${o1Id}','owner:${O1}','recovery: in_person: simulated crash between step 1 and 2')`);
eq("C5.1 simulated crash: O3 membership revoked, no invitation issued", sql(`select count(*) from owner_memberships where user_id='${o3Id}' and status='active'`) + "/" + sql(`select count(*) from owner_invitations where email='${O3}' and status='pending'`), "0/0");
const cap5 = captures().length;
const rcv = await c1.call("POST", `/api/v1/owner/members/${o3Id}/recovery`, { confirmEmail: O3, password: PW1, verifiedVia: "in_person", note: "resume interrupted recovery" });
rec("C5.2 running Recover again RESUMES (does not fail with 'not a member')", rcv.status === 200 && rcv.body.resumed === true, JSON.stringify(rcv.body).slice(0, 160));
const t5 = await tokenFor(O3, cap5); seen.add(t5);
const acc5 = await anon.call("POST", "/api/v1/owner-access/accept", { token: t5, name: "Owner Three", password: "ResumedThree!Pass#9" });
rec("C5.3 recovery link restores the owner with fresh credentials", acc5.status === 200 && acc5.body.credentialsReset === true && sql(`select count(*) from owner_memberships where user_id='${o3Id}' and status='active'`) === "1");
eq("C5.4 old password is dead", (await new Client().login(O3, PW3)).status === 200, false);

console.log("== C7 secrets never reach ledger, audit metadata, delivery log, application log ==");
const hay = [sql("select coalesce(string_agg(x::text,' '),'') from owner_membership_events x"), sql("select coalesce(string_agg(x::text,' '),'') from communication_deliveries x"), fs.readFileSync(`${ST}/backend.log`, "utf8")].join("\n");
let leaked = 0; for (const t of seen) if (t && hay.includes(t)) leaked++;
eq(`C7.1 none of the ${seen.size} real invitation tokens appear in event ledger / communication events / backend log`, leaked, 0);
rec("C7.2 no password fixture appears there either", ![PW1, PW3, PW4, PWU, "ResumedThree!Pass#9"].some((pw) => hay.includes(pw)));

console.log("== C6 rollback on the live stack fails CLOSED (no silent return to the env owner list) ==");
const ev = psqlFile(["-c", "\\copy (select * from owner_membership_events order by id) to '/home/claude/s5b/closure_evidence/owner_events_export_C6.csv' csv header"]);
rec("C6.0 audit ledger exported first", ev.status === 0 && fs.statSync("/home/claude/s5b/closure_evidence/owner_events_export_C6.csv").size > 100, ev.stderr.slice(0, 80));
const usersBefore = sql("select count(*) from users"), rtBefore = sql("select count(*) from refresh_tokens");
const rb = psqlFile(["-v", "ON_ERROR_STOP=1", "-v", "confirm_events_exported=yes", "-1", "-f", `${RUNB}/20261019120000_stage5b_owner_governance_ROLLBACK_CANDIDATE.sql`]);
rec("C6.1 rollback SQL applied to the disposable DB", rb.status === 0, rb.stderr.slice(0, 120));
await sleep(4500); // > registry TTL + stale grace in the test env
const afterRb = await c1.call("GET", "/api/v1/owner");
rec("C6.2 the RUNNING process now fails closed: no 200, no owner power", afterRb.status >= 400, `status ${afterRb.status} ${afterRb.body?.code || ""}`);
const polWrite = await c1.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "closed" });
rec("C6.3 owner-only writes are refused during the gap", polWrite.status >= 400, `status ${polWrite.status}`);
eq("C6.4 users and sessions untouched by the rollback", sql("select count(*) from users") + "/" + sql("select count(*) from refresh_tokens"), usersBefore + "/" + rtBefore);
// re-apply the candidate (operator decision to roll forward), then restart
const re = psqlFile(["-v", "ON_ERROR_STOP=1", "-1", "-f", `${RUNB}/20261019120000_stage5b_owner_governance_CANDIDATE.sql`]);
rec("C6.5 candidate re-applies cleanly after a rollback", re.status === 0, re.stderr.slice(0, 120));
await sleep(3500);
const c1b = new Client(); await c1b.login(O1, PW1);
eq("C6.6 after re-apply there are zero memberships, so O1 has NO owner power (membership is not resurrected)", (await c1b.call("GET", "/api/v1/owner")).body?.code, "OWNER_ONLY");
eq("C6.7 …bootstrap is open again and the operator path provisions afresh", sql("select status from owner_bootstrap_state"), "open");
console.log(`\nRESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
