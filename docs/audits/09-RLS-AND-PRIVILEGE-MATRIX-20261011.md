# RLS and least-privilege matrix (Phase C)

**Where this was verified:** disposable local PostgreSQL 16, full replay of `supabase/migrations` **with Supabase's platform default privileges reproduced** (`SUPABASE_DEFAULT_PRIVILEGES=1`: `anon`, `authenticated`, `service_role` receive ALL on every table/sequence/function created by `postgres` in `public`). Client roles were exercised directly in PostgreSQL with `SET LOCAL ROLE` + `request.jwt.claims` — the mechanism PostgREST uses. **Hosted Supabase was not inspected (no authorised connection — BLOCKED); GoTrue and PostgREST themselves were not exercised.**

Important correction to earlier sweeps: the previous RLS checks ran on a replay **without** the hosted default privileges, where tables that migrations never revoke simply had no client grants. Under hosted defaults, 139 of 201 tables are reachable by `anon` at the privilege level, so RLS policies (and explicit `REVOKE`s) are the only barrier. All conclusions below use the hosted-like replay.

## 1. Role model (actual application)
| Layer | Role | How it is obtained | What protects data |
|---|---|---|---|
| Database | `anon` | the project's public anon/publishable key against `https://<ref>.supabase.co/rest/v1` (PostgREST) or Realtime | RLS + explicit revokes |
| Database | `authenticated` | a Supabase-Auth (GoTrue) JWT. **The application never issues these** (custom auth); they exist only if GoTrue sign-up is enabled or the JWT secret leaks | RLS (`auth.uid()` = GoTrue user id, which does **not** match KAYAD user ids unless forged) |
| Database | `service_role` | backend only (`SUPABASE_SERVICE_ROLE_KEY`); bypasses RLS | the Express API authorisation below |
| API | anonymous | no session cookie | `protect()` → 401 |
| API | `user` (buyer), `individual_seller`, `dealer` | session cookie (custom JWT) | `protect()` + ownership/participant checks in controllers and `kayad_*` functions |
| API | staff: `technical_support`, `moderator`, `accounts`, `marketing`, `escrow_officer`, `hr`, `ad_manager`, `ghost_checker` | session | `allowRoles(...)` per route; **not** admin by default |
| API | `admin`, `superadmin` (+ `webhoist` owner bypass) | session | `allowRoles("admin","superadmin")` |

## 2. Application-level authorisation matrix (executed through the real API)
| Resource / action | anonymous | user / buyer | seller / dealer | support & other staff | admin / superadmin | Evidence |
|---|---|---|---|---|---|---|
| Read a conversation / messages | 401 | participant only (else 403/404) | participant only | 403/404 unless participant | admin routes | `m3`, `m5-authz-sweep` |
| Chat attachment bytes | 401 | participant of the referencing chat | same | 404 | allowed | `m6` |
| Generic `GET /api/upload/:id` of private folders | 401 | owner | owner | 403 | allowed | `m6` #10 |
| Socket private rooms | anonymous socket, no private rooms | participant | participant | no | `admins` room for staff roles listed in server.js | `m7` |
| Edit/delete a listing | 401 | 403 | owner only | 403 | allowed | `m5-ownership` |
| Config statistics / raw config / flag inventory | 401 | 403 | 403 | 403 | allowed | `m9` |
| Governance endpoints | 401 | 403 | 403 | role-gated | allowed | `m5-authz-sweep` |
| Payment callbacks | provider IP allow-list + idempotency (no session) | — | — | — | — | `m5-financial-webhooks`, `m13` |

## 3. Database-level matrix (hosted-like replay, after migrations 20261011120000/121000)
Legend — policy classes: `deny` (`false`), `own/participant` (`auth.uid()` comparison), `admin` (`is_admin()`), `public-content` (status/visibility gate), `TRUE` (unconditional). Letters: S select, I insert, U update, D delete, * all. "no policy → deny" means RLS is on and no policy applies to that role.

Generated from `evidence/certification-20261011/schema/repo-inventory-supabase-defaults.json` (catalog of the hosted-like replay).

| Table | RLS | `anon` grants (hosted default) | policies reaching `anon` | policies reaching `authenticated` | dynamic test |
|---|---|---|---|---|---|
| **Identity & accounts** | | | | | |
| `users` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `user_auth` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `profiles` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `refresh_tokens` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `otp_challenges` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | S:own/participant | m10 ✔ |
| `communication_preferences` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | — (no policy → deny) | S:own/participant, U:own/participant |  |
| **Dealers / sellers** | | | | | |
| `dealers` | on | ALL | S:own/participant | S:own/participant |  |
| `dealer_teams` | on | ALL | D:own/participant, I:own/participant, S:own/participant, U:own/participant | D:own/participant, I:own/participant, S:own/participant, U:own/participant |  |
| `dealer_verifications` | on | ALL | I:own/participant, S:own/participant, U:own/participant | I:own/participant, S:own/participant, U:own/participant |  |
| `dealer_subscriptions` | on | ALL | S:own/participant | S:own/participant |  |
| `dealer_payouts` | on | ALL | *:deny, S:own/participant | *:deny, S:own/participant | m10 ✔ |
| `loan_applications` | on | ALL | *:deny, S:own/participant | *:deny, S:own/participant |  |
| `marketing_campaigns` | on | ALL | *:deny, S:own/participant | *:deny, S:own/participant |  |
| **Vehicles, listings, ownership** | | | | | |
| `cars` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `favorites` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `reviews` | on | ALL | — (no policy → deny) | D:own/participant, I:own/participant, S:own/participant, U:own/participant |  |
| `vehicle_valuations` | on | none (revoked) | — (no policy → deny) | S:own/participant |  |
| `vehicle_identities` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `owner_profiles` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `vehicle_passports` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `hero_placements` | on | ALL | *:admin, S:own/participant or admin, S:public-content | *:admin, S:own/participant or admin, S:public-content |  |
| `ad_slots` | on | ALL | S:public-content | *:admin, S:public-content |  |
| **Documents & inspections** | | | | | |
| `vehicle_inspections` | on | ALL | — (no policy → deny) | S:own/participant or admin, U:own/participant or admin |  |
| `inspection_bookings` | on | ALL | — (no policy → deny) | I:own/participant or admin, S:own/participant or admin, U:own/participant or admin |  |
| `inspection_reports` | on | ALL | — (no policy → deny) | I:own/participant or admin, S:own/participant or admin, U:own/participant or admin |  |
| `inspection_providers` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `inspection_staff` | on | ALL | — (no policy → deny) | S:own/participant or admin |  |
| `provider_credentials` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `inspection_refunds` | on | none (revoked) | — (no policy → deny) | I:own/participant or admin, S:own/participant or admin |  |
| `inspection_disputes` | on | ALL | — (no policy → deny) | I:own/participant or admin, S:own/participant or admin |  |
| `inspection_settlements` | on | none (revoked) | — (no policy → deny) | S:own/participant or admin |  |
| `inspection_transactions` | on | none (revoked) | — (no policy → deny) | S:own/participant or admin |  |
| **Messaging & notifications** | | | | | |
| `chats` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `messages` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `conversations` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `chat_message_idempotency` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `chat_message_outbox` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `notifications` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `communication_deliveries` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | S:own/participant |  |
| `support_tickets` | on | none (revoked) | — (no policy → deny) | S:own/participant | m10 ✔ |
| **Bids & auctions** | | | | | |
| `bids` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `auction_setups` | on | ALL | I:own/participant, S:own/participant or admin, U:own/participant or admin | I:own/participant, S:own/participant or admin, U:own/participant or admin |  |
| `auction_registrations` | on | ALL | I:deny, S:own/participant or admin | I:deny, S:own/participant or admin | m10 ✔ |
| `auction_registration_events` | on | ALL | S:own/participant or admin | S:own/participant or admin |  |
| `auction_security_holds` | on | ALL | *:deny, S:own/participant or admin | *:deny, S:own/participant or admin | m10 ✔ |
| `auction_outcomes` | on | ALL | S:own/participant or admin | S:own/participant or admin |  |
| `auction_fulfilment_events` | on | none (revoked) | S:own/participant or admin | S:own/participant or admin |  |
| `auction_platform_policies` | on | ALL | *:own/participant or admin, S:own/participant or admin | *:own/participant or admin, S:own/participant or admin |  |
| `purchase_outcomes` | on | ALL | — (no policy → deny) | S:own/participant or admin |  |
| **Payments, ledger, escrow, payouts** | | | | | |
| `payments` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `payment_attempts` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `mpesa_transactions` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `webhook_events` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `ledger_entries` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `escrows` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `escrow_accounts` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `escrow_audits` | on | none (revoked) | *:deny | *:deny |  |
| `refunds` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `idempotency_keys` | on | ALL | — (no policy → deny) | — (no policy → deny) |  |
| `idempotency_audit_logs` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `financial_workflow_events` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| `reconciliation_reports` | on | none (revoked) | — (no policy → deny) | — (no policy → deny) |  |
| **Configuration & operations** | | | | | |
| `country_configurations` | on | ALL | *:deny | *:deny |  |
| `country_payment_providers` | on | ALL | *:deny | *:deny |  |
| `country_tax_configurations` | on | ALL | *:deny | *:deny |  |
| `cross_border_configurations` | on | ALL | *:deny | *:deny |  |
| `currency_exchange_rates` | on | ALL | *:deny | *:deny |  |
| `localization_strings` | on | ALL | *:deny | *:deny |  |
| `communication_templates` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | S:own/participant or admin |  |
| `communication_channel_controls` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | S:own/participant or admin |  |
| `communication_event_controls` | on | REFERENCES,SELECT,TRIGGER,TRUNCATE | — (no policy → deny) | S:own/participant or admin |  |
| `alerts` | on | ALL | — (no policy → deny) | *:own/participant or admin, S:own/participant or admin |  |
| `incidents` | on | ALL | — (no policy → deny) | *:own/participant or admin, S:own/participant or admin |  |
| `health_checks` | on | ALL | — (no policy → deny) | S:own/participant or admin |  |
| `self_healing_actions` | on | ALL | — (no policy → deny) | S:own/participant or admin |  |
| `command_center_war_rooms` | on | ALL | — (no policy → deny) | D:deny, I:deny, S:admin, U:deny |  |
| **Governance, audit & admin** | | | | | |
| `audit_logs` | on | ALL | — (no policy → deny) | — (no policy → deny) | m10 ✔ |
| `governance_policies` | on | ALL | — (no policy → deny) | S:admin | m10 ✔ |
| `risk_assessments` | on | ALL | — (no policy → deny) | S:admin | m10 ✔ |
| `decision_registers` | on | ALL | — (no policy → deny) | S:admin |  |
| `change_requests` | on | ALL | — (no policy → deny) | S:admin |  |
| `releases` | on | ALL | — (no policy → deny) | S:admin |  |
| `approval_rules` | on | ALL | — (no policy → deny) | S:admin |  |
| `country_rules` | on | ALL | — (no policy → deny) | S:admin |  |
| `enterprise_standards` | on | ALL | — (no policy → deny) | S:admin |  |
| `feature_lifecycles` | on | ALL | — (no policy → deny) | S:admin |  |
| `partner_requirements` | on | ALL | — (no policy → deny) | S:admin |  |
| `experiments` | on | ALL | — (no policy → deny) | S:admin |  |
| `improvements` | on | ALL | — (no policy → deny) | S:admin |  |
| `innovation_ideas` | on | ALL | — (no policy → deny) | S:admin |  |
| `intelligence_reports` | on | ALL | — (no policy → deny) | I:own/participant or admin, S:own/participant or admin |  |
| `leads` | on | ALL | *:deny | *:deny |  |
| `lead_activities` | on | ALL | *:deny | *:deny |  |

Other public tables (108): RLS on for all; policies reaching client roles on them are covered by the catalog tests m10 #4/#5.

SECURITY DEFINER functions: 65; without pinned search_path: 0 []; owners: ['postgres'].
Functions executable by anon/authenticated: ['is_admin()']

## 4. Defects found and fixed in this phase
| ID | Finding | Before (evidence) | Fix | After |
|---|---|---|---|---|
| RLS-1 | 14 SELECT policies gave `authenticated` `USING (true)` on internal governance/operations tables | `m10` #5 fail; an `authenticated` JWT with an arbitrary `sub` read `governance_policies` and `risk_assessments` (`m10` #7/#8 fail) | `20261011120000`: same policies gated by `is_admin()` | pass; admins keep access (`m10` #11) |
| RLS-2 | 23 functions EXECUTE-able by `PUBLIC`/`anon`/`authenticated` (22 trigger functions, `refresh_inspection_provider_starting_price(uuid)`) | `m10` #3 fail | `20261011120000`: revoke | pass; triggers still fire (`m10` #10) |
| SCH-PROFILES-1 | `is_admin()` reads `profiles.role`, which never followed `users.role`; any `profiles` UPDATE failed | `m10` #12 fail | `20261011121000` | pass (promotion and demotion reach RLS) |
Before/after logs: `evidence/supabase-reconciliation-20261011/BEFORE-m10-rls-supabase-defaults.log` (6/12 pass on the foundation chain) and the certification harness run (12/12).

## 5. Verified properties (all on the hosted-like replay)
* every `public` table has RLS enabled (`m10` #1); none forced (service role must bypass);
* no non-trigger `SECURITY DEFINER` function is executable by client roles; all 65 `SECURITY DEFINER` functions pin `search_path`; the only client-executable function is `is_admin()` (authenticated) (`m10` #2/#3, catalog);
* every policy that `anon` can reach is identity-bound, deny-all or reviewed public CMS/marketing content (`m10` #4);
* `anon`, an `authenticated` JWT with a foreign `sub`, and one carrying a real KAYAD user id can neither read nor insert/update/delete rows in 23 sensitive tables (identity, sessions, chats, outbox, payments, ledger, escrow, payouts, refunds, bids, registrations, holds, audit, OTP, support, provider credentials, governance) (`m10` #6–#8);
* client roles cannot call privileged RPCs (append a message as another user, claim the outbox, place a bid, rotate refresh tokens) (`m10` #9);
* no views or materialised views exist in `public` (nothing bypasses RLS through a view).

## 6. Residual risks / not verified
* Hosted catalog — **SOURCE-VERIFIED on production (read-only, 2026-10-11)**:
  * RLS is enabled on all 209 public tables.
  * The only client DML grant is `authenticated: SELECT` on `vehicle_valuations`, which has the ownership policy.
  * The 14 RLS-1 `USING (true)` policies are present but **latent**, because no client SELECT grant exists on those tables.
  * **RLS-3:** anon/authenticated hold TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on 72 tables through the `postgres` default ACL. Production's default ACL for tables is `Dxtm` for client roles, not the "ALL" that the local replay mode emulates. The revoke is now in migration `20261011120000`, and `m10` #13 asserts it.
  * Security advisor: 0 ERROR, 0 WARN, 127 INFO `rls_enabled_no_policy` (intended deny-all).
  * GoTrue "allow sign-up" is a dashboard setting not visible from SQL: **NOT RUN** (checklist A6).
* `own/participant` policies for `authenticated` assume Supabase-Auth ids; with custom auth they are effectively deny-by-default, but they would grant access to anyone who can mint a JWT for a KAYAD user id (JWT secret compromise). Keep the JWT secret out of every client and rotate it if exposed.
* Supabase Realtime publication of 5 tables (unused) — see `15-…`.
* Storage buckets / `storage` schema: not part of the repository migrations; not assessed.
