# Business Lifecycle and Financial Safety Verification

> **Superseded in part (2026-11-21, later):** the post-alignment phase executed journeys, reconciled the baseline failures and found/fixed further defects. Where this document disagrees, `IMPLEMENTATION-AND-VERIFICATION-REPORT-20261121.md`, `FAILURE-REGISTER-20261121.md` and `HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md` are authoritative.

Scope honesty: this run did **not** execute authenticated lifecycle journeys. Findings below come from code/test inventory, migration application on a disposable DB, the backend test suites and the validator sweep.

| Lifecycle | Code present | Backend tests | DB | Status |
|---|---|---|---|---|
| Listings & moderation | yes (`carController`, verification controllers) | jest suites pass (personal listing photo-removal fails only due to missing `CLOUDINARY_*` env; passes 11/11 with placeholders) | `kayad_personal_listing_lifecycle_atomic` applies locally; **absent on hosted** | PARTIAL - code verified, hosted not ready |
| Private seller listing | yes; capability model, not a second account | `personalListing*` tests (1 jest-collection defect, below) | as above | PARTIAL |
| Dealer listings | yes | dealer tests pass | present on hosted (older migrations) | VERIFIED (code/tests) |
| Offers / counteroffers / negotiation | `leadRoutes.js` -> `offerNegotiationController.js` -> `offerNegotiation.service.js` (`performOfferAction` takes `idempotencyKey`) | **only 1 jest file references it** (`buyerNegotiationChatReference.test.js`); no behavioural test of the offer state machine or its idempotency found | `marketplace_offers` with `idx_marketplace_offers_one_pending_per_lead` unique index applies locally; **absent on hosted** | **GAP: untested state machine; not deployable to hosted yet** |
| Accepted offer -> transaction | `transactionRoutes.js`; tests `transactionLifecycleIntegrity`, `marketplaceFulfilmentCarSoldOnRelease` pass | pass | transaction migrations on hosted (Sep) | VERIFIED (tests); offer-to-transaction link NOT TESTED |
| Escrow/payment | 10 services, 14 escrow + 12 payment test files; idempotency-key tests exist (`escrowIdempotencyKeys`, `paymentInitiateIdempotencyKey`) | pass | on hosted | VERIFIED (unit/regression level) |
| Inspection | 2 route files, 5 test files | pass | on hosted | VERIFIED (unit level) |
| Settlement/completion | `auctionSettlement.service.js`, `auctionSettlementRoutes.js`, 6 test files mention settlement | pass | auction reward migrations (20261114/15) apply locally; absent on hosted | PARTIAL |
| Cancellation / disputes | dispute services/controllers present; no test file named `dispute*` (dispute coverage via `tests/security` and `validate-dispute-integrity` which passes) | - | on hosted | PARTIAL |
| Audit records | audit services + `passport_audit_log` etc. | staff-governance validators failing (audit-reason assertion) | - | NOT individually reconciled |

Direct-API bypass of lifecycle requirements, ownership checks on transactions, and cross-account access were **not attack-tested** here. No financial rule was changed. Any claim that "financial operations are idempotent" is supported only by existing unit tests, not by this run's end-to-end tests.
