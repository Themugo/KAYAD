# KAYAD — Production Schema, Authentication & Communications Convergence (2026-10-13)

**Stage:** post-health-fix audit + local fixes. **Production changed: NO.** No migration, DDL, DML, grant, email, SMS or payment was executed anywhere in this stage.
Label legend used throughout: **[LOCAL-VERIFIED]** executed here on this tree/throwaway DB · **[LIVE-READ]** read-only SELECT against production catalog/counts on 2026-10-13 · **[CODE]** read from source · **[INFERRED]** logical consequence, not executed live · **[UNVERIFIED]**.

## 1. Executive summary
1. Production (`ubvgixwhfybbyjuvxboj`) has the schema of the `20260922060457` baseline. **63 of the 181 repository migrations have no match in production's history** [LIVE-READ + name/version match], including all eight onboarding-critical ones. Another **37 production migrations have no file in the repository** (the repo chain cannot rebuild production from scratch) [LIVE-READ].
2. The deployed backend (same code as `main`) calls objects production does not have. Registration, sign-in, token refresh and every authenticated request are **blocked at the database contract** [CODE vs LIVE-READ; not exercised live → INFERRED].
3. Seven blockers are confirmed against the live catalog (§8). The fix is a reviewed, ordered chain of 8 existing migrations; it has been **rehearsed twice-over on a throwaway PostgreSQL 16 built to production's exact column shapes** — all behavioural assertions pass [LOCAL-VERIFIED]. It is **not authorized or applied**.
4. One local defect was proven and fixed: migration `20260930110000` was **not rerun-safe** (it aborts with `column "token" does not exist` on a second execution). Fixed minimally with a guard; regression-tested.
5. A claim in the previous report is **retracted**: "communication rollout controls are fail-closed so no transactional email is enabled" is wrong for verification/reset/welcome mail — production already has `account.email_verification`, `account.password_reset` and `registration.completed` enabled on email, and the email channel enabled [LIVE-READ]. Migration `20260928123600` only changes a provider label (`resend`→`brevo`; code never reads it) and is **not** a blocker.
6. Email delivery remains **unproven end to end**: no real send was made (prohibited), no Brevo evidence exists.

## 2. Baseline
- Real repo `C:\Users\hp\Desktop\kayad-fresh`: remote `https://github.com/Themugo/KAYAD.git`, branch `main`, HEAD `e35399ac1fbd5fbc36f00b08e4ff8c1c3edb32e1` ("fix(health): expose communications readiness on admin /health/deep with real-app regression test"), `main...origin/main` in sync, only untracked file `"t proxy\""` (pre-existing, untouched) [device read].
- Six health-patch files in the real repo are **byte-identical (SHA-256) to the foundation ZIP** `b4df98cf…0021` for all six. `supabase/migrations` content hash also identical between the real repo and the foundation ZIP.
- Windows-native test run was **not possible from this session** (the device shell is a Linux VM; `node_modules` holds Windows rolldown binaries → `Cannot find module './rolldown-binding.wasi.cjs'`). All test results below are from a Linux Node 22 copy of the same tree and **do not prove the Windows working tree passes**. Run the commands in §12 locally.

## 3. Health/readiness patch verification [LOCAL-VERIFIED + CODE]
Handlers (proven by `healthRouteComposition.test.js`, 20 tests, real `server.js`): `/health`, `/api/health` → `shallowHealth` (public, minimal); `/health/live`, `/api/health/live` → `{status:"ok"}`; `/health/ready`, `/api/health/ready` → readiness (200 `{status:"ready"}` / 503 generic text, DB error never echoed); `/health/deep`, `/api/health/deep` → `protect`+`adminOnly` then `deepHealth` with `checks.communications`. Router-root `GET /` is unreachable for `/health` (documented, intentionally untouched). Unauthenticated → 401; `user`/`dealer` → 403; `admin`/`superadmin` → 200. `schema_ready` → ok; `schema_mismatch`/`unknown`/throw → degraded + HTTP 503. Provider config / acceptance / mailbox delivery stay separate fields. Canary secret never appears. Readiness service: read-only `select` probes, 4 s timeout, 60 s cache, fresh result per run, no free-text error leakage.
Caveat [LIVE-READ + CODE]: `protect` selects `deactivated_at, granted_permissions, revoked_permissions` from `users`; **production lacks these columns**, so the admin-only `/health/deep` itself cannot authenticate on the current production schema until `20261011090000` is applied [INFERRED].
Known open item AA-A1: `adminOnly` admits every staff role, so all staff roles can read `/health/deep` (no secrets in it).

## 4. Migration audit coverage
Inventory of **all 181 files**: `KAYAD_MIGRATION_INVENTORY_20261013.tsv` (per file: production match, creates/alters, indexes/triggers/policies/grants, drops, DML statement counts, NOT NULL, classification, rerun idioms). Method: static text analysis + production history comparison. **It is an automated structural inventory, not a line-by-line human review of all 181**; the 8 onboarding-critical files, `20260928123600`, `20261011093000`, `20261011120000`, R12 and R14 were read in full.
- Production history vs repo [LIVE-READ]: 97 matched by version, 21 by name, **63 unmatched repo files**, **37 production-only versions** (all 2026-09-19..22: `p0a_*`, `phase2…phase22_*`, `remote_schema_effect_capture`, `admin_control_schema_effect_capture`, `harden_dispute_rpc_execute_privileges`). History presence ≠ proof that every object is correct; a spot check of table existence found **no table created by an applied repo migration missing from production**, and **no table referenced by an unapplied migration that is missing from both production and the earlier chain**.
- Chain dependency check (static): every unapplied migration's table references resolve to production tables, its own creates, or earlier repo files. 16 tables created only by unapplied files are absent from production (auction setup/registrations/outcomes/security holds, hero slides/placements, chat idempotency/outbox, purchase outcomes, report versions/corrections, provider service capabilities) — all outside the onboarding journey.
- Only **one** unapplied file drops data: `20260930110000` (`DROP COLUMN token`). Heuristic "truncate/delete" hits in `20261011120000` (`REVOKE TRUNCATE`) and `20261011100000` (DELETE inside a purge function body) are false positives.
- 11 unapplied files lack idempotent idioms (`IF [NOT] EXISTS`/`OR REPLACE`): `20260920203000, 20260928123600, 20261002090000, 20261003120000, 20261004110000, 20261007170000, 20261007200000, 20261010130000, 20261011093000, 20261011093100, 20261012103000` — rerun safety **UNVERIFIED** for these (none are in the onboarding chain).
- Possibly superseded, **unverified**: `20260908070000`, `20260908080000`, `20260908113000`, `20260920203000`, `20260920220000` are unmatched, while production has later `reconcile_*`/`phase22_*` captures of the same domains. Do not apply them without a diff against the live catalog.

### Onboarding-critical chain (in required order)
| # | Migration | Changes | Class | Needs (prior) | App call sites | Rerun-safe | Rollback |
|---|---|---|---|---|---|---|---|
| 1 | 20260930111500 | `communication_deliveries.idempotency_key`; unique `(provider,channel,idempotency_key)` WHERE NOT NULL; unique `(provider,provider_event_id)`; index source_event_id | additive | table | `communicationGateway.service.js` recordDelivery/findOne | yes [LOCAL-VERIFIED] | drop idx/col; none lost (0 rows) |
| 2 | 20260930113000 | status CHECK adds `dead_letter` | constraint swap | 1 | gateway state machine | yes | fails if dead_letter rows exist |
| 3 | 20260930112000 | unique `lower(btrim(email))` | restrictive; fails on collisions | – | register/login/forgot | yes | drop index |
| 4 | 20261001090000 | `dealers` +bio/payment_details/onboarding_*; `sync_dealer_profile_from_user` + trigger; `inspector_applications`; **`kayad_register_identity_atomic`**; backfills a dealers row per dealer user | additive + data-changing | `profiles`, `update_updated_at_snake` | `authController.register` (rpc) | yes | functions droppable; backfilled rows persist |
| 5 | 20261001220000 | pending-unique indexes, RLS/grants, re-statement of RPC/trigger grants | restrictive | **4 (errors if RPC absent)** | – | yes | revoke/grant reversible |
| 6 | 20260930110000 | `refresh_tokens` +token_hash/family_id/session_id/replaced_by/revoked_at/revoke_reason/reuse_detected_at; hash backfill; NOT NULL; **drops plaintext `token`**; **`kayad_rotate_refresh_token`**; RLS | **DESTRUCTIVE** | pgcrypto | `models/RefreshToken.js` (createSession, rotate, findBy…, getActiveSessions), `middleware/auth.js` (findActiveSessionById) | **fixed this stage** (was NO) | plaintext tokens unrecoverable |
| 7 | 20261011090000 | `users` +deactivated_at/granted_permissions/revoked_permissions/last_active | additive | – | `middleware/auth.js` protect | yes | drop columns |
| 8 | 20261011121000 | `profiles.updated_at`, `sync_profile_role_from_user` + trigger, role repair UPDATE | data-changing | profiles | role sync | yes | repaired rows persist |
Not in the chain / separate decisions: R12 `20261012140000` (additive; duplicates the dealers columns from #4 with `IF NOT EXISTS`), R14 `20261012140100` (CHECK swap) — **explicit authorization required**; `20260929100000` (broad `service_role` grants; production already reports service_role access working for the tables checked); `20261002120000` (RLS/boundary hardening on ownership/ledger/webhook tables — security value, not on the journey); `20261011093000`/`20261011120000` (client-role least privilege, see §8 R-6).

## 5. Application ↔ schema contract matrix
Classification per brief: **C**=verified in application code · **M**=defined in a migration · **L**=confirmed in live schema · **X**=missing/conflicting in live evidence · **V**=requires live verification.
| Dependency | C | M | Live (2026-10-13) |
|---|---|---|---|
| `kayad_register_identity_atomic` | `authController.js:274` | 20261001090000 | **X missing** (function list has no such name) |
| `kayad_rotate_refresh_token` | `models/RefreshToken.js:36` | 20260930110000 | **X missing** |
| `refresh_tokens.token_hash` / `family_id` / `session_id` / `replaced_by` / `revoked_at` / `revoke_reason` / `reuse_detected_at` | RefreshToken.js (insert/select/update) | 20260930110000 | **X missing**; table still has plaintext `token NOT NULL UNIQUE`, 0 rows |
| `users.deactivated_at` / `granted_permissions` / `revoked_permissions` / `last_active` | `middleware/auth.js:120,161` | 20261011090000 | **X missing** (users has `deleted_at`, `is_banned`, … but not these) |
| normalized email uniqueness | login/register use normalized email | 20260930112000 | **X missing** (only `users_email_key UNIQUE(email)`); 0 normalized duplicates, 0 non-normalized emails |
| `communication_deliveries.idempotency_key` + unique idx | gateway `recordDelivery` payload always includes the key (null when absent) | 20260930111500 | **X missing**; table 24 columns, 0 rows |
| status `dead_letter` | gateway `TERMINAL` set | 20260930113000 | **X** CHECK allows 7 values, no `dead_letter` |
| dealers onboarding columns / trigger | dealer routes | 20261001090000 / R12 | **X** dealers has only id,user,business_name,location,approved,verified_at,is_suspended,suspension_reason,created_at,updated_at; trigger/function absent; 0 dealers rows vs 2 dealer users |
| `inspector_applications` | inspector onboarding | 20261001090000 | **L present** (table exists in production already) |
| pgcrypto | digest() in 20260930110000 | extension | **L** installed (1.3) |
| `communication_event_controls` for verification/reset/welcome (email) | `isCommunicationEnabled` | 20260928123600 / earlier | **L enabled** (117 rows) |
| email channel control | – | – | **L enabled**, `canonical_provider='resend'` (label only; code ignores it) |
Production data scale [LIVE-READ]: users 2 (both `dealer`, `pending`, unverified), user_auth 2, refresh_tokens 0, dealers 0, communication_deliveries 0, profiles 2.

## 6. Authentication journey matrix
Statuses use the brief's vocabulary. "Local" = mock-based tests plus the PostgreSQL 16 rehearsal; **no journey is PASS against production**.
| Journey | Entry → API → code | Schema it needs | Failure mode on current production | Tests | Status |
|---|---|---|---|---|---|
| New customer registration | SPA register → `POST /api/auth/register` → `authController.register` → `kayad_register_identity_atomic` | RPC (#4), `users`,`user_auth`, profile trigger | RPC missing → PGRST202; controller logs "DATABASE MIGRATION REQUIRED", no account created (fail-closed) [CODE] | registrationFlow 7, registrationContract 12, rehearsal B1/B2 | **BLOCKED** (local PARTIAL) |
| Duplicate email | register pre-check `User.findOne` + DB unique | #3 | exact duplicates blocked by `users_email_key`; case/space variants only app-checked | rehearsal B3: `CUST.ONE@… ` rejected 23505, **no orphan users/user_auth** | **PARTIAL** |
| Registration timeout / safe retry | single transaction in RPC | #4 | no half-created account possible (rehearsal); client-timeout retry semantics beyond duplicate-email response not tested | rehearsal B3/B4 | **PARTIAL / UNVERIFIED** |
| Email verification request (resend) | `POST /api/auth/resend-verification` → `resendVerification` → `deliver()` | #1 (`idempotency_key`) | ledger insert includes `idempotency_key` → rejected before any provider call (no mail sent) [INFERRED] | onboardingEmailWorkflow 6, communicationsLaunchReadiness 8, recordDelivery 3 | **BLOCKED** |
| Verification email dispatch | `deliver()` → `recordDelivery` → `sendRawEmail` (Brevo REST) | #1,#2; Brevo key, verified sender | as above; provider chain never exercised | same | **BLOCKED / UNVERIFIED** (provider) |
| Verification-token consumption | `GET/POST verify-email` → `verifyEmail` (`user_auth.email_verify_token` hashed) | existing columns | works against existing columns [CODE]; the two production users hold tokens from an older build and must be re-sent | registration tests (mock) | **PARTIAL** |
| Sign-in correct credentials | `login` → `RefreshToken.createSession` | #6 | insert of `token_hash/family_id/session_id` rejected; also NOT NULL `token` | loginTimingEnumeration 2 (mock) | **BLOCKED** |
| Sign-in wrong credentials | `login` | none new | generic 401, equalised bcrypt cost [CODE+mock] | loginTimingEnumeration | **PASS (mock)** — still needs live |
| Access-token authorization | `protect` | #6 (`session_id`), #7 | select of missing `users` columns fails; admin routes incl. `/health/deep` unreachable [INFERRED] | protectLeanRow 3, protectInfraError 7, allAreasAuthzRuntime 57, securityCertification 58 | **BLOCKED** (local PASS) |
| Refresh-token rotation | `refreshToken` → `kayad_rotate_refresh_token` | #6 | RPC missing → 500 `AUTH_REFRESH_FAILED`, nothing issued (fail-closed) | **new** refreshRotationContract 7; rehearsal C1–C2 | **BLOCKED** (local PASS) |
| Refresh-token replay/reuse | same RPC + tokenVersion bump | #6 | – | refreshRotationContract; rehearsal C3 (replay → `reuse_detected`, **whole family revoked, no new token minted**), C5 (version mismatch), C6 (expired) | **BLOCKED** (local PASS) |
| Logout / revocation | `logout`, `revokeAllForUser`, `revokeSession` | #6 | `revoked_at`,`revoke_reason` columns missing | securityCertification (mock) | **BLOCKED / PARTIAL** |
| Deactivated/suspended | `protect` (`deactivatedAt`, `isBanned`) | #7 | `deactivated_at` missing | allAreasAuthzRuntime | **BLOCKED** (local PASS) |
| Dealer onboarding | `PUT /api/dealer/onboarding` | R12 columns; #4 trigger | both missing | validate-registration-onboarding-e2e-contract 14/14 (static) | **GAP/BLOCKED** (needs R12 authorization) |
| Password reset | `forgotPassword`/`resetPassword` (`user_auth.reset_token` hashed, `revokeAllForUser`) | #1 (email), #6 (revoke) | email blocked as above; revoke needs #6 | onboardingEmailWorkflow | **BLOCKED** |
Observation (not changed): the refresh cookie `maxAge` is 7 days while the DB session lifetime is 30 days; a logged-out/revoked token replayed later is classified as reuse and bumps `tokenVersion` (signs the user out of all devices). Both are design choices, flagged for a decision, not defects proven here.

## 7. Communications readiness matrix
| Layer | State | Evidence |
|---|---|---|
| 1 Schema readiness | **not ready** — `idempotency_key` absent, `dead_letter` not allowed | [LIVE-READ]; `/health/deep` would report `schema_mismatch` (once an admin can authenticate) |
| 2 Provider environment | **UNVERIFIED** — Render env was not inspected (prohibited) | – |
| 3 Provider API acceptance | **none observed** — 0 delivery rows, nothing sent | [LIVE-READ] |
| 4 Mailbox delivery | **none observed** | – |
Controls [LIVE-READ]: email channel enabled; events `account.email_verification`, `account.password_reset`, `registration.completed` enabled on email; SMS channel enabled (phone verification only). Gateway behaviour [CODE]: idempotency lookup by `(provider,channel,key)`, unique-violation recovery (`23505`) returns the canonical row, retryable failures → `failed`, non-retryable → `dead_letter`, monotonic status transitions; failures are logged and not swallowed silently. Verified sender (SPF/DKIM/DMARC, sender address) is **UNVERIFIED**.

## 8. Confirmed blockers (ranked)
| Id | Severity | Blocker | Evidence |
|---|---|---|---|
| B-1 | Critical | Registration RPC absent | [LIVE-READ] + [CODE] |
| B-2 | Critical | Sign-in/refresh: `refresh_tokens` still plaintext shape; rotate RPC absent | [LIVE-READ] |
| B-3 | Critical | All authenticated requests (incl. admin `/health/deep`): `users` security columns absent | [LIVE-READ] + [CODE] |
| B-4 | High | Delivery ledger cannot record (`idempotency_key` absent) → no transactional email can be recorded/sent; `dead_letter` unusable | [LIVE-READ] |
| B-5 | Medium | No DB-level normalized-email uniqueness | [LIVE-READ] |
| B-6 | Medium (needs decision) | `anon` and `authenticated` can EXECUTE `kayad_create_lead_atomic` and `kayad_transition_lead_atomic` (SECURITY INVOKER, so table grants/RLS apply). Fixed by unapplied `20261011093000`. The migration's worst-case (SECURITY DEFINER dispute/purchase RPCs) is **not** present in production. | [LIVE-READ] |
| B-7 | Medium | Repo chain ≠ production history (37 production-only, 63 repo-only) → no staging can be built from the repo alone; needs a schema dump or the missing captures | [LIVE-READ] |
| B-8 | Medium | Brevo key, verified sender, webhook token, mailbox delivery all unproven | [UNVERIFIED] |
| B-9 | Low | Four legacy validators (`verify-migration-integrity`, `verify-schema-contract`, `verify-migration-deployment-static`, `verify-database-contract`) target a different, older codebase lineage (reference migrations like `…_048_ecommerce_stability_foundation.sql` that do not exist), are not wired into `package.json`, and fail. Not a regression. | executed, exit 1 |
Retracted: "email rollout controls fail-closed" (§1.5). 

## 9. Risks of each proposed change
Registration RPC / dealer trigger (#4): backfill inserts 2 dealers rows (production dealers has no NOT NULL column beyond id,user [LIVE-READ] → low risk); trigger `SECURITY DEFINER` with pinned `search_path`. Refresh hardening (#6): irreversible column drop (0 rows now → no session lost; recheck at apply time); the deployed backend must be the matching commit. Unique email index (#3): fails if a collision appeared since the audit (preflight P3). CHECK swap (#2): fails if bad status rows exist (0 rows). Grants (#5): `REVOKE/GRANT` on the RPC errors if applied before #4. Deployment ordering: **database first, then backend**; the currently deployed backend already needs the new objects, so there is no safe "old code" window to protect.

## 10. Proposed execution order, preconditions, verification (NOT EXECUTED)
Order: #1 111500 → #2 113000 → #3 112000 → #4 090000 → #5 220000 → #6 110000 → #7 20261011090000 → #8 20261011121000. Then (separate approvals) R12/R14, `20261011093000`. Because **no staging exists**, first create/approve a disposable environment from a schema dump (B-7).
Runbooks (new versioned candidates; the earlier `COMMS_STEP1–4` files are untouched and **COMMS_STEP2 is not the whole fix**):
- `runbooks/ONBOARDING_V2_1_PREFLIGHT_READONLY.sql` — SELECT-only; executed here against a baseline-shaped local DB (no errors).
- `runbooks/ONBOARDING_V2_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql` — **NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION**; ordered `\i`, `lock_timeout 5s`, point-of-no-return marker before #6.
- `runbooks/ONBOARDING_V2_3_POSTVERIFY_READONLY.sql` — 35 checks; executed on the rehearsal DB: **35/35 true**.
- `runbooks/ONBOARDING_V2_4_ROLLBACK_LIMITS.sql` — commented-out, **NOT EXECUTED**; states what cannot be undone.
Rehearsal (local, throwaway PG16, refuses non-local hosts): `scripts/rehearse-onboarding-migrations-local.sh` + `scripts/rehearsal/*.sql` — applies the 8 migrations **twice** on a production-shaped baseline and asserts: dealer backfill; customer + dealer registration (normalised email, profile + dealers rows); duplicate-email rejection with no orphan rows; privileged-role refusal (`22023`); rotation → replay → family revoked and no token minted; unknown/expired/version-mismatch handling; legacy plaintext token hashed by the backfill; idempotency unique + NULL-key coexistence; `dead_letter` accepted, bogus status rejected; `anon`/`authenticated` cannot execute either RPC. Result: **PASSED**.
Limit: the baseline is a faithful reconstruction of columns/constraints from catalog queries, **not** a dump; policies, triggers on other tables, and Supabase-specific roles are approximated. Staging on a real restore is still required.

## 11. Local fixes and tests added
| Item | Root cause | Change | Proof it would fail before |
|---|---|---|---|
| `20260930110000` rerun-safety | backfill `UPDATE … digest(token …)` references a column the same file drops → second run aborts | backfill wrapped in a `DO` block guarded by `information_schema.columns` check, executed via `EXECUTE` | rehearsal pass 2 failed on the original (`column "token" does not exist`); `refreshTokenMigrationRerunSafety.test.js` fails 2/3 with the original body (mutation-checked), passes 3/3 now; `validate-advanced-auth-sweep` 19/19 and `validate-refresh-reuse-integrity` 6/6 still pass |
| `refreshRotationContract.test.js` (7) | coverage gap: no controller-level rotation/replay test existed | new tests: rotate, replay (403 `AUTH_REFRESH_REUSED`, tokenVersion bump), unknown token, RPC `not_found`, version mismatch, missing cookie, **missing RPC fails closed** | new coverage |
| `healthRouteComposition.test.js` 16→20 | `/health/live`, `/health/ready`, `/api/health` not covered | +4 tests, `checkSupabaseReadiness` mocked (no network) | – |
No application behaviour code was changed in this stage; no auth rewrite or bypass; RLS/idempotency/fail-closed untouched.

## 12. Tests executed (Linux Node 22 copy; exit codes observed)
| Command (cwd `backend` unless noted) | Exit | Result |
|---|---|---|
| `npx vitest run --config vitest.config.js tests/regression/healthRouteComposition.test.js` | 0 | 20/20 |
| `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` (full) | 0 | **91 suites, 1,275 tests passed** (was 89/1,265) |
| `npx vitest run --config vitest.config.js` (full) | 0 | **6 files, 36 tests passed**. (An earlier full run during this session failed 1 test because I was editing the file mid-run; the final run is green.) |
| `node --test tests/response-lifecycle.test.js` | 0 | 1 passed (run before the final edits; test untouched) |
| Jest targeted: loginTimingEnumeration 2, registrationFlow 7, registrationContract 12, protectLeanRow 3, protectInfraError 7, allAreasAuthzRuntime 57, securityCertification 58, communicationsLaunchReadiness 8, onboardingEmailWorkflow 6, recordDelivery 3, refreshRotationContract 7, refreshTokenMigrationRerunSafety 3 | 0 | all passed |
| `npm run validate:communications`, `validate:phase38/39/40`, `validate:transaction-integrity` (root) | 0 | pass (phase40 23/23, transaction-integrity 14/14) |
| `node scripts/validate-advanced-auth-sweep.mjs` / `validate-refresh-reuse-integrity.mjs` / `validate-migration-hygiene.mjs` / `validate-supabase-migrations.mjs` / `validate-database-contract-alignment.mjs` / `validate-registration-onboarding-e2e-contract.mjs` / `validate-backend-runtime-contracts.mjs` / `validate-messaging-rpc-error-contract-20261010.mjs` | 0 | 19/19, 6/6, PASS, PASS, 8/8, 14/14, 14/14, PASS |
| `scripts/rehearse-onboarding-migrations-local.sh` (local PG16) | 0 | applied twice, assertions green |
**Failed / not run / unavailable:** `verify-migration-integrity`, `verify-schema-contract`, `verify-migration-deployment-static`, `verify-database-contract` → exit 1 (stale legacy validators, B-9; pre-existing). `validate:communications:providers` → **NOT RUN** (needs live provider credentials; fails by design). Windows-native runs → **NOT RUN** (device shell is Linux). Frontend `tsc`/`vitest`/`build` → **NOT RUN** this stage (no frontend file changed; last known green at the previous stage). Live provider, mailbox, webhook and any production-write tests → **NOT RUN (prohibited)**. Real Supabase staging → **does not exist**.

## 13. Decisions requiring explicit authorization
1. Create a disposable staging environment (cost) or approve a read-only `supabase db dump` to build one. 2. Apply the 8-migration chain to staging, then production, after PITR/backup confirmation. 3. R12 and R14. 4. `20261011093000` (lead RPC execute revoke) and `20261011120000` (client least privilege, which also revokes `TRUNCATE/REFERENCES/TRIGGER` from client roles) — stage first, confirm nothing uses the anon key against PostgREST directly (frontend `src` has no `.rpc(` calls and no Supabase client; verified by search). 5. Backfilling the 37 production-only history entries into the repo. 6. Staff-role matrix for `adminOnly` (AA-A1). 7. Brevo key/sender/webhook configuration and the controlled Gmail test (checklist in `KAYAD_PRODUCTION_MIGRATION_READINESS_20261013.md` §8). 8. Cookie lifetime (7d vs 30d) and logout-then-reuse semantics.

## 14. Verified vs unverified — summary
**Locally verified:** health route ownership and protection; readiness semantics; migration chain applies cleanly, twice, on a production-shaped PG16 baseline; registration RPC, rotation/replay, idempotency and status constraints behave as designed there; controller-level rotation/replay behaviour; all test results in §12.
**Live-read (read-only catalog/counts, 2026-10-13):** missing functions/columns/indexes/constraints; row counts; communication controls; client-role EXECUTE on two lead RPCs.
**Production-unverified:** that the deployed backend actually fails as inferred; Render environment; Brevo account, sender authentication, webhooks; any mailbox receipt; the full 181-file semantic review; behaviour of the chain on the real (not reconstructed) production schema.
