/* global process, console, setTimeout */
// Scoped maintenance + owner/technical recovery. Real HTTP -> backend -> PostgREST -> disposable PostgreSQL (legacy owner mode:
// backend started with WEBHOIST_EMAIL=owner148@example.test). Ground truth is read from the database. Never run against hosted.
const { execSync } = require('child_process');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const PW = L.PASSWORD;
const A = (u) => ({ jar: u.jar, token: u.token });
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const REASON = 'Planned failover rehearsal for incident INC-7';
(async () => {
  const mk = async (role, email) => {
    const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
    const id = sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`);
    const e = email || u.email; const lg = await L.login(e);
    return { id, email: e, jar: lg.jar, token: lg.res.body?.token || lg.res.body?.accessToken, loginStatus: lg.res.status };
  };
  const owner = await mk('user', OWNER);
  const tech = await mk('technical_support'); const staff = await mk('technical_support'); const admin = await mk('admin'); const superNon = await mk('superadmin');
  const dealer = await mk('dealer'); const buyer = await mk('user'); const seller = await mk('individual_seller');
  const teamMember = await mk('user'); const invited = await mk('user');
  sql(`insert into dealer_teams(dealer,member,role,permissions,status,invite_email,invited_by) values ('${dealer.id}','${teamMember.id}','sales_agent','{}'::jsonb,'active','${teamMember.email}','${dealer.id}'),('${dealer.id}','${invited.id}','sales_agent','{}'::jsonb,'invited','${invited.email}','${dealer.id}')`);
  const everyone = { owner, tech, staff, admin, superNon, dealer, buyer, seller, teamMember, invited };
  check('P0 fixtures can sign in before maintenance', Object.values(everyone).every((u) => u.loginStatus === 200), Object.entries(everyone).filter(([, u]) => u.loginStatus !== 200).map(([k]) => k).join(','));
  const me = async (u) => (await call('GET', '/api/v1/auth/me', A(u))).status;
  const status = (u) => call('GET', '/api/admin/system/maintenance/status', A(u));
  const act = (u, body) => call('POST', '/api/admin/system/maintenance/activate', { ...A(u), body });
  const rec = (u, body) => call('POST', '/api/admin/system/maintenance/recover', { ...A(u), body });
  const settle = () => wait(10500); // the settings cache is 10s per instance (changes made through the control invalidate the local cache immediately)

  // ───────── the explicit technical-recovery grant: owner-only, per account
  const grantDenied = await call('PUT', `/api/admin/staff/${tech.id}/permissions`, { ...A(staff), body: { grantedPermissions: ['platform_recovery'] } });
  check('G1 ordinary staff cannot grant anyone (including themselves) the recovery permission', grantDenied.status === 403, grantDenied.status);
  const selfGrant = await call('PUT', `/api/admin/staff/${staff.id}/permissions`, { ...A(staff), body: { grantedPermissions: ['platform_recovery'] } });
  check('G2 a staff member cannot expand their OWN permissions', selfGrant.status === 403, selfGrant.status);
  const grant = await call('PUT', `/api/admin/staff/${tech.id}/permissions`, { ...A(owner), body: { grantedPermissions: ['platform_recovery'] } });
  check('G3 the System Owner grants platform_recovery to ONE technical account', grant.status === 200, grant.status + ' ' + JSON.stringify(grant.body).slice(0, 100));
  check('G4 the grant is stored only on that account', sql(`select count(*) from users where 'platform_recovery' = any(select jsonb_array_elements_text(to_jsonb(granted_permissions)))`).trim() === '1' || sql(`select count(*) from users where granted_permissions::text like '%platform_recovery%'`).trim() === '1');

  // ───────── control-plane authorisation while NOT in maintenance
  const s0 = await status(owner);
  check('S0 owner reads the server state: inactive, full scope catalog, global confirmation phrase', s0.status === 200 && s0.body.state.active === false && s0.body.scopes.length === 4 && s0.body.capabilities.canActivate === true && s0.body.capabilities.globalConfirmation === 'GLOBAL SHUTDOWN', s0.status + JSON.stringify(s0.body).slice(0, 80));
  check('S1 authorised technical staff can read status but are NOT allowed to activate', (await status(tech)).status === 200 && (await status(tech)).body.capabilities.canActivate === false && (await act(tech, { scope: 'dealers', reason: REASON, password: PW })).status === 403);
  for (const [n, u] of [['ordinary technical staff', staff], ['admin', admin], ['non-owner SUPERADMIN-labelled', superNon], ['dealer', dealer], ['buyer', buyer]]) {
    const st = await status(u); const ac = await act(u, { scope: 'global', reason: REASON, password: PW, confirmation: 'GLOBAL SHUTDOWN' });
    check(`S2 ${n} has no maintenance controls (status 403, activate 403)`, st.status === 403 && ac.status === 403 && dbState().isMaintenanceMode !== true, `${st.status}/${ac.status}`);
  }
  check('S3 anonymous callers are rejected', (await call('GET', '/api/admin/system/maintenance/status', {})).status === 401);

  // ───────── activation: validation, step-up, idempotency, server-confirmed state, audit
  check('A1 activation needs a reason', (await act(owner, { scope: 'dealers', password: PW })).status === 400);
  check('A2 an unknown scope is refused', (await act(owner, { scope: 'everybody', reason: REASON, password: PW })).status === 400);
  const noPw = await act(owner, { scope: 'dealers', reason: REASON });
  check('A3 STEP-UP: no password -> refused, nothing changed', noPw.status === 403 && dbState().isMaintenanceMode !== true, noPw.status + ' ' + noPw.body.code);
  const badPw = await act(owner, { scope: 'dealers', reason: REASON, password: 'wrong-password-123!' });
  check('A4 STEP-UP: wrong password -> refused, nothing changed', badPw.status === 403 && dbState().isMaintenanceMode !== true, badPw.status);
  const globalNoConfirm = await act(owner, { scope: 'global', reason: REASON, password: PW });
  check('A5 GLOBAL shutdown needs the typed confirmation phrase', globalNoConfirm.status === 400 && globalNoConfirm.body.code === 'MAINTENANCE_CONFIRMATION_REQUIRED' && dbState().isMaintenanceMode !== true);
  const a1 = await act(owner, { scope: 'dealers', reason: REASON, incidentRef: 'INC-7', password: PW });
  check('A6 owner activates DEALERS-only maintenance; the response is the state read back from the database', a1.status === 200 && a1.body.changed === true && a1.body.state.active === true && a1.body.state.scope === 'dealers' && a1.body.state.reason === REASON && a1.body.state.incidentRef === 'INC-7' && !!a1.body.state.operatorName && !!a1.body.state.activatedAt, JSON.stringify(a1.body).slice(0, 160));
  const d1 = dbState();
  check('A7 database agrees: flag, scope, version 1, other switches preserved', d1.isMaintenanceMode === true && d1.maintenanceScope === 'dealers' && d1.maintenanceVersion === 1 && d1.isAuctionActive === true && d1.isPaymentsActive === true);
  const a2 = await act(owner, { scope: 'dealers', reason: 'second click on the same button', password: PW });
  check('A8 idempotent: repeating the same activation changes nothing (changed=false, version still 1)', a2.status === 200 && a2.body.changed === false && dbState().maintenanceVersion === 1);
  check('A9 the activation is audited with reason, incident reference, scope and actor', Number(sql(`select count(*) from audit_logs where action='Maintenance activated: dealers' and details->>'reason'='${REASON}' and details->>'incidentRef'='INC-7' and actor_id='${owner.id}'`)) === 1);

  // ───────── DEALERS scope
  const dealerLogin = await call('POST', '/api/auth/login', { body: { email: dealer.email, password: PW } });
  check('D1 a dealer cannot sign in (503 maintenance for their audience, no session)', dealerLogin.status === 503 && dealerLogin.body.code === 'SYSTEM_MAINTENANCE' && dealerLogin.body.scope === 'dealers' && !(dealerLogin.setCookies || []).some((c) => /^(token|refreshToken)=[^;]+/.test(c)), dealerLogin.status + ' ' + JSON.stringify(dealerLogin.body).slice(0, 100));
  check('D2 a wrong dealer password is still a plain 401 (no maintenance oracle)', (await call('POST', '/api/auth/login', { body: { email: dealer.email, password: 'nope-nope-123!' } })).status === 401);
  check('D3 STALE SESSION: the dealer session created before maintenance is refused on /auth/me and on a signed-in marketplace route', (await me(dealer)) === 503 && (await call('GET', '/api/favorites', A(dealer))).status === 503);
  const dRefresh = await call('POST', '/api/auth/refresh', { jar: dealer.jar });
  check('D4 REFRESH TOKEN cannot mint a session for a dealer during dealer maintenance', dRefresh.status === 503 && !(dRefresh.setCookies || []).some((c) => /^token=[^;]+/.test(c)), dRefresh.status);
  check('D5 DIRECT API: dealer-portal routes are refused', (await call('GET', '/api/dealer/subscription', A(dealer))).status === 503);
  check('D6 an ACTIVE dealer-team member is treated as dealership staff (refused)', (await me(teamMember)) === 503 && (await call('POST', '/api/auth/login', { body: { email: teamMember.email, password: PW } })).status === 503);
  check('D7 a merely INVITED dealer-team member is an ordinary user (not affected)', (await me(invited)) === 200);
  check('D8 buyers, private sellers, staff, admins keep working', (await me(buyer)) === 200 && (await me(seller)) === 200 && (await me(staff)) === 200 && (await me(admin)) === 200 && (await call('GET', '/api/favorites', A(buyer))).status === 200);
  check('D9 owner and technical recovery are unaffected and keep staff access', (await me(owner)) === 200 && (await me(tech)) === 200 && (await call('GET', '/api/admin/users', A(owner))).status === 200);
  const pub = await call('GET', '/api/cars', {});
  check('D10 PUBLIC MARKETPLACE outside the scope is unchanged: anonymous browsing works', pub.status === 200, pub.status);
  check('D11 sign-in for an unaffected buyer still works, new buyer registration still works', (await call('POST', '/api/auth/login', { body: { email: buyer.email, password: PW } })).status === 200 && (await L.register('user', {})).res.status === 201);
  check('D12 a lower-ranked admin cannot lift or change the restriction', (await rec(admin, { reason: REASON, password: PW })).status === 403 && (await act(admin, { scope: 'global', reason: REASON, password: PW, confirmation: 'GLOBAL SHUTDOWN' })).status === 403 && dbState().maintenanceScope === 'dealers');
  const legacyOn = await call('POST', '/api/admin/system/kill-switch', { ...A(owner), body: { type: 'full_maintenance' } });
  const legacyOff = await call('POST', '/api/admin/system/recover', { ...A(owner), body: { type: 'maintenance' } });
  check('D13 LEGACY endpoints cannot bypass the control plane (start/end maintenance refused with a pointer to the new control)', legacyOn.status === 400 && legacyOn.body.code === 'MAINTENANCE_USE_SCOPED_CONTROL' && legacyOff.status === 400 && legacyOff.body.code === 'MAINTENANCE_USE_SCOPED_CONTROL' && dbState().maintenanceScope === 'dealers');

  // ───────── scope change with optimistic concurrency
  const stale = await act(owner, { scope: 'buyers_sellers', reason: 'switching audience', password: PW, expectedVersion: 0 });
  check('C1 a stale screen (old version) gets an honest 409 with the current state; nothing changes', stale.status === 409 && stale.body.code === 'MAINTENANCE_STATE_CONFLICT' && stale.body.state.scope === 'dealers' && dbState().maintenanceScope === 'dealers');
  const a3 = await act(owner, { scope: 'buyers_sellers', reason: 'switching audience to buyers', password: PW, expectedVersion: 1 });
  check('C2 scope change with the right version succeeds (transition scope_changed, version 2)', a3.status === 200 && a3.body.transition === 'scope_changed' && a3.body.state.scope === 'buyers_sellers' && dbState().maintenanceVersion === 2);
  check('C3 the scope change is audited with previous scope', Number(sql(`select count(*) from audit_logs where action='Maintenance scope changed: dealers -> buyers_sellers' and details->>'previousScope'='dealers'`)) === 1);

  // ───────── BUYERS & SELLERS scope
  check('B1 buyers and private sellers are now refused (existing sessions and sign-in); dealers and dealership staff are released', (await me(buyer)) === 503 && (await me(seller)) === 503 && (await call('POST', '/api/auth/login', { body: { email: buyer.email, password: PW } })).status === 503 && (await me(invited)) === 503);
  check('B2 dealer and active team member work again; staff and owner unaffected', (await me(dealer)) === 200 && (await me(teamMember)) === 200 && (await me(staff)) === 200 && (await me(owner)) === 200);
  const reg = await L.register('user', {});
  check('B3 new buyer registration is paused with the maintenance message', reg.res.status === 503 && reg.res.body.code === 'SYSTEM_MAINTENANCE' && reg.res.body.scope === 'buyers_sellers', reg.res.status);
  check('B4 public browsing is unchanged', (await call('GET', '/api/cars', {})).status === 200);

  // ───────── ORDINARY USERS scope
  const a4 = await act(owner, { scope: 'ordinary_users', reason: 'extending to all signed-in users', password: PW, expectedVersion: 2 });
  check('O1 owner widens to ALL ORDINARY USERS', a4.status === 200 && a4.body.state.scope === 'ordinary_users');
  check('O2 buyers, sellers, dealers, team members refused; staff, admin, owner, tech unaffected; public browsing works',
    (await me(buyer)) === 503 && (await me(seller)) === 503 && (await me(dealer)) === 503 && (await me(teamMember)) === 503 && (await me(staff)) === 200 && (await me(admin)) === 200 && (await me(owner)) === 200 && (await me(tech)) === 200 && (await call('GET', '/api/cars', {})).status === 200);

  // ───────── GLOBAL shutdown
  const a5 = await act(owner, { scope: 'global', reason: 'Genuine platform-wide emergency drill', password: PW, confirmation: 'GLOBAL SHUTDOWN', message: 'We are performing emergency maintenance. Back shortly.' });
  check('X1 owner activates GLOBAL shutdown (typed confirmation + password)', a5.status === 200 && a5.body.state.scope === 'global' && a5.body.state.message.startsWith('We are performing'), a5.status + JSON.stringify(a5.body).slice(0, 100));
  check('X2 everyone ordinary is refused: anonymous browsing, buyers, dealers, plain staff, admin, non-owner SUPERADMIN-labelled',
    (await call('GET', '/api/cars', {})).status === 503 && (await me(buyer)) === 503 && (await me(dealer)) === 503 && (await me(staff)) === 503 && (await me(admin)) === 503 && (await me(superNon)) === 503);
  const gl = await call('GET', '/api/cars', {});
  check('X3 TRUTHFUL ERROR: the refused visitor gets the operator message, code, scope and Retry-After', gl.body.code === 'SYSTEM_MAINTENANCE' && gl.body.scope === 'global' && /emergency maintenance/.test(gl.body.message) && !!gl.headers.get('retry-after'));
  check('X4 owner can sign in, verify the session, and tech-with-grant can sign in and verify', (await call('POST', '/api/auth/login', { body: { email: OWNER, password: PW } })).status === 200 && (await me(owner)) === 200 && (await me(tech)) === 200 && (await call('POST', '/api/auth/login', { body: { email: tech.email, password: PW } })).status === 200);
  check('X5 plain technical staff WITHOUT the grant cannot sign in (503) and cannot see controls', (await call('POST', '/api/auth/login', { body: { email: staff.email, password: PW } })).status === 503 && (await status(staff)).status === 503);
  check('X6 owner / tech reach NO sensitive admin or financial API during global shutdown (exempt != authorised)',
    (await call('GET', '/api/admin/users', A(owner))).status === 503 && (await call('GET', '/api/admin/users', A(tech))).status === 503 && (await call('GET', '/api/payments/history', A(owner))).status === 503 && (await call('GET', '/api/owner/members', A(owner))).status === 503);
  const st5 = await status(owner), st5t = await status(tech);
  check('X7 owner and tech read the state during global shutdown (confirmed by the server)', st5.status === 200 && st5.body.state.scope === 'global' && st5t.status === 200 && st5t.body.capabilities.role === 'technical_recovery');
  check('X8 technical staff still cannot activate or change scope in a global shutdown', (await act(tech, { scope: 'dealers', reason: REASON, password: PW })).status === 503 || (await act(tech, { scope: 'dealers', reason: REASON, password: PW })).status === 403);
  check('X9 /api/health stays reachable', (await fetchHealth()) === 200);
  async function fetchHealth() { const r = await fetch(L.BASE + '/api/health'); return r.status; }

  // ───────── recovery: step-up, reason for technical staff, idempotency, concurrency, audit
  check('R1 technical recovery requires a reason', (await rec(tech, { password: PW })).status === 400);
  check('R2 technical recovery requires password step-up', (await rec(tech, { reason: 'Failover finished and verified', password: 'wrong-wrong-1!' })).status === 403 && dbState().isMaintenanceMode === true);
  check('R3 non-owner SUPERADMIN-labelled and plain staff cannot recover', (await rec(superNon, { reason: REASON, password: PW })).status === 503 && (await rec(staff, { reason: REASON, password: PW })).status === 503 && dbState().isMaintenanceMode === true);
  const burst = await Promise.all([1, 2, 3, 4].map(() => rec(tech, { reason: 'Failover finished and verified', password: PW })));
  const effective = burst.filter((r) => r.status === 200 && r.body.changed === true).length;
  check('R4 CONCURRENT recoveries from the authorised technical user: all succeed, exactly ONE effective change', burst.every((r) => r.status === 200) && effective === 1 && dbState().isMaintenanceMode === false, burst.map((r) => r.status + ':' + r.body.changed).join(','));
  check('R5 recovery is audited once, attributed to the technical user with reason', Number(sql(`select count(*) from audit_logs where action='Maintenance recovered: global' and actor_id='${tech.id}'`)) === 1);
  const again = await rec(owner, { password: PW });
  check('R6 recovering again is idempotent (owner): 200 changed=false', again.status === 200 && again.body.changed === false);
  check('R7 everyone is back: public, buyers, dealers, staff', (await call('GET', '/api/cars', {})).status === 200 && (await me(buyer)) === 200 && (await me(dealer)) === 200 && (await me(staff)) === 200 && (await me(superNon)) === 200);
  const s7 = await status(owner);
  check('R8 server state after recovery records who recovered and when', s7.body.state.active === false && s7.body.state.lastRecovery?.role === 'technical_recovery' && !!s7.body.state.lastRecovery.at);

  // ───────── concurrency across operations
  const vBefore = dbState().maintenanceVersion; const tMark = sql('select now()');
  const mix = await Promise.all([
    act(owner, { scope: 'dealers', reason: 'concurrent activation one', password: PW }),
    act(owner, { scope: 'buyers_sellers', reason: 'concurrent activation two', password: PW }),
    act(owner, { scope: 'ordinary_users', reason: 'concurrent activation three', password: PW }),
    rec(owner, { password: PW }),
    rec(tech, { reason: 'concurrent technical recovery', password: PW }),
  ]);
  const f = dbState();
  const okAll = mix.every((r) => r.status === 200);
  const auditsSince = Number(sql(`select count(*) from audit_logs where action like 'Maintenance %' and created_at > '${tMark}'`));
  check('K1 CONCURRENT activate/scope/recover mix: every request answered 200, the final state is coherent (flag and scope agree)', okAll && (f.isMaintenanceMode ? ['dealers', 'buyers_sellers', 'ordinary_users'].includes(f.maintenanceScope) : !f.maintenanceScope), mix.map((r) => r.status).join(','));
  const effectiveMix = mix.filter((r) => r.body.changed).length;
  check('K2 …and the version bump and the audit rows each equal the number of EFFECTIVE changes (none lost, none duplicated)', f.maintenanceVersion - vBefore === effectiveMix && auditsSince === effectiveMix, `${f.maintenanceVersion} ${vBefore} ${auditsSince} ${effectiveMix}`);
  await rec(owner, { password: PW }); await settle();

  // ───────── feature kill switches share the writer and cannot clobber maintenance
  await act(owner, { scope: 'dealers', reason: 'testing feature switch interplay', password: PW });
  const ks = await Promise.all([call('POST', '/api/admin/system/kill-switch', { ...A(owner), body: { type: 'auctions' } }), call('POST', '/api/admin/system/kill-switch', { ...A(owner), body: { type: 'payments' } }), act(owner, { scope: 'ordinary_users', reason: 'scope change alongside switches', password: PW })]);
  const f2 = dbState();
  check('K3 legacy feature switches and a scope change run concurrently without clobbering each other', ks.every((r) => r.status === 200) && f2.isAuctionActive === false && f2.isPaymentsActive === false && f2.maintenanceScope === 'ordinary_users' && f2.isMaintenanceMode === true, JSON.stringify(ks.map((r) => r.status)) + JSON.stringify(f2).slice(0, 160));
  check('K4 legacy recover(all) re-enables the feature switches but leaves maintenance to its own control', (await call('POST', '/api/admin/system/recover', { ...A(owner), body: { type: 'all' } })).body.maintenanceActive === true && dbState().isAuctionActive === true && dbState().isMaintenanceMode === true);
  await rec(owner, { password: PW });

  // ───────── honest errors when the database is unreachable
  const lg2 = await L.login(OWNER); const o2 = { jar: lg2.jar };
  execSync(`fuser -k 54330/tcp || true`, { stdio: 'ignore' }); await wait(1200);
  const down = await status(o2); const downLogin = await call('POST', '/api/auth/login', { body: { email: OWNER, password: PW } });
  const honest = (r) => r.status >= 500 && !/maintenance/i.test(JSON.stringify(r.body)) && r.status !== 200;
  check('E1 DATABASE DOWN: control status and sign-in answer an honest 5xx error (not 200, not a false "maintenance")', honest(down) && honest(downLogin), `${down.status} ${JSON.stringify(down.body).slice(0, 80)} | ${downLogin.status} ${JSON.stringify(downLogin.body).slice(0, 80)}`);
  execSync(`cd /home/claude/pgrest && (nohup ./postgrest /home/claude/inc/pgrst_t.conf > /home/claude/m_inf/pgrst.log 2>&1 &) ; sleep 3`, { shell: '/bin/bash', stdio: 'ignore' });
  for (let i = 0; i < 20; i += 1) { try { if ((await call('GET', '/api/admin/system/maintenance/status', A(o2))).status === 200) break; } catch (e) { /* retry */ } await wait(1000); }
  check('E2 database back: owner reads the (unchanged, inactive) state again', (await status(o2)).body?.state?.active === false);

  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
