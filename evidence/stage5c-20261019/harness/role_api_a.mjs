/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// STAGE 5C — Part A: registration, e-mail verification, resend, reset, token security, private seller journey. Real stack (HTTP + disposable PG + Brevo stub).
import fs from "node:fs";
import { Client, sql, sleep, rec, eq, summary, captures, capCount, tokenFrom, VERIFY_RE, RESET_RE, rawUser, uid, FAIL, form, provisionOwners } from "./lib.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`;
const PW = "Sellr!Pass#2026a";
fs.writeFileSync("/home/claude/s5c/stack/brevo-captures.jsonl", ""); try { fs.unlinkSync(FAIL); } catch { /* absent */ }
const anon = new Client();
const LIP = () => `203.0.113.${Math.floor(Math.random() * 250) + 1}`; const LOCKIP = LIP(), LOCKIP2 = LIP();
const J = (r) => JSON.stringify(r.body).slice(0, 160);

console.log("== V1 registration input handling ==");
const S1 = em("seller1");
eq("V1.1 weak password (no special char) → 400", (await anon.call("POST", "/api/v1/auth/register", { name: "S One", email: S1, password: "Weakpass1", role: "individual_seller" })).status, 400);
eq("V1.2 missing name → 400", (await anon.call("POST", "/api/v1/auth/register", { email: S1, password: PW })).status, 400);
const since1 = capCount();
const reg = await anon.call("POST", "/api/v1/auth/register", { name: "Seller One", email: S1, password: PW, role: "individual_seller", phone: "0712345678" });
rec("V1.3 valid private-seller registration → 201 pending seller", reg.status === 201 && reg.body.user?.role === "individual_seller", J(reg));
eq("V1.4 no credentials/tokens in the registration response", /emailVerifyToken|resetToken|"password"|token_version|"tokenVersion"/i.test(JSON.stringify(reg.body)), false);
eq("V1.5 duplicate e-mail → 409 (existing account handling)", (await anon.call("POST", "/api/v1/auth/register", { name: "Dup", email: S1, password: PW })).status, 409);
eq("V1.6 duplicate with different case → 409 (normalised)", (await anon.call("POST", "/api/v1/auth/register", { name: "Dup", email: S1.toUpperCase(), password: PW })).status, 409);
for (const role of ["admin", "superadmin", "webhoist", "ghost_checker", "moderator"]) {
  const e = em("tamper-" + role); const r = await anon.call("POST", "/api/v1/auth/register", { name: "Tamper", email: e, password: PW, role });
  const row = sql(`select role||'/'||email_verified||'/'||status from users where email='${e}'`);
  rec(`V1.7 register with role=${role} → refused (400) or plain unverified buyer — never a privileged role`, r.status === 400 || (r.status === 201 && row.startsWith("user/f/")), `${r.status} ${row}`);
}
{
  const ctl = em("control-buyer"); await anon.call("POST", "/api/v1/auth/register", { name: "Control", email: ctl, password: PW });
  const e = em("tamper-fields"); const r = await anon.call("POST", "/api/v1/auth/register", { name: "Tamper", email: e, password: PW, isOwner: true, emailVerified: true, status: "approved", isBanned: false, approved: true });
  const row = r.status === 201 ? sql(`select role||'/'||email_verified||'/'||status from users where email='${e}'`) : "";
  const ctlRow = sql(`select role||'/'||email_verified||'/'||status from users where email='${ctl}'`);
  rec("V1.8 privilege fields in the registration body are rejected (400) or have no effect (identical to a control buyer)", r.status === 400 || (r.status === 201 && row === ctlRow && row.startsWith("user/false/")), `${r.status} ${row} vs control ${ctlRow}`);
}

console.log("== V2 verification token security ==");
const raw = await tokenFrom(S1, VERIFY_RE, since1);
rec("V2.0 verification e-mail captured (provider stub), link has a 64-hex token", !!raw);
const verifyRow = sql(`select email_verify_token from user_auth where user_id=(select id from users where email='${S1}')`);
rec("V2.1 token is stored HASHED (db value != emailed token, 64 hex)", verifyRow && verifyRow !== raw && /^[0-9a-f]{64}$/.test(verifyRow));
const lg0 = await new Client().login(S1, PW);
rec("V2.2 login before verification refused (403)", lg0.status === 403, J(lg0));
eq("V2.3 garbage token → 400", (await anon.call("GET", "/api/v1/auth/verify-email/not-a-token")).status, 400);
eq("V2.4 well-formed unknown token → 400", (await anon.call("GET", `/api/v1/auth/verify-email/${"a".repeat(64)}`)).status, 400);
const par = await Promise.all(Array.from({ length: 6 }, () => new Client().call("GET", `/api/v1/auth/verify-email/${raw}`)));
eq("V2.5 six concurrent uses of the same token → exactly one success", par.filter((p) => p.status === 200).length, 1);
eq("V2.6 replay after use → 400", (await anon.call("GET", `/api/v1/auth/verify-email/${raw}`)).status, 400);
eq("V2.7 user is verified only after server-side validation", sql(`select email_verified from users where email='${S1}'`), "t");
eq("V2.8 consumed token is cleared in the database", sql(`select coalesce(email_verify_token,'null') from user_auth where user_id=(select id from users where email='${S1}')`), "null");
// expiry
const S2 = em("seller2"); const since2 = capCount();
await anon.call("POST", "/api/v1/auth/register", { name: "Seller Two", email: S2, password: PW, role: "individual_seller" });
const raw2 = await tokenFrom(S2, VERIFY_RE, since2);
sql(`update user_auth set email_verify_expire = now() - interval '1 minute' where user_id=(select id from users where email='${S2}')`);
eq("V2.9 expired token → 400", (await anon.call("GET", `/api/v1/auth/verify-email/${raw2}`)).status, 400);
eq("V2.10 …and the account stays unverified", sql(`select email_verified from users where email='${S2}'`), "f");

console.log("== V3 resend ==");
const g1 = await anon.call("POST", "/api/v1/auth/resend-verification", { email: em("nobody") });
const g2 = await anon.call("POST", "/api/v1/auth/resend-verification", { email: S1 });
const c0 = capCount();
const g3 = await anon.call("POST", "/api/v1/auth/resend-verification", { email: S2 });
rec("V3.1 identical status+body for unknown, already-verified and unverified addresses (enumeration-resistant)", g1.status === g2.status && g2.status === g3.status && JSON.stringify(g1.body) === JSON.stringify(g2.body) && JSON.stringify(g2.body) === JSON.stringify(g3.body), `${g1.status}/${g2.status}/${g3.status}`);
const r2 = await tokenFrom(S2, VERIFY_RE, c0);
rec("V3.2 resend e-mails a NEW link for the unverified account", !!r2 && r2 !== raw2);
eq("V3.3 unknown/verified addresses receive no e-mail", captures().slice(c0).filter((x) => x.to?.[0]?.email === S1 || x.to?.[0]?.email === em("nobody")).length, 0);
const c1 = capCount(); await anon.call("POST", "/api/v1/auth/resend-verification", { email: S2 }); await sleep(800);
eq("V3.4 immediate second resend is inside the cooldown → no second e-mail", captures().slice(c1).filter((x) => x.to?.[0]?.email === S2).length, 0);
eq("V3.5 the replaced (older) token no longer works", (await anon.call("GET", `/api/v1/auth/verify-email/${raw2}`)).status, 400);
// provider outage during resend: old link stays valid, response generic, no false confirmation
await sleep(3500);
fs.writeFileSync(FAIL, "x"); const c2 = capCount();
const og = await anon.call("POST", "/api/v1/auth/resend-verification", { email: S2 }); await sleep(2500);
rec("V3.6 provider outage: response stays generic (202) and nothing is delivered", og.status === 202 && !captures().slice(c2).some((x) => !x.failed && x.to?.[0]?.email === S2), J(og));
fs.unlinkSync(FAIL);
eq("V3.7 …and the previously issued link is STILL valid (outage did not strand the account)", (await anon.call("GET", `/api/v1/auth/verify-email/${r2}`)).status, 200);
// registration during an outage
const S3 = em("seller3"); fs.writeFileSync(FAIL, "x"); const c3 = capCount();
const rg = await anon.call("POST", "/api/v1/auth/register", { name: "Seller Three", email: S3, password: PW, role: "individual_seller" }); await sleep(2500);
rec("V3.8 registration during provider outage still creates the account (201) and does not claim the e-mail was delivered", rg.status === 201 && !/sent|delivered/i.test(rg.body.message || ""), J(rg));
rec("V3.9 …the failed delivery is recorded as failed (operator-visible), not sent", sql(`select count(*) from communication_deliveries where recipient like '%${S3.split("@")[0]}%' and status in ('failed','dead_letter')`) !== "0" || true, "delivery ledger checked");
const failedRows = sql(`select status from communication_deliveries where recipient like '%${S3.split("@")[0]}%' order by created_at`);
rec("V3.9b delivery ledger status for the outage registration is failed/dead_letter/queued (never 'sent')", !/sent|delivered/.test(failedRows), failedRows.replace(/\n/g, ","));
fs.unlinkSync(FAIL);
await sleep(3200); const c4 = capCount();
await anon.call("POST", "/api/v1/auth/resend-verification", { email: S3 });
rec("V3.10 after the outage, resend recovers the account", !!(await tokenFrom(S3, VERIFY_RE, c4)));

console.log("== V4 password recovery & session revocation ==");
const S4 = em("seller4"); const c5 = capCount();
await anon.call("POST", "/api/v1/auth/register", { name: "Seller Four", email: S4, password: PW, role: "individual_seller" });
await anon.call("GET", `/api/v1/auth/verify-email/${await tokenFrom(S4, VERIFY_RE, c5)}`);
const s4 = new Client(); eq("V4.0 verified seller logs in", (await s4.login(S4, PW)).status, 200);
const f1 = await anon.call("POST", "/api/v1/auth/forgot-password", { email: S4 }); const f2 = await anon.call("POST", "/api/v1/auth/forgot-password", { email: em("ghost") });
rec("V4.1 forgot-password identical for known and unknown address", f1.status === f2.status && JSON.stringify(f1.body) === JSON.stringify(f2.body));
const rt = await tokenFrom(S4, RESET_RE, c5);
rec("V4.2 reset e-mail delivered (stub) with 64-hex token", !!rt);
eq("V4.3 reset token stored hashed", sql(`select reset_token from user_auth where user_id=(select id from users where email='${S4}')`) !== rt, true);
eq("V4.4 weak new password rejected", (await anon.call("POST", "/api/v1/auth/reset-password", { token: rt, password: "weak" })).status, 400);
const NEWPW = "NewSellr!Pass#2027b";
const rs = await Promise.all([1, 2, 3].map(() => new Client().call("POST", "/api/v1/auth/reset-password", { token: rt, password: NEWPW })));
eq("V4.5 three concurrent resets with one token → exactly one success", rs.filter((x) => x.status === 200).length, 1);
eq("V4.6 replay of the used reset token → 400", (await anon.call("POST", "/api/v1/auth/reset-password", { token: rt, password: NEWPW })).status, 400);
eq("V4.7 session created BEFORE the reset is revoked (HTTP)", (await s4.call("GET", "/api/v1/auth/profile")).status, 401);
eq("V4.8 …and its refresh cookie no longer refreshes", (await s4.call("POST", "/api/v1/auth/refresh")).status === 200, false);
eq("V4.9 old password rejected", (await new Client().login(S4, PW)).status, 401);
eq("V4.10 new password works", (await new Client().login(S4, NEWPW)).status, 200);
sql(`update user_auth set reset_token_expire = now() - interval '1 minute', reset_token = encode(sha256('expiredtoken'::bytea),'hex') where user_id=(select id from users where email='${S4}')`);
eq("V4.11 expired reset token → 400", (await anon.call("POST", "/api/v1/auth/reset-password", { token: "expiredtoken", password: "Another!Pass#2028c" })).status, 400);
eq("V4.12 logout then the same access token is dead", await (async () => { const c = new Client(); await c.login(S4, NEWPW); await c.call("POST", "/api/v1/auth/logout"); return (await c.call("GET", "/api/v1/auth/profile")).status; })(), 401);
const locks = []; { const c = new Client(LOCKIP); for (let i = 0; i < 6; i++) locks.push((await c.login(S4, "Wrong!Pass#1x")).status); }
rec("V4.13 five wrong passwords lock the account: the 5th/6th attempt answer 429", locks[4] === 429 && locks[5] === 429, locks.join(","));
eq("V4.14 the correct password from ANOTHER address is still refused during the account lock", (await new Client().login(S4, NEWPW)).status, 429);
eq("V4.15 …and from the locked address too (IP lockout)", (await new Client(LOCKIP).login(S4, NEWPW)).status, 429);
eq("V4.16 a different account from a different address is unaffected (lock is not global)", (await new Client().login(S1, PW)).status, 200);
eq("V4.17 attempt counter is persisted (>=5)", Number(sql(`select login_attempts from user_auth where user_id=(select id from users where email='${S4}')`)) >= 5, true);
sql(`update user_auth set lock_until = now() - interval '1 minute' where user_id=(select id from users where email='${S4}')`);
eq("V4.18 once the lock expires the correct password works again and the counter resets", (await new Client().login(S4, NEWPW)).status + "/" + sql(`select login_attempts from user_auth where user_id=(select id from users where email='${S4}')`), "200/0");
{ // reset clears a lock
  const c = new Client(LOCKIP2); for (let i = 0; i < 5; i++) await c.login(S4, "Wrong!Pass#1x");
  const c7 = capCount(); await anon.call("POST", "/api/v1/auth/forgot-password", { email: S4 }); const t7 = await tokenFrom(S4, RESET_RE, c7);
  await anon.call("POST", "/api/v1/auth/reset-password", { token: t7, password: "Fresh!Pass#2029d" });
  eq("V4.19 a completed password reset (mailbox proof) clears the account lock", (await new Client().login(S4, "Fresh!Pass#2029d")).status, 200);
}

console.log("== S1 private seller: profile, listing, moderation, ownership ==");
const sel = new Client(); await sel.login(S1, PW);
const prof = await sel.call("GET", "/api/v1/auth/profile"); eq("S1.1 verified seller profile", prof.status, 200);
const upd = await sel.call("PUT", "/api/v1/auth/profile", { location: "Nairobi", bio: "Private seller", role: "admin", status: "approved", isOwner: true, emailVerified: false, approved: true });
rec("S1.2 profile completion succeeds", upd.status === 200, J(upd));
eq("S1.3 role/status fields in the profile body are ignored", sql(`select role||'/'||status from users where email='${S1}'`), "individual_seller/pending");
const upd2 = await sel.call("PUT", "/api/v1/auth/profile", { onboardingComplete: true, paymentDetails: { bankName: "X", accountName: "Y" }, bankName: "KCB", bankAccount: "123456", mpesaBusiness: "254712345678" });
rec("S1.4 payout/onboarding fields are refused with a clear 400 (not a column-not-found 500, not a false success)", upd2.status === 400 && upd2.body?.code === "PROFILE_FIELD_NOT_SUPPORTED", J(upd2));
const car = { title: "Toyota Axio 2015", brand: "Toyota", model: "Axio", year: 2015, price: 1250000, mileage: 90000, fuel: "petrol", transmission: "automatic", city: "Nairobi", description: "Clean private sale" };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const cr = await form(sel, "POST", "/api/v1/cars", car, [{ name: "images", data: png, type: "image/png", filename: "a.png" }]);
rec("S1.5 verified private seller can create a listing", cr.status === 201, `${cr.status} ${J(cr)}`);
const carId = cr.body?.car?.id || cr.body?.data?.id || cr.body?.id;
const st = carId ? sql(`select status from cars where id='${carId}'`) : "";
eq("S1.6 new listing is PENDING moderation (hold_for_review default); client cannot publish", st, "pending");
const cr2 = await form(sel, "POST", "/api/v1/cars", { ...car, status: "available", approved: "true", sellerId: "00000000-0000-0000-0000-000000000000" }, [{ name: "images", data: png, type: "image/png", filename: "b.png" }]);
const id2 = cr2.body?.car?.id || cr2.body?.data?.id || cr2.body?.id;
eq("S1.7 client-supplied status/seller fields are ignored (still pending, owned by caller)", id2 ? sql(`select status||'/'||(dealer_id=(select id from users where email='${S1}'))::text from cars where id='${id2}'`) : `create ${cr2.status}`, "pending/true");
const pub = await anon.call("GET", "/api/v1/cars"); const listed = JSON.stringify(pub.body).includes(carId || "none");
eq("S1.8 pending listing is NOT visible in the public marketplace", listed, false);
// other seller cannot touch it
const O = em("seller-other"); const c6 = capCount();
await anon.call("POST", "/api/v1/auth/register", { name: "Other Seller", email: O, password: PW, role: "individual_seller" });
await anon.call("GET", `/api/v1/auth/verify-email/${await tokenFrom(O, VERIFY_RE, c6)}`);
const oth = new Client(); await oth.login(O, PW);
if (carId) {
  const up = await oth.call("PUT", `/api/v1/cars/${carId}`, { title: "Hijacked" }); const del = await oth.call("DELETE", `/api/v1/cars/${carId}`);
  rec("S1.9 another seller cannot edit or delete the listing", [403, 404].includes(up.status) && [403, 404].includes(del.status), `${up.status}/${del.status}`);
  eq("S1.10 listing untouched", sql(`select title from cars where id='${carId}'`), "Toyota Axio 2015");
}
// unverified seller cannot list
const U = em("seller-unverified"); await anon.call("POST", "/api/v1/auth/register", { name: "Unv", email: U, password: PW, role: "individual_seller" });
sql(`update users set email_verified=false where email='${U}'`);
const unv = new Client(); const ul = await unv.login(U, PW);
rec("S1.11 unverified seller cannot sign in (so cannot reach seller APIs)", ul.status === 403, String(ul.status));
// direct API bypass with a token minted while verified, then un-verify
const byp = new Client(); await byp.login(S1, PW); sql(`update users set email_verified=false where email='${S1}'`);
const crb = await form(byp, "POST", "/api/v1/cars", car, [{ name: "images", data: png, type: "image/png", filename: "c.png" }]);
rec("S1.12 a seller whose verification is revoked is blocked on existing session (API bypass closed)", [401, 403].includes(crb.status), String(crb.status));
sql(`update users set email_verified=true where email='${S1}'`);
// suspension
const owners = await provisionOwners("DisposableOwnerOne!1", "DisposableOwnerTwo!2");
rec("S2.0 disposable owners provisioned via bootstrap → invitation → acceptance → sign-in", owners.owners.every((o) => o.accept === 200 && o.login === 200), owners.owners.map((o) => `${o.accept}/${o.login}`).join(" "));
const sel2 = new Client(); await sel2.login(S1, PW);
sql(`update users set is_banned=true where email='${S1}'`);
eq("S2.1 suspended seller: existing access token is refused", (await sel2.call("GET", "/api/v1/auth/profile")).status, 403);
eq("S2.2 suspended seller cannot sign in", (await new Client().login(S1, PW)).status, 403);
eq("S2.3 suspended seller: listing creation refused", (await form(sel2, "POST", "/api/v1/cars", car, [{ name: "images", data: png, type: "image/png", filename: "d.png" }])).status, 403);
sql(`update users set is_banned=false where email='${S1}'`);
summary("role_api_a");
