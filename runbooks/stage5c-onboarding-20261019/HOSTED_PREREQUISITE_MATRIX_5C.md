# Hosted prerequisite matrix (Stage 5C) — read-only, NOTHING WAS CHECKED AGAINST HOSTED

No hosted connection (SQL, REST, deployment or provider dashboard) was made. Every row is **BLOCKED** until someone with hosted read access runs `HOSTED_READONLY_PREFLIGHT_5C.sql` and reviews the console items. Rows with a repo migration are the *resolution*, not proof the hosted DB has it.

| # | Prerequisite | Needed by | Repo resolution | Status | To unblock |
|---|---|---|---|---|---|
| 1 | `kayad_register_identity_atomic` RPC | registration | `20261001090000…`, `20261001220000…` | BLOCKED | preflight §1 |
| 2 | users security columns (`deactivated_at`, `granted_permissions`, `revoked_permissions`, `last_active`, login lock cols) | login, owner usable fn | `20261011090000…` | BLOCKED | preflight §2 |
| 3 | case-insensitive unique email index | owner address protection | `20260930112000…` | BLOCKED | preflight §3 |
| 4 | dealer onboarding fields (`bio`, `payment_details`, `onboarding_complete`, `onboarding_completed_at`) | dealer onboarding | see repo migrations | BLOCKED | preflight §4 |
| 5 | `dealer_verifications.verification_status` constraint admits `suspended` | dealer suspension | repo migrations | BLOCKED | preflight §4 |
| 6 | inspector tables (`inspector_applications`, `vehicle_inspections`, `inspection_providers`, `inspection_staff`) | inspector flow | repo migrations | BLOCKED | preflight §5 |
| 7 | `otp_challenges` with a `status` CHECK that lists `delivery_failed` | OTP | repo migrations | BLOCKED | preflight §6 |
| 8 | `security_logs` table (fallback to `audit_logs` otherwise) | security audit | none (fallback) | BLOCKED | preflight §7 |
| 9 | `communication_event_controls` enabled rows for all events in the inventory | every email/SMS | `20260909…`, `20260928…`, 5B | BLOCKED | preflight §8 |
| 10 | owner tables, functions, grants, RLS | owner governance | 5B candidate `20261019120000` | BLOCKED | preflight §9; decision D1 (5B) |
| 11 | subscription RPC fix | dealer paid activation | 5C candidate `20261019200000` | BLOCKED | decision D5C-B |
| 12 | Brevo sender/domain, API key, webhook | live email | — | BLOCKED | provider console, secrets in host env |
| 13 | Africa's Talking credentials, sender ID | live SMS | — | BLOCKED | provider console |
| 14 | Required env vars (`WEBHOIST_EMAIL`, `FRONTEND_URL`, `JWT_*`, `BREVO_*`, `AT_*`, `REQUIRE_EMAIL_VERIFICATION`, limiter maxima) | all | `.env.example` | BLOCKED | hosting dashboard |
| 15 | Deployed revision / API compatibility with this tree | all | — | BLOCKED | compare deployed commit to the ZIP |
