# Read-only evidence commands for you to run (cmd.exe) — Stage 5E

None of these change files, the index or the working tree. Do **not** paste any `.env` contents, tokens or passwords.

## A. Windows working tree
```cmd
cd /d C:\Users\hp\Desktop\kayad-fresh
git status --short --branch
git rev-parse HEAD
git log --oneline -5
git ls-remote origin refs/heads/main
git stash list
git branch -vv
git diff --stat
git diff --cached --stat
```

## B. Which commit introduced the login block, and is it what is deployed?
```cmd
git log --oneline -S"platform-owner account is not verified" -- backend/config/owners.js
git log --oneline -S"OWNER_IDENTITY_UNVERIFIED" -- backend/config/owners.js
```
Then compare the first hash with the **commit SHA shown in the host's (Render) deploy log** for the backend service. Report both SHAs (they are not secrets).

## C. Is the deployed owner list exactly what you intend? (run **in the host's shell**, never locally with a copied secret)
```sh
node backend/scripts/owner-bootstrap.mjs --verify-designated "<first-owner-address>,<second-owner-address>"
```
(`--verify-designated` exists only after this package is deployed.) It prints `configuredExactly: true/false` per address you type, the masked form of what you typed, and how many configured addresses matched none of them — it never prints the configured values and needs no database.

## D. Read-only database checks (Supabase SQL editor, `SELECT` only — non-secret columns)
```sql
select role, status, email_verified, is_banned, (deactivated_at is null) as not_deactivated
from public.users where lower(email) = lower('<the address you typed at login>');
select count(*) from public.users where lower(email) = lower('<same address>');   -- expect 1
```
(`deactivated_at` does not exist on the hosted schema reported earlier; if the query errors, remove that column.) These do not modify anything.

## E. Provider readiness (flags only — no secrets)
In the host dashboard, confirm that these environment variables are **set** (do not copy values): `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `FRONTEND_URL`, `WEBHOIST_EMAIL`. In Brevo, confirm the sender/domain is authenticated.
