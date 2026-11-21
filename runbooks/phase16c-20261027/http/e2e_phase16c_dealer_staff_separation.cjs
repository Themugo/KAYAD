/* global setTimeout, console, process */
// PHASE 16C - dealer / dealer-employee separation, round 2. Adds what 16B did not prove strongly enough:
//  * POSITIVE CONTROLS (a refusal only counts if the same actor can do the permitted thing), with exact refusal codes
//  * dealer-employee journey end to end: invite -> accept -> use -> remove, with mass assignment on every step
//  * account recovery (password reset) cannot change role or owner state; non-owner cannot recover an owner
//  * the DATABASE layer: anon/authenticated cannot write profiles/users; profiles.role is a one-way mirror, owner authority is not in it
// Disposable local stack only. DB needs the owner-governance + owner-MFA candidates; backend needs WEBHOIST_EMAIL=owner148@example.test.
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const auth = (u) => ({ jar: u.jar, token: u.token });
const rowOf = (id) => sql(`select role||'/'||coalesce(super_admin::text,'null')||'/'||status from users where id='${id}'`);
const prof = (id) => sql(`select coalesce((select role from profiles where id='${id}'),'none')`);
const owners = () => sql('select count(*) from owner_memberships');
const dbq = (role, sub, stmt) => { // run one statement as a Supabase DB role with a JWT subject, return output lines
  const args = ['-h', '127.0.0.1', '-p', process.env.PGPORT || '54329', '-U', 'postgres', '-d', process.env.PGDB || 'kayad_t', '-Atq', '-c', `set role ${role}`, '-c', `select set_config('request.jwt.claim.sub','${sub}',false)`, '-c', stmt];
  try { return execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').slice(1).join('\n'); } catch (e) { return 'ERR:' + String(e.stderr || e.message).trim().split('\n')[0]; }
};
(async () => {
  const mk = async (role) => { const u = await L.register(role === 'dealer' ? 'dealer' : 'user'); await L.verifyEmailViaToken(u.email); const id = u.id || sql(`select id from users where email='${u.email}'`); sql(`update users set role='${role}', status='approved', email_verified=true where id='${id}'`); const l = await L.login(u.email); return { id, email: u.email, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken }; };
  const approvedDealer = async () => { const d = await L.register('dealer'); await L.verifyEmailViaToken(d.email); const id = d.id || sql(`select id from users where email='${d.email}'`); sql(`update users set status='approved' where id='${id}'`); sql(`update dealers set approved=true where "user"='${id}'`); L.grantFixtureSubscription(id); const l = await L.login(d.email); return { id, email: d.email, jar: l.jar }; };
  // fixture owner with an ACTIVE membership; users.role stays 'user' (authority comes from membership only)
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const o1t = await mk('user'); sql(`update users set email='${OWNER}' where id='${o1t.id}'`);
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o1t.id}','${OWNER}','active','bootstrap','16C fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const lo = await L.login(OWNER); const o1 = { id: o1t.id, jar: lo.jar, token: lo.res.body?.token || lo.res.body?.accessToken };
  check('C0 fixture: owner works and its users.role is NOT superadmin (membership is the only authority)', (await call('GET', '/api/owner', auth(o1))).status === 200 && sql(`select role from users where id='${o1.id}'`) === 'user');
  const M0 = owners();

  // ===== C1 team invitation: positive control + exact refusals =====
  let A = await approvedDealer();
  const ok = await call('POST', '/api/dealer-platform/team/invite', { ...auth(A), body: { email: L.uniq('staffA'), role: 'sales_agent' } });
  check('C1 POSITIVE CONTROL: the same dealer CAN invite a sales_agent (201)', ok.status === 201, ok.status + ' ' + JSON.stringify(ok.body).slice(0, 100));
  for (const bad of ['owner', 'webhoist', 'superadmin', 'super_admin', 'admin', 'System Owner', 'dealer', 'dealer_owner', 'owner ', '../owner', 'MANAGER ']) {
    const em = L.uniq('bad'); const r = await call('POST', '/api/dealer-platform/team/invite', { ...auth(A), body: { email: em, role: bad } });
    check(`C1 invite role '${bad}' -> exactly 400 "Invalid team role" and no row`, r.status === 400 && /Invalid team role/.test(r.body?.message || '') && sql(`select count(*) from dealer_teams where invite_email='${em}'`) === '0', r.status + ' ' + (r.body?.message || ''));
  }
  const adm = await mk('admin'); const adminInv = await call('POST', '/api/dealer-platform/team/invite', { ...auth(adm), body: { email: L.uniq('byadmin'), role: 'owner' } });
  check('C1 even an ADMIN cannot create an owner-grade dealer team role', adminInv.status >= 400 && adminInv.status < 500, adminInv.status);

  // ===== C2 employee journey: invite -> accept (with mass assignment) -> use -> escalate (refused) -> remove =====
  A = await approvedDealer();
  const staff = await L.register('user', { email: L.uniq('mgr') }); await L.verifyEmailViaToken(staff.email); const sid = staff.id || sql(`select id from users where email='${staff.email}'`); let sl = await L.login(staff.email);
  const inv = await call('POST', '/api/dealer-platform/team/invite', { ...auth(A), body: { email: staff.email, role: 'manager' } });
  check('C2 dealership owner invites a MANAGER (the highest employee role)', inv.status === 201, inv.status + ' ' + JSON.stringify(inv.body).slice(0, 100));
  const rowId = inv.body?.data?.id; const raw = crypto.randomBytes(32).toString('hex');
  sql(`update dealer_teams set invite_token_hash='${L.hashToken(raw)}', invite_expires_at=now()+interval '1 day' where id='${rowId}'`);
  const acc = await call('POST', '/api/dealer-platform/team/accept', { jar: sl.jar, body: { token: raw, role: 'superadmin', userRole: 'superadmin', super_admin: true, isOwner: true, status: 'approved', permissions: { canManageTeam: true } } });
  check('C2 accept with privilege fields in the body: membership active, role stays "manager", users.role stays "user", profiles.role "user"', acc.status === 200 && sql(`select role||'/'||status from dealer_teams where id='${rowId}'`) === 'manager/active' && rowOf(sid) === 'user/false/approved' && prof(sid) === 'user', acc.status + ' ' + rowOf(sid));
  const sa = { jar: sl.jar };
  check('C2 accept ignored the mass-assigned permissions { canManageTeam: true } (a new member holds none until the dealership owner grants them)', !/true/.test(sql(`select permissions::text from dealer_teams where id='${rowId}'`)), sql(`select permissions::text from dealer_teams where id='${rowId}'`));
  const grant = await call('PUT', `/api/dealer-platform/team/${rowId}`, { ...auth(A), body: { permissions: { canManageTeam: true } } });
  check('C2 the DEALERSHIP OWNER can grant the manager a real, allow-listed permission (canManageTeam)', grant.status === 200, grant.status + ' ' + (grant.body?.code || ''));
  const ownerSurfaces = [['GET', '/api/owner'], ['POST', '/api/owner/invitations'], ['GET', '/api/owner/mfa'], ['GET', '/api/admin/staff'], ['POST', '/api/admin/staff'], ['GET', '/api/admin/users?limit=1'], ['POST', `/api/owner/members/${o1.id}/recovery`], ['DELETE', `/api/owner/members/${o1.id}`]];
  const refused = []; for (const [m, p] of ownerSurfaces) { const r = await call(m, p, { ...sa, body: m === 'GET' ? undefined : { email: 'x@example.test', confirmEmail: 'x@example.test', password: L.PASSWORD, name: 'x', role: 'admin' } }); refused.push(r.status); }
  check('C2 the manager employee is refused EVERY owner/staff surface (401/403)', refused.every((s) => s === 401 || s === 403), refused.join(','));
  check('C2 …and the owner row and owner count are untouched', owners() === M0 && sql(`select status from owner_memberships where user_id='${o1.id}'`) === 'active');
  // positive control: the manager really has team powers (so the refusals above are not "no access at all")
  const roster = await call('GET', '/api/dealer-platform/team', sa);
  check('C2 POSITIVE CONTROL: that manager CAN use the dealer team roster (it is a real organisation role)', roster.status === 200, roster.status + ' ' + (roster.body?.code || ''));
  // escalation attempts by the manager
  const selfUp = await call('PUT', `/api/dealer-platform/team/${rowId}`, { ...sa, body: { role: 'viewer', status: 'active' } });
  check('C2 manager cannot edit their OWN team row (403)', selfUp.status === 403, selfUp.status);
  const mgrInvMgr = await call('POST', '/api/dealer-platform/team/invite', { ...sa, body: { email: L.uniq('m2'), role: 'manager' } });
  check('C2 manager cannot invite another manager (TEAM_ROLE_OWNER_ONLY)', mgrInvMgr.status === 403 && mgrInvMgr.body?.code === 'TEAM_ROLE_OWNER_ONLY', mgrInvMgr.status + ' ' + mgrInvMgr.body?.code);
  const mgrInvOwner = await call('POST', '/api/dealer-platform/team/invite', { ...sa, body: { email: L.uniq('m3'), role: 'owner' } });
  check('C2 manager cannot invite role "owner" (400)', mgrInvOwner.status === 400, mgrInvOwner.status);
  const lowInv = await call('POST', '/api/dealer-platform/team/invite', { ...sa, body: { email: L.uniq('m4'), role: 'viewer' } });
  const lowId = lowInv.body?.data?.id;
  const unk = lowId ? await call('PUT', `/api/dealer-platform/team/${lowId}`, { ...sa, body: { permissions: { isOwner: true, superadmin: true } } }) : { status: 0 };
  check('C2 unknown permission keys such as isOwner/superadmin are rejected (400 UNKNOWN_PERMISSION)', unk.status === 400 && unk.body?.code === 'UNKNOWN_PERMISSION', unk.status + ' ' + unk.body?.code);
  const rolePut = lowId ? await call('PUT', `/api/dealer-platform/team/${lowId}`, { ...sa, body: { role: 'superadmin' } }) : { status: 0 };
  check('C2 team role update to "superadmin" rejected (400 Invalid team role)', rolePut.status === 400, rolePut.status);
  check('C2 after all attempts: users.role/profiles.role of the manager and of the team still unchanged', rowOf(sid) === 'user/false/approved' && prof(sid) === 'user' && owners() === M0);
  // removal: the employee's still-valid session loses organisation access immediately
  const rem = await call('DELETE', `/api/dealer-platform/team/${rowId}`, auth(A));
  const after = await call('GET', '/api/dealer-platform/team', sa);
  check('C2 removed employee: existing session immediately loses team access (403)', rem.status === 200 && after.status === 403, `${rem.status}->${after.status}`);

  // ===== C3 account recovery cannot change authority =====
  const rt = crypto.randomBytes(24).toString('hex');
  sql(`update user_auth set reset_token='${L.hashToken(rt)}', reset_token_expire=now()+interval '1 hour' where user_id='${sid}'`);
  const rs = await call('POST', '/api/auth/reset-password', { body: { token: rt, password: 'R3set#Password1', role: 'superadmin', isOwner: true, super_admin: true } });
  check('C3 password reset with privilege fields in the body: succeeds, role/owner state unchanged', rs.status === 200 && rowOf(sid) === 'user/false/approved' && prof(sid) === 'user' && owners() === M0, rs.status + ' ' + rowOf(sid));
  const rs2 = await call('POST', '/api/auth/reset-password', { body: { token: rt, password: 'R3set#Password2' } });
  check('C3 the reset token is single use', rs2.status >= 400 && rs2.status < 500, rs2.status);
  const rl = await L.login(staff.email, 'R3set#Password1');
  check('C3 sign-in with the reset password works and still yields no owner access', rl.res.status === 200 && (await call('GET', '/api/owner', { jar: rl.jar })).status === 403, rl.res.status);
  const rec = await call('POST', `/api/owner/members/${o1.id}/recovery`, { ...auth(A), body: { confirmEmail: OWNER, password: L.PASSWORD, reason: 'crafted request by a dealer' } });
  check('C3 a dealer cannot "recover" (reset) an owner', rec.status === 403 && sql(`select status from owner_memberships where user_id='${o1.id}'`) === 'active', rec.status);
  const fg = await call('POST', '/api/auth/forgot-password', { body: { email: OWNER } });
  check('C3 forgot-password for the owner address gives the same generic answer (no enumeration of owners)', fg.status === 200 && !/owner/i.test(JSON.stringify(fg.body)), fg.status);

  // ===== C4 stale JWT after demotion from a staff role keeps no dealer/owner reach =====
  const st = await mk('admin'); const w1 = await call('GET', '/api/admin/users?limit=1', auth(st)); sql(`update users set role='user' where id='${st.id}'`); await new Promise((r) => setTimeout(r, 1500));
  const w2 = await call('GET', '/api/admin/users?limit=1', auth(st)); check('C4 staff session after demotion to user: no admin access (control: it had access before)', w1.status !== 403 && w2.status === 403, `${w1.status}->${w2.status}`);

  // ===== C5 DATABASE layer =====
  const TARGET = A.id; const before = prof(TARGET);
  for (const role of ['anon', 'authenticated']) {
    const r1 = dbq(role, TARGET, `update public.profiles set role='superadmin' where id='${TARGET}' returning id`);
    const r2 = dbq(role, TARGET, `update public.users set role='superadmin', super_admin=true where id='${TARGET}' returning id`);
    const r3 = dbq(role, TARGET, `select count(*) from public.profiles`);
    check(`C5 ${role}: cannot update profiles/users (error or 0 rows) and sees no profiles rows`, (r1 === '' || r1.startsWith('ERR')) && (r2 === '' || r2.startsWith('ERR')) && (r3 === '0' || r3.startsWith('ERR')), `${r1}|${r2}|${r3}`);
  }
  check('C5 …and nothing changed (profiles.role and users.role of the dealer)', prof(TARGET) === before && rowOf(TARGET).startsWith('dealer/'), prof(TARGET) + ' ' + rowOf(TARGET));
  const admU = await mk('admin');
  const isAdm = (id) => dbq('authenticated', id, 'select public.is_admin()');
  check('C5 control: the DB-layer is_admin() works (true for a real admin whose profiles.role mirrors users.role)', isAdm(admU.id) === 't', isAdm(admU.id));
  check('C5 is_admin() is FALSE for the dealer and for the owner (owner authority is a membership, not a role; profiles.role of the owner is "user")', isAdm(A.id) === 'f' && isAdm(o1.id) === 'f' && prof(o1.id) === 'user', `${isAdm(A.id)}/${isAdm(o1.id)}/${prof(o1.id)}`);
  const thr = await mk('user'); sql(`update users set role='superadmin', super_admin=true where id='${thr.id}'`);
  check('C5 DOCUMENTED: a users.role write IS mirrored into profiles.role and would make DB-layer is_admin() true — which is why the primary owner\'s role must not be changed to "make owner work" (throwaway user only)', prof(thr.id) === 'superadmin' && isAdm(thr.id) === 't', `${prof(thr.id)}/${isAdm(thr.id)}`);
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
