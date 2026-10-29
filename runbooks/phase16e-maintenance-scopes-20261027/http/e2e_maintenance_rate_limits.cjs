/* global process, console */
// Rate limits on the maintenance control plane. Run against a backend started with the SHIPPED limiter code but small windows via the
// existing environment knobs: STEP_UP_RATE_LIMIT_MAX=4 ADMIN_RATE_LIMIT_MAX=60 (production defaults are 8 and 200). Disposable local stack only.
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test', PW = L.PASSWORD, REASON = 'Rate limit verification for incident INC-R';
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
const tok = (r) => r.body?.token || r.body?.accessToken;
(async () => {
  const mk = async (role, email) => {
    const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
    const id = sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`);
    return { id, email: email || u.email };
  };
  const sess = async (u) => { const lg = await L.login(u.email); return { jar: lg.jar, token: tok(lg.res) }; };
  const owner = await mk('user', OWNER), tech = await mk('technical_support');
  let o = await sess(owner);
  await call('PUT', `/api/admin/staff/${tech.id}/permissions`, { ...o, body: { grantedPermissions: ['platform_recovery'] } });
  o = await sess(owner); const t = await sess(tech);

  // Step-up brute force against /activate: only wrong passwords (403) count toward the limit
  const codes = [];
  for (let i = 0; i < 6; i += 1) codes.push((await call('POST', '/api/admin/system/maintenance/activate', { ...o, body: { scope: 'dealers', reason: REASON, password: 'wrong-' + i } })).status);
  check('R1 repeated wrong step-up passwords on /activate are throttled (403 x4 then 429)', codes.slice(0, 4).every((c) => c === 403) && codes.slice(4).every((c) => c === 429), codes.join(','));
  check('R2 throttled attempts changed nothing', dbState().isMaintenanceMode !== true);
  const correctWhileLimited = await call('POST', '/api/admin/system/maintenance/activate', { ...o, body: { scope: 'dealers', reason: REASON, password: PW } });
  check('R3 even the CORRECT password is refused while the step-up limiter is tripped (no brute-force oracle)', correctWhileLimited.status === 429 && dbState().isMaintenanceMode !== true, correctWhileLimited.status);
  const techOk = await call('GET', '/api/admin/system/maintenance/status', t);
  check('R4 the limit is per user: the technical user is not affected by the owner being throttled', techOk.status === 200, techOk.status);
  const techCodes = []; for (let i = 0; i < 5; i += 1) techCodes.push((await call('POST', '/api/admin/system/maintenance/recover', { ...t, body: { password: 'bad-' + i, reason: REASON } })).status);
  check('R5 recover brute force by the technical user is throttled too (403 x4 then 429)', techCodes.slice(0, 4).every((c) => c === 403) && techCodes[4] === 429, techCodes.join(','));

  // general admin limiter on the control endpoints
  const owner2 = await mk('user'); const x = await sess(owner2); void x;
  let limited = 0, ok = 0;
  for (let i = 0; i < 80; i += 1) { const r = await call('GET', '/api/admin/system/maintenance/status', t); if (r.status === 429) limited += 1; else if (r.status === 200) ok += 1; }
  check('R6 the admin limiter also covers the status endpoint (some 200s, then 429)', ok > 0 && limited > 0, `ok=${ok} limited=${limited}`);
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
