# KAYAD — Approved Read-Only Schema Rehearsal Runbook (Stage 3 preparation, 2026-10-13)

**Status: PROCEDURE ONLY — NOTHING IN THIS FILE HAS BEEN EXECUTED.** No production export is authorised by Stage 3. Every step that
touches production needs the written owner approval in §1. The rehearsal database is disposable, local and never connected to production.

Purpose: replace the hand-built baseline (`scripts/rehearsal/onboarding_prod_shaped_baseline.sql`) with production's real schema, then
answer, with evidence, the questions Stage 3 could not close from the repository alone:

| Open question | Section that answers it |
|---|---|
| Do the 9 functions re-defined by `20260918100000` still match production's bodies? | §8 C3 |
| Do the 26 policies of `20260918130000` and the constraint of `20260918120000` match? | §8 C4 |
| What SQL did the 35 directly-applied production records run, and the 3 that differ from Git? | §4 step 4, §8 C1 |
| Does `20260922045606` (governance) differ from its canonical file, and how? | §8 C2 |
| What are production's real EXECUTE grants and default ACLs for the four `kayad_*` functions? | §8 C5 |
| Does the onboarding chain + Stage 3 candidates apply cleanly to the REAL schema? | §7 |

---

## 1. Approval required (owner, in writing)

> "I authorise one read-only, schema-only export of KAYAD production (project `ubvgixwhfybbyjuvxboj`) and one read-only export of
> `supabase_migrations.schema_migrations` for local PostgreSQL 17.6 rehearsal only. No data rows except migration-history text. Files stay on
> <named machine>, are not committed, and are deleted by <date>."

The approval names: the operator, the machine, the retention date, and whether migration-history **statement text** may be exported
(it can contain seeded configuration — see §4 step 4).

## 2. Access — least privilege

- Use the owner's existing database connection string from the Supabase dashboard (session pooler, port 5432). **Do not create a role** —
  creating a role is itself a production change.
- Force read-only at the session level for every command: `export PGOPTIONS='-c default_transaction_read_only=on'`.
  `pg_dump` additionally runs in a read-only serializable snapshot.
- Never paste the connection string into a file, a ticket, a chat or this repository. Use an environment variable that is unset at the end:
  `read -rs PROD_DB_URL; export PROD_DB_URL` (input not echoed). `unset PROD_DB_URL` in §10.
- Client: **PostgreSQL 17.x client binaries** (`pg_dump --version` must report 17). An older `pg_dump` refuses a 17.6 server.

## 3. Preflight (read-only)

```bash
export PGOPTIONS='-c default_transaction_read_only=on'
psql "$PROD_DB_URL" -X -At -c "show transaction_read_only"            # must print: on
psql "$PROD_DB_URL" -X -At -c "select version()"                        # expect PostgreSQL 17.6
psql "$PROD_DB_URL" -X -At -c "select extname||' '||extversion||' '||n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by 1" > prod_extensions.txt
psql "$PROD_DB_URL" -X -At -c "select count(*), max(version) from supabase_migrations.schema_migrations"   # Stage 2: 135 / 20260922060457
```
Stop if `transaction_read_only` is not `on`, or if the history count/max differ from Stage 2 (production changed — re-plan).

## 4. Export (schema only, plus sanitised history)

```bash
mkdir -p ~/kayad-rehearsal-$(date +%Y%m%d) && cd "$_" && umask 077
# 1. Application schema: public only, schema-only, with privileges and default ACLs (we NEED grants), no owners.
pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --no-comments --file=prod_public_schema.sql
# 2. Supabase migration-history TABLE DEFINITION only.
pg_dump "$PROD_DB_URL" --schema-only --schema=supabase_migrations --no-owner --file=prod_history_schema.sql
# 3. Sanitised history manifest (no SQL text): version, name, statement count, total length, md5.
psql "$PROD_DB_URL" -X -A -F $'\t' -c "select version, name, coalesce(array_length(statements,1),0) as n_statements,
   length(array_to_string(statements, E'\n')) as chars, md5(array_to_string(statements, E'\n')) as md5
   from supabase_migrations.schema_migrations order by version" > prod_history_manifest.tsv
# 4. ONLY IF §1 approves statement text: the 38 production-only records + the 9 history versions Stage 3 needs to compare.
psql "$PROD_DB_URL" -X -A -F $'\t' -c "select version, name, array_to_string(statements, E'\n;\n') from supabase_migrations.schema_migrations
   where version >= '20260919000000' or version in ('20260918143944','20260918143950','20260918144000')
   order by version" > prod_history_statements_RESTRICTED.tsv
sha256sum prod_*.sql prod_*.tsv prod_extensions.txt > SHA256SUMS
```
- `--schema=public` excludes `auth`, `storage`, `realtime`, `vault`, `graphql` and their data. No `--data-only`, no `pg_dumpall`, no `--inserts`.
- Review `prod_history_statements_RESTRICTED.tsv` by eye for keys, tokens, phone numbers or e-mail addresses **before** using it; redact in place
  if any is found and note the redaction. It is never committed.
- Record the four SHA-256 values in the Stage 4 report. Re-verify them (`sha256sum -c SHA256SUMS`) before every later use.

**Cross-check against existing evidence (no new access):** the `md5` column of step 3 is computed differently from the 2026-10-11/13 captures
(`docs/audits/evidence/hosted-readonly-20261011/production-migration-statement-digests.tsv`, `KAYAD_PRODUCTION_ONLY_MIGRATIONS_20261013.tsv`);
compare **lengths** first, then md5 of the step-4 text normalised as in `evidence/stage3/stage3_production_only_and_edited_findings.txt` §D.

## 5. Isolated restore (local PostgreSQL 17.6 only)

The rehearsal server must be local (`PGHOST=/tmp` or `localhost`), have **no** network route to production, and hold no production credentials.
Stage 2/3 used `@embedded-postgres/linux-x64@17.6.0-beta.15` (PostgreSQL 17.6) and Ubuntu PostgreSQL 16.15.

```bash
unset PROD_DB_URL                                   # nothing below may reach production
export PGHOST=/tmp PGPORT=55433 PGUSER=postgres
createdb rehearsal_prodschema
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f runbooks/STAGE3_REHEARSAL_SUPABASE_STUBS.sql   # §5.1 — create this file at execution time
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f prod_public_schema.sql
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f prod_history_schema.sql
```

### 5.1 Supabase stubs (written at execution time from `prod_extensions.txt`)
Create, before the restore: roles `anon`, `authenticated`, `service_role` (NOLOGIN; `service_role` BYPASSRLS — production fact), `authenticator`,
`supabase_admin`; schemas `auth`, `extensions`, `graphql`, `vault`; functions `auth.uid()`, `auth.role()`, `auth.jwt()` returning
`current_setting('request.jwt.claim.sub', true)::uuid` / `…role` / `…claims`; and every extension in `prod_extensions.txt` that exists locally
(`pgcrypto`, `uuid-ossp`) **in the same schema as production**. Extensions that do not exist locally (`supabase_vault`, `pg_graphql`,
`pg_stat_statements`, `pgsodium`…) get an empty schema of the same name; record each such gap in the report. Restore errors that refer to an
absent Supabase-managed object are recorded, not suppressed; an error on any `public` object stops the rehearsal.

## 6. Verify the restore
```bash
psql -d rehearsal_prodschema -At -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')"
psql -d rehearsal_prodschema -At -c "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"
psql -d rehearsal_prodschema -At -c "select count(*) from pg_policies where schemaname='public'"
```
Compare with the same three counts taken read-only from production in §3 (add them to the preflight). They must be equal.

## 7. Migration-chain execution on the real schema (order proven in Stage 2/3)
```bash
# a) onboarding chain + step 9, one transaction (unchanged V3 runbook)
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql
psql -d rehearsal_prodschema -At -f runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql | grep -c '|f$'        # must be 0
# b) Stage 3 candidates, each in its own transaction
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f runbooks/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f supabase/migrations/20261011093000_revoke_client_execute_on_kayad_rpcs.sql
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql
# c) behavioural assertions (synthetic rows only)
psql -d rehearsal_prodschema -v ON_ERROR_STOP=1 -f scripts/rehearsal/onboarding_assertions.sql
# d) apply everything a SECOND time — every step must be a no-op or idempotent
```
Then run `scripts/rehearse-stage3-lead-privileges-local.sh`'s P1/P4 checks by hand against `rehearsal_prodschema` (the script itself builds its own
databases; do not point it at this one).

## 8. Post-migration catalog comparisons (all local, against the restored copy and the exported files)
- **C1 production-only SQL:** for each of the 38 records in `prod_history_statements_RESTRICTED.tsv`, list the objects it creates/alters; record
  which still exist in `prod_public_schema.sql`; classify KNOWN-EFFECT / SUPERSEDED / NO-LONGER-PRESENT. For the 3 Git-recoverable records,
  `diff` production text against every Git version (`git log --all -- supabase/migrations/<file>`).
- **C2 `20260922045606`:** `diff` the production statement text with `supabase/migrations/20260921231000_reconcile_governance_lifecycle_hardening.sql`.
- **C3 nine `20260918100000` functions:** `pg_get_functiondef` of each on `rehearsal_prodschema` **before step 7** vs. the same function
  created on an empty scratch DB from the repository file. Any difference = the file must NOT be re-run; capture production's body in a new
  forward-only migration before any history repair.
- **C4:** same comparison for the 26 policies (`pg_policies`) of `20260918130000` and `vehicle_inspections_overall_score_check`.
- **C5 privileges:** `has_function_privilege` matrix (anon / authenticated / service_role) for the four functions before and after §7, and
  `pg_default_acl` rows — production's real defaults replace the harness assumption (`alter default privileges …` in scenario S5/P2).
- **C6 RLS:** `relrowsecurity` and `pg_policies` for `leads`, `lead_activities`, `refresh_tokens`, `users`, `user_auth`, `communication_deliveries`,
  `inspector_applications`; table grants to anon/authenticated.

## 9. What a schema-only replica cannot show
No production rows: data backfills (the dealers backfill inserts rows from `users`), uniqueness on existing data (normalised e-mail, lead
business keys), volume/lock timings and RLS behaviour with real ownership cannot be proven here — Stage 2's synthetic S6 volume test remains the
proxy. Supabase-managed schemas (`auth`, `storage`, vault secrets), PostgREST, GoTrue and platform default privileges are stubbed. A pass here
is **necessary, not sufficient** for production; a hosted staging copy remains the separate, later approval.

## 10. Cleanup and retention
```bash
dropdb rehearsal_prodschema
shred -u prod_history_statements_RESTRICTED.tsv 2>/dev/null || rm -P prod_history_statements_RESTRICTED.tsv 2>/dev/null || rm -f prod_history_statements_RESTRICTED.tsv
# keep only SHA256SUMS, prod_history_manifest.tsv (no SQL text) and the comparison report until the approved retention date, then delete.
unset PROD_DB_URL PGOPTIONS
```
Nothing exported is committed. The Stage 4 report records: approver, operator, timestamps, the SHA-256 values, the counts of §6, every restore
error, the C1–C6 results and the deletion date.
