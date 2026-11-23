# Owner actions — exact, ordered (2026-11-23). None needs a password in chat.
**Urgent context:** `main` is already merged (#266 at 07:01, #267 at 10:47 +03) and `deploy.yml` deploys on every push to `main`, so the live app already expects database objects hosted does not have. Registration and (very likely) listing creation fail until the database steps are approved. Nothing below changes production by itself.

| # | Action | Why | Commands / where |
|---|---|---|---|
| 1 | Take the full dump and run the isolated restore test | Recovery gate (blocks every database step) | `BACKUP-AND-RESTORE.md` (A2, A4, A5). Send only SHA-256, file size, `kayard-recovery-contents.txt`, `restore-errors.txt` line count and the numbers from A5 |
| 2 | Fetch the failed GitHub run log | CI root cause is Blocked without it | `gh run view 45108826385 --repo Themugo/KAYAD --log-failed > failed.txt`; `gh run list --repo Themugo/KAYAD --workflow "DB Journeys" --limit 15`; `gh run list --repo Themugo/KAYAD --workflow "Deploy to Production" --limit 5` |
| 3 | Confirm what is deployed | Topology is Unverified | Render → `kayad-backend` → Deploys (commit SHA, time) and Environment (host part of `SUPABASE_URL` only); Vercel → Deployments (production commit/branch) |
| 4 | Capture the failing login once | Login failure stage is Unverified | `LOGIN-ROOT-CAUSE.md` ("Missing diagnostic"); never send password, tokens or cookies; tell me privately which email you use |
| 5 | Approve (or not) step 1 and step 2 on production after #1 | Registration and listing creation | `PRODUCTION-RECONCILIATION-PLAN.md` Steps 1–2; reply with the exact file names you approve |
| 6 | Decide the financial-function question | 22 drifted functions; hosted holds no financial rows | `FUNCTION-DRIFT-INVENTORY.md` decision matrix |
| 7 | Decide the 3 undefined objects | `error_budgets`, `marketplace_healths`, `kayad_owner_snapshot` | `PRODUCTION-RECONCILIATION-PLAN.md` Step 6 |
| 8 | Optional: stop-gap while waiting | Listing forms fail until Step 2 | Only if you authorise it: a frontend change to omit the Idempotency-Key header (re-opens double-submit duplicates) |
| 9 | Brand setting | render.yaml `BREVO_FROM_NAME` = "KAYAD" | Update in Render yourself (brand is "KAYARD KE"); I made no environment change |
