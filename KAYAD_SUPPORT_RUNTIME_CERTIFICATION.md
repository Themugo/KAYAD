# Support — Runtime Certification

Verdict: **PARTIAL.** Source, automated, local-PostgreSQL and mocked-browser checks PASS. Staging/production checks are **NOT RUN / ENVIRONMENT-BLOCKED**.

| Check | Status | Evidence |
|---|---|---|
| Static (tsc, build, validators, OpenAPI governance) | PASS | see Test Matrix |
| Automated backend/frontend suites | PASS | integrated tree: 1013 backend Jest (+16 vitest, 1 node), 564 frontend (1 skipped) — see Test Matrix |
| Migration on migration-built PG16, twice | PASS | `support_hardening_proof_output.txt` |
| DB-level negative proofs (P1–P21) | PASS | same |
| Real-browser journeys, mocked API | PASS 56/56 support (+66 inspection, +71 automotive) | `playwright_support_journey_output.txt` |
| Supabase-hosted privileges (anon/authenticated EXECUTE & column SELECT) | **BLOCKED** | run on staging after `supabase db push`: `select has_function_privilege('authenticated','kayad_support_append_message(uuid,uuid,text,text,boolean,integer)','execute');` → expect `f`; `select has_column_privilege('authenticated','support_tickets','messages','select');` → expect `f` |
| Existing production rows after migration | **NOT RUN** | run `select count(*) from support_tickets where ticket_number is null` (expect 0) and review the `resolution_notes → satisfaction_comment` move (`where satisfaction_rating is not null`) before deploy; the migration copies the moved comment to `legacy_resolution_notes` and writes one audit row; no table CHECKs are added, so old rows cannot block it or later updates. Local legacy-data proof: `migration_legacy_data_proof_output.txt` |
| Email/in-app delivery for case events | **NOT RUN** | needs Brevo + a staging user; verify one `support-created:<id>` delivery and that a retry creates none |
| Live staff round-trip against real Supabase | **NOT RUN** | create a `technical_support` user, confirm queue loads, a `marketing` user gets 403 |
| Load / concurrent appends | **NOT RUN** | — |

Deployment note: apply the migration **before** the new backend (the backend calls the new RPCs; the old backend's `createTicket` was already failing on migration-built databases). Set `SUPPORT_SLA_*` only if operations can staff the promise.

## Environment distinction (integration gate)
| Evidence | Local container | Supabase staging | Deployed |
|---|---|---|---|
| Migration on legacy data, ×2, grants, P1–P21 | **yes** (PG16 + role shim) | not run | not run |
| Jest / Vitest / tsc / build / validators | **yes** | n/a | n/a |
| Browser journeys | **yes, mocked HTTP** | not run | not run |
| RLS on hosted Supabase, e-mail delivery, live round-trip, load | no | **not run** | **not run** |
