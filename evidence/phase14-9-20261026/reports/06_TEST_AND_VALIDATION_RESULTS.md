# Fresh results on the final tree (all local)
| Check | Result | Baseline 14.8 |
|---|---|---|
| Backend Jest | 170 suites / 2,985 tests pass | 169 / 2,972 |
| Backend Vitest | 6 files / 36 pass | 36 |
| node:test (response-lifecycle) | 1 pass | 1 |
| Frontend Vitest | 115 files / 947 pass, 1 skipped | 943 + 1 skipped |
| tsc --noEmit | 0 errors | 0 |
| vite build | exit 0 | 0 |
| eslint src | 0 errors, 1,565 warnings | same |
| eslint . | 2,286 errors | 2,286 (baseline, not introduced) |
| validate:* | 141/143; failing: communications:providers, live-runtime (need external providers) | 141/143 |
| Naming/path validator | see integrity log | 10/10 |
| DB E2E account security | 47/47 (before: 34/47 on 14.8) | new |
| DB E2E dealer payments | 73/73 (before: 45/73) | new |
| DB E2E dealer lifecycle (carried) | 50/50 | 50/50 |
| DB E2E inventory/team (carried) | 60/60 | 60/60 |
| Browser (3 viewports, dealer workflows) | no page errors, console errors or failed non-API responses | 48 views clean |
Existing tests changed (contract changes, assertions not weakened): DealerWorkflowWrites, dealerProfileAndTeamAuthorization (now also prove step-up refusals write nothing), stage5f5StaffGovernance (mocks for session revocation).
A regression of the C.1 validator (admin user delete must invalidate listing caches) was caught and fixed during this phase.
Not exercised: Supabase-specific features (Auth, Storage, RLS via real PostgREST JWTs beyond the shim), Cloudinary, email/SMS providers, real Daraja. This is NOT a full Supabase certification.
