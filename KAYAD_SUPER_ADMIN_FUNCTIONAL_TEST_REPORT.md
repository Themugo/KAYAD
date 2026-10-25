# KAYAD Super Admin — Functional Test Report

Final build of 2026-10-25. Every number is from a command run on the frozen source; logs are in `evidence/super-admin-completion-20261025/final-logs/`.

## Automated commands (exact, final source)
| Command | Exit | Result | Baseline (foundation) |
|---|---:|---|---|
| `npx tsc --noEmit -p .` | 0 | PASS, no diagnostics | PASS |
| `npm run build` | 0 | PASS (only the existing >500 kB chunk warning) | PASS |
| `npx vitest run` | 0 | **103 files passed; 808 tests passed, 1 skipped, 0 failed** | 95 files: 94 pass / 1 fail; 769 tests: 755 pass, 1 skipped, **13 fail** |
| `npx eslint src` | 1 | 5 errors, 1,556 warnings. The 5 errors are in files **unchanged from the foundation** (`AuthSessionStates.test.tsx`, `CMSContext.tsx`, `orgUi.tsx`, `VehicleMarketplace.tsx` ×2). | same 5 |
| `node scripts/validate-super-admin-completion.mjs` | 0 | **30/30 PASS** (new validator) | n/a |

The 13 baseline test failures (stale contract plus genuine accessibility regressions in the dashboard) were fixed in the source or by re-targeting stale expectations to the approved Business Command Centre; truthfulness assertions were kept. Test coverage added: 8 new test files and one updated file (+40 tests). `adminNoRequestStorm` was confirmed to **fail** against the original `ToastContext` and pass after the fix.

## Existing source validators (25) — compared with the baseline
Exit codes are identical to the baseline except two that improved. Nothing was weakened.
| Validator | Final exit |
|---|---:|
| `validate-phase12-admin-status-token-convergence` | 0 |
| `validate-brand-palette-convergence` | 0 |
| `validate-admin-route-convergence` | 0 |
| `validate-super-admin-phase1-navigation` | 0 |
| `validate-super-admin-phase2-hero` | 0 |
| `validate-super-admin-phase3-foundation` | 0 |
| `validate-phase5-gap-closure` | 0 |
| `validate-phase8-operations` | 0 |
| `validate-homepage-convergence` | 0 |
| `validate-dependency-security` | 0 |
| `validate-foundation-integrity` | 0 |
| `validate-runtime-integrity` | 0 |
| `validate-runtime-convergence` | 0 |
| `validate-canonical-architecture` | 0 |
| `validate-navigation-convergence` | 0 |
| `validate-lucide-icon-exports` | 0 |
| `validate-stage24-theme-convergence-20261012` | 1 |
| `validate-phase6-right-panel` | 0 |
| `validate-business-command-centre-phase04` | 0 |
| `validate-phase06-department-capabilities` | 0 |
| `validate-stage5f1-command-centre-layout` | 0 |
| `validate-stage5f2-dashboard-data-workflow` | 0 |
| `validate-mobile-navigation-polish-20261012` | 0 |
| `validate-code-splitting` | 0 |
| `validate-frontend-runtime-contracts` | 0 |

* `validate-stage5f1-…` and `validate-stage5f2-…`: **failed at baseline, pass now** (SA-017): they looked for the literal `Number.isFinite(value)`; the code already used the stricter `Number.isSafeInteger`; the validators now accept it (a strictly tighter check is accepted, the assertion was not removed).
* `validate-stage24-theme-convergence-20261012`: **still fails 13/14, same as the baseline** — it needs a historical "theme audit created before the change" artefact that is not in the foundation. Left failing and disclosed (F1 in REMAINING_BLOCKERS). Fabricating the artefact would be dishonest.

## Browser functional runs (Playwright Chromium, labelled fixtures — **not production**)
Every `/api/**` call is answered by fixtures (`@fixture.invalid`, "Fixture …"). They prove how the built frontend behaves for the response shapes the fixtures return; they do not prove production data has that shape (BLOCKED — see below).

| Scenario | Viewport | Captures |
|---|---|---:|
| populated | 1920×1080 | 49 |
| populated | 1440×900 | 49 |
| populated | 1280×800 | 49 |
| populated | 768×1024 | 49 |
| populated | 390×844 | 49 |
| populated | 360×740 | 49 |
| empty | 1440×900 | 49 |
| empty | 390×844 | 49 |
| error | 1440×900 | 49 |
| error | 390×844 | 49 |
| forbidden | 1440×900 | 49 |
| slow | 1440×900 | 49 |
| **Total** | | **588** (49 routes each) |

Results over all 588 captures: page errors **0**; application error boundary **0** (baseline: 7 routes crashed); unnamed controls **0**; axe-core WCAG 2.0/2.1 A+AA violations **0** (98 runs); page-level horizontal overflow **0**; hover-only content **0**.

Interaction checks (98 runs: 49 routes × 1440 and 390):
* Tab order reaches real controls with a visible focus indicator on every focused control (98/98). 23 runs recorded Tab wrapping past the last control on pages with only one or two controls; this is browser wrap-around, not a defect, and is excluded from the focus-indicator test (the harness records it as `tabWrapped`).
* Mobile navigation (390 px, 49/49): toggle opens the drawer, focus moves into it, Escape closes it, focus returns to the toggle.
* Closed drawer: no sidebar link receives focus while closed (0 occurrences). This was a real defect found during the final sweep and fixed (SA-053).

## Dashboard requirements (`/admin`, `/admin/dashboard`)
Hero eyebrow "KAYAD BUSINESS COMMAND CENTRE", "Welcome back, [name]" and tagline; six KPIs in the required order (Total Users, Active Staff, Verified Dealers, Vehicles, Live Auctions, Open Escrows); quick actions (Add Staff, Approve Dealer, View Vehicles, View Reports, gated by permission); approval workflows; recent submissions; live auctions; system health computed from real request results; recent activity; system alerts; governance rail. Verified by unit tests, the validator and the screenshots. In the error scenario the KPIs show "Unavailable" with a retry, never zero (verified in the screenshots).

## Defects found and fixed during this final pass
| ID | Finding | Fix |
|---|---|---|
| SA-052 | axe `color-contrast` on the Staff empty-state button (2.23:1) | text colour white; 0 axe violations afterwards |
| SA-053 | closed mobile navigation drawer was only translated off-screen, so its links stayed keyboard-focusable | `visibility: hidden` unless `.open` (CSS only) + validator check |

## BLOCKED / NOT RUN
* Live backend and real role sessions — **BLOCKED** (none reachable; production must not be touched).
* Firefox, WebKit/Safari, real devices, screen readers — **NOT RUN**.
* Deployment smoke test — **NOT RUN by design**.
