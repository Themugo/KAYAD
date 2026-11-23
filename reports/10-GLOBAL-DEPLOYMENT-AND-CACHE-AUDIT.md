# 10 — Global deployment and cache audit

Status labels: VERIFIED (executed here) / BLOCKED (needs production access) / NOT TESTED.

## Delivery chain (from repository configuration)
* Web: Vercel project `kayad-space`, production host `www.kayad.space`; API `api.kayad.space` (Render). `vercel.json` rewrites `/api/*` and `/uploads/*` to the API and everything else to `/index.html`.
* Production deploys run only from **pushes to `main`** (`.github/workflows/deploy.yml`). Pushes to other branches never change production.
* Build: Vite, hashed filenames under `/assets/`.

## Root-cause candidates (ranked)
1. **Production is not on the same commit the owner is looking at (BLOCKED – needs Vercel/GitHub access).** Production changes only when `main` deploys successfully. Work pushed to a feature branch, a PR not yet merged, or a failed deploy workflow leaves production on an older build while the owner may be viewing a local/preview build. *Action for owner: in Vercel, compare the Production deployment's commit with `50733e2` and later; check the latest `Deploy to Production` run on `main`.*
2. **Defects in the old `public/sw.js` (VERIFIED by rehearsal, see 12).** Any device that ever registered it:
   * served every non-root page (`/dealer`, `/login`, deep links) from cache first (stale-while-revalidate), so a returning visitor saw the previous release's HTML and therefore its old JS bundle names;
   * treated every `.json` file as a cache-first static asset, so `/release.json` (the version check) was frozen at the first copy;
   * cache names never changed between releases, so nothing was ever purged.
   Rehearsal with the original worker: after the host moved from release A to B, a returning visitor's `/dealer` still ran release A (check `B: deep link /dealer is not served stale` **FAILED** in 6/6 runs). With the fixed worker the same check passes 8/8.
3. **The app itself never registers a worker** (no `serviceWorker.register` anywhere in `src/` or `index.html`). Devices that visited during an earlier release that did register it keep the old worker; browsers re-fetch `sw.js` (served `no-store`), so these self-heal only if the new worker file is deployed AND the old worker is asked to update. The fix does both (see 11).
4. DNS / CDN / custom-domain routing: **BLOCKED** (cannot resolve or probe the domain from here). Not ruled out. Commands to run from an unrestricted machine are listed in 12.

## Header semantics (as configured after this phase)
| Path | Cache-Control | Why |
|---|---|---|
| `/`, `/index.html` | `public, max-age=0, must-revalidate` | entry document must revalidate each visit |
| `/assets/*` | `public, max-age=31536000, immutable` (unchanged) | content-hashed |
| `/sw.js` | `no-cache, no-store, must-revalidate` (unchanged) | worker updates must be seen |
| `/release.json` | `no-store, no-cache, must-revalidate` (unchanged) | version probe |
| `/manifest.webmanifest` | `public, max-age=0, must-revalidate` | was undefined |
| `/icons|branding|hero/*` | `public, max-age=3600, stale-while-revalidate=86400` | unhashed images: bounded staleness |
| `/api/*` | not cached by the worker or by these rules; private data is never stored in a shared cache by this repo's config | |
Caching is **not** disabled globally. Hosting/CDN dashboard settings could not be inspected (BLOCKED).

## Release identity (new)
`release.json` now carries `releaseId` (commit[12] + build time), full `commit`, `generatedAt`, `entryAssets`. `index.html` has `<meta name="kayad-release">`; the running bundle carries `__KAYAD_RELEASE_ID__`. No secrets. `scripts/verify-dist-integrity.mjs` (wired into `deploy.yml` as `npm run verify:dist`) fails the build if the meta tag and `release.json` disagree, if any asset referenced by `index.html` or any static chunk import is missing, or if chunk names are unhashed. VERIFIED on local builds (37 assets, 161 chunks walked, 0 missing).

## Atomicity
Vercel deployments are immutable and traffic is switched per deployment; the repo uses `vercel deploy --prebuilt --prod`. A mixed old-HTML/new-asset state is therefore a host guarantee, not something verified here (BLOCKED). The stale-chunk case (old HTML asking for a deleted chunk → host returns 404 because `/assets/` is excluded from the SPA rewrite) is handled in the client: one guarded reload per 60 s, then the normal error screen (VERIFIED in rehearsal). Rollback: promote the previous deployment in Vercel (`vercel rollback`), no code change needed.
