// Seeds listings in every state, active and soft-deleted, then records which endpoints return a deleted row.
const L = require('./e2e_lib.cjs');
const { sql, call } = L;
const STATES = ['available', 'pending', 'draft', 'hidden', 'reserved', 'sold'];
(async () => {
  const d = await L.register('dealer'); await L.verifyEmailViaToken(d.email); const dl = await L.login(d.email);
  sql(`update users set status='approved' where id='${d.id}'`); sql(`update dealers set approved=true where "user"='${d.id}'`); L.grantFixtureSubscription(d.id);
  const ins = (tag, status, deleted, extra = '') => sql(`set session_replication_role=replica; insert into cars(title,brand,model,year,price,dealer_id,status,images,deleted_at${extra ? ',' + extra.split('=')[0] : ''}) values ('${tag}','Toyota','Prado',2018,1000000,'${d.id}','${status}','[{"url":"https://img.test/x.jpg"}]'::jsonb,${deleted ? 'now()' : 'null'}${extra ? ',' + extra.split('=')[1] : ''}) returning id`).split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0]; // fixture insert bypasses triggers (disposable DB only)
  const cars = {};
  for (const s of STATES) for (const del of [false, true]) cars[`${del ? 'DEL' : 'ACT'}-${s}`] = ins(`${del ? 'DEL' : 'ACT'}-${s}-${d.id.slice(0, 4)}`, s, del);
  cars['DEL-live-auction'] = ins(`DEL-live-auction-${d.id.slice(0, 4)}`, 'available', true, "auction_status='live'");
  cars['ACT-live-auction'] = ins(`ACT-live-auction-${d.id.slice(0, 4)}`, 'available', false, "auction_status='live'");
  const delIds = Object.entries(cars).filter(([k]) => k.startsWith('DEL')).map(([, v]) => v);
  const actIds = Object.entries(cars).filter(([k]) => k.startsWith('ACT')).map(([, v]) => v);
  const tag = d.id.slice(0, 4);
  const other = await L.register('user'); await L.verifyEmailViaToken(other.email); const ol = await L.login(other.email);
  const out = [];
  const probe = async (label, method, path, opts = {}) => {
    const r = await call(method, path, opts); const txt = JSON.stringify(r.body);
    const leaked = delIds.filter((id) => txt.includes(id)); const leakedTitles = [...txt.matchAll(new RegExp(`DEL-[a-z-]+-${tag}`, 'g'))].map((m) => m[0]);
    out.push({ label, method, path: path.replace(/[0-9a-f-]{36}/g, ':id'), status: r.status, deletedRowsReturned: [...new Set([...leaked.map((id) => Object.keys(cars).find((k) => cars[k] === id)), ...leakedTitles.map((t) => t.replace(`-${tag}`, ''))])] });
    return r;
  };
  const anon = { noCsrf: true };
  await probe('public list', 'GET', '/api/cars?limit=100', anon);
  await probe('public list (search term)', 'GET', `/api/cars?search=${tag}&limit=100`, anon);
  await probe('public list (include status filter)', 'GET', '/api/cars?status=hidden&limit=100', anon);
  await probe('public list by dealer', 'GET', `/api/cars?dealer=${d.id}&limit=100`, anon);
  for (const k of Object.keys(cars)) if (k.startsWith('DEL')) {
    await probe(`detail ${k} anon`, 'GET', `/api/cars/${cars[k]}`, anon);
  }
  for (const ep of ['price-history', 'insights', 'valuation']) await probe(`${ep} of deleted`, 'GET', `/api/cars/${cars['DEL-available']}/${ep}`, anon);
  await probe('click on deleted', 'POST', `/api/cars/${cars['DEL-available']}/click`, { jar: ol.jar });
  await probe('favorite via car route', 'POST', `/api/cars/${cars['DEL-available']}/favorite`, { jar: ol.jar });
  await probe('favorite add deleted', 'POST', `/api/favorites/${cars['DEL-available']}`, { jar: ol.jar });
  await probe('favorite toggle deleted', 'POST', `/api/favorites/${cars['DEL-available']}/toggle`, { jar: ol.jar });
  await probe('market pulse deleted', 'GET', `/api/market/pulse/${cars['DEL-available']}`, anon);
  await probe('auctions list', 'GET', '/api/auctions?limit=100', anon);
  await probe('auctions live', 'GET', '/api/auctions/live?limit=100', anon);
  await probe('auction detail deleted', 'GET', `/api/auctions/${cars['DEL-live-auction']}`, anon);
  await probe('search suggestions', 'GET', `/api/search?q=${tag}`, anon);
  await probe('dealer my-listings', 'GET', '/api/cars/my-listings', { jar: dl.jar });
  await probe('dealer my-cars', 'GET', '/api/cars/dealer/my-cars', { jar: dl.jar });
  await probe('dealer /api/dealer/cars', 'GET', '/api/dealer/cars?limit=100', { jar: dl.jar });
  await probe('dealer-platform inventory', 'GET', '/api/dealer-platform/inventory?limit=100', { jar: dl.jar });
  await probe('dealer-platform dashboard', 'GET', '/api/dealer-platform/dashboard', { jar: dl.jar });
  await probe('owner detail of own deleted listing', 'GET', `/api/cars/${cars['DEL-available']}`, { jar: dl.jar });
  const edit = await probe('owner edits a deleted listing', 'PUT', `/api/cars/${cars['DEL-available']}`, { jar: dl.jar, body: { title: 'Edited after delete' } });
  out.push({ label: 'edit-after-delete result', status: edit.status, titleNow: sql(`select title from cars where id='${cars['DEL-available']}'`) });
  const del2 = await call('DELETE', `/api/cars/${cars['DEL-available']}`, { jar: dl.jar });
  out.push({ label: 'delete of already-deleted', status: del2.status, body: JSON.stringify(del2.body).slice(0, 100) });
  const bd = await call('POST', '/api/dealer/cars/bulk-delete', { jar: dl.jar, body: { ids: [cars['ACT-sold'], cars['ACT-reserved'], cars['ACT-live-auction']] } });
  out.push({ label: 'BULK DELETE sold+reserved+live-auction', status: bd.status, body: JSON.stringify(bd.body).slice(0, 120), rowsRemainingInTable: sql(`select count(*) from cars where id in ('${cars['ACT-sold']}','${cars['ACT-reserved']}','${cars['ACT-live-auction']}')`) });
  require('fs').writeFileSync(process.env.OUT || 'softdelete_probe.json', JSON.stringify({ cars, out }, null, 1));
  for (const o of out) console.log(JSON.stringify(o));
})().catch((e) => { console.error(e); process.exit(2); });
