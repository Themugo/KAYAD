# Hosted schema prerequisites for the owner-governance candidate (Stage 5B closure)

**Status: NOT VERIFIED against the hosted database.** No hosted connection was made in this stage. The list below is the Stage 5A Gate C finding (hosted schema read at that time) mapped to the repository migration that resolves each gap. Whether it still holds must be re-established with fresh, separately authorised read-only evidence (`MIGRATION_PREFLIGHT_READONLY_5B.sql`, items 7–8).

| # | Historical hosted gap (5A Gate C) | Resolved by (repo migration) | Why the owner candidate needs it |
|---|---|---|---|
| 1 | Registration RPC `kayad_register_identity_atomic` missing | `20261001090000_registration_onboarding_integrity.sql`, then `20261001220000_database_contract_alignment.sql` | Registration of reserved owner addresses and the atomic account creation path used by invitation acceptance flows |
| 2 | `refresh_tokens.session_id` / `family_id` missing | `20260930110000_advanced_identity_session_hardening.sql` | Revocation of every session of a removed owner; refresh rotation |
| 3 | `users` security columns missing (`deactivated_at`, `granted_permissions`, `revoked_permissions`, `last_active`) | `20261011090000_users_security_state_columns.sql` | **Hard dependency**: `kayad_owner_usable()` is a `LANGUAGE sql` function validated at creation; the candidate **fails to apply** without `users.deactivated_at` (rehearsed: pg-tests/owner_governance_pg_upgrade_rollback.sh §B — clean abort, nothing left behind) |
| 4 | Case-insensitive unique e-mail index missing | `20260930112000_identity_email_normalization.sql` | Prevents two accounts differing only by case claiming one designated address |

Order: the four 5A Gate C migrations (in repository order) → preflight must show no missing column and all four `present = true` → only then Decision D1 for the candidate. Any of these migrations is itself a hosted change and needs its own separate authorisation; none was applied here.

Local evidence (tier P, disposable PostgreSQL 16, 181 repository migrations replayed): the candidate applies after the full chain; applies on a populated database; refuses cleanly when gap 3 is simulated; leaves 201 pre-existing tables byte-identical except `communication_event_controls` (+6 rows by design).
