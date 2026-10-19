/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C — Part E: phone OTP (SMS) — generation, delivery truthfulness, secrecy, attempts, resend invalidation, expiry, replay, binding. Real stack, SMS provider STUB.
import fs from "node:fs";
import { Client, sql, sleep, rec, eq, summary, rawUser, FAIL } from "./lib.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`;
const PW = "Buyer!Pass#2026a"; const SMS = "/home/claude/s5c/stack/sms-captures.jsonl", SMSFAIL = "/home/claude/s5c/stack/sms.fail";
try { fs.unlinkSync(SMSFAIL); } catch { /* absent */ }
const smsAll = () => (fs.existsSync(SMS) ? fs.readFileSync(SMS, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : []);
const codeFrom = (n) => { const m = /(\d{6})/.exec(smsAll().slice(n).filter((x) => !x.failed).pop()?.message || ""); return m ? m[1] : null; };
const mk = async (phone) => { const e = em("otp" + Math.floor(Math.random() * 1e6)); rawUser(e, "user", PW, true); sql(`update users set phone='${phone}' where email='${e}'`); const c = IPC(); await c.login(e, PW); return { e, c, id: sql(`select id from users where email='${e}'`) }; };
const J = (r) => JSON.stringify(r.body).slice(0, 200);
const ph = () => `07${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
let __ipn = 0; const IPC = () => new Client(`198.51.100.${(++__ipn % 250) + 1}`);

console.log("== P1 delivery truthfulness ==");
const A = await mk(ph()); let n0 = smsAll().length;
const s1 = await A.c.call("POST", "/api/v1/auth/send-otp", {});
const code1 = codeFrom(n0);
rec("P1.1 send-otp → 200 and the SMS was actually handed to the provider (captured) with a 6-digit code", s1.status === 200 && /^\d{6}$/.test(code1 || ""), `${s1.status} ${J(s1)} code=${code1 ? "present" : "none"}`);
eq("P1.2 db: one pending challenge, code stored hashed (no plaintext)", sql(`select count(*) from otp_challenges where user_id='${A.id}' and status='pending' and code_hash <> '${code1}' and length(code_hash)=64`), "1");
const leaks = ["communication_deliveries", "audit_logs", "notifications", "otp_challenges"].map((t) => `${t}=${sql(`select count(*) from ${t} x where x::text like '%${code1}%'`)}`);
rec("P1.3 the OTP value is in NO ledger/audit/notification/challenge row", leaks.every((x) => x.endsWith("=0")), leaks.join(" "));
const resp = JSON.stringify(s1.body); rec("P1.4 the response never contains the code", !resp.includes(code1));
// provider failure
const B = await mk(ph()); fs.writeFileSync(SMSFAIL, "1"); const sF = await B.c.call("POST", "/api/v1/auth/send-otp", {}); fs.unlinkSync(SMSFAIL);
rec("P1.5 provider rejection → NOT reported as sent (5xx), challenge marked delivery_failed", sF.status >= 500 && sql(`select status from otp_challenges where user_id='${B.id}'`) === "delivery_failed", `${sF.status} ${J(sF)}`);
// rollout switch off → previously a silent false success
const C = await mk(ph()); sql(`update communication_event_controls set enabled=false where event_type='account.phone_verification' and channel='sms'`);
const nOff = smsAll().length; const sOff = await C.c.call("POST", "/api/v1/auth/send-otp", {});
sql(`update communication_event_controls set enabled=true where event_type='account.phone_verification' and channel='sms'`);
rec("P1.6 channel/event switched OFF by rollout controls → honest failure (503), nothing sent, never 'code sent'", sOff.status === 503 && smsAll().length === nOff, `${sOff.status} ${J(sOff)}`);

console.log("== P2 verification, attempts, binding ==");
eq("P2.1 non-6-digit code → 400", (await A.c.call("POST", "/api/v1/auth/verify-phone", { otp: "1234" })).status, 400);
eq("P2.2 non-numeric code → 400", (await A.c.call("POST", "/api/v1/auth/verify-phone", { otp: "abcdef" })).status, 400);
const wrong = code1 === "000000" ? "111111" : "000000";
const w1 = await A.c.call("POST", "/api/v1/auth/verify-phone", { otp: wrong });
rec("P2.3 wrong code → 400 and phone NOT verified", w1.status === 400 && sql(`select phone_verified from users where id='${A.id}'`) === "f", J(w1));
const D = await mk(ph()); n0 = smsAll().length; await D.c.call("POST", "/api/v1/auth/send-otp", {}); const dcode = codeFrom(n0);
eq("P2.4 binding: user A cannot verify with user D's code", (await A.c.call("POST", "/api/v1/auth/verify-phone", { otp: dcode })).status, 400);
eq("P2.5 …and D's challenge was not consumed by that attempt", sql(`select status from otp_challenges where user_id='${D.id}'`), "pending");
// attempts → lock (fresh user so the 6/min burst guard is not what stops us)
const L = await mk(ph()); n0 = smsAll().length; await L.c.call("POST", "/api/v1/auth/send-otp", {}); const lcode = codeFrom(n0); const lw = lcode === "000000" ? "111111" : "000000";
for (let i = 0; i < 5; i++) await L.c.call("POST", "/api/v1/auth/verify-phone", { otp: lw });
eq("P2.6 5 wrong attempts lock the challenge", sql(`select status from otp_challenges where user_id='${L.id}' order by created_at desc limit 1`), "locked");
await sleep(61000);
const locked = await L.c.call("POST", "/api/v1/auth/verify-phone", { otp: lcode });
rec("P2.7 after lock even the CORRECT code is refused (400, not 200)", locked.status === 400, J(locked));
eq("P2.8 phone still unverified", sql(`select phone_verified from users where id='${L.id}'`), "f");
const burst = await Promise.all(Array.from({ length: 9 }, () => L.c.call("POST", "/api/v1/auth/verify-phone", { otp: lw })));
rec("P2.8b per-user burst guard: a flood of verify calls is throttled (429 appears)", burst.some((r) => r.status === 429), burst.map((r) => r.status).join(","));
// correct code, concurrency, replay
const E = await mk(ph()); n0 = smsAll().length; await E.c.call("POST", "/api/v1/auth/send-otp", {}); const ecode = codeFrom(n0);
const race = await Promise.all(Array.from({ length: 5 }, () => E.c.call("POST", "/api/v1/auth/verify-phone", { otp: ecode })));
rec("P2.9 concurrent verification with the right code: succeeds, no 5xx", race.some((r) => r.status === 200) && race.every((r) => r.status < 500), race.map((r) => r.status).join(","));
eq("P2.10 phone_verified true only after server validation", sql(`select phone_verified from users where id='${E.id}'`), "t");
eq("P2.11 challenge consumed exactly once (status verified, single row)", sql(`select count(*) from otp_challenges where user_id='${E.id}' and status='verified'`), "1");
const F = await mk(ph()); n0 = smsAll().length; await F.c.call("POST", "/api/v1/auth/send-otp", {}); const fcode = codeFrom(n0);
eq("P2.12 correct code verifies (200)", (await F.c.call("POST", "/api/v1/auth/verify-phone", { otp: fcode })).status, 200);
sql(`update users set phone_verified=false where id='${F.id}'`);
rec("P2.13 replay of a consumed code is refused (400)", (await F.c.call("POST", "/api/v1/auth/verify-phone", { otp: fcode })).status === 400);

console.log("== P3 resend, expiry, rate limit ==");
const G = await mk(ph()); n0 = smsAll().length; await G.c.call("POST", "/api/v1/auth/send-otp", {}); const g1 = codeFrom(n0);
n0 = smsAll().length; await G.c.call("POST", "/api/v1/auth/send-otp", {}); const g2 = codeFrom(n0);
eq("P3.1 resend leaves exactly ONE pending challenge (older invalidated)", sql(`select count(*) from otp_challenges where user_id='${G.id}' and status='pending'`), "1");
const old = g1 && g1 !== g2 ? await G.c.call("POST", "/api/v1/auth/verify-phone", { otp: g1 }) : { status: 400 };
rec("P3.2 the OLD code no longer verifies after a resend", old.status === 400, `${old.status}`);
sql(`update otp_challenges set expires_at=now()-interval '1 minute' where user_id='${G.id}' and status='pending'`);
const exp = await G.c.call("POST", "/api/v1/auth/verify-phone", { otp: g2 });
rec("P3.3 an EXPIRED code is refused with an 'expired' message", exp.status === 400 && /expired/i.test(J(exp)), J(exp));
const H = await mk(ph()); const codes = [];
for (let i = 0; i < 4; i++) codes.push((await H.c.call("POST", "/api/v1/auth/send-otp", {})).status);
rec("P3.4 per-recipient limit: 3 codes / 15 min, the 4th is 429", codes.slice(0, 3).every((s) => s === 200) && codes[3] === 429, codes.join(","));
const anonSend = await new Client().call("POST", "/api/v1/auth/send-otp", {});
eq("P3.5 anonymous send-otp → 401", anonSend.status, 401);

console.log("== P4 dealer phone-verification endpoint (6-digit contract) ==");
const DL = em("dealer-otp"); const dreg = await new Client().call("POST", "/api/v1/auth/register", { name: "Dealer Otp", email: DL, password: PW, role: "dealer", phone: ph(), businessName: "Otp Motors", location: "Nairobi" });
sql(`update users set email_verified=true where email='${DL}'`);
const dc = new Client(); await dc.login(DL, PW);
const noVer = await dc.call("POST", "/api/verification/phone/request", {});
rec("P4.1 phone verification before submitting dealer verification is refused (400)", noVer.status === 400, `${noVer.status} ${J(noVer)}`);
await dc.call("PUT", "/api/dealer/onboarding", { businessName: "Otp Motors", location: "Nairobi", paymentDetails: { bankName: "Test Bank", accountName: "Otp Motors", accountNumber: "1234567890", mpesaPhone: "0712345678" }, documents: { governmentId: { type: "national_id", documentNumber: "12345678" }, kraPin: { pinNumber: "A123456789Z" } } });
n0 = smsAll().length; const rq = await dc.call("POST", "/api/verification/phone/request", {}); const dcode2 = codeFrom(n0);
rec("P4.2 dealer phone request → 200, SMS handed to provider, code is 6 digits", rq.status === 200 && /^\d{6}$/.test(dcode2 || ""), `${rq.status} ${J(rq)}`);
rec("P4.3 response masks the phone number", /\*/.test(JSON.stringify(rq.body.phoneNumber || "")), J(rq));
eq("P4.4 4-digit code rejected by the 6-digit contract (400)", (await dc.call("POST", "/api/verification/phone/verify", { otp: "1234" })).status, 400);
const dv = await dc.call("POST", "/api/verification/phone/verify", { otp: dcode2 });
rec("P4.5 dealer phone verify with the right 6-digit code → 200, phone_verified true", dv.status === 200 && sql(`select phone_verified from users where email='${DL}'`) === "t", `${dv.status} ${J(dv)}`);
summary("role_api_e");
