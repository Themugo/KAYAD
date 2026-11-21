// DB-backed inventory deletion-state, soft-delete visibility and team/org isolation checks (Phase 14.8).
const { spawn } = require('child_process');
const crypto = require('crypto');
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const IMG = `'[{"url":"https://img.test/x.jpg"}]'::jsonb`;
// Fixture insert bypasses table triggers (disposable DB only) so states the application would not create directly can be seeded.
const seedCar = (dealerId, title, cols = {}) => {
  const base = { title, brand: 'Toyota', model: 'Prado', year: 2018, price: 1000000, dealer_id: dealerId, status: 'available', images: IMG, ...cols };
  const keys = Object.keys(base); const vals = keys.map((k) => { const v = base[k]; return k === 'images' ? v : v === null ? 'null' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`; });
  return sql(`set session_replication_role=replica; insert into cars(${keys.join(',')}) values (${vals.join(',')}) returning id`).split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0];
};
const holderDone = (h) => (h.exitCode !== null ? Promise.resolve() : new Promise((z) => h.on('close', z))); // psql may already have exited when the API call returns
const car = (id) => sql(`select coalesce(deleted_at::text,'-')||'|'||coalesce(status,'')||'|'||coalesce(deleted_by::text,'-') from cars where id='${id}'`).split('|');
async function approvedDealer() {
  const d = await L.register('dealer'); await L.verifyEmailViaToken(d.email);
  sql(`update users set status='approved' where id='${d.id}'`); sql(`update dealers set approved=true where "user"='${d.id}'`); L.grantFixtureSubscription(d.id);
  const l = await L.login(d.email); return { ...d, jar: l.jar };
}
(async () => {
  let A = await approvedDealer(); const B = await approvedDealer(); // the API rate-limits per account, so the journey rotates dealer accounts between blocks
  const del = (who, id) => call('DELETE', `/api/cars/${id}`, { jar: who.jar });
  // ---- A. deletion states (real DB)
  const draft = seedCar(A.id, 'draft none', { status: 'draft' });
  let r = await del(A, draft);
  check('A draft listing without an auction is deleted (soft) with actor recorded', r.status === 200 && car(draft)[0] !== '-' && car(draft)[2] === A.id, r.status);
  r = await del(A, draft);
  check('A repeated delete is idempotent (200 alreadyDeleted, stamp unchanged)', r.status === 200 && r.body.alreadyDeleted === true, r.status);
  const stamp1 = car(draft)[0]; await del(A, draft); check('A second repeat does not rewrite the deletion stamp', car(draft)[0] === stamp1, '');
  const plain = seedCar(A.id, 'available plain');
  r = await del(A, plain); check('A available non-auction listing is deletable', r.status === 200 && car(plain)[0] !== '-', r.status);
  A = await approvedDealer();
  const blocked = {
    sold: [{ status: 'sold', sold: 't' }, 'LISTING_SOLD'],
    reserved: [{ status: 'reserved' }, 'LISTING_RESERVED'],
    liveAuction: [{ auction_status: 'live' }, 'AUCTION_ACTIVE'],
    endedAuction: [{ auction_status: 'ended' }, 'AUCTION_CLOSED'],
    bidsCounter: [{ bids_count: 3 }, 'BIDS_PRESENT'],
  };
  for (const [name, [cols, code]] of Object.entries(blocked)) {
    const id = seedCar(A.id, 'blocked ' + name, cols.sold ? { status: 'sold' } : cols);
    if (cols.sold) sql(`update cars set sold=true where id='${id}'`);
    r = await del(A, id);
    check(`A ${name} listing: 409 ${code}, not deleted`, r.status === 409 && r.body.code === 'LISTING_DELETE_BLOCKED' && r.body.reason === code && car(id)[0] === '-', r.status + JSON.stringify(r.body).slice(0, 120));
  }
  const bidder = await L.register('user'); await L.verifyEmailViaToken(bidder.email);
  const staleCounter = seedCar(A.id, 'bid row only');
  sql(`insert into bids(car_id,user_id,amount,status) values ('${staleCounter}','${bidder.id}',1100000,'active')`);
  r = await del(A, staleCounter);
  check('A a bid row with a stale (zero) counter still blocks deletion', r.status === 409 && car(staleCounter)[0] === '-', r.status);
  const hi = seedCar(A.id, 'highest bidder only', { highest_bidder_id: bidder.id });
  r = await del(A, hi); check('A a highest bidder with a zero counter blocks deletion', r.status === 409 && car(hi)[0] === '-', r.status);
  const bidFk = sql(`select count(*) from bids where car_id='${staleCounter}'`);
  check('A bid rows are intact after the refused deletion', bidFk === '1', bidFk);
  A = await approvedDealer();
  const foreign = seedCar(B.id, 'B private');
  r = await del(A, foreign); check('A non-owner cannot delete another dealer\'s listing (403) and it stays', r.status === 403 && car(foreign)[0] === '-', r.status);
  r = await call('DELETE', `/api/cars/${'00000000-0000-4000-8000-000000000000'}`, { jar: A.jar }); check('A unknown id -> 404', r.status === 404, r.status);
  r = await call('DELETE', `/api/cars/${foreign}`, {}); check('A unauthenticated delete -> 401', r.status === 401, r.status);
  r = await call('DELETE', `/api/cars/${foreign}`, { jar: B.jar, csrfHeader: 'wrong' }); check('A delete without a valid CSRF token -> 403 and the listing stays', r.status === 403 && car(foreign)[0] === '-', r.status);
  // concurrent deletes
  A = await approvedDealer();
  const cc = seedCar(A.id, 'concurrent');
  const many = await Promise.all(Array.from({ length: 10 }, () => del(A, cc)));
  check('A 10 concurrent deletes: all succeed, exactly one deletion stamp', many.every((x) => x.status === 200) && car(cc)[0] !== '-', many.map((x) => x.status).join(','));
  await new Promise((z) => setTimeout(z, 62000)); // let the per-minute write limiter window reset after the 10-way burst
  A = await approvedDealer();
  // race: a reservation committed in another session while the delete waits on the row lock
  const rc = seedCar(A.id, 'race reserved');
  const holder = spawn('psql', ['-h', '127.0.0.1', '-p', process.env.PGPORT || '54329', '-U', 'postgres', '-d', process.env.PGDB || 'kayad_t', '-q', '-c', `begin; update cars set status='reserved' where id='${rc}'; select pg_sleep(2.5); commit;`]);
  await new Promise((z) => setTimeout(z, 700));
  r = await del(A, rc); await holderDone(holder);
  check('A race: a reservation committing during the delete makes the delete fail (409), not silently succeed', r.status === 409 && car(rc)[0] === '-' && car(rc)[1] === 'reserved', r.status + ' ' + JSON.stringify(r.body).slice(0,120) + JSON.stringify(car(rc)));
  const rb = seedCar(A.id, 'race bid');
  const holder2 = spawn('psql', ['-h', '127.0.0.1', '-p', process.env.PGPORT || '54329', '-U', 'postgres', '-d', process.env.PGDB || 'kayad_t', '-q', '-c', `begin; update cars set bids_count=1 where id='${rb}'; select pg_sleep(2.5); commit;`]);
  await new Promise((z) => setTimeout(z, 700));
  r = await del(A, rb); await holderDone(holder2);
  check('A race: a bid counter committing during the delete makes the delete fail (409)', r.status === 409 && car(rb)[0] === '-', r.status);
  // bulk delete
  const b1 = seedCar(A.id, 'bulk ok'); const b2 = seedCar(A.id, 'bulk sold', { status: 'sold' }); const b3 = seedCar(A.id, 'bulk reserved', { status: 'reserved' }); const b4 = seedCar(A.id, 'bulk live', { auction_status: 'live' });
  r = await call('POST', '/api/dealer/cars/bulk-delete', { jar: A.jar, body: { ids: [b1, b2, b3, b4, foreign] } });
  check('A bulk delete soft-deletes only eligible own listings and reports the rest', r.status === 200 && r.body.deletedCount === 1 && r.body.skipped?.length === 3 && car(b1)[0] !== '-' && [b2, b3, b4, foreign].every((i) => car(i)[0] === '-'), r.status + JSON.stringify(r.body).slice(0, 200));
  check('A bulk delete never removes rows (history preserved)', sql(`select count(*) from cars where id in ('${b1}','${b2}','${b3}','${b4}','${foreign}')`) === '5', '');
  r = await call('POST', '/api/dealer/cars/bulk-delete', { jar: A.jar, body: { ids: [b2, b3] } });
  check('A bulk delete of only protected listings -> 409 with reasons', r.status === 409 && r.body.skipped?.length === 2, r.status);
  A = await approvedDealer();
  // ---- B. reserved release is not a seller action
  r = await call('PATCH', '/api/dealer/cars/bulk-status', { jar: A.jar, body: { ids: [b3], status: 'reserved' } });
  check('B a seller cannot set the reserved state themselves (400)', r.status === 400, r.status);
  // ---- C. visibility after deletion
  A = await approvedDealer();
  const vis = seedCar(A.id, 'VISCHECK-' + Date.now());
  const visTitle = sql(`select title from cars where id='${vis}'`);
  let pub = await call('GET', `/api/cars?search=${visTitle}&limit=50`, { noCsrf: true });
  check('C an active listing is visible publicly before deletion', JSON.stringify(pub.body).includes(vis), pub.status);
  let inv = await call('GET', '/api/dealer-platform/inventory?limit=100', { jar: A.jar });
  check('C and in the owner inventory', JSON.stringify(inv.body).includes(vis), inv.status);
  await del(A, vis);
  pub = await call('GET', `/api/cars?search=${visTitle}&limit=50`, { noCsrf: true });
  check('C after deletion it disappears from public search', !JSON.stringify(pub.body).includes(vis), '');
  r = await call('GET', `/api/cars/${vis}`, { noCsrf: true }); check('C public detail -> 404', r.status === 404, r.status);
  r = await call('GET', `/api/cars/${vis}`, { jar: A.jar }); check('C owner detail -> 404 (history is admin-only)', r.status === 404, r.status);
  inv = await call('GET', '/api/dealer-platform/inventory?limit=100', { jar: A.jar }); check('C owner inventory no longer lists it', !JSON.stringify(inv.body).includes(vis), '');
  for (const [lbl, path] of [['my-listings', '/api/cars/my-listings'], ['dealer my-cars', '/api/cars/dealer/my-cars'], ['/api/dealer/cars', '/api/dealer/cars?limit=100']]) {
    const x = await call('GET', path, { jar: A.jar }); check(`C ${lbl} no longer lists it`, !JSON.stringify(x.body).includes(vis), x.status);
  }
  r = await call('PUT', `/api/cars/${vis}`, { jar: A.jar, body: { title: 'resurrect' } }); check('C owner cannot edit a deleted listing (404) and the row is unchanged', r.status === 404 && sql(`select title from cars where id='${vis}'`) === visTitle, r.status);
  r = await call('POST', `/api/cars/${vis}/images`, { jar: A.jar, form: new FormData() }); check('C owner cannot add photos to a deleted listing (404)', r.status === 404, r.status);
  r = await call('DELETE', `/api/cars/${vis}/images/0`, { jar: A.jar }); check('C owner cannot remove photos from a deleted listing (404)', r.status === 404, r.status);
  const buyer = await L.register('user'); await L.verifyEmailViaToken(buyer.email); const bl = await L.login(buyer.email);
  const before = sql(`select clicks||'|'||favorites_count from cars where id='${vis}'`);
  await call('POST', `/api/cars/${vis}/click`, { jar: bl.jar }); await call('POST', `/api/cars/${vis}/favorite`, { jar: bl.jar });
  check('C click/favourite counters do not move for a deleted listing', sql(`select clicks||'|'||favorites_count from cars where id='${vis}'`) === before, before);
  r = await call('POST', `/api/favorites/${vis}/toggle`, { jar: bl.jar }); check('C a deleted listing cannot be newly favourited', r.status === 404, r.status);
  const adm = await L.register('user'); sql(`update users set role='superadmin', status='approved', email_verified=true where id='${adm.id}'`); const al = await L.login(adm.email);
  r = await call('GET', `/api/admin/cars?limit=200&search=${visTitle}`, { jar: al.jar });
  check('C admin retains historical access to deleted listings (admin list)', r.status === 200, r.status);
  // ---- D. team / organisation isolation (real DB)
  A = await approvedDealer();
  const M = await L.register('user', { email: L.uniq('member') }); await L.verifyEmailViaToken(M.email); let ml = await L.login(M.email);
  r = await call('GET', '/api/dealer-platform/team', { jar: ml.jar });
  check('D a user with no membership gets 403 (not 500) from organisation routes', r.status === 403, r.status + JSON.stringify(r.body).slice(0, 80));
  r = await call('POST', '/api/dealer-platform/team/invite', { jar: A.jar, body: { email: M.email, role: 'sales_agent' } });
  const memberRow = r.body?.data?.id;
  check('D owner invites a member; invitation secrets are not returned', r.status === 201 && !/invite_token|inviteToken|TokenHash/i.test(JSON.stringify(r.body)), r.status);
  let lst = await call('GET', '/api/dealer-platform/team', { jar: A.jar });
  check('D owner team list never exposes invitation secrets', lst.status === 200 && !/invite_token|inviteToken|TokenHash/i.test(JSON.stringify(lst.body)), lst.status);
  const leg = await call('GET', '/api/dealer/team', { jar: A.jar });
  check('D legacy team list never exposes invitation secrets', leg.status === 200 && !/invite_token|inviteToken|TokenHash/i.test(JSON.stringify(leg.body)), leg.status);
  const legInv = await call('POST', '/api/dealer/team/invite', { jar: A.jar, body: { email: 'x@example.test' } });
  check('D legacy invite route is retired (410) instead of failing with 500', legInv.status === 410, legInv.status);
  const raw = crypto.randomBytes(32).toString('hex');
  sql(`update dealer_teams set invite_token_hash='${L.hashToken(raw)}', invite_expires_at=now()+interval '1 day' where id='${memberRow}'`);
  r = await call('POST', '/api/dealer-platform/team/accept', { jar: ml.jar, body: { token: raw } });
  check('D invitee accepts once', r.status === 200 && sql(`select status from dealer_teams where id='${memberRow}'`) === 'active', r.status + JSON.stringify(r.body).slice(0, 100));
  r = await call('POST', '/api/dealer-platform/team/accept', { jar: ml.jar, body: { token: raw } });
  check('D replaying the invitation token fails', r.status >= 400 && r.status < 500, r.status);
  r = await call('GET', '/api/dealer-platform/team', { jar: ml.jar });
  check('D an active member WITHOUT canManageTeam is refused the roster (403)', r.status === 403 && r.body.code === 'DEALER_PERMISSION_REQUIRED', r.status);
  r = await call('PUT', `/api/dealer-platform/team/${memberRow}`, { jar: ml.jar, body: { role: 'manager' } });
  check('D member cannot self-promote through the API (403)', r.status === 403 && sql(`select role from dealer_teams where id='${memberRow}'`) === 'sales_agent', r.status);
  r = await call('PUT', `/api/dealer-platform/team/${memberRow}`, { jar: ml.jar, body: { permissions: { canManageTeam: true } } });
  check('D member cannot self-grant permissions through the API (403)', r.status === 403 && sql(`select permissions->>'canManageTeam' from dealer_teams where id='${memberRow}'`) !== 'true', r.status);
  sql(`update dealer_teams set permissions='{"canManageTeam":true}' where id='${memberRow}'`);
  r = await call('GET', '/api/dealer-platform/team', { jar: ml.jar });
  check('D a member granted canManageTeam can list their own organisation roster only', r.status === 200 && JSON.stringify(r.body).includes(memberRow) && !JSON.stringify(r.body).includes('B private'), r.status);
  r = await call('POST', '/api/dealer-platform/team/invite', { jar: ml.jar, body: { email: L.uniq('peer'), role: 'manager' } });
  check('D a manager-permission member cannot mint a manager (403 TEAM_ROLE_OWNER_ONLY)', r.status === 403 && r.body.code === 'TEAM_ROLE_OWNER_ONLY', r.status);
  const bTeam = await call('POST', '/api/dealer-platform/team/invite', { jar: B.jar, body: { email: L.uniq('bm'), role: 'viewer' } });
  const bRow = bTeam.body?.data?.id;
  r = await call('PUT', `/api/dealer-platform/team/${bRow}`, { jar: ml.jar, body: { role: 'lot_agent' } });
  check('D organisation-id substitution: A\'s member cannot modify B\'s team row (404)', r.status === 404 && sql(`select role from dealer_teams where id='${bRow}'`) === 'viewer', r.status);
  r = await call('DELETE', `/api/dealer-platform/team/${bRow}`, { jar: ml.jar });
  check('D ...nor remove it (404)', r.status === 404 && sql(`select status from dealer_teams where id='${bRow}'`) === 'invited', r.status);
  r = await call('GET', `/api/dealer-platform/team?dealerId=${B.id}`, { jar: ml.jar });
  check('D a client-supplied dealerId never selects the organisation', r.status === 200 && !JSON.stringify(r.body).includes(bRow), r.status);
  r = await call('DELETE', `/api/dealer-platform/team/${memberRow}`, { jar: ml.jar });
  check('D a member cannot remove themselves', r.status === 403, r.status);
  r = await call('DELETE', `/api/dealer-platform/team/${memberRow}`, { jar: A.jar });
  check('D owner removes the member', r.status === 200 && sql(`select status from dealer_teams where id='${memberRow}'`) === 'removed', r.status);
  r = await call('GET', '/api/dealer-platform/team', { jar: ml.jar });
  check('D revocation applies on the very next request (existing session loses access)', r.status === 403, r.status);
  r = await call('POST', '/api/dealer-platform/team/accept', { jar: ml.jar, body: { token: raw } });
  check('D a revoked invitation cannot be re-accepted', r.status >= 400 && sql(`select status from dealer_teams where id='${memberRow}'`) === 'removed', r.status);
  // ---- E. stale sessions
  const s = await approvedDealer(); const before2 = await call('GET', '/api/auth/me', { jar: s.jar });
  sql(`update user_auth set token_version=token_version+1 where user_id='${s.id}'`);
  const after2 = await call('GET', '/api/auth/me', { jar: s.jar });
  check('E a session issued before a token-version bump is rejected (401)', before2.status === 200 && after2.status === 401, before2.status + '/' + after2.status);
  const s2 = await approvedDealer(); sql(`update users set is_banned=true where id='${s2.id}'`);
  r = await call('GET', '/api/dealer-platform/dashboard', { jar: s2.jar }); check('E a banned account\'s existing session is refused', r.status === 401 || r.status === 403, r.status);
  const s3 = await approvedDealer(); const tok = s3.jar.token.split('.'); const forged = tok[0] + '.' + tok[1] + '.' + 'x'.repeat(tok[2].length);
  r = await call('GET', '/api/auth/me', { jar: { ...s3.jar, token: forged } }); check('E a forged/tampered token is rejected (401)', r.status === 401, r.status);
  require('fs').writeFileSync(process.env.OUT || 'e2e_inventory_team_results.json', JSON.stringify({ results: L.results }, null, 1));
  const failed = L.results.filter((x) => !x.ok); console.log(`\n${L.results.length - failed.length}/${L.results.length} passed`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
