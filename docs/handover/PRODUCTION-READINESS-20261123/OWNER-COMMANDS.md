# Owner commands (Windows CMD) — read-only or local-only
Paste ONE line at a time (a multi-line paste swallowed lines last time). Never paste passwords, keys or tokens into chat. These do not change production.

## A. Recovery point + isolated restore test (closes the Phase 2 gate)
The database is ~30 MB. The dump contains real personal/financial data: keep it on an encrypted drive, do not email or upload it, and do not send it to Claude.
```
cd /d C:\Users\hp\Downloads
set PGBIN=C:\Users\hp\Downloads\postgresql-19.0-1-windows-x64-binaries\pgsql\bin
set PGHOST=aws-0-eu-central-1.pooler.supabase.com
set PGPORT=5432
set PGUSER=postgres.ubvgixwhfybbyjuvxboj
set PGDATABASE=postgres
set /p PGPASSWORD=Database password: 
"%PGBIN%\pg_dump.exe" --format=custom --schema=public --schema=supabase_migrations --no-owner --no-privileges --file=kayard-recovery-20261123.dump
set PGPASSWORD=
"%PGBIN%\pg_restore.exe" --list kayard-recovery-20261123.dump > kayard-recovery-contents.txt
dir kayard-recovery-20261123.dump
```
Isolated restore test (local only, port 55432, nothing touches Supabase):
```
"%PGBIN%\initdb.exe" -D C:\kayard-restore-test -U postgres --auth=trust
"%PGBIN%\pg_ctl.exe" -D C:\kayard-restore-test -o "-p 55432" -l C:\kayard-restore-test\log.txt start
"%PGBIN%\createdb.exe" -h 127.0.0.1 -p 55432 -U postgres kayard_restore_test
"%PGBIN%\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d kayard_restore_test --no-owner kayard-recovery-20261123.dump 2> restore-errors.txt
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 55432 -U postgres -d kayard_restore_test -c "select count(*) from public.users"
"%PGBIN%\pg_ctl.exe" -D C:\kayard-restore-test stop
```
Expect `3` users. Tell Claude only the row count and how many lines `restore-errors.txt` has (`find /c /v "" restore-errors.txt`). Limitations: roles, Supabase-managed schemas and storage objects are not in this dump. Alternative: upgrade the Supabase plan for backups/PITR (your billing decision).

## B. GitHub Actions failure 45108826385 (needs `gh` signed in as you)
```
gh run view 45108826385 --repo Themugo/KAYAD --log-failed > failed.txt
gh run list --repo Themugo/KAYAD --workflow "DB Journeys" --limit 15
```
Send `failed.txt` and the list (workflow logs contain no secrets by design).

## C. Which backend commit and Supabase project are live (dashboards, no secrets)
1. Render → `kayad-backend` → Events/Deploys: note the **commit SHA** of the latest live deploy and its time.
2. Render → `kayad-backend` → Environment: read only the **host part of SUPABASE_URL** (should be `ubvgixwhfybbyjuvxboj`). Do not reveal values of any key/secret.
3. Vercel → project → Deployments: note the production deployment's commit SHA and branch.
4. Optional public check: `curl -s -i https://api.kayad.space/health`

## D. Login failure — one browser capture (no password)
In Chrome: F12 → Network → tick "Preserve log" → try the login once → click the request named `login`. Send: Request URL, Status Code, and the Response message text. Do NOT send the Request payload, headers, cookies or "Copy as cURL". Also tell me **which email** you use (not the password) and whether it was created before 2026-11-09 (only 3 accounts exist; none newer).

## E. Review (nothing changed in the project, so nothing to commit)
```
cd /d C:\path\to\KAYARD-repo
git status
git log -1 --oneline
certutil -hashfile KAYARD-KE-production-readiness-report-v1.zip SHA256
```
Future authorised commit/push (DO NOT RUN until you approve a change): `git add -A`, `git status`, `git diff --cached --stat`, `git commit -m "<message>"`, `git push origin HEAD`.
