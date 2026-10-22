# KAYAD — Migration Provenance Reconciliation & Staging Certification (Stage 2)

Date: 13 October 2026 · Repository `Themugo/KAYAD` (`C:\Users\hp\Desktop\kayad-fresh`) · Branch `main`
Status vocabulary: PASS / PARTIAL / GAP / BLOCKED / UNVERIFIED / NOT RUN / NEEDS AUTHORIZATION.

**Production was not changed. Nothing was committed, pushed, merged, deployed or provisioned. No production SQL other than read-only catalog `SELECT`s was run. No email, SMS, WhatsApp or payment was sent.**

---

## 1. Executive summary

| Question | Answer |
|---|---|
| Is the foundation intact? | **PASS.** HEAD `3f3ac29c`, `main` in sync with `origin/main`, only `t proxy\` untracked, all 16 convergence files present, 181 migration files. |
| Do the two migration histories reconcile? | **PARTIAL, precisely identified.** 135 production history records vs 181 repo files: 118 repo files MATCHED (97 by version, 21 by name only), 63 repo-only (33 EFFECT_MISSING, 13 CONFLICT, 12 UNVERIFIED, 5 EFFECT_PRESENT_HISTORY_MISSING). **38** production-only records (the earlier report said 37; the correct count is 38). |
| Are the 38 production-only records explained? | **Yes as to origin, no as to source text.** 3 have a same-name file in Git history whose content differs from what production ran; 35 were applied directly to the live project on 2026-09-19/20/22 (the repo's own reconciliation notes say so) and exist in no branch. Their SQL is held in production's `supabase_migrations.schema_migrations` (md5 manifest captured). None of them touch `refresh_tokens`, `communication_deliveries`, `user_auth`, `users` columns, `profiles`, or the registration/sync functions; only `dealers` and `inspector_applications` overlap with the chain and both were analysed and tested. |
| Is the eight-migration chain valid? | **PASS on PostgreSQL 17.6 and 16.15 (local, throwaway)** for: a production-shaped baseline, realistic volume (20k users / 40k legacy tokens), a pre-existing differently-shaped table, partial failure, single-transaction apply, reruns, hostile default privileges, duplicate-email data and concurrency. It is **not** valid on an empty database (needs the baseline). It is **not** certified for production. |
| Defects found in this stage | (1) `kayad_rotate_refresh_token` relies on `REVOKE … FROM PUBLIC`, which does not remove explicit `anon`/`authenticated` grants (reproduced under hostile default ACLs; not present in production's current default ACLs) → candidate step 9. (2) `kayad_create_lead_atomic` is **not idempotent**: no unique index on the lead business key exists in production or in any repo migration → candidate unique index. (3) Lead functions executable by `anon`/`authenticated` (blocked in practice by RLS/table grants). (4) The local rehearsal baseline lacked `BYPASSRLS` on `service_role` (a harness defect, fixed). (5) 21 repo files share a name with an already-applied migration under a different version; for 6 of them the **real DDL sits under the version production lacks**, so a version-keyed `supabase db push` would re-run them. |
| Staging | No approved staging database could be verified. Local PostgreSQL 17.6 (exact production version) is available and used. A hosted staging resource needs explicit approval. |

**Decision: `READY FOR APPROVED STAGING`** — see §16 for the conditions and the exact approval needed. This is not a statement that the chain is safe for production.

---

## 2. Verified starting commit and working-tree status (PASS)

Device preflight (read-only git on the real repo): branch `main`, remote `https://github.com/Themugo/KAYAD.git`, HEAD `3f3ac29c54b65f4a57fa8d7910f87f3fc1af9c5d` ("docs+test: production schema/auth/comms convergence audit; rerun-safe refresh-token migration; rotation tests; onboarding V2 runbooks"), previous `e35399ac`, `main...origin/main` in sync, only `?? "t proxy\"` untracked (preserved, untouched). 706 commits, not shallow. 181 files in `supabase/migrations/`. All 16 convergence files present with matching hashes. `git ls-tree -r HEAD` (4,260 files) blob digests per top-level directory match the scratch tree used for testing, except `runbooks/` (one tracked, superseded file absent from the scratch tree — staged from the device and copied; sha `b023e73047a0` matched) and `logs/` (two empty ignored files).
Note: the foundation in the brief names `e35399ac`; the owner has since committed and pushed `3f3ac29c`, which is what was verified.

## 3. Verification of the previous evidence

Harness audited: `scripts/rehearse-onboarding-migrations-local.sh`, `scripts/rehearsal/onboarding_prod_shaped_baseline.sql`, `scripts/rehearsal/onboarding_assertions.sql`.

| Question | Finding |
|---|---|
| Which migrations ran | Exactly the eight, in order, plus `20260710043210_…sync_profiles_trigger.sql` (loaded with `2>/dev/null` and **no error check** — a masking risk, now fail-tolerant only for that one file and documented). |
| What was simulated | A hand-built baseline from read-only catalog queries: `users` (with production CHECKs), `user_auth`, `dealers`, `refresh_tokens` (plaintext `token`), `communication_deliveries` (7-value status check, no `dead_letter`), `profiles`, `update_updated_at_snake`, RLS enabled, 2 seed dealer users and 1 legacy plaintext token. Production's `dealers` shape was re-checked this stage and equals the baseline's (user FK/unique, `dealer_owner_read` policy and a `trg_dealers_updated_at` trigger exist live but not in the baseline; both irrelevant to the chain). |
| Second run | Genuinely re-executed all eight files (this is what exposed the `20260930110000` `column "token" does not exist` failure, now fixed). Each file was run **outside a transaction**, so it did not test atomicity. |
| Realistic rows | Only 2 users / 1 token. **GAP (now closed):** S6 adds 20k users + 40k legacy tokens, S6b case/space-duplicate emails. |
| Could the harness mask missing production objects | Yes: the baseline is a reconstruction, not a dump; objects the chain does not touch are absent; the sync-profiles trigger file loaded silently. Also, `service_role` was created without `BYPASSRLS` and the earlier run relied on a manual `ALTER ROLE` that was not in the checked-in script — **fixed in the baseline file** this stage. |
| Difference from PG 17.6 | Previous run was PG 16.15. This stage adds **PG 17.6** (exact production minor), pgcrypto 1.3. Still absent locally: supabase_vault, pg_stat_statements, `auth`/`storage` schemas, PostgREST, Supabase-managed default ACLs. |
| Rollback / partial failure / concurrency / pre-existing data | None covered before. Now covered by S2b–S9 (below). |

The disposable databases used here are **not** production and **not** staging.

## 4. Migration reconciliation (full table in `KAYAD_MIGRATION_RECONCILIATION_20261013.tsv`)

Method: production history read from `supabase_migrations.schema_migrations` (135 rows, read-only); repo files parsed (`KAYAD_MIGRATION_INVENTORY_20261013.tsv`); 343 catalog-checkable objects from the 63 non-history files checked live by name (tables, columns, functions, indexes, triggers, policies, constraints); two definition-sensitive constraints compared by definition. A missing history record was **not** read as "unapplied" and a present record was **not** read as "correct". "Existence-only" means definition equality is not proven.

| Status | Count | Meaning here |
|---|---|---|
| MATCHED | 118 | 97 by version; 21 by name only (see §4.1). Effects verified only at table/function-existence level for matched files, except one miss: `handle_new_user` is absent from production although its migration is in history (matched-but-missing). |
| EFFECT_MISSING | 33 | No history record, none of the extracted objects exist. Includes 6 of the 8 chain migrations. |
| CONFLICT | 13 | 11 partial (some objects exist, history absent) + 2 where the constraint exists with a different definition: `20260930113000` (live `communication_deliveries_status_check` lacks `dead_letter`) and `20261012140100` (live `dealer_verifications_verification_status_check` lacks `suspended`). Includes chain member `20261001090000` (only `inspector_applications` exists, with a different shape). |
| EFFECT_PRESENT_HISTORY_MISSING | 5 | `20260929100000`, `20261002130000`, `20261002240100`, `20261009130000`, `20261011220000` — existence only (a column or function by name); not proof they match the file. |
| UNVERIFIED | 12 | No object names to check (data/seed/alter-only): `20260920203000`, `20260928123600`, `20261002090000`, `20261003120000`, `20261004110000`, `20261007170000`, `20261007200000`, `20261010130000`, `20261011093000`, `20261011093100`, `20261011120000`, `20261012103000`. |
| HISTORY_ONLY | 38 | See §5. |
| REPO_ONLY | — | Represented as the 63 non-history rows above. |

Per-file columns delivered in the TSV: filename/timestamp, production history match, live-effect evidence, dependencies (heuristic from created/altered tables), schema/data change, destructive (DROP/TRUNCATE/DELETE), restrictive (NOT NULL, RLS, grants, CHECK, UNIQUE), rerun-safe idioms (heuristic, **not proof**), single-transaction declared, overlap/conflict, rollback text present in file. Only 4 of the 181 files mention a rollback; the real undo for destructive steps is restore-from-backup.

### 4.1 Renumbered duplicates (new finding)
21 repo files carry the **name** of an already-applied migration but a **different version**; both files exist in the repo. 15 are explicit NO-OP stubs under the unrecorded version (harmless). **6 are inverted**: the real DDL sits under a version production does not have, and production's recorded version is a no-op stub in the repo:
`20260918100000` (wave2 transaction invariants, 28 KB), `20260918120000`, `20260918130000` (RLS hardening, rerun idioms absent), `20260921230000` (data), `20260921231000`, `20260921232000`.
Consequence: a version-keyed tool (`supabase db push`, branch creation) would treat these 6 as pending and re-run them against production. The eight-migration runbook applies files explicitly and is unaffected. Do **not** use `db push` until these are reconciled (e.g. `supabase migration repair --status applied …`, which is a metadata write needing authorization).

## 5. The 38 production-only records (`KAYAD_PRODUCTION_ONLY_MIGRATIONS_20261013.tsv`)

| Class (brief's numbering) | Records | Evidence |
|---|---|---|
| (1) deleted/renamed from repo **and** (4) path recoverable from Git | 3: `20260919080655` (recorded as `20260919100000_harden_dispute_rpc_execute_privileges`), `20260919102410`, `20260919102636` | Paths exist in history (commits `a9d519df`, `e134fd59`, `46117919`). **Content differs** from what production ran: Git 396 B vs 139 chars; 10,998 B vs 12,820; 669 B vs 1,099. Equivalence is **UNVERIFIED**; neither is "the" source. |
| (2) applied manually/directly to the live project | 35: phase2…phase22 hardening, admin-control, escrow, inspection, service-job records (2026-09-19/20) and four 2026-09-22 effect-capture/reconciliation records | No path with these names in any branch/remote across all 231 migration paths ever in history. The repo's own `docs/architecture/RECONCILIATION_PHASE8_21_20260920.md` and `docs/history/PHASE22_RECONCILIATION.md` state the live project received these on 2026-09-19/20 and that the live history is authoritative; the repo later consolidated part of this into `20260920220000_phase22_reconciliation.sql` (CONFLICT: 15/17 extracted objects present). |
| (3) another branch / historical release | 0 found | `git log --all` over all refs, including remotes; branches `backup/stage13-before-sync-64071260`, `feature/support-faq-cms-backed`, `stage36-admin-control-plane-audit` and remotes were included. |
| (5) unknown origin | The *text* of the 35 | Recoverable only from production's `statements` column (single-statement records; md5 + length manifest in the TSV so a later read-only fetch can be verified byte-for-byte). Authorship of each is documented only at narrative level. |

Overlap with the onboarding chain, tested by read-only substring flags on the stored statements (booleans only): **none** mention `refresh_tokens`, `communication_deliveries`, `user_auth`, `ALTER TABLE users`, `profiles`, `kayad_register`/`sync_profile`/`sync_dealer`, email uniqueness, `update_updated_at_snake`, or the lead functions. `dealers` appears in 3 (`20260919130150`, `20260920082224`, `20260922060457`); `inspector_applications` in 2 (`20260919102410`, `20260922060249`). 31 of them grant/revoke on `kayad_*` functions (consistent with the live privilege picture in §9).

## 6. Dependency graph and execution order

```
20260930111500 communications idempotency_key + unique indexes
  └─ 20260930113000 status CHECK adds dead_letter (needs communication_deliveries; live CHECK exists w/o dead_letter → replaced)
20260930112000 users: unique(lower(btrim(email)))            (fails loudly on case/space duplicates; live: 0)
20261001090000 dealers cols + dealer sync trigger + dealers backfill + inspector_applications + kayad_register_identity_atomic
  └─ 20261001220000 explicit revokes/re-statement   (ERRORS if the register RPC is absent → must follow 090000)
20260930110000 refresh_tokens hardening: token_hash/family/session…, drops plaintext token (DESTRUCTIVE), kayad_rotate_refresh_token, RLS
20261011090000 users.deactivated_at / granted_permissions / revoked_permissions / last_active
20261011121000 profiles role sync repair (+ revoke client EXECUTE on sync_profile_role_from_user)
[candidate 9] explicit anon/authenticated revokes on the two onboarding RPCs and both sync functions
```
Proven order (V2 and V3): `111500 → 113000 → 112000 → 090000 → 220000 → 110000 → 20261011090000 → 20261011121000`. Not in the chain (separate decisions): R12 `20261012140000`, R14 `20261012140100`, `20260928123600` (provider label drift only — code never reads `canonical_provider`), `20261011093000` (revoke client EXECUTE on all `kayad_*`), `20261011120000` (client-role least privilege).

## 7. Assessment of the eight-migration chain

| Condition | Result | Evidence |
|---|---|---|
| Clean (empty) database | **BLOCKED by design** — stops loudly at the first file (`communication_deliveries` absent); no partial state | S1 |
| Production baseline | PASS, applied twice, each file in its own transaction; assertions: registration, duplicate-email rejection, rotation, replay → family revoked, no token minted on replay, version mismatch, expiry, legacy plaintext token hashed, ledger duplicate/`dead_letter`/bogus-status | S2 |
| Whole chain in one transaction (V3) | PASS twice; 40/40 post-verify; failure injected after step 9 rolls **everything** back (no RPC, no index, `token` column intact) | S2b/S2c |
| Realistic data | PASS: 20k users + 40k legacy plaintext tokens, all hashed, 4–5 s. Case/space-duplicate emails make `20260930112000` fail **loudly** (no silent dedupe) | S6/S6b |
| Objects already present, different shape | PASS but **drift is kept**: production's `inspector_applications` (text[] arrays, integer years, no CHECK, no trigger, 0 rows) survives `CREATE TABLE IF NOT EXISTS`; the chain adds its 3 indexes + trigger only | S8 |
| One migration fails partway | Single-transaction: full rollback. Non-transactional psql: partial state is left (`token_hash`+`family_id` added, `token` kept) and a clean rerun converges; assertions pass afterwards | S3 |
| Concurrency | 30 parallel same-email registrations → exactly 1 success, 29 unique violations, 1 `users` + 1 `user_auth` row. 20 parallel rotations of one token → exactly 1 rotated, 19 `reuse_detected`, and the family ends fully revoked | S7 |
| Does the `20260930110000` guard mask an inconsistent state? | **No.** The guard only skips the plaintext-token backfill when the `token` column is gone. With a NULL `token_hash` row and no `token` column, `SET NOT NULL` fails loudly. With RLS disabled, the rerun re-enables it. Every security statement is outside the guard | S4a/S4b |
| Hostile default privileges | **Finding.** If functions are auto-granted to `anon, authenticated`, the register RPC and sync functions stay closed (explicit revokes in `220000`/`121000`) but `kayad_rotate_refresh_token` ends **executable by `anon` and `authenticated`**, and a rerun of `20260930110000` does not remove an explicit grant. Production's current default ACL for `postgres`-owned `public` functions is `{postgres=X/postgres}` (no auto-grant), so this is **not a proven live exposure**; it depends on the role that runs the migration. Candidate step 9 closes it | S4b/S5 |

Assumptions the chain makes about production, all verified live read-only 2026-10-13: `users` 2 rows (dealer, pending, unverified), `user_auth` 2, `refresh_tokens` 0 (so dropping the plaintext column loses no live session), `dealers` 0 (the backfill will **insert 2 rows**), `communication_deliveries` 0, `profiles` 2, duplicate normalized emails 0, newest history `20260922060457`, none of the eight recorded.

Data/rollback considerations: `20260930110000` is irreversible for the plaintext token column (shape-only rollback; restore-from-backup is the only true undo). The dealers backfill writes 2 rows. `20261001220000`/`20261011121000`/step 9 only tighten privileges and can break any non-service caller (none found; see §9). Applying by psql does **not** record history; record afterwards through the runner or an authorized insert, otherwise a later `db push` would try to re-run them.

**Conclusion:** the chain is internally consistent and its prerequisites and history overlaps are explained. It is **not concluded safe for production**: the baseline is a reconstruction, no hosted staging has run it, 12 repo migrations are UNVERIFIED, the 35 directly-applied records' text has not been read, and the deployed backend compatibility has not been exercised against a real PostgREST.

## 8. Disposable-database results (not production, not staging)

| Run | Command | Server | Result |
|---|---|---|---|
| Extended rehearsal | `PGHOST=/tmp PGPORT=55433 PGUSER=postgres bash scripts/rehearse-stage2-extended-local.sh` | **PostgreSQL 17.6** (x86_64-linux, npm `@embedded-postgres/linux-x64@17.6.0-beta.15`, pgcrypto 1.3, uuid-ossp 1.1) | **56 passed, 0 failed**, exit 0 → `evidence/test_logs/stage2_pg17_6_extended_rehearsal.txt` |
| Extended rehearsal | same, port 55432 | **PostgreSQL 16.15** (Ubuntu) | **56 passed, 0 failed**, exit 0 → `…pg16_15…txt`. Outcomes identical to 17.6 (compared) |
| Original rehearsal | `scripts/rehearse-onboarding-migrations-local.sh` | PostgreSQL 17.6 | `REHEARSAL PASSED (applied twice, assertions green)` |

Scenarios: S1 empty DB · S2 baseline ×2 + assertions + V2 post-verify · S2b/S2c V3 single transaction, twice, 40-check post-verify, atomic rollback · S3 partial failure · S4 guard masking · S5 hostile default ACLs · S6/S6b volume and dirty data · S7 concurrency · S8 pre-existing differently-shaped table · S9 lead functions. Both scripts refuse non-local hosts and database names not starting with `rehearsal`, and ignore `DATABASE_URL`/`SUPABASE_*`. No production credentials or data were used; the seed rows are synthetic.

Differences from production that remain: no supabase_vault / pg_stat_statements / `auth` / `storage` / PostgREST / Supabase default ACLs; catalog-reconstructed baseline.

## 9. Production schema evidence (read-only, project `ubvgixwhfybbyjuvxboj`, PostgreSQL 17.6)

| Check requested | Result |
|---|---|
| `kayad_register_identity_atomic`, `kayad_rotate_refresh_token` | **Absent** (EFFECT_MISSING) |
| `refresh_tokens` hash/family/session/replaced_by/revoked_at/revoke_reason/reuse_detected_at | **Absent** (plaintext `token` still present) |
| `users.deactivated_at`, `granted_permissions`, `revoked_permissions`, `last_active` | **Absent** |
| Normalized-email uniqueness (`uq_users_email_normalized`) | **Absent**; `users_email_key` (exact) exists; 0 normalized duplicates |
| `communication_deliveries.idempotency_key` + its unique indexes | **Absent** |
| Permitted delivery statuses | 7 values, **no `dead_letter`** (definition differs from the file) |
| `dealers` bio/payment_details/onboarding columns, `sync_dealer_profile_from_user`, trigger | **Absent**; `inspector_applications` **present with a different shape** |
| `service_role` | BYPASSRLS = true; `anon`, `authenticated`, `authenticator` = false |
| Default ACLs, functions in `public` | `postgres`: `{postgres=X/postgres}` (no auto-grant). `supabase_admin`: grants to anon, authenticated, service_role |
| Lead functions | see §10 |
| Other live facts | Counts above; `communication_event_controls` 117 rows, channel controls 3; `account.email_verification`, `account.password_reset`, `registration.completed` enabled on email (`canonical_provider='resend'`, a label the code ignores) |
| **UNVERIFIED** | Live definitions of the 35 directly-applied records (text not read); function bodies of matched `kayad_*` functions; whether the deployed backend commit equals `3f3ac29c`; live RLS policy bodies beyond names |

## 10. Lead functions `kayad_create_lead_atomic` / `kayad_transition_lead_atomic`

* **Callers:** only `backend/services/leadService.js` through `getSupabase()`, which creates the client with `SUPABASE_SERVICE_ROLE_KEY`. Reached from `leadController.createLeadManual` (`POST /leads`, `protect` only), `leadController.updateStage` (`PUT /leads/:leadId/stage`, `protect` + in-controller dealer-owner/admin check), `bidController` (`createLeadFromBid`), `paymentController` (→ `escrow_started`), `chatController` (→ `contacted`), `escrowController` (→ `sold`). The frontend has no `.rpc(` and no Supabase client, so the browser is not an intended caller.
* **Live privileges:** owner `postgres`, `SECURITY INVOKER`, `proacl` NULL → default PUBLIC execute → **executable by `anon` and `authenticated`** via PostgREST `/rpc/…`. By contrast `kayad_place_bid_atomic` / `kayad_resolve_dispute_atomic` are `SECURITY DEFINER` and `service_role`-only.
* **Practical exposure: low.** `leads` and `lead_activities` have RLS enabled with a deny-all policy (`USING false`) and `anon`/`authenticated` hold no SELECT/INSERT/UPDATE/DELETE (only the Supabase-default REFERENCES/TRIGGER/TRUNCATE). Locally with the real migration, an `anon` call is rejected (`permission denied for table leads`) and creates no row; `service_role` works. `TRUNCATE` is not reachable through PostgREST.
* **Authorization:** neither function checks the caller; `p_actor_id` is caller-supplied. All authorization is in the controller. `createLeadManual` has no role guard (any authenticated user can create a lead naming themselves as the dealer and any `buyerId`), and after creation calls `lead.save()` on a plain object (would throw → 500 after the row exists). Not changed here (outside the proven-safe-fix scope; recorded for the owner).
* **Proven defect LEAD-1:** `kayad_create_lead_atomic` is not idempotent. It does `INSERT … ON CONFLICT DO NOTHING` then looks up the existing row, but **no unique index on the business key exists** (live: only `leads_pkey` is unique; no repo migration creates one). Every call inserts. Reproduced (S9: repeat → `created=true`, 2 rows). Live `leads` = 0 rows, 0 duplicate keys, so the fix is trivial.
* **Recommended least privilege (not applied):** `REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;` for both — exactly what the existing `20261011093000` already does (verified locally, S9: anon=f authenticated=f service_role=t, backend path still works). Optionally make both `SECURITY DEFINER` only if a non-service caller is ever introduced (not recommended). Add `runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql` (S9: loud failure while duplicates exist; with the index: first create `true`, repeat `false`, 20 concurrent creates → 1 row).

## 11. Application / authentication contract matrix

| Journey | Frontend | Route → controller | Service / model → DB object | Security boundary | Tests |
|---|---|---|---|---|---|
| Registration + safe retry | `src/services/authApi.ts`, `src/api/httpClient.ts` | `POST /auth/register` (`registrationLimiter`, `validateAuth`) → `authController.register` | RPC `kayad_register_identity_atomic` (users + profiles trigger + dealers trigger + user_auth in one transaction) | service_role only; privileged roles rejected in RPC (`22023`) | `backend/tests/validation/registrationContract.test.js`, `registrationPrivilegedRoles.test.js`, `registrationFlow.e2e.test.js`, `tests/onboarding/onboardingFlow.test.js`; DB: S2/S7a |
| Duplicate email | same | same | `uq_users_email_normalized` (unique index) → SQLSTATE 23505 | DB-enforced, atomic (no orphan rows) | assertions B3, S7a (30 parallel → 1) |
| Sign-in | same | `POST /auth/login` (`accountLockout`) | `User`, `UserAuth`, `RefreshToken.create` (`token_hash`,`family_id`,`session_id`) | timing-safe enumeration test | `tests/auth/loginTimingEnumeration.test.js` |
| Access authorization | — | `middleware/auth.js` `protect` | selects `deactivatedAt, grantedPermissions, revokedPermissions`; `findActiveSessionById` | missing columns ⇒ every authenticated request fails today | `tests/regression/protectSecurityState.test.js` (new, 6 tests: fresh security select, deactivated → 403, revoked session → 401, token-version mismatch → 401, permissions carried), `protectLeanRow`, `protectInfraError` |
| Refresh rotation / replay | `httpClient.ts` | `POST /auth/refresh` → `refreshToken` | RPC `kayad_rotate_refresh_token` (row-locking; `rotated`/`reuse_detected`/`not_found`) | replay revokes the family and mints nothing | `tests/auth/refreshRotationContract.test.js`; DB: assertions C1–C8, S7b |
| Logout / revocation | — | `POST /auth/logout`, `/auth/sessions/revoke-all` | `RefreshToken` revoke by session/family | protect | DB-level family revocation proven (assertions C3, S7b); the controller logout path is only statically covered in `tests/security/securityCertification.test.js` — **GAP: no behavioural logout-then-reuse test** |
| Deactivation / permissions | — | `protect` | `users.deactivated_at`, `granted_/revoked_permissions` (20261011090000) | deactivated users blocked (403); owner-email exempt (existing behaviour) | `tests/regression/protectSecurityState.test.js` (new); before this stage **no test mentioned deactivation (GAP, now closed)** |
| Email-verification lifecycle | — | `GET /auth/verify-email/:token`, `POST /auth/resend-verification` | `user_auth.email_verify_token/expire`; comms gateway `account.email_verification` | rate limiters | `tests/regression/onboardingEmailWorkflow.test.js` |
| Comms ledger / retry / dead-letter | — | gateway `recordDelivery` | `communication_deliveries.idempotency_key` (unique on provider,channel,key where not null); status incl. `dead_letter` | service_role; RLS | `tests/communications/recordDelivery.test.js`, `regression/communicationsLaunchReadiness.test.js`; DB: D1/D2 |
| Admin health | — | `GET /health/deep` (`protect` + `adminOnly`) | `checks.communications` via bounded readiness service | `adminOnly` admits all staff roles (open item AA-A1) | `tests/regression/healthRouteComposition.test.js` (Vitest, real `server.js`) |

Every journey that needs the new objects fails today against production because the objects are absent. The frontend never talks to PostgREST.

## 12. Staging options and required approval
See `KAYAD_STAGING_DECISION_20261013.md`. Minimum next approval: authorize **one read-only, schema-only dump of production** into a local PostgreSQL 17.6 (no data, no secrets); and, separately and in writing, any hosted staging resource (option, cost ceiling and end date, key holder, providers disabled). Nothing was created.

## 13. Proposed preflight → apply → post-verify → rollback (candidate; NEEDS AUTHORIZATION; not run)
1. Confirm approved staging; backup/PITR point recorded.
2. `runbooks/ONBOARDING_V2_1_PREFLIGHT_READONLY.sql` (unchanged; reused). Every row must match the baseline.
3. `psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql` — one transaction; includes candidate step 9.
4. `runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql` — 40 checks, all `true`.
5. Record migration history through the runner (or authorized insert).
6. Deploy matching backend; run the smoke sequence in the staging document.
7. Rollback: failure before commit ⇒ automatic full rollback; after commit ⇒ restore from backup; `ONBOARDING_V2_4_ROLLBACK_LIMITS.sql` documents the shape-only limits. The V2 files are unchanged.
Separate, optional, each needing its own approval: `LEADS_V1_CANDIDATE_unique_business_identity.sql`, `20261011093000`, `20261011120000`, R12, R14.

## 14. Risks and unresolved items
* Baseline fidelity (reconstructed) — closed by the schema-only dump.
* 35 directly-applied records: text unread; equivalence of the 3 Git-recoverable ones unproven.
* 6 inverted duplicate pairs: `db push`/branching would re-run real DDL (rerun idioms absent in two).
* 12 UNVERIFIED and 11 partial-effect repo migrations: not in the chain; unresolved for later stages.
* Existing-table drift (`inspector_applications`): `years_of_experience` is `integer` in production but the file/model use numeric(5,2); a decimal value would be rejected until the table is aligned (not part of the chain).
* Logout-then-reuse and two-tab refresh races revoke the whole family (by design: 19 of 20 concurrent rotations were treated as replay). Cookie lifetime (7-day cookie vs 30-day DB session) unchanged.
* `adminOnly` admits all staff roles (AA-A1). `createLeadManual` lacks a role guard and a `.save()` defect (§10).
* Data change: dealers backfill inserts 2 rows; plaintext token column dropped (0 rows today).
* Providers: Brevo key/sender/webhook and the controlled Gmail test remain owner decisions.

## 15. Tests run (exact command · environment · exit code · result)
Environment: Linux scratch copy of the committed tree (`/home/claude/s2/kayad-fresh`; content hash-verified against `git ls-tree` of `3f3ac29c`, plus the Stage 2 files listed in §17), Node 22.23.2. **Native Windows execution is not possible from the device shell**: it is a Linux VM over a Windows-installed `node_modules` and fails to load the platform-specific rolldown native binding; the Windows build/test run is therefore **NOT RUN**.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `cd backend && npm run test:jest` (`node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --passWithNoTests`) | 0 | **93 suites, 1288 tests passed** (includes comms validation, auth/refresh, rerun-safety, registration/db-contract, security/RLS/transaction suites, and the two new test files) |
| 2 | `cd backend && npm run test:vitest` | 0 | **6 files, 36 tests passed** (includes health-route regression, real `server.js`) |
| 3 | `cd backend && npm run test:node` | 0 | 1 test passed |
| 3b | `npm test` (root, frontend `vitest run`) | 0 | **81 files; 643 passed, 1 skipped** |
| 4 | `npm run lint` (`tsc --noEmit`, root/frontend) | 0 | clean |
| 5 | `npm run build` (`vite build`) | 0 | built; only the chunk-size warning |
| 6 | `bash scripts/rehearse-stage2-extended-local.sh` on PG 17.6 | 0 | 56 passed / 0 failed |
| 7 | same on PG 16.15 | 0 | 56 passed / 0 failed |
| 8 | `bash scripts/rehearse-onboarding-migrations-local.sh` on PG 17.6 | 0 | passed |
| 9 | Mutation checks: weakening step 9's revoke fails the V3 test (1 failed / 5 passed); disabling the deactivated check, and separately the revoked-session check, in `middleware/auth.js` each fails `protectSecurityState` (1 failed / 5 passed); all restored byte-for-byte (diff clean) | — | PASS |

Backend typecheck: not applicable (plain JavaScript; the root `tsc` covers the TypeScript frontend). **NOT RUN:** Playwright/browser E2E, ESLint/prettier, the historical `validate:*` scripts (their last run is the previous stage's `evidence/test_logs/validate_*.txt`), any test against a hosted Supabase. **Failed:** none in this stage. (During the stage: the harness's missing `BYPASSRLS` and one over-broad test regex were fixed; each failure was real and is recorded under changes.) Logs: `evidence/test_logs/stage2_*`.

## 16. Final decision

**READY FOR APPROVED STAGING**

Evidence: the eight-migration chain and its dependencies are fully identified; every prerequisite it relies on was read live (counts, shapes, privileges, defaults) and each discrepancy that touches it is explained (inspector_applications shape, dealers backfill, dead_letter definition, absent objects); it passes on PostgreSQL 17.6 and 16.15 across clean/baseline/volume/pre-existing/partial-failure/transaction/concurrency/privilege scenarios; the `20260930110000` guard was shown not to mask security changes; the remaining history discrepancies (38 production-only, 63 repo-only, 21 renumbered) are classified and none overlaps the chain's objects beyond `dealers`/`inspector_applications`. The decision does **not** assert production safety and is conditional on approval of a staging environment.

**Exact approval required next** (any one unlocks the next step; nothing is assumed):
1. "Authorize a read-only, schema-only dump of production for a local PostgreSQL 17.6 rehearsal" (smallest, no cost); and/or
2. Written approval for one named staging option (existing database, or a new Supabase project/branch with a cost ceiling and end date), with providers disabled and its own keys; and
3. Decisions on: candidate step 9, the lead unique index, `20261011093000`/`20261011120000`, and the 6 inverted duplicate files' repair.

Git commands for later use (not executed; single lines):
```
cd C:\Users\hp\Desktop\kayad-fresh
git status
git add KAYAD_MIGRATION_PROVENANCE_AND_STAGING_CERTIFICATION_20261013.md KAYAD_STAGING_DECISION_20261013.md KAYAD_MIGRATION_RECONCILIATION_20261013.tsv KAYAD_PRODUCTION_ONLY_MIGRATIONS_20261013.tsv runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql runbooks/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql scripts/rehearse-stage2-extended-local.sh scripts/rehearsal/onboarding_prod_shaped_baseline.sql backend/tests/regression/onboardingV3CandidateRunbook.test.js backend/tests/regression/protectSecurityState.test.js evidence/test_logs
git commit -m "docs+test: migration provenance reconciliation, staging decision, onboarding V3 candidate runbook, PG17.6 extended rehearsal"
git push origin main
```

## 17. Local changes made this stage (all uncommitted)
New: this document · `KAYAD_STAGING_DECISION_20261013.md` · `KAYAD_MIGRATION_RECONCILIATION_20261013.tsv` (181 rows) · `KAYAD_PRODUCTION_ONLY_MIGRATIONS_20261013.tsv` (38 rows) · `runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql`, `…V3_3_POSTVERIFY_READONLY.sql`, `…V3_CANDIDATE_9_explicit_client_revokes.sql` · `runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql` · `scripts/rehearse-stage2-extended-local.sh` · `backend/tests/regression/onboardingV3CandidateRunbook.test.js` (7 tests) · `backend/tests/regression/protectSecurityState.test.js` (6 tests) · `evidence/test_logs/stage2_*`.
Modified: `scripts/rehearsal/onboarding_prod_shaped_baseline.sql` (adds `alter role service_role bypassrls`, matching production).
Unchanged: every file under `supabase/migrations/`, the V2 runbooks, all backend source, `t proxy\`.

## 18. Production status
**Unchanged.** Only read-only catalog and `schema_migrations` queries were issued (object names, definitions, counts, statement lengths and md5s; no row data, tokens, credentials or personal information was read or printed). No migration was applied, no configuration changed, and no staging resource was created.
