# KAYAD homepage convergence / premium polish — 2026-10-03

## Audit (before editing)
- Canonical homepage: `src/App.tsx` -> `features/VehicleMarketplace/components/VehicleMarketplace.tsx` (`isHomePage`). One implementation; no duplicates. `components/home/*` and `components/HeroCarousel.tsx` are not used by the homepage.
- Data: one source. `getCars()` -> `GET /api/cars?...` (server-side filters/sort/pagination) plus `getCars({featured:true})` for the hero. Category chips, the Body Style/Fuel selects (header search bridge, sidebar, mobile drawer) all read/write the same `selectedBodyStyle` / `selectedFuel` state, so they stay synchronized.
- Hero art: only the KICC skyline JPG (1536x372) is wired. Its lower ~65% is smeared/blurred; only the top band (buildings/sky) is clean. `kayad-land-cruiser.png`, `kayad-mercedes-gle.png`, `kayad-prado.png` are 510x270 / 380x185 with ragged cut-out edges, so they are NOT suitable as hero subject; real featured-vehicle photos from the API remain the subject. No external images added.
- Defects found: skyline stretched `cover` over the full hero (dominant subject); metrics tiny (9px) and admin-like, showing `0`/numbers as titles; duplicate React key; inventory heading said `0 vehicles` during load/failure; error state had two icons and raw "Request failed with status code 502"; category chips never showed selected state (except All); toolbar controls had mixed heights/type sizes.

## Changes (only VehicleMarketplace.tsx + tests/validator)
1. Hero: deep-teal base; KICC image now a masked, low-opacity horizon band (environment layer); admin-configured slide backgrounds still win. Overlay slightly lighter. Eyebrow quieter, extra tagline row removed, headline tighter, supporting copy larger (14/16px).
2. Metrics -> public `<dl>`: Vehicles available / Live auctions / Ending within 30 min / Saved vehicles. Value is prominent (18-20px), label 11px. Loading shows `…`, failure shows `—` and "Inventory unavailable". No new data/queries.
3. Inventory heading chip: hidden while loading; "Inventory unavailable" on failure; never "0 vehicles" for an API failure.
4. Error state: single icon, calm copy, filters preserved, "Reference: HTTP 502", existing Retry. Still truthful: no fake inventory, error not swallowed.
5. Category chips: `aria-pressed` + selected style for every chip, synced with Body Style/Fuel.
6. Toolbar: Show / Sort / Columns / View / Filters share h-10, radius, 11px type, focus-within border.
7. React warning: PROVEN source = hero metrics `key={title}` where titles were numbers; two zeros produced duplicate key "0" (91 warnings in VehicleMarketplace test before, 0 after). Fixed by keying on label.
8. Stale validator: validate-premium-presentation-pass expected `h-[390px]`; hero is intentionally `h-[470px] sm:h-[420px]`.
9. Tests added: 502 state (no "0 vehicles", Inventory unavailable, Retry, Reference HTTP 502) and category/Body Style sync.

## The 502 (documented, not masked)
Request: browser `GET /api/cars?...` -> Vercel rewrite `/api/:path*` -> `https://api.kayad.space/api/cars` -> Render. A 502 is produced by the Render/Vercel proxy when the backend is unreachable or not healthy. This is consistent with the earlier backend boot crash (`authLimiter` not defined); this tree already contains that fix. NOT verified against production. Check: `curl -i https://api.kayad.space/api/cars?limit=1` and Render deploy status/logs.

## Results (local, Node 22.22.2)
typecheck 0; build OK (dist verified); vitest 47 files / 319 pass, 1 skipped; marketplace test 20/20;
validators pass: homepage-convergence, premium-presentation-pass, polish-regressions, next6/next7-polish, frontend-runtime-contracts, phase6-release, vercel-ci, deployment-readiness, v14 release-candidate + runtime-preflight, pwa-mobile, ui-surface-convergence; root npm audit clean.
Pre-existing validator failures, identical on the uploaded zip and unrelated to the homepage: communications:providers (needs provider credentials), release + wave3-convergence (OpenAPI missing 5 routes), local-runtime/live-runtime (need Supabase env), c1-c5-convergence (token hashing check).

## NOT verified
No browser rendering was possible here: hero composition, 320-1920px behavior, overflow, contrast and the skyline band were changed from code and are not screenshot-verified. Please check at 320/390/1366/1920. No live API or Vercel checks. Not committed.
