# 11 — Service worker and PWA release strategy

## Findings in the old worker
Stale-while-revalidate on all non-root navigations; cache-first `.json` (incl. `release.json`); static cache names; never registered by the app.

## New `public/sw.js`
* Navigations: **network-first**; the last good `/index.html` is a fallback only when the network is unreachable. Nothing cached yet → honest failure, not a stale page.
* Only content-hashed `/assets/*` files are cached (cache-first, shared across releases because they are immutable). An HTML response returned for a missing asset is **never** cached.
* Never intercepted: `/api/*`, `/uploads/*`, `/sw.js`, any `.json`/`.webmanifest` (so `release.json` is always fresh).
* Images: stale-while-revalidate with a 120-entry cap. Auth endpoints are never touched.
* Activation deletes every cache the worker does not own (legacy `kayad-mobile-v2`, `kayad-static-v2`, `kayad-images-v2`, earlier names).
* `sw.js` is **not** stamped per release, so a deploy does not force every browser to reinstall the worker (reinstall churn is the one place headless Chromium stalled, see 12). It changes only when worker logic changes.
* The worker never reloads a page. `skipWaiting` on install; **no `clients.claim()`** (open pages are never switched mid-navigation; the next navigation uses the new worker).
* Push, notification-click and sync handlers preserved.

## Client (new)
* `ReleaseUpdateBanner` (mounted in `main.tsx`): checks `/release.json` (no-store) on load, window focus, tab visible and every 10 min. If the id differs, shows a status banner "A new version … is available" with **Refresh** and **Later**. It never reloads automatically, so forms, payments and listing creation are not interrupted.
* Stale-chunk recovery: on `vite:preloadError`, one reload per 60 s (sessionStorage guard); a second failure shows the normal error UI (no loop).
* On startup the app asks every existing registration to `update()`, so devices holding the old worker pick up the fixed one.
* An SPA HTML fallback or error from `/release.json` is never interpreted as a new release.

## Decision for the owner
The app still does **not register** a service worker (unchanged behaviour). Registering it would add offline shell support but is a product decision; recommended only after the rehearsal in 12 is repeated on real devices.

## Verification
* Unit/contract: 16 tests (`src/__tests__/release/*`) — VERIFIED passing.
* Browser rehearsal: `ci/browser/release-switch.mjs` (10 checks) — see 12.
* Installed-PWA (standalone) behaviour on real phones: NOT TESTED.
