# KAYAD — Full-Project Remediation & Certification Report (2026-11-01)

**Final decision: PARTIAL.** Code-level work is complete and proven locally. Release-gate items that need staging credentials, a reachable API, or an owner decision are not met and are listed in §8. Nothing was committed, pushed, deployed or run against production.

## 1. Foundation identified — and a discrepancy you need to know about

| | |
|---|---|
| Foundation used | `KAYAD-AUTO-SERVICES-BUSINESS-REFINEMENT-20261029.zip` |
| SHA-256 (verified) | `6706b714e9c45aab12035b346f93e9798365d1ea6e11a5a9714d459805aa7a62` |
| ZIP integrity | `unzip -t`: no errors. Immutable copy kept at `baseline/` (read-only) |
| Git metadata | none in the ZIP (no history available) |
| Runtime | Node v22.23.4 (engine `>=22.22.2` satisfied), npm 10.9.9, Linux |

**The prompt required `KAYAD-LOGIN-POLISH-CHECKPOINT-20261029.zip` (SHA-256 `81cc0fba…c425`). That file was not uploaded.** Two ZIPs arrived; neither matched. I asked, and you chose the Auto-Services ZIP as the foundation. This is a documented substitution, not a match. Evidence it is *not* the Login Polish checkpoint: `scripts/validate-stage33-login-surface-polish.mjs` (named in the prompt) does not exist in it. `LoginPage.jsx`, `PremiumAuthShell.jsx` and the three LoginPage test files do exist, and their 12 tests pass.

You also sent the earlier registration-failure / buyer–seller convergence prompt. You chose to run **this recovery prompt only**, so that work was **not** done (see §8).

## 2. Root causes confirmed and fixed

Each is linked to code and a reproducible test. Full detail: `defect-register.csv`.

| ID | Sev | Defect | Proof |
|---|---|---|---|
| D-01 | **Critical** | **Backend could not start.** `routes/adminRoutes.js` called `validateObjectId("chatId")` on 4 route definitions; it is a plain middleware, so the string became `req` and threw at import. | New `adminChatRoutesBoot.test.js` fails with the exact production `TypeError` when the bug is re-introduced and passes with the fix. `validate:local-runtime` now PASS (`live 200, health 200, ready 503` = designed degraded mode without Supabase). |
| D-02 | **High** | **Removing a staff account returned 500** after the deletion had already happened. Express 5 / body-parser 2 leave `req.body` undefined for a body-less DELETE; the handler read `req.body.reason` while building the audit record. The account was soft-deleted and its sessions revoked, but **the "account deleted" governance audit entry was never written** and the owner saw a failure for an action that had succeeded. | `stage5f5StaffGovernance` + `stage5OwnerOnboardingSettings`: 132/132. Two previously failing tests were this defect. |
| D-03 | High | Command centre accepted `{stats:null}` as valid stats (`payload.stats ?? payload`). | `adminCommandCentre.test.tsx` |
| D-04 | Medium | Webhoist "Some statistics are unavailable" notice never showed on a partial-metric response. | `adminLightSurfaces.test.jsx` |
| D-05 | Low | `ProviderCard` threw on a record lacking `verification`. **Contract review:** those fields are required in the type and the backend always sends `verification`, so real API data doesn't trigger this; only a non-conforming test fixture did. Added optional chaining as a safeguard (no badge, never "Verified"). | `serviceFinder.test.tsx`; unhandled error gone |
| D-06 | Medium | Mobile auth inputs were 13 px, so iOS Safari zooms on focus. | Measured in Chromium: 16 px at 390, 13 px at 1440. **Real iOS not tested.** |
| D-07 | Low | `adManagerControl.test.tsx` had wrong import paths: the file never ran and broke `tsc`. | tsc exit 0; 4/4 pass |
| D-09 | Low | Test flake: unstable `useToast` mock caused a re-fetch loop in 3 test files. Production `toast` is stable. | 3 consecutive green runs |

**Stale tests (D-08).** 10 frontend files / 15 tests and 1 backend assertion asserted superseded copy or contracts (e.g. "could not be loaded" → "could not be refreshed"; lowercase `pending` → "Pending approval"; Delete → "Remove listing …" + `confirm`; owner-delete of a protected identity 400 → 403 `PROTECTED_STAFF_IDENTITY`). I updated them to current behaviour and kept each invariant; several assertions are stronger. **Please confirm those label/status changes were intended product decisions.** Two legacy `/admin/ads` Ad Manager tests were retired because that screen was replaced by the canonical `AdManagerPanel`; their intent (failure ≠ empty, dash ≠ 0) is now asserted in `adManagerControl.test.tsx`.

## 3. Files changed (vs the supplied ZIP)

Source (8): `backend/routes/adminRoutes.js`, `src/features/AdminView.tsx`, `src/features/InspectionMarketplace/components/ProviderCard.tsx`, `src/pages/admin/WebhoistOverview.jsx`, `src/index.css`, `package-lock.json` (3 entries: `dompurify` 3.4.16→3.4.17, `follow-redirects` 1.16.1→1.16.2, `zod` 4.5.4→4.6.7; **`package.json` unchanged**).
Tests (12): new `backend/tests/regression/adminChatRoutesBoot.test.js`; edited `stage5f5StaffGovernance.test.js`, `adManagerControl.test.tsx`, `adminCommandCentre.test.tsx`, `auctionsViewLoadFailure.test.tsx`, `serviceFinder.test.tsx`, `AdminMarketData.test.jsx`, `AdminReports.test.jsx`, `adminLightSurfaces.test.jsx`, `adminNoRequestStorm.test.jsx`, `adminTables.test.jsx`, `adminTruthfulness.test.jsx`, `superAdminOperationalIntegrity.test.jsx`.
Added: `certification-20261101/` (this report, CSVs, evidence). No file was deleted. No architecture, auth flow, permission or financial rule was changed.

## 4. Test results (all with Node v22.23.4; logs in `evidence/logs/`)

| Check | Baseline (as supplied) | Final (shipped tree) |
|---|---|---|
| `npm ci` | exit 0, 470 pkgs | — |
| `npx tsc --noEmit` | **exit 2** (1 error) | **exit 0** |
| `npm run build` | exit 0 | **exit 0** |
| Frontend `vitest run` | 10 files failed, **15 tests failed**, 1053 passed, 1 unhandled error | **134/134 files, 1071 passed, 1 skipped, exit 0** |
| Focused LoginPage (3 files) | — | 12/12 pass |
| Backend `jest` | 3 failed / 3080 passed | 1 failed / **3164 passed** (180/181 suites) |
| Backend `vitest` / `node --test` | — | 36/36 · 1/1 |
| Project validators (152 scripts) | — | **140 pass**, 12 exit non-zero (§5) |

The 1 skipped frontend test was already skipped in the supplied project. The 1 failing backend test is D-11 (§8).

## 5. The 12 non-zero validators

- **Pre-existing repo drift (3)** — `validate:phase39` (all 15 source checks PASS; fails only because `PHASE_39_COMPLETE.md` is absent), `validate:release` (aggregate; only failure is phase39), `validate:phase8-operations` (14/15; missing `APPLY_RECOVERY_TO_REPO.cmd`). Both files are also absent from your supplied ZIP. I did **not** create them: a "completion document" written to satisfy a validator would be false evidence.
- **Pre-existing cosmetic (1)** — `validate:brand-palette-convergence`: legacy warm colours in several admin pages/stylesheets. Out of scope; unchanged.
- **Blocked by environment (8)** — need provider credentials, Supabase keys, a deployment URL, a certification account, staging tokens or a backup file: `validate:communications:providers`, `validate:live-runtime`, `verify:production`, `certify:v14:live-api`, `certify:v14:production-runtime`, `certify:phase6:live`, `verify:backup`, `certify:buyer-portal:staging`. Not run = not certified.

Per-script table: `validator-results.csv`.

## 6. Audit items A-01 … A-07

| Item | Status |
|---|---|
| **A-01** build/typecheck/tests | **Closed.** Correct runtime; reproducible `npm ci`; tsc, build, full suite green. The permission errors in the earlier audit did not recur here. |
| **A-02** real-browser journeys | **Partly closed.** 40 screenshots (5 auth screens × 8 viewports: 320/360/390/412/430/768/1024/1440): no horizontal overflow, 0 unnamed controls, 0 targets under 40 px, no uncaught errors. Interaction checks at 320/390/1024: native validation blocks empty/malformed submit with **0 network POSTs**; show-password works; Forgot-password and Create-account links land on the right routes; keyboard focus ring visible; no infinite animations under reduced motion. **Not done:** live sign-in/MFA/verify journeys (no backend), real iOS/Android devices, contrast measurement, safe-area padding on a notched device. |
| **A-03** live CSRF | **Staging BLOCKED. Local PASS 5/5** against the real backend process: `GET /api/v1/auth/csrf` 200 with token; cookie `SameSite=Strict` (`Secure` is production-gated in code); login with no token → 403; mismatched token → 403; valid token passes the CSRF gate. Not a staging result. |
| **A-04** CSS scope | **Closed — premise doesn't apply.** The shell emits no `data-mode` and `index.css` has none; all five screens share unscoped `.kayad-auth-*` rules, so there is no cross-mode bleed. Minor: header "Create account" wraps to two lines at 320 px. |
| **A-05** secrets | **Partly closed.** `detect-secrets` full-tree scan: 185 heuristic findings in 101 files. I reviewed the 40 in source/scripts with values masked: all are field names, regexes, k8s `secretName`, placeholder/test values or a doc example. **No real credential identified.** Limits: gitleaks was not installable; heuristic scanner; **no Git history** in the ZIP. |
| **A-06** dependencies | **Partly closed.** `npm audit`: 19 (1 critical, 3 high, 15 moderate) → **17 (0 critical, 1 high, 16 moderate)**. Build/tsc/suite re-run green. Remaining high: `undici` 8.10.2, pinned by an explicit `package.json` override and used only by jsdom in tests. 16 moderate are dev tooling (breaking bumps). Recommend a separate reviewed change. |
| **A-07** config / integrations | **BLOCKED.** No staging URL or credentials, so no RLS, payment sandbox, webhook replay or refresh-reuse runs. 118 env names are referenced in source but undocumented (`environment-variable-inventory.txt`; a static name scan only, no values read). |

## 7. Route audit (86 routes discovered from `App.tsx` and `AdminRouteSurface.tsx`)

`route-certification-matrix.csv`. Every route loaded at 390 and 1440 px with no overflow and no uncaught exception. **Result wording matters:**
- 22 public/redirect routes: **PASS (shell)** — page frame renders; data content untested (API unreachable).
- 63 authenticated/dealer/admin routes: **PASS (gate) / content NOT TESTED** — with no verifiable session each shows a fail-closed "We couldn't verify your session" panel and renders no page content. That proves no leak when the API is down. It does **not** prove the redirect-to-login or role checks with a reachable API.
- Admin unit coverage: 26 of 51 admin routes have a Vitest file referencing their page component; **25 have none**.

## 8. Outstanding issues and next actions

| # | Sev | Issue | Next action |
|---|---|---|---|
| D-11 | Medium | `ghost_checker` gets 403 on `GET /api/admin/stats`; the role-matrix test and `docs/ROLE_MATRIX.md` (`VIEW_ANALYTICS`) imply access. **Left fail-closed** — fixing it would widen access to revenue stats. | Owner decides allow vs. update matrix. |
| D-12 | Medium | Missing `PHASE_39_COMPLETE.md` / `APPLY_RECOVERY_TO_REPO.cmd` fail 3 validators. | Restore from repo history or update validators. |
| D-10 | Medium | `undici` high (test-only) + 16 moderate dev-tool advisories. | Bump override to ≥ 8.12.2, vitest 4.1.12; review. |
| D-15 | High (for release) | No staging certification: login/MFA/verify/refresh-reuse, RLS, payments/webhooks, live CSRF. | Supply approved staging URL + test accounts; run `certify:*`. |
| D-14 | Low | With no database, valid-CSRF login returns generic **500** "Login failed" (a 503 would let the UI offer a retry). Observation only; production behaviour unverified. | Review error mapping. |
| — | — | **Registration "CONNECTION PROBLEM" prompt not executed** (your choice). Related facts found: `/register` and its forms render and validate; empty register body → 400 with field errors; no idempotency / lost-response recovery was examined. | Run that prompt next on this ZIP. |
| — | Low | 8 other test files use the same unstable-toast mock (currently passing); `validate:brand-palette-convergence` debt; 320 px header wrap. | Housekeeping. |

## 9. Release gate

| Gate | Met? |
|---|---|
| Correct Node, clean `npm ci` | Yes |
| Typecheck, production build | Yes |
| Focused auth tests; full unit suite | Yes |
| Backend tests | **No** — 1 failing (D-11, policy) |
| No unresolved critical/high security findings | **No** — 1 high (test-only `undici`) |
| Secret / dependency scan completed or limit documented | Yes (limits documented) |
| Login/MFA/verify/redirect journeys in staging | **No — blocked** |
| Responsive browser checks | Yes (auth screens); routes at 2 widths only |
| Route smoke to documented scope | Yes |
| Financial/provider workflows | **Not certified — excluded from any release claim** |
| Final archive integrity + fresh extraction | See §10 |

**Not fully certified. Do not describe this build as production-certified.**

## 10. Deliverable, rollback and handover

A ZIP cannot contain its own hash, so the ZIP's SHA-256 (`.sha256` file) and `PACKAGING-VALIDATION.txt` (integrity, fresh-extraction, content checks) are delivered **next to** the ZIP, not inside it.
**Rollback:** the supplied ZIP (hash above) is the baseline; every changed file is listed in §3. To restore any file, extract it from that ZIP.
**Run first next time:** `npm ci && (cd backend && npm ci)`, then `npx tsc --noEmit`, `npx vitest run`, `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js tests/regression/adminChatRoutesBoot.test.js`, `npm run validate:local-runtime`.
