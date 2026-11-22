// Shared harness for database-backed HTTP journeys. SAFE BY CONSTRUCTION: it only talks to a loopback backend and
// a database whose name proves it is disposable. It never needs, reads or writes production credentials.
import { execFileSync, execFile } from 'node:child_process';

export const B = process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055';
const PG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || '54329',
  user: process.env.PGUSER || 'postgres',
  db: process.env.KAYAD_JOURNEY_DB || process.env.PGDATABASE || 'kayad_t',
};
const loopback = (u) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(u);
if (!loopback(B)) throw new Error(`Refusing to run: backend ${B} is not loopback.`);
if (!['127.0.0.1', 'localhost', '::1'].includes(PG.host)) throw new Error(`Refusing to run: database host ${PG.host} is not loopback.`);
if (!/^kayad_(t|ci|test|recon|journey)/.test(PG.db)) throw new Error(`Refusing to run: database "${PG.db}" is not named as disposable (kayad_t|ci|test|recon|journey*).`);

export const PW = 'Str0ng!Passw0rd';
export const q = (sql) => execFileSync('psql', ['-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', PG.db, '-q', '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' }).trim();
/** Async psql (own connection per call) so database races can be driven truly concurrently. */
export const qAsync = (sql) => new Promise((resolve) => execFile('psql', ['-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', PG.db, '-q', '-tAc', sql], { encoding: 'utf8' }, (err, stdout, stderr) => resolve({ ok: !err, out: (stdout || '').trim(), err: (stderr || '').trim() })));
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export class Client {
  constructor() { this.jar = {}; this.csrf = null; }
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  store(r) { for (const c of (r.headers.getSetCookie?.() || [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0, i)] = kv.slice(i + 1); } }
  async raw(path, { method = 'GET', body, headers = {}, form } = {}) {
    if (method !== 'GET' && !this.csrf) {
      const r = await fetch(B + '/api/v1/auth/csrf', { headers: { cookie: this.cookie() } });
      this.store(r); this.csrf = (await r.json()).csrfToken;
    }
    const h = { ...headers, cookie: this.cookie() };
    if (method !== 'GET') { h['x-csrf-token'] = this.csrf; h['x-xsrf-token'] = this.csrf; }
    let b; if (form) b = form; else if (body) { h['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(B + path, { method, headers: h, body: b });
    this.store(r);
    let j = null; try { j = await r.json(); } catch { /* non-JSON */ }
    return { status: r.status, j, headers: r.headers };
  }
}

/** Create a verified user (registration via the real endpoint; verification and staff role set directly in the DISPOSABLE db). */
export async function makeUser({ role = 'user', tag = 'u', extra = {}, dbRole = null, email: fixedEmail = null } = {}) {
  const c = new Client();
  const email = fixedEmail || `${tag}-${uid()}@example.test`;
  const reg = await c.raw('/api/v1/auth/register', { method: 'POST', body: { name: `Journey ${tag}`, email, password: PW, role, ...extra }, headers: { 'idempotency-key': 'k' + crypto.randomUUID() } });
  if (reg.status >= 300) throw new Error(`register ${role} failed: ${reg.status} ${JSON.stringify(reg.j)}`);
  q(`update users set email_verified=true${dbRole ? `, role='${dbRole}'` : ''} where email='${email}'`);
  const login = await c.raw('/api/v1/auth/login', { method: 'POST', body: { email, password: PW } });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.j)}`);
  c.csrf = null; c.email = email; c.id = q(`select id from users where email='${email}'`);
  return c;
}

const results = [];
export const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`); };
export const finish = (suite) => { const f = results.filter((r) => !r.ok).length; console.log(`\n${suite}: ${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0); };

export const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
export function listingForm(title, price = '2800000') {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ title, brand: 'Mazda', model: 'CX-5', year: '2019', price, mileage: '40000', fuel: 'Petrol', transmission: 'Automatic', city: 'Nairobi', description: 'journey', allowBuy: 'true', escrowEnabled: 'true' })) fd.append(k, v);
  fd.append('images', new Blob([PNG_1PX], { type: 'image/png' }), 'a.png');
  return fd;
}
