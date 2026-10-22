# KAYAD All-Areas Change Ledger
Source: kayad-fresh.zip SHA-256 12d083ec1753799a1a61e1a5c0ed1c9e3623aa5da1b0d8ccc9ddba0a10bc0b74 (HEAD 8aa6343f). Nothing committed, pushed, deployed or applied to production.

| ID | File | Change | Root cause | Verified |
|---|---|---|---|---|
| AA-S1 | backend/routes/marketplaceHealthRoutes.js | `/summary`, `/trends`, `/alerts` now `protect, adminOnly` | Unauthenticated exposure of fraud, dispute and financial marketplace metrics; no frontend consumer | New test allAreasMarketplaceHealthAuthz (4); full suite green |
| AA-S2 | backend/routes/userRoutes.js | `/search` requires `protect`; email only for staff; staff accounts hidden from non-staff (uses shared STAFF_ROLES) | Unauthenticated enumeration of all users' names/emails; no consumer | New test allAreasUserSearchAuthz (3); full suite green |
| — | backend/tests/regression/allAreas*.test.js | 2 new regression files | Guard AA-S1/S2 | Pass |
| — | KAYAD_ALL_AREAS_*.md/tsv, evidence/allareas/ | Audit deliverables | — | — |

Reviewed, no change: Phase 39 mpesaSecurity.js (correct, fail-closed).

---
# Continuation 2 changes (scratch baseline = last delivered ZIP)
| ID | File | Change | Evidence |
|---|---|---|---|
| AA-S1r | backend/routes/marketplaceHealthRoutes.js | `/summary,/trends,/alerts`: `protect` + `allowRoles("admin","superadmin")` (was `adminOnly` = every staff role) | allAreasAuthzRuntime: 32 failed pre-fix -> 0 |
| AA-S2r | backend/routes/userRoutes.js | email + privileged accounts visible only to admin/superadmin/webhoist; other callers get `role $nin STAFF_ROLES` | same suite |
| AA-D2 | backend/controllers/dealerHealthScoreController.js | public populate no longer selects `email` | allAreasDealerHealthPublicFields: fail -> pass |
| AA-K1 | k8s/backend/deployment.yaml | `optional: true` moved inside `secretKeyRef` | allAreasK8sManifestSchema fail -> pass; kubeconform 25/27 -> 26/26 valid |
| AA-K2 | k8s/strategies/canary-deployment.yaml | `- # Conversion rate...` -> `# - Conversion rate...` | same |
| T1 | backend/tests/regression/allAreasMarketplaceHealthAuthz.test.js | assertion updated from `adminOnly` to the new guard (strictly narrower policy); superseded in strength by runtime suite | pass |
| T2 | backend/tests/regression/allAreasAuthzRuntime.test.js (new, 57) | real routes + real middleware over HTTP, 13 roles | pass |
| T3 | allAreasDealerHealthPublicFields, allAreasK8sManifestSchema (new) | regression guards | pass |
| H1 | .gitignore | ignore `backend/data/*.sqlite*` (test artifact) | n/a |
| S1 | scripts/audit/{route-inventory.mjs,replay-migrations.sh,supabase_stubs.sql} | reproducible audit tooling | run, outputs in evidence/ |
| E1 | evidence/{db_replay,test_logs}/, KAYAD_ALL_AREAS_ROUTE_ROLE_MATRIX.tsv (regenerated) | evidence | - |
Not changed on purpose: dealer-health-score access policy, STAFF_ROLES/adminOnly breadth (AA-A1), bun.lock, gitleaks allowlist, Helm chart.
