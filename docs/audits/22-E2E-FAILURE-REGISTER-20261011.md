# Repository Playwright E2E: failure register and root causes

**Suite and configuration.** These are the tests run by default (`e2e/playwright.config.ts` grep: *canonical onboarding*, *Workflow certification*, *KAYAD marketplace controls*), on Chromium, against `vite dev`. By design they **mock the API** with `page.route` or use no backend: they certify the shipping UI contract, **not** UI → API → database round trips. Those round trips are covered by the real-backend harness (`m2`–`m15`) and the Messages browser matrix, which use real Chromium and the real backend.

The legacy suites gated behind `E2E_WITH_BACKEND=1` (vehicle listing, chat, auction bidding, escrow, M-Pesa, reviews, disputes, release journey) need live seeded accounts (`BUYER_EMAIL`/`BUYER_PASSWORD`, dealer and admin) and provider sandboxes. They are **NOT RUN** here; see `28-…` §G.

Baseline: **5 pass / 14 fail**, identical on the foundation and on the reconciled tree. Before evidence: `evidence/runtime-convergence-20261011/e2e/BEFORE-e2e-failures-detail.txt`.

| # | Test | Failure (exact) | Classification | Root cause | Correction | After |
|---|---|---|---|---|---|---|
| 1 | onboarding: buyer registration | `getByRole('button', { name: 'Buyer', exact: true })` not found | **Stale test expectation** | The identity-onboarding convergence replaced the old "pick role → Continue" UI with a `radiogroup` of role cards (`OnboardingFlow`). The details form follows directly, the submit is "Create account", and the outcome is the email-verification screen (no session until verified) | Drive the shipping flow (radio → details → "Create account") and assert the outcome "Check your email." plus the buyer next-step. Request-contract assertions unchanged: `role=user`, name | PASS |
| 2 | onboarding: dealer registration | same (Dealer) | Stale expectation. The old test even expected "Private seller account created" for a dealer | as 1 | Dealer fields are now "Dealership business name" and "City or location". The contract assertions are unchanged: `role=dealer`, `businessName`, `location`. Asserts the dealer-specific next step | PASS |
| 3 | onboarding: private seller | same (Private Seller) | Stale expectation. The old test expected "Dealer application submitted" | as 1 | `role=individual_seller` assertion unchanged; asserts the seller-approval next step | PASS |
| 4 | onboarding: inspector application | same (Inspector) | Stale expectation | The role is now "Inspector or mechanic" with an "On my own / For a garage" choice. Independent applicants send an application, not an account | Drive the independent path. Endpoint and payload assertions unchanged (`/api/inspector-applications/apply`, `fullName`, `specialties` array); asserts "Your application is with KAYAD." | PASS |
| 5 | marketplace: 3/4/5 column controls | `[aria-label="Grid columns"]` not found | Stale selector **plus a genuine a11y defect** | The group was renamed "Desktop grid columns" but was a bare `div` with `aria-label` (ignored by assistive technology). At 1440 px, 5 columns are capped to 4 by the documented container query (5 needs ≥ 1120 px of result area) | App: the control is now `role="group"`. Test: selects the group by role and measures at 1920 px. A **new test** asserts the documented cap at 1440 px | PASS (+1 new PASS) |
| 6 | marketplace: breakpoints | same selector | Stale selector | as 5 | as 5 | PASS |
| 7 | marketplace: mobile filter drawer | `getByText('Refine inventory')` strict-mode violation: 2 elements | **Genuine a11y defect** plus an ambiguous selector | The full-screen mobile filter drawer was a plain `div`: no dialog role, no modal semantics, no accessible name. The hidden desktop sidebar has the same heading | App: drawer is `role="dialog" aria-modal="true" aria-labelledby`. Test addresses `getByRole('dialog', { name: 'Refine inventory' })` | PASS |
| 8 | marketplace: admin escrow dropdowns | `getByTitle('Customize Home Page')` not found | **Missing test fixture** | The button renders for administrators only (asserted by `VehicleMarketplace.test.tsx`). The test never established an admin session | Fixture: the session bootstrap (`GET /api/v1/auth/me`) answers with an admin user | PASS |
| 9 | workflow: shell renders | `text=KAYAD EA` not found | Stale selector | Navigation convergence renders the brand as separate "KAYAD" and "EA" elements inside the labelled home link `KAYAD marketplace` | Assert the accessible brand control. The primary nav items are now **links** (`navigation "Primary"`), so "Marketplace" and "Auction" are asserted as links | PASS |
| 10 | workflow: auth entry points | `button "Sign In"` not found | Stale expectation | The CTA is now "Sign In / Sign Up" | Updated name | PASS |
| 11 | workflow: navigation switching | `button "Auctions"` not found | Stale expectation | The item was renamed "Auction" and is a link | Updated role and name | PASS |
| 12 | workflow: refresh preserves shell | `text=KAYAD EA` | Stale selector | as 9 | as 9 | PASS |
| 13 | workflow: API unreachable | `text=KAYAD` timeout after 30 s | **Test harness defect** | `page.route('**/api/**', abort)` also matched the app's own modules under `vite dev` (`/src/api/*.ts`), so the app never loaded. The test measured itself, not the app | Abort only requests whose path starts with `/api/`. The assertions are unchanged: shell renders and there are **no page errors** | PASS |
| 14 | workflow: mobile shell | `text=KAYAD EA` | Stale selector | as 9 | as 9 | PASS |

**Result after this phase: 20 tests, 20 pass** (19 original plus the new 5-column cap test). The exact final run is in `evidence/runtime-convergence-20261011/final-regression/e2e.txt`.

## E2E-ENV-1: the "under load" failures, root cause found and fixed
Twice now, the E2E run inside the full regression battery failed broadly while isolated re-runs passed:
- the previous phase recorded 2 pass / 17 fail and called it environmental;
- this phase's battery recorded 6 pass / 14 fail (`final-regression/e2e-battery-output-written-inside-repo.txt`).

The common factor is that the battery redirects Playwright's output into a file **inside the repository** (`docs/audits/evidence/…/e2e.txt`), while `vite dev` serves the app from the same tree.

Every write to that file reached Vite's watcher, and the dev page did full reloads mid-test. The logs show repeated `navigated to "http://localhost:3000/"` and React `createRoot() … already been passed`; elements detached while being clicked.

| Run | Output written to | Result |
|---|---|---|
| Isolated | `/tmp` | 20/20 (`e2e-isolated-before-watch-fix.txt`) |
| Reproduction | inside the repo | 6/14 (`e2e-reproduction-output-inside-repo.txt`) |
| After the fix | inside the repo | **20/20** (`e2e.txt`) |

The fix is dev-only: `vite.config.ts` `server.watch.ignored` covers `docs/**`, `evidence/**`, `test-results/**` and `playwright-report/**`. There is no effect on production builds; typecheck, build and frontend tests were re-run and pass. The earlier "environmental" classification is replaced by this verified root cause.

**What was not done.** No assertion about behaviour was weakened. The request-contract assertions (roles, payload fields, endpoints), the grid-column computations, the no-page-error check and the "does not fabricate data" check are unchanged or stricter. Two app changes were made, both additive ARIA semantics: the grid control group and the mobile filter dialog. No layout or architecture change.

**Classification totals:**

| Classification | Tests |
|---|---|
| Stale test expectation or selector after the onboarding and navigation convergence work | 10 |
| Genuine application (a11y) defect | 2 (grid group, filter drawer — each also had a stale selector) |
| Missing test fixture | 1 |
| Test harness defect | 1 |
| Test-infrastructure defect in the battery (E2E-ENV-1, dev-server reload from a log written inside the watched tree) | explains the 2/17 and 6/14 battery runs; fixed in `vite.config.ts` |
