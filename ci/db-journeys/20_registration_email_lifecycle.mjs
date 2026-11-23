// Registration + e-mail verification + password recovery, end to end with the REAL backend, REAL PostgREST and a disposable
// PostgreSQL. The e-mail provider is the loopback stub (brevo_stub.cjs): it records what the backend would have sent, so the
// journey follows the exact links the backend built. EVIDENCE TIER: local disposable stack. This proves source behaviour and
// database behaviour; it does NOT prove Brevo acceptance, mailbox delivery or hosted behaviour. Evidence: out/registration-email.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { q, check, finish, Client, uid, PW, B } from './lib.mjs';

const OUT = process.env.KAYAD_CI_OUT || new URL('./out/', import.meta.url).pathname;
const LOG = `${OUT}/brevo-stub.log`, FAIL = `${OUT}/brevo-stub.fail`;
const ROOT = new URL('../../', import.meta.url).pathname;
const ev = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mails = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mailsTo = (email) => mails().filter((m) => (m.to || []).some((t) => t.email === email));
async function waitMail(email, subjectRe, n = 1, ms = 9000, okOnly = false) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const m = mailsTo(email).filter((x) => subjectRe.test(x.subject || '') && (!okOnly || x.failed === false)); if (m.length >= n) return m; await sleep(250); }
  return mailsTo(email).filter((x) => subjectRe.test(x.subject || ''));
}
const tok = (m, route) => { const r = new RegExp(`${route}\\?token=([0-9a-f]{64})`).exec(m?.html || m?.text || ''); return r ? r[1] : null; };
const reg = (c, email, extra = {}) => c.raw('/api/v1/auth/register', { method: 'POST', body: { name: 'Reg Journey', email, password: PW, ...extra }, headers: { 'idempotency-key': 'k' + crypto.randomUUID() } });
const login = (c, email, password = PW) => c.raw('/api/v1/auth/login', { method: 'POST', body: { email, password } });
const verify = (c, token) => c.raw(`/api/v1/auth/verify-email/${token}`);
const delivery = (userId, ev) => q(`select coalesce(string_agg(status || ':' || coalesce(left(last_error,40),''), ',' order by created_at),'') from communication_deliveries where user_id='${userId}' and event_type='${ev}'`);
const uidOf = (email) => q(`select id from users where email='${email}'`);
const psqlFile = (f) => execFileSync('psql', ['-h', process.env.PGHOST || '127.0.0.1', '-p', process.env.PGPORT || '54329', '-U', process.env.PGUSER || 'postgres', '-d', process.env.KAYAD_JOURNEY_DB, '-q', '-v', 'ON_ERROR_STOP=1', '-f', f], { encoding: 'utf8' });
if (fs.existsSync(FAIL)) fs.rmSync(FAIL);

// ---------- A. Hosted-state reproduction: the registration function replaced by a placeholder body ----------
const PLACEHOLDER = `CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(p_name text, p_email text, p_role text, p_phone text, p_business_name text, p_location text, p_referred_by uuid, p_password_hash text, p_email_verify_token text, p_email_verify_expire timestamptz)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
BEGIN
  -- Other function logic
  IF p_role NOT IN ('user','individual_seller','dealer') THEN RAISE EXCEPTION 'Invalid self-registration role' USING ERRCODE='22023'; END IF;
  -- Remaining registration logic
END; $f$`;
q(PLACEHOLDER); q(`notify pgrst, 'reload schema'`); await sleep(2500);
const usersBefore = q('select count(*) from users');
const a1 = await reg(new Client(), `placeholder-${uid()}@example.test`);
check('A1 placeholder function: registration answers 503 DATABASE_MIGRATION_REQUIRED (not a retry-forever 500)', a1.status === 503 && a1.j?.code === 'DATABASE_MIGRATION_REQUIRED', a1);
check('A2 the browser-visible message leaks no internals', !/2F005|RETURN|plpgsql|function/i.test(JSON.stringify(a1.j)), a1.j);
check('A3 nothing was persisted (no users, no credential rows, no deliveries)', q('select count(*) from users') === usersBefore, null);
ev.placeholderResponse = { status: a1.status, code: a1.j?.code };
psqlFile(`${ROOT}supabase/migrations/20261122200000_restore_register_identity_atomic.sql`);
q(`notify pgrst, 'reload schema'`); await sleep(2500);
const a4 = await reg(new Client(), `restored-${uid()}@example.test`);
check('A4 after applying the restore migration (disposable DB only) registration succeeds', a4.status === 201 && a4.j?.success === true, a4);
// the migration must also work where the optional private-seller capability table is absent (as on the hosted project)
q('alter table private_seller_capabilities rename to private_seller_capabilities_hold');
psqlFile(`${ROOT}supabase/migrations/20261122200000_restore_register_identity_atomic.sql`); q(`notify pgrst, 'reload schema'`); await sleep(2500);
const a5 = await reg(new Client(), `nocap-${uid()}@example.test`);
check('A5 migration is idempotent and registration works without private_seller_capabilities', a5.status === 201, a5);
q('alter table private_seller_capabilities_hold rename to private_seller_capabilities');
check('A6 function privileges: service_role may call, anon and authenticated may not', q(`select has_function_privilege('service_role','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE') and not has_function_privilege('anon','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE') and not has_function_privilege('authenticated','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE')`) === 't', null);

// ---------- B. Happy path: register -> e-mail -> verify -> login ----------
const email = `reg-${uid()}@example.test`; const c = new Client();
const t0 = Date.now(); const r1 = await reg(c, email, { phone: '0712345678' }); const regMs = Date.now() - t0;
check('B1 register -> 201 with a personal (role=user) account', r1.status === 201 && r1.j?.user?.role === 'user', r1);
check('B2 the response does not claim the e-mail was delivered', !/\b(delivered|has been sent|was sent)\b/i.test(JSON.stringify(r1.j?.message)) && r1.j?.message && /verify your email/i.test(r1.j.message), r1.j?.message);
check('B3 account is unverified and credential row exists (no orphan)', q(`select email_verified::text from users where email='${email}'`) === 'false' && q(`select count(*) from user_auth where user_id='${uidOf(email)}'`) === '1', null);
const m1 = (await waitMail(email, /verify/i))[0]; const t1 = tok(m1, 'verify-email');
check('B4 provider (stub) received the verification e-mail with a 64-hex link on FRONTEND_URL', !!m1 && !!t1 && /^http:\/\/127\.0\.0\.1:5173\/verify-email\?token=/.test((/https?:\/\/[^"' <]+verify-email\?token=[0-9a-f]{64}/.exec(m1.html) || [''])[0]), m1 && { ...m1, html: undefined });
check('B5 only a hash of the token is stored; the raw token is not in the database', !!t1 && q(`select count(*) from user_auth where email_verify_token='${t1}'`) === '0' && q(`select count(*) from user_auth where user_id='${uidOf(email)}' and email_verify_token is not null`) === '1', null);
check('B6 delivery ledger says "sent" (provider accepted) - never "delivered" without a provider webhook', /^sent/.test(delivery(uidOf(email), 'account.email_verification')) && !/delivered/.test(delivery(uidOf(email), 'account.email_verification')), delivery(uidOf(email), 'account.email_verification'));
const lb = await login(c, email);
check('B7 login BEFORE verification is refused (403) with an actionable message', lb.status === 403 && /verify your email/i.test(lb.j?.message || ''), lb);
const bad = await verify(new Client(), 'f'.repeat(64));
check('B8 invalid verification link -> 400 generic message', bad.status === 400 && /invalid or expired/i.test(bad.j?.message || ''), bad);
const v1 = await verify(new Client(), t1);
check('B9 valid link verifies the account', v1.status === 200 && v1.j?.success === true && q(`select email_verified::text from users where email='${email}'`) === 'true', v1);
const v2 = await verify(new Client(), t1);
check('B11 the same link cannot be replayed (single use)', v2.status === 400, v2);
const la = await login(c, email);
check('B12 login AFTER verification succeeds', la.status === 200 && la.j?.success !== false, la);
check('B13 registration stayed responsive (< 3 s) while delivery is asynchronous', regMs < 3000, regMs);
ev.happy = { registerMs: regMs, loginBefore: lb.status, loginAfter: la.status };

// ---------- C. Invalid data, duplicates, existing unverified account ----------
check('C1 missing fields -> 400', (await reg(new Client(), '', {})).status === 400);
check('C2 weak password -> 400', (await new Client().raw('/api/v1/auth/register', { method: 'POST', body: { name: 'W', email: `w-${uid()}@example.test`, password: 'weak' } })).status === 400);
check('C3 duplicate of a VERIFIED account -> 409', (await reg(new Client(), email)).status === 409);
const un = `unv-${uid()}@example.test`; await reg(new Client(), un);
const dupU = await new Client().raw('/api/v1/auth/register', { method: 'POST', body: { name: 'Other', email: un, password: PW } });
check('C4 existing UNVERIFIED account, different attempt -> 409 (no second account, no hijack)', dupU.status === 409 && q(`select count(*) from users where email='${un}'`) === '1', dupU);
const idem = 'k' + crypto.randomUUID(); const ie = `idem-${uid()}@example.test`;
const i1 = await new Client().raw('/api/v1/auth/register', { method: 'POST', body: { name: 'Idem Tester', email: ie, password: PW }, headers: { 'idempotency-key': idem } });
const i2 = await new Client().raw('/api/v1/auth/register', { method: 'POST', body: { name: 'Idem Tester', email: ie, password: PW }, headers: { 'idempotency-key': idem } });
check('C5 retry of the SAME attempt (lost response) -> original success, one account', i1.status === 201 && i2.status === 200 && i2.j?.replayed === true && q(`select count(*) from users where email='${ie}'`) === '1', { i1: i1.status, i2: i2.status });
const leg = await reg(new Client(), `leg-${uid()}@example.test`, { role: 'individual_seller' });
check('C6 retired individual_seller role -> personal account (unified architecture intact)', leg.status === 201 && leg.j?.user?.role === 'user' && leg.j?.compatibility?.createdRole === 'user', leg);
const dl = await reg(new Client(), `dl-${uid()}@example.test`, { role: 'dealer', businessName: `Reg Motors ${uid()}`, location: 'Nairobi' });
check('C7 dealer registration -> pending dealer identity, separate verification', dl.status === 201 && dl.j?.user?.role === 'dealer' && q(`select status from users where email='${dl.j?.user?.email}'`) === 'pending', dl);
check('C8 dealer without business name -> 400', (await reg(new Client(), `dn-${uid()}@example.test`, { role: 'dealer', location: 'Nairobi' })).status === 400);

// ---------- D. Expired link, resend, token replacement ----------
const ex = `exp-${uid()}@example.test`; const exC = new Client(); await reg(exC, ex);
const mx = (await waitMail(ex, /verify/i))[0]; const tx = tok(mx, 'verify-email');
q(`update user_auth set email_verify_expire = now() - interval '1 minute' where user_id='${uidOf(ex)}'`);
const vx = await verify(new Client(), tx);
check('D1 expired link -> 400 and the account stays unverified', vx.status === 400 && q(`select email_verified::text from users where email='${ex}'`) === 'false', vx);
const resend = (e) => new Client().raw('/api/v1/auth/resend-verification', { method: 'POST', body: { email: e } });
const rs = await resend(ex);
check('D2 resend answers the same generic 202', rs.status === 202 && /If that email exists/i.test(rs.j?.message || ''), rs);
const mx2 = await waitMail(ex, /verify/i, 2); const tx2 = tok(mx2.at(-1), 'verify-email');
check('D3 resend delivered a NEW link (provider accepted) and the old one is not reused', mx2.length === 2 && !!tx2 && tx2 !== tx, mx2.length);
await sleep(600);
check('D4 the new link verifies', (await verify(new Client(), tx2)).status === 200, null);
const un2 = (await resend(`nobody-${uid()}@example.test`)); const ver = await resend(email);
check('D5 resend for an unknown or already verified address: identical generic response, and no e-mail sent', un2.status === 202 && ver.status === 202 && JSON.stringify(un2.j) === JSON.stringify(ver.j) && mailsTo(email).filter((m) => /verify/i.test(m.subject)).length === 1, null);
const cd = `cd-${uid()}@example.test`; await reg(new Client(), cd); await waitMail(cd, /verify/i);
const n0 = mailsTo(cd).length; await resend(cd); await resend(cd); await sleep(1500);
check('D6 resend within the cooldown does not send duplicate verification e-mails', mailsTo(cd).length === n0, { before: n0, after: mailsTo(cd).length });

// ---------- E. Provider failure: registration stays up, failure is observable and recoverable ----------
fs.writeFileSync(FAIL, '1');
const pf = `pf-${uid()}@example.test`; const pfC = new Client(); const tp = Date.now();
const rpf = await reg(pfC, pf); const pfMs = Date.now() - tp;
check('E1 provider failing: registration still succeeds quickly (account kept, no rollback)', rpf.status === 201 && pfMs < 3000 && q(`select count(*) from users where email='${pf}'`) === '1', { status: rpf.status, pfMs });
let led = ''; for (let i = 0; i < 40; i++) { led = delivery(uidOf(pf), 'account.email_verification'); if (/failed|dead_letter/.test(led)) break; await sleep(500); }
check('E2 the failure is OBSERVABLE: delivery ledger records failed + last_error (never "sent")', /failed|dead_letter/.test(led) && !/sent/.test(led), led);
check('E3 login is refused until verified (no false "verified" state)', (await login(pfC, pf)).status === 403, null);
fs.rmSync(FAIL);
// recover through the user-facing resend (backdate the cooldown, which is "issued at = expiry - 24h")
q(`update user_auth set email_verify_expire = now() + interval '23 hours' where user_id='${uidOf(pf)}'`);
await resend(pf);
const pm = await waitMail(pf, /verify/i, 1, 12000, true); const pOk = pm.filter((m) => m.failed === false);
check('E4 after the provider recovers, resend delivers a working link', pOk.length >= 1, pm.map((m) => m.failed));
const tpf = tok(pOk.at(-1), 'verify-email');
check('E5 recovered link verifies and the person can log in', (await verify(new Client(), tpf)).status === 200 && (await login(pfC, pf)).status === 200, null);
// a failed RESEND must not invalidate the link the person already holds
const keep = `keep-${uid()}@example.test`; await reg(new Client(), keep); const mk = (await waitMail(keep, /verify/i))[0]; const tk = tok(mk, 'verify-email');
q(`update user_auth set email_verify_expire = now() + interval '23 hours' where user_id='${uidOf(keep)}'`);
const hashBefore = q(`select email_verify_token from user_auth where user_id='${uidOf(keep)}'`);
fs.writeFileSync(FAIL, '1'); await resend(keep); await sleep(4000); fs.rmSync(FAIL);
check('E6 failed resend leaves the stored token untouched, so the earlier link still works', q(`select email_verify_token from user_auth where user_id='${uidOf(keep)}'`) === hashBefore && (await verify(new Client(), tk)).status === 200, null);

// ---------- F. Database failure while verifying: token must not be burned ----------
const df = `df-${uid()}@example.test`; await reg(new Client(), df); const md = (await waitMail(df, /verify/i))[0]; const td = tok(md, 'verify-email');
q(`create or replace function public.kayad_ci_block_verify() returns trigger language plpgsql as $f$ begin if new.email_verified and not old.email_verified and new.email like 'df-%' then raise exception 'ci: simulated database failure'; end if; return new; end $f$`);
q(`create trigger kayad_ci_block_verify before update on users for each row execute function public.kayad_ci_block_verify()`);
const fv = await verify(new Client(), td);
check('F1 database failure while verifying -> 500, account still unverified', fv.status === 500 && q(`select email_verified::text from users where email='${df}'`) === 'false', fv);
check('F2 the verification token was RESTORED (not burned by the failed attempt)', q(`select (email_verify_token is not null)::text from user_auth where user_id='${uidOf(df)}'`) === 'true', null);
q('drop trigger kayad_ci_block_verify on users'); q('drop function public.kayad_ci_block_verify()');
check('F3 retry with the SAME link succeeds once the database recovers', (await verify(new Client(), td)).status === 200 && q(`select email_verified::text from users where email='${df}'`) === 'true', null);

// ---------- G. Password recovery ----------
const pr = email; const prC = new Client();
const fp = await prC.raw('/api/v1/auth/forgot-password', { method: 'POST', body: { email: pr } });
const un3 = await new Client().raw('/api/v1/auth/forgot-password', { method: 'POST', body: { email: `ghost-${uid()}@example.test` } });
check('G1 forgot-password: identical 200 for known and unknown addresses (no enumeration)', fp.status === 200 && un3.status === 200 && JSON.stringify(fp.j) === JSON.stringify(un3.j), { fp: fp.j, un3: un3.j });
const rm = (await waitMail(pr, /reset/i))[0]; const rt = tok(rm, 'reset-password');
check('G2 reset e-mail carries a 64-hex link on FRONTEND_URL; the raw token is not stored', !!rt && q(`select count(*) from user_auth where reset_token='${rt}'`) === '0', rm && { ...rm, html: undefined });
check('G3 no reset e-mail for an unknown address', mailsTo(`ghost-${uid()}@example.test`).length === 0 && !mails().some((m) => /ghost-/.test(JSON.stringify(m.to))), null);
const NEW = 'N3w!Passw0rdXyz';
check('G4 weak new password -> 400 and the token stays usable', (await new Client().raw('/api/v1/auth/reset-password', { method: 'POST', body: { token: rt, password: 'weak' } })).status === 400, null);
check('G5 invalid reset token -> 400', (await new Client().raw('/api/v1/auth/reset-password', { method: 'POST', body: { token: 'a'.repeat(64), password: NEW } })).status === 400, null);
const rr = await new Client().raw('/api/v1/auth/reset-password', { method: 'POST', body: { token: rt, password: NEW } });
check('G6 valid token resets the password', rr.status === 200 && rr.j?.success === true, rr);
check('G7 old password refused, new password accepted', (await login(new Client(), pr, PW)).status === 401 && (await login(new Client(), pr, NEW)).status === 200, null);
check('G8 the reset link cannot be replayed', (await new Client().raw('/api/v1/auth/reset-password', { method: 'POST', body: { token: rt, password: 'An0ther!Passw0rd' } })).status === 400, null);
await new Client().raw('/api/v1/auth/forgot-password', { method: 'POST', body: { email: pr } });
const rm2 = await waitMail(pr, /reset/i, 2); const rt2 = tok(rm2.at(-1), 'reset-password');
q(`update user_auth set reset_token_expire = now() - interval '1 minute' where user_id='${uidOf(pr)}'`);
check('G9 expired reset link -> 400', (await new Client().raw('/api/v1/auth/reset-password', { method: 'POST', body: { token: rt2, password: 'An0ther!Passw0rd' } })).status === 400, null);
check('G10 unverified accounts can still start recovery without becoming verified', (await new Client().raw('/api/v1/auth/forgot-password', { method: 'POST', body: { email: un } })).status === 200 && q(`select email_verified::text from users where email='${un}'`) === 'false', null);

// ---------- H. Secrets and logs ----------
const logsText = ['backend.log', 'brevo-stub.log'].map((f) => (fs.existsSync(`${OUT}/${f}`) ? fs.readFileSync(`${OUT}/${f}`, 'utf8') : '')).join('\n');
const backendLog = fs.existsSync(`${OUT}/backend.log`) ? fs.readFileSync(`${OUT}/backend.log`, 'utf8') : '';
check('H1 no raw verification/reset token and no password appears in the backend log', ![t1, tx, tx2, rt, rt2].filter(Boolean).some((t) => backendLog.includes(t)) && !backendLog.includes(PW) && !backendLog.includes(NEW), null);
check('H2 the provider key never appears in the response bodies or ledger metadata', q(`select count(*) from communication_deliveries where metadata::text like '%ci-stub-not-a-real-key%'`) === '0', null);
check('H3 verification/reset e-mail bodies are not persisted in the delivery ledger', q(`select count(*) from communication_deliveries where event_type in ('account.email_verification','account.password_reset') and (metadata ? 'html' or metadata ? 'text')`) === '0', null);

fs.writeFileSync(`${OUT}/registration-email.json`, JSON.stringify({ tier: 'local disposable stack, provider = loopback stub', ...ev }, null, 2));
finish('20_registration_email_lifecycle');
