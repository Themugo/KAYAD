/**
 * Advanced Request Cache with Intelligent Caching
 * - In-memory cache with TTL
 * - Request deduplication (in-flight tracking)
 * - Stale-while-revalidate pattern
 * - Automatic cache eviction (LRU-style)
 * - Priority-based cache tiers
 */

const cache = new Map();
const inflight = new Map();
const CACHE_LIMIT = 200; // Max items in cache

// Cache entry structure
function createCacheEntry(data, ttlMs = 30000, priority = 'normal') {
  return {
    data,
    ts: Date.now(),
    expiresAt: Date.now() + ttlMs,
    lastAccessed: Date.now(),
    hitCount: 0,
    priority, // 'high', 'normal', 'low'
  };
}

// ─── Core Cache Operations ─────────────────────────────────

export function getCached(key, ttlMs = 30000) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Check if expired (considering both TTL and explicit expiry)
  const isExpired = Date.now() > entry.expiresAt || Date.now() - entry.ts > ttlMs;
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  // Update access metadata for LRU
  entry.lastAccessed = Date.now();
  entry.hitCount++;
  
  return entry.data;
}

// Get stale data while triggering a background refresh
export function getCachedWithStale(key, staleMs = 60000) {
  const entry = cache.get(key);
  if (!entry) return { data: null, stale: false, expired: true };
  
  const age = Date.now() - entry.ts;
  const isStale = age > staleMs;
  const isExpired = age > entry.expiresAt - entry.ts + entry.ts;
  
  if (isExpired) {
    cache.delete(key);
    return { data: null, stale: false, expired: true };
  }
  
  // Update access metadata
  entry.lastAccessed = Date.now();
  entry.hitCount++;
  
  return { data: entry.data, stale: isStale, expired: false };
}

export function setCache(key, data, ttlMs = 30000, priority = 'normal') {
  // Evict old entries if we're at the limit
  if (cache.size >= CACHE_LIMIT) {
    evictLRU();
  }
  
  cache.set(key, createCacheEntry(data, ttlMs, priority));
}

export function setCacheWithMeta(key, data, meta = {}) {
  const entry = {
    ...createCacheEntry(data, meta.ttlMs || 30000, meta.priority || 'normal'),
    ...meta,
  };
  
  if (cache.size >= CACHE_LIMIT) {
    evictLRU();
  }
  
  cache.set(key, entry);
}

export function clearCache(pattern) {
  if (!pattern) { cache.clear(); inflight.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

// Evict least recently used entries
function evictLRU() {
  const entries = Array.from(cache.entries());
  
  // Sort by priority (low first), then by lastAccessed (oldest first)
  entries.sort((a, b) => {
    const priorityOrder = { low: 0, normal: 1, high: 2 };
    const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a[1].lastAccessed - b[1].lastAccessed;
  });
  
  // Remove first 10% of entries
  const toRemove = Math.max(1, Math.floor(cache.size * 0.1));
  for (let i = 0; i < toRemove; i++) {
    cache.delete(entries[i][0]);
  }
}

// ─── Stale-While-Revalidate ─────────────────────────────────

export async function staleWhileRevalidate(key, fetcher, options = {}) {
  const {
    ttlMs = 30000,
    staleMs = 60000,
    priority = 'normal',
    skip = false,
  } = options;
  
  if (skip) return fetcher();
  
  const { data, stale, expired } = getCachedWithStale(key, staleMs);
  
  // If we have data and it's not stale, return it immediately
  if (data !== null && !stale) {
    return data;
  }
  
  // If we have stale data, return it and refresh in background
  if (data !== null && stale && !expired) {
    // Trigger background refresh (fire and forget)
    refreshCacheAsync(key, fetcher, ttlMs, priority);
    return data;
  }
  
  // No cache or expired, wait for fresh data
  return dedupedFetch(key, fetcher, ttlMs);
}

async function refreshCacheAsync(key, fetcher, ttlMs, priority) {
  try {
    const data = await fetcher();
    setCache(key, data, ttlMs, priority);
  } catch (error) {
    // Silently fail background refreshes
    console.debug(`Background refresh failed for ${key}:`, error);
  }
}

// ─── Request Deduplication ─────────────────────────────────

export async function dedupedFetch(key, fetcher, ttlMs = 30000) {
  // Check cache first
  const cached = getCached(key, ttlMs);
  if (cached) return cached;

  // Check if request is already in flight
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  // Create new request
  const promise = fetcher()
    .then(data => {
      setCache(key, data, ttlMs);
      inflight.delete(key);
      return data;
    })
    .catch(err => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

// ─── Batch Requests ─────────────────────────────────────────

export async function batchFetch(requests, options = {}) {
  const { concurrency = 5, ttlMs = 30000 } = options;
  
  const results = [];
  const executing = new Set();
  
  for (const request of requests) {
    const { key, fetcher } = request;
    
    // Check cache first
    const cached = getCached(key, ttlMs);
    if (cached) {
      results.push({ key, data: cached, fromCache: true });
      continue;
    }
    
    // Create promise
    const promise = fetcher()
      .then(data => {
        setCache(key, data, ttlMs);
        executing.delete(promise);
        return { key, data, fromCache: false };
      })
      .catch(err => {
        executing.delete(promise);
        return { key, data: null, error: err, fromCache: false };
      });
    
    executing.add(promise);
    results.push(promise);
    
    // Limit concurrency
    if (executing.size >= concurrency) {
      const settled = await Promise.race(executing);
      if (settled.fromCache !== undefined) {
        // It was from cache or completed immediately
      }
    }
  }
  
  // Wait for all remaining promises
  const settledResults = await Promise.all(
    results.map(r => (r instanceof Promise ? r : Promise.resolve(r)))
  );
  
  return settledResults;
}

// ─── Cache Statistics ────────────────────────────────────────

export function getCacheStats() {
  const entries = Array.from(cache.values());
  
  return {
    size: cache.size,
    limit: CACHE_LIMIT,
    utilization: (cache.size / CACHE_LIMIT) * 100,
    avgHitCount: entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.hitCount, 0) / entries.length 
      : 0,
    totalHits: entries.reduce((sum, e) => sum + e.hitCount, 0),
    byPriority: {
      high: entries.filter(e => e.priority === 'high').length,
      normal: entries.filter(e => e.priority === 'normal').length,
      low: entries.filter(e => e.priority === 'low').length,
    },
  };
}

// ─── Specialized Cache Keys ──────────────────────────────────

export function createCacheKey(base, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        acc[key] = params[key];
      }
      return acc;
    }, {});
  
  return `${base}:${JSON.stringify(sortedParams)}`;
}

// Car-specific cache keys
export const carCacheKeys = {
  list: (params) => createCacheKey('cars:list', params),
  detail: (id) => `cars:detail:${id}`,
  search: (query, filters) => createCacheKey('cars:search', { query, ...filters }),
  byBrand: (brand) => `cars:brand:${brand}`,
  featured: () => 'cars:featured',
  trending: () => 'cars:trending',
};

// Dealer-specific cache keys
export const dealerCacheKeys = {
  profile: (id) => `dealer:profile:${id}`,
  listings: (id) => `dealer:listings:${id}`,
  summary: (id) => `dealer:summary:${id}`,
};
