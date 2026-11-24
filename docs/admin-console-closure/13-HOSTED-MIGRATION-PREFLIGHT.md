# 13 — Hosted migration preflight (READ-ONLY)

Project `ubvgixwhfybbyjuvxboj` (KAYARD KE, eu-central-1, Postgres 17.6, ACTIVE_HEALTHY). Only `get_project`, `list_migrations` and `SELECT` on catalogs were used. **Nothing was applied, written or reset.** Date of check: 2026-11-24.

## Observations
* Hosted migration history (`list_migrations`) ends at `20260922060457` (admin_control_schema_effect_capture). None of the `2026-10…2026-11` local files appear in the history table, so history-table parity with the repo (216 files) is **NOT VERIFIED**; objects must be compared directly.
* Object comparison for the four pending local migrations:

| Local migration | Creates | Hosted today | Idempotent? |
|---|---|---|---|
| `20261123210000_lead_create_find_before_insert` | `CREATE OR REPLACE FUNCTION kayad_create_lead_atomic` | function **exists** (body version not compared) | yes (replace) |
| `20261123220000_dealer_temporary_duties` | `dealer_team_temporary_grants`; re-adds `dealer_employment_events` event_type CHECK | grants table **absent**; `dealer_employment_events` exists | table `IF NOT EXISTS`; CHECK drop/add — needs row check of existing `event_type` values before apply |
| `20261124100000_admin_customer_care_and_market_tables` | `market_data`, `ntsa_verification_requests`, `reports`, `feedback`, `announcements` | `market_data` (RLS on) and `ntsa_verification_requests` **exist**; `reports`, `feedback`, `announcements` **absent** | yes (`IF NOT EXISTS`) |
| `20261124120000_dealer_suspension_requests` | `dealer_suspension_requests` + indexes + RLS | **absent** | yes |
* Also absent hosted: `private_seller_capabilities` (migration `20261025100000`), `security_logs` (audit falls back to `audit_logs`, present).
* `transition_escrow`: not present under that name in `public` at check time (drift against local expectations). **Noted only — not replaced** (owner rule).

## Consequence for the console if nothing is applied
Reports, Feedback, Customer-care announcements, dealer suspension requests and temporary duties are unavailable on hosted (pages show honest unavailable/empty states; Personal Accounts works without the capability table).

## Backup / restore
Backup reliability is **NOT established**: no restore rehearsal has been performed. Per the master prompt a backup is not relied upon until a restore is rehearsed ⇒ **migration execution is BLOCKED** pending (a) a rehearsed restore, (b) owner authorisation.

## Pre-apply checks to run read-only first
1. `SELECT DISTINCT event_type FROM dealer_employment_events` vs the new CHECK list.
2. Compare `kayad_create_lead_atomic` hosted definition to the local one.
3. Confirm `auth.uid()`/RLS grants pattern for new tables matches `REVOKE ALL FROM anon, authenticated`.
