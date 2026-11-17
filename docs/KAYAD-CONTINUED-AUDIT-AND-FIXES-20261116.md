# KAYAD continued audit and fixes — 16 November 2026

## Scope
Continued the design-polish audit against the approved desktop/mobile marketplace reference. This is a targeted correction pass on the existing source tree, not a rebuild. No backend routes, database schemas, migrations, API contracts, inventory data, pricing logic, payment flows, seller workflows or integrations were changed.

## Defect found and fixed

### NAV-ROLE-001 — conditional hook ownership during buyer/dealer role changes
**Severity:** High (React runtime stability)

**Finding:** `MobileBottomNav` previously returned the dealer navigation before invoking buyer-only hooks. If the authenticated user's role changed while the same component remained mounted (for example, after authentication state hydration or account switching), React could observe a different hook count/order in the same component instance.

**Correction:** The role decision now selects separate `DealerBottomNav` and `BuyerBottomNav` child components. Each child owns its own hooks. This keeps hook order stable across role changes. The shared safe-area/body scroll clearance hook is now used by both buyer and dealer docks, preventing the fixed dealer dock from covering the final mobile content.

**Regression coverage:** Added a component test that rerenders the navigation buyer → dealer → buyer and verifies the correct navigation surface each time. Added static validator checks for the role boundary and dealer safe-area clearance.

## Validation

| Validation | Result |
|---|---:|
| Reference design source checks | 16/16 passed |
| Existing mobile navigation polish | 38/38 passed |
| Responsive integration source checks | 20/20 passed |
| Vehicle cards/details source checks | 16/16 passed |
| Mobile discovery source checks | 16/16 passed |
| Desktop discovery source checks | 12/12 passed |
| Single-vehicle hero source checks | 12/12 passed |
| **Total source checks** | **130/130 passed** |
| Changed TSX transpilation (component + regression test) | 2/2 passed, zero syntax diagnostics |

## Outstanding verification / environment blockers

- Project declares Node `>=22.22.2`; available runtime is Node `22.16.0`.
- `node_modules` is absent. A full `tsc --noEmit` attempt cannot resolve project packages/types such as React, React Router, Vitest, Axios and Node types. This is an incomplete typecheck, not a pass.
- Production Vite build and Vitest runtime tests were not run because dependencies are unavailable and the runtime is below the declared engine minimum.
- Real browser rendering at 320, 360, 390, 430, tablet and desktop widths, live image loading, and authenticated buyer/dealer journeys remain unverified.

## Files changed in this audit pass
- `src/components/MobileBottomNav.tsx`
- `src/__tests__/components/MobileBottomNav.test.tsx`
- `scripts/validate-kayad-reference-design-polish.mjs`
- `docs/KAYAD-CONTINUED-AUDIT-AND-FIXES-20261116.md`

## Release status
The targeted role-switching hook defect is corrected and the source-level regression suite passes. Do not mark the application production-certified until dependencies are installed under the supported Node version and build, runtime and browser checks pass. No commit, push or deployment was performed.
