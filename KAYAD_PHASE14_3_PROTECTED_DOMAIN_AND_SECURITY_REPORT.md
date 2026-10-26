# KAYAD Phase 14.3 — Protected-Domain Diff and Security Regression

## Diff against the Phase 14.2 foundation (`diff -rq`, excluding `node_modules`, `dist`, `logs`, `uploads`)
Changed source: `src/pages/dealer/DealerAuctionOperations.jsx` (one line: the list-load result is accepted only when it is an array), `src/pages/dealer/DealerOnboarding.jsx` (33 text-colour values and one flex-wrap property; no logic). Added: two test files, a runbook, evidence.
Unchanged: all of `backend/`, `supabase/`, `src/App.tsx`, services, package files and lockfiles.

## Diff against Phase 14.1 (cumulative)
Adds `DealerDashboard.tsx`, the two files above, source-check script, tests, runbooks, evidence, documents. No payments, M-Pesa, escrow, ledger, bidding, settlement, refund, payout, reconciliation or Super Admin authentication file changed.
`DealerAuctionOperations.jsx` and `DealerOnboarding.jsx` are dealer-facing screens near protected actions (auction fulfilment release/re-award; bank details). Only list-parsing robustness and presentation colours changed; no call, payload, validation or handler was altered.

## Security regression
The full backend Jest suite, run on the unchanged backend, covers the buyer/private-seller lifecycle, Seller Studio authorization, listing visibility/ownership, saved-search safety, dealer isolation, auction-registration and public vehicle response allowlists (VIN/seller phone), cache invalidation, authentication and CSRF (Phases 13D–13K suites). Result: see the validation matrix. No new authorization tests were added in 14.3; direct-API denial for non-dealers is covered only by the existing backend tests (all dealer-platform routes use `protect + dealerBusinessOnly`; team routes use `dealerOrgAccess`).
Browser: a signed-in buyer opening `/?nav=dealer-dashboard`, `/dealer/onboarding`, `/dealer/auction-setup` or `/dealer/auction-operations` ends on `/` at all three widths (mocked API), confirming the route guards redirect. The page shown at `/` crashed under my generic mock; that is a limit of the mock data, not an assessed defect.
