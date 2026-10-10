# KAYAD Phase 22 Reconciliation

Target: canonical `Themugo/KAYAD` main + live Supabase `ubvgixwhfybbyjuvxboj`.

Live Phase 22 work has been applied and tested. GitHub integration currently permits repository reads but rejects writes with HTTP 403 (`Resource not accessible by integration`), so this bundle is the canonical-repo application package rather than a claim that GitHub main was changed.

## Live fixes discovered during reconciliation

1. Provider registration RPC had an ambiguous `id` reference; fixed by qualifying `users.id` and `inspection_providers.id`.
2. Inspection settlement payout referenced nonexistent ledger account `1200`; corrected to canonical cash account `1000`.
3. Inspection refund flow referenced nonexistent ledger account `1200`; corrected to `1000`.
4. Review lifecycle rejected `closed` bookings while settlement requires `closed`; review now accepts `completed`, `closed`, or `cancelled` when fully paid.
5. Locked inspection report evidence is immutable; corrections require a new report version.
6. Provider suspension is routed through `inspections.manage` and immutable audit logging.
7. Dispute resolution requires `disputes.manage` approval for the high-risk path.
8. Service jobs now have a controlled lifecycle and service-job dispute/evidence model.
9. Provider risk flags and scorecard consequences are linked to upheld disputes.
10. Vehicle closure (`sold`/`hidden`) revokes report-download access.

## End-to-end tests passed

- PROVIDER_REGISTRATION_PASS
- PROVIDER_APPROVAL_BOOKING_PAYMENT_REPORT_PASS
- PHASE22_DOWNSTREAM_REVIEW_SETTLEMENT_DISPUTE_REFUND_RISK_SUSPENSION_CLOSURE_PASS
- PHASE22_SERVICE_JOB_DISPUTE_PASS
- PHASE22_REPORT_REVIEW_IMMUTABILITY_PASS
- PHASE22_REPORT_ACCESS_FRESHNESS_PASS
- PHASE22_DISPUTE_REFUND_E2E_PASS
- PHASE22_SCORECARD_RISK_PASS
- PHASE22_SERVICE_PROVIDER_TESTS_PASS

All test data was created inside transactions and rolled back.

## Canonical application order

1. Add the Phase 22 migration to `supabase/migrations/`.
2. Add/update the Phase 22 validation script.
3. Wire backend inspection/provider/service controllers to the canonical RPCs rather than direct privileged table mutations.
4. Add service-job dispute/admin actions to the existing command/control centre.
5. Run Windows Node 22.22.2 validation gates: typecheck, eslint, tests, build, historical validators, and production release validator.
6. Run browser E2E against the deployed application.
7. Only then merge/push and produce the Phase 22 release ZIP/SHA.

## Important

Do not mass-add RLS policies merely to clear Supabase advisor warnings. The privileged Phase 22 tables/RPCs are intentionally service-role-only.
