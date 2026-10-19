/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5E — Part J: the REAL scenario on the disposable real stack. ONE designated owner (as the owner chose: jimmythemugo@gmail.com stands in as
// dealer-owner-5e@kayad-test.example) who ALREADY has a pending, UNVERIFIED dealer account. No real address, mailbox or provider is used.
// Requires the backend to be started with WEBHOIST_EMAIL=<that single address> (restart_backend_5e.sh).
import fs from "node:fs"; import { spawnSync } from "node:child_process";
import { Client, sql, rec, eq, summary, capCount, tokenFrom, INVITE_RE, uid, rawUser, BE, ST, envFile, FAIL, wipeUsers } from "./lib.mjs";
try { fs.unlinkSync(FAIL); } catch { /* absent */ }
const OWNER = "dealer-owner-5e@kayad-test.example", SECOND = "second-owner-5e@kayad-test.example";
const PW_OLD = "Old!Dealer#2026a", PW_NEW = "New!Owner#2026b", PW2 = "Second!Owner#2026c";
const J = (r) => JSON.stringify(r.body).slice(0, 200);
const cli = (args) => { const r = spawnSync("node", ["--import", `${ST}/brevo-capture.mjs`, "scripts/owner-bootstrap.mjs", ...args], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, ...envFile, WEBHOIST_EMAIL: OWNER, NODE_ENV: "development" }, encoding: "utf8", timeout: 90000 }); return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };

sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");
wipeUsers([OWNER, SECOND]);

console.log("== J1 the pre-existing account: registered as a dealer, never verified ==");
// A designated owner address is RESERVED against public sign-up (OWNER_IDENTITY_RESERVED), exactly why the hosted account — created before the
// reservation existed — has to be activated by invitation. Prove the reservation, then seed the pre-existing account directly (disposable DB).
const regTry = await new Client().call("POST", "/api/v1/auth/register", { name: "Squatter", email: OWNER, password: PW_OLD, role: "dealer", phone: "0712345678", businessName: "Pending Motors", location: "Nairobi" });
rec("J1.1 public registration with the designated owner address is refused (reserved)", regTry.status === 403 && regTry.body?.code === "OWNER_IDENTITY_RESERVED", J(regTry));
rawUser(OWNER, "dealer", PW_OLD, false, "pending");
sql(`update users set business_name='Pending Motors', location='Nairobi', phone='254712345678' where email='${OWNER}'`);
const pre = sql(`select role||'/'||status||'/'||email_verified||'/'||is_banned from users where email='${OWNER}'`);
rec("J1.2 account is a dealer, unverified, not banned", /^dealer\/[a-z]+\/false\/false$/.test(pre), pre);
const dealerStatusBefore = sql(`select status from users where email='${OWNER}'`);
const DIGEST = `select md5(concat_ws('|',u.role,u.status,u.business_name,u.name,u.phone,u.location,u.is_banned, (select count(*) from dealers d where d."user"=u.id), (select count(*) from dealer_verifications v where v."user"=u.id))) from users u where email='${OWNER}'`;
const dBefore = sql(DIGEST);
eq("J1.3 unverified dealer cannot sign in", (await new Client().login(OWNER, PW_OLD)).status >= 400, true);
const uidOwner = uid(OWNER);

console.log("== J2 bootstrap plan / apply with ONE designated address ==");
const plan = cli(["--plan"]); const pj = (() => { try { return JSON.parse(plan.out); } catch { return {}; } })();
rec("J2.1 --plan reports the existing account as pending_verification (not provisioned, not promoted)", plan.code === 0 && pj.designated?.length === 1 && pj.designated[0].state === "pending_verification", plan.out.replace(/\s+/g, " ").slice(0, 200));
eq("J2.2 --plan wrote nothing", sql("select count(*) from owner_invitations"), "0");
const since = capCount();
const ap = cli(["--apply", "--operator", "5e-harness", "--confirm-host", "127.0.0.1:54341"]);
rec("J2.3 --apply exit 0 and reports invitation_sent", ap.code === 0 && /invitation_sent/.test(ap.out), `${ap.code} ${ap.out.replace(/\s+/g, " ").slice(0, 160)}`);
const tok = await tokenFrom(OWNER, INVITE_RE, since);
rec("J2.4 the invitation e-mail reached the (stubbed) provider addressed to that mailbox only; token never printed by the CLI", !!tok && !ap.out.includes(tok) && !ap.err.includes(tok));
eq("J2.5 dealer data identical after the invitation was issued (invitation alone changes nothing)", sql(DIGEST), dBefore);
eq("J2.6 still unverified and no owner privilege before acceptance", sql(`select email_verified::text from users where email='${OWNER}'`) + "/" + sql("select count(*) from owner_memberships"), "false/0");
const pv = await new Client().call("GET", `/api/owner-access/invitation?token=${tok}`);
rec("J2.7 preview with the token is token-gated and exposes only a masked identity", [200].includes(pv.status) && !JSON.stringify(pv.body).includes(OWNER), J(pv));
eq("J2.8 preview with a wrong token refused", (await new Client().call("GET", `/api/owner-access/invitation?token=${"0".repeat(64)}`)).status >= 400, true);

console.log("== J3 acceptance by the mailbox holder ==");
const bad = await new Client().call("POST", "/api/owner-access/accept", { token: tok, name: "X", password: "short" });
rec("J3.1 weak password rejected before any change", bad.status === 400 && sql(`select email_verified::text from users where email='${OWNER}'`) === "false", J(bad));
eq("J3.2 …and nothing changed", sql(DIGEST), dBefore);
const acc = await new Client().call("POST", "/api/owner-access/accept", { token: tok, name: "Pending Dealer", password: PW_NEW });
rec("J3.3 acceptance → 200, accountCreated=false, credentialsReset=true", acc.status === 200 && acc.body.accountCreated === false && acc.body.credentialsReset === true, J(acc));
eq("J3.4 DEALER DATA UNCHANGED after activation (role, status, business, phone, dealers/verification row counts)", sql(DIGEST), dBefore);
eq("J3.5 status unchanged and email_verified now true", sql(`select status||'/'||email_verified from users where email='${OWNER}'`), `${dealerStatusBefore}/true`);
eq("J3.6 OLD password no longer works", (await new Client().login(OWNER, PW_OLD)).status >= 400, true);
const own = new Client(); const lg = await own.login(OWNER, PW_NEW);
eq("J3.7 new password works", lg.status, 200);
eq("J3.8 invitation replay refused", (await new Client().call("POST", "/api/owner-access/accept", { token: tok, name: "R", password: "Replay!Pass#2026z" })).status >= 400, true);
eq("J3.9 exactly one active membership, bound to the user id", sql(`select count(*) from owner_memberships where status='active' and user_id='${uidOwner}'`), "1");
eq("J3.10 prior refresh tokens (none existed) / sessions: token_version incremented", sql(`select (token_version>=1) from user_auth where user_id='${uidOwner}'`), "t");

console.log("== J4 effective authority ==");
const ow = await own.call("GET", "/api/owner");
rec("J4.1 owner surface reachable", ow.status === 200 && ow.body?.canManage !== false, `${ow.status} ${J(ow)}`);
eq("J4.2 admin onboarding policy reachable", (await own.call("GET", "/api/admin/settings/onboarding")).status, 200);
const prof = await own.call("GET", "/api/v1/auth/profile");
rec("J4.3 profile reports the owner effective role while users.role stays dealer", prof.status === 200 && /webhoist|superadmin|owner/i.test(JSON.stringify(prof.body)) && sql(`select role from users where id='${uidOwner}'`) === "dealer", J(prof));
const dsr = await own.call("GET", "/api/dealer/onboarding");
rec("J4.4 the dealer self-service surface still answers for this account (dealer permission not lost)", [200, 404].includes(dsr.status), `${dsr.status} ${J(dsr)}`);
const sw = sql(`select count(*) from dealer_verifications where "user"='${uidOwner}' and verification_status='approved'`);
eq("J4.5 owner activation did NOT auto-approve the pending dealer (separate decision preserved)", sw, "0");

console.log("== J5 bootstrap closes itself; second owner only by an existing owner ==");
eq("J5.1 single designated owner established → bootstrap switch closed", sql("select status from owner_bootstrap_state where id=1"), "closed");
const ap2 = cli(["--apply", "--operator", "5e-harness", "--confirm-host", "127.0.0.1:54341"]);
rec("J5.2 further --apply refuses (OWNER_BOOTSTRAP_CLOSED)", ap2.code !== 0 && /BOOTSTRAP_CLOSED/.test(ap2.err + ap2.out), `${ap2.code} ${ap2.err.slice(0, 120)}`);
const since2 = capCount();
const inv = await own.call("POST", "/api/owner/invitations", { email: SECOND, confirmEmail: SECOND, password: PW_NEW });
rec("J5.3 the owner invites the SECOND owner (step-up with own password) → 201", inv.status === 201, J(inv));
const t2 = await tokenFrom(SECOND, INVITE_RE, since2);
const acc2 = await new Client().call("POST", "/api/owner-access/accept", { token: t2, name: "Second Owner", password: PW2 });
eq("J5.4 second owner accepts (new account created by the invitation)", acc2.status === 200 && acc2.body.accountCreated === true, true);
eq("J5.5 two usable owners", sql("select public.kayad_owner_usable_count()"), "2");
const rm = await own.call("DELETE", `/api/owner/members/${uid(SECOND)}`, { confirmEmail: SECOND, password: PW_NEW, reason: "5E disposable removal test" });
eq("J5.6 owner can remove the second owner (2→1)", rm.status, 200);
const last = await own.call("DELETE", `/api/owner/members/${uidOwner}`, { confirmEmail: OWNER, password: PW_NEW, reason: "5E disposable last-owner test" });
rec("J5.7 the LAST owner cannot be removed", last.status === 409, `${last.status} ${J(last)}`);

console.log("== J6 audit ==");
eq("J6.1 events recorded for issue, accept, activate, invite, revoke", sql("select count(distinct action) >= 4 from owner_membership_events"), "t");
eq("J6.2 no token or password material in events", sql(`select count(*) from owner_membership_events where (coalesce(metadata::text,'')||coalesce(reason,'')) ~ '([0-9a-f]{64}|${PW_NEW}|${PW_OLD}|${PW2})'`), "0");
summary("role_api_j");
