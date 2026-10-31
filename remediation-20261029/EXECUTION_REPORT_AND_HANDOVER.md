# KAYAD Remediation Run — Execution Report & Handover (2026-10-30)

**Release decision: NOT CERTIFIED (PARTIAL).** Build, typecheck and all frontend/backend automated suites pass; the release gate
is NOT met because of unresolved critical/high dependency advisories, 18 failing (pre-existing) validators, and no browser /
staging certification. Production was never contacted.

## 1. Foundation
- File: KAYAD-LOGIN-POLISH-CHECKPOINT-20261029.zip
- SHA-256 (verified = expected): 81cc0fba7f7808b744eb715f1968dbf1c07640dc8072caa3796063320c425425
- ZIP integrity test: passed. Untouched baseline extraction kept at /home/claude/baseline/KAYAD; working copy /home/claude/w2/KAYAD.
- No .git in the ZIP: Git history, branch and commit unavailable.

## 2. Environment
Linux sandbox, 1 CPU / 4 GB, Node v22.22.2 (meets engines >=22.22.2), npm 10.9.7. `npm ci` succeeded in root and backend from
committed lockfiles (lockfiles and package.json files are UNCHANGED). Tool calls limited to 300 s, so suites were run in chunks.

## 3. Results (exact commands; all run from the final source state)
| Check | Command | Exit | Result |
|---|---|---|---|
| Typecheck | npm run typecheck | 0 | pass |
| Build | npm run build | 0 | pass (chunk-size warning only) |
| Frontend tests | npx vitest run <4 chunks of the 134 files> | 0 each | 134 files; 304+252+208+309 = 1,073 passed, 1 skipped, 0 failed |
| Backend jest | node --experimental-vm-modules jest --runInBand --forceExit (2 halves) | 0 each | 181 suites; 1,460+1,705 = 3,165 passed, 0 failed |
| Backend vitest | npm run test:vitest | 0 | 6 files, 36 passed |
| Backend node:test | npm run test:node | 0 | 1/1 |
| Validators | node scripts/validate-*.mjs (287 scripts, 40 s timeout each) | mixed | 269 pass, 18 fail (all 18 also fail on the untouched baseline: NO regressions) |
| Secret scan | detect-secrets 1.5.0 over 4,803 files | 0 | 173 raw findings, none a real credential (see D-12); history not scanned |
| Dependency audit | npm audit --json (root, backend) | 0 | root 6 (1 critical, 2 high); backend 17 (1 critical, 6 high) - UNFIXED |
| Browser / responsive / staging | - | - | BLOCKED |

Note: a first all-at-once backend jest run was OOM-killed (exit 137); the chunked serial runs above are the evidence.

## 4. Fixed and verified
Source (production) code: D-02 AdminView null-stats; D-03 Webhoist unavailable-metric warning; D-04 admin router import crash
(validateObjectId called as a factory at 4 route registrations; importing routes/adminRoutes.js threw, so server.js could not
start); D-05 staff DELETE returning 500 after side effects on Express 5 (req.body undefined).
Tests: D-01 import depth (typecheck fix); D-06 stale expectations; D-07 AdminMarketData isolation flake. See DEFECT_REGISTER.csv.

## 5. Implemented but not verified / needs a decision
- D-08 /api/admin/stats denies ghost_checker (inspection providers). Test aligned to the enforced behaviour; OWNER must decide OD-5.
- D-13 shared auth-shell CSS (42px brand mark etc. on all modes): needs visual confirmation, no change made.

## 6. Unresolved
- D-11 Dependencies: 2 critical (dompurify, transitive via posthog-js and isomorphic-dompurify) and 8 high advisories remain.
  `npm audit fix` crashed inside npm 10.9.7 (edgesOut null) in both normal and --package-lock-only mode; nothing was changed.
  Next: on a dev machine run `npx npm@11 audit fix` per package, then npm ci, typecheck, build and all suites.
- D-10 18 stale/environmental validators (classified in the register). communications-cleanup (SAVED_SEARCH_MATCH absent from
  backend/services/savedSearchCron.js) may be a real regression and should be reviewed first.
- D-09 ProviderCard fragility on partial provider records: NOT investigated against the canonical API schema.
- D-12 confirm the PASSWORD constant in docs/messaging-consistency-audit/harness/browser/p0-matrix.mjs is not a real credential.
- D-07 follow-up: 9 other tests use the same per-render toast mock pattern (passing today, timing-sensitive).

## 7. Blocked (external prerequisites)
Playwright journeys and 320-1440 px screenshots (no browser binaries obtainable); live CSRF/session/MFA/verification/redirect
journeys (no staging API base URL or credentials); financial/payment sandbox tests; production observations (none made, none
authorised). Route matrix: 83 routes discovered from App.tsx::AuthRouteSurface and the admin surfaces; 73 are only REFERENCED in
passing tests (path string present, not a route-level pass), 10 are NOT TESTED (/gallery, /marketplace, /financing, /sell-car,
/sell-vehicle, /saved, /buyer-platform, /inspector/dashboard, /admin/owners, /admin/communications). No route is browser-certified.

## 8. Rollback and handover
- Baseline: the checkpoint ZIP above (SHA-256 verified). To restore: extract it into a new folder. Changed files are listed in
  CHANGED_FILES_VS_BASELINE.txt (16 files incl. 1 new test; 4 production-code edits across 3 files: backend/routes/adminRoutes.js,
  src/features/AdminView.tsx, src/pages/admin/WebhoistOverview.jsx; the rest are tests).
- First commands for the next engineer: node -v (>=22.22.2); npm ci (root and backend); npm run typecheck; npm run build;
  npx vitest run; (cd backend && npm run test:jest); then triage D-11, D-10, D-08.
- Not committed, pushed, merged or deployed. No production data, migrations or payments touched.
- The earlier idempotent-registration workstream (previous prompt) was NOT continued in this run.
