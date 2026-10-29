/* global process, console */
// Exhaustive scope x identity x request-type matrix against the REAL backend (legacy owner mode: WEBHOIST_EMAIL=owner148@example.test).
// The expected results below are written independently of backend/config/maintenancePolicy.js (a hand-written oracle), so a bug in the
// policy cannot hide itself. Disposable local stack only. Says nothing about hosted behaviour.
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test', PW = L.PASSWORD, REASON = 'Matrix verification run for incident INC-M';
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
const tok = (r) => r.body?.token || r.body?.accessToken;

(async () => {
  const mk = async (role, email) => {
    const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
    const id = sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`);
    return { id, email: email || u.email };
  };
  const session = async (u) => { const lg = await L.login(u.email); return { jar: lg.jar, token: tok(lg.res), status: lg.res.status }; };

  const actors = {
    owner: await mk('user', OWNER), tech: await mk('technical_support'), staff: await mk('technical_support'), admin: await mk('admin'), superNon: await mk('superadmin'),
    dealer: await mk('dealer'), buyer: await mk('user'), seller: await mk('individual_seller'), teamMember: await mk('user'),
  };
  sql(`insert into dealer_teams(dealer,member,role,permissions,status,invite_email,invited_by) values ('${actors.dealer.id}','${actors.teamMember.id}','sales_agent','{}'::jsonb,'active','${actors.teamMember.email}','${actors.dealer.id}')`);
  const names = Object.keys(actors);
  const own = await session(actors.owner);
  const grant = await call('PUT', `/api/admin/staff/${actors.tech.id}/permissions`, { jar: own.jar, token: own.token, body: { grantedPermissions: ['platform_recovery'] } });
  check('M0 fixtures ready: owner granted platform_recovery to exactly one technical account', grant.status === 200, grant.status);

  // ───────── hand-written oracle
  const AUD = { owner: 'O', tech: 'S', staff: 'S', admin: 'S', superNon: 'S', dealer: 'D', buyer: 'B', seller: 'B', teamMember: 'D' };
  const RESTRICTED = { global: ['B', 'D', 'S'], ordinary_users: ['B', 'D'], buyers_sellers: ['B'], dealers: ['D'] };
  const recoveryCapable = (n) => n === 'owner' || n === 'tech';
  // is this actor refused on ordinary signed-in functions?
  const refusedOrdinary = (scope, n) => scope === 'global' || RESTRICTED[scope].includes(AUD[n]);
  // is the actor refused on session routes (login / me / refresh)?
  const refusedSession = (scope, n) => (scope === 'global' ? !recoveryCapable(n) : RESTRICTED[scope].includes(AUD[n]));
  const registrationPaused = (scope) => scope === 'global' || RESTRICTED[scope].includes('B');

  // baseline (no maintenance) statuses for the direct-API probes
  const probes = ['/api/notifications', '/api/admin/users'];
  const base = {}; const baseSessions = {};
  for (const n of names) { baseSessions[n] = await session(actors[n]); base[n] = {}; for (const p of probes) base[n][p] = (await call('GET', p, { jar: baseSessions[n].jar, token: baseSessions[n].token })).status; }
  check('M1 baseline: no probe is a maintenance answer before activation', names.every((n) => probes.every((p) => base[n][p] !== 503)), JSON.stringify(base.buyer));
  check('M1b baseline: the buyer notification probe is a real route (not 404)', base.buyer['/api/notifications'] !== 404, base.buyer['/api/notifications']);

  let effective = 0;
  for (const scope of ['dealers', 'buyers_sellers', 'ordinary_users', 'global']) {
    // fresh sessions BEFORE maintenance start (these are the "existing access tokens / refresh tokens")
    const pre = {}; for (const n of names) pre[n] = await session(actors[n]);
    const bearerBase = (await call('GET', probes[0], { token: pre.buyer.token })).status; // how a bearer-only request behaves with NO maintenance
    const act = await call('POST', '/api/admin/system/maintenance/activate', { jar: own.jar, token: own.token, body: { scope, reason: REASON, incidentRef: 'INC-M', password: PW, ...(scope === 'global' ? { confirmation: 'GLOBAL SHUTDOWN' } : {}), ...(dbState().maintenanceVersion != null ? { expectedVersion: dbState().maintenanceVersion } : {}) } });
    effective += 1;
    check(`[${scope}] activation accepted and read back from the database`, act.status === 200 && act.body.state?.scope === scope && dbState().maintenanceScope === scope && dbState().isMaintenanceMode === true, act.status + JSON.stringify(act.body).slice(0, 120));
    const tag = (s) => `[${scope}] ${s}`;

    // ANONYMOUS
    const pub = await call('GET', '/api/cars', {});
    check(tag('anonymous browsing'), scope === 'global' ? pub.status === 503 && pub.body.code === 'SYSTEM_MAINTENANCE' && pub.body.scope === 'global' : pub.status === 200, pub.status);
    const reg = await call('POST', '/api/auth/register', { body: { name: 'x y', email: L.uniq('m'), password: PW, role: 'user', phone: '0712345678' } });
    check(tag('anonymous registration'), registrationPaused(scope) ? reg.status === 503 && reg.body.code === 'SYSTEM_MAINTENANCE' : reg.status !== 503, reg.status);
    const hz = await call('GET', '/api/health', {});
    check(tag('health endpoint always answers'), hz.status === 200, hz.status);
    const csrfR = await call('GET', '/api/auth/csrf', {});
    check(tag('csrf bootstrap (session class) stays available'), csrfR.status === 200, csrfR.status);
    const anonCtl = [await call('GET', '/api/admin/system/maintenance/status', {}), await call('POST', '/api/admin/system/maintenance/recover', { body: { password: PW } }), await call('POST', '/api/admin/system/maintenance/activate', { body: { scope: 'dealers', reason: REASON, password: PW } })];
    check(tag('anonymous control-plane attempts are 401 (never served, never 200)'), anonCtl.every((r) => r.status === 401), anonCtl.map((r) => r.status).join(','));
    const anonRefresh = await call('POST', '/api/auth/refresh', {});
    check(tag('refresh with no token is 401, not a bypass'), anonRefresh.status === 401 || anonRefresh.status === 503, anonRefresh.status);

    // LOGIN with the correct password
    const loginBad = []; const loginOk = [];
    for (const n of names) {
      const lg = await L.login(actors[n].email); const cookies = (lg.res.setCookies || []).filter((c) => /^(token|refreshToken)=[^;]+/.test(c));
      const refused = refusedSession(scope, n);
      const ok = refused ? lg.res.status === 503 && lg.res.body.code === 'SYSTEM_MAINTENANCE' && cookies.length === 0 : lg.res.status === 200 && cookies.length > 0;
      (ok ? loginOk : loginBad).push(`${n}:${lg.res.status}`);
    }
    check(tag('login: affected audiences get 503 and NO session; unaffected (and owner/technical under global) sign in'), loginBad.length === 0, loginBad.join(' '));
    const wrong = await call('POST', '/api/auth/login', { body: { email: actors.buyer.email, password: 'Wrong!Passw0rd#9' } });
    check(tag('wrong password stays a plain 401 for everyone (no maintenance oracle)'), wrong.status === 401, wrong.status);

    // EXISTING ACCESS TOKEN: session verification and direct APIs
    const meBad = []; const apiBad = [];
    for (const n of names) {
      const me = await call('GET', '/api/v1/auth/me', { jar: pre[n].jar, token: pre[n].token });
      const meOk = refusedSession(scope, n) ? me.status === 503 : me.status === 200;
      if (!meOk) meBad.push(`${n}:${me.status}`);
      for (const p of probes) {
        const r = await call('GET', p, { jar: pre[n].jar, token: pre[n].token });
        const expectRefused = refusedOrdinary(scope, n);
        const okp = expectRefused ? r.status === 503 && r.body.code === 'SYSTEM_MAINTENANCE' : r.status === base[n][p];
        if (!okp) apiBad.push(`${n}${p}:${r.status}(base ${base[n][p]})`);
      }
    }
    check(tag('existing access token + /auth/me: refused exactly for the affected audience (owner/technical verify under global)'), meBad.length === 0, meBad.join(' '));
    check(tag('direct API requests with existing tokens: affected -> 503; unaffected -> identical to baseline; global -> everyone 503 (incl. owner/technical)'), apiBad.length === 0, apiBad.join(' '));
    const bearerOnly = await call('GET', probes[0], { token: pre.buyer.token });
    check(tag('bearer-only (no cookies) request obeys the same rule'), refusedOrdinary(scope, 'buyer') ? bearerOnly.status === 503 || bearerOnly.status === bearerBase : bearerOnly.status === bearerBase, `${bearerOnly.status} (no-maintenance bearer-only baseline ${bearerBase}); never a 2xx`) ;
    check(tag('bearer-only never succeeds where the cookie request is refused'), !refusedOrdinary(scope, 'buyer') || bearerOnly.status < 200 || bearerOnly.status >= 300, bearerOnly.status);

    // CONTROL PLANE by every identity
    const ctlBad = [];
    for (const n of names) {
      const st = await call('GET', '/api/admin/system/maintenance/status', { jar: pre[n].jar, token: pre[n].token });
      const ac = await call('POST', '/api/admin/system/maintenance/activate', { jar: pre[n].jar, token: pre[n].token, body: { scope: 'dealers' } });
      const rc = await call('POST', '/api/admin/system/maintenance/recover', { jar: pre[n].jar, token: pre[n].token, body: { password: 'definitely-wrong', reason: REASON } });
      const allowedStatus = recoveryCapable(n);
      const stOk = allowedStatus ? st.status === 200 : (scope === 'global' ? st.status === 503 : st.status === 403);
      const acOk = n === 'owner' ? ac.status === 400 : (scope === 'global' ? ac.status === 503 : ac.status === 403);
      const rcOk = allowedStatus ? rc.status === 403 : (scope === 'global' ? rc.status === 503 : rc.status === 403);
      if (!(stOk && acOk && rcOk)) ctlBad.push(`${n}: status ${st.status} activate(no reason) ${ac.status} recover(wrong pw) ${rc.status}`);
    }
    check(tag('control plane: only owner/technical read status; only owner may activate; wrong step-up never recovers; others refused'), ctlBad.length === 0, ctlBad.join(' | '));
    check(tag('control-plane probes changed nothing (scope, version unchanged except the intended activation)'), dbState().maintenanceScope === scope && dbState().isMaintenanceMode === true, JSON.stringify(dbState()).slice(0, 160));

    // REFRESH TOKEN
    const rfBad = [];
    for (const n of names) {
      const fresh = pre[n];
      const rf = await call('POST', '/api/auth/refresh', { jar: { refreshToken: fresh.jar.refreshToken } });
      const newCookies = (rf.setCookies || []).filter((c) => /^(token|refreshToken)=[^;]+/.test(c));
      const ok = refusedSession(scope, n) ? rf.status === 503 && newCookies.length === 0 : rf.status === 200;
      if (!ok) rfBad.push(`${n}:${rf.status}`);
    }
    check(tag('refresh token: affected audiences cannot mint a new session; unaffected can'), rfBad.length === 0, rfBad.join(' '));

    // LOGOUT (revokes the session; always allowed)
    const loBad = [];
    for (const n of names) {
      const sess = pre[n];
      const lo = await call('POST', '/api/auth/logout', { jar: sess.jar, token: sess.token });
      const after = await call('GET', '/api/v1/auth/me', { jar: sess.jar, token: sess.token });
      if (!(lo.status === 200 && after.status === 401)) loBad.push(`${n}: logout ${lo.status}, token afterwards ${after.status}`);
    }
    check(tag('logout works for EVERY identity during maintenance and really revokes the token (401 afterwards)'), loBad.length === 0, loBad.join(' | '));

    // RECOVERY BY THE TECHNICAL USER (grant) or owner; need fresh sessions for them if logged out above
    const ownerNow = await session(actors.owner); const techNow = await session(actors.tech);
    check(tag('owner and granted technical user can still sign in after their logout'), ownerNow.status === 200 && techNow.status === 200, `${ownerNow.status}/${techNow.status}`);
    own.jar = ownerNow.jar; own.token = ownerNow.token;
    const who = scope === 'global' ? techNow : ownerNow;
    const rc = await call('POST', '/api/admin/system/maintenance/recover', { jar: who.jar, token: who.token, body: { password: PW, reason: `ending ${scope} rehearsal`, incidentRef: 'INC-M' } });
    effective += 1;
    check(tag('recovery succeeds; server state inactive'), rc.status === 200 && rc.body.changed === true && rc.body.state.active === false && dbState().isMaintenanceMode === false, rc.status + JSON.stringify(rc.body).slice(0, 100));
    const pub2 = await call('GET', '/api/cars', {});
    check(tag('public marketplace back to normal after recovery'), pub2.status === 200, pub2.status);
    for (const n of names) baseSessions[n] = await session(actors[n]);
    check(tag('everyone can sign in again after recovery'), names.every((n) => baseSessions[n].status === 200), names.filter((n) => baseSessions[n].status !== 200).join(','));
    own.jar = baseSessions.owner.jar; own.token = baseSessions.owner.token;
  }

  // ───────── audit: one row per EFFECTIVE change, attributed
  const aud = sql(`select count(*) from audit_logs where action like 'Maintenance %'`);
  check('MA1 audit has exactly one record per effective activation/recovery (8), none for probes or refused attempts', Number(aud) === effective, `${aud} vs ${effective}`);
  const withActor = sql(`select count(*) from audit_logs where action like 'Maintenance %' and actor_id is not null`);
  check('MA2 every maintenance audit row names its actor', Number(withActor) === effective, withActor);
  check('MA3 the global recovery by the technical user is attributed to them with their reason', sql(`select count(*) from audit_logs where action like 'Maintenance recovered: global%' and actor_id='${actors.tech.id}'`) === '1');

  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
