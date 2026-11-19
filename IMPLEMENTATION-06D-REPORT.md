# KAYARD KE — Implementation 06D
## Desktop and phone inventory workflow regression hardening

**Baseline:** `KAYARD-KE-MASTER-IMPLEMENTATION-06C-RESPONSIVE-INVENTORY-20261119.zip`  
**Date:** 19 November 2026  
**Scope:** Public marketplace inventory UI and responsive browser regression coverage. No backend, database, listing lifecycle, account, dealer, admin or homepage hero changes.

## 1. Audit findings

The 06C source already contains the actual mobile Grid/List presentation correction:

- Grid is a single-column, image-first vertical card on phones.
- List is a compact horizontal card with the image on the left.
- The Grid/List control group is explicitly displayed at phone widths.
- Both controls have 44px minimum width and height.
- The same canonical vehicle card and save/detail/contact handlers are reused in both modes.

The remaining gap was verification quality. Existing component tests checked React state and action presence, but the browser suite's Grid/List test exercised desktop state only. It did not assert computed phone card direction, media sizing, touch target dimensions or document overflow. A UI could therefore have a selected List button while CSS still rendered a Grid card without the existing browser test detecting it.

## 2. Changes in 06D

### Browser regression coverage

Extended `e2e/tests/marketplace-controls/marketplace-controls.spec.ts` with a responsive rendered-layout test that:

- Runs at 390px and 360px phone widths.
- Confirms Grid/List controls are visible.
- Confirms each control meets a 44px touch target.
- Confirms Grid cards compute to `flex-direction: column` and a one-column grid.
- Confirms List cards compute to `flex-direction: row` with a bounded image and visible content body.
- Confirms save, vehicle details and seller contact actions remain visible in both modes.
- Confirms no document-level horizontal overflow.
- Repeats the layout check at desktop width and confirms desktop List/Grid card direction.

### Static contract validator

Added `scripts/validate-inventory-responsive-06d.mjs` to guard the responsive CSS contract and the presence of the computed-layout browser regression.

### Files changed

1. `e2e/tests/marketplace-controls/marketplace-controls.spec.ts`
2. `scripts/validate-inventory-responsive-06d.mjs`
3. `IMPLEMENTATION-06D-REPORT.md`

No application runtime component, CSS, API or data contract was changed in this pass because the 06C source already contains the mobile rendering correction; the missing piece was browser-level proof.

## 3. Workflow audit matrix

| Workflow | Desktop source coverage | Phone source coverage | Status |
|---|---|---|---|
| Grid/List switching | Existing browser state test | New computed-layout browser regression | Added coverage; runtime suite pending |
| 3/4/5 column preference | Existing browser test and container-query rules | Not offered as a phone control | Preserved |
| Keyword search | Canonical query state and browser search controls | Same shared search state | Preserved |
| Make/model filters | Desktop sidebar selectors and API query assertions | Existing mobile drawer selectors and shared state | Preserved |
| Price/year/mileage/body/fuel/transmission/condition/colour | Shared filter state and query mapping | Same filter panel rendered in drawer | Preserved |
| Seller/live auction filters | Shared filter state and query mapping | Same filter panel rendered in drawer | Preserved |
| Category selection | Canonical category state; conflicting dimension cleared | Same category state | Preserved |
| Filter reset and removable chips | Shared reset and page-one reset | Shared reset and page-one reset | Preserved |
| Sort and page size | Existing browser/API query checks | Sort remains available; page-size control intentionally compact/hidden on phone | Preserved |
| Pagination | Server-authoritative page/count; no client double-slicing | Same server pagination | Preserved |
| Saved vehicles | Same card handler | Same card handler in Grid and List | Preserved |
| Vehicle details/quick view | Same selection handler | Same handler in Grid and List | Preserved |
| Seller contact | Same contact sheet and vehicle ID | Same contact sheet and vehicle ID in both modes | Preserved |
| Mobile filter drawer | Not applicable | Shared state persists across close/reopen | Existing coverage |
| Inventory counts/sponsor cards | Server count remains authoritative | Same canonical count | Preserved |
| Featured hero feed/admin controls | Existing independent flow | Existing independent flow | Out of scope; untouched |

## 4. Verification actually executed

### Passed

- `scripts/validate-inventory-layout-06a.mjs`: **16/16**.
- `scripts/validate-inventory-responsive-06d.mjs`: **10/10**.
- `scripts/validate-homepage-compact-layout.mjs`: **10/10**.
- `scripts/validate-homepage-responsive-polish-20261114.mjs`: **9/9**.
- `scripts/validate-marketplace-convergence.mjs`: **17/17**.
- `scripts/validate-marketplace-ui-convergence.mjs`: **7/7**.
- `scripts/validate-marketplace-initiative.mjs`: **12/12**.
- `scripts/validate-stage5-desktop-marketplace.mjs`: **14/14**.
- TypeScript transpilation syntax checks for the marketplace component, component test and Playwright spec: **0 syntax diagnostics**.
- PostCSS parsing of `src/index.css` and `homepage-redesign.css`: passed.
- Chromium CSS contract harness using the project's exact mobile Grid/List CSS: at **390px** and **360px**, Grid computed as vertical card, List computed as horizontal card, control group measured 92×48px, no document horizontal overflow.

### Not executed / not certified

- Full Playwright E2E suite was not run: `@playwright/test` is not installed in this extracted source tree.
- Vitest component suite was not run: project dependencies are not installed.
- Vite production build and complete React runtime browser journey were not run: Vite is not installed.
- Project pins Node `22.22.2`; the available runtime is Node `22.16.0`. Earlier dependency installation attempts in this environment did not complete successfully.

The Chromium CSS harness validates the actual CSS rules in isolation; it is not represented as a full application E2E run.

## 5. Acceptance status

**Source audit:** complete for the public inventory controls in this scope.  
**Mobile Grid/List implementation:** already corrected in 06C and preserved.  
**New browser regression coverage:** added for actual rendered layout at phone and desktop sizes.  
**Static checks and CSS harness:** passed.  
**Full application runtime certification:** pending the project's pinned Node version and dependency installation.

## 6. Scope protection

Preserved the 06C homepage hero, navbar, category shortcuts, inventory filtering/query contracts, featured vehicle source, saved/detail/contact handlers, server pagination, backend APIs, database, seller permissions and all account/dealer/admin workflows.
