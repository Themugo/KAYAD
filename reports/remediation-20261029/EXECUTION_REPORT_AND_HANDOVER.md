# KAYAD Remediation Run - Execution Report & Handover (final, 2026-10-30)

**Release decision: NOT CERTIFIED (PARTIAL).** Every automated suite, the typecheck and the build pass on the final tree, and
real-browser checks now exist for the auth screens and all 83 routes. The gate is still NOT met because live staging journeys
(real CSRF/session/MFA/verification/redirects, authenticated pages with real data, payments) could not be run, 8 validators
still fail (7 need credentials or documents that are not in the checkpoint; 1 is a brand-policy decision), and two owner
decisions are open. Production was never contacted.

## 1. Foundation
KAYAD-LOGIN-POLISH-CHECKPOINT-20261029.zip, SHA-256 81cc0fba7f7808b744eb715f1968dbf1c07640dc8072caa3796063320c425425
(verified = expected, integrity passed). Untouched baseline extraction preserved. No .git in the ZIP, so no history/branch/commit.

## 2. Environment
Linux sandbox (1 CPU, 4 GB), Node v22.22.2, npm 10.9.7 (npm 11 via npx used only to regenerate lockfiles).
Chromium came from the npm package @sparticuz/chromium driven by playwright-core, installed OUTSIDE the project.
Tool calls capped at 300 s, so suites ran in chunks.

## 3. Final results (final source + lockfiles; logs in reports/remediation-20261029/logs)
| Check | Result |
|---|---|
| npm ci (root, backend) | exit 0 on the final lockfiles |
| npm run typecheck | exit 0 |
| npm run build | exit 0 |
| Frontend vitest (4 chunks, 134 files) | 304 + 253 + 208 + 309 = 1,074 passed, 1 skipped, 0 failed |
| Backend jest (2 halves, 181 suites) | 1,460 + 1,705 = 3,165 passed, 0 failed |
| Backend vitest / node:test | 36 passed / 1 passed |
| Validators (287) | 279 pass, 8 fail; 0 regressions against the baseline |
| npm audit | root: 0 advisories; backend: 5 low (Jest toolchain, dev-only); was 1 critical+2 high / 1 critical+6 high |
| Secret scan (detect-secrets 1.5.0, 4,769 files) | 173 raw findings in 99 files, identical to the pre-change scan; no real credential found; Git history not scanned (none) |
| Browser: auth pages (Chromium, 8 widths 320-1440, 6 pages + login error state = 56 checks) | 0 horizontal overflow, 0 page errors; brand mark defect found and fixed (D-13); real 401 error shown at every width |
| Browser: route smoke (83 routes at 390 and 1440) | 19 render, 64 redirect to sign-in, 0 blank, 0 JS errors, 0 overflow, 0 duplicate main landmarks |
Browser checks stub the API at the browser level: they prove layout/rendering/front-end behaviour for an unauthenticated visitor,
NOT live authentication or business data.

## 4. Fixed and verified (production code)
- backend/routes/adminRoutes.js: module import crash (validateObjectId called as a factory) and staff DELETE 500 on Express 5.
- src/features/AdminView.tsx: { stats: null } accepted as valid.  src/pages/admin/WebhoistOverview.jsx: unavailable-metric warning unreachable.
- src/features/InspectionMarketplace/pages/InspectionMarketplacePage.tsx: provider record without verification.status crashed ProviderCard.
- src/index.css: brand mark squeezed to 31x38 on narrow sign-in-mode pages (flex-shrink); found only by the real-browser check.
- AdManager.jsx and AdminPrivateSellerApplications.tsx: nested/duplicate <main> landmarks.
- package.json overrides (undici 8.12.3), vitest/@vitest/coverage-v8 4.1.12, and both lockfiles (security updates). `npm audit fix --force` was REJECTED: it downgrades jest 30 to 25 and adds 29 advisories.
Tests/validators: 10 stale validators repaired after verifying the guarded behaviour in source (see D-10), many stale test expectations re-pointed, 10 tests given a stable toast mock (flake root cause), one race fixed.

## 5. Needs an owner decision
1. OD-5 /api/admin/stats: backend denies ghost_checker; the inspector UI never calls it, BUT the frontend admin shell admits ghost_checker to /admin, so they would meet a 403 on admin dashboards. Choose to also hide the admin dashboards from them (keep strict) or to allow read access (widen). No change made.
2. Brand palette (D-19): 14 amber/black-shadow usages. Map to a brand warning token or allow-list semantic status colours.
3. Confirm the harness PASSWORD literal (docs/messaging-consistency-audit/harness/browser/p0-matrix.mjs) is not reused on a real account. Evidence says it is a local throwaway fixture.

## 6. Still blocked or open
- Live staging journeys (no API URL/credentials): real CSRF, MFA, verification, redirects, session refresh, logout, role-gated pages with data, payment/escrow sandbox.
- 7 validators need things not in the checkpoint: live-runtime, local-supabase, communications-provider-certification (credentials/Docker); phase39, stage5f8-contract, release, phase8-operations (report documents / legacy evidence file). They were not faked.
- Webfonts are blocked in the sandbox, so browser screenshots use fallback fonts; confirm typography on a real device.
- 5 low advisories in the backend Jest toolchain.

## 7. Rollback and handover
- Baseline = the checkpoint ZIP above. Lockfiles and package.json changed: to back out the dependency update restore them from the ZIP and run npm ci.
- CHANGED_FILES_VS_BASELINE.txt lists every changed file. DEFECT_REGISTER.csv (19 rows) and ROUTE_CERTIFICATION_MATRIX.csv (83 routes) carry the evidence; screenshots/, screenshots-before/, route-shots/ and harness/ (re-runnable scripts + README) are included.
- First commands for the next engineer: node -v (>=22.22.2); npm ci (root and backend); npm run typecheck; npm run build; npx vitest run; (cd backend && npm run test:jest); review the lockfile diff; then the owner decisions above.
- Not committed, pushed, merged or deployed. No production data, migrations or payments touched.
