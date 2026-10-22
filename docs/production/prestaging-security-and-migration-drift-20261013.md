# KAYAD — Stage 3: Security Hardening, Migration Drift Resolution & Pre-Staging Certification

Date: 13 October 2026 · Repository `Themugo/KAYAD` · Branch `main` · Foundation commit `194cc807` (see §2)
Status vocabulary: PASS / PARTIAL / GAP / BLOCKED / UNVERIFIED. Every result below was observed in this pass unless marked *Stage 2* or *historical*.

**Production was not touched in Stage 3: no SQL of any kind (not even read-only), no export, no migration, no grant, no deploy, no commit, no push,
no message or payment. All database work ran on disposable local PostgreSQL 17.6 and 16.15. Production facts quoted here come from the earlier
read-only captures (2026-10-11 and Stage 2, 2026-10-13) and are labelled as such.**

---

## 1. Executive summary

| Area | Status | One-line result |
|---|---|---|
| Foundation integrity | **PASS** | Supplied ZIP == `origin/main` `194cc807` byte-for-byte (4,281 files); `194cc807` is the Stage 2 work committed on top of the reported `3f3ac29c`. |
| Lead authorization | **PASS (local)** | `POST /api/leads` had no role guard. Now `protect → dealerOnly → zod validation`, caller is always the lead's dealer, vehicle must be the caller's. 30 tests; mutation-checked. |
| Lead persistence | **PASS (local)** | `lead.save()` on a plain row (in `createLeadManual` **and** `addNote`, which was 100 % broken) replaced by a service-level `update()` path. |
| Lead idempotency | **PARTIAL** | Root cause proven: the SQL function inserts before it looks up, so its own find-or-create key never matches. `LEADS_V2` candidate (no index, no data cleanup) passes 30-way concurrency on PG 17.6/16.15. **Not applied — production still duplicates.** |
| Refresh-token security | **PARTIAL** | Rotation/replay/logout behaviour proven locally (new behavioural logout test). Production still lacks the rotation objects (Stage 2 read) — chain not applied. |
| Function privileges | **PARTIAL** | Role matrix proven for all four functions under stock, hostile and remediated ACLs. Remediation = existing `20261011093000` + Stage 2 step 9 + new search-path candidate. Not applied; production lead functions are PUBLIC-executable (*Stage 2 read*). |
| RLS | **PARTIAL** | Lead tables: deny-all RLS blocks anon/authenticated even with hosted-style ALL grants (proven locally). Production policy bodies UNVERIFIED. |
| Migration provenance | **BLOCKED** (bounded) | 35 directly-applied records: SQL text exists only in production. 3 Git-recoverable ones: proven **different** from every Git version. History unchanged between 11 and 13 Oct. Needs the read-only export in §M/runbook. |
| Duplicate-version remediation | **PARTIAL** | 6 inverted pairs analysed individually: 2 proven equal to production (md5), 1 proven different in ≥1 char, 3 equal in Git but no production digest. Re-running `20260918100000` would **overwrite 9 financial RPC bodies** → `db push` now fail-closed in both scripts. |
| Inspector table compatibility | **PARTIAL** | New defect: production `years_of_experience integer` rejects the API's fractional years via PostgREST (HTTP 500). Candidate `INSPECTOR_V1` ready; everything else compatible. |
| Registration / auth contracts | **PASS (local)** / production UNVERIFIED | 15 paths mapped to code and tests; suspension and logout gaps closed with behavioural tests. |
| Communications | **UNVERIFIED** | Static validators pass; provider acceptance and mailbox delivery not exercised (no credentials, no sends — by design). |
| Regression tests | **PASS** | Backend Jest 96 suites / 1,342 tests; Vitest 36; node 1; root Vitest 643 + 1 skipped; Playwright 20/20 (Chromium); 121/126 validators pass with 0 regressions vs HEAD. |
| Build / lint | **PASS** | `tsc --noEmit` clean; `vite build` OK. ESLint on `src/` has 4 pre-existing errors in untouched frontend files (not a gate). |
| Schema-rehearsal readiness | **PASS** | `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md` — approval text, commands, checks, cleanup. |
| ZIP integrity | **PASS** | 4,439 files (= tracked + new); extracted copy hash-identical to the working tree; no `node_modules`/`.git`/`dist`/real `.env`; gitleaks: 13 findings, all pre-existing placeholders (§22). |

**Final decision: `READY FOR APPROVED READ-ONLY SCHEMA REHEARSAL`** (§21). Migration provenance is unresolved, which **blocks any production apply
or `db push`** — but the read-only schema rehearsal is the step that resolves it, and everything that could be resolved locally has been.

---

## 2. Verified starting commit and working-tree state

- `git clone https://github.com/Themugo/KAYAD.git` (Linux scratch clone; the Windows tree `C:\Users\hp\Desktop\kayad-fresh` was **not** accessed in Stage 3).
- `origin/main` = **`194cc807c11670675ffc7ce4b071b7e8dbf6f93b`** "docs+test: migration provenance reconciliation, staging decision, onboarding V3 candidate runbook, PG17.6 extended rehearsal" (2026-10-13 11:01 +0300), parent = reported `3f3ac29c`. The Stage 2 files the brief called "uncommitted" were committed and pushed by the owner as `194cc807` (22 files). Nothing was reset.
- 708 commits; 4,281 tracked files; 181 migrations; root `kayad@0.0.0` (engines `node >=22.22.2`, `.nvmrc` 22.22.2), backend `kayad-backend@2.0.0`; lockfiles `package-lock.json`, `bun.lock`, `backend/package-lock.json`.
- Hashes of every Stage 1/2 file: `evidence/stage3/STAGE3_BASELINE_RECORD.txt`.
- `t proxy\` exists only on the Windows device (Stage 2 report); it is not in the ZIP or the remote and was not touched.
- Baseline before any edit: backend Jest **93 suites / 1,288 passed** (matches Stage 2).

## 3. Foundation ZIP verification

`KAYAD-MIGRATION-PROVENANCE-STAGING-CERTIFICATION-20261013.zip`: **31,225,888 bytes** (matches the reported size), SHA-256
`e29679f362cd9810b96d9b542042fef46d678c50a8ef417a46f11a39d13df21f`, 4,641 entries / 4,281 files. Compared file-by-file (`cmp`) with `git ls-files`
at `194cc807`: **0 files only in ZIP, 0 only in Git, 0 content differences.** Both copies are the same foundation; the clone was used for its history.
The original ZIP was not modified.

## 4. Lead endpoint — root cause, authorization decision, fix

**Path traced:** `server.js:869 app.use("/api/leads")` → `routes/leadRoutes.js POST /` → (was) `protect` only → `leadController.createLeadManual`
→ `leadService.createLead` → RPC `kayad_create_lead_atomic` (service-role client) → `public.leads`.

**Defects (all reproduced against HEAD — 22 of the 30 new tests fail on the original code):**
1. No role guard — any authenticated user (a buyer, an inspector) could create a lead in which **they** are the dealer, naming any `buyerId`.
2. `lead.save()` on the plain object returned by `db/index.js` → `TypeError` → HTTP 500 **after** the row was already created.
3. Same `lead.save()` defect in `addNote` (`POST /api/leads/:leadId/notes`) — the endpoint failed on every call, before writing anything.
4. No validation: non-UUID ids reached PostgreSQL (500); a vehicle belonging to another dealer could be pulled into the caller's CRM.

**Policy — established from the code, not guessed:**
- The route file is titled "Dealer and admin routes for lead management"; every other lead handler authorises `lead.dealer === req.user.id` (or admin).
- The canonical, live dealer CRM (`/api/dealer-platform/leads*`, used by `DealerDashboard.tsx`) already uses **`protect + dealerOnly`**.
- Every automatic lead path (chat, auction, escrow) sets `lead.dealer = vehicle.dealer`.
- The frontend never calls `POST /api/leads` (`src/services/leadApi.ts` has no create).
→ Reuse **`dealerOnly`** (SELLER_ROLES + STAFF_ROLES + webhoist — identical boundary to the canonical routes); the caller is always the dealer;
if a vehicle is given it must belong to the caller. No new role, endpoint, table or service.

**Fix (`backend/routes/leadRoutes.js`, `controllers/leadController.js`, `services/leadService.js`, new `validation/lead.schema.js`):**
- `router.post("/", protect, dealerOnly, validate(createLeadSchema), …)` — authorization **before** validation (an unauthorised caller learns nothing about the payload contract).
- zod: `buyerId` UUID, `vehicleId` optional UUID, `source` trimmed 1–50, `notes` optional trimmed 1–4000 (the canonical dealer-platform note bound); unknown keys (e.g. a spoofed `dealerId`) are stripped.
- Before any write: buyer ≠ dealer (400), buyer exists (400), vehicle exists (400) and belongs to the caller (403).
- `resolveLead()` returns `{ lead, created }` from the same RPC; `createLead()` keeps its old contract for chat/auction/escrow callers.
- Notes persisted by new `setLeadNotes()` → `update("leads", …)` (same helper as archive/hot). Written only on creation, or to complete a creation whose notes write failed — a repeat never overwrites notes the dealer edited later.
- Response: `201 {success, created:true, lead}` on creation, `200 {success, created:false, lead}` on a repeat (additive; no frontend consumer). Errors: 4xx messages from typed errors, otherwise `500 "Failed to create lead"` (no internals).
- `addNote`: validated (`leadNoteSchema`), persisted via `setLeadNotes()`, returns the updated row.

**Coverage — `backend/tests/regression/leadManualCreateAuthorization.test.js` (30 tests, real router + real `protect`/`dealerOnly`/zod over HTTP):**
unauthenticated (401) · invalid token (401) · buyer and inspector roles (403) · unauthorised + invalid payload still 403 · foreign vehicle (403) · dealer / individual_seller / admin (201, exact response keys) · spoofed `dealerId` ignored · own vehicle + estimated value · trimming + notes persisted through `update()` · 7 invalid payloads (400) · buyer = dealer, unknown buyer, unknown vehicle (400) · identical repeat (200, `created:false`, one row, notes kept) · distinct business key is a new lead · notes write failure (500, no internal detail) · retry after a failed notes write completes it · RPC failure (500) · `addNote` owner / non-owner / empty. Every denial asserts **no RPC, no update, no insert, no row**.
Mutation checks (`evidence/stage3/stage3_lead_mutation_checks.txt`): removing `dealerOnly` → 3 fail; disabling the vehicle check → 1 fail; HEAD controller+routes → 22 fail.

**Residual / decision:** staff roles may create leads (existing `dealerOnly` convention); because the caller becomes the dealer, an admin-created lead is
the admin's own. An "admin creates a lead on behalf of dealer X" capability does not exist and was not invented (**D-LEAD-1**, only if wanted).

## 5. Lead idempotency — analysis and outcome

- **Business identity is defined by the function itself, not by Stage 3:** `kayad_create_lead_atomic` (20260907200100) computes
  `v_key = buyer|dealer|vehicle|source|source_reference`, takes `pg_advisory_xact_lock(hashtextextended(v_key))` and contains the lookup on exactly
  that key; its comment states the intent ("serialize identical business-key creates **without requiring a destructive cleanup** of historical
  duplicate leads"); callers are named `findOrCreateLeadFrom{Chat,Auction,Escrow}`.
- **Root cause:** the body does `INSERT … ON CONFLICT DO NOTHING` **first**. No unique index on that key exists (repo and *Stage 2 production read*), so the
  insert never conflicts, `created` is always true, and the lookup branch is unreachable. Reproduced (`L1`: identical repeat → 2 rows).
- **Cases distinguished:** transport retry / concurrent copies / retry after client timeout → same key → must return the same lead (now true under V2);
  a genuinely new enquiry differs in vehicle, source or `source_reference` (chat id, auction id) → new lead (proven); a follow-up from the same buyer
  on the same vehicle via the same source → **same lead** by the existing key — including a lead that is archived, `lost` or `sold` (**D-LEAD-2**: keep, or start a new lead for closed ones).
- **Outcome:** `runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql` — `CREATE OR REPLACE` with identical signature, invoker rights and key;
  look up under the lock, insert only if absent; keeps `ON CONFLICT DO NOTHING` so it also works with Stage 2's `LEADS_V1` unique index.
  Proven on PG 17.6 and 16.15: repeat → `created=false`; 30 concurrent identical creates **without** an index → exactly 1 created, 29 returned it, 1 row;
  applies over historical duplicates without deleting anything and returns the oldest; rerun is a no-op; ACL preserved; V1+V2 together correct.
  Because V2 needs no cleanup and matches the original design, it is the **recommended** fix; V1 (unique index) stays optional defence-in-depth and
  still fails loudly while duplicates exist. Nothing was deleted, merged or assumed about production rows (Stage 2 read: 0 leads).
- The application side is already correct for both states: before V2 every call reports `created:true` (current behaviour); after V2 repeats return 200.

## 6. Refresh-token and function privilege matrix

Harness: `scripts/rehearse-stage3-lead-privileges-local.sh` (L1–L4, I1, P1–P5 — 57 checks, identical outcomes on PG 17.6 and 16.15). Roles are NOLOGIN roles from the
baseline file, which runs `alter role service_role bypassrls` (a **harness setup** mirroring the production fact read in Stage 2 — not proof of production).

| Function | Security | Owner | search_path | Stock defaults (P1) anon/auth/service | Hostile default ACL (P2) | After remediation (P3/P5) |
|---|---|---|---|---|---|---|
| `kayad_rotate_refresh_token` | DEFINER | postgres | `public` → candidate `public, pg_temp` | f / f / t | **t / t** / t | f / f / t |
| `kayad_register_identity_atomic` | DEFINER | postgres | `public` → candidate `public, pg_temp` | f / f / t | f / f / t | f / f / t |
| `kayad_create_lead_atomic` | INVOKER | postgres | `public` (V2: `public, pg_temp`) | **t / t** / t | **t / t** / t | f / f / t |
| `kayad_transition_lead_atomic` | INVOKER | postgres | `public` | **t / t** / t | **t / t** / t | f / f / t |

- Remediation = `20261011093000` (existing; revokes client EXECUTE on every non-trigger `kayad_*`) + Stage 2 `ONBOARDING_V3_CANDIDATE_9` + `LEADS_V2`.
  P4: all 8 client-role calls fail with `permission denied for function`; no user created; the service-role backend path still works.
- Why lead functions were "exposed but harmless": invoker rights + deny-all RLS + no client table grants → even with hosted-style `GRANT ALL` on
  `leads`/`lead_activities`, anon/authenticated see 0 rows and inserts are rejected by RLS (L3/L4). Defence in depth, not a live hole.
- Definer search path: both definers schema-qualify every table, so the missing `pg_temp` is not exploitable today; candidate
  `STAGE3_CANDIDATE_definer_search_path_pg_temp.sql` pins it (no behaviour change — onboarding assertions pass after it).
- Application vs database authorization: the RPCs trust `p_actor_id` (no caller check); all authorization is in Express (`protect`, `dealerOnly`,
  ownership checks). The database layer only guarantees that non-service roles cannot call them.
- **Production privilege state: UNVERIFIED in Stage 3** (Stage 2 read: lead functions `proacl` NULL → PUBLIC execute; postgres default ACL grants nothing extra).

## 7. The six duplicate-version ("inverted") files

Full per-file matrix: **`KAYAD_STAGE3_DUPLICATE_VERSION_MATRIX_20261013.tsv`**. Each pair = canonical file holding the DDL under a version production
never recorded + a NO-OP stub at the version production did record. The 22 Sep reconciliation (`docs/SUPABASE_MIGRATION_HISTORY_RECONCILIATION.json`,
`timestamp_remaps`: 21) documents the remap deliberately, policy "do not repair/remove remote history until schema-effect equivalence is proven".

| Canonical (real DDL) | Prod version (stub) | Git: twin before stubbing vs canonical | Production evidence | Re-run behaviour | Status |
|---|---|---|---|---|---|
| `20260918100000` wave2 invariants | `20260918143944` | byte-identical | no digest | completes; **replaces 9 RPC bodies** (dispute resolution, bid settlement, inspection payout, media, ledger) | **BLOCKED** — must not re-run until bodies compared |
| `20260918120000` lifecycle | `20260918143950` | byte-identical | no digest | guarded constraint; no-op | PARTIAL |
| `20260918130000` inspection RLS | `20260918144000` | executable SQL identical (2026-10-08 edit was 39 comment lines) | no digest | **fails** on first `CREATE POLICY` (no `DROP IF EXISTS`) | PARTIAL |
| `20260921230000` system status | `20260922045554` | byte-identical | **md5 equal** (comment-stripped) | `ON CONFLICT DO NOTHING` | **PASS** |
| `20260921231000` governance | `20260922045606` | byte-identical | same length (3,750) under the proven normalisation, **md5 differs** | replaces 1 trigger fn, recreates 10 triggers | UNVERIFIED |
| `20260921232000` booking link | `20260922045609` | byte-identical | **md5 equal** (whitespace-normalised) | `IF NOT EXISTS` only | **PASS** |

Supabase CLI keys by version → a version-keyed `db push` would treat all six canonical versions as pending. No custom runner exists
(`scripts/db/apply-migrations.mjs` named in the brief has never existed in any commit); the rehearsal scripts apply explicit file lists.
**Renaming or deleting either file breaks reproducibility** (fresh builds need the canonical DDL; history needs the stub version). Nothing was renamed.
**Local safety change:** `scripts/apply-schema.sh` ran `supabase db push` **unconditionally**; it and `bootstrap-supabase-production.mjs --apply` now
refuse unless `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` (dry run still available; `validate:phase23` still passes; pinned by tests).
Remediation order (each step needs authorization): read-only export → C3/C4 comparisons → forward-only migration capturing any differing
production body → `supabase migration repair --status applied <canonical versions>` only for proven-equal pairs (metadata write).

## 8. The three same-name production records whose content differs

`20260919080655`, `20260919102410`, `20260919102636`. Every Git version of each file was normalised in all the ways that **reproduce** production's
md5 for three control migrations (comments stripped; statements split outside `$$`; whitespace collapsed or kept; joined `;\n` / `; ` / `;\n\n`).
**No variant matched** (lengths 139 vs 141/157; 12,820 vs 10,815/10,852; 1,099 vs 661–671). Conclusion: what production executed is **not in Git**.
Status DIFFERENT, text unknown. Evidence: `evidence/stage3/stage3_production_only_and_edited_findings.txt` §B, §D.

## 9. The 35 directly-applied production records

Names appear in Git only inside documentation/evidence (`docs/SUPABASE_MIGRATION_HISTORY_RECONCILIATION.json`, `docs/audits/08-…`, digest TSVs) —
never as SQL. Their text exists only in production's `supabase_migrations.schema_migrations.statements`. **No SQL was reconstructed.**
Known: all 38 production-only digests are **identical** in the 2026-10-11 and 2026-10-13 captures (production history unchanged); 31 grant/revoke on
`kayad_*` functions and 2 touch `inspector_applications`, 3 `dealers` (*Stage 2 substring flags*). Unknown: their exact effects. Resolution: runbook §4 step 4 + §8 C1.

**Additional drift class found in Stage 3 — edited after apply** (`evidence/stage3/stage3_edited_after_last_prod_migration.tsv`): of 118
history-matched files, 95 are unchanged since the 22 Sep reconciliation commit, 21 became NO-OP stubs (expected), and **2 had executable SQL edited later**:
`20260710044329` (demo-vehicle seed `ARRAY` → `to_jsonb(ARRAY)`, fresh-build fix) and `20260909073141` (production ran the original: `authenticated`
cannot execute `is_admin()`; the repo now grants it and rewrote the `ad_slots` admin policy). A fresh rebuild therefore differs from production
there. Forward-porting would **widen** a client grant while the app uses `service_role` only → **D-MIG-3**, no candidate prepared.

## 10. `20261011093000` and `20261011120000`

- `20261011093000`: loops over every non-trigger `public.kayad_%` function → `REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role`.
  Idempotent, no data. Verified locally (S9 and P3): closes the lead-function exposure; the backend path keeps working. It is the **existing** boundary
  for the lead functions — no new lead revoke candidate was written. Production: absent from history (UNVERIFIED class in Stage 2).
- `20261011120000`: re-points 14 governance SELECT policies from `USING (true)` to `is_admin()`, revokes EXECUTE on trigger functions and one helper
  from client roles, revokes TRUNCATE/REFERENCES/TRIGGER(/MAINTAIN) on all public tables from anon/authenticated. Tighten-only, existence-guarded.
  It does **not** touch the four functions in scope. Interaction to note: its policies call `is_admin()`, which production's `20260909073141`
  (original text) made non-executable for `authenticated` — after applying it, wherever those policies exist in production, `authenticated` reads of those
  tables would **error** instead of returning rows (fail-closed; the app does not use that role). Decide together with D-MIG-3.

## 11. Lead-function grants and RLS verification

Proven locally (L3, L4, P1–P4): `leads`/`lead_activities` RLS enabled with `FOR ALL USING (false) WITH CHECK (false)`; with hosted-style `GRANT ALL`
to client roles, anon/authenticated SELECT returns 0 of 1 rows, INSERT is rejected by RLS, the RPC (still executable before remediation) is rejected,
an anon transition attempt changes nothing; the state machine rejects `contacted → sold`. Production RLS bodies and table grants: UNVERIFIED in
Stage 3 (*Stage 2 read*: same deny-all policy name, no client SELECT/INSERT/UPDATE/DELETE).

## 12. `inspector_applications` compatibility

| Aspect | Production (*Stage 2 read*) | Repository / API | Compatible? |
|---|---|---|---|
| `years_of_experience` | `integer`, nullable | `NUMERIC(5,2)` 0–80; API `z.coerce.number()` 0–80; form accepts 2.5 | **No** — via PostgREST (`json_populate_recordset`) 2.5 → `invalid input syntax for type integer` → HTTP 500 (reproduced). A SQL literal would be silently **rounded** instead. |
| `specialties`, `certifications`, `preferred_regions` | `text[]` | `JSONB` | Yes — PostgREST maps JSON arrays to `text[]` both ways (proven: JSON array inserted) |
| `phone`, `id_number`, `location` | nullable | NOT NULL | Yes (API requires them; production is looser) |
| `status` | no CHECK | CHECK pending/approved/rejected | Yes (API only writes those values) |
| trigger / indexes | none / one `(email,status)` | `updated_at` trigger + 3 indexes | The chain adds these over the existing table (*Stage 2 S8*); nothing dropped or renamed |
| RLS / grants | RLS on | RLS on, service_role only | Yes |

Chain safety: `CREATE TABLE IF NOT EXISTS` keeps the production table and data; no column is dropped, renamed or reinterpreted. No second table.
Candidate `runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql` (I1, PG 17.6/16.15): widens the one column to `numeric(5,2)` + CHECK 0..80;
existing integer row preserved (7 → 7.00); 81 rejected; arrays untouched; fails loudly with **no change** if an out-of-range row exists; no-op on a
repository-shaped table; rerun-safe. **D-INSP-1:** apply it, or restrict the API/form to whole years. Status PARTIAL (live shape from Stage 2 only).

## 13. Registration, authentication and communications contract matrix

| # | Journey | Entry → route → middleware | Service / DB object | Boundary | Tests (exist, run this stage) |
|---|---|---|---|---|---|
| 1–3 | Register, duplicate, safe retry | `authApi.ts` → `POST /auth/register` → `registrationLimiter`, `validateAuth` | RPC `kayad_register_identity_atomic`; `uq_users_email_normalized` (23505) | service_role only; privileged roles rejected (22023) | `validation/registrationContract`, `registrationPrivilegedRoles`, `registrationFlow.e2e`, `onboarding/onboardingFlow`; DB S2/S7a |
| 4–5 | Verification request & dispatch | `POST /auth/resend-verification` (`verificationLimiter`, `authLimiter`) | `user_auth.email_verify_*`; gateway `account.email_verification` (detached, 202) | enumeration-safe 200/202 | `regression/onboardingEmailWorkflow` |
| 6 | Token consumption | `GET /auth/verify-email/:token` | `user_auth` | limiter | same |
| 7–8 | Sign-in right/wrong | `POST /auth/login` (`accountLockout`, `validateAuth`) | `User`, `UserAuth`, `RefreshToken.createSession` | timing-safe | `auth/loginTimingEnumeration` |
| 9 | Access authorization | `middleware/auth.js protect` | fresh security row, `findActiveSessionById` | 401/403 fail-closed, 503 on infra error | `regression/protectSecurityState` (**+2 suspension tests**), `protectLeanRow`, `protectInfraError` |
| 10–11 | Refresh rotation, replay → family revoke | `POST /auth/refresh` | RPC `kayad_rotate_refresh_token` | replay revokes family, mints nothing | `auth/refreshRotationContract`; DB C1–C8, S7b |
| 12 | Logout / revoke-all | `POST /auth/logout` (protect), `POST /auth/sessions/revoke-all` | `RefreshToken.revokeAllForUser`, `tokenVersion+1` | all devices | **new `auth/logoutRevocationBehaviour` (8)** |
| 13 | Deactivation / suspension | `protect` | `users.deactivated_at`, `is_banned` | 403 `AUTH_FORBIDDEN` | `protectSecurityState` (deactivated, **suspended**) |
| 14 | Dealer onboarding (shared identity) | same register route, role `dealer` | dealers sync trigger + backfill (20261001090000) | pending until admin approval | registration suites; DB S2/S8 |
| 15 | Admin health | `GET /health/deep` (`protect`, `adminOnly`) | bounded comms readiness | `adminOnly` admits all staff roles (open AA-A1) | `regression/healthRouteComposition` (Vitest) |

Schema contracts (refresh-token hash/family/session columns, `users` security fields, normalised-email uniqueness, delivery ledger
`idempotency_key` + `dead_letter`) are created by the onboarding chain, **absent in production** (*Stage 2 read*). A passing local rehearsal does not
prove the deployed application works against production — every journey that needs those objects fails there until the chain is applied.
Communications — four separate claims, none conflated: database/schema readiness (local rehearsal only); provider configuration (UNVERIFIED);
provider API acceptance (UNVERIFIED — `validate:communications:providers` BLOCKED, no credentials); mailbox delivery (UNVERIFIED). No message was sent.

## 14. Logout and deactivation coverage

- **Logout (gap closed):** `backend/tests/auth/logoutRevocationBehaviour.test.js` — real `protect`, `logout`, `refreshToken`, real JWT signing, stateful
  store mirroring the rotation SQL. Proves: logout revokes every session, bumps `tokenVersion`, clears both cookies; the pre-logout **access** token → 401;
  the pre-logout **refresh** token → 403, no cookie, no row; another device's tokens die too; with the version barrier isolated, the revoked
  session id still blocks access and a revoked refresh token is treated as **reuse** (family revoked, version bumped); a logout that cannot reach the DB
  returns 500 and does not claim success. Mutations: no revoke → 4 fail; no version bump → 2 fail.
- **Deactivation:** Stage 2 test verified present and passing. **Suspension (`isBanned`) had no behavioural test** → 2 added (403 `AUTH_FORBIDDEN`; read fresh, not from cache).

## 15. Changes made locally (uncommitted)

Modified: `backend/controllers/leadController.js`, `backend/routes/leadRoutes.js`, `backend/services/leadService.js`,
`backend/tests/regression/protectSecurityState.test.js`, `scripts/apply-schema.sh`, `scripts/bootstrap-supabase-production.mjs`.
New code/tests: `backend/validation/lead.schema.js`, `backend/tests/regression/leadManualCreateAuthorization.test.js`,
`backend/tests/regression/stage3CandidateRunbooks.test.js`, `backend/tests/auth/logoutRevocationBehaviour.test.js`, `scripts/rehearse-stage3-lead-privileges-local.sh`.
New candidates/runbooks: §16 and `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md`.
New docs/evidence: this file, `KAYAD_STAGE3_DUPLICATE_VERSION_MATRIX_20261013.tsv`, `KAYAD_STAGE3_VALIDATION_MATRIX_20261013.tsv`,
`KAYAD_STAGE3_PRESTAGING_CHANGE_LEDGER_20261013.md`, `evidence/stage3/**`.
Unchanged: every file in `supabase/migrations/`, every earlier runbook (V1/V2/V3, LEADS_V1), all frontend source, all earlier reports.
Deploy note: the application changes need **no** database change (the `notes` column exists — 20260907200100 is in production history; `resolveLead` works
with today's function). Pushing to `main` deploys them.

## 16. Migration candidates prepared (all `NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION`; none placed in `supabase/migrations/`)

| File | Change | Risk | Data | Rollback | Order |
|---|---|---|---|---|---|
| `runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql` | function body: lookup-before-insert on the existing key | Low; behaviour change = repeats return the existing lead (D-LEAD-2) | none | re-run original body from 20260907200100 | independent |
| `runbooks/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql` | `ALTER FUNCTION … SET search_path = public, pg_temp` on the two definers | Very low; tighten-only | none | `SET search_path = public` | after the onboarding chain |
| `runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql` | `integer → numeric(5,2)` + CHECK 0..80 | Low; ACCESS EXCLUSIVE rewrite (0 rows today) | none (fails if out-of-range rows) | type back with rounding (lossy) / restore | independent |
| existing `supabase/migrations/20261011093000…` | client EXECUTE revoke on all `kayad_*` | Low (no client caller) | none | re-grant (not recommended) | after LEADS_V2 or before (ACL preserved either way) |
| existing Stage 2 `ONBOARDING_V3_CANDIDATE_9`, `LEADS_V1` | unchanged, re-verified (P3, L2/L3) | — | — | — | — |

Each file states purpose, preconditions, expected state, security impact, idempotency, transaction, verification queries, failure handling, rollback
limits and order; each is statically pinned by `stage3CandidateRunbooks.test.js` (labels, single transaction, no DELETE/DROP/client GRANT, key equality
with the original function).

## 17. Tests run

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `jest tests/regression/leadManualCreateAuthorization.test.js` | 0 | 30/30 (+ 3 mutation runs, §4) |
| 2 | `jest tests/regression/stage3CandidateRunbooks.test.js` | 0 | 14/14 |
| 3 | `PGPORT=55433 bash scripts/rehearse-stage3-lead-privileges-local.sh` (PG 17.6) | 0 | **57 passed / 0 failed** |
| 4 | same, PG 16.15 | 0 | 57 / 0 (outcomes identical) |
| 5 | `bash scripts/rehearse-stage2-extended-local.sh` PG 17.6 / PG 16.15 (unchanged harness) | 0 / 0 | 56/56 and 56/56 (Stage 2 reproduced) |
| 6 | `bash scripts/rehearse-onboarding-migrations-local.sh` PG 17.6 | 0 | REHEARSAL PASSED |
| 7 | `jest tests/auth/logoutRevocationBehaviour.test.js`, `…/protectSecurityState.test.js` | 0 | 8/8, 8/8 (+ 2 mutation runs) |
| 8 | `cd backend && npm run test:jest` | 0 | **96 suites, 1,342 tests passed** (baseline 93/1,288 + 54 new) |
| 9 | `cd backend && npm run test:vitest` / `npm run test:node` | 0 / 0 | 6 files 36 passed / 1 passed |
| 10 | `npm test` (root Vitest) | 0 | 81 files; 643 passed, 1 skipped |
| 11 | `npm run lint` (`tsc --noEmit`) / `npm run build` | 0 / 0 | clean / built (chunk-size warning only) |
| 12 | `eslint src` (not a project script; not in CI) | 1 | 4 errors / 1,511 warnings, all in untouched frontend files — pre-existing |
| 13 | all 126 root `validate:*`/`verify:*` scripts on HEAD `194cc807` and on Stage 3 (env scrubbed, outbound HTTP to a dead proxy) | — | **121 pass → pass, 4 fail → fail, 1 excluded, 0 regressions** |
| 14 | `npx playwright test` default selection, Chromium only, pre-installed browser | 0 | **20/20 passed** (canonical onboarding, workflow certification, marketplace controls) |
| 15 | `node --check` on 9 changed JS files; `bash -n` on 2 scripts; `normalize-supabase-migrations` (dry) ; `validate-supabase-migrations` | 0 | OK; 181 files, 181 unique versions |

The 4 validator failures (identical at HEAD, investigated): `validate:communications:providers` and `validate:live-runtime` — BLOCKED by missing
credentials (by design); `verify:backup` — requires a backup file argument (not applicable); `validate:registration-onboarding` — **obsolete string
check**: it greps for the log text "Verification email failed", renamed by commit `bcbfae43` (today) to "Verification resend failed"; the behaviour it guards
(detached delivery + HTTP 202) is present and unchanged. Excluded: `verify:production` (probes the live site). **Not run:** Playwright Firefox/WebKit/mobile
projects and the backend-dependent suites (`E2E_WITH_BACKEND`), native Windows, any hosted Supabase. Logs: `evidence/stage3/logs/`.

## 18. Exact test environment

Linux 6.18.44 x86_64, Ubuntu 24.04.5 LTS container (2 vCPU); **Node 22.22.2** (the version pinned by `.nvmrc`, from npm package `node-linux-x64@22.22.2`
because the container's 22.22.0 fails the root `engines` check), npm 10.9.4; PostgreSQL **17.6** (`@embedded-postgres/linux-x64@17.6.0-beta.15`,
pgcrypto 1.3, uuid-ossp 1.1) on `/tmp:55433` and **16.15** (Ubuntu) on `/tmp:55432`, both trust-auth local sockets, run as an unprivileged user;
Chromium from `/opt/pw-browsers` with Playwright 1.62.1. **Native Windows was not tested.**

## 19. Production evidence versus local evidence

| Claim | Source |
|---|---|
| Production history: 135 records, newest `20260922060457`, 38 production-only, digests unchanged 11→13 Oct | read-only captures 2026-10-11 and *Stage 2*; compared in Stage 3 (files only) |
| Production md5 equality for `045554`/`045609`, difference for `045606`, Git ≠ production for 3 records | Stage 3 computation over those captured digests + Git |
| Lead functions PUBLIC-executable, deny-all RLS, 0 leads; `inspector_applications` shape; onboarding objects absent | *Stage 2* read-only catalog (not re-read) |
| Everything else in §4–§7, §11, §12, §14, §17 | **local** (code, tests, disposable PostgreSQL) |

## 20. Unresolved questions and approvals required

| ID | Decision / approval | Blocks |
|---|---|---|
| A-1 | Authorise the read-only schema-only export + (optionally) history statement text — runbook §1 | provenance, C1–C6 |
| A-2 | Authorise applying, to an approved target: ONBOARDING V3 (incl. step 9), `LEADS_V2`, `20261011093000`, search-path candidate, `INSPECTOR_V1` | production fixes |
| A-3 | Authorise `supabase migration repair --status applied` for proven-equal canonical versions (`20260921230000`, `20260921232000`) — metadata write | clean `db push` later |
| D-LEAD-1 | Should staff create leads on behalf of a dealer? (today: caller is always the dealer) | none |
| D-LEAD-2 | Should a closed (archived/lost/sold) lead be reused for the same key, or a new lead started? | LEADS_V2 semantics |
| D-INSP-1 | Fractional years: apply `INSPECTOR_V1`, or restrict the API/form to whole years | inspector onboarding in production |
| D-MIG-3 | `is_admin()` EXECUTE for `authenticated`: keep production's narrower state (and amend the repo file's intent) or forward-port the repo version | rebuild ≠ production; `20261011120000` behaviour |
| AA-A1 | `adminOnly` admits all staff roles (carried forward) | — |
| — | Brevo key/sender/webhook and a controlled test send (carried forward) | communications |

## 21. Recommended next stage — exact order

1. Owner reviews this report; commits and pushes the Stage 3 tree (commands below — **pushing to `main` deploys** the lead-endpoint fix; no DB change is needed for it).
2. Owner grants **A-1** (exact text in runbook §1).
3. Stage 4 executes runbook §3–§8 locally on PostgreSQL 17.6: restore, apply the chain and candidates twice, C1–C6 comparisons.
4. From C3/C4: write forward-only migrations for any production function/policy body that differs from the repository (never re-run `20260918100000` blindly).
5. Decide D-LEAD-2, D-INSP-1, D-MIG-3.
6. Separately approve a hosted staging target; apply the reviewed set there; smoke-test with providers disabled.
7. Only then: production apply (A-2), history repair (A-3), and — once drift is reconciled — lift the `db push` guard deliberately.

**Decision: `READY FOR APPROVED READ-ONLY SCHEMA REHEARSAL`.** Not `BLOCKED — AUTHORIZATION POLICY AMBIGUOUS`: the lead policy was established from
the code and fixed. Not `BLOCKED — REGRESSION FAILURE`: zero regressions across 1,342 + 36 + 1 + 643 tests, 121 validators and 20 browser tests.
Not `BLOCKED — MIGRATION PROVENANCE UNRESOLVED`: provenance *is* unresolved and blocks production changes, but every repository-side question is
answered or bounded and the remaining ones can only be answered by the read-only rehearsal this decision unlocks. This is **not** a production certification.

## 22. Updated project ZIP — verification

`KAYAD-PRESTAGING-SECURITY-MIGRATION-DRIFT-20261013.zip` — complete project under `kayad-fresh/` (same layout as the foundation ZIP), built from
`git ls-files` + `git ls-files --others --exclude-standard` of the Stage 3 tree. **Its size and SHA-256 are recorded outside the archive** in
`KAYAD-PRESTAGING-SECURITY-MIGRATION-DRIFT-20261013.zip.sha256` (an archive cannot contain its own hash). Checks run on the archive (script output
reproduced in the delivery note):
1. Listing: **4,439 files** — 4,281 tracked + 158 new (Stage 3 code, tests, candidates, docs, `evidence/stage3/**`); 0 missing, 0 unexpected.
2. Present: all 181 migrations, every file in §15/§16, both lockfiles, `.env.example` templates, the Stage 2 report and runbooks.
3. Excluded: `node_modules` (0), `.git` (0), `dist` (0), real `.env` files (0). Unrelated user files on the Windows device (e.g. `t proxy\`) are not in the
   remote and so not in the archive; they are untouched.
4. Extracted into a fresh temporary directory; **SHA-256 of all 4,439 files equal** to the working tree; the new harness keeps its executable bit.
5. Secrets: `gitleaks 8.21.2 dir` with the repository's `.gitleaks.toml` → 13 findings, **identical to the untouched foundation** (0 new). Each was
   inspected (values masked): AWS's documented `…EXAMPLE` key, `ACxx…`/`your…`/`phc_xxx…` placeholders, an empty Helm value, a `SUPABASE_…` variable
   reference, a test-only Brevo value, and the Phase 37 gitleaks report quoting those. No real credential. A pattern scan of every Stage 3 changed/new
   file (JWTs, Supabase/Brevo/AWS/Twilio/Africa's Talking/Stripe keys, private keys, credentialed connection strings) found nothing.

### Git commands for later use (not executed)
```
cd C:\Users\hp\Desktop\kayad-fresh
git status
git pull --ff-only origin main
REM copy the extracted Stage 3 ZIP contents over this folder first (see the delivery note), then:
git add backend/controllers/leadController.js backend/routes/leadRoutes.js backend/services/leadService.js backend/validation/lead.schema.js backend/tests/regression/leadManualCreateAuthorization.test.js backend/tests/regression/stage3CandidateRunbooks.test.js backend/tests/regression/protectSecurityState.test.js backend/tests/auth/logoutRevocationBehaviour.test.js scripts/apply-schema.sh scripts/bootstrap-supabase-production.mjs scripts/rehearse-stage3-lead-privileges-local.sh runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql runbooks/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md docs/production/prestaging-security-and-migration-drift-20261013.md KAYAD_STAGE3_DUPLICATE_VERSION_MATRIX_20261013.tsv KAYAD_STAGE3_VALIDATION_MATRIX_20261013.tsv KAYAD_STAGE3_PRESTAGING_CHANGE_LEDGER_20261013.md evidence/stage3
git diff --cached --stat
git commit -m "fix(leads)+test+docs: Stage 3 lead endpoint authorization and persistence, logout/suspension behaviour tests, lead idempotency and privilege candidates, migration drift matrix, db push guard, schema-only rehearsal runbook"
git push origin main
```
