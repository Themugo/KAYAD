# KAYAD Phase 16C — Change ledger (relative to the Phase 16B archive, SHA-256 `7f97ebe5acb00fc0313f1272cd465638c64e7fca9eb0ee96e5f64f326985d9e3`, 275,220,954 bytes, kept unchanged)

Auctions, bids, deposits, escrow, payments, settlement, refunds, ledgers and M-Pesa callbacks: **not touched**. No hosted action, invitation, migration application, commit, push or deployment.

## Source changes
| File | Change | Why / evidence |
|---|---|---|
| `runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql` | `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` before the CRUD grant | Found by certification D: `service_role` kept TRUNCATE/REFERENCES/TRIGGER from Supabase default privileges. M3 pg-tests 23/23; certification 99/99 |
| `src/pages/admin/AdminOwnerManagement.jsx` | Owners / Invitations / Audit tables: `owner-tbl` class, `data-label` on every cell, explicit ARIA table roles; action form moves focus to its first field on open and cancels on Escape | Owner ledger cramped at 390px; keyboard users had to tab through the page to reach the inline form |
| `src/index.css` | `.owner-tbl` rules: cell padding/wrapping everywhere; at ≤640px rows stack as labelled blocks, header kept for assistive tech, empty action cells hidden | Rendered and measured at 390px (browser L1–L5) |
| `backend/services/dealerHealthScoreService.js`, `backend/controllers/dealerHealthScoreController.js` | Unknown dealer → `404 DEALER_NOT_FOUND` instead of 500 | Route-exception fix #1 |
| `backend/controllers/featureFlagController.js` | `batch/evaluate` validates `keys` (non-empty array ≤100 strings) → `400 INVALID_KEYS` | Route-exception fix #2 (`keys is not iterable` 500) |
## Tests and tooling added
`backend/tests/regression/phase16cRouteExceptionFixes.test.js` (11) · `src/__tests__/pages/AdminOwnerManagement.responsive.test.jsx` (4) · `runbooks/phase16c-20261027/pg-tests/migration_set_certification.sh` (99 checks) · `…/http/e2e_phase16c_dealer_staff_separation.cjs` (40) · `…/http/e2e_phase16c_mfa_race_stepup.cjs` (8) · `…/http/browser_16c_real_stack.cjs` (35) · harness copies under `runbooks/phase16c-20261027/harness/`.
## Documents
`KAYAD_PHASE16C_*` (README/decision, source & claims verification, separation proof, activation operation sequence, migration & rollback certification, dealer staging procedure, MFA & second-owner readiness, route-exception report + CSV, test evidence, staging approval checklist, integrity).
## Deliberately NOT changed (with reason)
* The 5B owner-governance candidate (no defect proven; 97/97 and 15/15).
* M1 candidate (47/47). The email-case gap is handled as a pre-flight query, not a function change.
* Feature-flag, queue-metrics, marketplace-health and dealer-health-ranking services: they call model statics that do not exist on the facade models and read tables absent from the repo migrations; a correct fix is a feature port, not an import — see the route-exception report.
* Pre-existing lint findings in `backend/db/index.js` and `backend/models/_base.js` (5 errors: `no-control-regex` ×3, duplicate keys `FeatureFlag`/`DealerSubscription` with identical values) — harmless, not 16C scope; disclosed in the test evidence.
