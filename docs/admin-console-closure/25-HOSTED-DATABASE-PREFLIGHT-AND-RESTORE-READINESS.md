# 25 — Hosted database preflight and restore readiness (READ-ONLY)

> **Updated 2026-11-24 (final closure):** the reconciliation table, the six-object check, the disposable restore rehearsal and the extended runbook are in doc 30. Where this document disagrees with doc 30, doc 30 wins (for example `transition_escrow` is not the hosted function name; `kayad_transition_escrow_atomic` exists).

Project `ubvgixwhfybbyjuvxboj` ("KAYARD KE", Postgres 17.6, ACTIVE_HEALTHY). Only `SELECT` statements and `list_projects` were used on 2026-11-24. **No migration, DDL, write, reset or branch operation was performed.**

## Observations
* Hosted migration ledger: 135 rows, `20260710043200` … `20260922060457`. The repository holds 217 migration files, 94 of them with a later version. Because earlier work applied changes outside the ledger naming, **ledger parity is NOT VERIFIED**; the exact delta between repository and hosted schema is *not established* by this check. This is itself a release blocker for any migration step: the owner must reconcile (e.g. a schema diff) before authorising anything.
* Object facts checked today: `dealer_suspension_requests` absent; `dealer_temporary_duties`/`dealer_team_temporary_grants` absent; `reports`, `feedback` absent; `private_seller_capabilities` absent; `market_data` present; `users.granted_permissions` present; `dealer_suspension_requests.request_type` absent (table absent); functions `transition_escrow` and `kayad_reconciliation_issue_rows` absent.

## Outstanding migrations relevant to this work
| Migration | Creates / changes | Depends on | Hosted today | Data transformation / loss risk | Rollback / forward repair | Verification after apply | Interaction with this work |
|---|---|---|---|---|---|---|---|
| `20261123210000_lead_create_find_before_insert` | replaces `kayad_create_lead_atomic` | existing leads tables | function exists (body not compared) | none | re-apply previous body (kept in migration history) | lead creation journey | none |
| `20261123220000_dealer_temporary_duties` | `dealer_team_temporary_grants`; re-creates `dealer_employment_events.event_type` CHECK | `dealer_teams`, `dealer_employment_events` | table absent | CHECK re-add can fail if hosted rows contain other `event_type` values — **check `SELECT DISTINCT event_type` first** | drop new table; restore CHECK | journey 25 | employees/dealer staff; reinstatement does not touch it |
| `20261124100000_admin_customer_care_and_market_tables` | `market_data`, `ntsa_verification_requests`, `reports`, `feedback`, `announcements` (`IF NOT EXISTS`) | none | `market_data`, `ntsa_verification_requests` present; the others absent | none | drop new tables (empty at creation) | journey 27 | Reports/Feedback/Announcements pages need it |
| `20261124120000_dealer_suspension_requests` | table, partial unique index (one pending per verification), constraints, RLS | `dealer_verifications`, `users` | absent | none | drop table (no data yet) | journey 30 | **Required for OD-2/OD-3**; without it the request pages show an honest "not provisioned" state |
| `20261124130000_dealer_reinstatement_requests` (NEW) | `request_type`, `related_request_id`, widened reason categories, index, schema reload | must run **after** `…120000` | table absent so not applicable yet | additive; default `suspension` backfills existing rows | drop the two columns/index; restore the narrower CHECK | journeys 30, 33 | **Required for OD-2**; applying it before `…120000` fails (documented ordering) |
| `20261025100000_private_seller_capability` (optional) | `private_seller_capabilities` | `users` | absent | none | drop table | journey 24 | Purity's account works without it (doc 21 OD-4); applying it would not change her status |

RLS/grants: new tables follow the existing pattern (RLS enabled, `REVOKE ALL FROM anon, authenticated`; service role only). PostgREST needs `NOTIFY pgrst, 'reload schema'` after apply (included).

## Backup and restore readiness
No restore rehearsal exists. **A backup is not relied on until a restore has been rehearsed**; therefore migration execution is **BLOCKED** until (a) the owner authorises, (b) a restore is rehearsed, (c) the ledger/schema delta above is reconciled. Disposable-DB application of all 217 files succeeds (journey harness: "migrations applied: 217/217").
