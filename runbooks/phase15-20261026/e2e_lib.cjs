// Test-only helpers for the disposable local stack (backend -> PostgREST -> PostgreSQL). Never point at staging/production.
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const BASE = process.env.API_BASE || 'http://127.0.0.1:5055';
const PG = { host: '127.0.0.1', port: process.env.PGPORT || '54329', user: 'postgres', db: process.env.PGDB || 'kayad_t' };
if (!/^127\.0\.0\.1|^localhost/.test(new URL(BASE).host)) throw new Error('Refusing to run against a non-local API');
const sql = (q) => execFileSync('psql', ['-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', PG.db, '-Atq', '-c', q], { encoding: 'utf8' }).trim();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + detail)); };
let csrfCache = null;
async function csrf() {
  if (csrfCache) return csrfCache;
  const r = await fetch(BASE + '/api/auth/csrf'); const j = await r.json();
  const ck = (r.headers.getSetCookie().find((s) => s.startsWith('XSRF-TOKEN')) || '').split(';')[0].split('=')[1] || j.csrfToken;
  csrfCache = { token: j.csrfToken || ck, cookie: ck }; return csrfCache;
}
async function call(method, path, { token, jar, body, headers = {}, noCsrf = false, form, csrfHeader } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  const c = await csrf();
  const cookies = [];
  if (jar) for (const [k, v] of Object.entries(jar)) if (k !== 'XSRF-TOKEN') cookies.push(k + '=' + v);
  if (!noCsrf) { h['x-csrf-token'] = csrfHeader === undefined ? c.token : csrfHeader; cookies.push('XSRF-TOKEN=' + c.cookie); }
  if (cookies.length) h.Cookie = cookies.join('; ');
  if (h['x-csrf-token'] === null) delete h['x-csrf-token'];
  let payload;
  if (form) payload = form; else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + path, { method, headers: h, body: payload });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = { _text: text.slice(0, 200) }; }
  return { status: r.status, body: json, headers: r.headers, setCookies: r.headers.getSetCookie() };
}
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const PASSWORD = 'Str0ng!Passw0rd#1';
let seq = 0; const uniq = (p) => `${p}_${Date.now()}_${++seq}@example.test`;
async function register(role, extra = {}) {
  const email = extra.email || uniq(role);
  const r = await call('POST', '/api/auth/register', { body: { name: extra.name || role + ' tester', email, password: extra.password || PASSWORD, role, phone: extra.phone || '07' + String(10000000 + Math.floor(Math.random() * 89999999)), ...(role === 'dealer' ? { businessName: 'Biz ' + email.slice(0, 8), location: 'Nairobi' } : {}), ...extra.body } });
  return { email, res: r, id: r.body?.user?.id };
}
async function verifyEmailViaToken(email) {
  const raw = 'tok_' + crypto.randomBytes(8).toString('hex');
  sql(`update user_auth set email_verify_token='${hashToken(raw)}', email_verify_expire=now()+interval '1 day' where user_id=(select id from users where email='${email}')`);
  return call('GET', '/api/auth/verify-email/' + raw, { noCsrf: true });
}
async function login(email, password = PASSWORD) {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  const jar = {};
  for (const sc of r.headers.getSetCookie()) { const [kv] = sc.split(';'); const i = kv.indexOf('='); if (i > 0 && !/^(Max-Age=0)/.test(kv)) jar[kv.slice(0, i)] = kv.slice(i + 1); }
  return { res: r, jar };
}
// Disposable-DB fixture only: gives a dealer a usable subscription row so listing creation (a payment-gated feature) can be exercised.
const grantFixtureSubscription = (dealerId) => sql(`insert into dealer_subscriptions(dealer,plan_id,plan_name,amount,currency,listing_max,starts_at,expires_at,status) values ('${dealerId}','fixture','Fixture plan',0,'KES',50,now()-interval '1 day',now()+interval '30 days','active')`);
module.exports = { grantFixtureSubscription, BASE, sql, results, check, call, csrf, register, verifyEmailViaToken, login, hashToken, PASSWORD, uniq };
