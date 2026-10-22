# KAYAD — Stage 3 of 12: Database Contract, RLS & Staging-Rehearsal Readiness (2026-10-18)

## 1. Executive summary and disposition

> **Stage 3 status: BLOCKED — G0 unresolved.** Live database verification: **NOT CERTIFIED.**
>
> The linked Windows computer was unreachable (`get_device_info` failed twice: "device not connected to the bridge"). Without it, none of these could be done:
> - reconcile the Stage 2 patch into `kayad-fresh`;
> - confirm the five recovered files and the two unusually named files;
> - run the regressions on the integrated tree.
>
> Under the Stage 3 rules, I therefore **stopped all database-dependent execution**: no disposable or staging rehearsal, no migrations, and **no source changes**. The permitted non-invasive review was carried out in full against the latest verified artifact, `KAYAD-STAGE2-ENTRY-CORRECTIONS-20261018.zip` (SHA-256 `c35460268a84e1f503faace99249ae1cd29238ab39fd86cf9d60dce0da70bbcf`), extracted read-only.

**What the static review established:**

- **G1 is real, wider than Stage 2 reported, and production-relevant.**
  - All 31 `audit_logs` write sites (29 awaited, 2 best-effort helpers), plus `auditController`'s readers, depend on `audit_logs` columns (`actor`, `target`, `target_model`, `admin`, `admin_id`, `user_id`, `metadata`, …) that **no migration creates**.
  - The read-only production-catalog diff of 2026-10-11 reported column differences for 18 tables, and **`audit_logs` is not among them**. On that dated evidence, production also lacks these columns.
  - Consequence: if unchanged since then, governance writes, up to 22 admin mutations in `adminRoutes.js` (including the **emergency kill-switch**; 3 of them catch locally) and others **commit their domain change and then return HTTP 500**. `rbac.requirePermission`'s access-denied log turns 403s into 500s.
  - Remedy: an additive, nullable column migration, drafted and **not applied** (§4).
- **G2 is real.** `rejected` is a canonical application state: 3 writers, 7 server readers and the admin/dealer UI. The source `cars_status_check` excludes it (confirmed in the replay inventory). Remedy: an owner decision (D3), then a drafted CHECK extension, **not applied** (§5).
- **G3 is a deployment-ordering problem, not a code defect.** `kayad_register_identity_atomic` is correctly defined: `SECURITY DEFINER`, pinned `search_path`, schema-qualified relations, role allowlist, and EXECUTE for `service_role` only. It sits at position 4 of an already-documented 8-migration chain. Remedy: the existing authorization-gated runbook (§6).
- **Correction to my own Stage 2 report (S2-ATTR-01).** I stated that `feature_flags.created_by/updated_by` "exist in source". **That was wrong.** No `.sql` file creates `feature_flags`; my Stage 2 check ran `grep -r` with an empty file list, which searched the whole tree. The Stage 2 change now sends a real `created_by`/`updated_by` value where it previously sent `undefined`, which was dropped. If the hosted table lacks those columns, feature-flag create/update would fail. An optional revert patch is included. Preflight G1-c decides between keeping it and reverting it.

**Not done:** no commit, push, deploy, migration, production or staging connection, account change, or financial or provider action.

## 2. G0 reconciliation evidence

| Step | Result |
|---|---|
| 1. Directory/branch/HEAD/status of `kayad-fresh` | **NOT RUN** — computer unreachable (2 attempts) |
| 2. Cumulative patch and manifest | Present locally: `KAYAD-CUMULATIVE-STAGE1-STAGE2-20261018.patch`. `git apply --check` passed on foundation `d1fb0497` (Stage 2). Not checked against `kayad-fresh`. |
| 3–5. Applied already? Conflicts? | **NOT RUN** |
| 6. Five recovered files | **NOT VERIFIABLE.** They are absent from every artifact available to me (the original foundation and both checkpoints). This includes `runbooks/APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md`, which Stage 3 names as its starting point, so this package builds on the in-artifact `supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql`, `runbooks/identity-staging/*` and `runbooks/ONBOARDING_V2_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql` instead. |
| 7. `"t proxy\357\200\242"`, `tatus --short` | **NOT INSPECTED** (absent from the artifacts). They look like stray output from mistyped commands (`git status --short` missing its first two characters; a Windows private-use character). Keep them until `git log --all -- "<exact path>"` establishes their origin. |
| 8–9. Regressions on the integrated tree, hash comparison | **NOT RUN** on `kayad-fresh`. Last verified on the artifact during Stage 2: backend Jest 1403/1403, Vitest 36/36, node 1/1, `tsc` and build PASS, Playwright 20/20 (backend-free), clean-extraction reproducibility PASS. |

## 3. Inventory and provenance (static and recorded evidence only)

| Object | Source definition | App dependency | Verification level | Status | Next action |
|---|---|---|---|---|---|
| `audit_logs` (10 columns) | `20260710043238_…gari_motors_full_schema.sql:435`; `+actor_role,actor_name` `20260710044700_…:101-102` | §4 matrix | Static, plus a recorded production column-diff (2026-10-11) | **Mismatch** with application contract | Preflight G1, then candidate 02 |
| `cars_status_check` | `20260710043200_…foundational_tables.sql:207`; replay inventory: `CHECK (status = ANY ('available','sold','pending','reserved','hidden','draft'))` | §5 | Static and replay | **Mismatch** (`rejected`) | D3, preflight G2, then candidate 03 |
| `kayad_register_identity_atomic(text×6,uuid,text,text,timestamptz)` | `20261001090000…:102-152`; grants restated in `20261001220000…:31-34` | `authController.register` | Static | Source correct; **reported absent in production** (2026-10-11/13) | G3 chain (§6) |
| `kayad_reverse_ledger_entry_atomic(uuid,uuid,text)` | `20260901210000…:600,679-680` | `ledgerService.reverseLedgerEntry` (Stage 2 now passes a real user id) | Static | Consistent | — |
| `kayad_resolve_dispute_atomic` / `kayad_transition_dispute_atomic` | `20261002180000…:71` (latest), `20260909084443…:36` | `disputeController` (Stage 2 role fix) | Static | Consistent: DB accepts `admin`/`superadmin`/`escrow_officer` | — |
| `feature_flags` | **No DDL anywhere in the repository** | `featureFlagService` (`created_by`/`updated_by`) | Static | **Unknown** (hosted: unknown) | Preflight G1-c |
| `security_logs`, `transaction_ledger`, `disputes` | **Not created by repository migrations** (replay) | `securityLogger` (best-effort), others | Static and replay | Unknown / hosted-only candidates | Export hosted DDL (existing recommendation, 2026-10-11 §2) |
| Migration chain | 181 files, unique 14-digit versions | — | Static (`validate-supabase-migrations` PASS in Stage 2) | Production 52+ versions behind (2026-10-11); 38 production-only versions without SQL | G3 |

Recorded evidence used (not re-executed):
- `docs/audits/08-SUPABASE-SCHEMA-RECONCILIATION-20261011.md`, a read-only production catalog diff covering 209 tables: 24 production-only, 16 repository-only, 18 with different columns;
- `docs/audits/evidence/supabase-reconciliation-20261011/repo-inventory-supabase-defaults.json`, a replay on PostgreSQL 16.15.

Both are **dated**. Production may have changed since.

## 4. G1 — Audit schema contract and atomicity

**The mapping is plain camel→snake.** `utils/fieldMap.js` has **no `audit_logs` aliases**, and `models/_base.js#create` inserts the mapped keys with **no stripping**. PostgREST rejects unknown columns (PGRST204). Values that are `undefined` vanish during JSON serialization, which is why `admin: req.user._id` (always `undefined`) was harmless and `adminId: req.user.id` is not.

Full per-site list: `g1_audit_write_sites.tsv` (31 write sites).

| App key → column | In source `audit_logs`? | Writers (examples) |
|---|---|---|
| action → `action` | yes | all |
| details → `details` | yes | most |
| actorRole/actorName → `actor_role`/`actor_name` | yes | announcement, bulkAdmin, auditService |
| createdAt → `created_at` | yes | governance |
| **actor → `actor`** | **no** (source has `actor_id`) | governance, announcement ×3, bulkAdmin ×2, auditService |
| **target, targetModel → `target`, `target_model`** | **no** | governance, announcement ×3, adminRoutes ×9, auditService |
| **admin, adminId → `admin`, `admin_id`** | **no** | adminRoutes ×13 (the other 9 send `admin: req.user._id`, i.e. `undefined`, which is dropped), middleware/auditLog |
| **userId, metadata → `user_id`, `metadata`** | **no** | `rbac.requirePermission` access_denied |
| **actorEmail, targetName, oldValue, newValue, changes, ipAddress, userAgent, requestId, sessionId, severity** | **no** (only `ip_address` exists) | `auditService.logAuditEvent` |

**Failure semantics and transaction boundaries.** None of these writes share a transaction with the domain write. They are separate PostgREST calls.

| Path | Behaviour | Effect if the columns are absent |
|---|---|---|
| Governance (`governanceController.audit`) | Strict since 2026-10-17 | Domain row committed, then **500** |
| adminRoutes ×22 (3 catch locally), announcement ×3, bulkAdmin ×2 | Awaited | Domain write committed, then **500**. Example: kill-switch upsert at `adminRoutes.js:830-838`, then `AuditLog.create`. |
| `rbac.requirePermission` | Awaited inside try | **500** instead of 403. Still fail-closed, but the wrong status. |
| `auditService.logAuditEvent`, `middleware/auditLog.logAuditAction`, `securityLogger` | Best-effort (catch + log) | Audit silently lost; error logged |
| Readers (`auditController` ×3 filters/populate on `actor`/`target`; `governanceController.getAuditLogs`) | — | Errors or empty results |

**Money and privilege history.** Escrow, ledger, dispute and fulfilment transitions keep their own **atomic** DB history: `escrows.history` (written inside `kayad_transition_escrow_atomic`), ledger RPCs, `auction_fulfilment_events` and dispute RPCs. They do not depend on `audit_logs`. Privilege changes in `adminRoutes` (verify, activate, deactivate, delete user) do depend on it, and are affected.

**Recommendation.** Apply candidate **02** (additive, nullable columns plus two indexes) after preflight G1 confirms the gap on an identified target. It is backward-compatible: existing rows and readers are untouched, no code changes, and strict semantics are kept.

Two alternatives were rejected:
- **A field-mapping serializer onto existing columns.** It requires rewriting 31 writers and 3 readers, and cannot represent `admin_id`, `target` and similar fields without overloading `details`.
- **Making the writes best-effort.** It changes the strict governance contract silently, which the prompt forbids.

**Regression tests.** These must run against a disposable database that has the candidate applied. They are **NOT RUN**, because database execution is blocked by G0. Required:
1. A governance create returns 200 and writes exactly one `audit_logs` row.
2. The kill-switch returns 200.
3. An access-denied request returns 403 and writes a row.
4. With the column temporarily absent, the domain write's response is a 500 that the test asserts on. This documents the hazard.

## 5. G2 — Listing status and constraint

**Status-transition matrix** (from source):

| Transition | Initiator / permission | Ownership | Preconditions | Database constraint (source) | Side effects / history | UI |
|---|---|---|---|---|---|---|
| create → `available` / `pending` | dealer or individual_seller (`dealerOnly`) | Self | `available` only if the seller is approved | Allowed | audit (best-effort), entitlement RPC | Listing card / "pending" |
| `pending`/any → `available` (approve) | admin, superadmin, owner (`adminOrSuper`) | Any | `moderationBlockedReason` (not sold) | Allowed | Notification to the seller | Moderation queue |
| any → **`rejected`** (moderation reject) | admin, superadmin, owner | Any | Not sold | **Violates CHECK** | Notification; bidding frozen (bid/auction readers) | Admin moderation; dealer listings |
| any → **`rejected`** (duplicate) | admin, superadmin (`allowRoles`) | Any | — | **Violates CHECK** | Duplicate flag | Admin |
| any → **`rejected`** (report "listing_removed") | admin, superadmin, **moderator** | Any | **No sold-listing guard** | **Violates CHECK** | Report record | Admin reports |
| own → `available`/`sold`/`pending`/`hidden`/`draft` (bulk) | Approved seller (Stage 1) | Own, not `rejected` | Allowlist | Allowed | `bulk_status_update` log | Dealer listings |
| → `sold` | Escrow release (DB fn), settlement, fulfilment, payment, mark-sold | System or party | State-machine rules | Allowed | Escrow history, ledger | Sold badge |
| → `available` (auction outcome cancelled) | Organizer | Own | Unpaid, unfunded | Allowed | Fulfilment event | — |
| `reserved` | **No application writer found** | — | — | Allowed | — | Dealer dashboard reads it |

**Recommendation for D3: keep `rejected` as the canonical admin-only state.** Do not map it to `hidden`. `hidden` is seller-settable, so mapping `rejected` to it would let a rejected listing be re-published, undoing R15 and the Stage 1 protections.

After the preflight G2-a/b read, apply candidate **03**: drop and re-add `cars_status_check` with `rejected` (`NOT VALID`, then `VALIDATE`).

Additional finding **S3-MOD-01 (Low/Medium)**: the report path lets **moderators** reject listings, with no sold-listing guard. Confirm whether moderators should hold this authority (folded into D2/D3).

## 6. G3 — Identity migration chain

**Dependency graph.** This is the existing, rehearsed order from `KAYAD_PRODUCTION_SCHEMA_AUTH_COMMS_CONVERGENCE_20261013.md` §10. It was not re-run here.

```
#1 20260930111500 communication_deliveries idempotency
 → #2 20260930113000 dead_letter CHECK
 → #3 20260930112000 unique lower(btrim(email))      [fails on collisions]
 → #4 20261001090000 dealers cols + sync trigger + inspector_applications + kayad_register_identity_atomic
 → #5 20261001220000 grants/RLS restatement            [errors if #4 absent]
 → #6 20260930110000 refresh_tokens hardening          [DESTRUCTIVE: drops plaintext token; point of no return]
 → #7 20261011090000 users security columns (protect() needs these)
 → #8 20261011121000 profiles role sync (data-changing)
 then, under separate approval: R12 20261012140000, R14 20261012140100, 20261011093000
```

**Function contract (verified statically).**
- Arguments: text×6, uuid, text, text, timestamptz. Returns jsonb.
- `SECURITY DEFINER` with `SET search_path = public`. Every relation is `public.`-qualified, so it is not exposed to `pg_temp` shadowing.
- Role allowlist: `user`/`individual_seller`/`dealer`. `user` is auto-approved; others start pending.
- One transaction covers the `users` and `user_auth` inserts.
- Privileges: `REVOKE ALL … FROM PUBLIC`, `REVOKE EXECUTE … FROM anon, authenticated`, `GRANT EXECUTE … TO service_role`.
- Matches `authController.register`, which already returns a controlled `DATABASE_MIGRATION_REQUIRED` when the function is absent.

**Carried evidence, not re-verified:**
- From the 2026-10-11/13 read-only production catalog: the function is absent; there are 16 repository-only and 24 production-only tables; 38 production-only migration versions have no SQL in the repository; R12/R14 are not applied.
- Owner-identity facts carried from 2026-10-15: production showed two dealer users and no owner account.

Do not promote or recreate accounts.

**Preflight:** `01_READONLY_PREFLIGHT_G1_G2_G3.sql` §G3. **Post-verify:** `04_READONLY_POSTVERIFY.sql`.

**Rollback limits.** #6 is irreversible because it drops the plaintext token column. #3 can only be rolled back by dropping the index. #8 leaves repaired rows in place. Every step needs a fresh backup and the matching backend deployment in the same window.

## 7. RLS, grants and role-operation matrix

`rls_grants_matrix_replay_20261011.tsv` holds the static and replay figures. **Every in-scope table has RLS enabled.** None has `FORCE ROW LEVEL SECURITY`.

The grant/policy picture for `anon` and `authenticated` follows Supabase defaults: full table privileges. Without a permissive policy, RLS makes those **deny-all**.

Tables with policies:

| Table | Policies |
|---|---|
| `dealers` | 1 |
| `auction_setups` | 3 |
| `auction_outcomes` | 1 |
| `auction_fulfilment_events` | 1 |
| `dealer_payouts` | 2 |
| `communication_deliveries` | 1 |

**Every other table has 0 policies**, including `users`, `user_auth`, `refresh_tokens`, `cars`, `audit_logs`, `escrows`, `payments` and `ledger_entries`. That means deny-all for client roles.

| Role × operation | Expected result | Basis |
|---|---|---|
| anon / authenticated × any on identity, financial or audit tables | Denied (RLS, no policy) | Replay inventory. Live: **NOT CERTIFIED** (preflight G1-d; `INVENTORY_SCHEMA_SECURITY.sql`). |
| anon / authenticated × EXECUTE `kayad_register_identity_atomic` | Denied | Explicit REVOKE |
| service_role × all | Allowed (bypasses RLS) | Server-only key. The frontend has no Supabase client (2026-10-11 §1). |
| Application roles (admin, escrow_officer, …) | Enforced in Express middleware, not in the database | DB functions check `p_role` (dispute and escrow functions accept admin/superadmin/escrow_officer) |

**Risks recorded:**
1. `FORCE RLS` is off. The table owner (`postgres`) bypasses RLS, which is acceptable for migrations.
2. The source `audit_logs` policy `insert_audit_logs … TO authenticated WITH CHECK (true)` appears dropped in the replay (0 policies). Confirm live.
3. **Application-role aliases.** `executive`, `staff` and `super_admin` do not exist in the database's accepted role sets (D7).

## 8–9. Rehearsal package, post-verification and rollback

| File | Purpose | Status |
|---|---|---|
| `01_READONLY_PREFLIGHT_G1_G2_G3.sql` | SELECT-only inside `BEGIN TRANSACTION READ ONLY … ROLLBACK`. No personal data or secrets. | Parses (libpg_query). **NOT RUN.** |
| `02_G1_CANDIDATE_audit_logs_contract_columns_NOT_APPLIED.sql` | Additive nullable columns plus 2 indexes, `lock_timeout 5s` | Parses. **NOT APPLIED.** |
| `03_G2_CANDIDATE_cars_status_rejected_NOT_APPLIED.sql` | CHECK swap, `NOT VALID` then `VALIDATE` | Parses. **NOT APPLIED.** Blocked on D3. |
| `04_READONLY_POSTVERIFY.sql` | Column, constraint and grant assertions with expected values | Parses. **NOT RUN.** |
| `OPTIONAL_REVERT_S2-ATTR-01_featureFlag_attribution.patch.txt` | `git apply -R` restores the pre-Stage-2 feature-flag attribution | Reverse-apply checked on the Stage 2 tree |
| Existing, reused: `runbooks/ONBOARDING_V2_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql`, `runbooks/COMMS_STEP1-4_*`, `runbooks/identity-staging/*`, `supabase/preflight/*` | G3 and communications chain | Unchanged |

**Rehearsal order, once G0 has cleared and with approval for each step:**
1. **Disposable PostgreSQL.** Replay all 181 migrations, then 02 and 03, re-run them to confirm idempotency, then run 04. Confirm the endpoint is local and disposable before any write.
2. **Identified staging branch.** Run 01 read-only, then the G3 chain in order, then 02 and 03, then 04, then the HTTP checks listed at the end of 04.
3. **Production.** Only after (1) and (2), with a backup and the matching backend.

## 10. Owner decision register

| ID | Evidence | Options | Recommendation | Blocks |
|---|---|---|---|---|
| **D1** escrow_officer dispute resolution | The controller staff list and the DB function accept `escrow_officer`. `PERM` gives it no `APPROVE_ESCROW_RELEASE`/`APPROVE_ESCROW_REFUND`. | (a) keep, and grant the two permissions to the role explicitly; (b) restrict resolution to holders of both permissions | **(b)**, then grant per person through existing per-user grants | Dispute-path hardening |
| **D2** read/mutate for ledger, fraud, communications, reliability; moderator report-removal | `adminOnly` = any staff role. Stage 2 permissioned ledger writes only. | Per-domain `requirePermission` (`MANAGE_FINANCE`, `VIEW_LOGS`, `MANAGE_MODERATION`, …) | Define the matrix, then apply guards with tests | Authz convergence |
| **D3** `rejected` | §5 | (a) canonical, plus CHECK candidate 03; (b) replace with `hidden` (unsafe); (c) a new `removed` status | **(a)** | G2 apply |
| **D4** dealer self-release blocked | Stage 2 S2-ESC-01; DB state machine forbids seller release | (a) keep; (b) dealer-initiated *request* with KAYAD approval (the buyer request-release path already exists) | **(a)**, optionally plus a UI pointer to the approval status | Fulfilment UX |
| **D5** `bun.lock` | 29 of 34 entries mismatch; CI uses npm | Retire / keep | **Retire** (owner approves the deletion) | Package hygiene |
| **D6** missing backend scripts, DLQ `markAsResolved` | 4 scripts point at absent files; `JobFailure#markAsResolved` is undefined | Restore / retire / implement | Retire the scripts; implement `markAsResolved` against `job_failures` after a column check | Ops tooling |
| **D7** `executive`, `staff`, `super_admin` aliases | Not in `ROLE_HIERARCHY`; the DB rejects `executive` in disputes | Remove / define | **Remove** from lists | Role convergence |

## 11. Source changes and tests

**None in Stage 3.** G0 forbids source changes to an unintegrated tree. The only code-adjacent output is the optional revert patch. No tests were added or run in this stage.

## 12. Test and build results

| Check | Stage 3 result |
|---|---|
| SQL syntax (libpg_query via `pglast`) on 4 package files | **PASS**, static only: 17, 6, 6 and 5 statements |
| Database execution (disposable, staging, production) | **NOT RUN** (G0) |
| Backend, frontend and E2E suites on `kayad-fresh` | **NOT RUN** (unreachable) |
| Same suites on artifact `c354…` | Last run in Stage 2: all pass (see the Stage 2 report). Not re-run because nothing has changed. |

## 13. Remaining blockers

| Sev | Blocker | Owner | Next dependency |
|---|---|---|---|
| **Critical** | G0: integrate into `kayad-fresh` and verify the five recovered files | Owner (computer online, or run §12 of the Stage 2 report) | None |
| **High** | G1 audit columns: post-commit 500s on governance, admin and kill-switch paths | Owner + DB | G0, then preflight 01, then disposable rehearsal, then 02 on staging |
| **High** | G3 identity chain absent in production (registration) | Owner + DB | G0, then the existing ONBOARDING runbook on staging |
| Medium | G2 `rejected` vs CHECK | Owner (D3) | D3, then 01, then 03 |
| Medium | S2-ATTR-01 unverified column dependency | Owner | Preflight G1-c → keep or revert |
| Medium | D1, D2, D7 authorization policy | Owner | Decisions |
| Low | S3-MOD-01: moderator report-removal has no sold guard | Owner | D2/D3 |

## 14. Evidence categories

| Category | Contents |
|---|---|
| Static/source | Everything in §3–§7 derived from repository files, plus SQL parsing |
| Recorded historical | The 2026-10-11/13 read-only production catalog reads and the replay inventory. Dated, **not re-verified**. |
| Local runtime | Stage 2 test runs on the artifact. **None new in Stage 3.** |
| Disposable DB / staging / production | **None produced.** |

**Nothing here certifies the live schema, RLS, registration, audit behaviour, or production readiness.**
