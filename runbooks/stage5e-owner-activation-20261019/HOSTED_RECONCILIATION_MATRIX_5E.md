# Stage 5E — Hosted environment identity and migration reconciliation (Workstream B)

All hosted operations were **SELECT-only** against catalog/migration-history relations, through the Supabase MCP connector, 2026-10-19 (evening, Africa/Nairobi). Nothing was written, no function with side effects was called, no migration tool (`apply_migration`, `create_branch`, …) was invoked.

## 1. Environment identity
| Evidence | Value |
|---|---|
| Projects visible to this connector | 2: **KAYAD EA** `ubvgixwhfybbyjuvxboj` (ACTIVE_HEALTHY, eu-central-1, PG 17.6, created 2026-08-31) and "CALQULUS PMS" (`hmgpltrjlsescfquqxeg`, INACTIVE; unrelated to KAYAD) |
| Branches of KAYAD EA | **none** (`list_branches` → empty) — there is **no staging branch** |
| Repository evidence | `scripts/bootstrap-supabase-production.mjs` pins `expectedProject = ubvgixwhfybbyjuvxboj`; `scripts/bootstrap-supabase-staging.mjs` *refuses* that ref; migrations and four prior reports call it "Production" |
| Classification | **PRODUCTION (by repository designation); NOT confirmed by the owner. There is no known staging target.** Per the Stage 5E rules it must not be treated as staging. |
| Deployed backend revision | **Unknown / not observable** (`SUPABASE_URL`, `WEBHOIST_EMAIL` etc. are `sync: false` in `render*.yaml`; no deploy log available) |

## 2. The 11 Stage 5D schema findings, re-verified
| # | Finding | Re-verification (hosted, read-only) | Status |
|---|---|---|---|
| 1 | ≈63 repo migrations missing on hosted | 135 applied, last `20260922060457`; 63 repo files have no hosted counterpart (name match after normalising the version prefix) | **CONFIRMED** |
| 2 | ≈38 hosted-only versions without repo SQL | 38 versions in `supabase_migrations.schema_migrations` with no repo file (list in §3) | **CONFIRMED** (SQL is stored in the history table; not yet exported to the repo) |
| 3 | `users.deactivated_at` missing | column absent | **CONFIRMED** |
| 4 | dealer onboarding columns missing | `dealers` lacks `bio`, `payment_details`, `onboarding_complete`, `onboarding_completed_at` | **CONFIRMED** |
| 5 | `suspended` verification status missing | `dealer_verifications` CHECK = `pending, approved, rejected` | **CONFIRMED** |
| 6 | `kayad_register_identity_atomic` missing | no such function | **CONFIRMED** |
| 7 | no case-insensitive email uniqueness | no unique `lower(...)` index; 0 normalised duplicates among 2 users | **CONFIRMED** (safe to add today) |
| 8 | owner-governance tables absent | only `owner_profiles`/`owner_vehicles` (vehicle-ownership tables, unrelated); no `kayad_owner_*` functions | **CONFIRMED** |
| 9 | `service_role` lacks EXECUTE on `kayad_activate_dealer_subscription_atomic` | anon=false, authenticated=false, **service_role=false** for the 10-argument signature | **CONFIRMED** — and **reproduced** on a disposable DB (`permission denied for function`) |
| 10 | anon/authenticated hold TRUNCATE, REFERENCES, TRIGGER on `otp_challenges` | confirmed — and it is **not limited to OTP: 72 of 209 public tables** carry them; no anon/authenticated INSERT/UPDATE/DELETE anywhere (0 tables) | **CONFIRMED, WIDER than reported** |
| 11 | hosted identity / backend revision uncertain | see §1 | **UNRESOLVED** |

Additional confirmations: `refresh_tokens` lacks `session_id`/`family_id`/`token_hash` and still has the legacy plaintext `token` column — **0 rows** (nothing to lose when the session-hardening migration drops it); `users` has 2 rows; no `chat_message_outbox`, no `cars.clicks`.

## 3. Hosted-only migrations (38) — what they do (from the stored statements; md5 per version in `evidence/stage5e-20261019/hosted/`)
Method: `SELECT` of `supabase_migrations.schema_migrations.statements`, analysed in-database (counts and object names, `md5` of the full text); the exact text was **not** copied out of the database (retype risk) — export it with the CLI (see §6).
* **Nature:** additive hardening. **No DELETE/TRUNCATE in any of the 38.** DROPs: `idx_inspection_payment_reference_unique` (phase2), `trg_inspection_report_immutability` trigger recreated (phase22 ×2). One `rollback` column is empty for all 38.
* **Creates:** 20+ `kayad_*_atomic` / admin-control RPCs (listing, bid, escrow transition, payout, inspection payment/refund/dispute, service jobs, admin identity/listing/auction/payment/escrow actions); 25+ tables (`admin_control_*`, `admin_action_requests`, `service_jobs`, `service_job_*`, `inspection_*`, `escrow_provider_integrations`, `market_data`, `transactions`, analytics/risk tables …); unique indexes on bids/escrows/refunds; RLS enabled on every new table with `REVOKE … FROM anon, authenticated`.
* **Not in the repo (no CREATE/ALTER/DROP anywhere in `supabase/migrations`):** 40 of 68 distinct objects (see `hosted_only_vs_repo.tsv`) — e.g. all `kayad_admin_execute_*`, `admin_control_registry/state`, `admin_action_requests`, `escrow_provider_integrations`, `inspection_commercial_config`, `inspection_report_downloads`, and the tables `market_data`, `transactions`, `bid_logs`, `contacts`, `job_failures`, … **Code depends on some of them** (`backend/inspection/services/phase22Service.js` calls 10 of those RPCs; `models/_base.js` uses the tables). **A database rebuilt from the repo alone is therefore incomplete** (a repo defect for disaster recovery, independent of the owner work).
* **Overlap with the 63 (replay hazard):** 17 objects are defined both by a hosted-only migration and by a not-yet-applied repo migration: 4 inspection functions + 7 tables by `20260920220000_phase22_reconciliation`; escrow/bid RPCs by `20261002150000`, `20261002180000`, `20261007120000`; `escrow_audits`, `idempotency_audit_logs`, `inspector_applications`. Replaying would `CREATE OR REPLACE` hosted functions with the repo's version — a **compare-before-apply** item, not a safe blind replay.
* **Intentional drift:** hosted dropped the unique index `idx_inspection_payment_reference_unique` (phase2) that repo migration `20260918144230` (already applied) creates. Repo and hosted disagree on whether it should exist — **unresolved, needs owner/engineering decision**.

## 4. The 63 missing repo migrations — static risk scan (`missing63_risk.tsv`)
* No `DROP TABLE`. `DROP COLUMN`: `refresh_tokens.token` (0 rows on hosted → no data loss; hash backfill is in the same migration) and a comment-only rollback hint.
* 26 files contain `DROP CONSTRAINT` (replace-by-recreate patterns), 15 add UNIQUE/NOT NULL (`uq_users_email_normalized` would fail only if normalised duplicates existed — **0 today**), 24 contain data statements (seeds/backfills), 38 grant/revoke, 18 `SECURITY DEFINER`. Only DELETE: `chat_message_outbox` retention function. `TRUNCATE` appears only in `REVOKE TRUNCATE …`.
* Own-transaction / rollback: none ships a rollback script; recovery = restore point (branch/PITR). Disposable rehearsal of all 63: **0 failures** (5D) on a baseline that lacks the 38 hosted-only migrations.
* `20261011120000_client_role_least_privilege` already revokes the TRUNCATE/REFERENCES/TRIGGER exposure on all public tables (replay DB afterwards: 0 tables).

## 5. Is any available schema dump complete enough to reconstruct hosted?
**No.** The repo migrations are not (§3: 40 objects missing). The hosted history table does hold the statements of every applied migration, but the `*_effect_capture_*` entries show earlier out-of-band changes were "captured" rather than replayed; whether the 135 statements reproduce the live catalog exactly is unproven. A complete reconstruction needs a `pg_dump --schema-only` taken by an authorised person (see runbook `APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md`).

## 6. Smallest evidence to continue
(a) Owner confirms the target is production / names a staging project; (b) `supabase migration fetch` (CLI, read-only toward the remote) to land the 38 hosted-only files in a scratch directory for review — or authorise me to export them by SELECT; (c) schema-only dump for catalog diff.
