/* global process, console, setTimeout */
// Security controls around the maintenance control plane, against the REAL backend (legacy owner mode, WEBHOIST_EMAIL=owner148@example.test):
//   T  technical-recovery staff gain NO general admin / finance / auction / escrow access (differential vs an ungranted twin)
//   C  CSRF on the control plane
//   L  legacy kill-switch endpoints cannot bypass the scoped policy; per-feature switches behave correctly
//   F  maintenance settings store unavailable: fail-static, honest errors, no false recovery, no privileged exposure
// Disposable local stack only. Says nothing about hosted behaviour.
const { execSync } = require('child_process');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test', PW = L.PASSWORD, REASON = 'Security control verification for incident INC-S';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
const tok = (r) => r.body?.token || r.body?.accessToken;
const PGRST = `cd /home/claude/pgrest && (nohup ./postgrest /home/claude/inc/pgrst_t.conf > /home/claude/f_inf/pgrst.log 2>&1 &) ; sleep 3`;

(async () => {
  const mk = async (role, email) => {
    const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
    const id = sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`);
    return { id, email: email || u.email };
  };
  const session = async (u) => { const lg = await L.login(u.email); return { jar: lg.jar, token: tok(lg.res), status: lg.res.status }; };
  const X = { owner: await mk('user', OWNER), tech: await mk('technical_support'), twin: await mk('technical_support'), superNon: await mk('superadmin'), buyer: await mk('user') };
  let S = {}; const resession = async () => { for (const k of Object.keys(X)) S[k] = await session(X[k]); };
  await resession();
  const A = (k) => ({ jar: S[k].jar, token: S[k].token });
  const grant = await call('PUT', `/api/admin/staff/${X.tech.id}/permissions`, { ...A('owner'), body: { grantedPermissions: ['platform_recovery'] } });
  await resession();
  check('X0 fixtures: tech holds platform_recovery, its twin (same role) does not', grant.status === 200 && sql(`select count(*) from users where granted_permissions::text like '%platform_recovery%'`) === '1', grant.status);

  // ───────── T: no general privileges from the recovery grant
  const sensitive = ['users', 'sellers', 'cars', 'auctions', 'bids', 'escrows', 'transactions', 'staff', 'settings', 'security-log', 'market-data', 'control-room', 'webhoist', 'dealer-verifications', 'ntsa-queue', 'alerts'];
  const diff = []; const leaks = [];
  for (const r of sensitive) {
    const a = await call('GET', `/api/admin/${r}`, A('tech')); const b = await call('GET', `/api/admin/${r}`, A('twin')); const c = await call('GET', `/api/admin/${r}`, A('superNon'));
    if (a.status !== b.status) diff.push(`${r}: granted ${a.status} vs twin ${b.status}`);
    if (a.status >= 200 && a.status < 300 && !(b.status >= 200 && b.status < 300)) leaks.push(r);
    void c;
  }
  check('T1 the recovery grant changes NOTHING on 16 admin/finance/auction/escrow read routes (granted == ungranted twin)', diff.length === 0, diff.join(' | '));
  check('T2 the grant never turns a refusal into a success', leaks.length === 0, leaks.join(','));
  const writes = [
    ['POST', '/api/admin/system/kill-switch', { type: 'auctions' }], ['POST', '/api/admin/system/recover', { type: 'all' }],
    ['PUT', `/api/admin/staff/${X.tech.id}/permissions`, { grantedPermissions: ['platform_recovery', 'manage_staff'] }],
    ['PUT', `/api/admin/staff/${X.twin.id}/permissions`, { grantedPermissions: ['platform_recovery'] }],
    ['POST', '/api/admin/system/maintenance/activate', { scope: 'dealers', reason: REASON, password: PW }],
  ];
  const wr = []; for (const [m, p, b] of writes) { const r = await call(m, p, { ...A('tech'), body: b }); wr.push(r.status); }
  check('T3 the technical user cannot flip kill-switches, edit permissions (own or others) or activate maintenance (all 403)', wr.every((s) => s === 403), wr.join(','));
  check('T4 nothing was changed by those attempts', dbState().isMaintenanceMode !== true && dbState().isAuctionActive !== false && sql(`select count(*) from users where granted_permissions::text like '%platform_recovery%'`) === '1' && !sql(`select granted_permissions::text from users where id='${X.tech.id}'`).includes('manage_staff'));
  const st = await call('GET', '/api/admin/system/maintenance/status', A('tech'));
  check('T5 the status view exposes only maintenance state, scope catalog, capabilities and operator (no user, finance or config data)', st.status === 200 && Object.keys(st.body).sort().join(',') === 'capabilities,operator,scopes,state,success' && st.body.capabilities.role === 'technical_recovery' && st.body.capabilities.canActivate === false, Object.keys(st.body).join(','));

  // activate global for the "during maintenance" privilege check
  const g = await call('POST', '/api/admin/system/maintenance/activate', { ...A('owner'), body: { scope: 'global', reason: REASON, incidentRef: 'INC-S', password: PW, confirmation: 'GLOBAL SHUTDOWN' } });
  check('T6 owner activates global shutdown', g.status === 200 && g.body.state.scope === 'global', g.status);
  const sens503 = []; for (const r of sensitive) { for (const k of ['tech', 'owner']) { const x = await call('GET', `/api/admin/${r}`, A(k)); if (x.status !== 503) sens503.push(`${k}:${r}:${x.status}`); } }
  check('T7 during global shutdown the technical user AND the owner are refused on all 16 admin/finance/auction/escrow routes (exempt != authorised)', sens503.length === 0, sens503.join(' '));
  const wr2 = []; for (const [m, p, b] of writes.slice(0, 4)) { const r = await call(m, p, { ...A('tech'), body: b }); wr2.push(r.status); }
  check('T8 …and for writes (kill-switch, recover, permissions) the technical user is refused (503 global)', wr2.every((s) => s === 503), wr2.join(','));

  // ───────── C: CSRF on the control plane (cookie-session requests)
  const noCsrf = await call('POST', '/api/admin/system/maintenance/recover', { jar: S.owner.jar, noCsrf: true, body: { password: PW } });
  const badCsrf = await call('POST', '/api/admin/system/maintenance/recover', { jar: S.owner.jar, csrfHeader: 'forged-token', body: { password: PW } });
  check('C1 recover from a cookie session WITHOUT a CSRF token is refused and changes nothing', noCsrf.status === 403 && dbState().isMaintenanceMode === true, `${noCsrf.status} ${noCsrf.body.code || noCsrf.body.message}`);
  check('C2 recover with a FORGED CSRF token is refused and changes nothing', badCsrf.status === 403 && dbState().isMaintenanceMode === true, badCsrf.status);
  const noCsrfAct = await call('POST', '/api/admin/system/maintenance/activate', { jar: S.owner.jar, noCsrf: true, body: { scope: 'dealers', reason: REASON, password: PW } });
  check('C3 activate/scope-change without CSRF is refused', noCsrfAct.status === 403 && dbState().maintenanceScope === 'global', noCsrfAct.status);

  // ───────── L: legacy endpoints cannot bypass the scoped policy
  const lg = [
    await call('POST', '/api/admin/system/kill-switch', { ...A('owner'), body: { type: 'full_maintenance' } }),
    await call('POST', '/api/admin/system/recover', { ...A('owner'), body: { type: 'maintenance' } }),
    await call('POST', '/api/admin/system/kill-switch', { ...A('tech'), body: { type: 'full_maintenance' } }),
  ];
  check('L1 legacy start/end of maintenance are refused (400/503) and change nothing', lg[0].status === 503 && lg[1].status === 503 && lg[2].status === 503 && dbState().maintenanceScope === 'global', lg.map((r) => r.status).join(','));
  // end maintenance via the real control so the rest can run
  const rec = await call('POST', '/api/admin/system/maintenance/recover', { ...A('tech'), body: { password: PW, reason: 'ending global shutdown rehearsal', incidentRef: 'INC-S' } });
  check('L0 technical user ends the shutdown through the control plane', rec.status === 200 && dbState().isMaintenanceMode === false, rec.status);
  await resession();
  const lg2 = [
    await call('POST', '/api/admin/system/kill-switch', { ...A('owner'), body: { type: 'full_maintenance' } }),
    await call('POST', '/api/admin/system/recover', { ...A('owner'), body: { type: 'maintenance' } }),
  ];
  check('L2 with the platform up, the legacy endpoints answer 400 MAINTENANCE_USE_SCOPED_CONTROL (cannot start or end maintenance)', lg2.every((r) => r.status === 400 && r.body.code === 'MAINTENANCE_USE_SCOPED_CONTROL') && dbState().isMaintenanceMode === false, lg2.map((r) => r.status + ' ' + r.body.code).join(' | '));
  const lg3 = await call('POST', '/api/admin/system/kill-switch', { ...A('tech'), body: { type: 'auctions' } });
  check('L3 a technical user (grant) cannot use the legacy kill-switch', lg3.status === 403 && dbState().isAuctionActive !== false, lg3.status);

  // per-feature switches
  const bidPath = '/api/auctions/00000000-0000-0000-0000-000000000000/bid', payPath = '/api/payments/stk';
  const b0 = await call('POST', bidPath, { ...A('buyer'), body: { amount: 1000 } }); const p0 = await call('POST', payPath, { ...A('buyer'), body: {} });
  check('L4 baseline: bidding and payment routes are not "paused" before any switch', !/temporarily paused/.test(JSON.stringify(b0.body) + JSON.stringify(p0.body)), `${b0.status} ${p0.status}`);
  const ks = await call('POST', '/api/admin/system/kill-switch', { ...A('owner'), body: { type: 'auctions' } });
  await wait(100);
  const b1 = await call('POST', bidPath, { ...A('buyer'), body: { amount: 1000 } }); const p1 = await call('POST', payPath, { ...A('buyer'), body: {} }); const cars1 = await call('GET', '/api/cars', {});
  check('L5 kill-switch auctions: bidding paused (403 message), payments and public browsing unaffected, maintenance not touched', ks.status === 200 && b1.status === 403 && /Auctions are temporarily paused/.test(b1.body.message) && !/temporarily paused/.test(JSON.stringify(p1.body)) && cars1.status === 200 && dbState().isMaintenanceMode === false && dbState().isAuctionActive === false, `${ks.status} ${b1.status} ${p1.status} ${cars1.status}`);
  const ks2 = await call('POST', '/api/admin/system/kill-switch', { ...A('owner'), body: { type: 'payments' } });
  const p2 = await call('POST', payPath, { ...A('buyer'), body: {} });
  check('L6 kill-switch payments: payments paused (403 message); auctions stay paused', ks2.status === 200 && p2.status === 403 && /Payments are temporarily paused/.test(p2.body.message) && dbState().isAuctionActive === false, `${ks2.status} ${p2.status}`);
  const again = await call('POST', '/api/admin/system/kill-switch', { ...A('owner'), body: { type: 'payments' } });
  check('L7 repeating a kill-switch is idempotent (changed=false)', again.status === 200 && again.body.changed === false, JSON.stringify(again.body));
  const act = await call('POST', '/api/admin/system/maintenance/activate', { ...A('owner'), body: { scope: 'dealers', reason: REASON, password: PW } });
  const rall = await call('POST', '/api/admin/system/recover', { ...A('owner'), body: { type: 'all' } });
  const s = dbState();
  check('L8 recover "all" re-enables ONLY the feature switches and leaves the active dealers-scope maintenance alone', act.status === 200 && rall.status === 200 && rall.body.maintenanceActive === true && s.isAuctionActive === true && s.isPaymentsActive === true && s.isMaintenanceMode === true && s.maintenanceScope === 'dealers', JSON.stringify(s).slice(0, 200));
  const b3 = await call('POST', bidPath, { ...A('buyer'), body: { amount: 1000 } });
  check('L9 the buyer (not in the dealers scope) can use bidding again', !/temporarily paused/.test(JSON.stringify(b3.body)) && b3.status !== 503, b3.status);

  // ───────── F: settings store unavailable
  const gl = await call('POST', '/api/admin/system/maintenance/activate', { ...A('owner'), body: { scope: 'global', reason: REASON, incidentRef: 'INC-S', password: PW, confirmation: 'GLOBAL SHUTDOWN', expectedVersion: dbState().maintenanceVersion } });
  const before = dbState();
  check('F0 global shutdown active before the outage', gl.status === 200 && before.maintenanceScope === 'global', gl.status);
  await call('GET', '/api/cars', {}); // warm the cache with the active state
  execSync('fuser -k 54330/tcp || true', { stdio: 'ignore' }); await wait(11500); // cache (10s) expires while the store is unreachable
  const pub = await call('GET', '/api/cars', {});
  check('F1 FAIL-STATIC: store unreachable after the cache expired -> an active global shutdown is STILL enforced (503 SYSTEM_MAINTENANCE), not silently opened', pub.status === 503 && pub.body.code === 'SYSTEM_MAINTENANCE' && pub.body.scope === 'global', `${pub.status} ${JSON.stringify(pub.body).slice(0, 100)}`);
  const stDown = await call('GET', '/api/admin/system/maintenance/status', A('tech'));
  const recDown = await call('POST', '/api/admin/system/maintenance/recover', { ...A('tech'), body: { password: PW, reason: 'recover attempt during outage' } });
  const actDown = await call('POST', '/api/admin/system/maintenance/activate', { ...A('owner'), body: { scope: 'dealers', reason: REASON, password: PW } });
  const loginDown = await L.login(OWNER);
  const honest = (r) => r.status >= 500 && r.body?.success !== true && r.body?.changed !== true;
  check('F2 control status, recover, activate and sign-in during the outage answer an honest 5xx (never success, never changed=true)', honest(stDown) && honest(recDown) && honest(actDown) && honest(loginDown.res), [stDown, recDown, actDown, loginDown.res].map((r) => r.status + ':' + (r.body?.code || r.body?.message || '')).join(' | '));
  check('F3 the failed recovery gave out no session and no privileged data', !(loginDown.res.setCookies || []).some((c) => /^(token|refreshToken)=[^;]+/.test(c)) && !JSON.stringify(recDown.body).includes('"state"'));
  const adminDown = await call('GET', '/api/admin/users', A('owner'));
  check('F4 admin/finance routes stay closed during the outage while shutdown is active (503, not exposed)', adminDown.status === 503, adminDown.status);
  execSync(PGRST, { shell: '/bin/bash', stdio: 'ignore' });
  for (let i = 0; i < 25; i += 1) { try { if ((await call('GET', '/api/admin/system/maintenance/status', A('tech'))).status === 200) break; } catch { /* retry */ } await wait(1000); }
  const after = dbState();
  check('F5 after the store returns, the maintenance state is exactly what it was (nothing falsely recovered or changed)', after.isMaintenanceMode === true && after.maintenanceScope === 'global' && after.maintenanceVersion === before.maintenanceVersion, JSON.stringify(after).slice(0, 160));
  const recOk = await call('POST', '/api/admin/system/maintenance/recover', { ...A('tech'), body: { password: PW, reason: 'recovery after storage outage', incidentRef: 'INC-S' } });
  check('F6 recovery then succeeds and is read back from the store', recOk.status === 200 && recOk.body.changed === true && dbState().isMaintenanceMode === false, recOk.status);
  await wait(500);
  const pub2 = await call('GET', '/api/cars', {});
  check('F7 public marketplace is back to normal after recovery (and the stale last-known state did not undo it)', pub2.status === 200, pub2.status);

  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
