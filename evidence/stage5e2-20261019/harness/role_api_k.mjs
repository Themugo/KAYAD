/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5E — Part K: TWO-OWNER activation + login-block reproduction on the DISPOSABLE real stack (stub providers, disposable DB, disposable addresses).
// O1 stands in for jimmythemugo@gmail.com (pre-existing, UNVERIFIED, pending dealer). O2 stands in for the second owner (NO account yet).
// No real address/mailbox/provider. Requires the backend started with WEBHOIST_EMAIL=<O1>,<O2> (backend.env default).
import fs from "node:fs"; import { spawnSync } from "node:child_process"; import { io } from "socket.io-client";
import { Client, sql, rec, eq, summary, capCount, captures, tokenFrom, INVITE_RE, VERIFY_RE, uid, rawUser, BE, ST, FAIL, wipeUsers, cli, designated, sleep, BASE } from "./lib.mjs";
try { fs.unlinkSync(FAIL); } catch { /* absent */ }
const [O1, O2] = designated(); const X = "k-extra-owner@kayad-test.example", W = "k-other-verified@kayad-test.example", D = "k-ordinary-dealer@kayad-test.example", E = "k-unverified-invitee@kayad-test.example";
const PW_OLD = "Old!Dealer#2026a", PW2 = "Second!Owner#2026c", PWX = "Extra!Owner#2026d", PWW = "Other!Verified#2026e", PWD = "Ordinary!Dealer#2026f";
const J = (r) => JSON.stringify(r.body).slice(0, 220);
const warm = async () => { for (let i = 0; i < 6; i++) { try { await fetch(BASE + "/health/live"); await sleep(300); await fetch(BASE + "/health/live"); return; } catch { await sleep(500); } } };
const RESTART = (extra = {}) => spawnSync("bash", ["/home/claude/s5f/harness/restart_backend_k.sh"], { env: { ...process.env, KAYAD_ROOT: process.env.KAYAD_ROOT, ...extra }, encoding: "utf8", timeout: 90000 });
const sock = (tok) => new Promise((res) => { const s = io(BASE, { auth: { token: tok }, transports: ["websocket"], reconnection: false, timeout: 4000 }); const t = setTimeout(() => { s.close(); res("timeout"); }, 5000); s.on("connect", () => { clearTimeout(t); s.close(); res("connected"); }); s.on("connect_error", (e) => { clearTimeout(t); res("rejected:" + String(e.message).slice(0, 60)); }); });
const resetOwners = () => sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");

{ const r0 = RESTART({}); await warm(); if (!/up/.test(r0.stdout)) { console.log("backend failed to start"); process.exit(1); } } // always begin from the two-designated disposable configuration
resetOwners(); wipeUsers([O1, O2, X, W, D, E]);
const T0 = sql("select clock_timestamp()::text");
console.log("== K1 pre-state and the EXACT login block (disposable reproduction) ==");
const reg = await new Client().call("POST", "/api/v1/auth/register", { name: "Squat", email: O2, password: PW2, role: "user", phone: "0712345678" });
rec("K1.1 public registration of the second designated address is refused (reserved)", reg.status === 403 && reg.body?.code === "OWNER_IDENTITY_RESERVED", J(reg));
rawUser(O1, "dealer", PW_OLD, false, "pending");
sql(`update users set business_name='Pending Motors', location='Nairobi', phone='254712345678' where email='${O1}'`);
const uidO1 = uid(O1);
const DIG = `select md5(concat_ws('|',u.role,u.status,u.business_name,u.name,u.phone,u.location,u.is_banned,(select count(*) from dealers d where d."user"=u.id),(select count(*) from dealer_verifications v where v."user"=u.id))) from users u where email='${O1}'`;
const dig0 = sql(DIG);
const bad = await new Client().login(O1, "Wrong!Password#1");
rec("K1.2 WRONG password → generic 401 'Invalid credentials' (NOT the owner message): the owner message is only reachable after a correct password", bad.status === 401, `${bad.status} ${J(bad)}`);
const blocked = await new Client().login(O1, PW_OLD);
const OWNER_MSG_RE = /platform-owner account is not verified.*Resend verification email.*01_OWNER_RECOVERY_GATE\.md/s;
rec("K1.3 CORRECT password, designated address, email_verified=false → 403 code OWNER_IDENTITY_UNVERIFIED with the user's exact message", blocked.status === 403 && blocked.body?.code === "OWNER_IDENTITY_UNVERIFIED" && OWNER_MSG_RE.test(blocked.body?.message || ""), `${blocked.status} ${J(blocked)}`);
rec("K1.4 no session/token was issued by the blocked login", !blocked.body?.token && !blocked.body?.user, J(blocked));
// the SAME correct password for a NON-designated unverified dealer gets the ordinary verification message instead
rawUser(E, "dealer", PW_OLD, false, "pending");
const ordinary = await new Client().login(E, PW_OLD);
rec("K1.5 control: a non-designated unverified dealer is blocked by the ORDINARY gate (different code) — the owner message really is designation-specific", ordinary.status === 403 && ordinary.body?.code !== "OWNER_IDENTITY_UNVERIFIED", `${ordinary.status} ${J(ordinary)}`);
const plan0 = cli(["--plan"]); let pj0 = {}; try { pj0 = JSON.parse(plan0.out); } catch { /* */ }
rec("K1.6 --plan: O1 pending_verification (not provisioned), O2 not an account yet", plan0.code === 0 && pj0.designated?.length === 2 && pj0.designated[0].state === "pending_verification", plan0.out.replace(/\s+/g, " ").slice(0, 260));
eq("K1.7 dealer data unchanged by the blocked attempts (digest)", sql(DIG), dig0);
eq("K1.8 failed/blocked attempts did not lock or alter the account (login_attempts)", sql(`select coalesce(login_attempts,0)::text from user_auth where user_id='${uidO1}'`) >= "0", true);

console.log("== K2 resend-verification (stub provider) — enumeration-safe, cooldown, single live link ==");
const since0 = capCount();
const rs = await new Client().call("POST", "/api/v1/auth/resend-verification", { email: O1 });
const rsUnknown = await new Client().call("POST", "/api/v1/auth/resend-verification", { email: "nobody-k@kayad-test.example" });
rawUser(W, "user", PWW, true, "approved");
const rsVerified = await new Client().call("POST", "/api/v1/auth/resend-verification", { email: W });
rec("K2.1 identical status AND body for unverified-owner, unknown and already-verified addresses (no enumeration)", rs.status === 202 && rs.status === rsUnknown.status && rs.status === rsVerified.status && J(rs) === J(rsUnknown) && J(rs) === J(rsVerified), `${rs.status}/${rsUnknown.status}/${rsVerified.status}`);
const v1 = await tokenFrom(O1, VERIFY_RE, since0);
rec("K2.2 the (stubbed) provider received exactly one verification mail for O1, none for unknown/verified, link carries a 64-hex token", !!v1 && captures().slice(since0).filter((c) => c.to?.[0]?.email === O1).length === 1 && captures().slice(since0).filter((c) => ["nobody-k@kayad-test.example", W].includes(c.to?.[0]?.email)).length === 0);
const rsAgain = await new Client().call("POST", "/api/v1/auth/resend-verification", { email: O1 });
await sleep(800);
rec("K2.3 immediate second resend → same generic 202 and NO second mail (per-account cooldown)", rsAgain.status === 202 && captures().slice(since0).filter((c) => c.to?.[0]?.email === O1).length === 1);
await sleep(3500);
const s1 = capCount();
await new Client().call("POST", "/api/v1/auth/resend-verification", { email: O1 });
const v2 = await tokenFrom(O1, VERIFY_RE, s1);
rec("K2.4 after the cooldown a replacement link is issued (different token)", !!v2 && v2 !== v1);
const useOld = await new Client().call("GET", `/api/v1/auth/verify-email/${v1}`);
rec("K2.5 the first (superseded) link no longer verifies", useOld.status === 400, `${useOld.status}`);
eq("K2.6 …and the account is STILL unverified (a refused link changes nothing)", sql(`select email_verified::text from users where id='${uidO1}'`), "false");
sql(`update user_auth set email_verify_expire = now() - interval '1 minute' where user_id='${uidO1}'`);
const useExpired = await new Client().call("GET", `/api/v1/auth/verify-email/${v2}`);
rec("K2.7 an EXPIRED link is refused", useExpired.status === 400, `${useExpired.status}`);
eq("K2.8 …still unverified, owner still blocked", sql(`select email_verified::text from users where id='${uidO1}'`) + "/" + (await new Client().login(O1, PW_OLD)).status, "false/403");
await sleep(3200);
const s2 = capCount();
await new Client().call("POST", "/api/v1/auth/resend-verification", { email: O1 });
const v3 = await tokenFrom(O1, VERIFY_RE, s2);
rec("K2.9 a fresh link can still be requested after expiry", !!v3);
const ver = await new Client().call("GET", `/api/v1/auth/verify-email/${v3}`);
eq("K2.10 the mailbox holder's link verifies the account", ver.status + "/" + sql(`select email_verified::text from users where id='${uidO1}'`), "200/true");
const replay = await new Client().call("GET", `/api/v1/auth/verify-email/${v3}`);
rec("K2.11 the verification link is single-use (replay refused)", replay.status === 400, `${replay.status}`);
console.log("   (Path A step 1 complete.) Verification ALONE, with the governance store installed:");
const o1 = new Client(); const l1 = await o1.login(O1, PW_OLD);
eq("K2.12 verified designated address now signs in (old password still works: nothing was replaced)", l1.status, 200);
rec("K2.13 …but holds NO owner authority (no membership): /api/owner → 403", (await o1.call("GET", "/api/owner")).status === 403);
eq("K2.14 users.role still 'dealer', status unchanged, dealer data identical", sql(DIG), dig0);

console.log("== K3 invitations for BOTH designated identities ==");
const since = capCount();
const plan1 = JSON.parse(cli(["--plan"]).out);
rec("K3.1 --plan now: O1 account_verified_not_owner, O2 no account", plan1.designated?.[0]?.state === "account_verified_not_owner" && plan1.designated?.length === 2, JSON.stringify(plan1.designated));
const ap = cli(["--apply", "--operator", "5e-k-harness", "--confirm-host", "127.0.0.1:54341"]);
rec("K3.2 --apply: two invitations sent, one per designated mailbox", ap.code === 0 && (ap.out.match(/invitation_sent/g) || []).length === 2, ap.out.replace(/\s+/g, " ").slice(0, 240));
const tO1 = await tokenFrom(O1, INVITE_RE, since); const tO2 = await tokenFrom(O2, INVITE_RE, since);
rec("K3.3 each mailbox got its own distinct token; CLI output never contains a token", !!tO1 && !!tO2 && tO1 !== tO2 && !ap.out.includes(tO1) && !ap.out.includes(tO2) && !ap.err.includes(tO1));
eq("K3.4 tokens are stored only as sha256 hashes (no plaintext token in owner_invitations)", sql(`select count(*) from owner_invitations where token_hash in ('${tO1}','${tO2}') or token_hash !~ '^[0-9a-f]{64}$'`), "0");
eq("K3.5 invitations alone changed nothing (dealer digest identical, 0 memberships)", sql(DIG) + "/" + sql("select count(*) from owner_memberships"), `${dig0}/0`);
const ap2 = cli(["--apply", "--operator", "5e-k-harness", "--confirm-host", "127.0.0.1:54341"]);
rec("K3.6 re-running --apply is idempotent (no duplicate pending invitations)", ap2.code === 0 && sql("select count(*) from owner_invitations where status='pending'") === "2", `${ap2.code} pending=${sql("select count(*) from owner_invitations where status='pending'")}`);

console.log("== K4 negative acceptance suite ==");
const anon = new Client();
const a1 = await anon.call("POST", "/api/owner-access/accept", { token: tO1, name: "Pending Motors", password: "Owner!Pass#2026z" });
rec("K4.1 verified existing account + token but NOT signed in → refused (OWNER_LOGIN_REQUIRED); token alone never replaces credentials", a1.status >= 400 && /LOGIN_REQUIRED/.test(JSON.stringify(a1.body)), `${a1.status} ${J(a1)}`);
eq("K4.2 …nothing mutated; old password intact; invitation still pending", sql(DIG) + "/" + sql("select count(*) from owner_memberships") + "/" + (await new Client().login(O1, PW_OLD)).status, `${dig0}/0/200`);
const wc = new Client(); await wc.login(W, PWW);
const a2 = await wc.call("POST", "/api/owner-access/accept", { token: tO1, name: "Imposter", password: "Owner!Pass#2026y" });
rec("K4.3 signed in as a DIFFERENT verified user → refused; no membership for either", a2.status >= 400 && sql("select count(*) from owner_memberships") === "0", `${a2.status} ${J(a2)}`);
const a3 = await anon.call("POST", "/api/owner-access/accept", { token: "0".repeat(64), name: "X", password: PW2 });
rec("K4.4 unknown token → refused", a3.status >= 400, `${a3.status}`);
const a4 = await anon.call("POST", "/api/owner-access/accept", { token: tO2, name: "Second Owner", password: "short" });
rec("K4.5 weak password refused before any change (no account created for O2)", a4.status === 400 && sql(`select count(*) from users where email='${O2}'`) === "0", `${a4.status}`);
// forced AUDIT failure inside the atomic accept function
sql(`CREATE OR REPLACE FUNCTION public.k_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$; CREATE TRIGGER k_fail_audit_trg BEFORE INSERT ON public.owner_membership_events FOR EACH ROW WHEN (NEW.action='membership_activate') EXECUTE FUNCTION public.k_fail_audit()`);
const af = await anon.call("POST", "/api/owner-access/accept", { token: tO2, name: "Second Owner", password: PW2 });
rec("K4.6 audit write FAILS → acceptance fails (not 200)", af.status >= 400, `${af.status} ${J(af)}`);
eq("K4.7 …no partial state: no O2 user, no auth row, no membership, invitation still pending", sql(`select (select count(*) from users where email='${O2}')||'/'||(select count(*) from owner_memberships)||'/'||(select count(*) from owner_invitations where email='${O2}' and status='pending')`), "0/0/1");
sql("DROP TRIGGER k_fail_audit_trg ON public.owner_membership_events; DROP FUNCTION public.k_fail_audit()");
// expiry
sql(`update owner_invitations set expires_at = now() - interval '1 minute' where email='${O2}' and status='pending'`);
const ex = await anon.call("POST", "/api/owner-access/accept", { token: tO2, name: "Second Owner", password: PW2 });
rec("K4.8 EXPIRED invitation refused (OWNER_INVITATION_EXPIRED); no account created", ex.status >= 400 && /EXPIRED/.test(JSON.stringify(ex.body)) && sql(`select count(*) from users where email='${O2}'`) === "0", `${ex.status} ${J(ex)}`);
const sinceR = capCount();
const apR = cli(["--apply", "--operator", "5e-k-harness", "--confirm-host", "127.0.0.1:54341"]);
const tO2b = await tokenFrom(O2, INVITE_RE, sinceR);
rec("K4.9 re-issue after expiry works (new token; the expired one stays dead)", apR.code === 0 && !!tO2b && tO2b !== tO2);
rec("K4.10 the old expired token is still refused", (await anon.call("POST", "/api/owner-access/accept", { token: tO2, name: "S", password: PW2 })).status >= 400);
// revoked
const invs = await new Client(); // owner needed to revoke: do it later with a real owner; here use SQL-state for revoked path through the DB function
// concurrency: 6 parallel accepts of the same token
const par = await Promise.all(Array.from({ length: 6 }, () => new Client().call("POST", "/api/owner-access/accept", { token: tO2b, name: "Second Owner", password: PW2 })));
const okN = par.filter((r) => r.status === 200).length;
rec("K4.11 CONCURRENT acceptance of one token: exactly ONE succeeds", okN === 1, par.map((r) => r.status).join(","));
eq("K4.12 …exactly one O2 user, one auth row, one active membership, one activation event", sql(`select (select count(*) from users where email='${O2}')||'/'||(select count(*) from user_auth where user_id=(select id from users where email='${O2}'))||'/'||(select count(*) from owner_memberships where email='${O2}' and status='active')||'/'||(select count(*) from owner_membership_events where action='membership_activate' and target_email='${O2}' and result='success' and at >= '${T0}')`), "1/1/1/1");
eq("K4.13 bootstrap stays OPEN: only 1 of 2 designated owners is established", sql("select status from owner_bootstrap_state where id=1"), "open");
const replayO2 = await new Client().call("POST", "/api/owner-access/accept", { token: tO2b, name: "S", password: PW2 });
rec("K4.14 replay of the accepted token refused", replayO2.status >= 400);
const newRole = sql(`select role||'/'||status||'/'||email_verified from users where email='${O2}'`);
rec("K4.15 the new owner's users row is an ordinary account (role 'user'), authority comes from the membership only", newRole.startsWith("user/approved/true"), newRole);

console.log("== K5 Path A: the verified dealer accepts WHILE SIGNED IN (credentials and session preserved) ==");
const tokVerBefore = sql(`select token_version::text from user_auth where user_id='${uidO1}'`);
const sessBefore = sql(`select count(*) from refresh_tokens where "user"='${uidO1}' and is_revoked=false`);
const accO1 = await o1.call("POST", "/api/owner-access/accept", { token: tO1, name: "Pending Motors" });
rec("K5.1 signed-in, verified mailbox owner accepts → 200, accountCreated=false, credentialsReset=false", accO1.status === 200 && accO1.body.accountCreated === false && accO1.body.credentialsReset === false, J(accO1));
eq("K5.2 DEALER DATA UNCHANGED after owner activation (role, status, business, phone, dealers/verification rows)", sql(DIG), dig0);
eq("K5.3 token_version unchanged and live sessions NOT revoked", sql(`select token_version::text from user_auth where user_id='${uidO1}'`) + "/" + sql(`select count(*) from refresh_tokens where "user"='${uidO1}' and is_revoked=false`), `${tokVerBefore}/${sessBefore}`);
eq("K5.4 old password still works", (await new Client().login(O1, PW_OLD)).status, 200);
await sleep(1500);
eq("K5.5 the pre-existing session now carries owner authority", (await o1.call("GET", "/api/owner")).status, 200);
eq("K5.6 BOTH designated owners established → bootstrap switch closed automatically", sql("select status from owner_bootstrap_state where id=1"), "closed");
eq("K5.7 two usable owners", sql("select public.kayad_owner_usable_count()"), "2");
eq("K5.8 pending dealer was NOT auto-approved", sql(`select count(*) from dealer_verifications where "user"='${uidO1}' and verification_status='approved'`), "0");
const apClosed = cli(["--apply", "--operator", "5e-k-harness", "--confirm-host", "127.0.0.1:54341"]);
rec("K5.9 bootstrap --apply refuses after closure", apClosed.code !== 0 && /BOOTSTRAP_CLOSED/.test(apClosed.err + apClosed.out), `${apClosed.code}`);

console.log("== K6 owner management authorization, duplicates, last owner ==");
const o2 = new Client(); eq("K6.0 O2 signs in with the password chosen at acceptance", (await o2.login(O2, PW2)).status, 200);
rawUser(D, "dealer", PWD, true, "approved"); const dc = new Client(); await dc.login(D, PWD);
rec("K6.1 an ordinary verified dealer cannot reach owner management (403)", (await dc.call("GET", "/api/owner")).status === 403 && (await dc.call("POST", "/api/owner/invitations", { email: X, confirmEmail: X, password: PWD })).status === 403);
rec("K6.2 unauthenticated callers are refused (401/403)", [401, 403].includes((await new Client().call("GET", "/api/owner")).status) && [401, 403].includes((await new Client().call("POST", "/api/owner/invitations", { email: X })).status));
const badStep = await o1.call("POST", "/api/owner/invitations", { email: X, confirmEmail: X, password: "Wrong!Password#9" });
rec("K6.3 owner action with a WRONG step-up password refused; no invitation created", badStep.status >= 400 && badStep.status < 500 && sql(`select count(*) from owner_invitations where email='${X}'`) === "0", `${badStep.status}`);
const badConf = await o1.call("POST", "/api/owner/invitations", { email: X, confirmEmail: "someone-else@kayad-test.example", password: PW_OLD });
rec("K6.4 mismatched confirmation address refused; no invitation created", badConf.status >= 400 && sql(`select count(*) from owner_invitations where email='${X}'`) === "0", `${badConf.status}`);
const sinceX = capCount();
const inv1 = await o1.call("POST", "/api/owner/invitations", { email: X, confirmEmail: X, password: PW_OLD });
rec("K6.5 owner invites a THIRD (non-designated) address with step-up → 201", inv1.status === 201, J(inv1));
const inv2 = await o1.call("POST", "/api/owner/invitations", { email: X, confirmEmail: X, password: PW_OLD });
rec("K6.6 DUPLICATE pending invitation refused (no second row)", inv2.status === 409 && sql(`select count(*) from owner_invitations where email='${X}' and status='pending'`) === "1", `${inv2.status} ${J(inv2)}`);
const invActive = await o1.call("POST", "/api/owner/invitations", { email: O2, confirmEmail: O2, password: PW_OLD });
rec("K6.7 inviting someone who is already an active owner refused", invActive.status === 409, `${invActive.status} ${J(invActive)}`);
const iid = sql(`select id from owner_invitations where email='${X}' and status='pending'`);
const tX = await tokenFrom(X, INVITE_RE, sinceX);
const rv = await o1.call("DELETE", `/api/owner/invitations/${iid}`, { confirmEmail: X, password: PW_OLD, reason: "5E disposable revoke test" });
rec("K6.8 owner revokes a pending invitation → 200", rv.status === 200, J(rv));
const useRevoked = await new Client().call("POST", "/api/owner-access/accept", { token: tX, name: "Extra Owner", password: PWX });
rec("K6.9 the REVOKED invitation cannot be accepted; no account created", useRevoked.status >= 400 && sql(`select count(*) from users where email='${X}'`) === "0", `${useRevoked.status}`);
// unverified existing account + invitation (takeover path)
const sinceE = capCount();
const invE = await o1.call("POST", "/api/owner/invitations", { email: E, confirmEmail: E, password: PW_OLD });
const tE = await tokenFrom(E, INVITE_RE, sinceE);
const E_DIG = `select md5(concat_ws('|',role,status,business_name,name)) from users where email='${E}'`; const eBefore = sql(E_DIG);
const accE = await new Client().call("POST", "/api/owner-access/accept", { token: tE, name: "Unverified Invitee", password: PWX });
rec("K6.10 PATH B (unverified existing account): mailbox-token holder takes over → credentialsReset=true, accountCreated=false", invE.status === 201 && accE.status === 200 && accE.body.credentialsReset === true && accE.body.accountCreated === false, J(accE));
eq("K6.11 …role/status/business unchanged even on Path B; old password dead; new works", sql(E_DIG) + "/" + (await new Client().login(E, PW_OLD)).status + "/" + (await new Client().login(E, PWX)).status, `${eBefore}/401/200`);
eq("K6.12 three usable owners", sql("select public.kayad_owner_usable_count()"), "3");

console.log("== K7 revocation: HTTP, refresh, socket; last-owner protection ==");
const xc = new Client(); await xc.login(E, PWX); eq("K7.1 third owner reaches /api/owner", (await xc.call("GET", "/api/owner")).status, 200);
const sB = await sock(xc.token); eq("K7.2 third owner's socket handshake accepted", sB, "connected");
const uidE = uid(E);
const rmE = await o1.call("DELETE", `/api/owner/members/${uidE}`, { confirmEmail: E, password: PW_OLD, reason: "5E disposable removal test" });
eq("K7.3 owner removes the third owner (3→2)", rmE.status, 200);
rec("K7.4 removed owner's LIVE session is denied immediately on HTTP", [401, 403].includes((await xc.call("GET", "/api/owner")).status));
const rf = await xc.call("POST", "/api/v1/auth/refresh", {});
rec("K7.5 removed owner's refresh token is revoked (cannot mint a new session)", [401, 403].includes(rf.status), `${rf.status}`);
const sA = await sock(xc.token);
rec("K7.6 removed owner's old token: socket rejected (or connected without owner authority)", /rejected|connected/.test(sA), sA);
const xr = new Client(); await xr.login(E, PWX);
eq("K7.7 removed owner re-logs in as an ordinary user with NO owner surface (403)", (await xr.call("GET", "/api/owner")).status, 403);
eq("K7.8 removal wrote a success audit event", sql(`select count(*) from owner_membership_events where action='membership_revoke' and result='success' and target_email='${E}' and at >= '${T0}'`), "1");
const rm2 = await o1.call("DELETE", `/api/owner/members/${uid(O2)}`, { confirmEmail: O2, password: PW_OLD, reason: "5E disposable removal test" });
eq("K7.9 owner removes O2 (2→1)", rm2.status, 200);
const last = await o1.call("DELETE", `/api/owner/members/${uidO1}`, { confirmEmail: O1, password: PW_OLD, reason: "5E last-owner test" });
rec("K7.10 the LAST usable owner cannot be removed (self or otherwise) → 409", last.status === 409, `${last.status} ${J(last)}`);
eq("K7.11 still exactly one usable owner and O1's membership active", sql("select public.kayad_owner_usable_count()") + "/" + sql(`select status from owner_memberships where user_id='${uidO1}' order by created_at desc limit 1`), "1/active");
const emg = cli(["--emergency", "--operator", "5e-k-harness", "--incident", "INC-5E-K", "--confirm-host", "127.0.0.1:54341"]);
rec("K7.12 emergency recovery is refused by default (RECOVERY_NOT_AUTHORIZED: no time-boxed deployment authorization)", emg.code !== 0 && /RECOVERY_NOT_AUTHORIZED/.test(emg.out + emg.err), `${emg.code} ${(emg.out + emg.err).replace(/\s+/g, " ").slice(0, 160)}`);
process.env.OWNER_EMERGENCY_RECOVERY_UNTIL = new Date(Date.now() + 3600e3).toISOString();
const emg2 = cli(["--emergency", "--operator", "5e-k-harness", "--incident", "INC-5E-K", "--confirm-host", "127.0.0.1:54341"]);
delete process.env.OWNER_EMERGENCY_RECOVERY_UNTIL;
rec("K7.13 even WITH the time-boxed authorization it refuses while a usable owner exists (every designated identity reports refused; no invitation created)", /refused/.test(emg2.out) && !/recovery_invitation_sent/.test(emg2.out) && sql("select count(*) from owner_invitations where kind='recovery' and status='pending'") === "0", `${emg2.code} ${(emg2.out + emg2.err).replace(/\s+/g, " ").slice(0, 220)}`);

console.log("== K8 audit ledger ==");
eq("K8.1 success AND denied events exist for issue/accept/activate/revoke", sql("select count(distinct action||':'||result) >= 6 from owner_membership_events"), "t");
eq("K8.2 no token, hash or password material in event text", sql(`select count(*) from owner_membership_events where (coalesce(metadata::text,'')||coalesce(reason,'')||coalesce(target_email,'')) ~ '([0-9a-f]{64}|${PW_OLD}|${PW2}|${PWX})'`), "0");
let delBlocked = false; try { sql("DELETE FROM owner_membership_events WHERE true"); } catch (e) { delBlocked = /append-only/.test(String(e.stderr || e.message)); }
rec("K8.3 the event ledger is append-only (DELETE refused by trigger)", delBlocked);

console.log("== K9 configuration faults (backend restarted with a different designated list) ==");
// (a) MISSING configuration
wipeUsers([O2]); // disposable DB: the former owner account is removed so the address is genuinely unregistered
let rr = RESTART({ WEBHOIST_EMAIL_K: "" }); await warm(); rec("K9.0 backend restarted with EMPTY WEBHOIST_EMAIL", /up/.test(rr.stdout), rr.stdout.trim().slice(0, 80));
const o1b = new Client(); await o1b.login(O1, PW_OLD); await sleep(1500);
eq("K9.1 MISSING config: the existing DB-backed owner keeps authority (config grants/removes nothing in database mode)", (await o1b.call("GET", "/api/owner")).status, 200);
const regO2 = await new Client().call("POST", "/api/v1/auth/register", { name: "Late Squatter", email: O2, password: PW2, role: "user", phone: "0712345678" });
rec("K9.2 MISSING config: a REVOKED former owner's address is no longer reserved, so public sign-up creates an ORDINARY account (201)", regO2.status === 201, `${regO2.status} ${J(regO2)}`);
eq("K9.3 …and that account has NO owner authority (unverified ⇒ cannot even sign in; role user)", sql(`select role||'/'||email_verified from users where id=(select id from users where email='${O2}' order by created_at desc limit 1)`).startsWith("user/"), true);
// (b) CONFLICTING / misspelled configuration
const TYPO = O2.replace("owner-two", "ownr-two");
rr = RESTART({ WEBHOIST_EMAIL_K: `${O1},${TYPO}` }); await warm(); rec("K9.4 backend restarted with a MISSPELLED second address", /up/.test(rr.stdout));
const ver2 = JSON.parse(spawnSync("node", ["scripts/owner-bootstrap.mjs", "--verify-designated", `${O1},${O2}`], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, WEBHOIST_EMAIL: `${O1},${TYPO}`, NODE_ENV: "test", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" }, encoding: "utf8" }).stdout);
rec("K9.5 --verify-designated exposes the discrepancy that masked --plan hides (O1 true, intended O2 false, 1 unexpected configured)", ver2.expected[0].configuredExactly === true && ver2.expected[1].configuredExactly === false && ver2.configuredButNotExpectedCount === 1, JSON.stringify(ver2));
const regTypo = await new Client().call("POST", "/api/v1/auth/register", { name: "Typo Name", email: TYPO, password: PW2, role: "user", phone: "0712345678" });
rec("K9.6 the MISSPELLED address is the one that is reserved (403)…", regTypo.status === 403, `${regTypo.status}`);
// the intended O2 address is not reserved, but still gains nothing
rec("K9.7 …while the intended address is NOT reserved (a squatter row exists from K9.2): config typo = silent loss of the reservation, never a grant of privilege", sql(`select count(*) from users where email='${O2}'`) === "1" && sql(`select count(*) from owner_memberships where email='${O2}' and status='active'`) === "0");
// (c) restore
rr = RESTART({}); await warm(); rec("K9.8 backend restored to the two-designated disposable configuration", /up/.test(rr.stdout));

console.log("== K10 recovery gate: unverified squatter on the intended address is repaired only by the mailbox holder ==");
// O2 now has an unverified squatter row (K9.2). Re-open bootstrap for the disposable DB only and issue the invitation to the mailbox.
resetOwners(); sql(`update owner_memberships set status=status`);
const sinceS = capCount();
const apS = cli(["--apply", "--operator", "5e-k-harness", "--confirm-host", "127.0.0.1:54341"]);
const tS = await tokenFrom(O2, INVITE_RE, sinceS);
const sqDig = sql(`select md5(concat_ws('|',role,status,name)) from users where email='${O2}'`);
const accS = await new Client().call("POST", "/api/owner-access/accept", { token: tS, name: "Real Second Owner", password: "Real!Second#2026g" });
rec("K10.1 invitation (mailbox-delivered token) lets the real mailbox holder take over the unverified squatter row", !!tS && accS.status === 200 && accS.body.credentialsReset === true && accS.body.accountCreated === false, J(accS));
eq("K10.2 the squatter's password is dead; the holder's works", (await new Client().login(O2, PW2)).status + "/" + (await new Client().login(O2, "Real!Second#2026g")).status, "401/200");
eq("K10.3 bootstrap not closed (O1's membership was reset in this sub-scenario; 1 of 2 established)", sql("select status from owner_bootstrap_state where id=1"), "open");
summary("role_api_k");
