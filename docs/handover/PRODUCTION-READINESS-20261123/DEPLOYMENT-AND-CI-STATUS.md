# Deployment topology (2026-11-23, revised 2)
Classes: Confirmed · Reproduced locally · Inferred · Unverified · Blocked.

## Git state — Confirmed (fresh clone of GitHub, read-only)
| Ref | SHA | Note |
|---|---|---|
| `release/kayard-combined-20261123` (remote) | `0a3cc4ad11531968f5fd865fede4fab446581958` | equals the baseline in the command; verified directly |
| `main` | `51f30b6d` — "Release/kayard combined 20261123 (#267)", 2026-11-23 10:47 +03 | **tree byte-identical to the release branch HEAD** |
| PR #266 | squash-merged into `main` as `2854f5ec` on 2026-11-23 07:01 +03; `refs/pull/266/head` still `7de6f2a` | **PR 266 is already merged** (by the owner, before this command; the command assumed it was open) |
| PR #267 | merged 10:47 +03 (the docs commit `0a3cc4ad`) | |
So everything in the release branch, code and migration files, is on `main`. Nothing was merged, pushed or committed by Claude.

## Deployment pipeline — Confirmed (repo files)
- `.github/workflows/deploy.yml`: **every push to `main`** runs validation and then deploys the frontend to Vercel (`vercel deploy --prebuilt --prod`) if the three Vercel secrets exist. → The merges at 07:01 and 10:47 most likely triggered production frontend deploys (run result: Unverified).
- `vercel.json`: `/api/*` and `/uploads/*` are rewritten to `https://api.kayad.space`; the browser never calls Supabase (no `createClient`/`VITE_SUPABASE_*` in `src/`).
- `render.yaml`: service `kayad-backend` (Docker, oregon); no `autoDeploy` key, so Render's default (auto-deploy on push to the linked branch) is **Inferred**, not confirmed; `SUPABASE_URL`/keys are `sync:false` (values not visible).

## Which backend is live — mixed evidence
- Confirmed: a Node client with the service role calls `ubvgixwhfybbyjuvxboj.supabase.co` continuously (users/user_auth/refresh_tokens, analytics, reconciliation jobs).
- Confirmed: at 2026-11-23 04:06:40 UTC (= 07:06 +03, five minutes after the #266 merge) that client queried all four command-centre sources; the same code is not on the pre-merge `main`. **Inferred (strong): the deployed backend was built from `main` at/after `2854f5ec`.** Exact deployed SHA: **Unverified** (Render dashboard not reachable from here; the live host is not on the session allowlist).
- Supabase project used by the backend: Confirmed that this project receives the backend's traffic; that it is *the Render service's* `SUPABASE_URL`: Likely. Environment: dashboard badge says "Production" (owner paste), no staging project exists.
- Frontend → API target: Confirmed in `vercel.json`; the live Vercel project's commit: Unverified.

## Owner steps to turn Unverified into Confirmed (no secrets)
Render → `kayad-backend` → Deploys: latest live deploy commit SHA and time; Environment: only the host part of `SUPABASE_URL`. Vercel → Deployments: production commit SHA/branch. GitHub → Actions → "Deploy to Production": did the 07:01 and 10:47 runs succeed? (`gh run list --repo Themugo/KAYAD --workflow "Deploy to Production" --limit 5`).

## Consequence
Because `main` is already merged and deploys automatically, the "hold the merge" gate can no longer be applied. The live app is now running code that expects database objects hosted does not have. See `LISTING-RPC-COMPATIBILITY.md`, `LOGIN-ROOT-CAUSE.md` and `PRODUCTION-RECONCILIATION-PLAN.md` (database-first sequence).


---
## CI: DB Journeys workflow and run 45108826385

# CI — DB Journeys failure (run 45108826385) — 2026-11-23
## Verdict
**GitHub root cause: NOT ESTABLISHED (log not retrievable from this session).** The same workflow, run locally on the exact tree now on `main`, **passes completely**, so the failure is not an application, migration or journey defect that reproduces on a clean database.

## D1 — evidence retrieval
`gh` is not authenticated in the sandbox and `github.com/.../actions/runs/...` is not on the session allowlist; I did not work around the block. Owner commands (`OWNER-ACTIONS.md` #2) export the failed step log and the recent run list, including whether DB Journeys has ever passed on any branch.

## D3 — full local run (Reproduced locally; tree = `main` @ `51f30b6d`, identical to `0a3cc4ad`)
`ci/db-journeys/run.sh` against a disposable Postgres 16.15, PostgREST 12.2.3, Redis 7.0.15, Node 22.23.4, `npm ci` backend dependencies:
- **migrations applied: 211/211** on a clean database; **overall=PASS**; all **29** journey scripts exit 0 with 0 failures (legacy j1–j10, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 99). Log: `evidence/db-journeys-clean-run-2026-11-23.txt`, `evidence/db-journeys-clean-summary.txt`.
- This includes registration/email lifecycle (20), login/session lifecycle (legacy-j1, 16), dealer command centre (18), listing idempotency (15), team (17), offers (05, j4), tenant isolation (16), role write matrix (14), ledger reconciliation (19) and the 8,000-insert concurrency test (13).
- **An earlier run of the same suite FAILED (13–18, 06, 20, 08)** — `evidence/db-journeys-run1-INVALID-interfered-summary.txt`. Cause (Confirmed, my own): while it ran I started a second PostgREST for a reproduction and executed `ALTER ROLE authenticator … PASSWORD` on the same cluster. `run.sh` also sets that cluster-global role's password, so the journey's PostgREST lost its connections (PostgREST log: "terminating connection due to administrator command", password authentication failures; journey 06: `ECONNREFUSED :54340`). The run was invalid, was discarded, and the suite was rerun untouched. **Lesson recorded: never share the cluster with the journeys while they run.**

## D2 — environment comparison
| Item | CI (workflow) | Local rerun | Difference that could matter |
|---|---|---|---|
| PostgreSQL | `postgres:16` Docker service, `POSTGRES_PASSWORD=ci-disposable-only` | 16.15 Ubuntu package | Debian image vs Ubuntu; locale/collation defaults may differ (Unverified) |
| PostgREST | v12.2.3 downloaded from GitHub Releases | 12.2.3 | same |
| Node | `22.22.2` (setup-node; `ci.yml` and `deploy.yml` use it and pass) | 22.23.4 | `engines >= 22.22.2` satisfied |
| Redis / psql | `apt-get install redis-server postgresql-client` | Redis 7.0.15, psql 16.15 | `pgbench` (journey 13) is in the server package; the runner image normally has `/usr/lib/postgresql/16/bin/pgbench` (journey probes it) — Unverified |
| Supabase CLI | not used | not used | — |
| Migrations / seed | all 211 files, no seed | same | same |
| Env vars | none secret | none secret | — |
| Trigger | `pull_request` to `main` | manual | a PR run executes the merge-ref of the PR with `main`; at the time of run 45108826385 `main` was `bfe3735` and the merge-ref may have differed from the PR head (Unverified) |
The workflow has **never** been shown to pass on GitHub (its own header says so). A job that fails after ~1 minute points at a **setup-stage** step (service health, apt, the PostgREST download, `npm ci`, the first migrations) rather than at a journey, which would take far longer. Hypotheses only; they are separated by the first red step in `failed.txt`.

## D4 — changes
**None.** No workflow or test was modified, weakened or removed. Do not edit `db-journeys.yml` until the failed-step log is read.

---
## Status (2026-11-23)
- Cause of GitHub run 45108826385: **Suspected; evidence incomplete** (the run log is not reachable from this environment). The same workflow steps pass locally: 211/211 migrations, 29/29 journeys (`evidence/journeys-final.txt`). Owner action: open the run, copy the first failing step's message (no secrets).
- Deployed frontend/backend commit SHAs and the production Supabase connection of the Render service: **Unverified** (need Vercel/Render dashboards). Nothing was deployed by this work.
- `deploy.yml` deploys on push to `main`; hosted schema is older than the repo (see MIGRATION-DEPENDENCY-GRAPH.md), so pushing code that expects newer tables will not change the database. Migrations must be applied separately and only after owner approval.
