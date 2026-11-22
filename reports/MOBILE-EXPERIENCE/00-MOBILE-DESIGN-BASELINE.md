# 00 — Mobile design baseline (2026-11-22)
Base: detached 8e42413 + the FINAL-COMPLETION uncommitted changes (worktree). Nothing committed, pushed or deployed.
Evidence: `evidence/before/` (34 runs, 15 widths × grid/list + 4 landscape) and `evidence/after/`; metrics in each `metrics.json`.

## Baseline defects vs the approved mobile reference
| # | Baseline (390px) | Reference |
|---|---|---|
| 1 | Hero "Illustrative" caption card overlapped the Land Cruiser; carousel controls floated over the image | Car below shortcuts; caption and controls in their own regions |
| 2 | Catalogue = single giant cards (thumbnail strip, centred uppercase title, 30px price) at every width ≤600px | Two compact cards, left-aligned title, teal price |
| 3 | List view horizontal rule existed but Contact Seller hidden; narrow image | Horizontal image+details with both actions |
| 4 | Footer fallback, favicon, PWA icons used the old K mark | Approved KAYARD KE lockup |
| 5 | Floating bottom nav overlays scrolling content (page already reserves 104px + safe area at the end) | Never covers content at rest |

## Components
Retain/refine: `VehicleMarketplace.tsx` (card JSX unchanged), `InventoryCardMedia.tsx`, `PremiumHero.tsx`, `BrandMark`, `BrandingContext`, `MobileBottomNav` (already pads `body`).
Duplicates/risk: stacked CSS "passes" in `index.css`, `homepage-redesign.css`, `premium-hero.css`, `kayad-theme-convergence.css`. Approach: one scoped, final override block per file; no JSX/DOM/data change.
Desktop risk: all new rules are inside `max-width: 639.98px` / `767.98px` media queries.
Tests relevant: `inventoryPresentation.test.ts`, `VehicleMarketplace.test.tsx`, `InventoryCardMedia.test.tsx`, `PremiumHeroMobileLayout.test.ts`, branding tests, Navbar/App tests.
