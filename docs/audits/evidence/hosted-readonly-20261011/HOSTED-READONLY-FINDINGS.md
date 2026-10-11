# Production (KAYAD EA, `ubvgixwhfybbyjuvxboj`) — read-only catalog findings, 2026-10-11

**Scope and method.** The project owner connected the Supabase connector at 14:42 EAT. Everything below came from
read-only catalog queries (`pg_catalog`, `information_schema`, `supabase_migrations.schema_migrations` metadata), plus
`list_migrations` and `get_advisors(security)`. No row data was read from any application table. No DDL, DML, migration
or configuration change was made. Status label for every item here: **SOURCE-VERIFIED (production catalog)**. This is
production *inspection*. It is not staging verification, and nothing here was exercised at runtime.

## 1. Platform
| Item | Production value |
|---|---|
| PostgreSQL | 17.6 |
| `public` tables | 209 |
| `public` functions (non-extension) | 93 |
| Tables with RLS disabled | **0** |
| `supabase_realtime` publication | bids, cars, conversations, messages, notifications |

## 2. Migration history vs repository
| Set | Count |
|---|---|
| Production `schema_migrations` versions | 135 (last: `20260922060457`) |
| Repository migration versions | 175 |
| Versions in both | 97 |
| Repository-only versions | 78 (`repo-only-versions.txt`) |
| — dated on or before the last production version | 26. 21 were applied in production under a different version with the same name; the repository keeps both versions, one as a documented no-op. 5 are not present by name: `20260908070000`, `20260908080000`, `20260908113000`, `20260920203000`, `20260920220000`. Their effects may have been captured by the hosted `reconcile_*` / `*_effect_capture_*` migrations; this is unverified |
| — dated after the last production version | **52**: every migration since 2026-09-22, including chat idempotency, the chat outbox, `users.deactivated_at`, the auction registration/security tables, profiles/role repair and this phase's migrations |
| Production-only versions | 38 (`production-only-versions.txt`): all 2026-09-19 → 2026-09-22 hosted migrations. **No repository file contains their SQL** |

Statement sizes and MD5s for the 45 hosted migrations from 2026-09-19 onward are in `production-migration-statement-digests.tsv`
(version, name, byte length, md5 only; SQL text deliberately not exported here, because hosted SQL can contain seeded configuration and should
be exported by the owner with `supabase migration fetch` / `db dump --schema-only` and reviewed before it is committed). The repository's three
`20260922045554/045606/045609` files are documented no-op markers; the hosted statements under those versions are 359 / 3,750 / 634 bytes.

**Consequence.** `supabase db push` against production would be refused, because remote versions are missing locally. If it were forced
after `migration repair`, it would also re-run the 5 unmatched early migrations and the canonical copies of the
renamed ones. Production must not be brought forward by `db push`. The plan is in `11-MIGRATION-AND-ROLLBACK-REVIEW` §Hosted.

## 3. Schema state relevant to this phase
| Object | Production | Code needs |
|---|---|---|
| `chat_message_outbox`, `chat_message_idempotency` | **absent** | messaging send path (current backend) |
| `users.deactivated_at` | **absent** | auth/session checks (current backend) |
| `profiles.updated_at` | absent | migration 20261011121000 adds it |
| `escrows.warning_sent` | absent | escrow cron (FIN-1: the cron stays dormant either way) |
| `notifications` read flag | `read` (no `is_read`) | matches the SCH-NOTIF-1 fix |
| `payments.checkout_request_id` | present | security-payment store (FIN-SCH-1 fix) |
| `transactions` | exists: id, user_id, car_id, payment_id, escrow_id, type, status, amount, currency, metadata, created_at, updated_at. **No `checkout_request_id`, `reference`, `description`** | the foundation callback code filters `transactions.checkout_request_id` → error 42703 on every lookup |
| auction registration/security tables | absent | Auction 360 registration flow |

Fingerprint diff (table column sets and function bodies, md5) between a fresh repository replay and production:
- 24 tables exist only in production.
- 16 tables exist only in the repository.
- 18 tables have different column sets.
- 31 functions have different bodies; 26 functions exist only in production and 39 only in the repository.

The table lists are in `08-SUPABASE-SCHEMA-RECONCILIATION` §Hosted.

## 4. Privileges and RLS
- Client DML grants (anon/authenticated SELECT/INSERT/UPDATE/DELETE) on `public` tables: **only `authenticated: SELECT` on
  `vehicle_valuations`**. That table has RLS with the ownership policy `vehicle_valuations_select_own`.
- The 14 `authenticated USING (true)` policies (RLS-1) **are present in production**. They are not reachable today because
  `authenticated` holds no SELECT grant on those tables. If such a grant is ever added, they become exploitable, so the fix still ships.
- anon/authenticated hold **TRUNCATE (plus REFERENCES/TRIGGER/MAINTAIN) on 72 tables** (RLS-3). This comes from the `postgres`
  default ACL. TRUNCATE is not subject to RLS. The migration 20261011120000 revokes them.
- Security advisor: one lint family only, `rls_enabled_no_policy` (INFO) on 127 tables. This is intended deny-all for
  client roles, because the backend uses `service_role`. There were **no ERROR or WARN security lints**.

## 5. Fingerprint diff lists (repository replay `k5_crawl` vs production)
- **Production-only tables (24):** admin_action_requests, admin_control_registry, admin_control_state, auction_integrity_flags,
  auction_risk_profiles, bid_logs, contacts, conversion_funnels, dealer_analytics, dealer_health_scores, escrow_anomalies,
  escrow_provider_integrations, escrow_risk_scores, inspection_commercial_config, inspection_provider_availability,
  inspection_provider_scorecards, inspection_report_downloads, job_failures, market_data, marketplace_health,
  notification_audit, ntsa_verification_requests, sms_bidders, transactions.
- **Repository-only tables (16):** the `auction_*` registration/security tables, chat_message_idempotency, chat_message_outbox,
  hero_placements, hero_slides, provider_service_capabilities, purchase_outcomes, report_corrections, report_versions.
- **Different column sets (18):** ad_slots, communication_deliveries, dealers, escrow_audits, idempotency_audit_logs,
  inspection_packages, inspection_providers, inspection_reports, inspection_staff, inspector_applications, platform_config,
  profiles, provider_credentials, refresh_tokens, roadside_service_requests, support_tickets, users, vehicle_service_offerings.
- **Functions:** 31 differing bodies, 26 production-only, 39 repository-only.

Note on SCH-101 (checked with `to_regclass`, read-only): of the 101 code-referenced tables that no repository migration creates,
**only 15 exist in production**: auction_integrity_flags, auction_risk_profiles, bid_logs, contacts, conversion_funnels,
dealer_analytics, dealer_health_scores, escrow_anomalies, escrow_risk_scores, job_failures, market_data, marketplace_health,
ntsa_verification_requests, sms_bidders, transactions. Their DDL lives only in hosted-only migrations; export it, do not rewrite it.
**The other 86 exist nowhere**, including the AI workspace, VX page builder, platform objects, workflows, feature flags/config,
disputes v1 and fraud tables. Routes that read them fail in production today. Those subsystems need a product decision (retire or
design properly); they are not a schema reconciliation item.

## 6. API traffic shape (edge logs, last 24 h, aggregate counts only — no request bodies, IPs or identities read)
- PostgREST requests carrying a `checkout_request_id` filter: 40, all on `/rest/v1/payments` (hourly, 2026-10-10 13:00 → 2026-10-11 12:00 UTC).
- `/rest/v1/transactions`: 30 requests, **none** filtered by `checkout_request_id`.
- `/rest/v1/chat_message_outbox`, `chat_message_idempotency`, `auction_registrations`, `auction_security_holds`: **0**.
- Reading: the backend deployed against production **predates** the outbox, Auction 360 registration and security-payment code. That is consistent with
  §2: the production schema stops at 2026-09-22. So the foundation's `transactions.checkout_request_id` lookup is not running in production
  today; it *would* fail on every callback (42703) if the foundation backend were deployed without this phase's store. No M-Pesa
  callback reached a `checkout_request_id` lookup in the window, so callback behaviour itself is NOT RUN here.
