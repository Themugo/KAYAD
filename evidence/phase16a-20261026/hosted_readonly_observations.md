# Phase 16A - hosted READ-ONLY observations (SELECT only; project ref ubvgixwhfybbyjuvxboj; observed Mon 2026-10-26 ~23:15 Africa/Nairobi)
No statement other than SELECT was sent to the hosted project in this phase. Addresses are masked; hashes/tokens were never selected.

| id | email (masked) | role | super_admin | status | email_verified | banned/deactivated | profiles rows (role) | user_auth rows | sessions total / live | dealers rows | verification rows |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dad5a03a-8181-45d7-b540-798c01874a21 (primary owner candidate) | ji***@gmail.com | dealer | false | pending | true | no / no | 1 (dealer) | 1 | 38 / 2 | 0 | 0 |
| 3ef47f31-0254-44a5-b141-4634ed9671c8 (main test dealer) | ka***@gmail.com | dealer | false | pending | **false** | no / no | 1 (dealer) | 1 | 0 / 0 | 0 | 0 |

Columns used by the proposed update exist on hosted `public.users`: role, super_admin, email_verified, is_banned, deactivated_at, status, business_name, updated_at.
Earlier-phase observations still standing (not re-queried): users = 2 rows; auth.users = 0; the second-owner address exists nowhere; no owner-governance/MFA tables or kayad_owner* functions; hosted has only trg_sync_profile_from_user (INSERT) and trg_users_updated_at on users; CHECK users_superadmin_flag_consistency exists only on hosted.

## Additional hosted read-only observations (same session)
* Governance prerequisites: `users.deactivated_at/granted_permissions/revoked_permissions/last_active` present; `refresh_tokens.session_id/family_id` present; function `kayad_register_identity_atomic` **absent**; only plain unique index `users_email_key` (no `lower(email)` unique index); `owner_*` tables present are `owner_profiles`, `owner_vehicles` (ownership-passport domain, unrelated); `kayad_owner*` functions 0; `supabase_migrations.schema_migrations` count 135.
* `dealers` columns: approved, business_name, created_at, id, is_suspended, location, suspension_reason, updated_at, user, verified_at (missing vs repo: bio, onboarding_complete, onboarding_completed_at, payment_details). `dealer_verifications` columns match the repo; its CHECK allows `pending|approved|rejected` only.
