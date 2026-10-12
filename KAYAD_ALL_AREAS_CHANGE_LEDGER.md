# KAYAD All-Areas Change Ledger
Source: kayad-fresh.zip SHA-256 12d083ec1753799a1a61e1a5c0ed1c9e3623aa5da1b0d8ccc9ddba0a10bc0b74 (HEAD 8aa6343f). Nothing committed, pushed, deployed or applied to production.

| ID | File | Change | Root cause | Verified |
|---|---|---|---|---|
| AA-S1 | backend/routes/marketplaceHealthRoutes.js | `/summary`, `/trends`, `/alerts` now `protect, adminOnly` | Unauthenticated exposure of fraud, dispute and financial marketplace metrics; no frontend consumer | New test allAreasMarketplaceHealthAuthz (4); full suite green |
| AA-S2 | backend/routes/userRoutes.js | `/search` requires `protect`; email only for staff; staff accounts hidden from non-staff (uses shared STAFF_ROLES) | Unauthenticated enumeration of all users' names/emails; no consumer | New test allAreasUserSearchAuthz (3); full suite green |
| — | backend/tests/regression/allAreas*.test.js | 2 new regression files | Guard AA-S1/S2 | Pass |
| — | KAYAD_ALL_AREAS_*.md/tsv, evidence/allareas/ | Audit deliverables | — | — |

Reviewed, no change: Phase 39 mpesaSecurity.js (correct, fail-closed).
