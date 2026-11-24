# 18 — Test evidence index (final closure, 2026-11-24)

Levels: **LOCAL** (unit/component), **DISPOSABLE-DB** (real HTTP + PostgreSQL 16, PostgREST, loopback only), **BROWSER** (Playwright/Chromium against the disposable stack), **SIMULATED** (stubs for e-mail/SMS/Cloudinary), **HOSTED READ-ONLY** (SELECT only), **PRODUCTION** (none). Raw evidence: `evidence/final-regression/`, `evidence/sweep/`, `evidence/a11y/`, `evidence/screens/`.

| Check | Command | Result | Level |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | exit 0 (both runs) | LOCAL |
| Production build | `npm run build` | exit 0 (both runs) | LOCAL |
| Frontend unit/component | `npx vitest run` | **Run 1: 1 failure** (`darkThemeLayer`: generated dark-theme CSS stale after my colour-class changes). Fixed by `node scripts/generate-dark-theme.mjs`. **Run 2: 237 files passed; 2,068 tests passed, 1 skipped, 0 failed** | LOCAL |
| Backend Jest (six batches; a single run is OOM-killed in this container, exit 137) | `jest` in batches `a, r1–r4, top` | all batches exit 0: 268 suites (267 passed, 1 skipped); **4,365 tests passed, 21 skipped, 0 failed** | LOCAL |
| DB journeys, full gate (`ci/db-journeys/run.sh`) | one run | **Run 1: FAIL** — journey 33 check D11 was environment-dependent (it counted payments created by earlier journeys). Test corrected to a before/after snapshot. **Run 2: 43/43 journeys exit 0, overall PASS** (journeys 31: 73/73; 32: 5/5; 33: 70/70; 34: 33/33) | DISPOSABLE-DB |
| Browser admin closure (J1–J22 + OD-1 checks) | `ci/browser/admin-closure.mjs` | **Run 1: 31/32** — J16 asserted old behaviour ("access boundary" text) that OD-1 intentionally removed (tile no longer rendered for unauthorised roles). Updated; added J16b. **Run 2: 33/33 passed** | BROWSER |
| 53-route sweep (Super Admin/moderator, 1440 and 390 …) | `ci/browser/admin-sweep.mjs` | 53 routes, 212 rows, 0 problems | BROWSER |
| Accessibility scan (axe) | `ci/browser/admin-a11y.mjs` | 53 routes × 390/1440: **0 serious/critical**, 0 axe errors; 0 overflow at 7 widths on 10 key routes | BROWSER |
| Accessible names / history controls / live regions | `ci/browser/admin-a11y-extra.mjs` | 0 unnamed controls on 53 routes; Back/Dashboard keyboard-operable | BROWSER |
| Dialog focus (open, trap, Escape, return) | vitest `DealerReinstatementWorkflow` | passed | LOCAL (jsdom) |
| Route classification generator | `scripts/admin-closure-route-certification.mjs` | 13 / 28 / 5 / 0 / 7 / 0; 0 problems | LOCAL |
| Hosted object checks | Supabase SELECT | doc 25 | HOSTED READ-ONLY |

Reruns and flakiness: the three failures above (vitest run 1, journey run 1, browser run 1) were each a **test defect or an intended behaviour change**, not intermittent; none was re-run until green without a change. No test was skipped or weakened to pass; one existing expectation (system health in `stage5f5RoleRouteMatrix`) was tightened.

Caveats: single-run evidence per configuration; a11y/sweep were run before the last (CSS-only) dark-theme regeneration and the J16 script edit; no production, staging or hosted-DB test of any kind.
