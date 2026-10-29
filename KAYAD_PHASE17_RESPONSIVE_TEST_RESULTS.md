# Phase 17 — Responsive, accessibility and behaviour results

Method: Playwright Chromium against the **real local stack** (disposable PostgreSQL 16 + PostgREST + Redis 6 + the repository backend, 3 labelled `[LOCAL TEST]` vehicles). "Before" = unmodified Phase 16D build; "after" = Phase 17 build; same data and config for both. Mobile widths use Android Chrome UA, touch and `isMobile`; this is **emulation, not a physical Android device**.
Screenshots: `runbooks/phase17-mobile-landing-20261027/evidence/screenshots/` — `before-<w>-first|full.png`, `after-<w>-first|full.png` for 360, 375, 390, 412, 430, 768, 1280, 1440 (the six required widths plus 375 and 412), plus state shots. Raw metrics: `evidence/data/*.json`.
Note: Playwright `fullPage` captures draw the fixed bottom nav once at the first-viewport position (capture artefact, not a layout defect).

## Header / strip / hero metrics (px)
| Width | Header h before→after | Brand w | Descriptor font/height | Sell Vehicle h | Status strip h | Eyebrow |
|---|---|---|---|---|---|---|
| 360 | 69→59 | 144→190 | 7px/32→8px/19 | 38→44 | 61→45 | ellipsis → wraps to 2 lines (37) |
| 375 | 69→59 | 151→205 | 7→8px | 38→44 | 61→44 | ellipsis → 1 line |
| 390 | 70→59 | 154→190 | 7→8px | 40→44 | 61→44 | ellipsis → 1 line |
| 412 | 71→59 | 163→212 | 7→8px | 40→44 | 48→44 | → 1 line |
| 430 | 72→59 | 171→230 | 7→8px | 40→44 | 48→44 | → 1 line |
768 header 61→61 and 1280/1440 header 73→73 (unchanged by design).

## Checks (before → after)
| Check | 360 | 390 | 430 | 768 | 1280 | 1440 |
|---|---|---|---|---|---|---|
| Horizontal overflow (`scrollWidth-clientWidth`) | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| axe-core violations (default home) | 3 rules→**0** | 3→**0** | 3→**0** | 3→**0** | (not run) | (not run) |
| Controls under 44px (header, hero CTAs, nav, status) | 4→1 (menu 42x44) | 3→0 | 3→0 | 5→3 (40px tablet header controls) | n/a | n/a |
| Header sticky (top after scroll) | 0 | 0 | 0 | 0 | – | – |
| Footer clears fixed bottom nav at page end | yes | yes | yes | yes | n/a | n/a |
| Desktop pixel change, first viewport | – | – | – | – | 0.23 % | 0.14 % |
Before-axe rules at every phone width: `color-contrast` (serious, 15 nodes), `aria-prohibited-attr` (serious, 1), `heading-order` (moderate, 1). After: none. No new rule appeared at any width.
The WCAG 2.5.8 AA minimum is 24 px; the remaining sub-44 px controls (tablet 40 px header utilities, 360 px menu 42 px wide) all exceed it.
Only elements wider than the viewport are the ticker marquee tracks, clipped by their own `overflow:hidden` container (no page overflow).

## Console / network (anonymous visitor, same before and after)
4–5 entries at every width, identical sources: `fonts.googleapis.com` and `api.kayad.space/socket.io` (blocked by the sandbox's network allowlist — environment), and `401 /api/v1/auth/me` + `401|403 /api/v1/auth/refresh` (expected for a signed-out visitor). No JS exceptions, no failed `/api/cars` request on the healthy stack. The 401/403 count varies run to run (CSRF/timing); not related to this phase.

## Navigation behaviour (390/360/430/768, before = after)
Bottom nav Home active on load; Auction -> `/?nav=discovery`, Auction active; direct `/?nav=saved` as an anonymous visitor -> `/login?next=%2F%3Fnav%3Dsaved` (correct auth gate). **Back/Forward:** the dock navigates with `history.replaceState` (App.tsx), so each tap leaves history length unchanged and **Back leaves the app** (to the previous page/`about:blank` in the test). This is pre-existing, identical before/after, and was **not changed** (see known gaps).

## Featured vehicles (real records)
With two real vehicles marked promoted and the admin `vehicleSource` switched to `featured` in the disposable DB: each card shows its record's name and price (`Ksh 14.5M`, `Ksh 11.9M`), uses its record's image, and tapping navigates to its own record (`/?vehicleId=61b590ad…` Land Cruiser; `/?vehicleId=15bd22a2…` Mercedes-Benz). Identical before and after. With the shipped default (`vehicleSource=showcase`) the pair is the admin-managed "KAYAD SELECT · Visual showcase · not a listing" artwork, truthfully labelled. Failed image (**MOCK** abort of one image): neutral placeholder + label "Photo of … is unavailable"; the other card unaffected.
