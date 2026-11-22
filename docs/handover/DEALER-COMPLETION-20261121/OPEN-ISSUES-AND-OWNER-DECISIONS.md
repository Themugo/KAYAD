# Open issues and owner decisions

Nothing here was decided by Claude; no business rule was invented.

## Owner decisions still required
* **D-1 … D-12** (carried from the earlier phases; see `../DEALER-IMPLEMENTATION-20261121/`): all remain open. This phase did not resolve any.
* **D-13 (new): legacy `pending` listings.** A dealer cannot publish a car whose stored status is `pending` (the SQL function allows publish only from draft / hidden). The API answers 409 `LISTING_UNDER_REVIEW`. Decide who moves a `pending` listing forward (admin approval, dealer action, or a data migration).
* **D-14 (new): `Rejected` status.** The brief lists "Rejected where applicable", but `cars.status` has no stored `rejected` value (CHECK: available, sold, pending, reserved, hidden, draft). The UI therefore shows no Rejected state. Decide whether a rejection state should exist.
* **D-15 (new): staff pause / publish.** Staff reach pause / publish only through the permission-scoped bulk endpoint; there is no single-listing staff route. Decide whether one is wanted.
* **D-16 (new): retiring validator-pinned legacy files** (see LEGACY-DUPLICATION-REGISTER.md).
* **Publication completeness rule** (brand, model, year ≥ 1950, price > 0, one image) was taken from fields the rest of the app already treats as required. Confirm it is the intended minimum.

## Blocked / not tested
* Real Cloudinary upload (no credentials): BLOCKED; stub only.
* Real M-Pesa: BLOCKED. J2 BLOCKED; J4, J6 NOT TESTED (see THIRTY-JOURNEY-RESULTS.md).
* Dark mode captures, contrast measurement, screen-reader audit, reduced motion: NOT TESTED.
* Staff workspace UI re-capture: NOT TESTED.
* Phase 7: states that already existed were verified; a page-by-page completeness pass for every dashboard section was not done.

## Pre-existing failures (not caused by this work)
Six repository validators fail on `origin/main` unchanged (listed in TEST-RESULTS.md).

## Hosted database
86 repository migrations are not applied to the hosted project and the dealer lifecycle objects are missing there. Nothing was applied by Claude. See DATABASE-MIGRATION-RECONCILIATION.md.
