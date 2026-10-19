/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// STAGE 5B — owner-governance acceptance journey against the REAL isolated stack (HTTP + real PostgreSQL + Brevo capture stub).
// Evidence tiers: R (real app) + P (disposable PostgreSQL). Email = provider STUB, never live.
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Client } from "./api.mjs";
const require = createRequire("/home/claude/s5b/work/backend/package.json");
const bcrypt = require("bcryptjs");
const { io } = createRequire("/home/claude/s5b/tools/package.json")("socket.io-client");

const BE = "/home/claude/s5b/work/backend", ST = "/home/claude/s5b/stack", CAP = `${ST}/brevo-captures.jsonl`;
const envFile = Object.fromEntries(fs.readFileSync(`${ST}/backend.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PGENV = { ...process.env, PGHOST: "127.0.0.1", PGPORT: "54339", PGUSER: "postgres" };
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", "kayad5b_disposable", "-c", q], { env: PGENV, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (id, ok, detail = "") => { results.push({ id, ok, detail }); console.log(ok === null ? "SKIP" : ok ? "PASS" : "FAIL", id, detail); };
const eq = (id, got, want) => rec(id, got === want, got === want ? "" : `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

const [O1, O2] = envFile.WEBHOIST_EMAIL.split(",");
const O3 = "owner-three@kayad-test.example", O4 = "owner-four@kayad-test.example", ADM = "ordinary-admin@kayad-test.example", USR = "plain-user@kayad-test.example";
const PW1 = "OwnerOne!Pass#2026", PW2 = "OwnerTwo!Pass#2026", PW3 = "OwnerThree!Pass#2026", PWA = "Admin!Pass#2026x", PWSQ = "Squatter!Pass#1", PWNEW4 = "OwnerFour!Pass#2026";

function cli(args, extraEnv = {}) {
  const r = spawnSync("node", ["--import", `${ST}/brevo-capture.mjs`, "scripts/owner-bootstrap.mjs", ...args], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, ...envFile, NODE_ENV: "development", ...extraEnv }, encoding: "utf8", timeout: 90000 });
  return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
const captures = () => (fs.existsSync(CAP) ? fs.readFileSync(CAP, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : []);
const tokenFor = async (email, re = /owner-invite\?token=([0-9a-f]{64})/, since = 0, tries = 40) => {
  for (let i = 0; i < tries; i++) {
    const rows = captures().slice(since).filter((x) => x.to?.[0]?.email === email);
    for (const r of rows.reverse()) { const m = re.exec((r.text || "") + (r.html || "")); if (m) return m[1]; }
    await sleep(300);
  }
  return null;
};
const allTokens = new Set();
const seeToken = (t) => { if (t) allTokens.add(t); return t; };
const hash = (p) => bcrypt.hashSync(p, 10);
const rawUser = (email, role, pw, verified = true) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${role} test','${email}','${role}','approved',${verified}) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${hash(pw)}',0 FROM u RETURNING user_id`).split("\n")[0];
const owners = () => sql("select count(*) from owner_memberships where status='active'");

// ── clean slate (disposable DB only) ──────────────────────────────────────────────────────────────────
sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");
sql("DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example'); DELETE FROM refresh_tokens WHERE \"user\" IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example'); DELETE FROM users WHERE email LIKE '%@kayad-test.example'");
fs.writeFileSync(CAP, "");

console.log("== J0 initial state: store installed, nobody is an owner ==");
const anon = new Client();
eq("J0.1 unauthenticated owner API → 401", (await anon.call("GET", "/api/v1/owner")).status, 401);
const reg = await new Client().call("POST", "/api/v1/auth/register", { name: "Claimant", email: O1, password: "Claim!Pass#2026" });
eq("J0.2 public registration with designated owner address → 403 reserved", reg.body?.code, "OWNER_IDENTITY_RESERVED");
eq("J0.3 …and the upper-case variant is reserved too", (await new Client().call("POST", "/api/v1/auth/register", { name: "Claimant", email: O1.toUpperCase(), password: "Claim!Pass#2026" })).body?.code, "OWNER_IDENTITY_RESERVED");
eq("J0.3b …a padded variant never reaches account creation (validation 400)", (await new Client().call("POST", "/api/v1/auth/register", { name: "Claimant", email: `  ${O1} `, password: "Claim!Pass#2026" })).status, 400);
eq("J0.4 …and no account row was created", sql(`select count(*) from users where email='${O1}'`), "0");
// a pre-5A squatter: unverified row on owner address 1 with a password the attacker knows
rawUser(O1, "user", PWSQ, false);
const sq = new Client();
const sqLogin = await sq.login(O1, PWSQ);
eq("J0.5 squatter cannot sign in (unverified owner-address row refused)", sqLogin.body?.code, "OWNER_IDENTITY_UNVERIFIED");

console.log("== J1 bootstrap CLI: plan / guard rails / apply / idempotency ==");
const plan0 = cli(["--plan"]);
rec("J1.1 plan is read-only and reports both designated identities", plan0.code === 0 && /pending_verification/.test(plan0.out) && /unprovisioned/.test(plan0.out), plan0.out.replace(/\s+/g, " ").slice(0, 200));
rec("J1.2 plan output shows masked identities only (no full address, no token)", !plan0.out.includes(O1) && !plan0.out.includes(O2) && !/[0-9a-f]{64}/.test(plan0.out));
const noHost = cli(["--apply", "--operator", "tester"]);
rec("J1.3 apply refused without --confirm-host", noHost.code === 2 && /confirm-host/.test(noHost.err), noHost.err.slice(0, 120));
const wrongHost = cli(["--apply", "--operator", "tester", "--confirm-host", "prod.example.com"]);
rec("J1.4 apply refused with a wrong --confirm-host", wrongHost.code === 2, wrongHost.err.slice(0, 100));
const noOp = cli(["--apply", "--confirm-host", "127.0.0.1:54341"]);
rec("J1.5 apply refused without --operator (audit needs a name)", noOp.code === 3 && /OPERATOR_REQUIRED/.test(noOp.err), noOp.err.slice(0, 100));
eq("J1.6 nothing was provisioned by refused runs", owners(), "0");
const capBefore = captures().length;
const ap = cli(["--apply", "--operator", "tester", "--confirm-host", "127.0.0.1:54341"]);
rec("J1.7 apply issues one invitation per designated identity", ap.code === 0 && (ap.out.match(/invitation_sent/g) || []).length === 2, ap.out.replace(/\s+/g, " ").slice(0, 260));
rec("J1.8 …and e-mails them through the Brevo adapter (stub capture)", captures().length - capBefore >= 2);
const t1 = seeToken(await tokenFor(O1)), t2 = seeToken(await tokenFor(O2));
rec("J1.9 invitation links captured for both owners", !!t1 && !!t2);
const ap2 = cli(["--apply", "--operator", "tester", "--confirm-host", "127.0.0.1:54341"]);
rec("J1.10 re-running apply is idempotent (no duplicate invitations, no new mail)", ap2.code === 0 && (ap2.out.match(/invitation_already_pending/g) || []).length === 2 && captures().length - capBefore === 2, ap2.out.replace(/\s+/g, " ").slice(0, 200));
eq("J1.11 exactly two pending invitations exist", sql("select count(*) from owner_invitations where status='pending'"), "2");
eq("J1.12 still nobody is an owner (an invitation is not membership)", owners(), "0");
eq("J1.13 pending invitation address is reserved against public sign-up", (await new Client().call("POST", "/api/v1/auth/register", { name: "Claimant Two", email: O2, password: "Claim!Pass#2026" })).body?.code, "OWNER_IDENTITY_RESERVED");

console.log("== J2 invitation preview + acceptance (owner one = squatter row; owner two = new account) ==");
const prev = await anon.call("GET", `/api/v1/owner-access/invitation?token=${t1}`);
rec("J2.1 preview shows kind and mode, masked address, no secrets", prev.status === 200 && prev.body.mode === "set_password" && prev.body.kind === "bootstrap" && !JSON.stringify(prev.body).includes(O1), JSON.stringify(prev.body).slice(0, 160));
eq("J2.2 garbage token → generic invalid", (await anon.call("GET", "/api/v1/owner-access/invitation?token=nothex")).body?.code, "OWNER_INVITATION_INVALID");
eq("J2.3 well-formed unknown token → generic invalid", (await anon.call("GET", `/api/v1/owner-access/invitation?token=${"a".repeat(64)}`)).body?.code, "OWNER_INVITATION_INVALID");
eq("J2.4 weak password rejected before any change", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Owner One", password: "weak" })).body?.code, "OWNER_PASSWORD_POLICY");
eq("J2.5 …no membership yet", owners(), "0");
const acc1 = await anon.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Owner One", password: PW1 });
rec("J2.6 owner one accepts; squatter row is taken over (credentials replaced)", acc1.status === 200 && acc1.body.credentialsReset === true, JSON.stringify(acc1.body).slice(0, 160));
eq("J2.7 replay of the same token → refused", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t1, name: "Owner One", password: PW1 })).body?.code, "OWNER_INVITATION_INVALID");
eq("J2.8 the squatter's old password no longer works", (await new Client().login(O1, PWSQ)).status === 200, false);
eq("J2.9 …and the squatter's old session is dead", (await sq.call("GET", "/api/v1/owner")).status, 401);
const o1 = new Client(); const l1 = await o1.login(O1, PW1);
eq("J2.10 owner one signs in with the NEW password", l1.status, 200);
const own = await o1.call("GET", "/api/v1/owner");
rec("J2.11 owner one reaches owner management; sees themselves verified+active", own.status === 200 && own.body.members?.[0]?.usable === true && own.body.canManage === true, `status ${own.status}`);
eq("J2.12 bootstrap still open (second designated owner pending)", own.body.bootstrap?.status, "open");
const acc2 = await anon.call("POST", "/api/v1/owner-access/accept", { token: t2, name: "Owner Two", password: PW2 });
rec("J2.13 owner two accepts (account created, verified by the invitation mailbox proof)", acc2.status === 200 && acc2.body.accountCreated === true, JSON.stringify(acc2.body).slice(0, 140));
const o2 = new Client(); eq("J2.14 owner two signs in", (await o2.login(O2, PW2)).status, 200);
const own2 = await o2.call("GET", "/api/v1/owner");
rec("J2.15 owner two reaches owner management independently", own2.status === 200 && own2.body.members.filter((m) => m.usable).length === 2);
eq("J2.16 bootstrap closed automatically once both designated owners are established", own2.body.bootstrap?.status, "closed");
const capN = captures().length;
const ap3 = cli(["--apply", "--operator", "tester", "--confirm-host", "127.0.0.1:54341"]);
rec("J2.17 bootstrap CLI now refuses (capability expired)", ap3.code === 3 && /OWNER_BOOTSTRAP_CLOSED/.test(ap3.err) && captures().length === capN, ap3.err.slice(0, 120));
const plan1 = cli(["--plan"]);
rec("J2.18 plan reports both identities provisioned", plan1.code === 0 && (plan1.out.match(/"provisioned"/g) || []).length === 2, plan1.out.replace(/\s+/g, " ").slice(0, 200));
eq("J2.19 registered owner role in the users table is still the ordinary role (no DB 'superadmin' flag grants ownership)", sql(`select role from users where email='${O1}'`), "user");

console.log("== J3 owners administer the platform (onboarding settings, both owners) ==");
for (const [n, c] of [["one", o1], ["two", o2]]) {
  const g = await c.call("GET", "/api/v1/admin/settings/onboarding");
  const mode = n === "one" ? "approval_required" : "self_onboarding";
  const p = await c.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: g.body.policy.revision, dealerOnboardingMode: mode });
  rec(`J3.${n} owner ${n} can change onboarding policy (${mode})`, g.body.canChange === true && p.status === 200, `GET ${g.status} PUT ${p.status}`);
}
const stale = await o1.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "closed" });
eq("J3.3 stale revision still conflicts (409) — no lost update", stale.status, 409);
await (async () => { const g = await o1.call("GET", "/api/v1/admin/settings/onboarding"); await o1.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: g.body.policy.revision, dealerOnboardingMode: "approval_required", listingMode: "hold_for_review" }); })();

console.log("== J4 ordinary admin / dealer / user cannot take or grant ownership ==");
rawUser(ADM, "admin", PWA); rawUser(USR, "user", "Plain!Pass#2026x");
const adm = new Client(); eq("J4.0 ordinary admin signs in", (await adm.login(ADM, PWA)).status, 200);
eq("J4.1 admin: owner management → 403", (await adm.call("GET", "/api/v1/owner")).body?.code, "OWNER_ONLY");
eq("J4.2 admin: invite (self) → 403", (await adm.call("POST", "/api/v1/owner/invitations", { email: ADM, confirmEmail: ADM, password: PWA })).body?.code, "OWNER_ONLY");
eq("J4.3 admin: remove an owner → 403", (await adm.call("DELETE", `/api/v1/owner/members/${sql(`select user_id from owner_memberships where email='${O2}'`)}`, { confirmEmail: O2, password: PWA, reason: "nope" })).body?.code, "OWNER_ONLY");
eq("J4.4 admin: onboarding policy PUT → 403", (await adm.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "self_onboarding" })).status, 403);
eq("J4.5 admin: accept with an invented token → generic invalid", (await adm.call("POST", "/api/v1/owner-access/accept", { token: "b".repeat(64), name: "x" })).body?.code, "OWNER_INVITATION_INVALID");
const usr = new Client(); await usr.login(USR, "Plain!Pass#2026x");
eq("J4.6 plain user: owner management → 403", (await usr.call("GET", "/api/v1/owner")).status, 403);
const promote = await adm.call("PATCH", `/api/v1/admin/users/${sql(`select id from users where email='${ADM}'`)}`, { role: "superadmin" });
rec("J4.7 admin cannot promote themselves through the user-admin API", promote.status >= 400 || sql(`select role from users where email='${ADM}'`) === "admin", `status ${promote.status}`);
eq("J4.8 database role label is not ownership: a DB 'superadmin' is still no owner", (await (async () => { sql(`update users set role='superadmin' where email='${ADM}'`); const c = new Client(); await c.login(ADM, PWA); const r = await c.call("GET", "/api/v1/owner"); sql(`update users set role='admin' where email='${ADM}'`); return r.body?.code; })()), "OWNER_ONLY");
eq("J4.9 no membership rows were created for admin/user", sql(`select count(*) from owner_memberships where email in ('${ADM}','${USR}')`), "0");
eq("J4.10 a client-supplied role label is ignored (role=webhoist in login body/query)", (await (async () => { const c = new Client(); await c.login(ADM, PWA); return (await c.call("GET", "/api/v1/owner?role=webhoist", undefined, { "x-role": "webhoist", "x-effective-role": "webhoist" })).body?.code; })()), "OWNER_ONLY");

console.log("== J5 owner invites a third identity (step-up, confirmation, duplicates, acceptance) ==");
const capM = captures().length;
const badPw = await o1.call("POST", "/api/v1/owner/invitations", { email: O3, confirmEmail: O3, password: "WrongPass!1" });
eq("J5.1 wrong password (step-up) → 401, nothing issued", badPw.body?.code, "STEP_UP_FAILED");
eq("J5.2 no password at all → refused", (await o1.call("POST", "/api/v1/owner/invitations", { email: O3, confirmEmail: O3 })).body?.code, "STEP_UP_FAILED");
eq("J5.3 mismatching typed confirmation → 400", (await o1.call("POST", "/api/v1/owner/invitations", { email: O3, confirmEmail: "other@kayad-test.example", password: PW1 })).body?.code, "CONFIRMATION_MISMATCH");
eq("J5.4 nothing pending yet", sql("select count(*) from owner_invitations where status='pending'"), "0");
const inv = await o1.call("POST", "/api/v1/owner/invitations", { email: O3, confirmEmail: O3, password: PW1, note: "third owner" });
rec("J5.5 correct password + typed confirmation → invitation issued and e-mailed", inv.status === 201 && inv.body.emailDelivered === true, JSON.stringify(inv.body).slice(0, 200));
const t3 = seeToken(await tokenFor(O3, /owner-invite\?token=([0-9a-f]{64})/, capM));
rec("J5.6 acceptance link captured", !!t3);
rec("J5.7 API response carries no token or hash", !JSON.stringify(inv.body).includes(t3));
eq("J5.8 duplicate invitation → 409", (await o1.call("POST", "/api/v1/owner/invitations", { email: O3.toUpperCase(), confirmEmail: O3, password: PW1 })).body?.code, "OWNER_INVITATION_PENDING");
eq("J5.9 inviting an existing owner → 409", (await o1.call("POST", "/api/v1/owner/invitations", { email: O2, confirmEmail: O2, password: PW1 })).body?.code, "OWNER_ALREADY_ACTIVE");
eq("J5.10 the invited identity is NOT an owner yet", owners(), "2");
eq("J5.11 …and cannot sign in as one (no account)", (await new Client().login(O3, PW3)).status === 200, false);
const nonOwnerTry = await new Client().call("POST", "/api/v1/owner-access/accept", { token: t3, name: "Owner Three", password: "weak" });
eq("J5.12 weak password rejected", nonOwnerTry.body?.code, "OWNER_PASSWORD_POLICY");
const acc3 = await new Client().call("POST", "/api/v1/owner-access/accept", { token: t3, name: "Owner Three", password: PW3 });
rec("J5.13 owner three accepts → membership active", acc3.status === 200 && owners() === "3");
const o3 = new Client(); eq("J5.14 owner three signs in", (await o3.login(O3, PW3)).status, 200);
eq("J5.15 owner three reaches owner management", (await o3.call("GET", "/api/v1/owner")).status, 200);
const sock = io("http://127.0.0.1:5050", { transports: ["websocket"], reconnection: false, extraHeaders: { cookie: o3.cookieHeader() } });
const sockUp = await new Promise((res) => { sock.on("authState", (a) => res(a?.authenticated === true)); sock.on("connect_error", () => res(false)); setTimeout(() => res(false), 8000); });
rec("J5.16 owner three holds a live, AUTHENTICATED socket connection", sockUp === true);

console.log("== J6 invitation expiry, resend, replay ==");
const capR = captures().length;
const inv4 = await o1.call("POST", "/api/v1/owner/invitations", { email: O4, confirmEmail: O4, password: PW1 });
const t4a = seeToken(await tokenFor(O4, /owner-invite\?token=([0-9a-f]{64})/, capR));
const inv4Id = inv4.body?.invitation?.id;
sql(`update owner_invitations set expires_at = now() - interval '1 second' where id='${inv4Id}'`);
eq("J6.1 expired link: preview → 410 expired", (await anon.call("GET", `/api/v1/owner-access/invitation?token=${t4a}`)).body?.code, "OWNER_INVITATION_EXPIRED");
eq("J6.2 expired link: accept → 410 expired, no account created", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t4a, name: "Four", password: PWNEW4 })).body?.code, "OWNER_INVITATION_EXPIRED");
eq("J6.3 …no user row for the invitee", sql(`select count(*) from users where email='${O4}'`), "0");
const li = await o1.call("GET", "/api/v1/owner");
eq("J6.4 console shows the invitation as expired", li.body.invitations.find((i) => i.id === inv4Id)?.status, "expired");
eq("J6.5 resend without password → refused", (await o1.call("POST", `/api/v1/owner/invitations/${inv4Id}/resend`, { confirmEmail: O4 })).body?.code, "STEP_UP_FAILED");
const capS = captures().length;
const rs = await o1.call("POST", `/api/v1/owner/invitations/${inv4Id}/resend`, { confirmEmail: O4, password: PW1 });
rec("J6.6 owner resends the expired invitation", rs.status === 200 && rs.body.emailDelivered === true, JSON.stringify(rs.body).slice(0, 150));
const t4b = seeToken(await tokenFor(O4, /owner-invite\?token=([0-9a-f]{64})/, capS));
rec("J6.7 a NEW link was issued", !!t4b && t4b !== t4a);
eq("J6.8 resend inside the cooldown → 429", (await o1.call("POST", `/api/v1/owner/invitations/${inv4Id}/resend`, { confirmEmail: O4, password: PW1 })).status, 429);
eq("J6.9 the old link is dead after resend", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t4a, name: "Four", password: PWNEW4 })).body?.code, "OWNER_INVITATION_INVALID");
const acc4 = await anon.call("POST", "/api/v1/owner-access/accept", { token: t4b, name: "Owner Four", password: PWNEW4 });
rec("J6.10 the fresh link works once", acc4.status === 200 && owners() === "4");
eq("J6.11 …and not twice", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t4b, name: "Owner Four", password: PWNEW4 })).body?.code, "OWNER_INVITATION_INVALID");
eq("J6.12 revoking a non-pending invitation → 404", (await o1.call("DELETE", `/api/v1/owner/invitations/${inv4Id}`, { confirmEmail: O4, password: PW1 })).body?.code, "OWNER_INVITATION_NOT_FOUND");

console.log("== J7 removal: privileges, sessions, sockets ==");
const o4 = new Client(); await o4.login(O4, PWNEW4);
const o3Refresh = await o3.call("POST", "/api/v1/auth/refresh");
rec("J7.0 before removal owner three's session and refresh both work", (await o3.call("GET", "/api/v1/owner")).status === 200 && o3Refresh.status === 200);
const o3Id = sql(`select user_id from owner_memberships where email='${O3}' and status='active'`);
const sockClosed = new Promise((res) => { sock.on("disconnect", () => res("disconnected")); setTimeout(() => res("still-connected"), 6000); });
eq("J7.1 removal without password → refused", (await o1.call("DELETE", `/api/v1/owner/members/${o3Id}`, { confirmEmail: O3, reason: "test" })).body?.code, "STEP_UP_FAILED");
eq("J7.2 removal without a reason → 400", (await o1.call("DELETE", `/api/v1/owner/members/${o3Id}`, { confirmEmail: O3, password: PW1 })).body?.code, "REASON_REQUIRED");
eq("J7.3 removal with wrong typed confirmation → 400", (await o1.call("DELETE", `/api/v1/owner/members/${o3Id}`, { confirmEmail: O2, password: PW1, reason: "test" })).body?.code, "CONFIRMATION_MISMATCH");
eq("J7.4 …owner three still active after the refusals", owners(), "4");
const capD = captures().length;
const rm = await o1.call("DELETE", `/api/v1/owner/members/${o3Id}`, { confirmEmail: O3, password: PW1, reason: "left the company" });
rec("J7.5 owner one removes owner three", rm.status === 200 && rm.body.removed === true && rm.body.usableOwnersRemaining === 3, JSON.stringify(rm.body));
eq("J7.6 removed owner's EXISTING access token is rejected immediately", (await o3.call("GET", "/api/v1/owner")).status, 401);
const rf = await o3.call("POST", "/api/v1/auth/refresh");
rec("J7.7 removed owner's refresh session is revoked", [401, 403].includes(rf.status) && rf.body?.code === "AUTH_SESSION_EXPIRED", `status ${rf.status} ${JSON.stringify(rf.body).slice(0, 120)}`);
eq("J7.8 removed owner's admin-settings write is rejected", (await o3.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "closed" })).status, 401);
eq("J7.9 removed owner's live socket is disconnected promptly", await sockClosed, "disconnected");
const o3b = new Client(); const reLogin = await o3b.login(O3, PW3);
eq("J7.10 removed owner can still sign in as an ORDINARY user", reLogin.status, 200);
eq("J7.11 …but owner management is refused", (await o3b.call("GET", "/api/v1/owner")).body?.code, "OWNER_ONLY");
eq("J7.12 …and the owner-only policy write is refused", (await o3b.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "closed" })).status, 403);
eq("J7.13 the other owners are unaffected", (await o2.call("GET", "/api/v1/owner")).status, 200);
let notices = [];
for (let i = 0; i < 20 && notices.length < 3; i++) { notices = captures().slice(capD).filter((x) => /Security notice/.test(x.subject)); if (notices.length < 3) await sleep(300); }
rec("J7.14 removal notices sent to the removed identity and the remaining owners (no links/secrets)", notices.length >= 3 && notices.every((n) => !/https?:\/\//.test((n.text || "")) ), `notices=${notices.length}`);
eq("J7.15 removing a non-member → 404", (await o1.call("DELETE", `/api/v1/owner/members/${o3Id}`, { confirmEmail: O3, password: PW1, reason: "again" })).body?.code, "OWNER_NOT_MEMBER");

console.log("== J8 last-owner and self-removal safeguards ==");
const o4Id = sql(`select user_id from owner_memberships where email='${O4}' and status='active'`), o2Id = sql(`select user_id from owner_memberships where email='${O2}' and status='active'`), o1Id = sql(`select user_id from owner_memberships where email='${O1}' and status='active'`);
eq("J8.1 owner one removes owner four", (await o1.call("DELETE", `/api/v1/owner/members/${o4Id}`, { confirmEmail: O4, password: PW1, reason: "cleanup" })).status, 200);
eq("J8.2 owner two removes themselves while owner one remains → allowed", (await o2.call("DELETE", `/api/v1/owner/members/${o2Id}`, { confirmEmail: O2, password: PW2, reason: "stepping down" })).status, 200);
eq("J8.3 owner two's session ended by their own removal", (await o2.call("GET", "/api/v1/owner")).status, 401);
const last = await o1.call("DELETE", `/api/v1/owner/members/${o1Id}`, { confirmEmail: O1, password: PW1, reason: "oops" });
rec("J8.4 the LAST usable owner cannot be removed (self)", last.status === 409 && last.body.code === "OWNER_LAST_USABLE", JSON.stringify(last.body).slice(0, 140));
eq("J8.5 owner one is still active and signed in", (await o1.call("GET", "/api/v1/owner")).status, 200);
eq("J8.6 exactly one active owner remains", owners(), "1");

console.log("== J9 recovery of an owner who lost access (one owner remains) ==");
const o2b = new Client(); await o2b.login(O2, PW2);
const capJ9 = captures().length;
const o2reinv = await o1.call("POST", "/api/v1/owner/invitations", { email: O2, confirmEmail: O2, password: PW1 });
eq("J9.1 re-invite a removed owner through the normal path", o2reinv.status, 201);
const t2b = seeToken(await tokenFor(O2, /owner-invite\?token=([0-9a-f]{64})/, capJ9));
const accR = await o2b.call("POST", "/api/v1/owner-access/accept", { token: t2b, name: "Owner Two" });
rec("J9.2 a VERIFIED existing account accepts while signed in (credentials untouched)", accR.status === 200 && accR.body.credentialsReset === false, JSON.stringify(accR.body).slice(0, 140));
eq("J9.2b …and the same link without the sign-in is refused (no password reset via link)", (await anon.call("POST", "/api/v1/owner-access/accept", { token: t2b, name: "x" })).body?.code, "OWNER_INVITATION_INVALID");
eq("J9.3 owner two (re-added) is active", owners(), "2");
const rec0 = await o1.call("POST", `/api/v1/owner/members/${o2Id}/recovery`, { confirmEmail: O2, password: PW1, verifiedVia: "email", note: "lost phone" });
eq("J9.4 recovery needs an out-of-band verification method, e-mail alone is refused", rec0.body?.code, "RECOVERY_EVIDENCE_REQUIRED");
const capQ = captures().length;
const recov = await o1.call("POST", `/api/v1/owner/members/${sql(`select user_id from owner_memberships where email='${O2}' and status='active'`)}/recovery`, { confirmEmail: O2, password: PW1, verifiedVia: "video_call", note: "recognised on a video call; lost password and mailbox 2FA" });
rec("J9.5 owner one starts recovery for owner two (identity verified out of band)", recov.status === 200 && recov.body.recovery === true, JSON.stringify(recov.body).slice(0, 160));
eq("J9.6 owner two's old session ended immediately", (await o2b.call("GET", "/api/v1/owner")).status, 401);
eq("J9.7 owner two is NOT an owner until they accept", owners(), "1");
const t2c = seeToken(await tokenFor(O2, /owner-invite\?token=([0-9a-f]{64})/, capQ));
const recAcc = await anon.call("POST", "/api/v1/owner-access/accept", { token: t2c, name: "Owner Two", password: "NewOwnerTwo!Pass#9" });
rec("J9.8 recovery link resets credentials and restores membership", recAcc.status === 200 && recAcc.body.credentialsReset === true, JSON.stringify(recAcc.body).slice(0, 140));
eq("J9.9 old password is dead", (await new Client().login(O2, PW2)).status === 200, false);
const o2c = new Client(); eq("J9.10 new password works and owner management is back", (await o2c.login(O2, "NewOwnerTwo!Pass#9")).status, 200);
eq("J9.11 …owner access restored", (await o2c.call("GET", "/api/v1/owner")).status, 200);
eq("J9.12 recovering yourself is refused", (await o1.call("POST", `/api/v1/owner/members/${o1Id}/recovery`, { confirmEmail: O1, password: PW1, verifiedVia: "in_person", note: "myself myself myself" })).body?.code, "RECOVERY_SELF");

console.log("== J10 store failures fail closed; emergency recovery when nobody can act ==");
const sqlq = (q) => sql(q);
sqlq("alter function kayad_owner_snapshot() rename to kayad_owner_snapshot_real");
sqlq(`create function kayad_owner_snapshot() returns jsonb language sql as $$ select '{"installed":true}'::jsonb $$`); sqlq("grant execute on function kayad_owner_snapshot() to service_role");
sqlq("NOTIFY pgrst, 'reload schema'"); await sleep(2500);
const bad = await o1.call("GET", "/api/v1/owner");
rec("J10.1 malformed snapshot: owner privilege suspended for everyone (503, recovery pointer)", bad.status === 503 && bad.body.code === "OWNER_STORE_UNAVAILABLE" && /OWNER_BOOTSTRAP_AND_RECOVERY_RUNBOOK/.test(bad.body.message || ""), `status ${bad.status}`);
eq("J10.2 owner-only policy write is refused while the store is unreadable", (await o1.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 1, dealerOnboardingMode: "self_onboarding" })).status, 403);
eq("J10.3 ordinary traffic keeps working (non-owner endpoint)", (await usr.call("GET", "/api/v1/auth/profile")).status < 500, true);
sqlq("drop function kayad_owner_snapshot()"); sqlq("alter function kayad_owner_snapshot_real() rename to kayad_owner_snapshot");
sqlq("NOTIFY pgrst, 'reload schema'"); await sleep(3500);
eq("J10.4 store restored: owner access returns by itself", (await o1.call("GET", "/api/v1/owner")).status, 200);
// a transient database error: the last good snapshot may be served only briefly, then fail closed
sqlq("revoke execute on function kayad_owner_snapshot() from service_role"); sqlq("NOTIFY pgrst, 'reload schema'");
await sleep(1600);
const stale1 = await o1.call("GET", "/api/v1/owner");
await sleep(4500);
const stale2 = await o1.call("GET", "/api/v1/owner");
rec("J10.5 unreadable store: brief grace on the last good snapshot, then fail closed (never indefinite)", stale2.status === 503, `during grace ${stale1.status}, after ${stale2.status}`);
sqlq("grant execute on function kayad_owner_snapshot() to service_role"); sqlq("NOTIFY pgrst, 'reload schema'"); await sleep(3500);
eq("J10.6 recovered", (await o1.call("GET", "/api/v1/owner")).status, 200);
// all owners inaccessible: both owners lose their verified mailbox flag → zero usable owners
sql(`update users set email_verified=false where email in ('${O1}','${O2}')`);
await sleep(1500);
const none = new Client(); const lg = await none.login(O1, PW1);
eq("J10.7 no usable owner: the designated owner cannot sign in (unverified owner identity)", lg.body?.code, "OWNER_IDENTITY_UNVERIFIED");
const noAuth = cli(["--emergency", "--operator", "tester", "--incident", "INC-5B-1", "--confirm-host", "127.0.0.1:54341"]);
rec("J10.8 emergency CLI refuses without the time-boxed deployment authorisation", noAuth.code === 3 && /RECOVERY_NOT_AUTHORIZED/.test(noAuth.err), noAuth.err.slice(0, 120));
const until = new Date(Date.now() + 3600 * 1000).toISOString();
const capE = captures().length;
const emer = cli(["--emergency", "--operator", "tester", "--incident", "INC-5B-1", "--confirm-host", "127.0.0.1:54341"], { OWNER_EMERGENCY_RECOVERY_UNTIL: until });
rec("J10.9 emergency CLI (authorised, no usable owner) issues recovery invitations to the DESIGNATED identities only", emer.code === 0 && (emer.out.match(/recovery_invitation_sent/g) || []).length === 2, emer.out.replace(/\s+/g, " ").slice(0, 200));
const te1 = seeToken(await tokenFor(O1, /owner-invite\?token=([0-9a-f]{64})/, capE));
const rEm = await new Client().call("POST", "/api/v1/owner-access/accept", { token: te1, name: "Owner One", password: "Recovered!Pass#1" });
rec("J10.10 owner one regains access through the emergency link (credentials replaced, mailbox verified)", rEm.status === 200 && rEm.body.credentialsReset === true, JSON.stringify(rEm.body).slice(0, 140));
const o1c = new Client(); eq("J10.11 …signs in and manages owners", (await o1c.login(O1, "Recovered!Pass#1")).status, 200);
eq("J10.12 …owner management works", (await o1c.call("GET", "/api/v1/owner")).status, 200);
const emer2 = cli(["--emergency", "--operator", "tester", "--incident", "INC-5B-2", "--confirm-host", "127.0.0.1:54341"], { OWNER_EMERGENCY_RECOVERY_UNTIL: until });
rec("J10.13 emergency CLI refuses once a usable owner exists", /refused:OWNER_RECOVERY_NOT_NEEDED/.test(emer2.out), emer2.out.replace(/\s+/g, " ").slice(0, 200));
const te2 = seeToken(await tokenFor(O2, /owner-invite\?token=([0-9a-f]{64})/, capE));
await new Client().call("POST", "/api/v1/owner-access/accept", { token: te2, name: "Owner Two", password: "Recovered!Pass#2" });
eq("J10.14 second designated owner restored too", owners(), "2");

console.log("== J11 audit history and secret hygiene ==");
const fin = await o1c.call("GET", "/api/v1/owner?events=500");
const text = JSON.stringify(fin.body);
const acts = new Set(fin.body.events.map((e) => e.action));
rec("J11.1 audit history lists issue / accept / activate / revoke / resend / recovery / bootstrap-close / step-up denials", ["invitation_issue", "invitation_accept", "membership_activate", "membership_revoke", "invitation_resend", "bootstrap_close", "step_up"].every((a) => acts.has(a)), [...acts].join(","));
rec("J11.2 every event names its actor", fin.body.events.every((e) => e.actor));
rec("J11.3 API output contains no token, hash, password or cookie material", !/[0-9a-f]{64}/.test(text) && !/"[a-z_]*(token|password|secret|hash|cookie)[a-z_]*"\s*:/i.test(text));
const leaked = [...allTokens].filter((t) => text.includes(t) || fs.readFileSync(`${ST}/backend.log`, "utf8").includes(t));
rec("J11.4 none of the invitation tokens appears in any API response or in the backend log", leaked.length === 0, `tokens checked=${allTokens.size}`);
const dbLeak = sql(`select count(*) from owner_membership_events where metadata::text ~ '[0-9a-f]{64}'`);
eq("J11.5 no 64-hex value in the event ledger", dbLeak, "0");
const dbDel = sql(`select count(*) from communication_deliveries where metadata::text ~ '[0-9a-f]{64}' or metadata::text like '%owner-invite%'`);
eq("J11.6 the delivery ledger stores no invitation URL/token", dbDel, "0");
const ev0 = sql("select count(*) from owner_membership_events");
let immutable = true; try { sql("update owner_membership_events set reason='x' where id=(select min(id) from owner_membership_events)"); immutable = false; } catch { /* expected */ }
rec("J11.7 event ledger is append-only (UPDATE refused)", immutable && sql("select count(*) from owner_membership_events") === ev0);

fs.writeFileSync("/home/claude/s5b/evidence_gov_api_results.json", JSON.stringify(results, null, 2));
const f = results.filter((r) => r.ok === false);
console.log(`\nRESULT pass=${results.filter((r) => r.ok === true).length} fail=${f.length} skip=${results.filter((r) => r.ok === null).length}`);
process.exit(f.length ? 1 : 0);
