// Local live CSRF probe against the REAL backend process (degraded mode, no Supabase/Redis). Not a staging result.
// Prints only status codes, header names and cookie attribute flags - never token or cookie values.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = '/home/claude/work/src/KAYAD';
const PORT = '5098';
const env = { ...process.env, NODE_ENV: 'development', PORT, HOST: '127.0.0.1', LOG_SILENT: 'true', DISABLE_REDIS: 'true', KAYAD_ISOLATED_RUNTIME: 'true' };
for (const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','REDIS_URL','REDIS_URI','REDIS_HOST','REDIS_PORT','POSTHOG_API_KEY','SENTRY_DSN']) env[k] = '';
const child = spawn(process.execPath, ['bootstrap.js'], { cwd: path.join(root, 'backend'), env, stdio: ['ignore', 'pipe', 'pipe'] });
let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = `http://127.0.0.1:${PORT}`;
const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} — ${detail}`); };

try {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(B + '/health/live'); if (r.status === 200) break; } catch { if (child.exitCode !== null) throw new Error('backend exited early\n' + out.slice(-800)); } await sleep(250); }

  const csrf = await fetch(B + '/api/v1/auth/csrf', { headers: { Accept: 'application/json' } });
  const body = await csrf.json().catch(() => ({}));
  const token = body.csrfToken || body.token || body?.data?.csrfToken || body?.data?.token;
  const setCookie = csrf.headers.getSetCookie ? csrf.headers.getSetCookie() : [];
  const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
  const flags = setCookie.map(c => ({ name: c.split('=')[0], httpOnly: /httponly/i.test(c), sameSite: (c.match(/samesite=(\w+)/i) || [])[1] || null, secure: /;\s*secure/i.test(c), path: (c.match(/path=([^;]+)/i) || [])[1] || null }));
  rec('GET /api/v1/auth/csrf returns 200 with a token', csrf.status === 200 && !!token, `status=${csrf.status} tokenPresent=${!!token} canonicalHeader=${csrf.headers.get('x-kayad-canonical-route') ? 'present' : 'absent'}`);
  rec('CSRF cookie issued with SameSite set', flags.length > 0 && flags.every(f => f.sameSite), `cookies=${JSON.stringify(flags)}`);

  const loginBody = JSON.stringify({ email: 'csrf-probe@example.invalid', password: 'Not-A-Real-Password-1!' });
  const hdr = { 'content-type': 'application/json', Accept: 'application/json' };

  const noTok = await fetch(B + '/api/v1/auth/login', { method: 'POST', headers: hdr, body: loginBody });
  rec('POST login with NO csrf token/cookie is rejected 403', noTok.status === 403, `status=${noTok.status}`);

  const badTok = await fetch(B + '/api/v1/auth/login', { method: 'POST', headers: { ...hdr, 'x-csrf-token': 'definitely-not-the-token', cookie: cookieHeader }, body: loginBody });
  rec('POST login with MISMATCHED csrf token is rejected 403', badTok.status === 403, `status=${badTok.status}`);

  const goodTok = await fetch(B + '/api/v1/auth/login', { method: 'POST', headers: { ...hdr, 'x-csrf-token': token || '', cookie: cookieHeader }, body: loginBody });
  rec('POST login with VALID csrf token passes the CSRF gate (not 403-CSRF)', goodTok.status !== 403 || !/csrf/i.test(await goodTok.clone().text()), `status=${goodTok.status} (non-CSRF outcome expected; no database in this run)`);
} catch (e) {
  rec('probe ran', false, e.message.slice(0, 300));
} finally { child.kill('SIGTERM'); await sleep(300); }
const failed = results.filter(r => !r.pass).length;
console.log(`\nLOCAL CSRF PROBE: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
