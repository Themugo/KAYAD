# Backup and isolated restore — status and procedure (2026-11-23)
Status: **BLOCKED on the owner.** No dump file has been supplied to Claude, so no backup is verified and the recovery gate is **not satisfied**. Nothing below claims a recovery point exists.

## A1. Facts established (read-only, Confirmed)
| Item | Value |
|---|---|
| Project ref / region | `ubvgixwhfybbyjuvxboj`, eu-central-1; dashboard badge "Production"; Free plan; "No backups"; no branches |
| PostgreSQL | 17.6 (use a client of version >= 17; the portable 19.0 binaries are fine) |
| Database size | 30 MB |
| Public schema | 213 tables, 96 functions; owner of all tables: `postgres` |
| Migration history | 135 rows, latest `20260922060457` (hosted never received any later repo migration) |
| Extensions | plpgsql, pg_stat_statements 1.11, **uuid-ossp 1.1 and pgcrypto 1.3 (both in schema `extensions`)**, supabase_vault 0.3.1 (schema `vault`) |
| Event triggers | `ensure_rls` (function `rls_auto_enable`), `pgrst_ddl_watch`, `pgrst_drop_watch`, issue_* placeholders — platform objects, **not** restored by a `public`-only dump |
| WAL archiving | `archive_mode=on`, 0 failures — platform plumbing, **not** a usable recovery point for you |
| Data volume (aggregates) | 3 users, 2 dealers, 2 cars, 0 bids/escrows/payments/refunds/ledger rows/leads, 3,046 reconciliation_report rows |
Special restore handling: extensions must exist before `pg_restore` (`uuid-ossp`, `pgcrypto` in schema `extensions`); the dump needs `--no-owner --no-privileges`; roles (`anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`) are not part of a database dump and must be created locally for a faithful grants check; `vault`/`auth`/`storage` are Supabase-managed and not reproduced.

## A2. Owner procedure (Windows CMD, paste one line at a time)
The password is typed at a prompt, held only in the process environment and cleared; it is never put in a command argument, file or report. (Alternative: a `PGPASSFILE` you create yourself with `notepad`, `host:5432:postgres:postgres.ubvgixwhfybbyjuvxboj:YOUR_PASSWORD`; keep it out of the repo.)
```
cd /d C:\Users\hp\Downloads
set PGBIN=C:\Users\hp\Downloads\postgresql-19.0-1-windows-x64-binaries\pgsql\bin
set PGHOST=aws-0-eu-central-1.pooler.supabase.com
set PGPORT=5432
set PGUSER=postgres.ubvgixwhfybbyjuvxboj
set PGDATABASE=postgres
set /p PGPASSWORD=Database password: 
"%PGBIN%\pg_dump.exe" --format=custom --no-owner --no-privileges --schema=public --schema=supabase_migrations --file=kayard-recovery-20261123.dump
set PGPASSWORD=
certutil -hashfile kayard-recovery-20261123.dump SHA256
"%PGBIN%\pg_restore.exe" --list kayard-recovery-20261123.dump > kayard-recovery-contents.txt
dir kayard-recovery-20261123.dump
```
The dump holds real personal data (3 users): keep it on an encrypted drive; **do not upload it to chat**. Send only the SHA-256, the file size and `kayard-recovery-contents.txt` (an object list, no data).

## A3. What Claude verifies once `kayard-recovery-contents.txt` arrives
File size, SHA-256, archive readability (`pg_restore --list` exit code and section list), presence of the expected table/function/trigger/policy entries and the migration-history table data.

## A4. Isolated restore test (owner, local only; nothing touches Supabase)
```
"%PGBIN%\initdb.exe" -D C:\kayard-restore-test -U postgres --auth=trust
"%PGBIN%\pg_ctl.exe" -D C:\kayard-restore-test -o "-p 55432" -l C:\kayard-restore-test\log.txt start
"%PGBIN%\createdb.exe" -h 127.0.0.1 -p 55432 -U postgres kayard_restore_test
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 55432 -U postgres -d kayard_restore_test -c "create schema extensions" -c "create extension \"uuid-ossp\" with schema extensions" -c "create extension pgcrypto with schema extensions" -c "create role anon nologin" -c "create role authenticated nologin" -c "create role service_role nologin"
"%PGBIN%\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d kayard_restore_test --no-owner kayard-recovery-20261123.dump 2> restore-errors.txt
find /c /v "" restore-errors.txt
```
## A5. Read-only verification queries (run locally against the restored DB; send only the numbers)
```
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 55432 -U postgres -d kayard_restore_test -At -c "select 'tables',count(*) from pg_tables where schemaname='public' union all select 'functions',count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' union all select 'triggers',count(*) from pg_trigger where not tgisinternal union all select 'policies',count(*) from pg_policies where schemaname='public' union all select 'indexes',count(*) from pg_indexes where schemaname='public' union all select 'migration_rows',count(*) from supabase_migrations.schema_migrations union all select 'users',count(*) from public.users"
"%PGBIN%\pg_ctl.exe" -D C:\kayard-restore-test stop
```
Expected from the live database: tables 213, functions 96, migration_rows 135, users 3. Triggers/policies/indexes are compared with the counts in `evidence/` (hosted catalog: 38 triggers, 120 policies, 650 indexes, 732 constraints).

## Result classification (to be completed with real evidence)
Dump created: **NOT DONE (owner)** · Dump readable: NOT TESTED · Restore completed: NOT TESTED · Structural verification: NOT TESTED · Data verification: NOT TESTED. Earlier evidence only: a **schema-only** dump of the same project was restored into a local PG16 replica (see `replica-validation/`); that is not a recovery point.
**Limitations:** roles, Supabase-managed schemas, storage objects, the `ensure_rls` event trigger and platform settings are not captured; data created after the dump is not recoverable from it.
