# Support — Runtime Certification

Verdict: **PARTIAL.** Source, automated, local-PostgreSQL and mocked-browser checks PASS. Staging/production checks are **NOT RUN / ENVIRONMENT-BLOCKED**.

| Check | Status | Evidence |
|---|---|---|
| Static (tsc, build, validators, OpenAPI governance) | PASS | see Test Matrix |
| Automated backend/frontend suites | PASS | 978 backend, 520 frontend |
| Migration on migration-built PG16, twice | PASS | `support_hardening_proof_output.txt` |
| DB-level negative proofs (P1–P21) | PASS | same |
| Real-browser journeys, mocked API | PASS 51/51 | `playwright_support_journey_output.txt` |
| Supabase-hosted privileges (anon/authenticated EXECUTE & column SELECT) | **BLOCKED** | run on staging after `supabase db push`: `select has_function_privilege('authenticated','kayad_support_append_message(uuid,uuid,text,text,boolean,integer)','execute');` → expect `f`; `select has_column_privilege('authenticated','support_tickets','messages','select');` → expect `f` |
| Existing production rows after migration | **NOT RUN** | run `select count(*) from support_tickets where ticket_number is null` (expect 0) and review the `resolution_notes → satisfaction_comment` move (`where satisfaction_rating is not null`) before deploy; constraints are NOT VALID so old rows cannot block the migration |
| Email/in-app delivery for case events | **NOT RUN** | needs Brevo + a staging user; verify one `support-created:<id>` delivery and that a retry creates none |
| Live staff round-trip against real Supabase | **NOT RUN** | create a `technical_support` user, confirm queue loads, a `marketing` user gets 403 |
| Load / concurrent appends | **NOT RUN** | — |

Deployment note: apply the migration **before** the new backend (the backend calls the new RPCs; the old backend's `createTicket` was already failing on migration-built databases). Set `SUPPORT_SLA_*` only if operations can staff the promise.
