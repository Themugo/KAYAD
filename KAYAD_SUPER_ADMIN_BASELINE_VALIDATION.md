# KAYAD Super Admin — Baseline Validation (before any source edit)

Recorded on 2026-10-25 against the unmodified Phase 12 foundation.

## Foundation integrity
| Check | Result |
|---|---|
| Archive | `KAYAD-SUPER-ADMIN-PHASE12-ADMIN-TOKEN-CONVERGENCE-20261023.zip` (90,960,168 bytes) |
| Expected SHA-256 | `7690e986688db50363c58058b9e7c76a7125233abc5cec405c06a41eec22c98d` |
| Actual SHA-256 | `7690e986688db50363c58058b9e7c76a7125233abc5cec405c06a41eec22c98d` — **PASS** |
| `unzip -tq` | No errors detected — **PASS** |
| Project root / package manager | `KAYAD-main/`, npm with `package-lock.json` (also a `bun.lock`, unused) |
| Git state | Archive has no `.git`; none initialised (no commit/push performed at any point) |
| Original archive | Preserved read-only; extracted copy is write-protected, work done in a separate copy |

## Runtime recovery (the historical blocker is resolved)
| Item | Phase 12 report | Now |
|---|---|---|
| Node.js | v22.16.0 (< 22.22.2) | **v22.23.4** — satisfies `engines >=22.22.2`, `.node-version` 22.22.2, `engine-strict=true` retained |
| npm | 10.9.2 | 10.9.9 |
| `npm ci` (existing lockfile, no flags) | EBADENGINE | **exit 0** — added 470 packages; manifest and lockfile untouched |
| `npm audit` | not run | 6 pre-existing advisories (1 critical `dompurify`, 2 high `undici`/`zod`, 3 moderate vitest family). Not addressed: dependency changes are out of scope. See remaining-blockers report. |

## Dependency-backed commands on the foundation
| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` (`tsc --noEmit`) | 0 | PASS |
| `npm run build` (`vite build`) | 0 | PASS (existing >500 kB chunk warning only) |
| `npx vitest run` (full) | 1 | 95 files: 94 pass, **1 fail**; 769 tests: 755 pass, 1 skipped, **13 fail** |
| Admin subset (8 files) | 1 | 73 tests: 60 pass, 13 fail (the same 13) |

### The 13 baseline test failures (all `src/__tests__/features/adminCommandCentre.test.tsx`)
The suite was written for an older command-centre layout (queue "tiles" such as *Pending dealers / Support queue / Fraud alerts*, a module tab strip named *Administration modules*) that was replaced by the approved Business Command Centre in Phases 1–8. Source-level validators referenced the file, but because dependencies could not be installed in Phases 7–12 it was never executed. Two kinds of failure:
1. **Stale contract** — tests look for removed tiles/labels (8 tests).
2. **Genuine regressions the redesign introduced** — no `role="status"` announcement of loaded state, no named `Administration modules` navigation / `aria-current`, approval-workbench links lost their `Open … workflow` accessible names and domain-rules note (5 tests). These are restored in the UI (SA-013/014/015), not by weakening assertions.

## Source validators on the foundation (24 run)
21 PASS, 3 FAIL.
| Validator | Result | Note |
|---|---|---|
| validate-stage24-theme-convergence-20261012 | 13/14 FAIL | historical "theme audit created before change" artifact absent from foundation (known since Phase 12) |
| validate-stage5f1-command-centre-layout | 12/13 FAIL | looks for the literal `Number.isFinite(value)`; code is now stricter (`Number.isSafeInteger`) — stale wording (SA-017) |
| validate-stage5f2-dashboard-data-workflow | 10/11 FAIL | same stale wording (SA-017) |
| validate-lucide-icon-exports | PASS | now runnable: 98 modules / 238 files checked against the installed package |
| all others (phase12 tokens, brand palette, admin route, phase1 nav, phase2 hero, phase3 foundation, phase5, phase8, homepage, dependency security, foundation integrity, runtime integrity/convergence, canonical architecture, navigation convergence, mobile navigation polish, code splitting, frontend runtime contracts, phase6 right panel, phase04, phase06 departments) | PASS | |

Full per-command output: `evidence/super-admin-completion-20261025/baseline-logs/`.

## Browser baseline (first time in the project's history)
The built frontend (`vite build` → `vite preview`) was driven with Playwright/Chromium; every `/api/**` call was intercepted and answered by labelled **test fixtures** (see `e2e/admin-visual/`). Screenshots: `evidence/super-admin-completion-20261025/screenshots-before/` (49 files, 1440×900, full page).
- All 47 mounted routes + one unknown route were loaded as a Super Admin fixture user.
- **7 routes hit the application ErrorBoundary** under fixture data (`/admin/support-tickets` and `/admin/support` — one shared component — plus `/admin/vxp`, `/admin/ai`, `/admin/intelligence`, `/admin/owners`, `/admin/communications` → 6 distinct failures; `/admin/ai` fails independent of the fixture shape).
- No horizontal page overflow at 1440 px on any route.
- Console noise limited to sandbox network blocks (Google Fonts, Socket.IO CDN) — environmental, not application defects.

Not run at baseline: authenticated live-backend tests (no backend reachable), tablet/mobile baseline (captured in the certification pass).

## Final comparison (after all changes, 2026-10-25)
| Item | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `npm run build` | 0 | 0 |
| `vitest run` | 94/95 files, 13 tests failed | **103/103 files, 808 passed, 0 failed**, 1 skipped |
| Validators (25) | 21 pass, 3 fail (+1 new runnable) | identical exit codes except `stage5f1` and `stage5f2`, which now pass; `stage24` still 13/14 (unchanged, disclosed) |
| `eslint src` errors | 5 | 5 (same files, untouched) |
| Routes hitting the error boundary (browser, fixtures) | 7 | 0 |
| axe-core violations (final sweep) | not run | 0 on 98 runs |
| New validator `validate-super-admin-completion` | — | 30/30 |

Final logs: `evidence/super-admin-completion-20261025/final-logs/`.
