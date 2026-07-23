const cache = new Map();
const inflight = new Map();

export function getCached(key, ttlMs = 30000) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) { cache.delete(key); return null; }
  return entry.data;
}

export function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function clearCache(pattern) {
  if (!pattern) { cache.clear(); inflight.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

export async function dedupedFetch(key, fetcher, ttlMs = 30000) {
  const cached = getCached(key, ttlMs);
  if (cached) return cached;

  if (inflight.has(key)) return inflight.get(key);

  const promise = fetcher().then(data => {
    setCache(key, data);
    inflight.delete(key);
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}
