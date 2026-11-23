/**
 * KAYARD KE service worker (release-safe).
 *
 * Rules (see reports/11-SERVICE-WORKER-AND-PWA-RELEASE-STRATEGY.md):
 *  - HTML navigations are ALWAYS network-first. A cached shell is used only when the network is unreachable (offline).
 *  - Only content-hashed files under /assets/ are cached (cache-first). They are immutable, so sharing them across releases is safe.
 *  - JSON (release.json, manifests), sw.js, /api/ and /uploads/ are never intercepted or cached.
 *  - Caches that this worker does not own are deleted on activation (old versions and legacy cache names).
 *  - The worker never reloads pages by itself; the app decides (ReleaseUpdateBanner).
 */

// Deliberately NOT stamped per release: sw.js stays byte-identical between releases, so browsers do not reinstall the worker on every deploy.
// The shell cache is overwritten by each successful navigation, so it can never outlive the release that wrote it by more than one visit.
const SHELL_CACHE = 'kayad-shell-v3';
const ASSET_CACHE = 'kayad-assets-v3';
const IMAGE_CACHE = 'kayad-images-v3';
const OWNED_CACHES = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE];
const MAX_ASSET_ENTRIES = 150;
const MAX_IMAGE_ENTRIES = 120;

self.addEventListener('install', (event) => {
  // No precache: a failed precache must never block an update. The shell is stored after the first successful navigation.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => !OWNED_CACHES.includes(n)).map((n) => caches.delete(n))))
      // No clients.claim(): taking over an already-loaded page mid-navigation can stall it. The next navigation uses this worker.
  );
});

function isHashedAsset(url) {
  return url.origin === self.location.origin && /^\/assets\/.+\.(js|css|woff2?|ttf|png|jpe?g|webp|svg|avif)$/i.test(url.pathname);
}

function isImage(request, url) {
  return request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(url.pathname);
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

// The cache is an optimisation, never a dependency: reads are time-bounded and writes happen after the response has been returned.
// (Diagnosed 2026-11-22: awaiting caches.open() before answering a navigation stalled pages when an older worker was being replaced
// and its caches were being deleted; the request had reached the server but the page never received the response.)
const CACHE_READ_TIMEOUT_MS = 1200;
function bounded(promise) {
  return Promise.race([promise.catch(() => undefined), new Promise((resolve) => setTimeout(() => resolve(undefined), CACHE_READ_TIMEOUT_MS))]);
}
function store(event, cacheName, key, response, max) {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.put(key, response)).then(() => (max ? trim(cacheName, max) : undefined)).catch(() => undefined));
}

async function networkFirstNavigation(event) {
  try {
    const response = await fetch(event.request);
    const type = response.headers.get('content-type') || '';
    if (response.ok && type.includes('text/html')) store(event, SHELL_CACHE, '/index.html', response.clone());
    return response;
  } catch (error) {
    const cached = await bounded(caches.match('/index.html', { cacheName: SHELL_CACHE }));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstAsset(event) {
  const request = event.request;
  const hit = await bounded(caches.open(ASSET_CACHE).then((cache) => cache.match(request)));
  if (hit) return hit;
  const response = await fetch(request);
  // Never cache an HTML fallback served for a deleted chunk (it would poison the cache with a non-JS response).
  const type = response.headers.get('content-type') || '';
  if (response.ok && !type.includes('text/html')) store(event, ASSET_CACHE, request, response.clone(), MAX_ASSET_ENTRIES);
  return response;
}

async function staleWhileRevalidateImage(event) {
  const request = event.request;
  const hit = await bounded(caches.open(IMAGE_CACHE).then((cache) => cache.match(request)));
  const refresh = fetch(request).then((response) => {
    if (response.ok) store(event, IMAGE_CACHE, request, response.clone(), MAX_IMAGE_ENTRIES);
    return response;
  });
  if (hit) { refresh.catch(() => {}); return hit; }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  // Never intercept API, uploads, auth, the worker itself or release/manifest JSON: always the network, never a stale copy.
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname === '/sw.js' || /\.(json|webmanifest)$/i.test(url.pathname)) return;
  }
  if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(event)); return; }
  if (isHashedAsset(url)) { event.respondWith(cacheFirstAsset(event)); return; }
  if (isImage(request, url)) { event.respondWith(staleWhileRevalidateImage(event)); return; }
  // Everything else (fonts from other origins, unhashed scripts, etc.) goes straight to the network.
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from KAYARD KE',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'KAYARD KE', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  // Sync favorites when back online
  // Implementation would sync local favorites with server
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'clearImageCache') caches.delete(IMAGE_CACHE);
  if (event.data === 'clearAllCaches') caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))));
});
