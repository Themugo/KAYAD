# KAYAD Phase 13I — Route Failure Disposition
Register (one row per route, all required fields): `KAYAD_PHASE13I_ROUTE_FAILURE_DISPOSITION_REGISTER.csv`. Fresh evidence on the final tree: `validation-logs/phase13i/sweep/sweep-final.{log,json}` (480 parameter-free GET routes as super admin) and `probe-final-merged.json` (per-role statuses + backend log cause).
## Reproduction
- Final sweep: **480 routes, 112 returned 5xx (109×500, 3×503)** — identical to the 13H result; the baseline sweep on the 13H code (same stack) is also 112. Nothing new broke; nothing was forced to 200. Scope limit unchanged: POST/PUT/PATCH/DELETE and path-parameter routes are not swept.
- Historical failure not reproduced: `/api/analytics/market/county-trends` (13G's 113th failure) is 200 on the final stack.
## Classification (112 current + 1 historical)
| category | routes |
|---|---|
| 1. Confirmed in-scope application defect | **0** |
| 2. Required schema/migration dependency | 1 |
| 3. Production-only or externally managed schema dependency | 8 |
| 4. Optional or obsolete feature | 10 |
| 5. Configuration/provider dependency | 2 |
| 6. Owner decision required | 82 |
| 7. Protected financial/bidding/authentication boundary | 9 |
| 8. Historical failure not reproduced | 1 |

## Personal-account defects
**None.** No failing route is called by the unified dashboard, Seller Studio, buyer features, the private-seller review page or the personal-account APIs. The defects the personal-account workstream did have (listing exposure through six public/by-id endpoints, the valuation-matrix cache, the legacy approval endpoint, the saved-search job) were fixed and are certified separately; none appears in this register.
## Notes on the 20 code defects (category 6, not fixed)
13 × `ReferenceError`, 3 × `TypeError`, 2 × queue not initialised (category 5), 1 × deliberate 503 (category 4), `JobFailure`/`FeatureFlag`/`ListingQuality`/`MarketplaceHealth`/`NotificationAudit` used but never imported, and the model facade has no implementation of the Mongoose-style statics they call. Importing the models would only move the failure; implementing the statics invents product semantics, so the owner decides implement vs retire. Only `/api/dealer-health-score/ranking/list` is reachable anonymously (500, no data exposure). `/api/feature-flags/user` fails for every signed-in user but no SPA page calls it.
## Protected (category 7, 9 routes) — not touched
bids integrity (`bids.is_suspicious`), escrow operations (`issue_details` embed), finance issues, referral payouts (`transactions`), SMS bidding (`sms_bidders`), auction integrity (`auction_integrity_flags`, `auction_risk_profiles`). Dependencies documented; Phase 13I stops at the boundary.
## Schema (categories 2 and 3)
8 routes depend on production-only tables (BLOCKED on the owner export), 1 on a schema file that is not a migration (`organizations`). 73 routes need tables found nowhere: the owner decides provision vs retire (category 6/4). See `KAYAD_PHASE13I_SCHEMA_BLOCKERS_AND_OWNER_EVIDENCE_REQUEST.md`.
