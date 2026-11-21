/**
 * Phase C.1 — opt-in test against a REAL, LOCAL Redis server (newly created).
 * Proves utils/cache.js cacheDelPattern() actually deletes matching keys through ioredis (it previously used a
 * node-redis call shape, threw on every call and silently swallowed the error, so no invalidation reached Redis).
 * SAFETY: refuses any non-loopback Redis URL. Uses a unique key prefix per run and deletes its own keys.
 * Run from backend/: KAYAD_TEST_REDIS_URL=redis://127.0.0.1:6390 npm run test:cache-invalidation
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = process.env.KAYAD_TEST_REDIS_URL || '';
let host = '';
try { host = new URL(url).hostname; } catch { /* unset */ }
const LOCAL = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (url && !LOCAL) throw new Error(`Refusing to run the cache invalidation test against non-local Redis "${host}".`);
const skip = LOCAL ? false : 'KAYAD_TEST_REDIS_URL (loopback) not set';
const RUN = `c1r${randomUUID().slice(0, 8)}`;
let cache;

before(async () => {
  if (skip) return;
  process.env.REDIS_URL = url;
  cache = { ...(await import('../../utils/cache.js')), ...(await import('../../utils/publicListingCache.js')) };
  await cache.initCache();
  assert.equal(cache.isRedisConnected(), true, 'Redis must be connected for this test');
});
after(async () => { if (cache) await cache.cacheDelPattern(`*${RUN}*`); });

test('cacheDelPattern deletes every matching key in real Redis, across multiple SCAN pages', { skip }, async () => {
  for (let i = 0; i < 250; i++) await cache.cacheSet(`cars:list:${RUN}:${i}`, { i }, 300);
  await cache.cacheSet(`keep:${RUN}`, { keep: true }, 300);
  await cache.cacheDelPattern(`cars:list:${RUN}:*`);
  for (const i of [0, 99, 100, 249]) assert.equal(await cache.cacheGet(`cars:list:${RUN}:${i}`), null, `key ${i} must be gone`);
  assert.deepEqual(await cache.cacheGet(`keep:${RUN}`), { keep: true });
});

test('invalidatePublicListingCaches clears the anonymous public listing cache in real Redis', { skip }, async () => {
  const listingKey = `vehicle_search:anonymous:/:{"brand":"${RUN}"}:`;
  await cache.cacheSet(listingKey, { data: [{ id: 'deleted-car' }] }, 300);
  await cache.cacheSet(`kayad:search:facets:${RUN}`, { x: 1 }, 300);
  await cache.invalidatePublicListingCaches();
  assert.equal(await cache.cacheGet(listingKey), null);
  assert.equal(await cache.cacheGet(`kayad:search:facets:${RUN}`), null);
});
