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
