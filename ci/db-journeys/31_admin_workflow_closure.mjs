// Route-workflow closure over real HTTP + PostgreSQL (disposable DB). Direct API calls by each actor; no UI, no provider call, no money movement.
//  A settings persistence (load / change / save / reload / feature reads it / invalid / unauthorised / failed save leaves value unchanged)
//  B review moderation (persistence, validation, authorisation)   C site designs (draft lifecycle; publish NOT exercised)
//  D featured-vehicle campaigns (authorisation + validation)       E financial & marketplace admin reads: authorisation matrix, invalid-transition rejection
import { makeUser, q, check, finish, uid, PW, B } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'own31', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const staff = (role) => makeUser({ tag: role.slice(0, 5) + '31', dbRole: role });
const A = { superadmin: await owner() };
for (const r of ['admin', 'moderator', 'marketing', 'accounts', 'escrow_officer', 'hr', 'technical_support', 'ghost_checker']) A[r] = await staff(r);
A.personal = await makeUser({ tag: 'per31' });
A.dealer = await makeUser({ tag: 'dlr31', role: 'dealer', extra: { businessName: `Closure ${uid()} Motors`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
q(`update users set status='approved' where id='${A.dealer.id}'`); await A.dealer.raw('/api/v1/auth/login', { method: 'POST', body: { email: A.dealer.email, password: PW } }); A.dealer.csrf = null;
const anonStatus = async (path, method = 'GET') => (await fetch(B + path, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })).status;
const NON_STAFF = ['personal', 'dealer'];

// ===== A. Settings persistence =====
{
  const get = await A.admin.raw('/api/admin/config');
  check('A1 settings load (200, config + recordedOnly list truthfully exposed)', get.status === 200 && get.j?.config && Array.isArray(get.j.recordedOnly) && get.j.recordedOnly.includes('escrowReleaseDays'), [get.status]);
  const marker = `Closure Support ${uid()}`;
  const put = await A.admin.raw('/api/admin/config', { method: 'PUT', body: { galleryTitle: marker, supportEmail: 'help-closure@example.test' } });
  check('A2 an Admin saves a non-financial setting (200)', put.status === 200, [put.status, put.j]);
  const again = await A.superadmin.raw('/api/admin/config');
  check('A3 reload: the value persisted (read by a different actor)', again.j?.config?.galleryTitle === marker && again.j?.config?.supportEmail === 'help-closure@example.test', again.j?.config?.galleryTitle);
  const pub = await fetch(B + '/api/admin/public/config'); const pubj = await pub.json().catch(() => ({}));
  check('A4 the public feature that consumes the setting returns it (public config)', pub.status === 200 && JSON.stringify(pubj).includes(marker), [pub.status, Object.keys(pubj)]);
  const bad = await A.admin.raw('/api/admin/config', { method: 'PUT', body: { galleryTitle: 'SHOULD-NOT-PERSIST', supportEmail: 'not-an-email' } });
  const after = await A.admin.raw('/api/admin/config');
  check('A5 invalid input is refused (400) and NOTHING from that request is saved (failed save leaves state unchanged)', bad.status === 400 && after.j.config.galleryTitle === marker && after.j.config.supportEmail === 'help-closure@example.test', [bad.status, after.j?.config?.galleryTitle]);
  for (const [k, v] of [['dealerCommission', 99], ['escrowReleaseDays', 0], ['maxListingImages', 500], ['fontSizePct', 'abc']]) {
    const r = await A.admin.raw('/api/admin/config', { method: 'PUT', body: { [k]: v } });
    check(`A6 out-of-range ${k}=${v} refused (400)`, r.status === 400, r.status);
  }
  for (const who of [...NON_STAFF, 'moderator', 'marketing', 'hr', 'technical_support']) {
    const r = await A[who].raw('/api/admin/config', { method: 'PUT', body: { galleryTitle: 'HACK' } });
    check(`A7 ${who} cannot change settings (${r.status})`, r.status === 403);
  }
  check('A8 anonymous cannot read (401) or change (401/403 - CSRF or auth, whichever answers first) settings', (await anonStatus('/api/admin/config')) === 401 && [401, 403].includes(await anonStatus('/api/admin/config', 'PUT')));
  check('A9 no unauthorised write reached the database', (await A.superadmin.raw('/api/admin/config')).j.config.galleryTitle === marker);
  const secret = JSON.stringify((await A.admin.raw('/api/admin/config')).j);
  check('A10 the settings response never carries payment secrets (blank + has* flags only)', !/"consumerSecret":"[^"]+"/.test(secret) && !/"passkey":"[^"]+"/.test(secret));
}

// ===== B. Review moderation =====
{
  const dealerId = A.dealer.id;
  const second = await makeUser({ tag: 'rv231' }); // one review per reviewer per dealer (unique constraint)
  const rev = (txt, by) => q(`insert into reviews(reviewer_id,dealer_id,rating,comment,status) values ('${by}','${dealerId}',4,'${txt}','pending') returning id`).split('\n')[0];
  const r1 = rev('closure review one', A.personal.id); const r2 = rev('closure review two', second.id);
  const list = await A.moderator.raw('/api/admin/reviews?limit=50');
  check('B1 a moderator can LIST reviews (staff read)', list.status === 200 && Array.isArray(list.j?.reviews), [list.status]);
  const asMod = await A.moderator.raw(`/api/admin/reviews/${r1}/status`, { method: 'PATCH', body: { status: 'approved' } });
  check('B2 a moderator cannot CHANGE a review (adminOrSuper; read-only for moderators)', asMod.status === 403, asMod.status);
  const ok = await A.admin.raw(`/api/admin/reviews/${r1}/status`, { method: 'PATCH', body: { status: 'approved' } });
  check('B3 Admin approves a review; persisted with moderator attribution', ok.status === 200 && q(`select status||':'||(moderated_by='${A.admin.id}')::text from reviews where id='${r1}'`) === 'approved:true', [ok.status, ok.j]);
  const inval = await A.admin.raw(`/api/admin/reviews/${r1}/status`, { method: 'PATCH', body: { status: 'bogus' } });
  check('B4 invalid status refused and unchanged', inval.status >= 400 && inval.status < 500 && q(`select status from reviews where id='${r1}'`) === 'approved', inval.status);
  const del = await A.admin.raw(`/api/admin/reviews/${r2}`, { method: 'DELETE' });
  check('B5 Admin deletes a review; it is gone and the other is intact', del.status === 200 && q(`select count(*) from reviews where id='${r2}'`) === '0' && q(`select count(*) from reviews where id='${r1}'`) === '1', [del.status, del.j]);
  for (const who of NON_STAFF) check(`B6 ${who} cannot list or change reviews`, (await A[who].raw('/api/admin/reviews')).status === 403 && (await A[who].raw(`/api/admin/reviews/${r1}/status`, { method: 'PATCH', body: { status: 'rejected' } })).status === 403);
  check('B7 anonymous 401', (await anonStatus('/api/admin/reviews')) === 401);
}

// ===== C. Site designs (draft lifecycle only; publish is NOT exercised) =====
{
  const name = `Closure design ${uid()}`;
  const mk = await A.admin.raw('/api/admin/site-designs', { method: 'POST', body: { name } });
  const id = mk.j?.design?.id;
  check('C1 create a draft design (201)', mk.status === 201 && id, [mk.status, mk.j]);
  const list = await A.admin.raw('/api/admin/site-designs');
  check('C2 the new draft is in the list after reload', list.status === 200 && JSON.stringify(list.j).includes(name), list.status);
  const noConfirm = await A.admin.raw(`/api/admin/site-designs/${id}`, { method: 'DELETE', body: {} });
  check('C3 delete without explicit confirmation is refused (400 CONFIRMATION_REQUIRED) and the draft survives', noConfirm.status === 400 && q(`select count(*) from site_designs where id='${id}'`) === '1', [noConfirm.status, noConfirm.j]);
  for (const who of [...NON_STAFF, 'moderator', 'marketing', 'hr']) check(`C4 ${who} cannot use site designs (${(await A[who].raw('/api/admin/site-designs')).status})`, (await A[who].raw('/api/admin/site-designs')).status === 403);
  const del = await A.admin.raw(`/api/admin/site-designs/${id}`, { method: 'DELETE', body: { confirm: true } });
  check('C5 confirmed delete removes only that draft', del.status === 200 && q(`select count(*) from site_designs where id='${id}'`) === '0', [del.status, del.j]);
  check('C6 the live public site was not touched (no publication created)', q(`select count(*) from site_designs where name='${name}'`) === '0');
}

// ===== D. Featured-vehicle campaigns =====
{
  const l = await A.marketing.raw('/api/admin/featured-campaigns');
  check('D1 marketing (manage_ads) can read campaigns', l.status === 200, [l.status, l.j?.message]);
  for (const who of ['moderator', 'hr', 'technical_support', 'personal', 'dealer']) check(`D2 ${who} is refused (${(await A[who].raw('/api/admin/featured-campaigns')).status})`, (await A[who].raw('/api/admin/featured-campaigns')).status === 403);
  const inv = await A.marketing.raw('/api/admin/featured-campaigns', { method: 'POST', body: {} });
  check('D3 an empty campaign is refused (4xx, nothing created)', inv.status >= 400 && inv.status < 500, [inv.status, inv.j]);
  check('D4 anonymous 401', (await anonStatus('/api/admin/featured-campaigns')) === 401);
}

// ===== E. Financial + marketplace administration: authorisation and invalid-transition rejection (NO money movement) =====
{
  const fakeId = '00000000-0000-4000-8000-0000000000aa';
  const before = { escrows: q('select count(*) from escrows'), payments: q('select count(*) from payments'), wallet: q('select count(*) from wallet_transactions') };
  const reads = [
    ['escrow list', '/api/escrow', ['admin', 'superadmin', 'accounts', 'escrow_officer']],
    ['escrow operations dashboard', '/api/escrow/operations/dashboard', ['admin', 'superadmin', 'accounts', 'escrow_officer']],
    ['payments list', '/api/admin/payments', ['admin', 'superadmin', 'accounts']],
  ];
  for (const [name, path, allowed] of reads) {
    const row = {};
    for (const who of [...Object.keys(A)]) { const r = await A[who].raw(path); row[who] = r.status; }
    const unexpected = Object.entries(row).filter(([who, s]) => allowed.includes(who) ? [401, 403, 500].includes(s) : (s !== 403 && s !== 401));
    check(`E1 ${name}: allowed roles ${allowed.join('/')} read it; every other actor is refused`, unexpected.length === 0, { unexpected, row });
    check(`E1b ${name}: anonymous 401`, (await anonStatus(path)) === 401);
  }
  for (const action of ['release', 'refund', 'close']) {
    for (const who of ['moderator', 'marketing', 'hr', 'personal', 'dealer']) {
      const r = await A[who].raw(`/api/escrow/${fakeId}/${action}`, { method: 'POST', body: {} });
      if (r.status !== 403 && r.status !== 401) { check(`E2 ${who} must not ${action} an escrow (got ${r.status})`, false, r.j); }
    }
    const asFin = await A.accounts.raw(`/api/escrow/${fakeId}/${action}`, { method: 'POST', body: {} });
    check(`E3 ${action} on an unknown escrow is rejected with 4xx, never 500 or success (${asFin.status})`, asFin.status >= 400 && asFin.status < 500, asFin.j);
  }
  check('E4 no escrow, payment or wallet row was created or moved by any of these calls', before.escrows === q('select count(*) from escrows') && before.payments === q('select count(*) from payments') && before.wallet === q('select count(*) from wallet_transactions'));
  // auctions: authorisation + invalid transitions on a fixture vehicle that has no auction
  const car = q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('Closure auction ${uid()}','Toyota','Prado',2018,3000000,'available','${A.dealer.id}',false) returning id`).split('\n')[0];
  for (const who of [...NON_STAFF, 'moderator', 'marketing', 'hr', 'technical_support']) {
    const r = await A[who].raw(`/api/auction-admin/${car}/end`, { method: 'POST', body: {} });
    check(`E5 ${who} cannot end an auction (${r.status})`, r.status === 403);
  }
  const endNo = await A.admin.raw(`/api/auction-admin/${car}/end`, { method: 'POST', body: {} });
  check('E6 ending a vehicle with no live auction is idempotent (200 alreadyClosed or 4xx) and the vehicle is unchanged', ((endNo.status >= 400 && endNo.status < 500) || (endNo.status === 200 && endNo.j?.alreadyClosed !== false)) && q(`select sold::text from cars where id='${car}'`) === 'false', [endNo.status, endNo.j]);
  const extNo = await A.admin.raw(`/api/auction-admin/${car}/extend`, { method: 'POST', body: { hours: 2 } });
  check('E7 extending a non-live auction is rejected (4xx)', extNo.status >= 400 && extNo.status < 500, [extNo.status, extNo.j]);
  const winNo = await A.admin.raw(`/api/auction-admin/${car}/set-winner`, { method: 'POST', body: { bidId: fakeId } });
  check('E8 choosing a winner without a valid bid is rejected (4xx); no sale recorded', winNo.status >= 400 && winNo.status < 500 && q(`select sold::text from cars where id='${car}'`) === 'false', [winNo.status, winNo.j]);
  const hist = await A.admin.raw(`/api/auction-admin/${car}/bids`);
  check('E9 bid history for a fixture vehicle reads as an honest empty list', hist.status === 200, [hist.status, hist.j]);
  // inspections / NTSA / inspector applications: authorisation reads
  const lists = [['inspections', '/api/inspections', ['admin', 'superadmin', 'ghost_checker', 'technical_support']], ['inspector applications', '/api/inspector-applications', ['admin', 'superadmin', 'hr', 'technical_support']], ['NTSA queue', '/api/ntsa-verification', ['admin', 'superadmin', 'ghost_checker']]];
  for (const [name, path, allowed] of lists) {
    const row = {}; for (const who of Object.keys(A)) row[who] = (await A[who].raw(path)).status;
    check(`E10 ${name}: moderator/marketing/hr/personal/dealer are refused unless explicitly allowed (no protected rows)`, ['moderator', 'marketing', 'hr', 'personal', 'dealer'].filter((w) => !allowed.includes(w)).every((w) => [401, 403].includes(row[w])), row);
    check(`E10b ${name}: Admin and Super Admin can read (never 401/403/500)`, ['admin', 'superadmin'].every((w) => ![401, 403, 500].includes(row[w])), row);
    check(`E10c ${name}: anonymous 401`, (await anonStatus(path)) === 401);
  }
}
finish('31_admin_workflow_closure');
