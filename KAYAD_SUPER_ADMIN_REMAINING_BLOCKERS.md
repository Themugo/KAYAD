# KAYAD Super Admin — Remaining Blockers and Known Limits

Nothing below was hidden or reclassified to look better. Status words follow the completion prompt: **BLOCKED**, **NOT RUN**, **LEFT FAILING (disclosed)**, **DOCUMENTED, NOT CHANGED**.

## Environmental blockers
| # | Item | Status | Detail |
|---|---|---|---|
| B1 | Live-backend verification (real `/api/v1/*` responses, real records, real role sessions) | **NOT RUN / BLOCKED** | No backend or database is reachable from the sandbox and none may be started against production data. Every screenshot, axe run and interaction run used labelled **test fixtures** (`e2e/admin-visual/admin-visual-harness.cjs`). They prove how the built frontend renders and behaves for the shapes the fixtures return, not that production data has that shape. |
| B2 | Real KPI/health/activity values | **NOT RUN** | The dashboard reads only from existing endpoints. With a live backend the six KPIs, system health and recent activity must be spot-checked once by a human. |
| B3 | Google Fonts and Socket.IO CDN | **Environmental** | Unreachable from the sandbox: console errors and fallback fonts appear in every capture. `api.kayad.space` is also refused by the sandbox proxy. None is an application defect. |
| B4 | Browsers other than Chromium; physical devices | **NOT RUN** | Only Playwright Chromium at six viewports (1920, 1440, 1280, 768, 390, 360). No Firefox, Safari, real iOS/Android. |
| B5 | Screen-reader testing (NVDA/JAWS/VoiceOver/TalkBack) | **NOT RUN** | Only automated axe-core (WCAG 2.0/2.1 A and AA rule tags) and scripted keyboard checks were possible. Automated tools cover a minority of accessibility issues; this is not a conformance claim. |
| B6 | Deployment / production smoke test | **NOT RUN by design** | Forbidden by the task. |

## Left failing or unchanged on purpose
| # | Item | Status | Detail |
|---|---|---|---|
| F1 | `validate-stage24-theme-convergence-20261012` (13/14) | **LEFT FAILING (disclosed)** | Needs a historical "theme audit created before change" artefact that is not in the foundation. Same result as the baseline. Fabricating the artefact would be dishonest; the assertion was not weakened. |
| F2 | `npm audit`: 6 advisories (1 critical `dompurify`, 2 high `undici`/`zod`, 3 moderate vitest family) | **NOT CHANGED** | Fixing them needs manifest/lockfile changes, which are forbidden. |
| F3 | ESLint: 5 errors in `src` | **PRE-EXISTING, not changed** | Same 5 as the foundation (none in files this work introduced). The 1,556 warnings are mostly `no-explicit-any` (542) and `no-unused-vars` (463). |
| F4 | Emoji in shared components `ToastContext`, `MarketplacePrimitives`, and in unmounted orphan files | **DOCUMENTED, NOT CHANGED** | Shared with the public marketplace; changing them would alter non-admin surfaces. Emoji in the mounted admin route graph are replaced by lucide icons (validator-enforced). |
| F5 | 19 mounted routes not in the sidebar (specialist studios, owners, communications, provider governance, support alias) | **DOCUMENTED, NOT CHANGED** | Product decision; no routes invented. |
| F6 | Unmounted orphan admin files (e.g. `AdminPage.tsx` with fabricated "150-Pt Audited 100%") | **DOCUMENTED, NOT CHANGED** | Not mounted, not reachable. |
| F7 | No `ToastProvider` is mounted in the app shell | **DOCUMENTED, NOT CHANGED** | Every `toast(...)` call in the application (admin and public) is currently a silent no-op. The request-storm it caused on admin pages is fixed (SA-048), but success/failure toasts still never appear; admin pages that matter also show inline alerts. Mounting the provider changes visible behaviour on public pages and its toasts use emoji icons, so it is a product decision. |

## Data-source gaps (honest empty states, not blockers to the UI)
- **Active Staff** KPI links to the Staff directory for Super Admins instead of showing a count; no existing endpoint returns a reliable staff total to the dashboard, and one was not invented. Other roles see "Super Admin only".
- Studios whose data sets do not exist in any API (Configuration Center change history, Automation Studio executions/scheduler/task queue, Visual Experience Studio version history, SEO manager history, Governance compliance scores, Platform Factory metrics) now show "Unavailable" or an explicit "not connected" empty state. Connecting them needs backend work, which is out of scope.
- Control Center maintenance actions (restart workers, clear queues, rebuild search, refresh cache) are disabled with an explanation; they were never wired to infrastructure.

## Boundary disclosures
- `src/context/AuthContext.tsx` was touched in **presentation only** (7 changed lines): the `RequireAdmin` / `RequireSuperadmin` denial screens use lucide icons instead of emoji and a theme-aware heading colour (SA-028: the heading was white on a light canvas). No authentication, session, token, permission or redirect logic changed. If the owner prefers zero edits to this file, revert those lines; the denial headings will return to white-on-light and the emoji will return.
- `src/context/ToastContext.tsx` (shared) was touched for one reason only: its no-provider fallback is now a module-level constant instead of a new object per render (SA-048). No other behaviour or markup changed.
- `package.json`, `package-lock.json`, `bun.lock`, backend, Supabase, environment and deployment files are byte-identical to the foundation (verified by diff).
- Two historical source validators (`validate-stage5f1…`, `validate-stage5f2…`) were updated to accept the stricter `Number.isSafeInteger` check the code already used (SA-017). They now pass; the checks were not loosened.
- The final full sweep found one real `color-contrast` defect: the Staff empty-state button "Add First Staff Member" (dark text on teal, 2.23:1). It was corrected (SA-052, white text, about 5.6:1) after the sweep. After that and the SA-053 drawer fix, the **entire 588-capture sweep was re-run from scratch on the final build** (0 axe violations, 0 page errors, 0 boundaries, 0 unnamed controls).
- The final sweep also exposed that the closed mobile drawer's links were still keyboard-focusable (SA-053). Corrected in CSS and re-verified in the full re-run.

## Overall status
**PARTIAL — SPECIFIC DEFECTS OR ENVIRONMENTAL BLOCKERS REMAIN.** No regression and no certification failure was found, but B1–B5 (live backend, other browsers, screen readers) could not be run, F1 (Stage 24 validator) still fails exactly as at baseline, and F2/F7 need decisions outside this task's boundaries.
