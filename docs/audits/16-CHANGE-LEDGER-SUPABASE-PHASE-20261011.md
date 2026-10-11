# Change ledger — Supabase reconciliation, RLS and staging-certification phase

Baseline: `KAYAD-SECURITY-BOUNDARY-REMEDIATION-AND-REALTIME-INTEGRITY-20261011.zip` (SHA-256 `2d021b3082e05f2eab630274e53900a6150330a6ead3c48ad80248579b07a9ef`), kept untouched (read-only copy) for the whole phase. Diff computed against its extraction. **No commit, push, deploy, hosted migration or production configuration change.** Untouched: authentication/session code (Messages fix), navigation, homepage, Auction 360 UI, Socket.IO server, attachment controller, outbox service/migration, cookie flags, CORS, Cloudinary configuration, package manifests and lockfiles.

## Modified (8)
| File | Δ lines | Phase | Change |
|---|---|---|---|
| `backend/services/paymentCallback.service.js` | +7 −2 | G | security-payment routing via `securityPaymentStore` (no longer aborts every callback when `transactions` is absent); explicit type guard kept; `markWebhookProcessed(…, undefined)` on success (FIN-CB-1) |
| `backend/services/bidSecurityService.js` | +21 −17 | G | new security payments created in `payments` (FK contract); callback lookups/updates through the store (payments first, legacy `transactions` fallback) |
| `backend/services/auctionRegistration.service.js` | +2 −1 | G | `finalizeCommitmentRegistration` finds the payment through the store |
| `backend/utils/fieldMap.js` | +27 | B/H | `notifications.isRead → read` (SCH-NOTIF-1); identity aliases for the real camelCase `escrows.dispute*` / `refundedAt` columns (SCH-ESCROW-2); `warningSent` **deliberately not aliased** (FIN-1, comment explains) |
| `backend/controllers/commandCenterController.js` | +1 −1 | B | mark-read writes `read: true` (no `is_read` / `read_at` columns exist) |
| `backend/scripts/migrate-chat-attachments-private.mjs` | +66 −33 | E | rewritten: manifest-driven (reviewed inventory required), plan/verify/rollback modes, `--confirm` count, aborts on first failure, refuses non-chat ids, never destroys |
| `backend/tests/resilience/failureModes.test.js` | +13 −3 | G | two bid-security callback tests asserted the old `transactions` table; they now assert `payments` and a new third test keeps the legacy-table assertion. Same behaviours asserted (failed status, idempotent duplicate) — updated because the storage contract changed, not to improve totals |
| `docs/messaging-consistency-audit/harness/sql/apply_chain.sh` | +18 −3 | B | success judged by psql **exit status** (a stopped server used to be counted as "applied"); `SUPABASE_DEFAULT_PRIVILEGES=1` mode reproduces hosted default grants |

## Added
| File | Purpose |
|---|---|
| `supabase/migrations/20261011120000_client_role_least_privilege.sql` | RLS-1 (14 policies → `is_admin()`), RLS-2 (revoke client EXECUTE on trigger functions + one invoker helper), RLS-3 (revoke TRUNCATE/REFERENCES/TRIGGER, and MAINTAIN on PG17, on public tables from anon/authenticated — found on production, 72 tables) |
| `supabase/migrations/20261011121000_profiles_role_sync_repair.sql` | SCH-PROFILES-1: `profiles.updated_at`, role-sync trigger, one-time realignment |
| `supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql` | read-only catalog inventory (tables, columns, constraints, indexes, grants, policies, triggers, functions incl. EXECUTE and SECURITY DEFINER, extensions, sequences, enums, event triggers, publications, migration history versions) as one JSON |
| `supabase/preflight/PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql` | read-only aggregates: legacy `transactions`, security payments, unprocessed webhooks, escrow-cron dry-run counts, profiles drift, outbox health |
| `scripts/supabase-reconcile.mjs` | compares two inventories; severity-ranked drift (RLS off, wider grants/policies, SECURITY DEFINER exposure, missing objects, migration history) |
| `scripts/supabase-code-references.mjs` | tables/RPCs referenced by code reachable from `backend/server.js` vs an inventory |
| `backend/services/securityPaymentStore.js` | commitment/security payment store (payments + legacy fallback) |
| `backend/services/chatAttachmentInventory.js`, `backend/scripts/chat-attachment-inventory.mjs` | read-only legacy attachment inventory |
| `backend/tests/security/securityPaymentStore.test.js` (8, incl. production's `transactions` shape → 42703 tolerated), `chatAttachmentInventory.test.js` (13), `backend/tests/regression/fieldMapSchemaReconciliation.test.js` (33) | Jest |
| harness `tests/m8b-outbox-failure-modes` (7), `m10-rls-supabase-defaults` (13; #13 = no TRUNCATE/REFERENCES/TRIGGER for client roles), `m11-schema-drift-fixes` (2), `m12-legacy-attachment-inventory` (2), `m13-auction-security-payments` (5) | real-database / real-server tests |
| harness `tools/route-schema-crawl.mjs`, `browser/realtime-host-probe.mjs` | runtime schema crawl; real-Chromium cross-host socket probe |
| `docs/audits/08`–`19` (this phase), `docs/audits/evidence/supabase-reconciliation-20261011/`, `…/certification-20261011/`, `…/hosted-readonly-20261011/` (production read-only catalog findings), `…/final-tree-delta-20261011/` | reports and evidence |

## Production access in this phase
Read-only only, after the owner connected the KAYAD org (14:42 EAT): migration metadata, catalog/privilege/policy queries, the security advisor, and aggregate edge-log counts. No application row data was read. No DDL/DML, migration, branch, configuration or key operation.

## Not done on purpose
Creation of any of the 101 tables the code references but no migration creates; enabling escrow automation; cookie/socket host changes; Supabase Realtime publication change; Cloudinary changes; GoTrue sign-up setting (dashboard).
