# KAYAD Phase 13J — Exact Change Ledger

Authorization: explicit owner authorization given in-session for **this one remediation: the `GET /:id/registration` handler in `backend/routes/auctionRegistrationRoutes.js` only**. Second owner decision: unpublished setup → 404.

## Modified source (1 file)
| File | SHA-256 before (13I) | SHA-256 after (13J) |
|---|---|---|
| `backend/routes/auctionRegistrationRoutes.js` | `2aabc0089018680fb68bfc3bb1feaefbdda57bb2d7c039dc917394c92f231f1c` | `7a9c59d74ba7692027d22dc0cc43c72b1815ebf6cbc047734d958f094c969e4f` |

Change: adds module-level `REGISTRATION_PUBLIC_CAR_STATUSES`, `REGISTRATION_CAR_FIELDS`, `pickFields`, `registrationSetupView`; the GET handler now (a) returns the existing `404 Auction not found` when the car/setup is missing, soft-deleted, not `available`/`sold`, or the setup is not `published`; (b) serializes `car` through a 17-field allowlist, `setup` through `{car_id, publication_status, config:{termsVersion, bidIncrement, settlement:{mode}, commitment:{recipient, refundable}}}`, and the caller's own `registration`. Diff: `proposed-patches/PROTECTED_auction_registration_disclosure.13J.diff`.

## Not modified
`auctionRegistration.service.js`, POST registration/commitment/high-value-deposit routes, bid placement/ranking/close, reserve logic, payments, escrow, settlement, refunds, forfeitures, reconciliation, payouts, webhooks, idempotency, frontend, 13I personal-account code, dealer dashboard, migrations (none), `package.json`/lockfiles.

## Added files
- `proposed-patches/PROTECTED_auction_registration_disclosure.13J.diff` (the original 13I proposal is kept for history; it is superseded because it left `setup` unfiltered).
- `runbooks/phase13j-20261026/http/phase13j_registration_security.mjs` (real-HTTP regression suite, 145 checks).
- `validation-logs/phase13j/**`, `KAYAD_PHASE13J_*.md`, `KAYAD_PHASE13J_PACKAGE_MANIFEST.txt`.

## Restored after test runs
`backend/data/uploads.json`, `uploads.sqlite`, `backend/uploads/*car.png` (byte-identical to 13I); the 13I matrix result/byid200 evidence files that the re-run rewrote (13J re-run copies are in `validation-logs/phase13j/phase13i_matrix_rerun_on_13J.*`).

## Behaviour change to note
For an available listing whose auction setup is not published, the route previously answered 200 with `registration:null` and the draft setup; it now answers 404. No in-repo caller depends on the 200 (SPA clears state on any error).
