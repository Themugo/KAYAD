# KAYAD Phase 13D — Defect Reproduction
Foundation verified before any edit: Super Admin ZIP SHA-256 `2a9b65a53156cd000568b830c5648ddf196639c9c8c4acd8f17674f40003a7ca`; Phase 13C ZIP SHA-256 `95443cf9ee13384ae8f307063767fba5eb36ca6aefb72f8a11cecc264fbaeb2f`. Originals are untouched; work was done in a separate copy (`/home/claude/work/p13d/work`, pristine reference in `/orig`).

Evidence tier: **mocked local runtime** — the real routers and the real `protect`, `dealerOnly`, `dealerOrgAccess` and `requireDealerVerification` run over HTTP; persistence and heavy services are mocked. Nothing here touches a database.

| ID | Finding | Reproduced against actual source? | Evidence |
|---|---|---|---|
| DI-1 | An approved `individual_seller` passes the `/api/dealer/*` router guard (`dealerOnly` + `requireApproved`) and reaches team invite, subscription upgrade, wholesale and trade-listings handlers | Yes | `logs/new-tests-BEFORE-fix.txt` — approved-seller cases for these routes fail (status was not 403) |
| DI-2 | The 25 `/api/dealer-platform/*` business routes use `dealerOnly` with no status check, so private sellers in *any* status (pending, suspended, rejected included) reach CRM, marketing, inventory, analytics, subscription, customers, copilot | Yes | same log; every seller-status × platform-route case failed before |
| DI-3 | `/api/listing-quality/dealer/:dealerId/{stats,report,bulk-recalculate}` perform no ownership check; any dealer or seller reads or recalculates any dealer id | Yes | same log; unrelated dealer D2 got 200 (and the service ran) for D1's id on all three routes |
| DI-4 | `requireDealerVerification` inserts `Dealer{approved:true}` for any `individual_seller` with no row, whatever `users.status` | Yes | same log; `Dealer.create` was called for pending/approved/suspended/rejected sellers |
| DI-5 | `/api/cars` writes have no seller-status gate | Confirmed by reading; **deferred to the C1 stage** (outside the three approved corrections) | — |
| DI-6 | Staff roles pass `dealerOnly` | Confirmed; **preserved by design** | staff tests pass before and after |

Result of the final test file on pristine code: **173 tests, 73 failed, 100 passed** (the 100 passing are the preservation cases — dealer owner, staff, team member, anonymous, malformed id — which must pass both before and after). After the correction: **173 passed**.

## What the reproduction also taught us (scope correction, recorded honestly)
A first version of the fix replaced the guard on the whole legacy `/api/dealer/*` router. The existing suites then failed (`stage1ListingWriteBoundaries` S1-LIST-04 ×6, `onboardingFlow` ×1). Reading them showed that router also hosts **caller-scoped listing management that private sellers legitimately use** (cars, bulk-status/delete, mark-sold, bids, auctions, earnings, escrows, payouts), pinned by an existing test. The correction was therefore narrowed to per-route guards on the dealer-*business* routes only; see the change ledger. The one remaining pre-change test that had to be edited (`onboardingFlow`) pinned the defect itself (DI-4) and was updated to assert the corrected behaviour while keeping the listing outcome.

## Harness note
A `test.each` row shorter than the test function's parameter list makes Jest treat the extra parameter as a `done` callback and wait for its 5-second timeout. Early runs appeared to "hang" for that reason; rows are now normalised to a fixed arity.
