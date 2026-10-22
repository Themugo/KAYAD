# Support — Test Matrix
| Layer | Suite | Result |
|---|---|---|
| Backend Jest | `tests/support/supportCase.test.js` — projection leak guards, ownership/404 parity, reference ownership, idempotent create + notification dedupe, actor-kind forcing, internal-note silence, validation, rating bounds, staff update validation, transition table, DB-error mapping, `requireSupportStaff` for 13 roles | 41/41 |
| Backend full | Jest 63 suites / 978 · Vitest 16 · node:test 1 | all pass (baseline 62 / 937) |
| SQL behaviour | `evidence/support/support_hardening_proof.sql` P1–P21 on migration-built PG16 (+ migration applied twice) | all expected outcomes |
| Frontend unit | `supportView.test.tsx` (8), `adminSupportWorkspace.test.tsx` (5) + existing FAQ claims | 20/20 |
| Frontend full | vitest 68 files / 520 pass / 1 skipped / 0 fail (baseline 505 pass / **3 fail**) | pass |
| Types / build | `tsc --noEmit` 0 · `vite build` 0 | pass |
| Browser (mocked HTTP) | `e2e/support-journey/support_journey.cjs`, desktop 1440 + mobile 375, guest/customer/staff/marketing | 51/51 |
| Validators | 3 support validators rewritten (12/12, PASS, 11/11); `validate-release`, `validate-wave3` PASS (OpenAPI 0 undocumented) | 10 failing = same 10 as baseline |
| Revert proof | remove internal-note filter → 1 failing test; restore → 41/41 | recorded |

## Negative cases covered
Other customer's case (404) · forged `isInternal` · forged role `admin`/`dealer` · client priority/status/assignee/SLA · attachments · bad category/reference/key · rating 0/6/2.5/null · double rating · rating before resolve · resolve without note · illegal transition · stale version · marketing/hr/etc. staff · closed reply · expired reopen window · direct PostgREST EXECUTE/SELECT/INSERT/UPDATE · duplicate submit/retry.

## Not covered by automation
Concurrent appends under real PostgREST load (row lock `FOR UPDATE` proven structurally, not under contention) · real email/in-app delivery · Supabase-hosted grants/RLS (BLOCKED, see Runtime Certification).
