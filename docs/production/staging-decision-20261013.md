# KAYAD — Staging Decision Document (Stage 2)

Date: 2026-10-13 · Repo base: `3f3ac29c` · Nothing described here has been created or run against any hosted service. No resource was provisioned.

## 1. Question
Where should the onboarding chain (`runbooks/ONBOARDING_V3_2_*`, eight migrations + candidate step 9) be proven before it touches production project `ubvgixwhfybbyjuvxboj`?

## 2. What is already proven, and what that evidence is
| Evidence | Environment | Status |
|---|---|---|
| Chain applied twice, each file in its own transaction; behavioural assertion block (register, duplicate, rotate, replay, family revoke, ledger); V2 post-verify all true (35 checks on the earlier PG16 run) | Throwaway PostgreSQL **16.15** and **17.6** (local, socket only), baseline *reconstructed from read-only catalog queries* | PASS (this is **not** staging and **not** production) |
| V3 candidate: whole chain + step 9 in one transaction, twice; 40/40 post-verify; failure injected at the end rolls everything back | same | PASS |
| Failure/partial states, guard-masking, hostile default ACLs, 20k users / 40k legacy tokens, duplicate-email data, concurrency (30 parallel registrations, 20 parallel rotations), pre-existing differently-shaped `inspector_applications` | same | PASS (45/45 on both servers) |
| An approved, non-production, production-shaped database | — | **Does not exist** (none verified) |

Residual fidelity gap: the baseline is a catalog-derived reconstruction (users/user_auth/dealers/refresh_tokens/communication_deliveries/profiles), not a schema dump. Tables, columns, policies, triggers and functions that the chain does not touch are absent locally. A schema-only dump of production would remove most of this gap.

## 3. Options

### A. Existing approved staging database
Prerequisites: an owner-confirmed non-production project or database that holds *no* production secrets or personal data. **None could be verified** from this session (the only Supabase project visible is production). Cost: none new. Fidelity: unknown until its schema/history is compared with production. Verdict: use it if it exists and passes the same read-only preflight; ask the owner.

### B. Local disposable PostgreSQL (already working)
Prerequisites: PostgreSQL 17.6 (exact match with production; obtained here as the npm package `@embedded-postgres/linux-x64@17.6.0-beta.15`, pgcrypto 1.3 and uuid-ossp present), local socket only, db names `rehearsal*`.
Cost: none. Security: no network exposure, no production credentials or data; scripts refuse non-local hosts. Fidelity: engine version identical; platform extras absent (supabase_vault, pg_stat_statements, `auth`/`storage` schemas, PostgREST, event triggers, Supabase-managed default ACLs, the `supabase_admin`/`authenticator` roles). Coverage: SQL semantics, grants as simulated, concurrency, rollback; **not** PostgREST exposure, Supabase runner behaviour, or the deployed backend.
Cleanup: drop `rehearsal*` databases, stop the cluster, delete the data directory.
Improvement available with a small approval: authorize a **read-only, schema-only** dump of production (`supabase db dump --schema-only`, or `pg_dump -s`, no data, no secrets printed) so the local baseline is the real schema instead of a reconstruction.

### C. New Supabase staging branch or project
Prerequisites and approvals: owner approval of **billing** (branches and projects are billable; the exact price is not asserted here — confirm in the dashboard before approving), the organization, region, and a retention/cleanup date. A branch is built by replaying the repository's `supabase/migrations`; because the repository and production histories diverge (38 production-only records, 63 repo-only, 21 renumbered pairs of which 6 are inverted), **a branch would not be a copy of production** and its construction itself would need the history reconciled first. A separate project seeded from a schema dump is higher fidelity but costs more and needs its own secrets.
Security: new service-role/anon keys must be created for it; they must never be copied from production; email/SMS/WhatsApp/payment providers must be disabled or pointed at sandboxes; `MPESA_TRUSTED_PROXY_CIDRS` stays blank.
Fidelity: highest for Supabase behaviour (PostgREST, roles, default ACLs, runner), only if seeded from a schema dump.
Cleanup: delete the branch/project on a stated date; revoke its keys.
Verdict: appropriate only after B (with a schema dump) passes, and only with explicit approval.

## 4. Recommendation and minimum approvals
1. **Now, no approval needed:** keep using B (done; evidence in `evidence/test_logs/stage2_*`).
2. **Smallest useful approval:** "Authorize one read-only schema-only dump of production for use in a local disposable PostgreSQL 17.6." Re-run `scripts/rehearse-stage2-extended-local.sh` with that dump as baseline.
3. **Before any hosted staging resource:** written approval naming (a) option A/C, (b) cost ceiling and end date, (c) who holds the keys, (d) confirmation that providers are disabled.
4. **Before production:** a separate approval for the exact runbook version (V2 or V3), a confirmed backup/PITR point, the decision on destructive step `20260930110000` (production has 0 refresh tokens), and the deploy ordering (migrations first, then backend).

## 5. Configuration and verification steps for a hosted staging environment (no secrets)
Configuration (names only): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (staging values only), `JWT_SECRET`, cookie/CORS origins for the staging hostname, `BREVO_API_KEY` **unset** (or a sandbox key), SMS/WhatsApp/payment keys unset, `MPESA_TRUSTED_PROXY_CIDRS` blank, `NODE_ENV=production`-like settings so the same code paths run.
Verification sequence: (1) `runbooks/ONBOARDING_V2_1_PREFLIGHT_READONLY.sql` (read-only; reusable for V3) and review every row; (2) confirm backup/PITR; (3) `psql … -v ON_ERROR_STOP=1 -f runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql` (single transaction); (4) `runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql` — all rows `true`; (5) deploy the matching backend; (6) smoke: register → duplicate email → verify email (sandbox) → login → refresh → replay (expect family revoked) → logout → admin `GET /health/deep` shows `checks.communications.schema = schema_ready`; (7) rollback decision per `ONBOARDING_V2_4_ROLLBACK_LIMITS.sql` (restore-from-backup is the only true undo for the token column).
