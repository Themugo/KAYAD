/**
 * Phase C.1 — opt-in soft-delete / null-filter integrity test against a REAL disposable PostgreSQL + PostgREST.
 *
 * Runs the unmodified backend data layer (db/index.js, models/_base.js) and the real public read paths
 * (carController.getCars/getCar, sitemapService, searchService, dealerSubscription.service) against a database
 * built from supabase/migrations. No mocks of the data layer.
 *
 * SAFETY: refuses to run unless SUPABASE_URL points at 127.0.0.1/localhost. Seeds its own rows with a unique
 * per-run token and deletes them afterwards. Never point this at a hosted Supabase project.
 *
 * Required env (see runbooks/PHASE_C1_STAGING_RUNBOOK.md):
 *   KAYAD_DISPOSABLE_DB=1, SUPABASE_URL (local rest-v1 proxy), SUPABASE_SERVICE_ROLE_KEY (service_role JWT),
 *   KAYAD_TEST_JWT_SECRET (the disposable PostgREST jwt-secret, used to mint anon/authenticated tokens).
 * Run from backend/: npm run test:soft-delete-integrity
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL || '';
let host = '';
try { host = new URL(url).hostname; } catch { /* unset */ }
const LOCAL = ['127.0.0.1', 'localhost', '::1'].includes(host);
const configured = process.env.KAYAD_DISPOSABLE_DB === '1' && LOCAL && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(process.env.KAYAD_TEST_JWT_SECRET);
if (process.env.KAYAD_DISPOSABLE_DB === '1' && !LOCAL) {
  throw new Error(`Refusing to run the disposable-database soft-delete test against non-local host "${host}".`);
}
const skip = configured ? false : 'disposable database not configured (KAYAD_DISPOSABLE_DB=1 + local SUPABASE_URL required)';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims) => {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  const sig = createHmac('sha256', process.env.KAYAD_TEST_JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};
const rest = async (token, path) => {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: token, Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const fakeRes = () => {
  const out = { statusCode: 200, body: undefined };
  out.status = (c) => { out.statusCode = c; return out; };
  out.json = (b) => { out.body = b; return out; };
  out.set = () => out; out.setHeader = () => out; out.header = () => out; out.type = () => out; out.send = (b) => { out.body = b; return out; };
  return out;
};

const RUN = `c1t${randomUUID().slice(0, 8)}`; // unique brand token isolates this run's fixtures
const ids = {};
let db, Car, User, sb;

describe('Phase C.1 soft-delete and null-filter integrity (disposable PostgreSQL + PostgREST)', { skip }, () => {
  before(async () => {
    db = await import('../../db/index.js');
    Car = (await import('../../models/Car.js')).default;
    User = (await import('../../models/User.js')).default;
    const { initSupabase, getSupabase } = await import('../../utils/supabase.js');
    await initSupabase(); // same initialisation the server performs at boot
    sb = getSupabase();
    const mkUser = async (key, role) => {
      const { data, error } = await sb.from('users').insert({ name: `${RUN} ${key}`, email: `${RUN}.${key}@test.local`, role }).select('id').single();
      assert.ifError(error); ids[key] = data.id;
    };
    await mkUser('dealerA', 'dealer');
    await mkUser('dealerB', 'dealer');
    await mkUser('admin', 'admin');
    const mkCar = async (key, dealer, extra = {}) => {
      const { data, error } = await sb.from('cars').insert({ title: `${RUN} ${key}`, brand: RUN, model: key, year: 2020, price: 1000000, dealer_id: ids[dealer], status: 'available', ...extra }).select('id').single();
      assert.ifError(error); ids[key] = data.id;
    };
    await mkCar('A_active', 'dealerA');
    await mkCar('A_deleted', 'dealerA');
    await mkCar('A_pending', 'dealerA', { status: 'pending' });
    await mkCar('B_active', 'dealerB');
    await mkCar('A_dup_removed', 'dealerA');
    // Realistic deletion paths: the owner/admin delete path (Car.softDelete keeps status) and the
    // duplicate-removal path (status hidden + deletedAt).
    const r = await Car.softDelete(ids.A_deleted, ids.dealerA);
    assert.equal(r.modifiedCount, 1);
    const { error: dupErr } = await sb.from('cars').update({ status: 'hidden', deleted_at: new Date().toISOString(), deleted_by: ids.admin }).eq('id', ids.A_dup_removed);
    assert.ifError(dupErr);
  });

  after(async () => {
    if (!sb) return;
    await sb.from('cars').delete().eq('brand', RUN);
    await sb.from('users').delete().like('email', `${RUN}.%`);
  });

  describe('helper semantics (db/index.js) on a soft-delete table', () => {
    test('explicit null => IS NULL (excludes soft-deleted)', async () => {
      const rows = await db.findAll('cars', { filters: { brand: RUN, deletedAt: null } });
      assert.deepEqual(rows.map((r) => r.id).sort(), [ids.A_active, ids.A_pending, ids.B_active].sort());
    });
    test('{ $exists:false } is equivalent to explicit null', async () => {
      const a = (await db.findAll('cars', { filters: { brand: RUN, deletedAt: { $exists: false } } })).map((r) => r.id).sort();
      const b = (await db.findAll('cars', { filters: { brand: RUN, deletedAt: null } })).map((r) => r.id).sort();
      assert.deepEqual(a, b);
    });
    test('undefined and omitted apply no filter (both return all fixture rows)', async () => {
      const u = await db.findAll('cars', { filters: { brand: RUN, deletedAt: undefined } });
      const o = await db.findAll('cars', { filters: { brand: RUN } });
      assert.equal(u.length, 5); assert.equal(o.length, 5);
    });
    test('$ne:null => IS NOT NULL (only soft-deleted); $exists:true agrees', async () => {
      const ne = (await db.findAll('cars', { filters: { brand: RUN, deletedAt: { $ne: null } } })).map((r) => r.id).sort();
      const ex = (await db.findAll('cars', { filters: { brand: RUN, deletedAt: { $exists: true } } })).map((r) => r.id).sort();
      assert.deepEqual(ne, [ids.A_deleted, ids.A_dup_removed].sort());
      assert.deepEqual(ex, ne);
    });
    test('$eq:null, $and with null and $or with null compile to IS NULL', async () => {
      const eq = await db.findAll('cars', { filters: { brand: RUN, deletedAt: { $eq: null } } });
      const and = await db.findAll('cars', { filters: { brand: RUN, $and: [{ deletedAt: null }, { status: 'available' }] } });
      const or = await db.findAll('cars', { filters: { brand: RUN, $or: [{ deletedAt: null }, { status: 'hidden' }] } });
      assert.equal(eq.length, 3);
      assert.deepEqual(and.map((r) => r.id).sort(), [ids.A_active, ids.B_active].sort());
      assert.equal(or.length, 4, 'three active rows OR the hidden duplicate');
    });
    test('non-null equality is unchanged', async () => {
      const rows = await db.findAll('cars', { filters: { brand: RUN, status: 'pending' } });
      assert.deepEqual(rows.map((r) => r.id), [ids.A_pending]);
    });
    test('count() agrees with findAll() for every form', async () => {
      for (const f of [{ deletedAt: null }, { deletedAt: { $exists: false } }, { deletedAt: { $ne: null } }, {}]) {
        const n = await db.count('cars', { brand: RUN, ...f });
        const rows = await db.findAll('cars', { filters: { brand: RUN, ...f } });
        assert.equal(n, rows.length, JSON.stringify(f));
      }
    });
  });

  describe('model adapter (models/_base.js) semantics', () => {
    test('bare null, $exists:false, $exists:true, $ne:null and countDocuments', async () => {
      const bare = await Car.find({ brand: RUN, deletedAt: null }).lean();
      const exf = await Car.find({ brand: RUN, deletedAt: { $exists: false } }).lean();
      const ext = await Car.find({ brand: RUN, deletedAt: { $exists: true } }).lean();
      const ne = await Car.find({ brand: RUN, deletedAt: { $ne: null } }).lean();
      assert.equal(bare.length, 3); assert.equal(exf.length, 3); assert.equal(ext.length, 2);
      assert.deepEqual(ne.map((r) => r.id).sort(), ext.map((r) => r.id).sort(), 'model $ne:null must mean IS NOT NULL');
      assert.equal(await Car.countDocuments({ brand: RUN, deletedAt: { $exists: false } }), 3);
    });
  });

  describe('tables without soft-delete columns keep working', () => {
    test('null and non-null filters on users.deactivated_at (no deleted_at semantics involved)', async () => {
      const active = await db.count('users', { email: { $like: `${RUN}.%` }, deactivatedAt: null });
      assert.equal(active, 3);
      const { error } = await sb.from('users').update({ deactivated_at: new Date().toISOString() }).eq('id', ids.dealerB);
      assert.ifError(error);
      assert.equal(await db.count('users', { email: { $like: `${RUN}.%` }, deactivatedAt: null }), 2);
      assert.equal(await db.count('users', { email: { $like: `${RUN}.%` }, deactivatedAt: { $ne: null } }), 1);
      await sb.from('users').update({ deactivated_at: null }).eq('id', ids.dealerB);
    });
    test('a table with no deleted_at column answers filtered reads', async () => {
      // payments has no deleted_at column; a nullable FK (car_id) with explicit null must compile to IS NULL.
      const rows = await db.findAll('payments', { filters: { status: 'pending', car: null }, limit: 5 });
      assert.ok(Array.isArray(rows));
      assert.equal(await db.count('payments', { status: 'pending', car: null }), rows.length);
    });
  });

  describe('public read paths exclude soft-deleted vehicles', () => {
    test('GET /api/cars (getCars) lists active vehicles and excludes soft-deleted ones', async () => {
      const { getCars } = await import('../../controllers/carController.js');
      const res = fakeRes();
      await getCars({ query: { brand: RUN, limit: '50' }, user: undefined }, res);
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      const listed = res.body.data.map((c) => String(c.id ?? c._id)).sort();
      assert.deepEqual(listed, [ids.A_active, ids.B_active].sort());
      assert.equal(res.body.pagination.total, listed.length, 'count and page agree');
    });
    test('getCars pagination: page totals agree with the item union', async () => {
      const { getCars } = await import('../../controllers/carController.js');
      const p1 = fakeRes(); const p2 = fakeRes();
      await getCars({ query: { brand: RUN, limit: '1', page: '1', sort: 'createdAt_asc' } }, p1);
      await getCars({ query: { brand: RUN, limit: '1', page: '2', sort: 'createdAt_asc' } }, p2);
      assert.equal(p1.body.pagination.total, 2); assert.equal(p2.body.pagination.total, 2);
      const union = new Set([...p1.body.data, ...p2.body.data].map((c) => String(c.id ?? c._id)));
      assert.equal(union.size, 2);
      assert.ok(!union.has(ids.A_deleted));
    });
    test('GET /api/cars/:id (getCar): public 404 for a soft-deleted vehicle; owner and staff can still open it', async () => {
      const { getCar } = await import('../../controllers/carController.js');
      const pub = fakeRes(); await getCar({ params: { id: ids.A_deleted }, user: undefined }, pub);
      assert.equal(pub.statusCode, 404);
      const other = fakeRes(); await getCar({ params: { id: ids.A_deleted }, user: { id: ids.dealerB, role: 'dealer' } }, other);
      assert.equal(other.statusCode, 404, "another dealer must not open a deleted listing");
      const owner = fakeRes(); await getCar({ params: { id: ids.A_deleted }, user: { id: ids.dealerA, role: 'dealer' } }, owner);
      assert.equal(owner.statusCode, 200);
      const admin = fakeRes(); await getCar({ params: { id: ids.A_deleted }, user: { id: ids.admin, role: 'admin' } }, admin);
      assert.equal(admin.statusCode, 200);
      const live = fakeRes(); await getCar({ params: { id: ids.A_active }, user: undefined }, live);
      assert.equal(live.statusCode, 200);
    });
    test('public vehicle sitemap excludes soft-deleted vehicles', async () => {
      const { generateVehicleSitemap } = await import('../../services/sitemapService.js');
      const xml = String(await generateVehicleSitemap());
      assert.ok(xml.includes(`/cars/${ids.A_active}<`) || xml.includes(`/cars/${ids.A_active}`), 'active vehicle listed');
      assert.ok(!xml.includes(ids.A_deleted), 'soft-deleted vehicle must not be in the sitemap');
      assert.ok(!xml.includes(ids.A_dup_removed));
    });
    test('public search and facets exclude soft-deleted vehicles', async () => {
      const { searchVehicles, getSearchFacets } = await import('../../services/searchService.js');
      const found = await searchVehicles({ make: RUN, brand: RUN, limit: 50 });
      const foundIds = (found.data || []).map((c) => String(c.id));
      assert.ok(!foundIds.includes(ids.A_deleted), 'search must not return soft-deleted vehicles');
      assert.equal(found.pagination.total, foundIds.length);
      const facets = await getSearchFacets({ brand: RUN });
      const total = facets?.total ?? facets?.data?.total;
      if (typeof total === 'number') assert.equal(total, foundIds.length, 'facet total excludes deleted rows');
    });
  });

  describe('dealer entitlement and authorization', () => {
    test('soft-deleted listings do not consume dealer plan capacity (documented rule in dealerSubscription.service)', async () => {
      const { getDealerEntitlement } = await import('../../services/dealerSubscription.service.js');
      const ent = await getDealerEntitlement(ids.dealerA);
      assert.equal(ent.listingsUsed, 2, 'A_active + A_pending; deleted rows excluded');
    });
    test('authorized administrative history can retrieve deleted records (service-role data layer)', async () => {
      const hist = await Car.find({ brand: RUN, deletedAt: { $exists: true } }).lean();
      assert.deepEqual(hist.map((r) => r.id).sort(), [ids.A_deleted, ids.A_dup_removed].sort());
      assert.ok(hist.every((r) => r.deletedBy || r.deleted_by), 'deletion actor is recorded');
    });
    test('anon and authenticated PostgREST roles cannot read cars directly (RLS deny-all), deleted or not', async () => {
      const anon = await rest(jwt({ role: 'anon' }), `cars?brand=eq.${RUN}&select=id`);
      assert.equal(anon.status, 200); assert.deepEqual(anon.body, []);
      const dealerB = await rest(jwt({ role: 'authenticated', sub: ids.dealerB }), `cars?brand=eq.${RUN}&select=id`);
      assert.equal(dealerB.status, 200); assert.deepEqual(dealerB.body, [], "dealer B sees no rows, including dealer A's");
    });
    test('anon cannot read users (RLS)', async () => {
      const anon = await rest(jwt({ role: 'anon' }), `users?email=like.${RUN}.*&select=id`);
      assert.ok(anon.status === 200 ? Array.isArray(anon.body) && anon.body.length === 0 : [401, 403].includes(anon.status), JSON.stringify(anon));
    });
  });

  describe('concurrency', () => {
    test('concurrent soft-deletes of one vehicle are idempotent (exactly one stamp wins)', async () => {
      const { data, error } = await sb.from('cars').insert({ title: `${RUN} race`, brand: RUN, model: 'race', year: 2021, price: 1, dealer_id: ids.dealerA, status: 'available' }).select('id').single();
      assert.ifError(error);
      const results = await Promise.all(Array.from({ length: 8 }, () => Car.softDelete(data.id, ids.dealerA)));
      assert.equal(results.reduce((n, r) => n + r.modifiedCount, 0), 1);
      assert.equal(await db.count('cars', { id: data.id, deletedAt: null }), 0);
    });
    test('concurrent creates and deletes leave count() and findAll() in agreement', async () => {
      const created = await Promise.all(Array.from({ length: 10 }, (_, i) => sb.from('cars').insert({ title: `${RUN} c${i}`, brand: RUN, model: `c${i}`, year: 2022, price: 2, dealer_id: ids.dealerB, status: 'available' }).select('id').single()));
      created.forEach((r) => assert.ifError(r.error));
      await Promise.all(created.slice(0, 4).map((r) => Car.softDelete(r.data.id, ids.dealerB)));
      const n = await db.count('cars', { brand: RUN, dealer: ids.dealerB, deletedAt: null });
      const rows = await db.findAll('cars', { filters: { brand: RUN, dealer: ids.dealerB, deletedAt: null } });
      assert.equal(n, rows.length); assert.equal(n, 1 + 6);
    });
  });
});
