# KAYAD — Owner-Approved Read-Only Schema Export and Local Rehearsal

**Status:** Procedure only. Not an authorization to access or export production.  
**Scope:** A schema-only artifact from an owner-approved read-only production connection, imported into an isolated local PostgreSQL rehearsal.  
**Explicitly prohibited:** production DDL/DML, migration execution against production, `supabase db push`, migration repair, hosted staging creation, and copying production secrets/data.

## 1. Approval gate

Before any export, obtain written owner approval that names:

- the exact production project and read-only export purpose;
- the operator and approved secure workstation/workspace;
- the approved schema scope and retention/deletion date;
- the permitted command and access method;
- confirmation that this is **schema-only** and no application table rows are to be exported;
- how the owner will provide and revoke the read-only connection access.

Do not proceed if the role can write to production, if the command would use a service-role API key instead of a database read-only role, or if the destination is not access-controlled. Never paste a connection string, password, token, key, or exported function body containing embedded secrets into a chat or report.

## 2. Preflight: tool and destination checks

Use a supported PostgreSQL client and confirm the target is production only for the approved read-only export step. Keep command output sanitized.

```sh
psql --version
pg_dump --version
```

Prepare a private, access-controlled working directory. Do not use a shared/public folder. Set a shell variable from the approved secret manager or protected local environment; do not put the value directly in shell history:

```sh
umask 077
mkdir -p ./kayad-schema-rehearsal
chmod 700 ./kayad-schema-rehearsal
# Set KAYAD_APPROVED_READONLY_DATABASE_URL through the approved secret manager.
test -n "${KAYAD_APPROVED_READONLY_DATABASE_URL:-}" || {
  echo "Approved read-only connection is not configured" >&2
  exit 1
}
```

Do not enable shell tracing (`set -x`). Do not echo the variable. If available, verify the connected role and database with a read-only query that returns only the database name, role name and server version; do not query application rows.

## 3. Schema-only export

Use only the owner-approved database URL and only after approval. A schema-only dump excludes table data rows, but function definitions, comments, defaults and seeded DDL can still contain literals; inspect and sanitize the output before retaining or sharing it.

```sh
pg_dump "$KAYAD_APPROVED_READONLY_DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=./kayad-schema-rehearsal/production-schema.raw.sql
```

Do not add `--data-only`, `--inserts`, `--column-inserts`, or any data-export option. Do not run the dump through a command that prints SQL to a public log. Do not include a production `.env`, application logs, table rows, API keys, or credentials in the artifact.

Review the raw file in the secure workspace for:
- `COPY ... FROM stdin` or `INSERT INTO` data statements (unexpected in a schema-only dump);
- password/token/key literals and credential-bearing comments;
- functions containing embedded credentials or private URLs;
- owner/platform-specific statements that cannot safely be replayed locally.

If sensitive literals are found, do not silently redact executable logic and then treat the artifact as faithful. Stop and agree with the owner on a sanitized, reviewed export or omit the affected object and record the resulting fidelity gap.

After review, create a reviewed copy (never overwrite the raw evidence) and remove any sensitive literal only under the approved sanitization process.

## 4. Hash and manifest

Compute SHA-256 locally and record only the file name, byte size, hash, export time, PostgreSQL version, schema scope, sanitization steps and approver reference. Never record the connection string.

```sh
sha256sum ./kayad-schema-rehearsal/production-schema.reviewed.sql
wc -c ./kayad-schema-rehearsal/production-schema.reviewed.sql
```

Keep the raw artifact under the retention policy. If the owner does not authorize retaining the raw dump, securely delete it after the reviewed copy is verified. Do not upload either artifact to a public service.

## 5. Create an isolated local PostgreSQL rehearsal

Use a disposable local PostgreSQL instance at the approved target major/minor version (Stage 2 evidence identifies PostgreSQL 17.6). It must bind only to a local socket or loopback and must not have a route or credentials to production.

- Use a new throwaway database name, e.g. `kayad_stage3_schema_rehearsal`.
- Do not reuse any production URL or hosted Supabase resource as the rehearsal target.
- Install only required compatible extensions locally; record each extension/version.
- Do not attempt to recreate platform-managed Supabase services by guesswork.
- Keep external email/SMS/WhatsApp/payment providers disabled or sandbox-only.

Create the database with local administrator access, then import the **reviewed** schema artifact into the local database only:

```sh
createdb kayad_stage3_schema_rehearsal
psql "postgresql:///kayad_stage3_schema_rehearsal" \
  -v ON_ERROR_STOP=1 \
  -f ./kayad-schema-rehearsal/production-schema.reviewed.sql
```

If the dump contains role grants or platform objects that cannot be replayed locally, do not bypass errors blindly. Record the exact error, make a reviewed local-only compatibility adjustment, preserve the source dump unchanged, and mark the affected privilege/platform behavior as unverified.

## 6. Capture sanitized migration history

Do not export migration SQL from production as part of this schema-only step. Migration history metadata may be captured separately only if covered by the same approval, using a read-only query that returns versions, names and timestamps without SQL statement bodies, personal data or secrets.

Compare:
- production history versions against the repository's 181 migration filenames;
- exact-version matches;
- same-name/different-version pairs;
- the six reported inverted pairs;
- the three same-name files with different content;
- the 38 production-only history records.

For missing SQL, a byte length or MD5 digest is not the SQL. Do not reconstruct statements from hashes, and do not mark a migration applied just to clear a difference.

## 7. Rehearsal order

1. Verify `server_version_num`, installed extension versions and local-only connectivity.
2. Record the initial schema catalog: tables/columns/types/nullability, constraints, indexes, functions, owners, security modes, `search_path`, triggers, RLS flags/policies, table grants and function ACLs.
3. Verify the dump's expected objects and compare `inspector_applications` against the application contract.
4. Reconcile the migration history before considering any chain execution. The current archive has unresolved drift; do not run `supabase db push`.
5. Apply only the separately approved **candidate** runbook to the disposable local database. Use `ON_ERROR_STOP`; never point the runbook at production.
6. Run post-verification queries and behavioral tests for registration, duplicate registration, verification-token consumption, refresh rotation/replay/family revocation, logout, deactivation, function privileges, RLS, communications schema and lead idempotency.
7. Repeat the role matrix as `anon`, `authenticated` and `service_role`, and document any harness-specific role attributes. A manually altered local role is evidence about that test role only, not production.
8. Compare pre/post catalog snapshots. Record every difference, command, exit code, log path and artifact hash.

## 8. Limits of schema-only rehearsal

A schema-only snapshot does not reproduce:
- production data distributions or existing duplicate rows;
- secrets and runtime environment variables;
- network policies, API gateway/PostgREST behavior, auth service behavior or platform-managed default ACLs unless explicitly captured;
- provider acceptance/delivery;
- runtime code deployment, live concurrency or end-to-end payments.

A schema-only rehearsal can identify DDL compatibility and some privilege/contract issues, but it is not production certification.

## 9. Cleanup and retention

After approval of the evidence:
- stop the local PostgreSQL instance;
- drop only the specifically named throwaway rehearsal database;
- securely delete temporary dumps, intermediate files and logs according to the approved retention schedule;
- revoke the temporary read-only production credential using the owner's procedure;
- preserve only approved sanitized evidence, manifests and reports.

Never run broad cleanup commands or delete unrelated databases/files. Record cleanup results without exposing credentials.

## 10. Exit criteria

The rehearsal is complete only when the owner-approved schema artifact is hashed and reviewed, the local database import is reproducible, all planned migrations and tests have actual exit codes, post-migration catalog/role checks are captured, unresolved drift is documented, and cleanup is confirmed. Until then the status is `PARTIAL` or `BLOCKED`, not production-ready.
