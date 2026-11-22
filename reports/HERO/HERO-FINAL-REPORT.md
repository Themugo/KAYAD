# Mobile hero vehicle fitting — final report (2026-11-22)
Nothing committed, pushed or deployed.
## 1. Files changed
Only `src/components/home/premium-hero.css` (one appended, narrowly scoped `@media (max-width: 767.98px)` block + a 480–767px size step). Also new harness `ci/browser/hero.mjs`. No component, content or desktop rule was edited; this replaces my own earlier phone-stack block in the same file (no second competing set).
## 2. Exact mobile changes (<768px, shortcut-rail hero only)
- Vehicle: width `min(100%, 272px)` (320px from 480px up), `aspect-ratio 16/9`, `max-height` 160px (180px), centred, `object-fit: contain`, original artwork, no fixed cropping height.
- Stack order: heading/description → four shortcuts → vehicle → caption card → carousel controls; caption and controls are `position: static` flow items (no absolute overlap).
- Compacting: hero inner padding 14/15/10, description 13.5px, shortcuts margin 11px, stage gap 6px, caption padding 7×11 (title 13px, detail 10.5px), controls 36px targets kept.
## 3. Content preserved
Heading, description, Find a Car / Sell a Car / Auctions / Verified, Land Cruiser artwork, "ILLUSTRATIVE · NOT A LISTING", "2026 Toyota Land Cruiser 300", showroom description, arrows, dots, pause control, background/decor: all present at every width (automated text/aria check = true at all 13 widths). Nothing hidden or added.
## 4–5. Results by viewport (hero height px, vehicle size, before → after)
| Width | Hero h before | Hero h after | Vehicle before | Vehicle after | Whole vehicle inside hero | Overlap | Page overflow |
|---|---|---|---|---|---|---|---|
| 320 | 572 | 521 | 290×180 | 272×160 | yes | none | none |
| 340 | 570 | 521 | 310×192 | 272×160 | yes | none | none |
| 360 | 583 | 509 | 330×205 | 272×160 | yes | none | none |
| 375 | 595 | 511 | 345×214 | 272×160 | yes | none | none |
| 390 | 607 | 514 | 360×224 | 272×160 | yes | none | none |
| 412 | 624 | 518 | 382×237 | 272×160 | yes | none | none |
| 430 | 639 | 521 | 400×248 | 272×160 | yes | none | none |
| 600 | 623 | 502 | 480×270 | 320×180 | yes | none | none |
| 768 | 456 | 456 | 724×233 | 724×233 | yes | caption over car (desktop/tablet design, unchanged) | none |
| 1024 | 336 | 336 | 510×272 | 510×272 | yes | caption over car (desktop/tablet design, unchanged) | none |
| 1280 | 336 | 336 | 648×272 | 648×272 | yes | caption over car (desktop/tablet design, unchanged) | none |
| 1440 | 350 | 350 | 734×292 | 734×292 | yes | caption over car (desktop/tablet design, unchanged) | none |
| 1920 | 350 | 350 | 734×292 | 734×292 | yes | caption over car (desktop/tablet design, unchanged) | none |
Phone hero is ~15% shorter (e.g. 607 → 514px at 390; 639 → 521 at 430); vehicle area shrank from 360×224 to 272×160 at 390. Screenshots (before/after at 320, 360, 390, 430, 600, 768, 1024, 1440, 1920) in `evidence/before/` and `evidence/after/`; I inspected 320, 390 and 600 manually: complete car (roof, mirrors, both bumpers, wheels, shadow) visible, caption and controls below it, category chips start cleanly after the hero. 360, 430, 768 and larger were checked by geometry and pixel diff, not individually by eye.
## 7. Desktop/tablet
768, 1024, 1440, 1920 hero screenshots are pixel-identical before vs after. (At ≥768 the existing approved composition places the caption over part of the artwork; unchanged by design.)
## 8. Interactions (390px, real browser)
Next → "2026 Mercedes-Benz GLE"; Previous → back to Land Cruiser; dot 2 → GLE; pause toggles "Pause automatic vehicle rotation" ↔ "Resume…"; shortcuts: Find a car → `/`, Sell a car → `/login` (signed out), Auctions → `/?nav=discovery`, Verified vehicles → `/?nav=inspections`.
## 9. Tests
Typecheck PASS; Vitest home/features/VehicleMarketplace suites 43 files / 448 tests PASS (includes `PremiumHeroMobileLayout`); marketplace regression capture 34 runs, 0 overflow, 0 errors, grid columns unchanged (2 columns 360–600px). Full Vitest/backend/DB suites were NOT re-run for this CSS-only change (last full run: 224 files / 1,879 passed).
## 10. Limitations
- Console shows pre-existing, unrelated messages: blocked Google Fonts (sandbox), 401s from the signed-out session probe, and a React-19 dev warning `fetchpriority` → `fetchPriority` on the hero image (`PremiumHero.tsx:162`, not changed here).
- The cropped-on-device screenshot you sent (kayad.space) shows an older side-by-side hero with the car on the right; this repo's hero is the stacked layout, so I followed the written order (car below shortcuts).
- The list-view change in your screenshot (specs in two columns, View Details and Contact Seller side by side) is the separate task and is NOT done here.


## Addendum 2026-11-22 — tightening after owner feedback
- Hero at 390px is now 413px tall (was 607 original, 514 after first pass); 320→451, 430→416, 600→459. Vehicle fully inside, no overlap, no overflow.
- Phone LIST view reworked to the approved reference: 4:3 whole-car thumbnail (object-fit: contain), title/price at right, two-column specs, View Details + Contact Seller side by side (>=360px); stacked card below 360px.
- Verified 320/360/375/390/430/600: no horizontal overflow. Full Vitest 224 files / 1,879 passed; typecheck clean; vite build OK.

## Addendum 2026-11-22 (2) — favourite button, grid fit, dealer command centre
- Phone cards: favourite button is now a 28px circle (14px icon) with a 44px invisible touch target; grid cards show the whole car (object-fit: contain).
- Dealer dashboard: dark navy sidebar matching the personal dashboard, "Add a vehicle" primary action, command-centre banner with real counts (new enquiries, pending, drafts), shortcuts to Leads, Auctions, Payouts.
- Verified: dealer harness 52 runs / responsive harness 34 runs, 0 overflow, 0 errors; dealer Vitest 142 passed; full Vitest 1,878-1,879 passed (one transient failure on one run, clean on re-run); typecheck clean.
