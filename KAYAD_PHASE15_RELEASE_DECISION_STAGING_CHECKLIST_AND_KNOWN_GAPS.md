# Phase 15 - Final Decision, Staging Checklist and Known Gaps

## DECISION: A - SUPER ADMIN OPERATIONAL CONVERGENCE COMPLETE LOCALLY; STAGING REQUIRED.
No claim of production readiness, live payment certification or verified shortcode routing is made.

## Results (fresh, final tree; logs in evidence/phase15-20261026/)
- tsc --noEmit: 0 errors. vite build: success.
- Frontend Vitest: 116 files, 950 passed / 1 skipped. Backend Jest: 171 suites, 3008 passed. Backend Vitest and node:test: pass.
- Validators: 136 of 143 passed on the first sweep; the 5 failures other than the two credential validators were caused by my own use of HTTP 501 (the "no 501 placeholders" gate). Changed to 503, re-run: production-backend, release, v14:holistic, v14:runtime-preflight, v14:release-candidate, repository-naming all pass. Gates were not weakened.
- STILL FAILING, NOT RELABELLED: `validate:communications:providers` (email/sms provider credentials not configured) and `validate:live-runtime` (SUPABASE_URL / service key missing). Both need real credentials; identical on 14.9.
- DB E2Es: 73 + 47 + 50 + 73 + 60 passing.
- Browser (real bundle, mocked API; desktop 1280, tablet 768, mobile 390): Transactions and Users render the honest labels, no full phone numbers, no page-level horizontal scroll, no serious/critical axe violations, no page errors. Screenshots in evidence/.
- Role probe: 786 routes x 16 roles (matrix: KAYAD_PHASE15_SUPER_ADMIN_ROUTE_PERMISSION_MATRIX.csv).

## Known gaps / owner decisions (deliberately not changed)
1. Ledger, dashboard and communications-admin read access is open to all staff roles via `adminOnly`; narrowing is a policy decision.
2. Per-seller commission/waiver/discount settings have no database columns; the save now fails honestly (503). Schema/policy decision needed.
3. Business-name re-verification policy is undefined.
4. Payment blockers 1-5 above.
5. Role probe: 239 of the 786 probed routes returned 500 for at least one role. Inspection shows these come from tables absent in the minimal local schema (e.g. organizations, error_budgets, feature_flags) or placeholder ids, after authorization had run. Not authorization failures, but should be re-probed against a fully migrated staging database. Two `/api/admin/public/*` config routes are intentionally public.
6. `protectAccount` shields only platform-owner accounts; the rank rule was added only to ban. Other admin mutations on staff accounts keep their existing rules.
7. Browser evidence uses a mocked API; the reserved-purchase rule and generic "across East Africa" marketing copy are unchanged.
8. The health indicator reports only alert/queue counters; provider telemetry is not measured and the UI says so.

## Staging checklist
- [ ] Apply all migrations to staging; re-run role probe and the five E2Es there.
- [ ] Verify shortcode destination with the owner; run a sandbox STK + callback incl. amount-mismatch and late-success cases.
- [ ] Certify B2C payout + reconciliation in sandbox.
- [ ] Run validate:communications:providers and validate:live-runtime with real credentials.
- [ ] Concurrent auction setup publish vs bids; customer view of published terms.
- [ ] Decide items 1, 2, 3 above.
